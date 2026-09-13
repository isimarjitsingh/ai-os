"""
Offline tests for llm_fallback.py - no network, no DB, no API key.

Run from Backend/:  .venv\\Scripts\\python.exe test_llm_fallback.py
"""

import sys

# Windows consoles / redirected logs are often cp1252; make the emoji
# output in this test and in llm_fallback itself safe everywhere.
for stream in (sys.stdout, sys.stderr):

    try:
        stream.reconfigure(encoding="utf-8", errors="replace")

    except Exception:
        pass

from pydantic import ValidationError

from llm_fallback import (
    is_structured_output_failure,
    is_pydantic_json_error,
    is_rate_limit_error,
    retry_after_seconds,
    rate_limit_wait,
    RATE_LIMIT_DELAYS,
    RATE_LIMIT_MAX_WAIT,
    _extract_generation,
    _strip_json_wrapping,
    _raw_input_from_pydantic_error,
    json_schema_response_format,
    parse_structured_message,
    salvage,
    fallback_model,
    invoke_structured,
)

from schemas.research import ResearchOutput
from schemas.execution_plan import ExecutionPlan
from schemas.coding import CodingOutput


PASSED = []
FAILED = []


def check(name, condition, detail=""):

    if condition:
        PASSED.append(name)
        print(f"  PASS - {name}")

    else:
        FAILED.append(name)
        print(f"  FAIL - {name} {detail}")


# ============================================================
# FAKE GROQ EXCEPTION - mirrors groq.APIStatusError shape
# ============================================================

class FakeGroqError(Exception):

    def __init__(self, message, body=None):

        super().__init__(message)

        self.status_code = 400
        self.body = body


def groq_tool_use_failed(failed_generation):
    """
    The exact shape Groq returns when the model writes prose instead
    of calling the forced tool:

      Error code: 400 - {'error': {'message': 'Tool choice is required,
      but model did not call a tool', 'type': 'invalid_request_error',
      'code': 'tool_use_failed', 'failed_generation': '...'}}
    """

    message = (
        "Error code: 400 - {'error': {'message': 'Tool choice is "
        "required, but model did not call a tool', "
        "'type': 'invalid_request_error', 'code': 'tool_use_failed', "
        "'failed_generation': \"<GEN>\"}}"
    ).replace("<GEN>", failed_generation.replace('"', "'"))

    body = {
        "error": {
            "message": "Tool choice is required, but model did not "
                       "call a tool",
            "type": "invalid_request_error",
            "code": "tool_use_failed",
            "failed_generation": failed_generation,
        }
    }

    return FakeGroqError(message, body)


# ============================================================
# 1. DETECTION
# ============================================================

print("\n[1] is_structured_output_failure")

check(
    "detects body dict tool_use_failed",
    is_structured_output_failure(
        groq_tool_use_failed("whatever")
    ),
)

check(
    "detects string-only tool_use_failed",
    is_structured_output_failure(
        RuntimeError(
            "Error code: 400 - {'error': {'code': 'tool_use_failed'}}"
        )
    ),
)

plain = ValueError("boom")

check(
    "ignores unrelated errors",
    not is_structured_output_failure(plain),
)


# ============================================================
# 2. EXTRACTION
# ============================================================

print("\n[2] _extract_generation")

check(
    "extracts from body.error.failed_generation",
    _extract_generation(
        groq_tool_use_failed("hello generation")
    ) == "hello generation",
)

check(
    "extracts via regex from stringified error",
    _extract_generation(
        RuntimeError(
            "Error code: 400 - {'error': {'code': 'tool_use_failed', "
            "'failed_generation': 'regex rescue'}}"
        )
    ) == "regex rescue",
)

check(
    "returns None for unrelated errors",
    _extract_generation(plain) is None,
)

# ============================================================
# 3. SALVAGE - the three production shapes
# ============================================================

print("\n[3] salvage")

# Shape 1: pure JSON (CEO planner case)
err_pure = groq_tool_use_failed(
    '{"research": true, "marketing": true, "finance": true, '
    '"coding": true, "hr": false, "sales": false, '
    '"customer_support": false}'
)

plan = salvage(ExecutionPlan, err_pure)

check(
    "pure JSON payload salvaged to ExecutionPlan",
    plan is not None and plan.research is True and plan.hr is False,
)

# Shape 2: markdown-fenced JSON
err_fenced = groq_tool_use_failed(
    'Here is my plan:\n```json\n'
    '{"research": true, "marketing": true, "finance": true, '
    '"coding": true, "hr": false, "sales": false, '
    '"customer_support": false}\n'
    '```\nThanks!'
)

plan2 = salvage(ExecutionPlan, err_fenced)

check(
    "markdown-fenced JSON salvaged",
    plan2 is not None and plan2.research is True,
)

# Partial JSON now salvages too - missing required fields are filled
# from the caller's `fields` template, then generic defaults.
plan3 = salvage(
    ExecutionPlan,
    groq_tool_use_failed('{"research": true}'),
    fields={"marketing": True},
)

check(
    "partial JSON salvaged with fields filler",
    plan3 is not None
    and plan3.research is True
    and plan3.marketing is True
    and plan3.hr is False,
)

# Shape 3: free-form markdown report (research agent crash)
err_md = groq_tool_use_failed(
    "# Market Report\n\nThe mobile app market is growing fast.\n\n"
    "## Opportunities\n- Big opportunity\n"
)

report = salvage(ResearchOutput, err_md)

check(
    "free-form markdown salvaged into market_overview",
    report is not None and "Market Report" in report.market_overview,
)

# Garbage generation -> nothing recoverable
err_garbage = groq_tool_use_failed("no json here at all")

check(
    "garbage generation returns None",
    salvage(ExecutionPlan, err_garbage) is None,
)

# Unrelated error -> None
check(
    "unrelated error returns None",
    salvage(ExecutionPlan, plain) is None,
)

# ============================================================
# 3b. FENCED-JSON PROXY FAILURES (no Groq wrapper involved)
# ============================================================

print("\n[3b] fenced-JSON proxy failures")


def fenced_validation_error(raw):
    """
    The exact ValidationError the OpenAI SDK's parse raises when the
    model wraps the payload in ```json fences (message.content starts
    with '```json' instead of '{').
    """

    try:
        ExecutionPlan.model_validate_json(raw)

    except ValidationError as caught:
        return caught

    raise AssertionError("expected a ValidationError")


FENCED_PLAN = (
    '```json\n{\n  "research": true,\n  "marketing": true,\n'
    '  "finance": true,\n  "coding": true,\n  "hr": false,\n'
    '  "sales": false,\n  "customer_support": false,\n'
    '  "final_summary": "Launch a full-stack ecommerce platform."\n}\n```'
)


check(
    "detects fenced JSON pydantic parse error",
    is_pydantic_json_error(fenced_validation_error(FENCED_PLAN)),
)

try:
    ExecutionPlan.model_validate({})

except ValidationError as caught:
    missing_error = caught

check(
    "ignores non-JSON pydantic validation errors",
    not is_pydantic_json_error(missing_error),
)

check(
    "fenced JSON pydantic error carries raw input",
    _raw_input_from_pydantic_error(
        fenced_validation_error(FENCED_PLAN)
    ) == FENCED_PLAN,
)

plan4 = salvage(
    ExecutionPlan,
    fenced_validation_error(FENCED_PLAN),
)

check(
    "fenced JSON from pydantic ValidationError salvaged",
    plan4 is not None
    and plan4.research is True
    and plan4.sales is False,
)

