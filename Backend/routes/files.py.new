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

        project_root = (
            generated_root / project.project_name
            if project.project_name
            else None
        )

        project_root_resolved = (
            project_root.resolve()
            if project_root is not None and project_root.exists()
            else None
        )

        print("\n================================================")
        print("📁 FILES ENDPOINT DEBUG")
        print("Backend root:", backend_root)
        print("Generated root:", generated_root)
        print("Project name:", project.project_name)
        print("Project root:", project_root)
        print("Project root exists:", bool(project_root and project_root.exists()))
        print("================================================\n")

        # --------------------------------------------------
        # READ FILES: DATABASE FIRST, DISK AS DEV FALLBACK
        # --------------------------------------------------

        # The database is the source of truth. generated_projects/ only exists
        # on the machine that wrote it, and on a hosted app platform that path
        # is a container's temporary filesystem: empty after a redeploy and
        # never shared between instances. Reading the stored contents keeps a
        # project previewable for as long as its rows exist.
        seen_paths = set()

        def relative_for(stored_path):
            """Project-relative path for a stored file_path value."""
            resolved = (
                stored_path
                if stored_path.is_absolute()
                else (backend_root / stored_path)
            )

            try:
                resolved = resolved.resolve()
            except OSError:
                pass

            if project_root_resolved is not None:
                try:
                    return resolved.relative_to(project_root_resolved)
                except ValueError:
                    pass

            # Fall back to splitting on the known layout segment, which still
            # works when the directory is gone and resolve() cannot match it.
            parts = resolved.parts
            if "generated_projects" in parts:
                index = parts.index("generated_projects")
                if len(parts) > index + 2:
                    return Path(*parts[index + 2:])

            return Path(resolved.name)

        def add_file(relative_path, contents):
            key = (
                relative_path.as_posix()
                if isinstance(relative_path, Path)
                else str(relative_path)
            )

            if not key or key in seen_paths:
                return

            seen_paths.add(key)
            files.append({"path": key, "contents": contents})

        # 1. Rows that carry their own content - the normal case.
        for generated_file in generated_files:
            if generated_file.contents is None:
                continue

            add_file(
                relative_for(Path(generated_file.file_path)),
                generated_file.contents,
            )

        # 2. Rows saved before the contents column existed, plus files present
        #    on disk but never recorded. Only reachable where the disk really
        #    is the one that generated them, i.e. local development.
        if project_root_resolved is not None:
            for generated_file in generated_files:
                if generated_file.contents is not None:
                    continue

                relative_path = relative_for(Path(generated_file.file_path))
                candidate = project_root_resolved / relative_path

                if not candidate.is_file():
                    continue

                try:
                    add_file(relative_path, candidate.read_text(encoding="utf-8"))
                except (UnicodeDecodeError, OSError):
                    continue

            for path_on_disk in project_root_resolved.rglob("*"):
                if not path_on_disk.is_file():
                    continue

                if any(
                    ignored in path_on_disk.parts
                    for ignored in (".git", "node_modules", ".venv", "__pycache__", "dist", "build")
                ):
                    continue

                try:
                    contents = path_on_disk.read_text(encoding="utf-8")
                except (UnicodeDecodeError, OSError):
                    continue

                try:
                    relative_path = path_on_disk.relative_to(project_root_resolved)
                except ValueError:
                    relative_path = Path(path_on_disk.name)

                add_file(relative_path, contents)

        # --------------------------------------------------
        # NO VALID FILES
        # --------------------------------------------------

        if not files:

            raise HTTPException(
                status_code=404,
                detail=(
                    "Project has no generated file contents yet. They are "
                    "either still being written or were generated before file "
                    "contents were stored in the database."
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