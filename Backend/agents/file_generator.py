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
    save_generated_file,      # <-- IMPORTANT
)

chain = FILE_GENERATOR_PROMPT | llm


def file_generator_agent(state: CompanyState):

    print("🔍 File Generator Agent Started")

    emit_running(
        state,
        "file_generator"
    )

    coding_report = CodingOutput.model_validate(
        state["coding_report"]
    )

    project_name = coding_report.project_name

    generated_files = []

    db = SessionLocal()

    try:

        # Update project information once
        update_project_name(
            db=db,
            thread_id=state["thread_id"],
            project_name=project_name
        )

        update_project_path(
            db=db,
            thread_id=state["thread_id"],
            generated_path=f"generated_projects/{project_name}"
        )

        # Generate every file
        for file in coding_report.files:

            context = build_context(
                coding_report,
                file
            )

            response = chain.invoke(context)

            # file_writer returns the FULL path
            file_path = file_writer.write_file(
                project_name=project_name,
                file_path=file.path,
                content=response.content
            )

            generated_files.append(file_path)

            # Save full physical path
            save_generated_file(
                db=db,
                thread_id=state["thread_id"],
                file_path=str(file_path),
                category=file.category
            )

    finally:
        db.close()

    print("✅ File Generator Agent Completed")

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