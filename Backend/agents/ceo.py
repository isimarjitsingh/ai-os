from llm import llm
from prompts.ceo import CEO_FINAL_PROMPT
from prompts.ceo_planner import CEO_PLANNER_PROMPT
from schemas.execution_plan import ExecutionPlan
from state.company_state import CompanyState
from orchestrator.planner import resolve_execution_plan
from schemas.ceo import CEOFinalOutput


planner_llm = llm.with_structured_output(ExecutionPlan)
planner_chain = CEO_PLANNER_PROMPT | planner_llm


ceo_llm = llm.with_structured_output(CEOFinalOutput)
ceo_chain = CEO_FINAL_PROMPT | ceo_llm




def ceo_initialize(state:CompanyState):

    execution_plan = planner_chain.invoke(
        {
            "user_goal": state["user_goal"]
        }
    )

    print(f"DEBUG - Execution Plan from LLM: {execution_plan}")

    resolved_plan = resolve_execution_plan(
        execution_plan.model_dump()
    )

    print(f"DEBUG - Resolved Execution Plan: {resolved_plan}")

    return {
        "execution_plan": resolved_plan
    }



def ceo_finalize(state: CompanyState):

    response = ceo_chain.invoke(
        {
            "user_goal": state["user_goal"],
            "research_report": state["research_report"],
            "marketing_report": state["marketing_report"],
            "finance_report": state["finance_report"],
            "coding_report": state["coding_report"],
        }
    )

    return {
        "final_report": response.model_dump()
    }