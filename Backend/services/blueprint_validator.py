"""
Blueprint validation for the coding agent.

The coding agent returns a project blueprint: a flat list of planned files.
The file generator then writes those files one by one, each in its own LLM
call. If the blueprint is incomplete, generated files end up importing paths
that were never planned - the classic "Failed to resolve import ./index.css"
WebContainer preview error.

This module turns the raw LLM plan into a manifest that is:

* normalized - forward slashes, no leading "./" or "/", no duplicates
* complete   - every mandatory Vite + React file is present
* safe       - TypeScript is downgraded to JavaScript unless the plan
               includes a tsconfig.json (Vite needs it for .ts/.tsx)
* ordered    - manifests and entry files first, so the generator writes
               dependencies before dependents
"""

import posixpath
import re
from typing import Any, Dict, List, Tuple


# ==========================================================
# CONSTANTS
# ==========================================================

ALLOWED_CATEGORIES = (
    "frontend",
    "backend",
    "database",
    "config",
    "documentation",
)

SOURCE_EXTENSIONS = (
    ".jsx",
    ".tsx",
    ".js",
    ".ts",
    ".mjs",
    ".cjs",
)

IGNORED_TOP_LEVEL = (
    "node_modules",
    ".git",
    "dist",
    "build",
    ".venv",
    "__pycache__",
)

ENTRY_CANDIDATES = (
    "frontend/src/main.jsx",
    "frontend/src/main.tsx",
    "frontend/src/index.jsx",
    "frontend/src/index.tsx",
)


# ==========================================================
# MANDATORY FRONTEND FILES
# ==========================================================
# Every Vite + React SPA needs these before it can boot in
# the in-browser preview. They are described precisely so
# the file generator produces consistent content for them.

MANDATORY_FILES: Dict[str, Dict[str, str]] = {
    "frontend/package.json": {
        "purpose": "Dependency manifest and npm scripts for the frontend app",
        "description": (
            "package.json for a Vite + React 18 single page app. scripts.dev must run "
            "vite. dependencies must include react and react-dom plus every npm "
            "package imported by any frontend source file in this blueprint; "
            "devDependencies must include vite and @vitejs/plugin-react. Use caret "
            "versions of real, published npm packages only."
        ),
        "category": "config",
    },
    "frontend/vite.config.js": {
        "purpose": "Vite build and dev-server configuration",
        "description": (
            "Standard Vite configuration importing defineConfig from vite and react "
            "from @vitejs/plugin-react. plugins is a list containing react(). server "
            "must set host 0.0.0.0 and port 5173 so the in-browser preview can bind."
        ),
        "category": "config",
    },
    "frontend/index.html": {
        "purpose": "HTML shell that Vite serves as the app entry point",
        "description": (
            "A single HTML document with a div whose id is root and exactly one "
            "module script tag whose src is /src/main.jsx. No other script tags."
        ),
        "category": "frontend",
    },
    "frontend/src/main.jsx": {
        "purpose": "React application bootstrap entry point",
        "description": (
            "Creates the React root with createRoot from react-dom/client, imports "
            "./index.css and renders the App component from ./App inside "
            "React.StrictMode. Any router or context provider the app needs is "
            "wrapped here, exactly once."
        ),
        "category": "frontend",
    },
    "frontend/src/App.jsx": {
        "purpose": "Root application component",
        "description": (
            "The root React component composed only of components that exist in this "
            "blueprint. It renders the layout and routes of the MVP and never imports "
            "files that are not listed in the blueprint."
        ),
        "category": "frontend",
    },
    "frontend/src/index.css": {
        "purpose": "Global stylesheet imported by the entry file",
        "description": (
            "Plain CSS holding the global reset, body and font defaults, CSS custom "
            "properties for the colour palette and shared utility classes used across "
            "components. No preprocessor syntax and no tailwind directives."
        ),
        "category": "frontend",
    },
}


# ==========================================================
# HELPERS
# ==========================================================

def normalize_path(raw: Any) -> str:
    """
    Turn any LLM supplied path into a clean relative posix path.

    Handles Windows separators, leading slashes, "./" prefixes, backticks
    and accidental absolute paths.
    """

    path = str(raw or "").strip().strip("`").strip().strip("'").strip('"')

    if not path:
        return ""

    path = path.replace("\\", "/")
    path = re.sub(r"/{2,}", "/", path)

    while path.startswith("./"):
        path = path[2:]

    # Drop a Windows drive prefix if the model ever invents one.
    path = re.sub(r"^[A-Za-z]:/", "", path)

    path = path.lstrip("/")

    while path.startswith("../"):
        path = path[3:]

    return path.strip()


def file_extension(path: str) -> str:
    return posixpath.splitext(path)[1].lower()


def is_frontend_source(path: str) -> bool:
    return path.startswith("frontend/") and file_extension(path) in SOURCE_EXTENSIONS


def _guess_category(path: str) -> str:

    name = posixpath.basename(path).lower()

    if name in ("package.json", "package-lock.json", "tsconfig.json"):
        return "config"

    if name.startswith("vite.config") or name.endswith((".config.js", ".config.ts")):
        return "config"

    if name in (".gitignore", ".env", ".eslintrc", "dockerfile"):
        return "config"

    if path.startswith("frontend/") or "/frontend/" in path:
        return "frontend"

    if path.startswith("backend/") or "/api/" in path:
        return "backend"

    if name.endswith((".sql", ".prisma")) or "schema" in name or path.startswith("database/"):
        return "database"

    if name.endswith((".md", ".txt")) or path.startswith("docs/"):
        return "documentation"

    return "config"


