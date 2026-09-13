"""
Offline tests for the split coding flow and the research list guard.

Run from Backend/:  .venv\\Scripts\\python.exe test_coding_split.py

Nothing here touches the network, the database or the SSE bus: the LLM is a
recording fake, the project lookup is stubbed to "no project", and the event
emitters are no-ops. What is under test is the wiring this design added - two
requests merged into one contract, and what happens when either of them fails.
"""

import json
import sys

for stream in (sys.stdout, sys.stderr):

    try:
        stream.reconfigure(encoding="utf-8", errors="replace")

    except Exception:
        pass

import httpx
import openai

from langchain_core.language_models.fake_chat_models import FakeListChatModel

from llm_fallback import is_transient_error

PASSED = []
FAILED = []

REQUESTS = []


def check(name, condition, detail=""):

    if condition:
        PASSED.append(name)
        print(f"  PASS - {name}")

    else:
        FAILED.append(name)
        print(f"  FAIL - {name} {detail}")


# ============================================================
# FIXTURES
# ============================================================

ARCHITECTURE = {
    "project_name": "InvoiceNest",
    "tech_stack": ["React", "Vite"],
    "frontend": ["React", "Vite"],
    "backend": ["FastAPI"],
    "database": "PostgreSQL",
    "architecture": "A React SPA that posts invoices to a FastAPI service.",
    "core_features": ["Create invoice", "Send reminder", "Dashboard"],
    "api_endpoints": ["POST /invoices", "GET /invoices"],
    "development_steps": ["Scaffold Vite", "Build invoice form"],
    "system_architecture": "SPA + JSON API.",
}

BLUEPRINT = {
    "files": [
        {
            "path": "frontend/package.json",
            "purpose": "Dependency manifest",
            "description": "Vite + React deps.",
            "category": "config",
        },
        {
            "path": "frontend/vite.config.js",
            "purpose": "Vite config",
            "description": "react plugin, host 0.0.0.0.",
            "category": "config",
        },
        {
            "path": "frontend/index.html",
            "purpose": "HTML shell",
            "description": "root div + one module script tag.",
            "category": "frontend",
        },
        {
            "path": "frontend/src/main.jsx",
            "purpose": "Bootstrap",
            "description": "mounts App, imports ./index.css.",
            "category": "frontend",
        },
        {
            "path": "frontend/src/index.css",
            "purpose": "Global styles",
            "description": "reset + palette.",
            "category": "frontend",
        },
        {
            "path": "frontend/src/App.jsx",
            "purpose": "Root component",
            "description": "renders the invoice dashboard.",
            "category": "frontend",
        },
    ]
}


def fenced(payload):
    """The shape the BAI proxy actually answers with."""

    return "```json\n" + json.dumps(payload) + "\n```"


def timeout_error():

    return openai.APITimeoutError(
        request=httpx.Request("POST", "https://api.b.ai/v1/chat/completions")
    )


class ExplodingChain:
    """chain.invoke() that always fails with a transport error."""

    def __init__(self, error):

        self.error = error
        self.calls = 0

    def invoke(self, _inputs):

        self.calls += 1
        raise self.error


class RecordingChatModel(FakeListChatModel):
    """Replies from a scripted list and records the rendered messages."""

    def _generate(self, messages, stop=None, run_manager=None, **kwargs):

        REQUESTS.append(list(messages))

        return super()._generate(
            messages, stop=stop, run_manager=run_manager, **kwargs
        )


# ============================================================
# WIRE THE AGENTS TO FAKES
# ============================================================

import llm as llm_module

from prompts.coding import (
    CODING_ARCHITECTURE_PROMPT,
    CODING_BLUEPRINT_PROMPT,
)
from schemas.coding import CodingArchitecture, CodingOutput, FileBlueprint

import agents.coding as coding_module


def build_coding_chains(model):

    """Rebuild the agent's two chains against a fake chat model."""

    llm_module.llm = model

    coding_module.coding_architecture_chain = (
        CODING_ARCHITECTURE_PROMPT | llm_module.structured_llm(
            CodingArchitecture
        )
    )
    coding_module.coding_blueprint_chain = (
        CODING_BLUEPRINT_PROMPT | llm_module.structured_llm(FileBlueprint)
    )


STATE = {
    "thread_id": "test-thread",
    "user_id": 1,
    "user_goal": "A tool that lets freelancers invoice clients.",
    "research_report": {
        "market_overview": "Growing freelancer tooling market.",
        "target_audience": ["Freelance designers", "Solo developers"],
        "competitors": ["FreshBooks", "Wave"],
        "key_features": ["Recurring invoices", "Payment reminders"],
        "opportunities": ["Cheap flat-fee pricing"],
        "risks": ["Established incumbents"],
    },
}

