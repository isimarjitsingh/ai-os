from llm import structured_llm
from llm_fallback import invoke_structured
from services.agent_events import (
    emit_running,
    emit_completed,
)
from prompts.finance import FINANCE_PROMPT
from schemas.finance import FinanceOutput
from state.company_state import CompanyState
from tools.calculator import calculator

from database.database import SessionLocal
from database.crud import (
    get_complete_project,
    save_finance_report
)

# json_schema mode - see llm_fallback.py for why tool calling is avoided.
finance_llm = structured_llm(FinanceOutput)

finance_chain = FINANCE_PROMPT | finance_llm


FINANCE_FALLBACK_FIELDS = {
    "startup_cost": (
        "Estimated startup cost: $85,000 (calculated as "
        "5000 * 12 + 25000 by the finance tooling)."
    ),
    "monthly_cost": (
        "Estimated monthly operating cost: $5,000 covering "
        "hosting, tooling and salaries."
    ),
    "revenue_model": [
        "Monthly subscription",
        "Annual plans with discount",
        "Usage-based tiers",
    ],
    "pricing_strategy": (
        "Start with a simple monthly subscription, add an annual "
        "discount once retention is proven."
    ),
    "financial_risks": [
        "Customer acquisition cost exceeding projections",
        "Slower initial adoption",
        "Infrastructure costs growing with usage",
    ],
    "break_even_estimate": (
        "Break-even within 12-18 months assuming steady "
        "subscription growth."
    ),
}


def finance_agent(state: CompanyState):
    
    print("🔍 Finance Agent Started")

    emit_running(
        state,
        "finance"
    )
    
    startup_cost = calculator.invoke({
        "expression": "5000*12+25000"
        }
    )
    

    research = state["research_report"]

    response = invoke_structured(
        finance_chain,
        FinanceOutput,
        {
            "user_goal": state["user_goal"],
            "market_overview": research["market_overview"],
            "target_audience": research["target_audience"],
            "opportunities": research["opportunities"],
            "risks": research["risks"],
            "startup_cost": startup_cost
        },
        fields=FINANCE_FALLBACK_FIELDS,
        label="Finance Agent"
    )
    
    db = SessionLocal()

    try:

        project = get_complete_project(

            db,

            state["thread_id"],

            state["user_id"]

        )

        if project:

            save_finance_report(

                db,

                project,

                response.model_dump()

            )

    finally:

        db.close()

    print("✅ Finance Agent Completed")
        
    emit_completed(
        state,
        "finance",
        response.model_dump()
    )

    return {
        "finance_report": response.model_dump()
    }