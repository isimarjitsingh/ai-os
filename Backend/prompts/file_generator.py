from langchain_core.prompts import PromptTemplate

FILE_GENERATOR_PROMPT = PromptTemplate(
    input_variables=[
        "project_name",
        "tech_stack",
        "purpose",
        "system_architecture",
        "core_features",
        "file_path",
        "description",
        
    ],
    template="""
You are a Senior Software Engineer.

You are generating ONE file for a software project.

Project Name:
{project_name}

Tech Stack:
{tech_stack}

System Architecture:
{system_architecture}

Core Features:
{core_features}

Current File:
{file_path}

description:
{description}

purpose:
{purpose}

Generate the complete production-ready implementation for this file.

The code should be clean, modular, and consistent with the provided project architecture.

Return ONLY the file content.

Do not explain anything.

Do not wrap the output inside markdown code fences.
"""
)