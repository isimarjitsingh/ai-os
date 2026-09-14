"""End-to-end check of the deployment fixes, against the real Neon database.

The point of this is the scenario that used to break on deploy: a project whose
files exist only as rows in Postgres, with nothing under generated_projects/.
Locally that always worked because the disk was there, so it never showed up
until the first redeploy wiped the directory.
"""

from pathlib import Path
import shutil
import sys
import uuid

sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi.testclient import TestClient  # noqa: E402

import main  # noqa: E402
from database.database import SessionLocal  # noqa: E402
from database.models import GeneratedFile, Project  # noqa: E402

client = TestClient(main.app)

failures = []


def check(label, condition, detail=""):
    status = "PASS" if condition else "FAIL"
    print(f"[{status}] {label}" + (f"  -> {detail}" if detail else ""))
    if not condition:
        failures.append(label)


print("=" * 64)
print("1. HEALTH")
print("=" * 64)

response = client.get("/health")
check("GET /health is 200", response.status_code == 200, str(response.status_code))
check(
    "health reports database up",
    response.json().get("database") == "up",
    str(response.json()),
)

print()
print("=" * 64)
print("2. AUTH")
print("=" * 64)

email = f"deploytest-{uuid.uuid4().hex[:8]}@example.com"

register = client.post(
    "/auth/register",
    json={"name": "Deploy Tester", "email": email, "password": "Str0ngPass!"},
)
check("register returns 200", register.status_code == 200, str(register.text[:200]))

login = client.post("/auth/login", json={"email": email, "password": "Str0ngPass!"})
check("login returns 200", login.status_code == 200, str(login.text[:200]))

token = login.json().get("access_token")
headers = {"Authorization": f"Bearer {token}"}
check("bearer token issued", bool(token))

bad = client.post("/auth/login", json={"email": email, "password": "wrong"})
check("wrong password rejected", bad.status_code in (401, 400), str(bad.status_code))

unauth_client = TestClient(main.app)
unauth_client.cookies.clear()

unauth = unauth_client.get("/projects/does-not-exist/files")
check("files route requires auth", unauth.status_code in (401, 403), str(unauth.status_code))

forged = unauth_client.get(
    "/projects/any-thread/files",
    headers={"Authorization": "Bearer not.a.real.token"},
)
check("forged token rejected", forged.status_code == 401, str(forged.status_code))

# The login response set a cookie, and TestClient keeps a jar; clear it so the
# remaining checks exercise the header path rather than a stale session.
client.cookies.clear()

unknown = client.get("/projects/does-not-exist/files", headers=headers)
check(
    "authenticated request for a missing project is 404",
    unknown.status_code == 404,
    str(unknown.status_code),
)

print()
print("=" * 64)
print("2b. THE OLD TOKEN IS NOW WORTHLESS")
print("=" * 64)

# The previous SECRET_KEY was a source literal, so a token could be minted
# offline by anyone reading the repo. Prove that a token signed with it is
# refused now that the secret comes from the environment.
from jose import jwt as _jwt  # noqa: E402

old_style = _jwt.encode(
    {"sub": "1", "exp": 9999999999},
    "CHANGE_THIS_TO_A_LONG_RANDOM_SECRET_KEY",
    algorithm="HS256",
)

stolen = unauth_client.get(
    "/projects/any-thread/files",
    headers={"Authorization": f"Bearer {old_style}"},
)
check(
    "token signed with the leaked literal is refused",
    stolen.status_code == 401,
    str(stolen.status_code),
)

print()
print("=" * 64)
print("3. DATABASE-ONLY PROJECT FILES (the deploy scenario)")
print("=" * 64)

thread_id = f"deploy-{uuid.uuid4().hex}"
project_name = f"DeployProbe {uuid.uuid4().hex[:8]}"

db = SessionLocal()

try:
    from database.models import User

    user = db.query(User).filter(User.email == email).first()

    project = Project(
        thread_id=thread_id,
        user_id=user.id,
        project_name=project_name,
        startup_idea="A test project that exists only in the database",
        status="completed",
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    # Deliberately point at a directory that was never written to disk: this is
    # exactly what a fresh container after a redeploy looks like.
    on_disk = Path(main.__file__).resolve().parent / "generated_projects" / project_name
    check("project directory really is absent", not on_disk.exists(), str(on_disk))

    sample = {
        "index.html": "<!doctype html><title>DeployProbe</title>",
        "src/main.jsx": 'import React from "react";\nconsole.log("hi");\n',
        "package.json": '{"name":"deploy-probe","version":"1.0.0"}',
    }

    for rel_path, contents in sample.items():
        db.add(
            GeneratedFile(
                project_id=project.id,
                file_path=f"generated_projects/{project_name}/{rel_path}",
                category="frontend" if "." in rel_path else "config",
                contents=contents,
            )
        )

    # One legacy-style row: path recorded, contents NULL, and nothing on disk.
    # It must be skipped rather than crash the whole response.
    db.add(
        GeneratedFile(
            project_id=project.id,
            file_path=f"generated_projects/{project_name}/ghost.txt",
            category="other",
            contents=None,
        )
    )
    db.commit()
finally:
    db.close()

files_response = client.get(f"/projects/{thread_id}/files", headers=headers)
check(
    "GET files is 200 with no disk backing",
    files_response.status_code == 200,
    str(files_response.status_code) + " " + files_response.text[:200],
)

payload = files_response.json() if files_response.status_code == 200 else {}

if payload:
    print("     response keys:", sorted(payload))
    tree = payload.get("files") or payload.get("file_tree") or payload
    print("     tree:", str(tree)[:300])

    blob = str(payload)
    check("stored index.html content served", "DeployProbe" in blob)
    check("stored main.jsx content served", "import React" in blob)
    check("stored package.json served", "deploy-probe" in blob)
    check("contentless legacy row skipped", "ghost" not in blob)

print()
print("=" * 64)
print("4. CLEANUP")
print("=" * 64)

db = SessionLocal()
try:
    deleted = (
        db.query(GeneratedFile)
        .filter(GeneratedFile.project.has(thread_id=thread_id))
        .delete()
    )
    projects_deleted = db.query(Project).filter(Project.thread_id == thread_id).delete()
    db.query(User).filter(User.email == email).delete()
    db.commit()
    print(f"removed {deleted} file rows, {projects_deleted} project, 1 user")
finally:
    db.close()

shutil.rmtree(on_disk, ignore_errors=True)

print()
print("=" * 64)
if failures:
    print(f"RESULT: {len(failures)} FAILURE(S)")
    for label in failures:
        print("  -", label)
    sys.exit(1)

print("RESULT: ALL TESTS PASSED")
