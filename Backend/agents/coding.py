from llm import llm

from prompts.coding import CODING_PROMPT
from schemas.coding import CodingOutput
from schemas.project_file import ProjectFile
from state.company_state import CompanyState
from services.agent_events import (
    emit_running,
    emit_completed,
)

from database.database import SessionLocal
from database.crud import (
    get_complete_project,
    save_coding_report
)

coding_llm = llm.with_structured_output(
    CodingOutput,
    method="json_schema",
    strict=True
)

coding_chain = CODING_PROMPT | coding_llm

def coding_agent(state: CompanyState):

    print("\n==============================")
    print("🔍 CODING AGENT STARTED")
    print("==============================")

    emit_running(
        state,
        "coding"
    )

    try:

        research = state["research_report"]

        print("📦 Research data received")
        print("Target audience:", research["target_audience"])
        print("Competitors:", research["competitors"])
        print("Key features:", research["key_features"])
        print("Opportunities:", research["opportunities"])

        print("\n🤖 Calling Coding LLM...")

        response = coding_chain.invoke(
            {
                "user_goal": state["user_goal"],
                "target_audience": research["target_audience"],
                "competitors": research["competitors"],
                "key_features": research["key_features"],
                "opportunities": research["opportunities"],
            }
        )

        print("\n✅ CODING LLM RESPONSE RECEIVED")
        print(response)

        output = response.model_dump()

        # Ensure files field exists even if LLM doesn't provide it
        if "files" not in output or not output["files"]:
            print("⚠️ LLM did not provide files, adding default files")
            output["files"] = [
                {
                    "path": "frontend/src/App.jsx",
                    "purpose": "Main application component",
                    "description": "React component for the main application interface",
                    "category": "frontend"
                },
                {
                    "path": "backend/server.js",
                    "purpose": "Backend server entry point",
                    "description": "Express server setup and API endpoints",
                    "category": "backend"
                },
                {
                    "path": "database/schema.sql",
                    "purpose": "Database schema definition",
                    "description": "SQL schema for PostgreSQL database",
                    "category": "database"
                }
            ]

        print("\n📦 Coding output:")
        print(output)

        db = SessionLocal()

        try:

            project = get_complete_project(
                db,
                state["thread_id"],
                state["user_id"]
            )

            if project:

                print("💾 Saving coding report...")

                save_coding_report(
                    db,
                    project,
                    output
                )

                print("✅ Coding report saved")

        finally:

            db.close()

        print("\n==============================")
        print("✅ CODING AGENT COMPLETED")
        print("==============================")

        emit_completed(
            state,
            "coding",
            output
        )

        return {
            "coding_report": output
        }

    except Exception as e:

        print("\n==============================")
        print("❌ CODING AGENT FAILED")
        print("==============================")

        print("ERROR TYPE:")
        print(type(e).__name__)

        print("\nERROR:")
        print(str(e))

        print("\nERROR REPR:")
        print(repr(e))

        print("==============================\n")

        raise