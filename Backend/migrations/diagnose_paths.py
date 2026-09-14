"""Why did the backfill match only 17 of 467 rows?

Prints the distinct shapes of stored file_path values and checks each against
what is actually on disk, so the mismatch is diagnosed rather than assumed.
"""

from pathlib import Path
import sys
from collections import Counter

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import psycopg2  # noqa: E402

from database.database import DATABASE_URL  # noqa: E402

BACKEND_ROOT = Path(__file__).resolve().parents[1]
GENERATED = BACKEND_ROOT / "generated_projects"

conn = psycopg2.connect(DATABASE_URL)

try:
    with conn.cursor() as cur:
        cur.execute("select file_path from generated_files")
        paths = [r[0] for r in cur.fetchall()]

        cur.execute("""
            select p.project_name, count(*)
            from generated_files g join projects p on p.id = g.project_id
            group by p.project_name
            order by count(*) desc
        """)
        by_project = cur.fetchall()
finally:
    conn.close()

print(f"{len(paths)} rows in generated_files")
print()
print("top-level shape of stored paths:")

for prefix, count in Counter(p.split("/")[0] if "/" in p else p.split("\\")[0] for p in paths).most_common(10):
    print(f"  {count:4d}  {prefix!r}")

print()
print("separator style:")
print("  forward slash:", sum(1 for p in paths if "/" in p))
print("  backslash    :", sum(1 for p in paths if "\\" in p))

print()
print(f"on-disk projects under generated_projects/: {len([d for d in GENERATED.glob('*') if d.is_dir()]) if GENERATED.exists() else 0}")
if GENERATED.exists():
    for d in sorted(GENERATED.glob("*")):
        if d.is_dir():
            print(f"  {d.name}  ({len(list(d.rglob('*')))} entries)")

print()
print("rows per project (db):")
for name, count in by_project[:15]:
    on_disk = (GENERATED / name).exists() if name else False
    print(f"  {count:4d}  {name!r}  dir_on_disk={on_disk}")

print()
print("sample stored paths:")
for p in paths[:8]:
    print("  ", p)