# The database and the SSE bus are not part of this test.
coding_module.get_complete_project = lambda *a, **k: None
coding_module.emit_running = lambda *a, **k: None
coding_module.emit_completed = lambda *a, **k: None

# Retrying a stalled endpoint sleeps between attempts. This test asserts on the
# ladder, so the waiting is stubbed - never removed - and no run sleeps.
import llm_fallback as fallback_module

fallback_module.time.sleep = lambda seconds: None


# ============================================================
# 1. THE HAPPY PATH - TWO CALLS, ONE CONTRACT
# ============================================================

print("\n[1] split coding flow, both calls succeed")

build_coding_chains(
    RecordingChatModel(responses=[fenced(ARCHITECTURE), fenced(BLUEPRINT)])
)

REQUESTS.clear()

output = coding_module.coding_agent(dict(STATE))["coding_report"]

check(
    "the agent still returns a CodingOutput-shaped report",
    CodingOutput.model_validate(output).project_name == "InvoiceNest",
)

check("exactly two LLM requests were made", len(REQUESTS) == 2)

check(
    "the architecture answer survived into the merged output",
    output["core_features"] == ARCHITECTURE["core_features"]
    and output["api_endpoints"] == ARCHITECTURE["api_endpoints"]
    and output["system_architecture"] == ARCHITECTURE["system_architecture"],
)

check(
    "the blueprint arrived as real files, not prose",
    len(output["files"]) >= 6
    and {entry["path"] for entry in output["files"]} >= {
        "frontend/src/App.jsx",
        "frontend/src/main.jsx",
    },
)

check(
    "every planned file carries the fields file_generator reads",
    all(
        {"path", "purpose", "description", "category"} <= set(entry)
        for entry in output["files"]
    ),
)

first_prompt = str(REQUESTS[0])
second_prompt = str(REQUESTS[1])

check(
    "the architecture call is not asked to enumerate files",
    "frontend/package.json" not in first_prompt
    and "8 and 15" not in first_prompt,
)

check(
    "the blueprint call is handed the architecture it must implement",
    "React" in second_prompt
    and "Create invoice" in second_prompt
    and "POST /invoices" in second_prompt,
)

check(
    "the blueprint call keeps the closed-import-graph rule",
    "Failed to resolve import" in second_prompt,
)

check(
    "the blueprint call carries a file-count bound",
    "8 and 15" in second_prompt,
)


# ============================================================
# 2. BLUEPRINT TIMES OUT - THE ARCHITECTURE MUST SURVIVE
# ============================================================

print("\n[2] blueprint fails, architecture survives")

build_coding_chains(RecordingChatModel(responses=[fenced(ARCHITECTURE)]))

coding_module.coding_blueprint_chain = ExplodingChain(timeout_error())

check(
    "the failure used here really is the transient class",
    is_transient_error(timeout_error()),
)

degraded = coding_module.coding_agent(dict(STATE))["coding_report"]

check(
    "the real architecture is kept when the blueprint dies",
    degraded["project_name"] == "InvoiceNest"
    and degraded["core_features"] == ARCHITECTURE["core_features"]
    and degraded["backend"] == ARCHITECTURE["backend"],
)

check(
    "a bootable file list replaces the missing blueprint",
    len(degraded["files"]) > 0
    and any(
        entry["path"] == "frontend/index.html"
        for entry in degraded["files"]
    ),
)

check(
    "the degraded report is still a valid CodingOutput",
    CodingOutput.model_validate(degraded) is not None,
)


# ============================================================
# 3. BOTH PHASES FAIL - DEGRADE, DO NOT HANG, DO NOT RAISE
# ============================================================

print("\n[3] both phases fail")

coding_module.coding_architecture_chain = ExplodingChain(timeout_error())

stalled = coding_module.coding_agent(dict(STATE))["coding_report"]

check(
    "a fully stalled provider still produces a usable report",
    CodingOutput.model_validate(stalled) is not None
    and stalled["project_name"] == "AI Generated Project"
    and len(stalled["files"]) > 0,
)

check(
    "the stalled report admits it is a fallback",
    "fallback" in stalled["architecture"].lower(),
)


# ============================================================
# 4. RESEARCH LIST GUARD, END TO END
# ============================================================

print("\n[4] research empty-list guard")

import agents.research as research_module

from prompts.research import RESEARCH_PROMPT, RESEARCH_RETRY_PROMPT
from schemas.research import ResearchOutput

research_module.get_complete_project = lambda *a, **k: None
research_module.emit_running = lambda *a, **k: None
research_module.emit_completed = lambda *a, **k: None


class StubSearch:

    def invoke(self, _query):

        return "Some web results."


research_module.web_search = StubSearch()

# Exactly what the last bad run produced: valid arrays, no content, and one
# field holding the debris of a half-parsed list repr.
EMPTY_RESEARCH = {
    "market_overview": "A market.",
    "target_audience": [],
    "competitors": ["[', ']"],
    "key_features": [],
    "opportunities": [],
    "risks": [],
}

