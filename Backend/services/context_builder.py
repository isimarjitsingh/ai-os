from schemas.coding import CodingOutput
from schemas.project_file import ProjectFile


def build_context(
    coding_report: CodingOutput,
    current_file: ProjectFile,
) -> dict:

    return {

        "project_name": coding_report.project_name,

        "tech_stack": ", ".join(coding_report.tech_stack),

        "system_architecture": coding_report.system_architecture,

        "architecture": coding_report.architecture,

        "core_features": "\n".join(coding_report.core_features),

        "api_endpoints": "\n".join(coding_report.api_endpoints),

        "development_steps": "\n".join(coding_report.development_steps),

        "all_files": "\n".join(
            [
                f"{file.path} ({file.category})"
                for file in coding_report.files
            ]
        ),

        "file_path": current_file.path,

        "category": current_file.category,

        "purpose": current_file.purpose,

        "description": current_file.description,
    }