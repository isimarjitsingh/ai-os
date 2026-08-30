from llm import llm
from services.agent_events import (
    emit_running,
    emit_completed,
)
from prompts.marketing import MARKETING_PROMPT
from schemas.marketing import MarketingOutput
from state.company_state import CompanyState

from database.database import SessionLocal
from database.crud import (
    get_complete_project,
    save_marketing_report
)

marketing_llm = llm.with_structured_output(MarketingOutput)

marketing_chain = MARKETING_PROMPT | marketing_llm


def marketing_agent(state: CompanyState):
    
    print("🔍 Marketing Agent Started")

    emit_running(
        state,
        "marketing"
    )

    research = state["research_report"]

    response = marketing_chain.invoke(
        {
            "user_goal": state["user_goal"],
            "market_overview": research["market_overview"],
            "target_audience": research["target_audience"],
            "competitors": research["competitors"],
            "key_features": research["key_features"],
        }
    )
    
    db = SessionLocal()

    try:

        project = get_complete_project(

            db,

            state["thread_id"],

            state["user_id"]

        )

        if project:

            save_marketing_report(

                db,

                project,

                response.model_dump()

            )

    finally:

        db.close()

    print("✅ Marketing Agent Completed")
    
    emit_completed(
        state,
        "marketing",
        response.model_dump()
    )

    return {
        "marketing_report": response.model_dump()
    }