# ============================================================
# 3c. _strip_json_wrapping
# ============================================================

print("\n[3c] _strip_json_wrapping")

check(
    "strips ```json fences",
    _strip_json_wrapping('```json\n{"a": 1}\n```') == '{"a": 1}',
)

check(
    "strips bare ``` fences",
    _strip_json_wrapping('```\n{"a": 1}\n```') == '{"a": 1}',
)

check(
    "slices JSON out of surrounding prose",
    _strip_json_wrapping('Sure! {"a": 1} hope that helps') == '{"a": 1}',
)

check(
    "leaves pure JSON untouched",
    _strip_json_wrapping('{"a": 1}') == '{"a": 1}',
)

# ============================================================
# 3d. NESTED WRAPPER PAYLOADS (GLM "departments" shape)
# ============================================================

print("\n[3d] nested wrapper payloads")

# The exact payload glm-5.3-flash returned live for "I want to create
# a clothing brand": fenced, fields grouped under "departments",
# legacy department set only (no hr / sales / customer_support).
LIVE_FENCED_DEPARTMENTS = (
    '```json\n{\n  "departments": {\n    "research": true,\n'
    '    "marketing": true,\n    "finance": true,\n    "coding": false\n'
    '  },\n  "reasoning": "Creating a clothing brand is a business '
    'venture requiring market analysis, branding and financial '
    'planning. No software development was requested, so coding is '
    'not needed."\n}\n```'
)

plan5 = salvage(
    ExecutionPlan,
    fenced_validation_error(LIVE_FENCED_DEPARTMENTS),
)

check(
    "live nested departments payload salvaged",
    plan5 is not None
    and plan5.research is True
    and plan5.marketing is True
    and plan5.finance is True
    and plan5.coding is False
    and plan5.hr is False
    and plan5.sales is False
    and plan5.customer_support is False,
)

# Top-level keys must win over hoisted nested ones.
plan6 = salvage(
    ExecutionPlan,
    groq_tool_use_failed(
        '{"coding": true, "departments": {"coding": false, "research": true}}'
    ),
)

check(
    "top-level keys win over nested wrappers",
    plan6 is not None
    and plan6.coding is True
    and plan6.research is True,
)

# Wrappers nested two levels deep still resolve.
plan7 = salvage(
    ExecutionPlan,
    groq_tool_use_failed(
        '{"plan": {"departments": {"marketing": true}}}'
    ),
)

check(
    "deeply nested wrapper hoisted",
    plan7 is not None and plan7.marketing is True,
)

# The exact payload glm-5.3-flash returned live for "I want to create
# a clothing brand" (second observed shape): fenced, enabled fields as
# a NAME LIST under "departments" instead of a bool dict.
LIVE_FENCED_DEPARTMENT_LIST = (
    '```json\n{\n  "departments": ["research", "marketing", "finance"],\n'
    '  "reasoning": "Creating a clothing brand is a business venture '
    'requiring market research on the fashion industry and competitors, '
    'branding and marketing strategy development, and financial planning '
    'for costs and revenue models. No coding/tech development was '
    'requested."\n}\n```'
)

plan8 = salvage(
    ExecutionPlan,
    fenced_validation_error(LIVE_FENCED_DEPARTMENT_LIST),
)

check(
    "live departments-as-list payload salvaged",
    plan8 is not None
    and plan8.research is True
    and plan8.marketing is True
    and plan8.finance is True
    and plan8.coding is False
    and plan8.hr is False
    and plan8.sales is False
    and plan8.customer_support is False,
)

# Name lists must never touch non-bool fields (a str field named in a
# list is not "enabled" content - it stays garbage and returns None).
check(
    "name lists never touch non-bool fields",
    salvage(
        ResearchOutput,
        groq_tool_use_failed('{"sections": ["market_overview"]}'),
    ) is None,
)

# Nested JSON with no schema field names anywhere stays garbage.
check(
    "nested JSON without schema fields returns None",
    salvage(
        ExecutionPlan,
        groq_tool_use_failed('{"weather": {"temperature": 30}}'),
    ) is None,
)


# ============================================================
# 4. FALLBACK MODEL
# ============================================================

print("\n[4] fallback_model")

fallback_plan = fallback_model(
    ExecutionPlan,
    {
        "research": True,
        "marketing": True,
        "finance": True,
        "coding": True,
        "hr": False,
        "sales": False,
        "customer_support": False,
        "not_a_real_field": True,   # must be filtered out
    },
)

check(
    "fallback builds valid ExecutionPlan and filters junk keys",
    fallback_plan is not None
    and fallback_plan.research is True
    and fallback_plan.customer_support is False,
)

# Agent fallback dicts must satisfy their schemas as-is. Guarded because
# importing agent modules also pulls config / DB / service layers.
try:

    from agents.coding import CODING_FALLBACK_FIELDS
    from agents.research import RESEARCH_FALLBACK_FIELDS

except Exception as import_error:

    print(
        f"  SKIP - agent fallback dicts "
        f"(import failed: {import_error})"
    )

else:

    check(
        "CODING_FALLBACK_FIELDS builds a valid CodingOutput",
        fallback_model(CodingOutput, CODING_FALLBACK_FIELDS) is not None,
    )

    check(
        "RESEARCH_FALLBACK_FIELDS builds a valid ResearchOutput",
        fallback_model(ResearchOutput, RESEARCH_FALLBACK_FIELDS) is not None,
    )

# ============================================================
# 5. INVOKE LADDER
# ============================================================

print("\n[5] invoke_structured")


class FlakyChain:

    def __init__(self, errors, final=None):

        self.errors = list(errors)
        self.final = final
        self.calls = 0

    def invoke(self, inputs):

        raise_first = self.errors.pop(0) if self.errors else None

        self.calls += 1

        if raise_first:
            raise raise_first

        return self.final


# 5a. success first try - no recovery needed
ok_chain = FlakyChain([], final="DIRECT")

check(
    "success path returns chain output untouched",
    invoke_structured(
        ok_chain,
        ExecutionPlan,
        {},
        fields={"research": True},
    ) == "DIRECT"
    and ok_chain.calls == 1,
)

# 5b. Groq 400 then success on retry
retry_chain = FlakyChain(
    [groq_tool_use_failed("junk")],
    final="RETRIED",
)

check(
    "retries once on Groq 400 then succeeds",
    invoke_structured(
        retry_chain,
        ExecutionPlan,
        {},
        fields={"research": True},
    ) == "RETRIED"
    and retry_chain.calls == 2,
)

# 5c. salvage path - both attempts 400 with recoverable JSON
salvage_chain = FlakyChain(
    [
        groq_tool_use_failed('{"research": true}'),
        groq_tool_use_failed('{"research": true, "marketing": true}'),
    ]
)

salvaged = invoke_structured(
    salvage_chain,
    ExecutionPlan,
    {},
    fields={"research": False},
)

check(
    "salvages failed_generation after exhausted retries",
    salvaged is not None
    and salvaged.research is True
    and salvage_chain.calls == 2,
)

# 5d. hardcoded fallback path - 400 with unrecoverable generation
fallback_chain = FlakyChain(
    [
        groq_tool_use_failed("just prose, no json"),
        groq_tool_use_failed("more prose, still no json"),
    ]
)

hard = invoke_structured(
    fallback_chain,
    ExecutionPlan,
    {},
    fields={"research": True, "marketing": True, "hr": False},
)

check(
    "falls back to hardcoded model when salvage fails",
    hard is not None and hard.research is True and hard.hr is False,
)