def _to_javascript(path: str) -> str:
    """Map a TypeScript source path onto its JavaScript equivalent."""

    name = posixpath.basename(path)

    if name.endswith(".d.ts"):
        return path

    if path.endswith(".tsx"):
        return path[: -len(".tsx")] + ".jsx"

    if path.endswith(".ts"):
        return path[: -len(".ts")] + ".js"

    return path


# ==========================================================
# ORDERING
# ==========================================================
# The file generator writes files in list order, so the
# foundation of the app has to come first.

_ORDER_PRIORITY = (
    ("frontend/package.json", 0),
    ("frontend/package-lock.json", 1),
    ("frontend/vite.config", 2),
    ("frontend/index.html", 3),
    ("frontend/src/main", 4),
    ("frontend/src/index", 5),
    ("frontend/src/app", 6),
)


def _sort_key(path: str) -> Tuple[int, str]:

    lowered = path.lower()

    for prefix, weight in _ORDER_PRIORITY:
        if lowered.startswith(prefix):
            return (weight, path)

    if file_extension(path) == ".css":
        return (7, path)

    return (9, path)


# ==========================================================
# MAIN ENTRY POINT
# ==========================================================

def sanitize_blueprint(
    files: List[Dict[str, Any]],
) -> Tuple[List[Dict[str, Any]], List[str]]:
    """
    Validate and repair a coding-agent blueprint.

    Returns the cleaned file list plus a human readable report of every
    change applied, so the agent can log it.
    """

    report: List[str] = []
    cleaned: List[Dict[str, Any]] = []
    seen: Dict[str, Dict[str, Any]] = {}

    for item in files or []:

        if not isinstance(item, dict):
            report.append(f"dropped malformed entry: {item!r}")
            continue

        path = normalize_path(item.get("path"))

        if not path or not re.search(r"[A-Za-z0-9]", path):
            report.append(f"dropped invalid file path: {item.get('path')!r}")
            continue

        if path.split("/")[0] in IGNORED_TOP_LEVEL:
            report.append(f"dropped ignored path: {path}")
            continue

        if path in seen:
            report.append(f"removed duplicate entry: {path}")
            continue

        category = str(item.get("category") or "").strip().lower()

        if category not in ALLOWED_CATEGORIES:
            category = _guess_category(path)
            report.append(f"fixed category for {path} -> {category}")

        entry = {
            "path": path,
            "purpose": str(item.get("purpose") or "").strip() or posixpath.basename(path),
            "description": str(item.get("description") or "").strip(),
            "category": category,
        }

        seen[path] = entry
        cleaned.append(entry)

    if not cleaned:
        report.append("blueprint was empty - injected a minimal runnable Vite React app")
        cleaned = [dict(spec, path=path) for path, spec in MANDATORY_FILES.items()]
        return _finalise(cleaned, report)

    paths = {entry["path"] for entry in cleaned}

    # ------------------------------------------------------
    # TypeScript downgrade. Vite needs tsconfig.json plus the
    # React type packages for .tsx files, and generated TS
    # routinely imports types that do not exist at runtime.
    # ------------------------------------------------------

    has_tsconfig = any(
        posixpath.basename(path) == "tsconfig.json" for path in paths
    )

    if not has_tsconfig:

        converted = [
            (entry["path"], _to_javascript(entry["path"]))
            for entry in cleaned
            if _to_javascript(entry["path"]) != entry["path"]
        ]

        for old_path, new_path in converted:

            entry = seen.get(old_path)

            if entry is None:
                continue

            if new_path in paths:
                cleaned = [e for e in cleaned if e["path"] != old_path]
                seen.pop(old_path, None)
                paths.discard(old_path)
                report.append(
                    f"dropped {old_path} (collides with existing {new_path} after TypeScript downgrade)"
                )
                continue

            entry["path"] = new_path
            seen.pop(old_path, None)
            seen[new_path] = entry
            paths.add(new_path)
            report.append(
                f"downgraded {old_path} -> {new_path} (blueprint has no tsconfig.json)"
            )

    # ------------------------------------------------------
    # Mandatory frontend files
    # ------------------------------------------------------

    has_frontend = any(is_frontend_source(path) for path in paths) or any(
        path.startswith("frontend/") and path.endswith(".html") for path in paths
    )

    if has_frontend:

        entry_file = next((c for c in ENTRY_CANDIDATES if c in paths), None)

        if entry_file is None:
            entry_file = "frontend/src/main.jsx"

        for mandatory_path, spec in MANDATORY_FILES.items():

            if mandatory_path in paths or mandatory_path == entry_file:
                continue

            cleaned.append(dict(spec, path=mandatory_path))
            paths.add(mandatory_path)
            report.append(f"added missing required file: {mandatory_path}")

        if entry_file not in paths:
            spec = MANDATORY_FILES["frontend/src/main.jsx"]
            cleaned.append(dict(spec, path=entry_file))
            paths.add(entry_file)
            report.append(f"added missing entry file: {entry_file}")

        if "frontend/src/index.css" not in paths:
            spec = MANDATORY_FILES["frontend/src/index.css"]
            cleaned.append(dict(spec, path="frontend/src/index.css"))
            paths.add("frontend/src/index.css")
            report.append("added frontend/src/index.css (imported by the entry file)")

    return _finalise(cleaned, report)


def _finalise(
    cleaned: List[Dict[str, Any]],
    report: List[str],
) -> Tuple[List[Dict[str, Any]], List[str]]:

    cleaned.sort(key=lambda entry: _sort_key(entry["path"]))

    return cleaned, report

