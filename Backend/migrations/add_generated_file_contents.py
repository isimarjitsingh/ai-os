"""Idempotently add generated_files.contents to a database that already exists.

Base.metadata.create_all() only creates missing *tables*; it never alters an
existing one. So the new column appears automatically on a fresh database such as
Neon, but the local ai_company_os database that already has a generated_files
table would keep failing every read of that column. This closes the gap.

Run once per database, with DATABASE_URL pointing at it:
    python migrations/add_generated_file_contents.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import psycopg2

from database.database import DATABASE_URL  # noqa: E402  (reads .env)


def main() -> int:
    print(f"target: {DATABASE_URL.split('@')[-1]}")

    conn = psycopg2.connect(DATABASE_URL)

    try:
        conn.autocommit = True

        with conn.cursor() as cur:
            cur.execute(
                "select to_regclass('public.generated_files') is not null"
            )
            table_exists = cur.fetchone()[0]

            if not table_exists:
                print("generated_files does not exist yet - create_all will make it complete")
                return 0

            cur.execute("""
                select 1 from information_schema.columns
                where table_schema = 'public'
                  and table_name = 'generated_files'
                  and column_name = 'contents'
            """)

            if cur.fetchone():
                print("contents column already present - nothing to do")
            else:
                cur.execute(
                    "alter table generated_files "
                    "add column contents text"
                )
                print("added generated_files.contents")

            cur.execute(
                "select count(*), count(contents) from generated_files"
            )
            total, with_contents = cur.fetchone()
            print(f"rows: {total}, with stored contents: {with_contents}")

            if total and not with_contents:
                print(
                    "note: every existing row predates the column. Their files "
                    "still resolve from disk in local development, but they will "
                    "preview as empty on a deployed host. Regenerate them, or "
                    "backfill from disk with migrations/backfill_file_contents.py"
                )
    finally:
        conn.close()

    return 0


if __name__ == "__main__":
    sys.exit(main())
