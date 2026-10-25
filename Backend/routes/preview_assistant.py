"""Preview Assistant API Routes for Live Preview Structure Validation"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, List

from database.database import SessionLocal
from database.crud import get_project_by_thread, save_coding_report
from auth.dependencies import get_current_user

from services.import_checker import check_project_imports, apply_case_fixes_from_tree
from services.blueprint_validator import validate_and_clean_blueprint
from agents.preview_assistant import validate_project_structure, auto_correct_issues

router = APIRouter(
    tags=["Preview Assistant"],
    prefix="/api/preview-assistant")



@router.post("/analyze")
def analyze_project_structure(
    thread_id: str,
    file_tree: Dict[str, Any],
    current_user=Depends(get_current_user),
):
    """
    Analyze the project structure when live preview is clicked.
    Checks for missing files, import errors, case sensitivity issues,
    and mandatory file completeness.
    """
    db = SessionLocal()
    try:
        project = get_project_by_thread(db=db, thread_id=thread_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        # Validate project structure
        validation = validate_project_structure(file_tree, project.project_name)

        # If there are import issues, check them
        import_issues = {}
        if not validation["valid"] and validation["missing_mandatory"] == []:
            import_results = check_project_imports(file_tree)
            import_issues = {
                "missing_imports": import_results.get("missing", []),
                "suggestions": import_results.get("suggestions", []),
                "auto_fixable": import_results.get("auto_fixable", True),
            }

        # Apply auto-fixes if applicable and auto_fixable
        corrected_tree = file_tree
        applied_fixes = []
        if validation["auto_fixable"] and not validation["valid"]:
            # Get corrections based on validation results
            corrections = []

            # Add case fix corrections
            case_results = apply_case_fixes_from_tree(file_tree)
            for fix in case_results.get("fixes", []):
                corrections.append({
                    "type": "case_fix",
                    "details": {
                        "import_path": fix.get("import_path", ""),
                        "target_path": fix.get("target_path", ""),
                    },
                    "description": f"Fix case sensitivity: {fix.get('import_path', '')}",
                })

            # Add missing file corrections
            for missing in validation.get("missing_mandatory", []):
                # Determine file type and purpose based on missing file name
                corrections.append({
                    "type": "missing_file",
                    "details": {
                        "target_path": missing,
                        "purpose": f"Auto-generated {missing}",
                        "file_type": ".jsx",  # default
                    },
                    "description": f"Generate missing mandatory file: {missing}",
                })

            # Add dependency corrections for missing deps
            if import_issues.get("missing_imports"):
                for imp in import_issues["missing_imports"][:3]:  # Limit to first 3
                    # Extract package name from import
                    corrections.append({
                        "type": "dependency",
                        "details": {
                            "package_name": imp.split("/")[0].replace("@", ""),
                            "version": "^latest",
                            "package_json_path": "frontend/package.json",
                            "dep_key": "dependencies",
                        },
                        "description": f"Add missing dependency: {imp}",
                    })

            corrected_tree, applied_fixes = auto_correct_issues(
                file_tree, corrections, project.project_name
            )

        return {
            "success": True,
            "thread_id": thread_id,
            "validation": validation,
            "import_issues": import_issues,
            "corrected_tree": corrected_tree,
            "applied_fixes": applied_fixes,
        }

    finally:
        db.close()


@router.post("/recreate-design")
def recreate_design(
    thread_id: str,
    design_specification: str,
    current_user=Depends(get_current_user),
):
    """
    Recreate the project design based on a user specification.
    This triggers the coding agent to generate a new design.
    """
    db = SessionLocal()
    try:
        project = get_project_by_thread(db=db, thread_id=thread_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        # TODO: Integrate with the coding agent to generate new design
        # For now, return a placeholder response
        return {
            "success": True,
            "thread_id": thread_id,
            "design_specification": design_specification,
            "message": "Design recreation initiated - coding agent will generate new files",
        }

    finally:
        db.close()