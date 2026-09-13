from pathlib import Path

import re

# Anchored to the Backend package, NOT the current working directory.
# routes/files.py reads generated projects from here, so if the server is
# launched from a different directory the two must still agree, otherwise
# the preview finds an empty project tree.
BACKEND_ROOT = Path(__file__).resolve().parents[1]


class FileWriter:

    def __init__(self, output_dir: str = "generated_projects"):

        path = Path(output_dir)

        self.output_dir = path if path.is_absolute() else BACKEND_ROOT / path

    def project_dir(self, project_name: str) -> Path:
        """Absolute directory holding every file of a generated project."""
        return self.output_dir / project_name

    def write_file(
        self,
        project_name: str,
        file_path: str,
        content: str
    ) -> str:

        full_path = self.output_dir / project_name / file_path

        # Create folders automatically
        full_path.parent.mkdir(
            parents=True,
            exist_ok=True
        )

        # Write the file
        full_path.write_text(
            content,
            encoding="utf-8"
        )

        return str(full_path)

    def fix_index_html_entry(self, project_name: str):
        """
        Make sure frontend/index.html loads an entry file that exists.

        The blueprint can promise /src/main.tsx while the generator wrote
        /src/main.jsx, or the reverse. Vite serves the HTML and then fails
        hard on the missing module, so the script tag is repointed at the
        first entry candidate really present on disk.

        Returns the new src when it was changed, otherwise None.
        """

        frontend_dir = self.output_dir / project_name / "frontend"

        html_path = frontend_dir / "index.html"

        if not html_path.exists():
            return None

        html = html_path.read_text(encoding="utf-8", errors="replace")

        candidates = (
            "/src/main.jsx",
            "/src/index.jsx",
            "/src/main.tsx",
            "/src/index.tsx",
            "/src/main.js",
            "/src/index.js",
        )

        for match in re.finditer(
            r"<script\b[^>]*\bsrc\s*=\s*[\"'](?P<src>[^\"']+)[\"']",
            html,
            re.IGNORECASE,
        ):

            src = match.group("src")

            if src.startswith(("http://", "https://", "//", "data:")):
                continue

            if (frontend_dir / src.lstrip("/")).exists():
                continue

            replacement = next(
                (item for item in candidates if (frontend_dir / item.lstrip("/")).exists()),
                None,
            )

            if replacement is None:
                return None

            html = (
                html[: match.start("src")]
                + replacement
                + html[match.end("src"):]
            )

            html_path.write_text(html, encoding="utf-8")

            return replacement

        return None

    def ensure_frontend_entry_files(
        self,
        project_name: str,
        project_title: str = "React App",
        is_vite: bool = True
    ) -> list[str]:
        """
        Ensures both root index.html (with module script for Vite) and
        public/index.html (for CRA) exist, plus vite.config.js if using Vite.
        """
        created = []
        frontend_dir = self.output_dir / project_name / "frontend"
        src_dir = frontend_dir / "src"

        # 1. Determine script entry candidate from src
        entry_script = "/src/index.tsx"
        if src_dir.exists():
            for candidate in ["index.tsx", "main.tsx", "index.jsx", "main.jsx", "App.tsx", "App.jsx"]:
                if (src_dir / candidate).exists():
                    entry_script = f"/src/{candidate}"
                    break

        # 2. Root index.html (Required for Vite)
        root_html = frontend_dir / "index.html"
        if not root_html.exists():
            root_html.parent.mkdir(parents=True, exist_ok=True)
            html_content = f"""<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{project_title}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="{entry_script}"></script>
  </body>
</html>"""
            root_html.write_text(html_content, encoding="utf-8")
            created.append(str(root_html))

        # 3. public/index.html (Required for Create React App)
        public_html = frontend_dir / "public" / "index.html"
        if not public_html.exists():
            public_html.parent.mkdir(parents=True, exist_ok=True)
            html_content = f"""<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{project_title}</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>"""
            public_html.write_text(html_content, encoding="utf-8")
            created.append(str(public_html))

        # 4. vite.config.js (Required for Vite React)
        vite_config = frontend_dir / "vite.config.js"
        vite_config_ts = frontend_dir / "vite.config.ts"
        if is_vite and not vite_config.exists() and not vite_config_ts.exists():
            config_content = """import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
});
"""
            vite_config.write_text(config_content, encoding="utf-8")
            created.append(str(vite_config))

        return created

    def ensure_react_public_html(
        self,
        project_name: str,
        project_title: str = "React App"
    ) -> str:
        """
        Automatically create public/index.html for React projects if missing.
        This is required for Create React App (react-scripts) to work.
        """
        public_html_path = self.output_dir / project_name / "frontend" / "public" / "index.html"
        
        # Only create if it doesn't exist
        if not public_html_path.exists():
            public_html_path.parent.mkdir(
                parents=True,
                exist_ok=True
            )
            
            html_content = f"""<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta
      name="description"
      content="{project_title}"
    />
    <title>{project_title}</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>"""
            
            public_html_path.write_text(
                html_content,
                encoding="utf-8"
            )
            
            return str(public_html_path)
        
        return str(public_html_path)


file_writer = FileWriter()