FULL_RESEARCH = {
    "market_overview": "A real market overview.",
    "target_audience": ["Freelance designers", "Agencies", "Solo devs"],
    "competitors": ["FreshBooks", "Wave", "Zoho"],
    "key_features": ["Recurring invoices", "Reminders"],
    "opportunities": ["Flat pricing"],
    "risks": ["Incumbents"],
}


def research_chains(model):

    llm_module.llm = model

    research_module.chain = (
        RESEARCH_PROMPT | llm_module.structured_llm(ResearchOutput)
    )
    research_module.retry_chain = (
        RESEARCH_RETRY_PROMPT | llm_module.structured_llm(ResearchOutput)
    )


def run_research():

    return research_module.research_agent(
        {
            "thread_id": "test-thread",
            "user_id": 1,
            "user_goal": "Invoicing for freelancers.",
        }
    )["research_report"]


research_chains(
    RecordingChatModel(
        responses=[fenced(EMPTY_RESEARCH), fenced(FULL_RESEARCH)]
    )
)

REQUESTS.clear()

recovered = run_research()

check(
    "a blank first answer costs exactly one extra request",
    len(REQUESTS) == 2,
)

check(
    "the re-ask was told to be complete, not merely retried",
    "3 and 5" in str(REQUESTS[1]),
)

check(
    "the blank fields came back filled",
    recovered["target_audience"] == FULL_RESEARCH["target_audience"]
    and recovered["competitors"] == FULL_RESEARCH["competitors"]
    and recovered["key_features"] == FULL_RESEARCH["key_features"],
)

# Both answers blank: the documented fallback has to take over so coding never
# sees "Key features:" with nothing under it.
research_chains(
    RecordingChatModel(
        responses=[fenced(EMPTY_RESEARCH), fenced(EMPTY_RESEARCH)]
    )
)

starved = run_research()

LIST_FIELDS = (
    "target_audience",
    "competitors",
    "key_features",
    "opportunities",
    "risks",
)

check(
    "a model that answers blank twice still yields usable lists",
    all(starved[field] for field in LIST_FIELDS),
)

check(
    "no list item is junk by the time the report is stored",
    all(
        isinstance(item, str)
        and item.strip(" [],'\"") != ""
        for field in LIST_FIELDS
        for item in starved[field]
    ),
)


class FlakyChain:
    """chain.invoke() that fails a fixed number of times, then answers."""

    def __init__(self, errors, final):

        self.errors = list(errors)
        self.final = final
        self.calls = 0

    def invoke(self, _inputs):

        self.calls += 1

        if self.errors:
            raise self.errors.pop(0)

        return self.final


# ============================================================
# 5. PER-FILE GENERATION SURVIVES A STALL
#
# llm.py switched the SDK's private retries off, so the file generator's own
# loops are now the only thing standing between one slow request and a failed
# project. These checks are what pin that down.
# ============================================================

print("\n[5] file generator retry loops")

import agents.file_generator as file_generator

original_repair_chain = file_generator.repair_chain

try:

    stalled_repair = FlakyChain([timeout_error()], "REPAIRED")
    file_generator.repair_chain = stalled_repair

    check(
        "a stalled repair call is retried instead of failing the build",
        file_generator._invoke_repair({}) == "REPAIRED"
        and stalled_repair.calls == 2,
    )

    refused_repair = FlakyChain(
        [
            openai.RateLimitError(
                "Error code: 429",
                response=httpx.Response(
                    429,
                    headers={"retry-after": "4"},
                    request=httpx.Request(
                        "POST", "https://api.b.ai/v1/chat/completions"
                    ),
                ),
                body=None,
            )
        ],
        "REPAIRED",
    )
    file_generator.repair_chain = refused_repair

    check(
        "a 429 during repair is still waited out",
        file_generator._invoke_repair({}) == "REPAIRED"
        and refused_repair.calls == 2,
    )

    broken_repair = FlakyChain([ValueError("bad prompt")], "NEVER")
    file_generator.repair_chain = broken_repair

    try:

        file_generator._invoke_repair({})
        escaped = False

    except ValueError:
        escaped = True

    check(
        "an unknown error during repair still raises at once",
        escaped and broken_repair.calls == 1,
    )

finally:

    file_generator.repair_chain = original_repair_chain


# ============================================================
# RESULT
# ============================================================

print(
    f"\n{'=' * 50}\n"
    f"PASSED: {len(PASSED)}   FAILED: {len(FAILED)}\n{'=' * 50}"
)

if FAILED:

    print("Failed checks:")

    [print(f"  - {name}") for name in FAILED]

    sys.exit(1)

print("ALL TESTS PASSED")



