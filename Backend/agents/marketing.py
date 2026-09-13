from llm import structured_llm
from llm_fallback import invoke_structured
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

# json_schema mode - see llm_fallback.py for why tool calling is avoided.
marketing_llm = structured_llm(MarketingOutput)

marketing_chain = MARKETING_PROMPT | marketing_llm


MARKETING_FALLBACK_FIELDS = {
    "marketing_summary": (
        "Marketing strategy could not be generated automatically. "
        "Focus on a focused launch to the target audience identified "
        "by the research agent."
    ),
    "positioning": (
        "Position the product on simplicity and time-to-value "
        "compared with existing tools."
    ),
    "target_channels": [
        "Content marketing",
        "Social media",
        "Product Hunt launch",
    ],
    "launch_strategy": [
        "Launch an MVP to early adopters",
        "Collect feedback and iterate",
        "Scale paid acquisition after retention is proven",
    ],
    "content_ideas": [
        "How-to guides for the core workflow",
        "Comparison posts against incumbent tools",
        "Customer success stories",
    ],
    "kpis": [
        "Signups",
        "Activation rate",
        "Weekly active users",
        "Customer acquisition cost",
    ],
}


def marketing_agent(state: CompanyState):
    
    print("🔍 Marketing Agent Started")

    emit_running(
        state,
        "marketing"
    )

    research = state["research_report"]

    response = invoke_structured(
        marketing_chain,
        MarketingOutput,
        {
            "user_goal": state["user_goal"],
            "market_overview": research["market_overview"],
            "target_audience": research["target_audience"],
            "competitors": research["competitors"],
            "key_features": research["key_features"],
        },
        fields=MARKETING_FALLBACK_FIELDS,
        label="Marketing Agent"
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