# 5e. non-structured error re-raised immediately
boom_chain = FlakyChain([ValueError("boom")])

try:

    invoke_structured(
        boom_chain,
        ExecutionPlan,
        {},
        fields={"research": True},
    )

    raised = False

except ValueError:

    raised = True

check(
    "unrelated errors re-raised immediately (no retry)",
    raised and boom_chain.calls == 1,
)

# 5f. coding schema salvage with nested ProjectFile coercion
coding_err = groq_tool_use_failed(
    '{"project_name": "Demo", "files": [{"path": "frontend/index.html",'
    ' "purpose": "entry", "description": "entry page",'
    ' "category": "frontend"}]}'
)

coding = salvage(CodingOutput, coding_err)

check(
    "coding salvage validates nested ProjectFile",
    coding is not None
    and coding.project_name == "Demo"
    and coding.files[0].path == "frontend/index.html",
)

# 5g. research markdown report through the full ladder
md_chain = FlakyChain(
    [
        groq_tool_use_failed("# Full Report\n\nLive prose about mobile."),
        groq_tool_use_failed("# Full Report 2\n\nStill prose."),
    ]
)

md_report = invoke_structured(
    md_chain,
    ResearchOutput,
    {},
    fields={
        "market_overview": "fallback overview",
        "target_audience": ["aud"],
    },
)

check(
    "research markdown recovered through full ladder",
    md_report is not None
    and "Full Report" in md_report.market_overview,
)


# 5h. fenced-JSON ladder - proxy wraps the payload, no Groq 400 at all
pyd_chain = FlakyChain(
    [fenced_validation_error(FENCED_PLAN)],
    final="DIRECT",
)

check(
    "retries once on pydantic json error then succeeds",
    invoke_structured(
        pyd_chain,
        ExecutionPlan,
        {},
        fields={"research": True},
    ) == "DIRECT"
    and pyd_chain.calls == 2,
)

fenced_chain = FlakyChain(
    [
        fenced_validation_error(FENCED_PLAN),
        fenced_validation_error(FENCED_PLAN),
    ]
)

fenced_plan = invoke_structured(
    fenced_chain,
    ExecutionPlan,
    {},
    fields={"research": False},
)

check(
    "salvages raw content from pydantic json error",
    fenced_plan is not None
    and fenced_plan.research is True
    and fenced_plan.customer_support is False
    and fenced_chain.calls == 2,
)


# ============================================================
# 6. SCHEMA BINDING (llm.structured_llm's request side)
# ============================================================

print("\n[6] json_schema_response_format")

PLAN_RF = json_schema_response_format(ExecutionPlan)
PLAN_BODY = PLAN_RF["json_schema"]

check(
    "binds json_schema response format type",
    PLAN_RF["type"] == "json_schema",
)

check(
    "names the schema after the model class",
    PLAN_BODY["name"] == "ExecutionPlan",
)

check(
    "strict defaults to True",
    PLAN_BODY["strict"] is True,
)

check(
    "strict=False is honoured",
    json_schema_response_format(
        ExecutionPlan, strict=False
    )["json_schema"]["strict"] is False,
)

check(
    "strict mode requires every field",
    set(PLAN_BODY["schema"]["required"]) == set(ExecutionPlan.model_fields),
)

check(
    "strict mode forbids extra keys",
    PLAN_BODY["schema"]["additionalProperties"] is False,
)

# A schema with a nested model must ship as ONE self-contained schema:
# OpenAI rejects $ref, so the converter has to inline ProjectFile - and
# fields with defaults (files=[]) must still be required in strict mode.
CODING_RF = str(json_schema_response_format(CodingOutput))

check(
    "nested models are inlined, no dangling $ref/$defs",
    "$ref" not in CODING_RF and "$defs" not in CODING_RF
    and "category" in CODING_RF,
)

check(
    "optional-with-default fields are still required",
    "files" in json_schema_response_format(CodingOutput)["json_schema"]
    ["schema"]["required"],
)

check(
    "field descriptions survive the conversion",
    json_schema_response_format(ResearchOutput)["json_schema"]["schema"]
    ["properties"]["market_overview"]["description"]
    == "A short overview of the market.",
)

# ============================================================
# 7. OUTPUT PARSING (the fence-tolerant replacement for the SDK's)
# ============================================================

print("\n[7] parse_structured_message")


class FakeMessage:
    """Just the part of an AIMessage the parser reads."""

    def __init__(self, content):
        self.content = content


PLAIN_PLAN = (
    '{"research": true, "marketing": false, "finance": true, '
    '"coding": false, "hr": false, "sales": false, '
    '"customer_support": false}'
)


def parse_plan(content):
    return parse_structured_message(FakeMessage(content), ExecutionPlan)


clean = parse_plan(PLAIN_PLAN)

check(
    "clean JSON parses straight through",
    clean.research is True and clean.finance is True and clean.hr is False,
)

# The reason this parser exists: the proxy fences the payload, and it now
# costs no retry, no warning and no fallback round-trip.
fenced = parse_plan(FENCED_PLAN)

check(
    "```json fenced payload parses on the first attempt",
    fenced.research is True and fenced.customer_support is False,
)

prose = parse_plan(
    'Sure! Here you go:\n' + PLAIN_PLAN + '\nHope that helps.'
)

check(
    "prose-wrapped payload parses",
    prose.research is True and prose.sales is False,
)

blocked = parse_structured_message(
    FakeMessage([{"type": "text", "text": PLAIN_PLAN}]),
    ExecutionPlan,
)

check(
    "content-block replies parse",
    blocked.marketing is False,
)


def parse_error(content):
    """The ValidationError parse_structured_message raises, or None."""

    try:
        parse_plan(content)

    except ValidationError as caught:
        return caught

    return None


# Anything genuinely broken must still raise the exact error shape
# invoke_structured() understands, carrying the model's text so the
# salvage step can read it back out.
for label, content in (
    ("empty reply", ""),
    ("prose refusal", "I can't decide which departments to run."),
    ("truncated JSON", '{"research": true, "mar'),
):
    check(
        f"{label} raises a recoverable json error",
        is_pydantic_json_error(parse_error(content)),
    )

wrapper_error = parse_error(LIVE_FENCED_DEPARTMENTS)

# Wrapper-shaped payloads are not valid schemas, so they still fall to the
# ladder - which hoists "departments" back out and lands on a real plan.
recovered = salvage(ExecutionPlan, wrapper_error) if wrapper_error else None

check(
    "failed parse still feeds the retry/salvage ladder",
    is_pydantic_json_error(wrapper_error)
    and recovered is not None
    and recovered.research is True
    and recovered.coding is False,
)

partial_error = parse_error('{"research": true}')

# A well-formed body with missing fields is NOT a json error, so it stays
# a hard failure - exactly the behaviour before the parse moved here.
check(
    "valid-JSON-with-missing-fields stays a hard error",
    isinstance(partial_error, ValidationError)
    and not is_pydantic_json_error(partial_error),
)

# ============================================================
# 8. AGENT WIRING (no network; the API key is never sent)
# ============================================================

print("\n[8] structured_llm wiring")

try:
    from llm import structured_llm

    research_chain = structured_llm(ResearchOutput)

except Exception as wiring_error:

    print(f"  SKIP - could not build the chain ({wiring_error})")

