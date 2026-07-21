from langchain_core.prompts import PromptTemplate

FILE_GENERATOR_PROMPT = PromptTemplate(
    input_variables=[
        "project_name",
        "tech_stack",
        "architecture",
        "system_architecture",
        "core_features",
        "api_endpoints",
        "development_steps",
        "all_files",
        "file_path",
        "category",
        "purpose",
        "description",
    ],

    template="""
You are a Senior Software Engineer.

You are generating ONE file of a larger software project.

========================
PROJECT
========================

Project Name:
{project_name}

Tech Stack:
{tech_stack}

Architecture:
{architecture}

System Architecture:
{system_architecture}

========================
CORE FEATURES
========================

{core_features}

========================
API ENDPOINTS
========================

{api_endpoints}

========================
DEVELOPMENT ROADMAP
========================

{development_steps}

========================
PROJECT FILE STRUCTURE
========================

{all_files}

========================
CURRENT FILE
========================

Path:
{file_path}

Category:
{category}

Purpose:
{purpose}

Description:
{description}

========================

Generate ONLY this file.

The generated code should:

- Follow the chosen architecture.
- Match the project structure.
- Be production ready.
- Use clean coding practices.
- Include imports where necessary.
- Be compatible with the rest of the project.

Return ONLY the file content.

Do NOT wrap inside markdown.
"""
)