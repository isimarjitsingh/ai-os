"""
Import closure checking for generated projects.

The in-browser preview boots the frontend with "npm install && npm run dev".
Vite fails the whole app when a single relative import cannot be resolved,
so a generated project must satisfy one rule:

    every relative import in every source file must point at a file that
    actually exists in the project, with the exact same casing.

This module walks a generated project on disk, parses the import statements
of each source file (and the module script tag of each HTML file) and
reports:

  missing    - imports that resolve to nothing and therefore need a file
               generated for them
  case_fixes - imports that only differ from an existing file by casing
               (tolerated by Windows, fatal in the Linux WebContainer)

It is deliberately dependency free so it can be unit tested on its own.
"""

import posixpath
import re
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple


# ==========================================================
# PATTERNS AND CONSTANTS
# ==========================================================

SOURCE_SUFFIXES = (
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".mjs",
    ".cjs",
)

STYLE_SUFFIXES = (
    ".css",
    ".scss",
    ".sass",
    ".less",
)

ASSET_SUFFIXES = (
    ".svg",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".ico",
    ".json",
    ".woff",
    ".woff2",
    ".ttf",
    ".mp4",
)

RESOLVE_CANDIDATES = (
    "",
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".mjs",
    ".cjs",
    ".json",
    ".css",
    ".scss",
)

SWAPPABLE_SUFFIXES = (
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".mjs",
    ".cjs",
)

INDEX_CANDIDATES = (
    "/index.js",
    "/index.jsx",
    "/index.ts",
    "/index.tsx",
    "/index.mjs",
)

# import X from './y' | export { a } from './y' | export * from './y'
IMPORT_FROM_RE = re.compile(
    r"(?:^|\n)[ \t]*(?:import|export)\s+(?P<clause>[^\n;]*?)\s*from\s*[\"'](?P<spec>[^\"'\n]+)[\"']",
)

# import './styles.css'
BARE_IMPORT_RE = re.compile(
    r"(?:^|\n)[ \t]*import\s*[\"'](?P<spec>[^\"'\n]+)[\"']",
)

# await import('./Page.jsx')
DYNAMIC_IMPORT_RE = re.compile(
    r"import\s*\(\s*[\"'](?P<spec>[^\"'\n]+)[\"']\s*\)",
)

# require('./config')
REQUIRE_RE = re.compile(
    r"require\s*\(\s*[\"'](?P<spec>[^\"'\n]+)[\"']\s*\)",
)

# <script type="module" src="/src/main.jsx"></script>
HTML_SCRIPT_RE = re.compile(
    r"<script\b[^>]*\bsrc\s*=\s*[\"'](?P<src>[^\"']+)[\"'][^>]*>",
    re.IGNORECASE,
)

MODULE_SCRIPT_RE = re.compile(
    r"type\s*=\s*[\"']module[\"']",
    re.IGNORECASE,
)

IDENTIFIER_RE = re.compile(r"^[A-Za-z_$][A-Za-z0-9_$]*$")

IGNORED_DIRECTORIES = {
    "node_modules",
    ".git",
    "dist",
    "build",
    ".venv",
    "__pycache__",
    ".next",
    ".cache",
}


# ==========================================================
# SPEC CLASSIFICATION
# ==========================================================

def is_external(spec: str) -> bool:
    """
    True for bare npm package names such as react or @mui/material.

    Those are not this module's concern - package.json plus the preview's
    own dependency auto-detection handle them. Only relative paths, root
    absolute paths and the @/ alias are treated as internal.
    """

    if not spec:
        return True

    if spec.startswith(".") or spec.startswith("/") or spec.startswith("@/"):
        return False

    return True


# ==========================================================
# PARSING
# ==========================================================

def extract_imports(text: str) -> List[Tuple[str, str]]:
    """
    Return (specifier, imported_clause) pairs found in a source file.

    The clause is the raw text between the import keyword and the from
    keyword, which is enough to know which bindings the importer expects
    the target module to export.
    """

    found: List[Tuple[str, str]] = []

    for match in IMPORT_FROM_RE.finditer(text):
        found.append((match.group("spec"), (match.group("clause") or "").strip()))

    for match in BARE_IMPORT_RE.finditer(text):
        found.append((match.group("spec"), ""))

    for match in DYNAMIC_IMPORT_RE.finditer(text):
        found.append((match.group("spec"), ""))

    for match in REQUIRE_RE.finditer(text):
        found.append((match.group("spec"), ""))

    return found


