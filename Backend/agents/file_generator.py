from llm import llm

from prompts.file_generator import FILE_GENERATOR_PROMPT
from tools.file_writer import file_writer
from state.company_state import CompanyState

chain = FILE_GENERATOR_PROMPT | llm


def file_generator_agent(state: CompanyState):

    coding_report = state["coding_report"]

    project_name = coding_report["project_name"]

    tech_stack = ", ".join(coding_report["tech_stack"])

    system_architecture = coding_report["system_architecture"]

    core_features = ", ".join(coding_report["core_features"])

    generated_files = []

    for file in coding_report["files"]:

        response = chain.invoke(
            {
                "project_name": project_name,
                "tech_stack": tech_stack,
                "system_architecture": system_architecture,
                "core_features": core_features,
                "file_path": file["path"],
                "description": file["description"],
                "purpose": file["purpose"]
            }
        )

        file_path = file_writer.write_file(
            project_name=project_name,
            file_path=file["path"],
            content=response.content
        )

        generated_files.append(file_path)

    return {
        "generated_project": project_name,
        "generated_files": generated_files
    }