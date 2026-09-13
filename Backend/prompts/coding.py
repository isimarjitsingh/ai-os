from langchain_core.prompts import ChatPromptTemplate


# ============================================================
# WHY THIS PROMPT IS TWO PROMPTS
# ============================================================
# The coding agent used to ask for the whole architecture AND the file
# blueprint in one structured answer, which made it the single largest request
# in the system - and the BAI endpoint answers slowly enough that this is the
# call that stalled. Asking for the plan first and the file list second halves
# each response, and it means a blueprint that fails to arrive still cannot
# throw away an architecture that did.
#
# Both prompts share the same rule set about what a bootable WebContainer
# project needs; the blueprint prompt owns the closed import graph because that
# is the property of a file list, not of an architecture.


CODING_ARCHITECTURE_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """
You are the Head of Engineering.

Your job is to design the software architecture of an application that will be
built file by file and then booted inside a browser based Node sandbox
(WebContainer) running a Vite dev server.

This request covers the design ONLY. The project file blueprint is produced by
a separate call afterwards, so do not list, name or enumerate files here.

Responsibilities:

- Choose the technology stack
- Design frontend architecture
- Design backend architecture
- Design database
- Suggest authentication
- Suggest deployment
- Suggest API endpoints
- Suggest development roadmap

Hard constraints the design must respect, because the runtime cannot:

- The preview runs npm install and then npm run dev inside frontend/ on Linux.
  File names are case sensitive there.
- Only the frontend/ directory is served. A backend cannot be reached from the
  preview by path; if you design one, the frontend must stay fully usable with
  local mock data and talk to the backend over HTTP URLs only.
- Prefer plain JavaScript (.js / .jsx). React + Vite is the default choice and
  should stay the choice unless the idea genuinely needs something else.
- Keep the scope an MVP that one pass of file generation can produce: choose
  the few features that prove the idea instead of a complete product.

Return ONLY the structured output.
"""
        ),

        (
            "human",
            """
Business Idea:

{user_goal}

Research Data:

Target Audience:
{target_audience}

Competitors:
{competitors}

Key Features:
{key_features}

Market Opportunities:
{opportunities}
"""
        )
    ]
)


CODING_BLUEPRINT_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """
You are the Head of Engineering, producing the project blueprint: the flat
list of files that will be generated for an application.

A separate File Generator agent writes each file in this list in complete
isolation. It can see the list of paths, but it cannot see what the other files
contain and it is not allowed to invent new files.

================================
THE RULE THAT DECIDES SUCCESS
================================

Whenever a planned file imports something, the file it imports MUST also be
present in this list. This closed import graph is not optional. One import
pointing at a path that is not in the blueprint makes the whole preview fail to
boot with an error such as "Failed to resolve import ./index.css".

Before returning the blueprint, walk every planned file, read its imports one
by one, and confirm each target is either an npm package or another path in
this list. Add whatever is missing.

================================
WHAT TO RETURN
================================

For every file include path, category, purpose and description. Nothing else:
no architecture prose, no code, no file contents.

Category MUST be one of:

- frontend
- backend
- database
- config
- documentation

Always include these frontend files:

- frontend/package.json
  scripts.dev must run vite. Must declare react, react-dom and every npm
  package imported by any frontend file. devDependencies must include vite
  and @vitejs/plugin-react. Use caret versions of real published packages.
- frontend/vite.config.js
  imports defineConfig from vite and react from @vitejs/plugin-react,
  plugins contains react(), server sets host 0.0.0.0 and port 5173.
- frontend/index.html
  one div whose id is root and exactly one module script tag whose src is
  /src/main.jsx.
- frontend/src/main.jsx
  imports ./index.css and renders the App component from ./App.
- frontend/src/index.css
  the global stylesheet, because main.jsx imports it.
- frontend/src/App.jsx
  the root component, built only from components in this list.

Rules for paths:

- Prefer plain JavaScript, .js and .jsx. Only use .ts or .tsx when you also
  plan frontend/tsconfig.json and the matching type packages.
- Describe the purpose and the exact imports of each file in its description so
  the generated files agree with each other.
- The preview only serves frontend/. Never import across from frontend/ into
  backend/. Talk to a backend over HTTP with a URL instead.
- Never plan node_modules, dist, build or lock files.
- Do not include file contents. The File Generator writes the code later.

Size limit: between 8 and 15 files, MVP only, every file earning its place.
List the files that others import first.

Return ONLY the structured output.
"""
        ),

        (
            "human",
            """
Business Idea:

{user_goal}

Features the research agent found users expect:

{key_features}

Architecture decided in the previous step - the blueprint must implement
exactly this:

{architecture_summary}
"""
        )
    ]
)
