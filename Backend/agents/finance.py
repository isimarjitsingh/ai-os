from llm import llm

from prompts.finance import FINANCE_PROMPT
from schemas.finance import FinanceOutput
from state.company_state import CompanyState


finance_llm = llm.with_structured_output(FinanceOutput)

finance_chain = FINANCE_PROMPT | finance_llm


def finance_agent(state: CompanyState):

    research = state["research_report"]

    response = finance_chain.invoke(
        {
            "user_goal": state["user_goal"],
            "market_overview": research["market_overview"],
            "target_audience": research["target_audience"],
            "opportunities": research["opportunities"],
            "risks": research["risks"],
        }
    )

    return {
        "finance_report": response.model_dump()
    }