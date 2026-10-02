"""Bring a pre-existing database up to the current model, one command.

Base.metadata.create_all() (run on every startup) creates missing TABLES but
never adds missing COLUMNS to tables that already exist. A database that
predates a model change therefore keeps its old shape, and the first query
that selects a column the model now declares raises
'column <name> does not exist'. On a deployed backend that error escapes the
route, answers as a bare 500 from the outermost middleware layer, and reaches
the browser as a CORS block - because that 500 carries no
Access-Control-Allow-Origin header. It looks like a CORS bug and is not.

This script closes the gap for every table at once: it creates any missing
table, compares the live schema against database.models, and adds each missing
column with the type the model declares. It is add-only - it never drops or
modifies existing columns or data - and it is idempotent, so it is safe to
re-run any number of times.

Run once per database, with DATABASE_URL pointing at it:
    python migrations/ensure_schema.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import inspect, text

from database.database import DATABASE_URL, engine
from database import Base, models  # noqa: F401  (registers every table)


def _compile_type(column):
    """The column type as the target dialect spells it."""

    return str(
        column.type.compile(dialect=engine.dialect)
    )


def _compile_default(column):
    """A DEFAULT clause for the column, or None if it has no default."""

    if column.server_default is None:
        return None

    arg = column.server_default.arg

    # A SQL expression such as func.now() compiles per dialect; a plain
    # Python value (a string or number) is quoted as a literal instead.
    if hasattr(arg, "compile"):

        default = str(
            arg.compile(dialect=engine.dialect)
        ).strip()

        # SQLite only knows CURRENT_TIMESTAMP, not the Postgres now().
        if (
            engine.dialect.name == "sqlite"
            and default.lower() == "now()"
        ):
            default = "CURRENT_TIMESTAMP"

        return "DEFAULT " + default

    if isinstance(arg, str):
        escaped = arg.replace("'", "''")
        return "DEFAULT '{}'".format(escaped)

    return "DEFAULT {}".format(arg)


def _placeholder_default(column):
    """
    A missing NOT NULL column that declares no default still has to get a
    value for every existing row, so we add a type-appropriate one.
    """

    type_name = _compile_type(column).upper()

    if "INT" in type_name:
        return "DEFAULT 0"

    return "DEFAULT ''"


def ensure_schema() -> int:

    print("target: {}".format(DATABASE_URL.split("@")[-1]))

    # Missing tables first - this is the half create_all already does.
    Base.metadata.create_all(bind=engine)

    with engine.begin() as connection:

        inspector = inspect(connection)

        existing_tables = set(inspector.get_table_names())

        for table in Base.metadata.sorted_tables:

            table_name = table.name

            if table_name not in existing_tables:
                print("table {} was just created by create_all".format(table_name))
                continue

            live_columns = {
                column["name"]
                for column in inspector.get_columns(table_name)
            }

            for column in table.columns:

                if column.name in live_columns:
                    continue

                alter = "ALTER TABLE {} ADD COLUMN {} {}".format(
                    '"{}"'.format(table_name),
                    '"{}"'.format(column.name),
                    _compile_type(column),
                )

                default = _compile_default(column)

                if default is None and not column.nullable:
                    default = _placeholder_default(column)
                    print(
                        "note: {} on {} is NOT NULL with no declared default; "
                        "existing rows will receive the placeholder value".format(
                            column.name,
                            table_name
                        )
                    )

                if default is not None:
                    alter += " " + default

                print("adding {} ({})".format(column.name, alter))

                connection.execute(
                    text(alter)
                )

    # ------------------------------------------------------------------
    # VERIFY
    # ------------------------------------------------------------------

    with engine.connect() as connection:

        inspector = inspect(connection)

        problems = []

        for table in Base.metadata.sorted_tables:

            if table.name not in inspector.get_table_names():
                problems.append("table {} missing".format(table.name))
                continue

            live_columns = {
                column["name"]
                for column in inspector.get_columns(table.name)
            }

            for column in table.columns:

                if column.name not in live_columns:
                    problems.append(
                        "column {}.{} missing".format(
                            table.name,
                            column.name
                        )
                    )

    if problems:
        for problem in problems:
            print("STILL MISSING: {}".format(problem))
        return 1

    print("\nSchema matches the current model. Nothing to do on future runs.")
    return 0


if __name__ == "__main__":
    sys.exit(ensure_schema())
