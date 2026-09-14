"""Copy every row from the local development database into DATABASE_URL.

One direction only: local -> hosted. Tables are walked in SQLAlchemy's
foreign-key-safe order so inserts do not trip a constraint, children are
truncated before their parents are reloaded, and sequences are re-set to
max(id) afterwards so the next insert does not collide with a copied id.

    python migrations/copy_local_to_target.py
"""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import psycopg2
from psycopg2.extras import execute_values

from database.database import DATABASE_URL  # noqa: E402
from database import models  # noqa: E402  registers the tables on Base
from database.database import Base  # noqa: E402

# The local database this copies FROM. Deliberately NOT defaulted: it carries a
# real password, and a script in the repository must never ship one. Set it in
# the shell before running, or pass it as the first non-flag argument.
_POSITIONAL = [a for a in sys.argv[1:] if not a.startswith("--")]

SOURCE_URL = os.getenv("LOCAL_DATABASE_URL") or (
    _POSITIONAL[0] if _POSITIONAL else None
)

if not SOURCE_URL:
    sys.exit(
        "LOCAL_DATABASE_URL is not set.\n\n"
        "  PowerShell:\n"
        '    $env:LOCAL_DATABASE_URL = "postgresql://postgres:YOUR_PASSWORD@localhost:5432/ai_company_os"\n'
        "    python migrations/copy_local_to_target.py\n"
    )

TABLES = [table.name for table in Base.metadata.sorted_tables]


def copy_table(source, target, table_name: str) -> int:
    # A plain cursor, deliberately. The obvious "stream with a named cursor"
    # version read column names off cursor.description before the first fetch,
    # and psycopg2 leaves that as None for server-side cursors until rows come
    # back - so every table silently reported zero rows and the whole copy was a
    # no-op that still printed success. These tables are small; simplicity wins.
    with source.cursor() as read_cur:
        read_cur.execute(f'select * from "{table_name}"')

        columns = [d.name for d in read_cur.description]
        rows = read_cur.fetchall()

    with target:
        with target.cursor() as write_cur:
            # Children first, then reload: a half-copied database is worse than a
            # momentarily empty one, and this script is only ever run against a
            # target that is being seeded.
            write_cur.execute(f'truncate table "{table_name}" restart identity cascade')

            if not rows:
                print(f"  {table_name}: 0 rows")
                return 0

            quoted = ", ".join(f'"{c}"' for c in columns)

            # execute_values expects ONE %s standing for the whole tuple list and
            # expands it itself; writing "values (%s, %s, ...)" makes it raise
            # "the query contains more than one '%s' placeholder".
            execute_values(
                write_cur,
                f'insert into "{table_name}" ({quoted}) values %s',
                rows,
                page_size=500,
            )

            # "restart identity" above resets the sequence to 1, which would make
            # the next inserted row collide with a copied id.
            if "id" in columns:
                write_cur.execute(
                    f'select setval(pg_get_serial_sequence(\'"{table_name}"\', \'id\'), '
                    f'coalesce(max(id), 1), max(id) is not null) from "{table_name}"'
                )

    print(f"  {table_name}: {len(rows)} rows")
    return len(rows)


def _columns(conn, table_name: str) -> list:
    """Column names of a table, alphabetically, as the canonical ordering."""
    with conn.cursor() as cur:
        cur.execute(
            "select column_name from information_schema.columns "
            "where table_name = %s order by column_name",
            (table_name,),
        )
        return [row[0] for row in cur.fetchall()]


def _canonical_cols(source_cols: list, target_cols: list) -> list:
    """Columns present on both sides, in canonical order.

    Sorting is the whole point. The local `projects` table has `user_id` last
    because it was added by an ALTER TABLE long after create_all, while Neon
    built the table from the model and has `user_id` second. Hashing `t::text`
    therefore declared all 55 rows different when the row data was byte-for-byte
    identical - a false alarm about a healthy migration. Hash the intersection in
    a fixed order and physical layout stops mattering.
    """
    target_set = set(target_cols)
    return [c for c in source_cols if c in target_set]


def _normalize_timezone(conn) -> None:
    """Pin the session to UTC so timestamptz renders identically on both sides.

    Without this, `"col"::text` formats according to the SESSION TimeZone, which
    is UTC on Neon but whatever the local installer picked on the source. The
    first run flagged exactly users and projects as DATA_DIFF and left the other
    six tables clean - those are the only ones with DateTime(timezone=True)
    columns, which is what identified it as a formatting artifact rather than
    corruption. Same instant, different string. Normalize the session, never the
    stored data.
    """
    with conn.cursor() as cur:
        cur.execute("set time zone 'UTC'")