else:

    # `PROMPT | structured_llm(X)` makes the chain's first step the bound
    # model and its last step the parser, so the request shape agents send
    # is checked right here.
    bound = research_chain.steps[0]
    bound_rf = bound.kwargs.get("response_format")

    check(
        "binds a dict response format, not the model class",
        isinstance(bound_rf, dict)
        and bound_rf["type"] == "json_schema"
        and bound_rf["json_schema"]["name"] == "ResearchOutput",
    )

    # Tool calling is what used to trigger Groq's 400 tool_use_failed; a
    # dict response format keeps the SDK from parsing the content itself.
    check(
        "binds no tools, tool_choice or functions",
        not any(
            key in bound.kwargs
            for key in ("tools", "tool_choice", "functions", "function_call")
        ),
    )

    check(
        "chain terminates in a parser that yields the schema",
        parse_structured_message(
            FakeMessage(
                '{"market_overview": "m", "target_audience": [], '
                '"competitors": [], "key_features": [], '
                '"opportunities": [], "risks": []}'
            ),
            ResearchOutput,
        ).market_overview == "m",
    )

    check(
        "strict=False is wired through to the request",
        structured_llm(
            ExecutionPlan, strict=False
        ).steps[0].kwargs["response_format"]["json_schema"]["strict"] is False,
    )

    # ============================================================
    # 9. END-TO-END OVER A FAKED TRANSPORT (still zero network)
    # ============================================================

    print("\n[9] structured_llm against a fake proxy")

    # MockTransport short-circuits httpx inside the OpenAI SDK, so the real
    # bind -> request -> parse path runs while the proxy is a canned answer
    # that reproduces the live BAI failure: JSON wrapped in ``` fences.
    import json

    import httpx
    from langchain_openai import ChatOpenAI

    REQUESTS = []

    def fake_proxy(request):

        REQUESTS.append(json.loads(request.content))

        return httpx.Response(
            200,
            headers={"content-type": "application/json"},
            json={
                "id": "chatcmpl-fake",
                "object": "chat.completion",
                "created": 1,
                "model": "glm-5.3-flash",
                "choices": [{
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": "```json\n" + PLAIN_PLAN + "\n```",
                    },
                    "finish_reason": "stop",
                }],
                "usage": {"prompt_tokens": 5, "completion_tokens": 7,
                          "total_tokens": 12},
            },
        )

    proxy_llm = ChatOpenAI(
        model="glm-5.3-flash",
        temperature=0,
        api_key="not-a-real-key",
        base_url="https://api.b.ai/v1",
        http_client=httpx.Client(
            transport=httpx.MockTransport(fake_proxy)
        ),
    )

    import llm as llm_module

    original_llm = llm_module.llm
    llm_module.llm = proxy_llm

    try:
        e2e_plan = structured_llm(ExecutionPlan).invoke("plan it")

    finally:
        llm_module.llm = original_llm

    check(
        "fenced reply parses with no retry and no fallback",
        len(REQUESTS) == 1
        and isinstance(e2e_plan, ExecutionPlan)
        and e2e_plan.research is True
        and e2e_plan.customer_support is False,
    )

    sent = REQUESTS[0]

    check(
        "request carries the json_schema response format",
        sent.get("response_format", {}).get("type") == "json_schema"
        and sent["response_format"]["json_schema"]["strict"] is True,
    )

    check(
        "request carries no tools and no tool_choice",
        "tools" not in sent
        and "tool_choice" not in sent
        and "function_call" not in sent,
    )

    # LangChain metadata must not ride along into the API body.
    check(
        "no langchain-only kwargs leak into the request body",
        not any(
            key.startswith("ls_") or key == "structured_output_format"
            for key in sent
        ),
    )


# ============================================================
# 10. END TO END, OFFLINE (a recording stand-in for the BAI endpoint)
# ============================================================

print("\n[10] structured_llm chain, end to end")

try:

    from langchain_core.language_models.fake_chat_models import (
        FakeListChatModel,
    )

    from agents.ceo import PLANNER_FALLBACK_FIELDS

    import llm as llm_module

except Exception as import_error:

    print(f"  SKIP - llm module ({type(import_error).__name__}: {import_error})")

else:

    REQUESTS = []

    class RecordingChatModel(FakeListChatModel):
        """Replies with a scripted body and records the request kwargs."""

        def _generate(self, messages, stop=None, run_manager=None, **kwargs):

            REQUESTS.append({**kwargs, "messages": messages})

            return super()._generate(
                messages, stop=stop, run_manager=run_manager, **kwargs
            )

    def run_chain(schema, content, prompt_inputs, fields):
        """Drive PROMPT | structured_llm(schema) through the real ladder."""

        from prompts.ceo_planner import CEO_PLANNER_PROMPT

        original = llm_module.llm

        llm_module.llm = RecordingChatModel(responses=[content])

        try:

            chain = CEO_PLANNER_PROMPT | llm_module.structured_llm(schema)

            return invoke_structured(
                chain, schema, prompt_inputs, fields=fields, label="test"
            )

        finally:
            llm_module.llm = original

    PLANNER_INPUTS = {"user_goal": "Build a platform for freelancers."}

    REQUESTS.clear()
    live_plan = run_chain(
        ExecutionPlan, FENCED_PLAN, PLANNER_INPUTS, PLANNER_FALLBACK_FIELDS
    )

    wire = REQUESTS[0] if REQUESTS else {}

    check(
        "the wire request is json_schema, not a tool call",
        wire.get("response_format", {}).get("type") == "json_schema"
        and "tools" not in wire
        and "tool_choice" not in wire,
    )

    check(
        "the prompt reached the model as rendered messages",
        len(wire.get("messages") or ()) == 2
        and "freelancers" in str(wire["messages"][1].content),
    )

    check(
        "a fenced reply survives the whole chain on one attempt",
        len(REQUESTS) == 1 and live_plan.research is True,
    )

    REQUESTS.clear()
    wrapper_plan = run_chain(
        ExecutionPlan,
        LIVE_FENCED_DEPARTMENTS,
        PLANNER_INPUTS,
        PLANNER_FALLBACK_FIELDS,
    )

    check(
        "an unrecoverable reply still costs a retry then a salvage",
        len(REQUESTS) == 2
        and wrapper_plan.research is True
        and wrapper_plan.coding is False,
    )

    REQUESTS.clear()
    garbage_plan = run_chain(
        ExecutionPlan,
        "Sorry, I cannot help with that.",
        PLANNER_INPUTS,
        PLANNER_FALLBACK_FIELDS,
    )

    check(
        "a refusal falls all the way to the hardcoded plan",
        len(REQUESTS) == 2 and garbage_plan == fallback_model(
            ExecutionPlan, PLANNER_FALLBACK_FIELDS
        ),
    )

# ============================================================
# 11. RATE LIMITS (the 429 that used to kill projects)
# ============================================================

print("\n[11] rate-limit handling")

import httpx
import openai

import llm_fallback as fallback_module

try:
    import groq

except Exception:
    groq = None

try:
    from langchain_openai.chat_models.base import OpenAIRateLimitError

except Exception:
    OpenAIRateLimitError = None


def rate_limited(headers=None, message="Error code: 429"):
    """The exact exception the app raises on a 429 through the OpenAI client."""

    request = httpx.Request("POST", "https://api.b.ai/v1/chat/completions")

    response = httpx.Response(
        429,
        headers=dict(headers or {}),
        request=request,
    )

    if OpenAIRateLimitError is None:
        return openai.RateLimitError(message, response=response, body=None)

    return OpenAIRateLimitError(message, response=response, body=None)


limit_error = rate_limited()

check(
    "recognises the production 429 (OpenAIRateLimitError)",
    is_rate_limit_error(limit_error),
)

