import time
from typing import Any

from llm import structured_llm
from llm_fallback import invoke_structured
from prompts.ceo import CEO_FINAL_PROMPT
from prompts.ceo_planner import CEO_PLANNER_PROMPT
from schemas.execution_plan import ExecutionPlan
from schemas.ceo import CEOFinalOutput
from state.company_state import CompanyState

from services.agent_events import (
    emit_running,
    emit_completed,
)

from orchestrator.planner import resolve_execution_plan

from database.database import SessionLocal
from database.crud import (
    update_project_status,
    get_complete_project,
    save_ceo_report,
)


# ============================================================
# CEO PLANNER
# ============================================================

# json_schema mode instead of tool calling - tool_choice based structured
# output intermittently dies with Groq 400 "tool_use_failed" on
# openai/gpt-oss-120b (the original CEO crash that produced empty
# plans before the fallback existed).
# Chains are built at runtime inside the agent functions so that
# a user-supplied API key can be passed through CompanyState.


def _build_planner_chain(api_key: str | None = None):
    llm = structured_llm(ExecutionPlan, api_key=api_key)
    return CEO_PLANNER_PROMPT | llm


# Fallback plan mirrors the hardcoded plan that ceo_initialize's
# exception handler already used: run everything that generates value.
PLANNER_FALLBACK_FIELDS = {
    "research": True,
    "marketing": True,
    "finance": True,
    "coding": True,
    "hr": False,
    "sales": False,
    "customer_support": False,
}


# ============================================================
# CEO FINAL REPORT
# ============================================================


def _build_ceo_chain(api_key: str | None = None):
    llm = structured_llm(CEOFinalOutput, api_key=api_key)
    return CEO_FINAL_PROMPT | llm


# Fallback report used when the CEO LLM call cannot be recovered. The
# dict keys are filtered against CEOFinalOutput.model_fields inside
# llm_fallback.fallback_model, and the values are static versions of
# what ceo_finalize's exception handler already produced by hand.
CEO_FALLBACK_FIELDS = {
    "project_name": "AI Generated Project",

    "executive_summary": (
        "The project was successfully generated after completing "
        "the required research, marketing, finance, and engineering "
        "workflows."
    ),

    "business_viability": (
        "The project demonstrates potential based on the available "
        "research, financial analysis, and technical implementation."
    ),

    "target_market": (
        "The primary target market is based on the customer segment "
        "identified by the research and marketing agents."
    ),

    "unique_value_proposition": (
        "The product combines the identified customer needs with the "
        "proposed technical solution to provide a differentiated "
        "experience."
    ),

    "recommended_mvp": [
        "Core product functionality",
        "User authentication",
        "Primary customer workflow",
        "Basic dashboard",
        "Essential API functionality",
    ],

    "recommended_tech_stack": [
        "Next.js",
        "TypeScript",
        "NestJS",
        "PostgreSQL",
        "REST API",
    ],

    "launch_strategy": [
        "Launch an MVP with the core user workflow",
        "Collect feedback from early users",
        "Improve product-market fit",
        "Expand features based on usage data",
    ],

    "estimated_budget": (
        "Budget should be finalized using the detailed finance agent "
        "projections."
    ),

    "major_risks": [
        "Product-market fit risk",
        "Customer acquisition cost",
        "Technical implementation complexity",
        "Competition",
    ],

    "next_steps": [
        "Review the generated project",
        "Install project dependencies",
        "Configure environment variables",
        "Run backend and frontend",
        "Test the core user workflows",
    ],
}


# ============================================================
# CEO INITIALIZE
# ============================================================

def ceo_initialize(state: CompanyState):

    print("🔍 CEO Initialize Agent Started")
    print(f"CEO Initialize - User Goal: {state['user_goal']}")
    print(f"CEO Initialize - Thread ID: {state['thread_id']}")

    emit_running(
        state,
        "ceo_initialize"
    )

    try:

        print("CEO Initialize - Calling LLM for execution plan...")

        execution_plan = invoke_structured(
            _build_planner_chain(state.get("api_key")),
            ExecutionPlan,
            {
                "user_goal": state["user_goal"]
            },
            fields=PLANNER_FALLBACK_FIELDS,
            label="CEO Planner"
        )

        print(
            f"DEBUG - Execution Plan from LLM: {execution_plan}"
        )

        print(
            f"DEBUG - Execution Plan Type: {type(execution_plan)}"
        )

        if hasattr(execution_plan, "model_dump"):
            plan_dict = execution_plan.model_dump()
        else:
            plan_dict = execution_plan

        print(
            f"DEBUG - Plan Dict: {plan_dict}"
        )

        resolved_plan = resolve_execution_plan(
            plan_dict
        )

        print(
            f"DEBUG - Resolved Execution Plan: {resolved_plan}"
        )

        # ----------------------------------------------------
        # Always enable coding for project generation
        # ----------------------------------------------------

        if not resolved_plan.get("coding"):

            print(
                "FORCE ENABLING CODING AGENT FOR FILE GENERATION"
            )

            resolved_plan["coding"] = True

        # ----------------------------------------------------
        # Ensure at least one agent is enabled
        # ----------------------------------------------------

        if not any(
            [
                resolved_plan.get("research"),
                resolved_plan.get("marketing"),
                resolved_plan.get("finance"),
                resolved_plan.get("coding"),
            ]
        ):

            print(
                "WARNING: No agents enabled in plan. "
                "Enabling research."
            )

            resolved_plan["research"] = True

        print(
            f"FINAL EXECUTION PLAN: {resolved_plan}"
        )

        emit_completed(
            state,
            "ceo_initialize",
            resolved_plan
        )

        return {
            "execution_plan": resolved_plan
        }

    except Exception as e:

        print(
            f"ERROR in CEO Initialize: {e}"
        )

        import traceback
        traceback.print_exc()

        print(
            "Using fallback execution plan"
        )

        fallback_plan = {
            "research": True,
            "marketing": True,
            "finance": True,
            "coding": True,
            "hr": False,
            "sales": False,
            "customer_support": False,
        }

        resolved_plan = resolve_execution_plan(
            fallback_plan
        )

        print(
            f"Fallback Resolved Plan: {resolved_plan}"
        )

        emit_completed(
            state,
            "ceo_initialize",
            resolved_plan
        )

        return {
            "execution_plan": resolved_plan
        }