def _checksum(conn, table_name: str, columns: list) -> str:
    """One hash over the canonical columns of every row, order-independent.

    Row counts matching proves nothing about the VALUES. This proves the bytes
    survived the round trip. Rows are aggregated in hash order so the result is
    independent of physical row order and of which page returned them.
    """
    col_sql = ", ".join(f'"{c}"::text' for c in columns)
    query = (
        f'select md5(string_agg(row_hash, chr(10) order by row_hash)) '
        f'from (select md5(concat_ws(chr(31), {col_sql})) as row_hash '
        f'from "{table_name}") s'
    )
    with conn.cursor() as cur:
        cur.execute(query)
        return cur.fetchone()[0] or "<empty>"


def verify_counts(source, target) -> bool:
    """Compare per-table row counts, column sets, and full-table checksums.

    The first version of this script reported "copied 0 rows across 8 tables"
    and still exited 0, because a cursor quirk made every table look empty. A
    success line is not evidence; this is.
    """
    _normalize_timezone(source)
    _normalize_timezone(target)

    ok = True

    print()
    print(f"{'table':<20} {'source':>8} {'target':>8}  {'data':<12}")

    for table_name in TABLES:
        with source.cursor() as cur:
            cur.execute(f'select count(*) from "{table_name}"')
            from_count = cur.fetchone()[0]

        with target.cursor() as cur:
            cur.execute(f'select count(*) from "{table_name}"')
            to_count = cur.fetchone()[0]

        source_cols = _columns(source, table_name)
        target_cols = _columns(target, table_name)
        common = _canonical_cols(source_cols, target_cols)

        source_hash = _checksum(source, table_name, common)
        target_hash = _checksum(target, table_name, common)

        counts_ok = from_count == to_count
        schema_ok = source_cols == target_cols
        data_ok = source_hash == target_hash
        ok = ok and counts_ok and schema_ok and data_ok

        if not counts_ok:
            verdict = "COUNT_DIFF"
        elif not schema_ok:
            # A column present locally and absent remotely means silent data
            # loss for that column, so this fails the run rather than noting it.
            verdict = "SCHEMA_DIFF"
        elif not data_ok:
            verdict = "DATA_DIFF"
        else:
            verdict = "ok"

        print(f"{table_name:<20} {from_count:>8} {to_count:>8}  {verdict:<12}")

        if not schema_ok:
            _report_schema(source_cols, target_cols)

        if not data_ok:
            _show_diff(source, target, table_name, common)

    return ok


def _report_schema(source_cols: list, target_cols: list) -> None:
    """Name the columns that exist on only one side.

    Both lists come back from information_schema in alphabetical order, so a
    pure physical reordering is not reported here - and does not need to be. The
    copy inserts by column name and the hashes are computed over a canonical
    column order, so layout is irrelevant; a genuinely missing column is not.
    """
    only_src = [c for c in source_cols if c not in target_cols]
    only_tgt = [c for c in target_cols if c not in source_cols]

    print(f"    column set differs  source-only={only_src or '-'} "
          f"target-only={only_tgt or '-'}")


def _show_diff(source, target, table_name: str, columns: list,
               limit: int = 5) -> None:
    """Print the primary keys whose canonical row hash differs.

    A bare DATA_DIFF says "something is wrong" and nothing about what. This
    narrows it to specific rows in one run.
    """
    col_sql = ", ".join(f'"{c}"::text' for c in columns)
    query = (
        f'select "id", md5(concat_ws(chr(31), {col_sql})) '
        f'from "{table_name}" order by "id"'
    )

    with source.cursor() as cur:
        cur.execute(query)
        source_rows = dict(cur.fetchall())

    with target.cursor() as cur:
        cur.execute(query)
        target_rows = dict(cur.fetchall())

    missing = [i for i in source_rows if i not in target_rows]
    extra = [i for i in target_rows if i not in source_rows]
    changed = [
        i for i, h in source_rows.items()
        if i in target_rows and target_rows[i] != h
    ]

    for label, ids in (("only in source", missing), ("only in target", extra),
                       ("content differs", changed)):
        if ids:
            shown = ", ".join(str(i) for i in ids[:limit])
            more = f" (+{len(ids) - limit} more)" if len(ids) > limit else ""
            print(f"    {label}: ids {shown}{more}")


def main() -> int:
    verify_only = "--verify-only" in sys.argv

    print(f"source: {SOURCE_URL.split('@')[-1]}")
    print(f"target: {DATABASE_URL.split('@')[-1]}")

    source = psycopg2.connect(SOURCE_URL)
    target = psycopg2.connect(DATABASE_URL)

    grand_total = 0

    try:
        if not verify_only:
            for table_name in TABLES:
                grand_total += copy_table(source, target, table_name)

        counts_match = verify_counts(source, target)
    finally:
        source.close()
        target.close()

    if verify_only:
        print("\n(verify-only: nothing was read into the target or modified)")
    else:
        print(f"\ncopied {grand_total} rows across {len(TABLES)} tables")

    if not counts_match:
        print("RESULT: source and target disagree")
        return 1

    if not verify_only and grand_total == 0:
        print("RESULT: nothing was copied - check the source database")
        return 1

    print("RESULT: all tables match")
    return 0


if __name__ == "__main__":
    sys.exit(main())