check(
    "recognises a bare openai.RateLimitError",
    is_rate_limit_error(
        openai.RateLimitError(
            "Error code: 429",
            response=httpx.Response(
                429,
                request=httpx.Request(
                    "POST", "https://api.b.ai/v1/chat/completions"
                ),
            ),
            body=None,
        )
    ),
)

check(
    "recognises a 429 that only says so in its text",
    is_rate_limit_error(RuntimeError("Error code: 429 - too many requests")),
)

if groq is not None:

    # The regression in one line: the old handler caught the Groq SDK's
    # class, which shares no base with the OpenAI one, so it never matched.
    check(
        "the old `except groq.RateLimitError` could never match this error",
        not isinstance(limit_error, groq.RateLimitError)
        and is_rate_limit_error(limit_error),
    )

check(
    "a 400 tool_use_failed is NOT treated as a rate limit",
    not is_rate_limit_error(groq_tool_use_failed("prose")),
)

check(
    "unrelated errors are NOT treated as rate limits",
    not is_rate_limit_error(ValueError("boom")),
)

check(
    "honours the server's Retry-After header",
    retry_after_seconds(rate_limited({"retry-after": "7"})) == 7.0,
)

check(
    "never waits longer than the ceiling",
    retry_after_seconds(
        rate_limited({"retry-after": str(int(RATE_LIMIT_MAX_WAIT * 30))})
    ) == RATE_LIMIT_MAX_WAIT,
)

check(
    "an HTTP-date header is ignored rather than crashing",
    retry_after_seconds(
        rate_limited({"retry-after": "Wed, 21 Oct 2026 07:00:00 GMT"})
    ) is None,
)

check(
    "no header means no instruction",
    retry_after_seconds(rate_limited()) is None,
)

check(
    "backoff schedule is used when the server says nothing",
    rate_limit_wait(0) == float(RATE_LIMIT_DELAYS[0])
    and rate_limit_wait(1) == float(RATE_LIMIT_DELAYS[1]),
)

check(
    "schedule repeats its last entry once exhausted",
    rate_limit_wait(len(RATE_LIMIT_DELAYS) + 5)
    == float(RATE_LIMIT_DELAYS[-1]),
)

check(
    "the server's instruction wins over the schedule",
    rate_limit_wait(0, rate_limited({"retry-after": "11"})) == 11.0,
)


class ScriptedChain:
    """chain.invoke() stand-in: raises/returns one item per attempt."""

    def __init__(self, outcomes):
        self.outcomes = list(outcomes)
        self.calls = 0

    def invoke(self, _inputs):
        self.calls += 1

        outcome = self.outcomes[min(self.calls - 1, len(self.outcomes) - 1)]

        if isinstance(outcome, Exception):
            raise outcome

        return outcome


PLAN_FIELDS = {
    "research": True,
    "marketing": False,
    "finance": False,
    "coding": False,
    "hr": False,
    "sales": False,
    "customer_support": False,
}

# No test here may actually sleep, and no real API call is made either.
SLEPT = []
_original_sleep = fallback_module.time.sleep

fallback_module.time.sleep = lambda seconds: SLEPT.append(seconds)

try:

    recovered_chain = ScriptedChain(
        [rate_limited(), parse_structured_message(
            FakeMessage(PLAIN_PLAN), ExecutionPlan
        )]
    )

    after_limit = invoke_structured(
        recovered_chain,
        ExecutionPlan,
        {},
        fields=PLAN_FIELDS,
        retries=2,
        label="429-test",
    )

    check(
        "a 429 is waited out and retried instead of failing the project",
        after_limit.research is True
        and recovered_chain.calls == 2
        and SLEPT == [float(RATE_LIMIT_DELAYS[0])],
    )

    SLEPT.clear()

    exhausted_chain = ScriptedChain([rate_limited()])

    exhausted = invoke_structured(
        exhausted_chain,
        ExecutionPlan,
        {},
        fields=PLAN_FIELDS,
        retries=2,
        label="429-exhausted",
    )

    check(
        "a 429 that never clears falls to the hardcoded plan, not a crash",
        isinstance(exhausted, ExecutionPlan)
        and exhausted_chain.calls == 3
        and len(SLEPT) == 2
        and exhausted == fallback_model(ExecutionPlan, PLAN_FIELDS),
    )

    SLEPT.clear()

    hard_chain = ScriptedChain([ValueError("connection reset")])

    try:
        invoke_structured(
            hard_chain,
            ExecutionPlan,
            {},
            fields=PLAN_FIELDS,
            retries=2,
            label="non-429",
        )
        hard_raised = False

    except ValueError:
        hard_raised = True

    check(
        "an unknown error still re-raises at once (no sleeping, no fallback)",
        hard_raised and hard_chain.calls == 1 and SLEPT == [],
    )

finally:
    fallback_module.time.sleep = _original_sleep


# ============================================================
# 12. TRANSIENT TRANSPORT FAILURES (the stalled-request class)
# ============================================================

print("\n[12] transient failures (timeouts, dropped connections, 5xx)")

from llm_fallback import (
    is_transient_error,
    transient_wait,
    TRANSIENT_DELAYS,
)

TIMEOUT_REQUEST = httpx.Request("POST", "https://api.b.ai/v1/chat/completions")


def api_status_error(status):
    """An APIStatusError-shaped failure carrying the given status code."""

    return openai.APIStatusError(
        f"Error code: {status}",
        response=httpx.Response(status, request=TIMEOUT_REQUEST),
        body=None,
    )


try:
    from langchain_openai.chat_models.base import OpenAITimeoutError

except Exception:
    OpenAITimeoutError = None

check(
    "an openai timeout is transient",
    is_transient_error(openai.APITimeoutError(request=TIMEOUT_REQUEST)),
)

if OpenAITimeoutError is not None:

    # The class the app actually raises. Its message is "Request timed out.",
    # which does not contain the word "timeout" - the reason this cannot be a
    # marker match the way the 429 detector is.
    production_timeout = OpenAITimeoutError(request=TIMEOUT_REQUEST)

    check(
        "the production timeout (OpenAITimeoutError) is transient",
        is_transient_error(production_timeout)
        and "timeout" not in str(production_timeout).lower(),
    )

check(
    "a dropped connection is transient",
    is_transient_error(openai.APIConnectionError(request=TIMEOUT_REQUEST)),
)

check(
    "a bare httpx read timeout is transient",
    is_transient_error(httpx.ReadTimeout("timed out", request=TIMEOUT_REQUEST)),
)

for status in (500, 502, 503, 504):

    check(
        f"a {status} is transient (the SDK used to retry these silently)",
        is_transient_error(api_status_error(status)),
    )

check(
    "a 429 is NOT double-classified as transient (the 429 branch owns it)",
    not is_transient_error(rate_limited()),
)

for status in (400, 401, 404, 422):

    check(
        f"a {status} is not transient - never sleep on a bad request",
        not is_transient_error(api_status_error(status)),
    )

check(
    "a pydantic parse failure is not transient",
    not is_transient_error(parse_error("{\"research\": true}") or ValueError()),
)

check(
    "an unrelated error is not transient",
    not is_transient_error(ValueError("boom")),
)

check(
    "transient backoff is short, fixed and repeats at the end",
    transient_wait(0) == float(TRANSIENT_DELAYS[0])
    and transient_wait(len(TRANSIENT_DELAYS) + 4) == float(TRANSIENT_DELAYS[-1]),
)

# The ladder itself: a timeout must be retried, then fall back - it must never
# be allowed to mark a project failed while attempts remain.
#
# Section 11 restores the real time.sleep in its finally, so the stub has to be
# re-installed here - otherwise these two checks sleep 3 and 11 seconds for
# real and assert against an empty SLEPT list.
SLEPT.clear()