def imported_names(clause: str) -> List[str]:
    """
    Best effort list of binding names an importer expects from a module.

    Handles default imports, named imports inside braces and aliased
    bindings. A namespace import contributes "*".
    """

    clause = (clause or "").strip()

    if not clause:
        return []

    names: List[str] = []

    if clause.startswith("type "):
        clause = clause[5:].strip()

    if clause.startswith("*"):
        names.append("*")

    head, _, tail = clause.partition("{")

    head = head.strip().strip(",").strip()

    if head and "*" not in head and head != "as":

        default = head.split(" as ")[-1].strip() if " as " in head else head

        if IDENTIFIER_RE.match(default):
            names.append(default)

    if tail:

        body = tail.split("}")[0]

        for part in body.split(","):

            part = part.strip()

            if not part:
                continue

            if part.startswith("type "):
                part = part[5:].strip()

            # "useAuth as auth" - the target module must export "useAuth",
            # the local alias is irrelevant to the repair pass.
            name = part.split(" as ")[0].strip()

            if IDENTIFIER_RE.match(name):
                names.append(name)

    return names


def extract_html_module_scripts(text: str) -> List[str]:
    """The src values of every module script tag in an HTML document."""

    scripts: List[str] = []

    for match in HTML_SCRIPT_RE.finditer(text):

        if not MODULE_SCRIPT_RE.search(match.group(0)):
            continue

        scripts.append(match.group("src").strip())

    return scripts


# ==========================================================
# RESOLUTION
# ==========================================================

def _join(base: str, spec: str) -> str:

    if not base:
        return posixpath.normpath(spec)

    return posixpath.normpath(posixpath.join(base, spec))


def _candidates(joined: str) -> Iterable[str]:
    """Every path Vite tries when resolving an import specifier."""

    yield joined

    stem, ext = posixpath.splitext(joined)

    if ext:
        for swap in SWAPPABLE_SUFFIXES:
            if swap != ext:
                yield stem + swap
    else:
        for candidate in RESOLVE_CANDIDATES:
            yield joined + candidate

    for index in INDEX_CANDIDATES:
        yield joined + index


def resolve_spec(
    importer: str,
    spec: str,
    existing: Set[str],
    lowered_index: Dict[str, str],
) -> Tuple[Optional[str], Optional[str]]:
    """
    Resolve an internal import specifier against the project file set.

    Returns (resolved_path, case_mismatch). resolved_path is the exact
    project-relative path when the import is satisfiable. When it is not,
    but a file differing only by casing exists, resolved_path is None and
    case_mismatch holds that file's real path.
    """

    if spec.startswith("@/"):
        roots = ("frontend/src", "src")
        rest = spec[2:]
    elif spec.startswith("/"):
        roots = ("frontend", "")
        rest = spec[1:]
    elif spec.startswith("."):
        rest = _join(posixpath.dirname(importer), spec)
        roots = ("",)
    else:
        return None, None

    for root in roots:

        joined = _join(root, rest) if root else rest

        for candidate in _candidates(joined):

            if candidate in existing:
                return candidate, None

            match = lowered_index.get(candidate.lower())

            if match and match != candidate:
                return None, match

    return None, None


def guess_target(importer: str, spec: str) -> str:
    """
    The project-relative path of the file that should exist to satisfy an
    unresolvable import.
    """

    if spec.startswith("@/"):
        joined = _join("frontend/src", spec[2:])
    elif spec.startswith("/"):
        joined = _join("frontend", spec.lstrip("/"))
    else:
        joined = _join(posixpath.dirname(importer), spec)

    stem, ext = posixpath.splitext(joined)

    if ext:
        return joined

    name = posixpath.basename(joined)

    if name[:1].isupper():
        return joined + ".jsx"

    return joined + ".js"


# ==========================================================
# PROJECT SCAN
# ==========================================================

def collect_project_files(project_root: Path) -> Dict[str, Path]:
    """
    Map of project-relative posix path to absolute path for every real
    file of a generated project.
    """

    project_root = Path(project_root)

    collected: Dict[str, Path] = {}

    if not project_root.exists():
        return collected

    for path in project_root.rglob("*"):

        if not path.is_file():
            continue

        try:
            relative = path.relative_to(project_root).as_posix()
        except ValueError:
            continue

        parts = relative.split("/")

        if any(part in IGNORED_DIRECTORIES for part in parts[:-1]):
            continue

        collected[relative] = path

    return collected


