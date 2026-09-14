# Deploying AI Company OS

The backend was written assuming it shares a machine with PostgreSQL and with
the files it generates. Neither assumption survives a normal PaaS deploy. This
covers what was changed and how to get it running.

Target setup used here: **Neon** for Postgres, **Render or Railway** for the API
via Docker, **Vercel or Netlify** for the frontend.

---

## What had to change first

| Problem | Why it only appeared in production | Fix |
|---|---|---|
| JWT secret was a source-code literal | Every deploy shared it, so anyone could forge a token for any user id | `SECRET_KEY` from env; the app refuses to boot without it |
| Generated project files lived in `Backend/generated_projects/` | That directory is a container's temporary filesystem: intact locally, empty after any redeploy, never shared between instances. The database recorded file *paths* only, so a project kept listing files whose bytes were gone | New `generated_files.contents` column stores the text itself; `routes/files.py` reads the database first, disk only as a dev fallback |
| `DATABASE_URL` pointed at `localhost:5432` | Nothing listens there on a hosted platform | Neon pooled URL |
| No connection-pool hardening | A pooler drops idle server connections silently; the first request after a quiet period died with "server closed the connection unexpectedly" | `pool_pre_ping`, `pool_recycle=300`, bounded pool |
| CORS origins hardcoded to `localhost:5173` | A deployed frontend on another origin was blocked by the browser before any request reached the API | `CORS_ORIGINS` env, comma-separated |
| COOP/COEP headers set in `vite.config.js` | That block configures the **dev server**. Production static hosts ignore it, so `window.crossOriginIsolated` was false and WebContainer refused to boot | `frontend/public/_headers` |
| `requirements.txt` saved as UTF-16 LE with a BOM | PowerShell's `>` redirect writes UTF-16. pip sniffs the BOM and copes, but a Linux build and plain `open()` break on the NUL bytes between characters | Resaved as UTF-8 |
| Emoji `print()` in request handlers | Python takes stdout's encoding from the locale. Under a redirected Windows console (cp1252) or a C-locale container the print raised `UnicodeEncodeError` *out of the handler*, turning a successful request into a 500 | `main.py` forces stdout/stderr to UTF-8 with lossy fallback; Dockerfile sets `PYTHONUTF8=1` |

### One thing that is still true

`services/workflow_manager.py` keeps every running workflow in a **plain
in-process dict**, and `/generate` drives it from a thread in the same process
that `/stream/{thread_id}` then polls. With more than one worker or instance the
request that starts a run and the request that streams it can land in different
processes, and the client gets "Workflow session not found".

So: **run exactly one worker.** `Backend/Dockerfile` pins `--workers 1` and
`main.py` warns if `WEB_CONCURRENCY` is above 1. Lifting this needs the workflow
bus moved to Redis pub/sub, which is not done here.

Practical consequence: a long `/generate` run occupies that one worker, and an
instance that sleeps mid-run drops it. Do not deploy on a free tier that spins
down.

---

## Phase 1 - Neon

Already done for this project: the URL in `Backend/.env` uses the **pooled** host
(contains `-pooler.`) with `sslmode=require&channel_binding=require`.

Use the pooled host, not the direct one. The direct host opens a real server
process per connection and exhausts Neon's limit under a web app's churn.

`create_all` runs at import, so on a fresh Neon database the schema appears on
first boot. Verified: 8 tables, including `generated_files.contents`.

**Local data has been migrated and verified**: 737 rows across all 8 tables,
confirmed by a per-table md5 over every column, not just row counts. Re-check
anytime without recopying:

```
$env:LOCAL_DATABASE_URL = "postgresql://postgres:YOUR_PASSWORD@localhost:5432/ai_company_os"
python migrations/copy_local_to_target.py --verify-only
```

### Rotate this password before going live

The pooled connection string - password included - was pasted into a chat window
and is also sitting in `Backend/.env` on disk. Treat it as disclosed: rotate the
Neon role password, update `Backend/.env`, update the `DATABASE_URL` secret on the
host, then rerun `verify_setup.py`. Anyone holding that string has read/write
access to every user's data, which also means any JWT in circulation is moot.

---

## Phase 2 - Backend

`Backend/.env` needs:

```
DATABASE_URL="postgresql://...-pooler.<region>.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
SECRET_KEY="<python -c 'import secrets;print(secrets.token_urlsafe(48))'>"
CORS_ORIGINS="http://localhost:5173,https://your-frontend.example"
DB_ECHO=false
```

`.env.example` documents all of it. `.env` is gitignored, and `.dockerignore`
keeps it out of the image.

---

## Phase 3 - Deploy the API

Both platforms build `Backend/Dockerfile`. The build context must be `Backend/`
(the Dockerfile copies `.` relative to it).

**Render** - `render.yaml` sits at the repo root (`ai-os/render.yaml`) and Render
reads it. Set `plan` to something that does not sleep. Paste real values for the
`sync: false` secrets in the dashboard.

**Railway** - create a project, add the repo, set root directory to `Backend`.
Railway detects the Dockerfile. Same environment variables. Railway keeps paid
services awake, which suits this app better than Render's free tier.

```
curl https://your-api.example/health
# {"status":"ok","database":"up"}
```

---

## Phase 4 - Frontend

`frontend/src/services/api.js` already reads `VITE_API_URL`, so set it at
**build** time to the deployed backend URL, then deploy `frontend/` as a Vite
static site (build `npm run build`, output `dist`).

Verified by building here: `npm run build` succeeds (vite 8.1.5, 2485 modules),
and `http://localhost:8000` was found **inside** `dist/assets/index-*.js`. That
is the whole point - Vite substitutes `VITE_*` strings into the bundle at build
time, so:

- Setting `VITE_API_URL` in a host's dashboard only takes effect on the next
  **build**. Editing it and not redeploying changes nothing, and there is no
  error to tell you so.
- Anyone who downloads the bundle can read the backend URL. That is expected;
  it is why no API key may ever live in a `VITE_*` variable.

`dist/_headers` is emitted too (Vite copies `public/` into `dist`), carrying
COOP/COEP; Vercel and Netlify both honour that file. Without it
`window.crossOriginIsolated` stays false and the WebContainer preview refuses to
boot. On your own nginx, add the two headers to the server block yourself.

Note the build warns that the main chunk is ~1000 kB (341 kB gzipped). It works;
it is just a slow first paint, and the fix is dynamic `import()` on the heavy
routes. `WebPreview` is already split out into its own 28 kB chunk.

Then add the frontend origin to the backend's `CORS_ORIGINS` and redeploy the
backend - otherwise the browser blocks it.

If you split the domains, the cookie path in `routes/auth.py` stops working
(`secure=False`, `samesite="lax"`). The frontend sends `Authorization: Bearer`,
which is unaffected, so split-domain is fine today.

---

## Helper scripts

| Script | Purpose |
|---|---|
| `verify_setup.py` | Asserts env, pool settings, Neon schema and routes |
| `test_deploy_e2e.py` | Health, auth, forged-token refusal, and the database-only file read |
| `migrations/add_generated_file_contents.py` | `create_all` adds tables, never columns. Run once against any **pre-existing** database (e.g. local `ai_company_os`) to add the column |
| `migrations/backfill_file_contents.py` | Fills `contents` for rows written before the column existed, reading from local disk |
| `migrations/copy_local_to_target.py` | Copies every row from local Postgres into `DATABASE_URL`, FK-safe order, sequences reset. Add `--verify-only` to compare source and target without writing |
| `fix_requirements_encoding.py` | Re-runnable UTF-16 to UTF-8 guard for `requirements.txt` |