ladder_sleep = fallback_module.time.sleep
fallback_module.time.sleep = lambda seconds: SLEPT.append(seconds)

try:

    timed_out_chain = ScriptedChain(
        [
            openai.APITimeoutError(request=TIMEOUT_REQUEST),
            parse_structured_message(FakeMessage(PLAIN_PLAN), ExecutionPlan),
        ]
    )

    after_timeout = invoke_structured(
        timed_out_chain,
        ExecutionPlan,
        {},
        fields=PLAN_FIELDS,
        retries=2,
        label="timeout-test",
    )

    check(
        "a timeout is retried and the call still succeeds",
        after_timeout.research is True
        and timed_out_chain.calls == 2
        and SLEPT == [float(TRANSIENT_DELAYS[0])],
    )

    SLEPT.clear()

    dead_chain = ScriptedChain(
        [openai.APIConnectionError(request=TIMEOUT_REQUEST)]
    )

    dead_result = invoke_structured(
        dead_chain,
        ExecutionPlan,
        {},
        fields=PLAN_FIELDS,
        retries=2,
        label="timeout-exhausted",
    )

    check(
        "an endpoint that never answers falls to the hardcoded plan, not a crash",
        isinstance(dead_result, ExecutionPlan)
        and dead_chain.calls == 3
        and len(SLEPT) == 2
        and dead_result == fallback_model(ExecutionPlan, PLAN_FIELDS),
    )

    # A timeout must not outrank a 429: the rate-limit branch is checked first
    # so Retry-After keeps being honoured when the server sends both shapes.
    SLEPT.clear()

    mixed_chain = ScriptedChain(
        [
            rate_limited({"retry-after": "9"}),
            parse_structured_message(FakeMessage(PLAIN_PLAN), ExecutionPlan),
        ]
    )

    invoke_structured(
        mixed_chain,
        ExecutionPlan,
        {},
        fields=PLAN_FIELDS,
        retries=2,
        label="429-wins",
    )

    check(
        "a 429 still uses the server's Retry-After, not the transient schedule",
        SLEPT == [9.0],
    )

finally:
    fallback_module.time.sleep = ladder_sleep
    SLEPT.clear()


# ============================================================
# 13. REQUEST BUDGET (llm.py)
# ============================================================

print("\n[13] request budget")

try:
    import llm as budget_module

except Exception as budget_import_error:

    print(f"  SKIP - llm module ({budget_import_error})")

else:

    from langchain_openai import ChatOpenAI as BudgetChatOpenAI

    client_timeout = budget_module.llm.request_timeout

    check(
        "the shared client carries a real read deadline",
        getattr(client_timeout, "read", None)
        == budget_module.LLM_TIMEOUT_SECONDS,
    )

    check(
        "connecting is capped far below the read deadline",
        getattr(client_timeout, "connect", None)
        == budget_module.LLM_CONNECT_TIMEOUT_SECONDS
        < budget_module.LLM_TIMEOUT_SECONDS,
    )

    check(
        "the SDK's private retry ladder is switched off",
        budget_module.llm.max_retries == 0
        and budget_module.llm.root_client.max_retries == 0,
    )

    check(
        "a per-call budget can be bound onto a chain",
        budget_module.structured_llm(ExecutionPlan, timeout=120)
        .steps[0].kwargs.get("timeout") == 120,
    )

    check(
        "no per-call budget means the client default applies",
        "timeout" not in budget_module.structured_llm(
            ExecutionPlan
        ).steps[0].kwargs,
    )

    # The same claim made on the wire rather than on the object: the SDK
    # publishes the read timeout it will actually enforce as a request header,
    # so this proves the value survives langchain -> SDK -> httpx instead of
    # being quietly dropped (which is exactly how the old infinite hang
    # happened while a default appeared to be configured).
    HEADERS = []

    def read_timeout_back(request):

        HEADERS.append(dict(request.headers))

        return httpx.Response(
            200,
            headers={"content-type": "application/json"},
            json={
                "id": "chatcmpl-budget",
                "object": "chat.completion",
                "created": 1,
                "model": "glm-5.3-flash",
                "choices": [{
                    "index": 0,
                    "message": {"role": "assistant", "content": PLAIN_PLAN},
                    "finish_reason": "stop",
                }],
                "usage": {
                    "prompt_tokens": 1,
                    "completion_tokens": 1,
                    "total_tokens": 2,
                },
            },
        )

    def budget_client(**extra):

        return BudgetChatOpenAI(
            model="glm-5.3-flash",
            temperature=0,
            api_key="not-a-real-key",
            base_url="https://api.b.ai/v1",
            http_client=httpx.Client(
                transport=httpx.MockTransport(read_timeout_back)
            ),
            **extra,
        )

    original_budget_llm = budget_module.llm

    try:

        HEADERS.clear()
        budget_module.llm = budget_client(
            timeout=httpx.Timeout(300.0, connect=10.0),
            max_retries=0,
        )
        budget_module.structured_llm(ExecutionPlan).invoke("plan it")
        default_header = HEADERS[-1].get("x-stainless-read-timeout")

        HEADERS.clear()
        budget_module.llm = budget_client(
            timeout=httpx.Timeout(300.0, connect=10.0),
            max_retries=0,
        )
        budget_module.structured_llm(ExecutionPlan, timeout=120).invoke(
            "plan it"
        )
        override_header = HEADERS[-1].get("x-stainless-read-timeout")

    finally:
        budget_module.llm = original_budget_llm

    check(
        "the client deadline reaches the wire",
        default_header == "300.0",
    )

    check(
        "a per-call binding overrides it on the wire",
        override_header == "120",
    )

    # The regression itself, asserted directly: what a ChatOpenAI without any
    # timeout configured resolves to is no deadline at all.
    unconfigured = BudgetChatOpenAI(
        model="glm-5.3-flash",
        api_key="not-a-real-key",
        base_url="https://api.b.ai/v1",
    )

    check(
        "an unconfigured client would have had no deadline at all",
        getattr(unconfigured.root_client._client.timeout, "read", 1) is None,
    )


# ============================================================
# 14. SPLIT CODING CONTRACT
# ============================================================

print("\n[14] coding architecture / blueprint split")

from schemas.coding import CodingArchitecture, FileBlueprint

ARCH_FIELDS = set(CodingArchitecture.model_fields)

check(
    "the architecture request no longer carries the file list",
    "files" not in ARCH_FIELDS and "architecture" in ARCH_FIELDS,
)

check(
    "CodingOutput is exactly architecture + files",
    set(CodingOutput.model_fields) == ARCH_FIELDS | {"files"},
)

ARCH_SCHEMA = json_schema_response_format(CodingArchitecture)["json_schema"][
    "schema"
]

check(
    "architecture wire schema keeps the design fields and drops files",
    "files" not in ARCH_SCHEMA["properties"]
    and "core_features" in ARCH_SCHEMA["properties"]
    and "$ref" not in str(ARCH_SCHEMA),
)

BLUEPRINT_SCHEMA = json_schema_response_format(FileBlueprint)["json_schema"][
    "schema"
]

check(
    "blueprint wire schema asks for nothing but the file list",
    list(BLUEPRINT_SCHEMA["properties"]) == ["files"]
    and BLUEPRINT_SCHEMA["required"] == ["files"],
)