def _read(path: Path) -> str:

    try:
        return path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return ""


def scan_project(project_root: Path) -> Dict[str, Any]:
    """
    Check the import closure of a generated project.

    Returns a dict with:

      files      - every project file, relative posix paths, sorted
      missing    - [{path, kind, importers: [{file, spec, names}]}]
      case_fixes - [{file, old, new}] casing mismatches to rewrite
    """

    files = collect_project_files(project_root)

    existing: Set[str] = set(files)

    lowered_index = {path.lower(): path for path in existing}

    missing: Dict[str, Dict[str, Any]] = {}

    case_fixes: List[Dict[str, str]] = []

    def record(target: str, kind: str, importer: str, spec: str, names: List[str]) -> None:

        if target in existing:
            return

        entry = missing.setdefault(
            target,
            {"path": target, "kind": kind, "importers": []},
        )

        entry["importers"].append(
            {"file": importer, "spec": spec, "names": names}
        )

    for relative in sorted(existing):

        suffix = posixpath.splitext(relative)[1].lower()

        absolute = files[relative]

        if suffix in SOURCE_SUFFIXES:

            text = _read(absolute)

            for spec, clause in extract_imports(text):

                if is_external(spec):
                    continue

                resolved, mismatch = resolve_spec(
                    relative, spec, existing, lowered_index
                )

                if resolved:
                    continue

                if mismatch:
                    case_fixes.append(
                        {
                            "file": relative,
                            "old": spec,
                            "new": _rewrite_spec(relative, mismatch, spec),
                        }
                    )
                    continue

                target = guess_target(relative, spec)

                target_ext = posixpath.splitext(target)[1]

                if target_ext in STYLE_SUFFIXES:
                    kind = "css"
                elif target_ext in ASSET_SUFFIXES:
                    kind = "asset"
                else:
                    kind = "module"

                record(target, kind, relative, spec, imported_names(clause))

        elif suffix == ".html":

            text = _read(absolute)

            for src in extract_html_module_scripts(text):

                if src.startswith(("http://", "https://", "//", "data:")):
                    continue

                specifier = src if src.startswith("/") else "./" + src

                resolved, _mismatch = resolve_spec(
                    relative, specifier, existing, lowered_index
                )

                if resolved:
                    continue

                record(
                    guess_target(relative, specifier),
                    "module",
                    relative,
                    src,
                    [],
                )

    return {
        "files": sorted(existing),
        "missing": [missing[path] for path in sorted(missing)],
        "case_fixes": case_fixes,
    }


def _rewrite_spec(importer: str, target: str, original_spec: str) -> str:
    """
    Build a specifier that points from importer to target while keeping the
    shape (alias style and extension-ness) of the original specifier.
    """

    if original_spec.startswith("@/"):
        for root in ("frontend/src/", "src/"):
            if target.startswith(root):
                return "@/" + target[len(root):]
        return original_spec

    if original_spec.startswith("/"):
        for root in ("frontend/", ""):
            if target.startswith(root):
                return "/" + target[len(root):]
        return original_spec

    base = posixpath.dirname(importer)

    relative = posixpath.relpath(target, base) if base else target

    if not relative.startswith(".."):
        relative = "./" + relative

    original_ext = posixpath.splitext(original_spec)[1]
    target_ext = posixpath.splitext(target)[1]

    # Keep extensionless specifiers extensionless - Vite resolves them.
    if not original_ext and original_ext != target_ext:
        stem, _ext = posixpath.splitext(relative)
        relative = stem

    return relative


def apply_case_fixes(project_root: Path, fixes: List[Dict[str, str]]) -> int:
    """
    Rewrite import specifiers so their casing matches the real file name.

    Windows resolves ./components/navbar to Navbar.jsx without complaint,
    the Linux WebContainer running the preview does not, so these have to
    be corrected on disk before the project can boot.
    """

    project_root = Path(project_root)

    applied = 0

    for fix in fixes:

        target = project_root / fix["file"]

        text = _read(target)

        if not text:
            continue

        updated = text

        for quote in ("'", '"', "`"):

            updated = updated.replace(
                quote + fix["old"] + quote,
                quote + fix["new"] + quote,
            )

        if updated == text:
            continue

        try:
            target.write_text(updated, encoding="utf-8")
        except OSError:
            continue

        applied += 1

    return applied


