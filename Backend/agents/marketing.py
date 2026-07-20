from llm import llm

from prompts.marketing import MARKETING_PROMPT
from schemas.marketing import MarketingOutput
from state.company_state import CompanyState

marketing_llm = llm.with_structured_output(MarketingOutput)

marketing_chain = MARKETING_PROMPT | marketing_llm


def marketing_agent(state: CompanyState):

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

    return {
        "marketing_report": response.model_dump()
    }