check(
    "the nested ProjectFile is inlined into the blueprint schema",
    "$ref" not in str(BLUEPRINT_SCHEMA)
    and "$defs" not in str(BLUEPRINT_SCHEMA)
    and "category" in str(BLUEPRINT_SCHEMA),
)

try:

    from agents.coding import (
        CODING_ARCHITECTURE_FALLBACK_FIELDS,
        CODING_BLUEPRINT_FALLBACK_FIELDS,
        _architecture_summary,
    )
    from services.blueprint_validator import sanitize_blueprint

except Exception as coding_import_error:

    print(
        "  SKIP - coding agent module "
        f"({type(coding_import_error).__name__}: {coding_import_error})"
    )

else:

    check(
        "the architecture half falls back to a valid CodingArchitecture",
        fallback_model(
            CodingArchitecture, CODING_ARCHITECTURE_FALLBACK_FIELDS
        )
        is not None,
    )

    check(
        "the blueprint half falls back to a valid FileBlueprint",
        fallback_model(
            FileBlueprint, CODING_BLUEPRINT_FALLBACK_FIELDS
        )
        is not None,
    )

    check(
        "the two fallback dicts still rebuild the merged CodingOutput",
        fallback_model(CodingOutput, {
            **CODING_ARCHITECTURE_FALLBACK_FIELDS,
            **CODING_BLUEPRINT_FALLBACK_FIELDS,
        })
        is not None,
    )

    merged_architecture = fallback_model(
        CodingArchitecture, CODING_ARCHITECTURE_FALLBACK_FIELDS
    )
    merged_blueprint = fallback_model(
        FileBlueprint, CODING_BLUEPRINT_FALLBACK_FIELDS
    )

    merged = CodingOutput(
        **merged_architecture.model_dump(),
        files=merged_blueprint.files,
    )

    check(
        "the merge produces the shape file_generator validates",
        CodingOutput.model_validate(merged.model_dump()).files[0].path
        == "frontend/index.html"
        and merged.project_name == "AI Generated Project",
    )

    summary = _architecture_summary(merged_architecture)

    check(
        "the blueprint call is told the stack and the features to plan for",
        "JavaScript" in summary
        and "Landing page describing the product" in summary,
    )

    empty_summary = _architecture_summary(
        CodingArchitecture(
            **{
                **CODING_ARCHITECTURE_FALLBACK_FIELDS,
                "tech_stack": [],
                "frontend": [],
                "backend": [],
                "core_features": [],
                "api_endpoints": [],
                "development_steps": [],
            }
        )
    )

    check(
        "an architecture full of empty lists still renders",
        isinstance(empty_summary, str) and "(none)" in empty_summary,
    )

    # The degradation policy under test: when the blueprint never arrives, the
    # file list that replaces it must still boot.
    bootable, _ = sanitize_blueprint(
        [entry.model_dump() for entry in merged_blueprint.files]
    )

    check(
        "the fallback blueprint still yields a runnable Vite file list",
        len(bootable) > 0
        and any(
            entry["path"] == "frontend/package.json" for entry in bootable
        )
        and any(entry["path"].endswith("main.jsx") for entry in bootable),
    )


# ============================================================
# 15. RESEARCH LIST HYGIENE (the empty-report contamination)
# ============================================================

print("\n[15] research list fields")

try:

    from agents.research import (
        RESEARCH_LIST_FIELDS,
        RESEARCH_FALLBACK_FIELDS,
        _clean_items,
        _normalize_lists,
    )

except Exception as research_import_error:

    print(
        "  SKIP - research agent "
        f"({type(research_import_error).__name__}: {research_import_error})"
    )

else:

    # The shapes actually found in the database after the bad run.
    check(
        "a real array passes straight through",
        _clean_items(["Solo founders", "Agencies"])
        == ["Solo founders", "Agencies"],
    )

    check(
        "a junk list repr is emptied, not trusted",
        _clean_items("[', ']") == [] and _clean_items("[]") == [],
    )

    check(
        "a stringified real list is recovered instead of discarded",
        _clean_items("['Solo founders', 'Agencies']")
        == ["Solo founders", "Agencies"],
    )

    check(
        "punctuation-only items are dropped",
        _clean_items([", ", "'", "", "   ", "[]", "real item"])
        == ["real item"],
    )

    check(
        "a dict-shaped answer keeps its values, not its keys",
        _clean_items([{"name": "Notion", "pricing": "10"}])
        == ["Notion, 10"],
    )

    check(
        "duplicates collapse and order survives",
        _clean_items(["b", "a", "b", "c"]) == ["b", "a", "c"],
    )

    check(
        "None and empty input never raise",
        _clean_items(None) == [] and _clean_items([]) == [],
    )

    thin = {
        "market_overview": "a market",
        "target_audience": "[', ']",
        "competitors": [],
        "key_features": ["Auth", "Dashboard"],
        "opportunities": ["  "],
        "risks": ["Rising costs"],
    }

    empties = _normalize_lists(thin)

    check(
        "exactly the blanked-out fields are reported",
        sorted(empties)
        == ["competitors", "opportunities", "target_audience"],
    )

    check(
        "cleaning happens in place, so what gets stored is usable",
        thin["target_audience"] == []
        and thin["key_features"] == ["Auth", "Dashboard"]
        and thin["risks"] == ["Rising costs"],
    )

    check(
        "every list-shaped research field is covered",
        set(RESEARCH_LIST_FIELDS) == {
            "target_audience",
            "competitors",
            "key_features",
            "opportunities",
            "risks",
        },
    )

    check(
        "the fallback research payload survives its own cleaning",
        not _normalize_lists(dict(RESEARCH_FALLBACK_FIELDS)),
    )


# ============================================================
# 16. RESEARCH RE-ASK (one bonus request, never a rewrite)
# ============================================================

print("\n[16] research re-ask")

try:

    import agents.research as research_module

    from agents.research import _reask_for_lists

except Exception as reask_import_error:

    print(
        "  SKIP - research agent "
        f"({type(reask_import_error).__name__}: {reask_import_error})"
    )

else:

    FIRST = ResearchOutput(
        market_overview="m",
        target_audience=[],
        competitors=[],
        key_features=["Auth"],
        opportunities=[],
        risks=[],
    )

    SECOND = ResearchOutput(
        market_overview="m2",
        target_audience=["Solo founders", "Agencies"],
        competitors=[],
        key_features=["Not overwritten"],
        opportunities=["Fast onboarding"],
        risks=["", ", "],
    )

    class StubInvoke:
        """Stands in for invoke_structured() on the re-ask call."""

        def __init__(self, outcome):

            self.outcome = outcome
            self.calls = 0

        def __call__(self, *args, **kwargs):

            self.calls += 1

            if isinstance(self.outcome, Exception):
                raise self.outcome

            return self.outcome

    original_invoke = research_module.invoke_structured

    try:

        # A blank first answer costs exactly one extra request...
        stub = StubInvoke(SECOND)
        research_module.invoke_structured = stub

        merged_report, still_empty = _reask_for_lists(
            {"user_goal": "g", "web_results": "w"},
            FIRST.model_dump(),
            ["target_audience", "competitors", "opportunities", "risks"],
        )

        check(
            "an empty research report triggers exactly one re-ask",
            stub.calls == 1,
        )

        check(
            "the re-ask fills only the fields it really improved",
            merged_report["target_audience"]
            == ["Solo founders", "Agencies"]
            and merged_report["opportunities"] == ["Fast onboarding"]
            and merged_report["key_features"] == ["Auth"],
        )

        check(
            "fields the re-ask also left blank stay flagged",
            sorted(still_empty) == ["competitors", "risks"],
        )

        # ...and a re-ask that fails must not take the run down with it.
        research_module.invoke_structured = StubInvoke(
            RuntimeError("provider down")
        )

        kept, still_two = _reask_for_lists(
            {"user_goal": "g", "web_results": "w"},
            FIRST.model_dump(),
            ["target_audience"],
        )

        check(
            "a failed re-ask keeps the first answer instead of raising",
            kept["target_audience"] == []
            and kept["key_features"] == ["Auth"]
            and still_two == ["target_audience"],
        )

    except Exception as reask_error:

        check(
            "research re-ask exercised",
            False,
            detail=f"(raised {type(reask_error).__name__}: {reask_error})",
        )

    finally:
        research_module.invoke_structured = original_invoke


