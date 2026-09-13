"""Live proof that the finance step now survives an unreadable provider reply.

Same thread/project that died (e2fc44a7, project 48), but called through the
exact production path: invoke_structured() with finance.py's own arguments.

Before the fix the OpenRouter envelope with `choices: null` raised
TypeError: 'NoneType' object is not iterable out of the node and killed the
graph. Now the same reply must be named as an unreadable provider response,
retried, and the run must end on a FinanceOutput the workflow can carry on
with - either a real generation or the documented fallback.

Writes nothing to the database. Costs real API calls.
"""
import json
import logging
import time

logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

from database.database import SessionLocal
from database.crud import get_complete_project
from tools.calculator import calculator
from agents.finance import finance_chain, FINANCE_FALLBACK_FIELDS
from schemas.finance import FinanceOutput
from llm_fallback import invoke_structured

# Again, and deliberately AFTER the imports: creating the engine puts
# sqlalchemy's own logger back to INFO, which buries the few lines this script
# exists to print under the whole SELECT that loads the project.
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
logging.getLogger("sqlalchemy.exc").setLevel(logging.WARNING)

THREAD_ID = "e2fc44a7-96c7-4174-a7b7-ad43386bb51e"
USER_ID = 6


def as_list(value):

    if isinstance(value, list):
        return value

    if not value:
        return []

    try:
        parsed = json.loads(value)
    except (TypeError, ValueError):
        return [str(value)]

    return parsed if isinstance(parsed, list) else [str(parsed)]


db = SessionLocal()

try:
    project = get_complete_project(db, THREAD_ID, USER_ID)

    if project is None:
        raise SystemExit(f"no project for thread {THREAD_ID}")

    research_row = project.research_report

    inputs = {
        "user_goal": project.startup_idea,
        "market_overview": research_row.market_overview or "",
        "target_audience": as_list(research_row.target_audience),
        "opportunities": as_list(research_row.opportunities),
        "risks": as_list(research_row.risks),
        "startup_cost": calculator.invoke({"expression": "5000*12+25000"}),
    }

    print(f"prompt inputs rebuilt: "
          f"{sum(len(str(v)) for v in inputs.values())} characters",
          flush=True)

    started = time.monotonic()

    try:
        response = invoke_structured(
            finance_chain,
            FinanceOutput,
            inputs,
            fields=FINANCE_FALLBACK_FIELDS,
            label="Finance Agent",
        )

        print(f"\nLADDER RETURNED in {time.monotonic() - started:.1f}s -> "
              f"{type(response).__name__}", flush=True)

        for name in FinanceOutput.model_fields:
            value = getattr(response, name)
            print(f"  {name}: {str(value)[:90]}", flush=True)

    except Exception as error:
        print(f"\nLADDER RAISED in {time.monotonic() - started:.1f}s -> "
              f"{type(error).__name__}: {error}", flush=True)
        raise

finally:
    db.close()
