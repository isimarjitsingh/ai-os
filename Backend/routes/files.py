from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException

from database.database import SessionLocal
from database.crud import get_project_by_thread
from database.models import GeneratedFile
from auth.dependencies import get_current_user


router = APIRouter(
    tags=["Generated Files"]
)


# ==========================================================
# HELPER
# ==========================================================

def build_file_tree(files):
    """
    Convert generated files into a WebContainer-compatible
    FileSystemTree.
    """

    tree = {}

    for file in files:

        file_path = Path(file["path"])

        current = tree

        parts = file_path.parts

        for part in parts[:-1]:

            if part not in current:
                current[part] = {
                    "directory": {}
                }

            current = current[part]["directory"]

        filename = parts[-1]

        current[filename] = {
            "file": {
                "contents": file["contents"]
            }
        }

    return tree


# ==========================================================
# GET PROJECT FILES
# ==========================================================

@router.get("/projects/{thread_id}/files")
def get_project_files(
    thread_id: str,
    current_user=Depends(get_current_user)
):

    db = SessionLocal()

    try:

        # --------------------------------------------------
        # GET PROJECT
        # --------------------------------------------------

        project = get_project_by_thread(
            db=db,
            thread_id=thread_id,
            user_id=current_user.id
        )

        if not project:

            raise HTTPException(
                status_code=404,
                detail="Project not found"
            )

        # --------------------------------------------------
        # GET GENERATED FILE RECORDS
        # --------------------------------------------------

        generated_files = (
            db.query(GeneratedFile)
            .filter(
                GeneratedFile.project_id == project.id
            )
            .all()
        )

        if not generated_files:

            raise HTTPException(
                status_code=404,
                detail="No generated files found"
            )

        files = []

        # --------------------------------------------------
        # PROJECT ROOT
        # --------------------------------------------------

        # file_writer.py creates files using:
        #
        # generated_projects/
        #     project_name/
        #         ...
        #
        # We resolve this from the Backend directory rather
        # than relying on the current working directory.

        backend_root = Path(__file__).resolve().parent.parent

        generated_root = backend_root / "generated_projects"

        # --------------------------------------------------
        # PROJECT DIRECTORY
        # --------------------------------------------------

        project_root = generated_root / project.project_name

        print("\n================================================")
        print("📁 FILES ENDPOINT DEBUG")
        print("Backend root:", backend_root)
        print("Generated root:", generated_root)
        print("Project name:", project.project_name)
        print("Project root:", project_root)
        print("Project root exists:", project_root.exists())
        print("================================================\n")

        # --------------------------------------------------
        # READ ACTUAL FILES FROM DISK & DB
        # --------------------------------------------------

        target_file_paths = set()

        for generated_file in generated_files:
            stored_path = Path(generated_file.file_path)
            if stored_path.is_absolute():
                target_file_paths.add(stored_path.resolve())
            else:
                target_file_paths.add((backend_root / stored_path).resolve())

        # Also discover any physical files on disk under project_root
        if project_root.exists() and project_root.is_dir():
            for p in project_root.rglob("*"):
                if p.is_file():
                    if any(ig in p.parts for ig in [".git", "node_modules", ".venv", "__pycache__", "dist", "build"]):
                        continue
                    target_file_paths.add(p.resolve())

        for file_path in target_file_paths:
            # If not found directly, try project_root fallback
            if not file_path.exists():
                try:
                    parts = file_path.parts
                    if "generated_projects" in parts:
                        idx = parts.index("generated_projects")
                        # parts after project name
                        if len(parts) > idx + 2:
                            rel_sub = parts[idx + 2:]
                            fallback = project_root / Path(*rel_sub)
                            if fallback.exists():
                                file_path = fallback.resolve()
                except Exception:
                    pass

            if not file_path.exists() or not file_path.is_file():
                continue

            try:
                contents = file_path.read_text(encoding="utf-8")
            except (UnicodeDecodeError, OSError):
                continue

            try:
                relative_path = file_path.relative_to(project_root)
            except ValueError:
                relative_path = Path(file_path.name)

            files.append(
                {
                    "path": relative_path.as_posix(),
                    "contents": contents
                }
            )

        # --------------------------------------------------
        # NO VALID FILES
        # --------------------------------------------------

        if not files:

            raise HTTPException(
                status_code=404,
                detail=(
                    "Generated files exist in database "
                    "but could not be read from disk"
                )
            )

        # --------------------------------------------------
        # BUILD FILE SYSTEM TREE
        # --------------------------------------------------

        file_tree = build_file_tree(files)

        # --------------------------------------------------
        # RESPONSE
        # --------------------------------------------------

        return {
            "success": True,
            "thread_id": thread_id,
            "project_name": project.project_name,
            "files": file_tree
        }

    finally:

        db.close()