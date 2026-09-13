from schemas.coding import CodingOutput
from schemas.project_file import ProjectFile


def _describe(file: ProjectFile) -> str:
    """
    One entry of the project manifest handed to the file generator.

    Each file is generated in isolation, so this list is the only shared
    truth between runs. Naming just the path leaves the model guessing what
    a neighbour exports, and it then invents helpers that never exist - the
    root cause of "Failed to resolve import" in the preview. Stating the
    purpose and behaviour of every other file lets it import a real path
    with confidence.
    """

    lines = [f"{file.path}  [{file.category}]"]

    purpose = (getattr(file, "purpose", "") or "").strip()

    description = (getattr(file, "description", "") or "").strip()

    if purpose:
        lines.append(f"    purpose: {purpose}")

    if description:
        lines.append(f"    does: {description}")

    return "\n".join(lines)


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
            _describe(file) for file in coding_report.files
        ),

        "file_path": current_file.path,

        "category": current_file.category,

        "purpose": current_file.purpose,

        "description": current_file.description,
    }
