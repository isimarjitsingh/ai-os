"""Preview Assistant Agent for Live Preview Structure Validation"""

import posixpath
from typing import Dict, List, Optional
from pathlib import Path


def validate_project_structure(file_tree: Dict, project_name: str) -> Dict:
    """Validate project structure when live preview is clicked."""
    issues = {
        "valid": True,
        "missing_files": [],
        "case_fixes": [],
        "suggested_generations": [],
        "missing_mandatory": [],
        "auto_fixable": True,
    }

    if not file_tree:
        issues["valid"] = False
        issues["missing_mandatory"] = [
            "frontend/package.json",
            "frontend/vite.config.js",
            "frontend/index.html",
            "frontend/src/main.jsx",
        ]
        return issues

    # Check mandatory files
    mandatory_files = [
        "frontend/package.json",
        "frontend/vite.config.js",
        "frontend/index.html",
        "frontend/src/main.jsx",
        "frontend/src/index.css",
    ]
    file_tree_paths = _get_all_file_paths(file_tree)

    for mandatory in mandatory_files:
        if mandatory not in file_tree_paths:
            issues["valid"] = False
            issues["missing_mandatory"].append(mandatory)
            issues["auto_fixable"] = False

    return issues


def _get_all_file_paths(file_tree: Dict, prefix: str = "") -> List[str]:
    """Recursively get all file paths from a file tree dict."""
    paths = []
    if not file_tree:
        return paths
    for key, value in file_tree.items():
        full_path = posixpath.join(prefix, key) if prefix else key
        if isinstance(value, dict):
            if "file" in value and "contents" in value.get("file", {}):
                paths.append(posixpath.normpath(full_path))
            elif "directory" in value:
                paths.extend(_get_all_file_paths(value["directory"], full_path))
        elif isinstance(value, str):
            paths.append(posixpath.normpath(full_path))
    return paths