# ============================================================
# CEO FINALIZE
# ============================================================

def ceo_finalize(state: CompanyState):

    print("🔍 CEO Agent Started")
    print(
        f"CEO Agent - Thread ID: {state['thread_id']}"
    )

    emit_running(
        state,
        "ceo"
    )

    response = None
    used_fallback = False

    # ========================================================
    # CALL CEO LLM
    # ========================================================

    try:

        print(
            "CEO Agent - Calling LLM for final report..."
        )

        response = invoke_structured(
            _build_ceo_chain(state.get("api_key")),
            CEOFinalOutput,
            {
                "user_goal": state["user_goal"],

                "research_report": state.get(
                    "research_report",
                    {}
                ),

                "marketing_report": state.get(
                    "marketing_report",
                    {}
                ),

                "finance_report": state.get(
                    "finance_report",
                    {}
                ),

                "coding_report": state.get(
                    "coding_report",
                    {}
                ),

                "generated_project": state.get(
                    "generated_project",
                    {}
                ),
            },
            fields=CEO_FALLBACK_FIELDS,
            label="CEO Agent"
        )

        print(
            "✅ CEO Agent - LLM response received"
        )

    except Exception as e:

        print(
            f"⚠️ CEO Agent - LLM Error: {e}"
        )

        import traceback
        traceback.print_exc()

        # ====================================================
        # VALID FALLBACK
        # ====================================================

        print(
            "CEO Agent - Using fallback response"
        )

        used_fallback = True

        generated_project = state.get(
            "generated_project",
            {}
        )

        if isinstance(generated_project, dict):

            project_name = (
                generated_project.get(
                    "project_name"
                )
                or generated_project.get(
                    "generated_project"
                )
                or "AI Generated Project"
            )

        else:

            project_name = str(
                generated_project
            ) if generated_project else "AI Generated Project"

        response = CEOFinalOutput(

            project_name=project_name,

            executive_summary=(
                "The project was successfully generated "
                "after completing the required research, "
                "marketing, finance, and engineering workflows."
            ),

            business_viability=(
                "The project demonstrates potential based "
                "on the available research, financial analysis, "
                "and technical implementation."
            ),

            target_market=(
                "The primary target market is based on "
                "the customer segment identified by the "
                "research and marketing agents."
            ),

            unique_value_proposition=(
                "The product combines the identified customer "
                "needs with the proposed technical solution "
                "to provide a differentiated experience."
            ),

            recommended_mvp=[
                "Core product functionality",
                "User authentication",
                "Primary customer workflow",
                "Basic dashboard",
                "Essential API functionality",
            ],

            recommended_tech_stack=[
                "Next.js",
                "TypeScript",
                "NestJS",
                "PostgreSQL",
                "REST API",
            ],

            launch_strategy=[
                "Launch an MVP with the core user workflow",
                "Collect feedback from early users",
                "Improve product-market fit",
                "Expand features based on usage data",
            ],

            estimated_budget=(
                "Budget should be finalized using "
                "the detailed finance agent projections."
            ),

            major_risks=[
                "Product-market fit risk",
                "Customer acquisition cost",
                "Technical implementation complexity",
                "Competition",
            ],

            next_steps=[
                "Review the generated project",
                "Install project dependencies",
                "Configure environment variables",
                "Run backend and frontend",
                "Test the core user workflows",
            ],
        )

    # ========================================================
    # SAVE CEO REPORT
    # ========================================================

    db = SessionLocal()

    try:

        print(
            "CEO Agent - Getting project..."
        )

        project = get_complete_project(
            db,
            state["thread_id"],
            state["user_id"]
        )

        print(
            f"CEO Agent - Project: {project}"
        )

        if project:

            print(
                "CEO Agent - Saving CEO report..."
            )

            save_ceo_report(
                db,
                project,
                response.model_dump()
            )

            print(
                "✅ CEO Agent - CEO report saved"
            )

        else:

            print(
                "⚠️ CEO Agent - Project not found"
            )

    except Exception as e:

        print(
            f"CEO Agent - Save Error: {e}"
        )

        import traceback
        traceback.print_exc()

        raise

    finally:

        db.close()

    # ========================================================
    # UPDATE PROJECT STATUS
    # ========================================================

    db = SessionLocal()

    try:

        print(
            "CEO Agent - Updating project status..."
        )

        update_project_status(
            db=db,
            thread_id=state["thread_id"],
            status="completed",
            user_id=state["user_id"]
        )

        print(
            "✅ CEO Agent - Project status updated"
        )

    except Exception as e:

        print(
            f"CEO Agent - Status Update Error: {e}"
        )

        import traceback
        traceback.print_exc()

        raise

    finally:

        db.close()

    # ========================================================
    # FINISH
    # ========================================================

    print(
        "✅ CEO Agent Completed"
    )

    if used_fallback:

        print(
            "⚠️ CEO Agent completed using fallback response"
        )

    emit_completed(
        state,
        "ceo",
        response.model_dump()
    )

    return {
        "final_report": response.model_dump()
    }