from llm import llm
from services.agent_events import (
    emit_running,
    emit_completed,
)
from prompts.research import RESEARCH_PROMPT
from state.company_state import CompanyState
from schemas.research import ResearchOutput
from tools.web_search import web_search   # I still prefer this name

from database.database import SessionLocal
from database.crud import (
    get_complete_project,
    save_research_report
)

research_llm = llm.with_structured_output(ResearchOutput)

chain = RESEARCH_PROMPT | research_llm


def research_agent(state: CompanyState):

    emit_running(
        state,
        "research"
    )
   
    print("🔍 Research Agent Started")

    try:
        search_results = web_search.invoke(
            {
                "query": state["user_goal"]
            }
        )

    except Exception as e:
        print(f"Web Search Error: {e}")
        search_results = "No web search results available."

    response = chain.invoke(
        {
            "user_goal": state["user_goal"],
            "web_results": search_results
        }
    )

    db = SessionLocal()

    try:

        project = get_complete_project(

            db,

            state["thread_id"]

        )

        if project:

            save_research_report(

                db,

                project,

                response.model_dump()

            )

    finally:

        db.close()

    print("✅ Research Agent Completed")

    emit_completed(
        state,
        "research",
        response.model_dump()
    )

    return {
        "research_report": response.model_dump()
    }