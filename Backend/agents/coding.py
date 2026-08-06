from llm import llm

from prompts.coding import CODING_PROMPT
from schemas.coding import CodingOutput
from state.company_state import CompanyState
from services.agent_events import (
    emit_running,
    emit_completed,
)

from database.database import SessionLocal
from database.crud import (
    get_complete_project,
    save_coding_report
)

coding_llm = llm.with_structured_output(CodingOutput)

coding_chain = CODING_PROMPT | coding_llm


def coding_agent(state: CompanyState):

    print("🔍 Coding Agent Started")

    emit_running(
        state,
        "coding"
    )
    
    research = state["research_report"]

    response = coding_chain.invoke(
        {
            "user_goal": state["user_goal"],
            "target_audience": research["target_audience"],
            "competitors": research["competitors"],
            "key_features": research["key_features"],
            "opportunities": research["opportunities"],
        }
    )

    db = SessionLocal()

    try:

        project = get_complete_project(

            db,

            state["thread_id"]

        )

        if project:

            save_coding_report(

                db,

                project,

                response.model_dump()

            )

    finally:

        db.close()
    
    print("✅ Coding Agent Completed")
    
    emit_completed(
        state,
        "coding",
        response.model_dump()
    )

    return {
        "coding_report": response.model_dump()
    }