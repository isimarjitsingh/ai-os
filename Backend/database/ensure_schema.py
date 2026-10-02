"""Bring a pre-existing database up to the current model, one call.

Base.metadata.create_all() creates missing TABLES but never adds missing
COLUMNS to tables that already exist. A database that predates a model change
therefore keeps its old shape, and the first query that selects a column the
model now declares raises 'column <name> does not exist'. On a deployed backend
that error escapes the route, answers as a bare 500 from the outermost
middleware layer, and reaches the browser as a CORS block - because that 500
carries no Access-Control-Allow-Origin header. It looks like a CORS bug and is
not.

ensure_schema() closes the gap for every table at once: it creates any missing
table, compares the live schema against database.models, and adds each missing
column with the type the model declares. It is add-only - it never drops or
modifies existing columns or data - and it is idempotent, so it is safe to run
on every startup.

main.py runs it automatically at boot, which is what keeps a deployed database
from ever staying stale after a model change. The manual form for a database
the running app cannot reach on its own is migrations/ensure_schema.py:
    python migrations/ensure_schema.py
"""

from sqlalchemy import inspect, text

from sqlalchemy.exc import SQLAlchemyError

from database.database import DATABASE_URL, engine, Base
from database import models  # noqa: F401  (registers every table)


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


def _live_columns(connection, table_name):
    """The column names the database currently has on this table."""

    return {
        column["name"]
        for column in inspect(connection).get_columns(table_name)
    }


def ensure_schema() -> int:

    print("schema target: {}".format(DATABASE_URL.split("@")[-1]), flush=True)

    # Missing tables first - this is the half create_all already does.
    Base.metadata.create_all(bind=engine)

    with engine.begin() as connection:

        inspector = inspect(connection)

        existing_tables = set(inspector.get_table_names())

        for table in Base.metadata.sorted_tables:

            table_name = table.name

            if table_name not in existing_tables:
                print(
                    "table {} was just created by create_all".format(table_name),
                    flush=True
                )
                continue

            live_columns = _live_columns(connection, table_name)

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
                        ),
                        flush=True
                    )

                if default is not None:
                    alter += " " + default

                print(
                    "adding {}.{} ({})".format(table_name, column.name, alter),
                    flush=True
                )

                try:
                    connection.execute(
                        text(alter)
                    )
                except SQLAlchemyError:
                    # Two containers can boot at once (a restart overlapping a
                    # scale-up); the second ALTER for a column the first already
                    # added fails with 'column already exists'. That is the win
                    # condition, not an error - re-check and move on, and only
                    # re-raise when the column still genuinely is not there.
                    if column.name in _live_columns(connection, table_name):
                        continue
                    raise

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

            live_columns = _live_columns(connection, table.name)

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
            print("STILL MISSING: {}".format(problem), flush=True)
        return 1

    print(
        "\nSchema matches the current model. Nothing to do on future runs.",
        flush=True
    )
    return 0
