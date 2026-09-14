"""How much is actually recoverable, and what still points at nothing.

The first backfill pass reported 17 filled and 450 missing, which looked like a
bug in the path resolution. It is not: only one project directory survives on
disk. This confirms that directly by counting real files and correlating against
the rows that now carry contents.
"""

from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import psycopg2  # noqa: E402

from database.database import DATABASE_URL  # noqa: E402

BACKEND_ROOT = Path(__file__).resolve().parents[1]
GENERATED = BACKEND_ROOT / "generated_projects"

print("everything under generated_projects/:")

disk_files = []

for entry in sorted(GENERATED.rglob("*")):
    depth = len(entry.relative_to(GENERATED).parts)
    if depth > 3:
        continue
    kind = "FILE" if entry.is_file() else "DIR "
    size = entry.stat().st_size if entry.is_file() else 0
    if entry.is_file():
        disk_files.append(entry)
    print(f"  [{kind}] {entry.relative_to(GENERATED)}  {size if entry.is_file() else ''}")

print()
print(f"actual files on disk: {len(disk_files)}")

conn = psycopg2.connect(DATABASE_URL)

try:
    with conn.cursor() as cur:
        cur.execute(
            "select count(*), count(contents) from generated_files"
        )
        total, stored = cur.fetchone()
        print(f"db rows: {total}, rows now carrying contents: {stored}")

        cur.execute("""
            select p.project_name, count(*) total, count(g.contents) with_contents
            from generated_files g join projects p on p.id = g.project_id
            group by p.project_name
            having count(g.contents) > 0
            order by total desc
        """)
        recovered = cur.fetchall()
        print()
        print("projects with recoverable files:")
        for name, total_rows, with_contents in recovered:
            print(f"  {name!r}: {with_contents}/{total_rows} rows have contents")

        cur.execute("""
            select count(distinct p.project_name)
            from generated_files g join projects p on p.id = g.project_id
            where g.contents is null
        """)
        print()
        print("projects still metadata-only:", cur.fetchone()[0])
finally:
    conn.close()
