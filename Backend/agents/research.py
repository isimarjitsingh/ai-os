from llm import llm

from prompts.research import RESEARCH_PROMPT
from state.company_state import CompanyState
from schemas.research import ResearchOutput
from tools.web_search import web_search   # I still prefer this name


research_llm = llm.with_structured_output(ResearchOutput)

chain = RESEARCH_PROMPT | research_llm


def research_agent(state: CompanyState):

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

    print("✅ Research Agent Completed")

    return {
        "research_report": response.model_dump()
    }