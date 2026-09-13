import re
import time

from pathlib import Path

from llm_fallback import (
    is_rate_limit_error,
    is_transient_error,
    rate_limit_wait,
    transient_reason,
    transient_wait,
)

from llm import llm

from services.agent_events import (
    emit_running,
    emit_completed,
)
from services.import_checker import apply_case_fixes, scan_project

from prompts.file_generator import FILE_GENERATOR_PROMPT, MISSING_FILE_PROMPT
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
# IMPORT CLOSURE REPAIR CONFIGURATION
# ============================================================

# Scan -> generate -> rescan rounds. Two is plenty: a synthesized file is
# written to import only what already exists, so it cannot open new holes.
REPAIR_ROUNDS = 2

# Safety valve so a hallucinating model cannot loop forever.
MAX_REPAIR_FILES_PER_ROUND = 12

# How much of each importing file to show the model while repairing.
IMPORTER_SOURCE_LIMIT = 3500

repair_chain = MISSING_FILE_PROMPT | llm


# ============================================================
# CONTENT CLEANING
# ============================================================

FENCE_BLOCK_RE = re.compile(r"```[^\n]*\n(.*?)```", re.DOTALL)
LEADING_FENCE_RE = re.compile(r"^\s*(?:```|~~~)[^\n]*\n")
TRAILING_FENCE_RE = re.compile(r"\n\s*(?:```|~~~)\s*$")


def clean_generated_content(content: str, path: str) -> str:
    """
    Strip the markdown wrappers models add around generated code.

    A file whose first line is ```js is written to disk verbatim and breaks
    the Vite build, so it must never reach the project. When the model
    fences only part of the answer, the longest fenced block is the code
    and the prose around it is dropped.
    """

    text = (content or "").strip()

    if not text:
        return ""

    if "```" in text:

        blocks = FENCE_BLOCK_RE.findall(text)

        if blocks:
            return max(blocks, key=len).strip()

    text = LEADING_FENCE_RE.sub("", text)
    text = TRAILING_FENCE_RE.sub("", text)

    return text.strip()


def _category_for(path: str) -> str:
    """Manifest category used when a repaired file is saved."""

    if path.startswith("frontend/"):
        return "frontend"

    if path.startswith("backend/"):
        return "backend"

    if path.startswith("database/"):
        return "database"

    return "config"


# ============================================================
# IMPORT CLOSURE REPAIR
# ============================================================

def _importer_sources(project_dir: Path, importers: list) -> str:
    """
    Verbatim source of the files that import the missing module.

    Showing the real import statements is what makes a repair accurate: the
    model reads the exact binding names, props and class names the importer
    already expects instead of inventing new ones.
    """

    blocks = []

    for item in importers[:3]:

        try:
            text = (project_dir / item["file"]).read_text(
                encoding="utf-8",
                errors="replace",
            )
        except OSError:
            continue

        if len(text) > IMPORTER_SOURCE_LIMIT:
            text = text[:IMPORTER_SOURCE_LIMIT] + "\n... truncated ..."

        required = ", ".join(item["names"])

        if not required:
            required = "(side effect import - no exports required)"

        blocks.append(
            f"--- {item['file']} ---\n"
            f"import statement: {item['spec']}\n"
            f"bindings it must export: {required}\n\n"
            f"{text}"
        )

    return "\n\n".join(blocks)


def _invoke_repair(context: dict):
    """Repair prompt with the same rate-limit and stall backoff as the loop."""

    for attempt in range(MAX_RETRIES + 1):

        try:
            return repair_chain.invoke(context)

        except Exception as error:

            # A 429 and a stalled request both say nothing about the file, so
            # both are worth waiting out. Anything else (a broken prompt, a
            # dead connection to the writer) must surface immediately instead
            # of being slept on and retried four times. The old
            # `except RateLimitError` named the Groq class, which never
            # matches an OpenAI-client error, so it never ran at all.
            limited = is_rate_limit_error(error)

            if not limited and not is_transient_error(error):
                raise

            if attempt >= MAX_RETRIES:
                raise

            delay = (
                rate_limit_wait(attempt, error)
                if limited
                else transient_wait(attempt)
            )

            print(
                f"⚠️ {'Rate limit' if limited else transient_reason(error)}"
                f" during repair. Waiting {delay}s..."
            )

            time.sleep(delay)

    return None


