from llm import llm

from prompts.coding import CODING_PROMPT
from schemas.coding import CodingOutput
from state.company_state import CompanyState


coding_llm = llm.with_structured_output(CodingOutput)

coding_chain = CODING_PROMPT | coding_llm


def coding_agent(state: CompanyState):

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

    return {
        "coding_report": response.model_dump()
    }