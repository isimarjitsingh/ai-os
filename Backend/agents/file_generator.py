import time

from groq import RateLimitError

from llm import llm

from services.agent_events import (
    emit_running,
    emit_completed,
)

from prompts.file_generator import FILE_GENERATOR_PROMPT
from tools.file_writer import file_writer
from state.company_state import CompanyState
from schemas.coding import CodingOutput
from services.context_builder import build_context

from database.database import SessionLocal
from database.crud import (
    update_project_name,
    update_project_path,
    save_generated_file,
)


# ============================================================
# FILE GENERATOR LLM CHAIN
# ============================================================

chain = FILE_GENERATOR_PROMPT | llm


# ============================================================
# RETRY CONFIGURATION
# ============================================================

MAX_RETRIES = 4

# Wait times after rate-limit errors
RETRY_DELAYS = [3, 6, 12, 20]


# ============================================================
# FILE GENERATOR AGENT
# ============================================================

def file_generator_agent(state: CompanyState):

    print("\n" + "=" * 60)
    print("🚀 FILE GENERATOR AGENT STARTED")
    print("=" * 60)

    emit_running(
        state,
        "file_generator"
    )

    # --------------------------------------------------------
    # Validate coding report
    # --------------------------------------------------------

    coding_report = CodingOutput.model_validate(
        state["coding_report"]
    )

    project_name = coding_report.project_name

    generated_files = []

    db = SessionLocal()

    try:

        # ====================================================
        # UPDATE PROJECT INFORMATION
        # ====================================================

        update_project_name(
            db=db,
            thread_id=state["thread_id"],
            project_name=project_name,
            user_id=state["user_id"]
        )

        update_project_path(
            db=db,
            thread_id=state["thread_id"],
            generated_path=f"generated_projects/{project_name}",
            user_id=state["user_id"]
        )

        print(f"📦 Project: {project_name}")
        print(f"📁 Total files to generate: {len(coding_report.files)}")

        # ====================================================
        # GENERATE EVERY FILE
        # ====================================================

        for index, file in enumerate(coding_report.files, start=1):

            print("\n" + "-" * 60)
            print(
                f"📄 Generating file "
                f"{index}/{len(coding_report.files)}: {file.path}"
            )
            print("-" * 60)

            context = build_context(
                coding_report,
                file
            )

            response = None

            # =================================================
            # RETRY LLM REQUEST IF GROQ RETURNS 429
            # =================================================

            for attempt in range(MAX_RETRIES + 1):

                try:

                    print(
                        f"🤖 LLM request "
                        f"(attempt {attempt + 1}/{MAX_RETRIES + 1})"
                    )

                    response = chain.invoke(context)

                    print("✅ LLM generation successful")

                    break

                except RateLimitError as e:

                    # -----------------------------------------
                    # ALL RETRIES EXHAUSTED
                    # -----------------------------------------

                    if attempt >= MAX_RETRIES:

                        print(
                            f"❌ Rate limit persisted after "
                            f"{MAX_RETRIES + 1} attempts."
                        )

                        raise

                    # -----------------------------------------
                    # WAIT BEFORE RETRY
                    # -----------------------------------------

                    delay = RETRY_DELAYS[attempt]

                    print(
                        f"⚠️ Groq rate limit reached."
                    )

                    print(
                        f"⏳ Waiting {delay} seconds "
                        f"before retry..."
                    )

                    print(
                        f"Groq error: {str(e)[:500]}"
                    )

                    time.sleep(delay)

            # =================================================
            # WRITE GENERATED FILE
            # =================================================

            if response is None:
                raise RuntimeError(
                    f"LLM returned no response for file: {file.path}"
                )

            file_path = file_writer.write_file(
                project_name=project_name,
                file_path=file.path,
                content=response.content
            )

            print(f"💾 File written: {file_path}")

            generated_files.append(file_path)

            # =================================================
            # SAVE FILE METADATA TO DATABASE
            # =================================================

            save_generated_file(
                db=db,
                thread_id=state["thread_id"],
                file_path=str(file_path),
                category=file.category,
                user_id=state["user_id"]
            )

            print("🗄️ File metadata saved to database")

            print(
                f"✅ Completed {index}/{len(coding_report.files)}"
            )

        # ====================================================
        # ALL FILES COMPLETED
        # ====================================================

        print("\n" + "=" * 60)
        print("🎉 ALL FILES GENERATED SUCCESSFULLY")
        print("=" * 60)

    finally:

        db.close()

    # ========================================================
    # EMIT COMPLETION EVENT
    # ========================================================

    emit_completed(
        state,
        "file_generator",
        {
            "generated_project": project_name,
            "generated_files": generated_files
        }
    )

    return {
        "generated_project": project_name,
        "generated_files": generated_files
    }