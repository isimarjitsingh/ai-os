"""Fill generated_files.contents for rows written before the column existed.

Those rows only recorded a path, so on a deployed host they resolve to nothing
and the project previews empty even though the database lists the files. This
reads each path back off the local disk - which only works on the machine that
generated it - and stores the text.

Run it on the machine that has Backend/generated_projects/ populated, with
DATABASE_URL pointing at the database you want to fix.

    python migrations/backfill_file_contents.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import psycopg2

from database.database import DATABASE_URL  # noqa: E402

BACKEND_ROOT = Path(__file__).resolve().parents[1]


def resolve(stored_path: str) -> Path | None:
    """Locate a stored file_path on this machine, mirroring routes/files.py."""
    candidate = Path(stored_path)

    if not candidate.is_absolute():
        candidate = BACKEND_ROOT / candidate

    if candidate.is_file():
        return candidate

    parts = candidate.parts
    if "generated_projects" in parts:
        index = parts.index("generated_projects")
        if len(parts) > index + 2:
            fallback = BACKEND_ROOT / "generated_projects" / parts[index + 1] / Path(*parts[index + 2:])
            if fallback.is_file():
                return fallback

    return None


def main() -> int:
    print(f"target: {DATABASE_URL.split('@')[-1]}")
    print(f"scanning: {BACKEND_ROOT / 'generated_projects'}")

    conn = psycopg2.connect(DATABASE_URL)

    filled = missing = unreadable = already = 0

    try:
        with conn.cursor() as cur:
            cur.execute(
                "select id, file_path, contents from generated_files "
                "order by project_id, id"
            )
            rows = cur.fetchall()

            for file_id, stored_path, contents in rows:
                if contents is not None:
                    already += 1
                    continue

                path = resolve(stored_path)

                if path is None:
                    missing += 1
                    continue

                try:
                    text = path.read_text(encoding="utf-8")
                except (UnicodeDecodeError, OSError):
                    unreadable += 1
                    continue

                cur.execute(
                    "update generated_files set contents = %s where id = %s",
                    (text, file_id),
                )
                filled += 1

        conn.commit()
    finally:
        conn.close()

    print(f"already had contents: {already}")
    print(f"backfilled from disk:  {filled}")
    print(f"not found on disk:     {missing}")
    print(f"binary / unreadable:   {unreadable}")

    if missing:
        print(
            "note: unfound rows are ones whose files were written on another "
            "machine. They cannot be recovered - regenerate those projects."
        )

    return 0


if __name__ == "__main__":
    sys.exit(main())
