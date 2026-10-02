"""CLI entry point for the startup schema repair.

The real logic lives in database.ensure_schema so the app itself can run it on
every startup (a database that predates a model change repairs itself on the
next deploy instead of answering 'column does not exist' - which on a deployed
backend masquerades as a CORS block in the browser). This file keeps the manual
command working for a database the running app cannot reach on its own; run it
from the Backend directory with DATABASE_URL pointing at that database:
    python migrations/ensure_schema.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from database.ensure_schema import ensure_schema  # noqa: E402

if __name__ == "__main__":
    sys.exit(ensure_schema())
