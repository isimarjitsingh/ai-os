# 🏢 AI Company OS

> **Type one startup idea. Watch a virtual company build it.**
> A multi-agent AI system that behaves like a full company — research, marketing, finance, and engineering teams — that plans, analyzes, writes code for, and delivers a complete runnable project from a single prompt.

[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![LangGraph](https://img.shields.io/badge/LangGraph-Graph-8250DF)](https://langchain-ai.github.io/langgraph/)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind-4-38BDF8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Postgres · Neon](https://img.shields.io/badge/Database-Neon%20Postgres-416C90?logo=postgresql&logoColor=white)](https://neon.tech/)
[![Redis](https://img.shields.io/badge/Checkpointer-Redis-DC382D?logo=redis&logoColor=white)](https://redis.io/)

---

## ✨ What it does

Give the system a sentence like *“Build me a SaaS for tracking gym memberships”* and a company of AI agents takes it from there:

1. The **CEO agent** analyzes the idea and builds an execution plan — deciding which departments are needed.
2. The agents that are enabled do their jobs **in sequence**, each producing structured reports:
   - 🔬 **Research** — market size, competitors, opportunities
   - 📣 **Marketing** — positioning, channels, launch strategy
   - 💰 **Finance** — business model, pricing, projections
   - 💻 **Coding** — the actual architecture and application code
3. The **File Generator** turns the coding agent's output into a real project tree (stored in the database and written to disk).
4. The **CEO agent** writes the final executive report — viability, risks, MVP scope, next steps.

The UI streams every step live over SSE, so you watch the “company” work in real time. After completion you get a dashboard with the CEO report, all agent reports, a file explorer, a code viewer, and — on supported browsers — the generated app **running directly in your browser** via WebContainer.

## 🏗️ Architecture

```mermaid
flowchart LR
    subgraph Browser
        UI[React 19 + Vite SPA<br/>Tailwind · Monaco · WebContainer]
    end

    subgraph "FastAPI Backend (Render)"
        AUTH[JWT Auth<br/>register / login / cookies]
        GEN[/POST /generate/]
        STREAM[/GET /stream/:thread_id<br/>SSE/]
        API[/Projects · Files · Settings<br/>API/]
        GRAPH[LangGraph<br/>company pipeline]
        AGENTS[CEO → Research → Marketing<br/>→ Finance → Coding → File Gen]
        LLM[LLM layer<br/>Groq · OpenRouter · Google · xAI<br/>retry + salvage + fallback]
        REPAIR[Schema auto-repair<br/>on startup]
    end

    DB[(Neon<br/>PostgreSQL)]
    REDIS[(Render<br/>Redis<br/>graph checkpointing)]
    NEO[Neon schema<br/>check / repair]

    UI -- "HTTPS + JWT cookie" --> AUTH
    UI --> GEN
    UI -- "EventStream" --> STREAM
    UI --> API
    GEN --> GRAPH
    GRAPH --> AGENTS
    AGENTS --> LLM
    AGENTS --> DB
    API --> DB
    STREAM -. "agent events" .- GRAPH
    GRAPH --> REDIS
    REPAIR --> NEO
    NEO --> DB
```

### Agent pipeline

```mermaid
flowchart TD
    START([Startup idea]) --> CEO1["CEO Agent<br/>ceo_initialize"]
    CEO1 --> PLAN{Execution plan<br/>which departments?}

    PLAN -->|research| RESEARCH[Research Agent]
    PLAN -->|marketing| MARKET[Marketing Agent]
    PLAN -->|finance| FIN[Finance Agent]
    PLAN -->|coding| CODE[Coding Agent]

    RESEARCH --> MARKET --> FIN --> CODE
    PLAN -.->|department disabled| NEXT[skip to next enabled agent]
    NEXT -.-> CODE

    CODE --> FG[File Generator<br/>writes project files to DB + disk]
    FG --> CEO2["CEO Agent<br/>ceo_finalize"]
    CEO2 --> DONE([Completed project<br/>CEO report + status: completed])
```

The CEO planner decides per-run whether research, marketing, finance and coding each run; disabled departments are skipped automatically. Every agent is resilient: LLM failures are retried, the model's intended output is salvaged from error payloads, and hand-written fallback reports keep a run from failing on a provider hiccup.

## 📦 Repository layout

```
ai-os/
├── Backend/
│   ├── main.py               # FastAPI app: routes, SSE stream, startup repair
│   ├── config.py             # env loading (LLM provider keys)
│   ├── llm.py                # LLM factory (structured-output bindings)
│   ├── llm_fallback.py       # retry → salvage → hardcoded fallback ladder
│   ├── agents/               # ceo, research, marketing, finance, coding,
│   │                         # file_generator (LangGraph node functions)
│   ├── graphs/               # company_graph (state graph) + graph service
│   ├── orchestrator/         # planner + conditional routing logic
│   ├── state/                # CompanyState (typed LangGraph state)
│   ├── schemas/              # pydantic models (ExecutionPlan, CEO, agents)
│   ├── prompts/              # system prompts for every agent
│   ├── routes/               # auth, files, settings routers
│   ├── auth/                 # JWT security + dependencies
│   ├── database/             # engine, models, CRUD, ensure_schema (repair)
│   ├── services/             # agent event bus + SSE manager
│   ├── migrations/           # CLI schema-repair entry point
│   ├── utils/                # file writer helpers
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── pages/            # Home, Generate, Generation, Projects,
│   │   │                     # ProjectDashboard, Agents, Knowledge,
│   │   │                     # Analytics, Settings, Login, Register
│   │   ├── components/       # layout, ui, feature components
│   │   ├── routes/           # ProtectedRoute / PublicRoute guards
│   │   └── services/         # axios client + API base config
│   ├── index.html
│   └── package.json
├── render.yaml               # Render service definitions (backend + Redis)
├── DEPLOYMENT.md             # full deployment runbook (Render + Vercel + Neon)
├── USER_PROJECTS_SUMMARY.md  # data model & per-user project behavior
└── README.md
```
└── README.md
```

## 🚀 Quickstart (local development)

### Prerequisites

- Python 3.10+
- Node.js 20+
- A PostgreSQL database — locally, or a free [Neon](https://neon.tech/) project
- A [Groq](https://console.groq.com/) API key (default LLM provider)

### 1. Backend

```powershell
cd Backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```

Fill in `.env` (at minimum):

```ini
DATABASE_URL="postgresql://USER:PASSWORD@ep-XXXX-pooler.REGION.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
SECRET_KEY="something-long-and-random"
CORS_ORIGINS="http://localhost:5173,http://127.0.0.1:5173"
GROQ_API_KEY="gsk_..."
```

> Use Neon's **pooled** connection string (the one containing `-pooler.`) — it survives connection recycling. On a local Postgres you can instead use `postgresql://postgres:PASSWORD@localhost:5432/ai_company_os`.

Run:

```powershell
uvicorn main:app --reload
```

- API: http://localhost:8000
- Interactive docs: http://localhost:8000/docs
- Health probe: `GET /health` → `{"status": "ok", "database": "up"}`

On first boot the backend **auto-repairs the schema**: missing tables are created and missing columns are added to pre-existing ones (add-only, idempotent, safe to run on every startup).

### 2. Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The API base URL comes from `VITE_API_URL` in `frontend/.env` (defaults to `http://localhost:8000`). Create an account, enter a startup idea, and watch the agents work live.

### Other npm scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint |

## 🔌 API reference

All project routes require authentication: an `Authorization: Bearer <token>` header **or** the `access_token` cookie set by login/register.

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/` | – | Service banner |
| `GET` | `/health` | – | Liveness probe; pings Postgres, returns 503 when degraded |
| `POST` | `/auth/register` | – | Create account `{name, email, password}` → JWT + cookie |
| `POST` | `/auth/login` | – | Log in `{email, password}` → JWT + cookie |
| `GET` | `/auth/me` | ✅ | Current user |
| `POST` | `/auth/logout` | – | Clear the auth cookie |
| `POST` | `/generate` | ✅ | Start a run `{user_goal, api_key?}` → `{thread_id, project_id}` |
| `GET` | `/stream/{thread_id}` | ✅ | SSE stream of live agent events |
| `GET` | `/projects` | ✅ | List the caller's projects (newest first) |
| `GET` | `/projects/{thread_id}` | ✅ | One project; `404` if it belongs to someone else |
| `GET` | `/projects/{thread_id}/files` | ✅ | WebContainer-compatible file tree |
| `GET` | `/files/{file_id}` | ✅ | Single generated file (path + contents) |
| `GET` | `/settings/keys` | ✅ | Stored LLM provider keys |
| `POST` | `/settings/keys` | ✅ | Save/update a key `{provider, api_key}` |
| `GET` | `/settings/keys/{provider}` | ✅ | One stored key |
| `DELETE` | `/settings/keys/{provider}` | ✅ | Remove a stored key |

Project status lifecycle: `pending → in_progress → completed | failed`.

## 🔐 Environment variables

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ | Postgres URL. Use the **pooled** Neon host in production. |
| `SECRET_KEY` | ✅ | Long random string; signs the JWTs. App refuses to start without it. |
| `GROQ_API_KEY` | ✅ | Default LLM provider (`openai/gpt-oss-120b`). Not guarded at import, but generation runs fail without it. |
| `CORS_ORIGINS` | ✅* | Comma-separated exact origins (`*` not allowed — credentials enabled). *hard-coded defaults exist, but set explicitly. |
| `OPENROUTER_API_KEY` | – | Alternate provider key |
| `GOOGLE_API_KEY` | – | Alternate provider key |
| `XAI_API_KEY` | – | Alternate provider key |
| `TAVILY_API_KEY` | – | Web search (research agent) |
| `BAI_API_KEY` | – | OpenAI-compatible proxy |
| `DB_ECHO` | – | Log SQL (default `false`; noisy and billable on hosted DBs) |
| `DB_POOL_SIZE` / `DB_MAX_OVERFLOW` | – | Connection pool sizing (defaults 5 / 5 — keep low for Neon) |
| `LLM_TIMEOUT_SECONDS` | – | Per-LLM-call request budget (default 300) |
| `LANGCHAIN_API_KEY` / `LANGCHAIN_PROJECT` / `LANGCHAIN_ENDPOINT` | – | Optional LangSmith tracing |
| `VITE_API_URL` (frontend) | – | API base URL, **baked in at build time** (default `http://localhost:8000`) |

## 🛠️ Schema self-repair

`create_all()` creates missing **tables** but never adds missing **columns** — the classic way a model change breaks a live database (a query then 500s, and because the 500 escapes above the CORS middleware the browser reports it as a CORS error).

To stop that class of outage, the backend now runs a schema repair on every startup:

- `Backend/database/ensure_schema.py` — the repair itself. It diffs `database/models.py` against the live database, creates missing tables, and adds missing columns. **Add-only** (it never drops or alters existing columns), idempotent, and tolerant of concurrent-startup races (“column already exists” is swallowed after verifying the column is present).
- `Backend/main.py` — calls it on a startup event with 3 attempts and retries on failure; a total failure is logged with a traceback but the app still boots (fail-open).
- `Backend/migrations/ensure_schema.py` — thin CLI wrapper: `python migrations/ensure_schema.py` to run the same repair manually (e.g. from Render shell).

## ☁️ Deployment

Production runs on four managed pieces:

| Piece | Where | Notes |
|---|---|---|
| API backend | **Render** (Docker service) | Starter plan, 1 worker (see below), Singapore region |
| Web frontend | **Vercel** | `npm run build` → `dist/`; set `VITE_API_URL` **at build time** |
| Postgres | **Neon** | Pooled connection string in `DATABASE_URL` |
| Redis | **Render** | LangGraph checkpoint storage |

`render.yaml` defines both backend and Redis services, so Render can provision them together. The full step-by-step runbook — including Neon setup, CORS origin list, wake-up probing for free-tier sleep, and the `VITE_API_URL` build-time gotcha — is in **[DEPLOYMENT.md](DEPLOYMENT.md)**.

> **⚠️ Keep the backend at exactly 1 worker.** The live `/stream/{thread_id}` SSE endpoint reads an in-process workflow event bus. With multiple uvicorn workers, requests can land on a worker that doesn't have the workflow session and intermittently return “Workflow session not found”. A single worker is also the right size for the starter plan.

## 🩺 Troubleshooting

**Browser says “blocked by CORS policy” on an authenticated request.**
Historically this masked real server-side 500s: an unhandled exception escapes the CORS middleware layer, so the bare `500 Internal Server Error` response carries no `Access-Control-Allow-Origin` header and the browser blames CORS. The backend now converts database errors in routes into readable JSON 500 responses and logs full tracebacks. If you see this: read the *actual* error in the Render logs, not the browser console.

**`column "…" does not exist` in the logs / stale schema.**
A model change landed on a database that predates it. Startup repair should have fixed it automatically; if not (e.g. it raced the DB during deploy), run it manually from Render shell:

```bash
python migrations/ensure_schema.py
```

It is idempotent — safe to run any number of times.

**`GET /stream/{thread_id}` → “Workflow session not found”.**
The service is running more than one worker (in-process bus, see above). Set the worker count to 1 and restart.

**`/health` returns 503 with `database: …` after a deploy.**
The instance may still be waking or the DB may be unreachable. Wait for the liveness probe to clear it; check the connection string is the **pooled** Neon URL and that the Neon instance/pool is still running (free instances scale to zero).

**App refuses to start locally.**
Two import-time guards: `database/database.py` raises if `DATABASE_URL` is missing, and `auth/security.py` raises if `SECRET_KEY` is missing or still the placeholder value. `GROQ_API_KEY` is *not* guarded — the app boots without it, but generation runs fail until one is set.

---

*Built with LangGraph, FastAPI, and React. The company never sleeps; the free-tier instances do.*

