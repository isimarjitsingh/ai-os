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
CONSISTENCY CONTRACT
========================

Every other file of this project is written by a separate run that cannot
see this one, so the PROJECT FILE STRUCTURE list above is the only shared
truth.

- Import ONLY paths that appear in that list, or npm packages declared in
  frontend/package.json. Never invent a helper, hook, context, store,
  stylesheet or component and import it. If it is not in the list, do not
  reference it.
- The preview runs on Linux. Import paths must match the list exactly,
  including casing and extension.
- Prefer relative imports between frontend files. Never import from
  backend/ or database/. Talk to a backend over HTTP instead, and keep the
  UI fully functional with local mock data.
- Export exactly what the description of this file promises, using the same
  names the other files were told to expect.
- Plain JavaScript and JSX, unless the file list contains TypeScript files.

Generate ONLY this file. The code must follow the chosen architecture, be
production ready and use clean coding practices.

Return ONLY the raw file content. No markdown fences, no triple backticks,
no explanation before or after the code.
"""
)


MISSING_FILE_PROMPT = PromptTemplate(
    input_variables=[
        "project_name",
        "file_path",
        "kind",
        "importers",
        "importer_sources",
        "all_files",
    ],

    template="""
You are a Senior Software Engineer fixing a broken generated project.

The project boots inside a browser based Vite dev server. It currently
fails because the file below is imported by other files but was never
created. Vite treats that as a fatal error, so create it now.

========================
PROJECT
========================

Project Name:
{project_name}

========================
FILE TO CREATE
========================

Path:
{file_path}

This file must be {kind}.

It is imported by:
{importers}

========================
THE FILES THAT IMPORT IT
========================

Their real source, so the exports you write match exactly what is expected:

{importer_sources}

========================
FILES THAT ALREADY EXIST
========================

You may import from these paths and from nothing else:

{all_files}

========================
RULES
========================

- Return ONLY the raw content of {file_path}. No markdown fences and no
  explanation.
- Export exactly the binding names required above, using those exact names.
  Match the import style: a default import needs a default export, named
  imports need named exports.
- Build something real and working. A component must render sensible UI for
  its name and props, never an empty div or a placeholder comment.
- If it is a stylesheet, write plain CSS with no preprocessor syntax and no
  tailwind directives, including the classes the importing files reference.
- Import only paths from the list above, or npm packages already declared in
  frontend/package.json. A new missing import makes this fix useless.
- Keep it self contained. Prefer local mock data over network calls.
- Plain JavaScript and JSX, never TypeScript.
"""
)
