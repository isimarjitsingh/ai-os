from llm import structured_llm
from llm_fallback import invoke_structured, fallback_model

from prompts.coding import (
    CODING_ARCHITECTURE_PROMPT,
    CODING_BLUEPRINT_PROMPT,
)
from schemas.coding import CodingArchitecture, CodingOutput, FileBlueprint
from state.company_state import CompanyState
from services.agent_events import (
    emit_running,
    emit_completed,
)
from services.blueprint_validator import sanitize_blueprint

from database.database import SessionLocal
from database.crud import (
    get_complete_project,
    save_coding_report
)


# ============================================================
# TWO CALLS INSTEAD OF ONE
# ============================================================
# `CodingOutput` is still what this agent returns and still what
# file_generator / context_builder / save_coding_report consume - only the
# request that produces it changed. Architecture first (no files), then the
# file blueprint, then a merge. Each answer is roughly half the size, so each
# one fits a request budget that can actually be enforced, and a blueprint that
# never arrives no longer takes a completed architecture down with it.

coding_architecture_chain = (
    CODING_ARCHITECTURE_PROMPT | structured_llm(CodingArchitecture)
)

coding_blueprint_chain = (
    CODING_BLUEPRINT_PROMPT | structured_llm(FileBlueprint)
)


# ============================================================
# FALLBACK PAYLOADS
# ============================================================
# Split the same way the requests are, so a failed phase falls back on its own
# terms: the architecture falls back to an honest "we could not design this"
# note, and the blueprint falls back to the minimum file list that still boots.

CODING_ARCHITECTURE_FALLBACK_FIELDS = {
    "project_name": "AI Generated Project",
    "tech_stack": ["HTML", "CSS", "JavaScript"],
    "frontend": ["HTML", "CSS", "JavaScript"],
    "backend": [],
    "database": "None",
    "architecture": (
        "Simple static frontend served by Vite; generated as a "
        "fallback when the coding LLM was unavailable."
    ),
    "core_features": [
        "Landing page describing the product",
        "Basic navigation",
    ],
    "api_endpoints": [],
    "development_steps": [
        "Review the fallback landing page",
        "Re-run generation to produce a full implementation",
    ],
    "system_architecture": "Static single-page frontend.",
}

# Minimum-viable blueprint: a single-file static Vite app. It passes
# sanitize_blueprint (no imports at all) and file_generator's Vite detection,
# so the preview always has something renderable even when the blueprint call
# failed.
CODING_BLUEPRINT_FALLBACK_FIELDS = {
    "files": [
        {
            "path": "frontend/index.html",
            "purpose": "Entry point of the generated application",
            "description": (
                "A minimal landing page for the project with a hero "
                "section and short description of the idea."
            ),
            "category": "frontend",
        },
        {
            "path": "frontend/src/style.css",
            "purpose": "Application styling",
            "description": (
                "Simple, clean styling for the landing page."
            ),
            "category": "frontend",
        },
        {
            "path": "frontend/src/main.js",
            "purpose": "Application entry script",
            "description": (
                "Renders the landing page content into the page."
            ),
            "category": "frontend",
        },
    ],
}

# The merged payload, kept as one dict so the two halves can never drift apart.
CODING_FALLBACK_FIELDS = {
    **CODING_ARCHITECTURE_FALLBACK_FIELDS,
    **CODING_BLUEPRINT_FALLBACK_FIELDS,
}