def repair_import_closure(
    db,
    state,
    project_name: str,
    coding_report,
    generated_files: list,
) -> list:
    """
    Make the generated project's import graph close.

    Vite refuses to serve an app whose relative import cannot be resolved,
    so a project referencing a file that was never generated shows up as a
    dead preview saying "Failed to resolve import". This pass scans what
    actually landed on disk, generates whatever is missing and rewrites
    imports whose casing does not match the real file name.
    """

    project_dir = file_writer.project_dir(project_name)

    written = []

    for round_number in range(1, REPAIR_ROUNDS + 1):

        print("\n" + "-" * 60)
        print(f"🔎 Import closure check (round {round_number})")
        print("-" * 60)

        report = scan_project(project_dir)

        # What is really on disk, not merely what was planned: a file that
        # an earlier repair round created must be importable by a later one.
        manifest = "\n".join(report["files"])

        if report["case_fixes"]:

            apply_case_fixes(project_dir, report["case_fixes"])

            print(f"✍️  Rewrote {len(report['case_fixes'])} case-sensitive import(s):")

            for fix in report["case_fixes"]:
                print(f"   {fix['file']}: {fix['old']} -> {fix['new']}")

        missing = [
            item
            for item in report["missing"]
            if item["kind"] in ("css", "module")
        ]

        for item in report["missing"]:

            if item["kind"] not in ("css", "module"):
                print(f"⚠️  Cannot synthesize {item['kind']}: {item['path']}")

        if not missing:

            if not report["case_fixes"]:
                print("✅ Every import resolves - project is ready to boot")
                break

            continue

        print(f"🧩 {len(missing)} imported file(s) never generated:")

        for item in missing:
            print(f"   {item['path']} ({item['kind']})")

        for item in missing[:MAX_REPAIR_FILES_PER_ROUND]:

            print(f"\n🛠  Regenerating missing file: {item['path']}")

            context = {
                "project_name": project_name,
                "file_path": item["path"],
                "kind": (
                    "a plain CSS stylesheet"
                    if item["kind"] == "css"
                    else "a JavaScript module (React component or logic)"
                ),
                "importers": "; ".join(
                    f"{entry['file']} imports {entry['spec']}"
                    for entry in item["importers"]
                ),
                "importer_sources": _importer_sources(
                    project_dir,
                    item["importers"],
                ),
                "all_files": manifest,
            }

            try:
                response = _invoke_repair(context)
            except Exception as error:
                print(f"⚠️  Repair request failed for {item['path']}: {error}")
                continue

            if response is None:
                print(f"⚠️  No response while repairing {item['path']}")
                continue

            content = clean_generated_content(response.content, item["path"])

            if not content:
                print(f"⚠️  Model returned empty content for {item['path']}")
                continue

            path = file_writer.write_file(
                project_name=project_name,
                file_path=item["path"],
                content=content,
            )

            save_generated_file(
                db=db,
                thread_id=state["thread_id"],
                file_path=str(path),
                category=_category_for(item["path"]),
                user_id=state["user_id"],
            )

            written.append(str(path))

            print(f"💾 Repaired file written: {path}")

    return generated_files + written


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
            # RETRY LLM REQUEST IF THE MODEL RETURNS 429
            # =================================================

            for attempt in range(MAX_RETRIES + 1):

                try:

                    print(
                        f"🤖 LLM request "
                        f"(attempt {attempt + 1}/{MAX_RETRIES + 1})"
                    )

                    started = time.monotonic()

                    response = chain.invoke(context)

                    print(
                        "✅ LLM generation successful "
                        f"in {time.monotonic() - started:.1f}s"
                    )

                    break

                except Exception as e:

                    # A 429 and a stalled request are the two failures worth
                    # sleeping on, because neither says anything about the file
                    # being generated. Everything else - a broken prompt, a bad
                    # schema - still re-raises untouched.
                    #
                    # Timeouts joined the 429 here when llm.py set
                    # max_retries=0: the SDK used to absorb them twice in
                    # private, so leaving them out of this branch would turn
                    # one slow call into a failed project.
                    limited = is_rate_limit_error(e)

                    if not limited and not is_transient_error(e):
                        raise

                    # -----------------------------------------
                    # ALL RETRIES EXHAUSTED
                    # -----------------------------------------

                    if attempt >= MAX_RETRIES:

                        print(
                            f"❌ {'Rate limit' if limited else 'Stalled request'}"
                            f" persisted after "
                            f"{MAX_RETRIES + 1} attempts."
                        )

                        raise

                    # -----------------------------------------
                    # WAIT BEFORE RETRY
                    # -----------------------------------------

                    delay = (
                        rate_limit_wait(attempt, e)
                        if limited
                        else transient_wait(attempt)
                    )

                    print(
                        "⚠️ Rate limit reached."
                        if limited
                        else f"⚠️ Request {transient_reason(e)}."
                    )

                    print(
                        f"⏳ Waiting {delay} seconds "
                        f"before retry..."
                    )

                    print(
                        f"LLM error: {str(e)[:500]}"
                    )

                    time.sleep(delay)

            # =================================================
            # WRITE GENERATED FILE
            # =================================================

            if response is None:
                raise RuntimeError(
                    f"LLM returned no response for file: {file.path}"
                )

            # Models wrap code in ``` fences even when told not to.
            # Written verbatim that produces a file starting with
            # ```js which Vite cannot parse, so strip it before saving.
            content = clean_generated_content(
                response.content,
                file.path
            )

            if not content:
                raise RuntimeError(
                    f"LLM returned empty content for file: {file.path}"
                )

            file_path = file_writer.write_file(
                project_name=project_name,
                file_path=file.path,
                content=content
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
        # ENSURE FRONTEND ENTRY FILES (Vite & CRA)
        # ====================================================

        # Check if this is a React / Vite project
        frontend_techs = [str(tech).lower() for tech in coding_report.frontend] if coding_report.frontend else []
        tech_stack_techs = [str(tech).lower() for tech in coding_report.tech_stack] if coding_report.tech_stack else []
        file_paths = [f.path.lower() for f in coding_report.files] if coding_report.files else []
        
        is_react_project = (
            any("react" in tech for tech in frontend_techs) or
            any("react" in tech for tech in tech_stack_techs) or
            any("react" in p or "app.tsx" in p or "app.jsx" in p for p in file_paths)
        )
        is_vite_project = (
            any("vite" in tech for tech in frontend_techs) or
            any("vite" in tech for tech in tech_stack_techs) or
            any("vite" in p for p in file_paths) or
            True  # Default to Vite support for modern WebContainer previews
        )
        
        if is_react_project:
            print("\n" + "-" * 60)
            print("Ensuring frontend entry files (index.html, vite.config.js) exist...")
            print("-" * 60)
            
            try:
                entry_file_paths = file_writer.ensure_frontend_entry_files(
                    project_name=project_name,
                    project_title=project_name,
                    is_vite=is_vite_project
                )
                for ef_path in entry_file_paths:
                    print(f"Frontend entry file created: {ef_path}")
                    generated_files.append(ef_path)
                    
                    try:
                        # Normalize relative path for DB
                        clean_rel_path = Path(ef_path).resolve()
                        base_output = (file_writer.output_dir / project_name).resolve()
                        try:
                            rel_p = clean_rel_path.relative_to(base_output).as_posix()
                        except ValueError:
                            rel_p = Path(ef_path).name
                        
                        file_path_for_db = f"generated_projects/{project_name}/{rel_p}"
                        save_generated_file(
                            db=db,
                            thread_id=state["thread_id"],
                            file_path=file_path_for_db,
                            category="frontend",
                            user_id=state["user_id"]
                        )
                        print(f"Saved to database: {file_path_for_db}")
                    except Exception as db_error:
                        print(f"Failed to save entry file {ef_path} to database: {db_error}")
                        
            except Exception as e:
                print(f"Failed to create frontend entry files: {e}")

        # ====================================================
        # POINT index.html AT AN ENTRY FILE THAT ACTUALLY EXISTS
        # ====================================================

        try:

            entry_fix = file_writer.fix_index_html_entry(project_name)

            if entry_fix:
                print(f"✏️  Rewrote index.html entry script -> {entry_fix}")

        except Exception as error:
            print(f"⚠️  Could not fix index.html entry: {error}")

        # ====================================================
        # IMPORT CLOSURE REPAIR
        # ====================================================

        try:

            generated_files = repair_import_closure(
                db=db,
                state=state,
                project_name=project_name,
                coding_report=coding_report,
                generated_files=generated_files,
            )

        except Exception as error:
            print(f"⚠️  Import closure repair failed: {error}")

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