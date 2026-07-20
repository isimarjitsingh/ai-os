from llm import llm

from prompts.research import RESEARCH_PROMPT
from state.company_state import CompanyState
from schemas.research import ResearchOutput


research_llm = llm.with_structured_output(ResearchOutput)

chain = RESEARCH_PROMPT | research_llm

def research_agent(state:CompanyState):


    response=chain.invoke({"user_goal": state["user_goal"]})


    return {

    "research_report": response.model_dump()

    }