def _architecture_summary(architecture: CodingArchitecture) -> str:
    """
    Render the decided architecture into the text the blueprint call reads.

    The blueprint model never sees the previous conversation - it gets this
    block instead - so it has to carry the stack, the features and the endpoints
    in the exact terms the architecture used, or the two halves of the answer
    describe different projects.
    """

    def bullet(items):
        return "\n".join(
            f"- {item}" for item in items if str(item).strip()
        ) or "- (none)"

    return "\n".join(
        [
            f"Project name: {architecture.project_name}",
            f"Tech stack: {', '.join(architecture.tech_stack) or 'JavaScript'}",
            f"Frontend: {', '.join(architecture.frontend) or 'Vite + React'}",
            f"Backend: {', '.join(architecture.backend) or 'None'}",
            f"Database: {architecture.database}",
            "",
            f"System architecture: {architecture.system_architecture}",
            "",
            "Architecture:",
            architecture.architecture,
            "",
            "Core features the blueprint must cover:",
            bullet(architecture.core_features),
            "",
            "API endpoints to plan files for:",
            bullet(architecture.api_endpoints),
            "",
            "Development steps:",
            bullet(architecture.development_steps),
        ]
    )


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

        # ----------------------------------------------------------
        # STEP 1 - ARCHITECTURE (no file list)
        # ----------------------------------------------------------

        print("\n🤖 Calling Coding LLM - step 1/2: architecture...")

        architecture = invoke_structured(
            coding_architecture_chain,
            CodingArchitecture,
            {
                "user_goal": state["user_goal"],
                "target_audience": research["target_audience"],
                "competitors": research["competitors"],
                "key_features": research["key_features"],
                "opportunities": research["opportunities"],
            },
            fields=CODING_ARCHITECTURE_FALLBACK_FIELDS,
            retries=2,
            label="Coding Agent / architecture"
        )

        print("\n✅ Architecture decided")
        print("Tech stack:", architecture.tech_stack)
        print("Features:", architecture.core_features)

        # ----------------------------------------------------------
        # STEP 2 - FILE BLUEPRINT, planned against that architecture
        #
        # Its own try/except on purpose. invoke_structured() has already
        # retried and fallen back by the time it raises, so the only thing
        # left to protect here is the work step 1 finished: a blueprint that
        # cannot be produced must degrade to the minimal bootable file list,
        # never throw the real architecture away with it.
        # ----------------------------------------------------------

        print("\n🤖 Calling Coding LLM - step 2/2: file blueprint...")

        try:

            blueprint = invoke_structured(
                coding_blueprint_chain,
                FileBlueprint,
                {
                    "user_goal": state["user_goal"],
                    "key_features": research["key_features"],
                    "architecture_summary": _architecture_summary(
                        architecture
                    ),
                },
                fields=CODING_BLUEPRINT_FALLBACK_FIELDS,
                retries=2,
                label="Coding Agent / blueprint"
            )

        except Exception as blueprint_error:

            print(
                "⚠️ Blueprint call failed "
                f"({type(blueprint_error).__name__}: {blueprint_error})"
            )
            print(
                "⚠️ Keeping the architecture and using the "
                "minimal bootable file list"
            )

            blueprint = fallback_model(
                FileBlueprint,
                CODING_BLUEPRINT_FALLBACK_FIELDS,
            )

            if blueprint is None:
                raise

        print("\n✅ CODING LLM RESPONSE RECEIVED")

        # ----------------------------------------------------------
        # MERGE back into the contract every consumer already expects
        # ----------------------------------------------------------

        response = CodingOutput(
            **architecture.model_dump(),
            files=blueprint.files,
        )

        print(f"📁 Blueprint plans {len(response.files)} file(s)")

        output = response.model_dump()

        # ----------------------------------------------------------
        # Blueprint validation.
        #
        # The file generator writes every planned file in its own
        # isolated LLM call, so anything a file imports must already
        # appear in this list. Without this step the model plans a
        # main.tsx that imports ./index.css, never plans index.css,
        # and the WebContainer preview dies on
        # "Failed to resolve import ./index.css".
        # ----------------------------------------------------------

        blueprint, blueprint_report = sanitize_blueprint(
            output.get("files") or []
        )

        output["files"] = blueprint

        if blueprint_report:

            print("\n🧹 Blueprint validation:")

            for line in blueprint_report:
                print("   -", line)

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