# ============================================================
# 17. UNREADABLE RESPONSE ENVELOPES, AND THE LOGGER
# ============================================================

print("\n[17] replies that cannot be read as completions")

import io
import contextlib

from openai._types import omit
from openai.types.chat import ChatCompletion, ParsedChoice
from openai.lib._parsing._completions import parse_chat_completion
from pydantic import TypeAdapter

from llm_fallback import (
    _log,
    transient_reason,
    is_malformed_provider_reply,
)


def sdk_parse_error(**envelope):
    """
    The failure that killed thread e2fc44a7, made offline.

    This runs the installed function named in the real traceback -
    openai/lib/_parsing/_completions.py:98, the
    `for choice in chat_completion.choices` line - over a hand-made envelope, so
    what comes back has the same type AND the same frames as the one that
    reached production. The frames matter: that is what the classifier keys on,
    and an error fabricated here would prove nothing about it.
    """

    completion = ChatCompletion.model_construct(
        id="chatcmpl-x",
        created=0,
        model="m",
        object="chat.completion",
        **envelope
    )

    try:

        parse_chat_completion(
            response_format=omit,
            input_tools=omit,
            chat_completion=completion,
        )

    except Exception as error:
        return error

    return None


def raised_from(path, error):
    """
    Raise `error` as if the code at `path` had raised it.

    The classifier decides between "the provider sent junk" and "we have a bug"
    by looking at where the error came from, so both sides of that line have to
    be tested, and not with an invented frame.
    """

    try:
        exec(compile("raise error", path, "exec"), {"error": error})

    except BaseException as raised:
        return raised

    return None


null_choices = sdk_parse_error(choices=None)

check(
    "choices: null still raises the TypeError from the incident",
    isinstance(null_choices, TypeError)
    and "'NoneType' object is not iterable" in str(null_choices),
    detail=f"got {type(null_choices).__name__}: {null_choices}",
)

check(
    "an unreadable envelope is recorded as the provider's fault",
    is_malformed_provider_reply(null_choices) and is_transient_error(null_choices),
)

check(
    "and is named honestly in the log, not as a NoneType mystery",
    transient_reason(null_choices) == "provider returned an unreadable response",
    detail=f"got {transient_reason(null_choices)!r}",
)

null_message = sdk_parse_error(
    choices=[
        ParsedChoice.model_construct(
            index=0, finish_reason="stop", message=None
        )
    ]
)

check(
    "a null message is the same failure in a different face",
    null_message is not None and is_transient_error(null_message),
    detail=f"got {type(null_message).__name__ if null_message else 'no error'}",
)

check(
    "the identical TypeError from our own code is never retried",
    not is_transient_error(
        raised_from(
            "agents/finance.py",
            TypeError("'NoneType' object is not iterable"),
        )
    ),
)

check(
    "an error from those frames that is not about the envelope is not retried",
    not is_malformed_provider_reply(
        raised_from("/site-packages/openai/x.py", RuntimeError("boom"))
    ),
)

schema_failure = None

try:
    TypeAdapter(ExecutionPlan).validate_json("not json at all")

except ValidationError as error:
    schema_failure = error

check(
    "a bad generation keeps going to salvage, not to another request",
    schema_failure is not None
    and is_pydantic_json_error(schema_failure)
    and not is_malformed_provider_reply(
        raised_from("/site-packages/openai/x.py", schema_failure)
    ),
)


# The behaviour the ladder exists for: a provider that answers 200 with nothing
# in it must degrade to the fallback report, not to a failed project.
SLEPT.clear()

ladder_sleep = fallback_module.time.sleep

fallback_module.time.sleep = lambda seconds: SLEPT.append(seconds)

try:

    unreadable_chain = ScriptedChain([null_choices])
    logged = io.StringIO()

    with contextlib.redirect_stdout(logged):

        survived = invoke_structured(
            unreadable_chain,
            ExecutionPlan,
            {},
            fields=PLAN_FIELDS,
            retries=2,
            label="Finance Agent",
        )

finally:

    fallback_module.time.sleep = ladder_sleep
    SLEPT.clear()

check(
    "three unreadable replies end in the fallback, not in a dead project",
    isinstance(survived, ExecutionPlan)
    and unreadable_chain.calls == 3
    and survived == fallback_model(ExecutionPlan, PLAN_FIELDS),
    detail=f"calls={unreadable_chain.calls} result={survived!r}",
)

check(
    "and every retry says why",
    logged.getvalue().count("provider returned an unreadable response") == 2,
    detail=f"log was: {logged.getvalue()!r}",
)


# ------------------------------------------------------------
# The logging half: a line that cannot be encoded must never
# outrank the reply it is describing.
# ------------------------------------------------------------

class _UsageMessage(FakeMessage):
    """A reply carrying the token counts the usage line prints."""

    usage_metadata = {
        "input_tokens": 9000,
        "output_tokens": 4000,
        "total_tokens": 13000,
    }


def under_cp1252(function):
    """
    Run `function` with stdout on the code page a default Windows shell boots
    with, which is where the emoji in these lines stop being characters and
    start being exceptions.
    """

    buffer = io.BytesIO()
    real_stdout = sys.stdout

    # Held in a local on purpose: letting the wrapper be garbage-collected
    # closes the BytesIO underneath it, and the captured bytes go with it.
    wrapper = io.TextIOWrapper(buffer, encoding="cp1252", errors="strict")

    sys.stdout = wrapper

    try:
        value = function()

    finally:
        try:
            wrapper.flush()
        except Exception:
            pass

        sys.stdout = real_stdout

    return value, buffer.getvalue().decode("cp1252")


parsed, written = under_cp1252(
    lambda: parse_structured_message(_UsageMessage(PLAIN_PLAN), ExecutionPlan)
)

check(
    "a successful reply survives a cp1252 console",
    isinstance(parsed, ExecutionPlan) and parsed.research is True,
    detail=f"got {parsed!r}",
)

check(
    "the usage line still arrives, minus what the console cannot show",
    "9000 prompt / 4000 completion tokens" in written
    and all(ord(char) < 128 for char in written),
    detail=f"wrote {written!r}",
)

plain = io.StringIO()

with contextlib.redirect_stdout(plain):
    _log("📊 Finance Agent - emoji stay intact on a utf-8 console")

check(
    "on a console that can encode them, the emoji are kept",
    "📊" in plain.getvalue(),
    detail=f"wrote {plain.getvalue()!r}",
)

print()


# ============================================================
# RESULT
# ============================================================

print(
    f"\n{'=' * 50}\n"
    f"PASSED: {len(PASSED)}   FAILED: {len(FAILED)}\n{'=' * 50}"
)

if FAILED:

    print("Failed checks:")

    [
        print(f"  - {name}")
        for name in FAILED
    ]

    sys.exit(1)

print("ALL TESTS PASSED")
