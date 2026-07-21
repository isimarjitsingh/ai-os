from llm import llm

from prompts.file_generator import FILE_GENERATOR_PROMPT
from tools.file_writer import file_writer
from state.company_state import CompanyState
from schemas.coding import CodingOutput
from services.context_builder import build_context

chain = FILE_GENERATOR_PROMPT | llm


def file_generator_agent(state: CompanyState):

    coding_report = CodingOutput.model_validate(
        state["coding_report"]
    )

    project_name = coding_report.project_name

    generated_files = []

    for file in coding_report.files:

        context = build_context(
            coding_report,
            file
        )

        response = chain.invoke(context)

        file_path = file_writer.write_file(
            project_name=project_name,
            file_path=file.path,
            content=response.content
        )

        generated_files.append(file_path)

    return {
        "generated_project": project_name,
        "generated_files": generated_files
    }