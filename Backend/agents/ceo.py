from llm import llm
from prompts.ceo import CEO_FINAL_PROMPT
from prompts.ceo_planner import CEO_PLANNER_PROMPT
from schemas.execution_plan import ExecutionPlan
from state.company_state import CompanyState
from services.agent_events import (
    emit_running,
    emit_completed,
)
from orchestrator.planner import resolve_execution_plan
from schemas.ceo import CEOFinalOutput

from database.database import SessionLocal
from database.crud import update_project_status

from database.database import SessionLocal
from database.crud import (
    get_complete_project,
    save_ceo_report
)


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

    print("🔍 CEO Agent Started")

    emit_running(
        state,
        "ceo"
    )
    
    response = ceo_chain.invoke(
        {
            "user_goal": state["user_goal"],
            "research_report": state["research_report"],
            "marketing_report": state["marketing_report"],
            "finance_report": state["finance_report"],
            "coding_report": state["coding_report"],
            "generated_project": state["generated_project"]
        }
    )

    db = SessionLocal()

    try:

        update_project_status(
            db=db,
            thread_id=state["thread_id"],
            status="completed"
        )

    finally:
        db.close()


    db = SessionLocal()

    try:

        print("Getting project...")

        project = get_complete_project(
            db,
            state["thread_id"]
        )

        print("PROJECT:", project)

        print("RESPONSE:", response)

        print("MODEL:", response.model_dump())

        if project:

            print("Saving CEO report...")

            save_ceo_report(
                db,
                project,
                response.model_dump()
            )

            print("CEO REPORT SAVED")

        else:

            print("PROJECT IS NONE")

    except Exception as e:

        print("CEO SAVE ERROR:", e)

    finally:

        db.close()

    print("✅ CEO Agent Completed")
    
    emit_completed(
        state,
        "ceo",
        response.model_dump()
    )

    return {
        "final_report": response.model_dump()
    }