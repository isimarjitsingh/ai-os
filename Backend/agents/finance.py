from llm import llm
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

finance_llm = llm.with_structured_output(FinanceOutput)

finance_chain = FINANCE_PROMPT | finance_llm


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

    response = finance_chain.invoke(
        {
            "user_goal": state["user_goal"],
            "market_overview": research["market_overview"],
            "target_audience": research["target_audience"],
            "opportunities": research["opportunities"],
            "risks": research["risks"],
            "startup_cost": startup_cost
        }
    )
    
    db = SessionLocal()

    try:

        project = get_complete_project(

            db,

            state["thread_id"]

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