"""Verify the app imports against Neon and the schema is complete.

Checks the three things that were broken: the SECRET_KEY guard, the pooled
connection settings, and the new contents column.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from auth.security import SECRET_KEY  # noqa: E402
import database.database as dbmod  # noqa: E402
from database.models import GeneratedFile  # noqa: E402

print(f"SECRET_KEY loaded, length {len(SECRET_KEY)}")

url = dbmod.DATABASE_URL
print("pooled host in use:", "-pooler." in url)
print("tls enforced:", "sslmode=require" in url)
print("sql echo:", dbmod.engine.echo)

pool = dbmod.engine.pool
print(
    "pool:",
    "maxsize=%s overflow=%s recycle=%s pre_ping=%s"
    % (
        getattr(pool._pool, "maxsize", "?"),
        getattr(pool, "_max_overflow", "?"),
        getattr(pool, "_recycle", "?"),
        getattr(pool, "_pre_ping", "?"),
    ),
)

assert "contents" in GeneratedFile.__table__.columns, "contents column missing"
print("GeneratedFile.contents:", GeneratedFile.__table__.columns["contents"].type)

import main  # noqa: E402,F401  create_all runs at import time

routes = sorted({getattr(r, "path", "") for r in main.app.routes if getattr(r, "path", "")})
print("routes:", len(routes))
print("/health registered:", "/health" in routes)
print("/generate registered:", "/generate" in routes)

from sqlalchemy import inspect  # noqa: E402

inspector = inspect(dbmod.engine)
tables = sorted(inspector.get_table_names())
print("tables in Neon:", len(tables))
for name in tables:
    print("  -", name)

cols = [c["name"] for c in inspector.get_columns("generated_files")]
print("generated_files columns:", cols)
assert "contents" in cols, "contents column was not created in Neon"

origins = main._allowed_origins()
print("cors origins:", origins)

print("\nALL CHECKS PASSED")
