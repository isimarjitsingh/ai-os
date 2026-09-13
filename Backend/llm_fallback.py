"""
Central resilience layer for Groq structured-output calls.

Why this exists
---------------
LangChain's default with_structured_output() path binds a tool and forces
tool_choice. On openai/gpt-oss-120b this intermittently fails with:

    400 - {"error": {"type": "tool_use_failed",
          "message": "Tool choice is required, but model did not call a tool",
          "code": "tool_use_failed", "failed_generation": "..."}}

The raw model output in `failed_generation` is usually valid and contains
(or is close to) the JSON we asked for. A single such exception used to
propagate out of an agent and mark the whole LangGraph project as "failed"
(project 36 died this way inside the research agent, which had no
fallback).

A second failure class arrived with third-party OpenAI-compatible proxies
(e.g. BAI / GLM models): they ignore the json_schema response_format and
wrap the JSON payload in ```json fences, so the OpenAI SDK's own pydantic
parse raises ValidationError(json_invalid) and there is no
failed_generation attribute to salvage from. For those, the raw content
is recovered from response.metadata["model_raw"] when the installed
langchain-openai exposes it, or straight from the ValidationError's
recorded input (always available, and the primary source today).

That second class is now handled at the source instead: llm.py binds a
DICT json_schema response_format (json_schema_response_format below) -
the identical wire request, minus the SDK's private parse of
message.content - and validates the reply with parse_structured_message
below, which peels the fences off before pydantic ever sees them. A
normal fenced reply therefore parses on the first attempt with no
retry and no warning; parse_structured_message re-raises the original
json_invalid error for content it cannot unwrap, so everything after
this point behaves exactly as it did before.

Defense in depth provided here:

1. All agents bind via llm.structured_llm() (json_schema mode +
   fence-tolerant parser), so the fenced-JSON error class should
   disappear entirely.
2. invoke_structured() retries once on a known recoverable failure
   (Groq 400 tool_use_failed or a pydantic JSON parse error).
3. If it still fails, the model's intended generation is salvaged from
   the exception (or the captured raw response) and coerced into the
   target schema.
4. Agents supply hand-written fallback payloads as the final safety net.
"""

import json
import re
import time
import traceback

from functools import lru_cache

import httpx
import openai
from langchain_core.utils.function_calling import convert_to_openai_tool
from pydantic import TypeAdapter, ValidationError


# ============================================================
# LOGGING
# ============================================================

def _log(text: str) -> None:
    """
    print() that cannot take a workflow down with it.

    The ladder's lines carry emoji, and a Windows shell that is not on code
    page 65001 raises UnicodeEncodeError the moment one is written - measured
    with the mock-transport probe, where the token-count line turned *every*
    successful call into a failure under cp1252. A log line must never be able
    to do that: the emoji are the least interesting part of the message, so
    they are replaced rather than fatal.
    """

    try:
        print(text)

    except UnicodeEncodeError:
        print(text.encode("ascii", "replace").decode("ascii"))


# ============================================================
# ERROR CLASSIFICATION
# ============================================================

# Groq rejects tool-call-forcing requests with one of these markers.
_FAILURE_MARKERS = (
    "tool_use_failed",
    "did not call a tool",
    "tool choice is required",
    "failed_generation",
    "status code: 400",
    "error code: 400",
)


def is_structured_output_failure(error: Exception) -> bool:
    """
    True when `error` is the known Groq 400 tool_use_failed failure
    (or any other 400 carrying a failed_generation payload).
    """

    text = str(error).lower()

    return any(marker in text for marker in _FAILURE_MARKERS)


# ============================================================
# RATE LIMITS (HTTP 429)
# ============================================================

# A 429 from this stack arrives as langchain-openai's OpenAIRateLimitError,
# whose parents are openai.RateLimitError -> openai.APIStatusError ->
# langchain_core's ModelRateLimitError. It is NOT a groq.RateLimitError: the
# Groq SDK has its own unrelated hierarchy (groq.GroqError), so
# `except groq.RateLimitError` never matches a call made through the OpenAI
# client and the error escapes the retry loops untouched - which is how a
# project used to die mid-file-generation with "OpenAIRateLimitError('Error
# code: 429')". Class matching cannot be trusted across two SDKs, so 429s
# are recognised by shape instead.
_RATE_LIMIT_MARKERS = (
    "rate limit",
    "rate_limit",
    "ratelimit",
    "too many requests",
    "status code: 429",
    "error code: 429",
)

# Backoff schedule shared by every retry loop; indexed by attempt number.
RATE_LIMIT_DELAYS = [3, 6, 12, 20]

# Never block a workflow on a server's advice for longer than this; a proxy
# asking for an hour is not worth a hung project.
RATE_LIMIT_MAX_WAIT = 60.0


def _http_status(error: Exception) -> int | None:
    """Best-effort HTTP status of an API error (the SDKs name it badly)."""

    for attribute in ("status_code", "status"):

        value = getattr(error, attribute, None)

        if isinstance(value, int):
            return value

    value = getattr(getattr(error, "response", None), "status_code", None)

    return value if isinstance(value, int) else None


def is_rate_limit_error(error: Exception) -> bool:
    """
    True for any 429 from an OpenAI-compatible endpoint, whatever SDK class
    it happens to be wrapped in (see the note above on why `except
    SomeRateLimitError` cannot cover both the Groq and the OpenAI client).
    """

    if isinstance(error, openai.RateLimitError):
        return True

    if _http_status(error) == 429:
        return True

    text = str(error).lower()

    return any(marker in text for marker in _RATE_LIMIT_MARKERS)


def retry_after_seconds(error: Exception) -> float | None:
    """
    How long the server itself asked us to wait, read off the Retry-After /
    x-ratelimit-reset-* headers. The endpoint knows when its window refills
    far better than a fixed schedule does, so callers prefer this when it is
    present. Returns None when no usable header exists - a missing header, an
    HTTP-date instead of seconds, or a response object the SDK never gave us.
    """

    headers = getattr(getattr(error, "response", None), "headers", None)

    if headers is None:
        return None

    for header in (
        "retry-after",
        "x-ratelimit-reset-requests",
        "x-ratelimit-reset-tokens",
    ):

        try:
            raw = headers.get(header)

        except Exception:
            continue

        if raw is None:
            continue

        try:
            wait = float(str(raw).strip())

        except ValueError:
            # An HTTP-date, or a proxy that put prose in a numeric header.
            continue

        if wait >= 0:
            return min(wait, RATE_LIMIT_MAX_WAIT)

    return None


def rate_limit_wait(attempt: int, error: Exception = None) -> float:
    """
    Seconds to sleep before retry `attempt` of a rate-limited call: the
    server's own instruction when it sent one, otherwise the shared backoff
    schedule, whose last entry repeats once the schedule runs out.
    """

    instructed = retry_after_seconds(error) if error is not None else None

    if instructed is not None:
        return instructed

    if attempt < len(RATE_LIMIT_DELAYS):
        return float(RATE_LIMIT_DELAYS[attempt])

    return float(RATE_LIMIT_DELAYS[-1])


# ============================================================
# TRANSIENT TRANSPORT FAILURES (timeouts, dropped connections, 5xx)
# ============================================================

# Switching the SDK's private retries off (see llm.py) handed two behaviours
# to this module: waiting out a rate limit, which invoke_structured() already
# did, and retrying a request that never got an answer - the SDK used to do
# that itself, twice, for timeouts, connection resets and every 5xx. Without
# the class below, the first such error now escapes invoke_structured()
# untouched and graph_service marks the project failed, which would turn
# "the endpoint is slow" into "the project is broken" the moment a real
# deadline exists.
#
# Matched by class rather than by text, on purpose: a read timeout surfaces as
# langchain-openai's OpenAITimeoutError (parent openai.APITimeoutError ->
# APIConnectionError) whose message is "Request timed out." - the string
# "timeout" is not in it, so a marker list like _RATE_LIMIT_MARKERS would miss
# the exact failure this exists to catch.
_TRANSIENT_CLASSES = (
    openai.APITimeoutError,
    openai.APIConnectionError,
    httpx.TimeoutException,
    httpx.TransportError,
)

# A timeout is a dead request, not a refusal, so there is no Retry-After to
# honour and a long pause buys nothing. Short fixed backoff, last entry repeats.
TRANSIENT_DELAYS = [3, 8, 15]

# Exactly the statuses the SDK used to retry for us. A 4xx or a 501 is a
# permanent complaint about our request and must never be slept on.
TRANSIENT_STATUSES = (500, 502, 503, 504)

# The plain Python errors a reply the adapter cannot read shows up as: iterating
# null choices (TypeError), an empty choices list (IndexError), a missing or
# null message object (AttributeError), a role the adapter refuses (ValueError).
_ENVELOPE_EXCEPTIONS = (
    TypeError,
    AttributeError,
    KeyError,
    IndexError,
    ValueError,
)

# Path fragments of the installed packages whose job is to turn a provider's
# JSON into a chat message. An error raised inside them was caused by the body
# that arrived, not by the code that asked for it.
_ADAPTER_PACKAGES = ("/openai/", "/langchain_openai/")


def is_transient_error(error: Exception) -> bool:
    """
    True when the request itself never produced a usable answer: the provider
    took too long, the connection dropped, the server failed, or the server
    answered 200 with an envelope that cannot be read as a completion. None of
    these carry a generation, so the only useful move is to ask again - which is
    what keeps a slow endpoint from failing an entire project.
    """

    if isinstance(error, _TRANSIENT_CLASSES):
        return True

    if _http_status(error) in TRANSIENT_STATUSES:
        return True

    return is_malformed_provider_reply(error)


def is_malformed_provider_reply(error: Exception) -> bool:
    """
    True when the provider answered 200 with a body the SDK cannot turn into a
    message, and the failure surfaced as a plain Python error from inside the
    adapter rather than as an API error.

    Measured, not guessed. The repro of thread e2fc44a7 (finance, 111.7s) got
    `choices: null` and died at:

        openai/lib/_parsing/_completions.py:98
            for choice in chat_completion.choices:
        TypeError: 'NoneType' object is not iterable

    which is why the log line blamed "NoneType" instead of the provider: the
    envelope never reached our code, and langchain's friendlier guard for null
    choices is written after the point the SDK gives up. An empty `choices: []`
    raises IndexError, a `message: null` raises AttributeError - the same
    failure, three different faces, none of them mentioning a response.

    Classified by FRAME, not by message, so it cannot be fooled by an unrelated
    error that happens to read 'NoneType': the raise must come from inside the
    installed adapter packages. A bug in this repo's own code raises from this
    repo's files, stays unclassified here, and is still re-raised with its
    traceback. Retrying is the honest response: a degraded endpoint that
    returns an empty envelope one minute usually fills it the next.
    """

    if not isinstance(error, _ENVELOPE_EXCEPTIONS):
        return False

    if is_structured_output_failure(error) or is_pydantic_json_error(error):

        # A generation did arrive and simply does not fit the schema. That is
        # salvage's job, and it too carries adapter frames, so it must not be
        # swept in here as "nothing to keep - ask again".
        return False

    seen = set()
    current = error

    # The SDK re-raises inside `except` blocks, so the frames that matter can
    # sit on a chained cause rather than on the error the caller received.
    while isinstance(current, BaseException) and id(current) not in seen:

        seen.add(id(current))

        for frame in traceback.extract_tb(current.__traceback__):

            path = frame.filename.replace("\\", "/")

            if any(package in path for package in _ADAPTER_PACKAGES):
                return True

        current = current.__cause__ or current.__context__

    return False


def transient_wait(attempt: int) -> float:
    """Seconds to rest before retrying `attempt` of a timed-out call."""

    if attempt < len(TRANSIENT_DELAYS):
        return float(TRANSIENT_DELAYS[attempt])

    return float(TRANSIENT_DELAYS[-1])


def transient_reason(error: Exception) -> str:
    """Short label for logs, so a timeout is never mistaken for a refusal."""

    if isinstance(error, (openai.APITimeoutError, httpx.TimeoutException)):
        return "timed out"

    status = _http_status(error)

    if status is not None:
        return f"server error ({status})"

    if is_malformed_provider_reply(error):
        return "provider returned an unreadable response"

    return "connection dropped"


# ============================================================
# PYDANTIC JSON PARSE FAILURES (fenced-JSON proxies)
# ============================================================

# pydantic error types raised when the raw content is not the JSON the
# SDK was told to expect: json_invalid (not parseable at all, e.g. a
# ```json fence) and json_type (parseable JSON of the wrong shape).
_PYDANTIC_JSON_ERROR_TYPES = (
    "json_invalid",
    "json_type",
)


def is_pydantic_json_error(error: Exception) -> bool:
    """
    True when `error` is the pydantic ValidationError the OpenAI SDK
    raises while parsing message.content into the response format -
    typically because a proxy wrapped the JSON payload in ```json
    fences instead of honouring the json_schema response format.
    """

    if not isinstance(error, ValidationError):
        return False

    return any(
        entry.get("type") in _PYDANTIC_JSON_ERROR_TYPES
        for entry in error.errors()
    )


def _raw_input_from_pydantic_error(error: ValidationError) -> str | None:
    """
    The raw model content pydantic choked on, recovered from the
    ValidationError itself. Pydantic records the full original string
    as the failed call's input on every error entry.
    """

    for entry in error.errors():

        raw = entry.get("input")

        if isinstance(raw, str) and raw.strip():
            return raw

    return None


def _raw_from_metadata(error: Exception) -> str | None:
    """
    Recover the raw chat response when a langchain-openai build stashes
    it on the raised error's response_metadata["model_raw"] (newer
    builds only; returns None on the installed version, where the
    pydantic-error input path is used instead).
    """

    metadata = getattr(error, "response_metadata", None)

    raw = metadata.get("model_raw") if isinstance(metadata, dict) else None

    if isinstance(raw, str) and raw.strip():
        return raw

    return None


_FENCE_RE = re.compile(r"```(?:[a-zA-Z0-9_-]*)\s*(.*?)\s*```", re.DOTALL)


def _strip_json_wrapping(text: str) -> str:
    """
    Peel markdown fences and surrounding prose off a JSON payload.

    Handles exactly what GLM-class models emit in the wild:
      1. ```json ... ``` / ``` ... ``` fences,
      2. a sentence before/after the JSON with no fence at all.

    Plain JSON passes through untouched.
    """

    fence = _FENCE_RE.search(text)

    if fence and fence.group(1).strip():
        return fence.group(1).strip()

    # No usable fence - slice from the first brace to the last one so
    # "Sure! {...} hope that helps" still parses.
    start, end = text.find("{"), text.rfind("}")

    if start != -1 and end > start:
        return text[start:end + 1]

    return text.strip()


def _flatten_wrapped_fields(
    candidate: dict,
    model_fields=None,
    depth: int = 3,
) -> dict:
    """
    Hoist values out of nested wrapper keys to the top level.

    GLM-class models answer flat-boolean schemas with grouped shapes
    like {"departments": {"research": true, ...}, ...} (a dict of
    field: bool) or {"departments": ["research", "marketing"], ...}
    (a list of enabled field names). Hoisting maps both back onto the
    schema: top-level keys always win; nested ones only fill gaps
    (setdefault); plain-name lists only mark schema BOOL fields True.
    Nesting is followed up to `depth` levels; keys that are themselves
    schema fields are left untouched (their value is real content, not
    a wrapper).
    """

    fields = model_fields if isinstance(model_fields, dict) else {}

    flat = dict(candidate)

    for name, value in candidate.items():

        if name in fields:
            continue

        if isinstance(value, dict) and depth > 0:

            for inner_name, inner in _flatten_wrapped_fields(
                value, fields, depth - 1
            ).items():
                flat.setdefault(inner_name, inner)

        elif (
            isinstance(value, list)
            and value
            and all(isinstance(item, str) for item in value)
        ):

            # "departments": ["research", "marketing"] - each name that
            # matches a schema BOOL field means that field is enabled.
            for item in value:

                field_info = fields.get(item)

                if field_info is None:
                    continue

                if "bool" in str(
                    getattr(field_info, "annotation", "")
                ).lower():
                    flat.setdefault(item, True)

    return flat


# ============================================================
# SCHEMA BINDING AND PARSING (used by llm.structured_llm)
# ============================================================

def json_schema_response_format(schema, strict: bool = True) -> dict:
    """
    Build the OpenAI `json_schema` response format for `schema` as a dict.

    LangChain's with_structured_output() cannot be used for this: given a
    BaseModel class it binds the CLASS as response_format, and the OpenAI
    SDK's parse() then validates message.content against that class itself
    (openai.lib._parsing._completions.maybe_parse_content). A proxy that
    wraps the payload in ```json fences therefore dies inside the SDK, on
    a path nothing above this module can hook into.

    A dict response format is treated as "already OpenAI format" at every
    layer - langchain passes it through untouched and the SDK skips its own
    content parse - so message.content stays the raw model reply for
    parse_structured_message() below. The request body sent over the wire is
    the same json_schema payload either way, which is what stops GLM-class
    models from answering in prose in the first place.

    convert_to_openai_tool(strict=...) is langchain-core's own converter, the
    same one the with_structured_output() path runs a schema through, so the
    embedded schema matches what the class form would have sent: every
    property required and additionalProperties false.
    """

    function = convert_to_openai_tool(schema, strict=strict)["function"]

    json_schema = {
        "name": function["name"],
        "strict": strict,
        "schema": function["parameters"],
    }

    if function.get("description"):
        json_schema["description"] = function["description"]

    return {"type": "json_schema", "json_schema": json_schema}


def _message_content(message) -> str:
    """
    Flatten a chat-model reply into plain text.

    json_schema calls answer with a string, but content blocks are what
    newer langchain builds hand back, so both shapes reduce to one text.
    """

    content = getattr(message, "content", message)

    if isinstance(content, str):
        return content

    if isinstance(content, list):

        parts = []

        for block in content:

            if isinstance(block, str):
                parts.append(block)

            elif isinstance(block, dict) and isinstance(block.get("text"), str):
                parts.append(block["text"])

        return "\n".join(parts)

    return "" if content is None else str(content)


def _usage_summary(message) -> str:
    """
    Prompt / completion token counts of one reply, for the log line.

    Completion tokens are the number that explains a slow call - and, once the
    coding request is split in two, the number that shows whether the split
    actually shrank it. Fake messages used by the offline tests carry no usage
    metadata, so this stays silent there.
    """

    usage = getattr(message, "usage_metadata", None)

    if isinstance(usage, dict) and usage:
        return (
            f"{usage.get('input_tokens', 0)} prompt / "
            f"{usage.get('output_tokens', 0)} completion tokens"
        )

    metadata = getattr(message, "response_metadata", None) or {}

    token_usage = (
        metadata.get("token_usage") if isinstance(metadata, dict) else None
    )

    if isinstance(token_usage, dict) and token_usage:
        return (
            f"{token_usage.get('prompt_tokens', 0)} prompt / "
            f"{token_usage.get('completion_tokens', 0)} completion tokens"
        )

    return ""


def parse_structured_message(message, schema):
    """
    Validate a json_schema reply into a `schema` instance.

    This is the SDK's job done in the open: the one extra step is
    unwrapping, so the BAI/GLM habit of replying with a ```json block (or a
    sentence around the JSON) becomes an ordinary success instead of a
    retryable error. Content that parses as-is is never rewritten, so clean
    responses behave exactly as they did before.

    A reply that is still invalid raises the ValidationError pydantic
    produced while trying to parse it, which is the error shape
    invoke_structured() already understands: is_pydantic_json_error() marks
    it recoverable, and salvage() reads the model's text back out of the
    error's recorded input once the retries run out. Nothing is quietly
    patched here - fields are only ever defaulted by the ladder itself.
    """

    content = _message_content(message)

    usage = _usage_summary(message)

    if usage:
        _log(
            f"📊 {getattr(schema, '__name__', 'schema')} - {usage}"
        )

    # NOTE: `except ... as error` unbinds the name when the block ends, so
    # the first failure is aliased before it leaves scope.
    try:
        return _type_adapter(schema).validate_json(content)

    except ValidationError as error:
        direct_error = error

    unwrapped = _strip_json_wrapping(content)

    if not unwrapped or unwrapped == content:
        raise direct_error

    try:
        return _type_adapter(schema).validate_json(unwrapped)

    except ValidationError:
        # Unwrapping did not rescue the payload either; report the parse of
        # the model's actual text, as the SDK used to.
        raise direct_error


# ============================================================
# SALVAGE THE INTENDED GENERATION FROM THE ERROR
# ============================================================

_FAILED_GENERATION_RE = re.compile(
    r"[\"']failed_generation[\"']\s*:\s*[\"']"
)


def _extract_generation(error: Exception) -> str | None:
    """Pull the model's intended output out of a Groq 400 exception."""

    # 1. Groq SDK: BadRequestError.failed_generation
    raw = getattr(error, "failed_generation", None)

    if isinstance(raw, str) and raw.strip():
        return raw

    # 2. Groq SDK: e.body == {"error": {"failed_generation": ..., ...}}
    body = getattr(error, "body", None)

    if isinstance(body, dict):

        raw = body.get("failed_generation")

        error_object = body.get("error")

        if not raw and isinstance(error_object, dict):
            raw = error_object.get("failed_generation")

        if isinstance(raw, str) and raw.strip():
            return raw

    # 3. Last resort: fish it out of the stringified exception.
    text = str(error)

    match = _FAILED_GENERATION_RE.search(text)

    if not match:
        return None

    tail = text[match.end():]

    # The repr ends with: '}, code=400, ...)' - cut at the terminator.
    for terminator in ("'}", '"}', "})", "'}", '"'):

        index = tail.find(terminator)

        if index != -1:
            return tail[:index]

    return tail

def _salvage_str(value) -> str | None:
    """Coerce a salvaged value into a non-empty string."""

    if isinstance(value, str) and value.strip():
        return value.strip()

    if isinstance(value, (int, float, bool)):
        return str(value)

    return None


def _salvage_list(value) -> list | None:
    """Coerce a salvaged value into a list of non-empty strings."""

    if isinstance(value, str):
        value = [part.strip() for part in value.split("\n")]

    if not isinstance(value, list):
        return None

    result = []

    for item in value:

        if isinstance(item, str) and item.strip():
            result.append(item.strip())

        elif isinstance(item, dict) and item:
            # A prose-y bullet became an object; keep its text values.
            text = " ".join(
                str(part).strip()
                for part in item.values()
                if str(part).strip()
            )

            if text:
                result.append(text)

    return result or None


def _salvage_bool(value) -> bool | None:

    if isinstance(value, bool):
        return value

    if isinstance(value, str):
        return value.strip().lower() in ("true", "yes", "1")

    if isinstance(value, (int, float)):
        return bool(value)

    return None


@lru_cache(maxsize=64)
def _type_adapter(annotation):
    """Cached pydantic adapter per annotation (typing generics hash fine)."""

    return TypeAdapter(annotation)


def _coerce_value(annotation, value):
    """
    Coerce one salvaged value toward the schema field's type.

    Pydantic itself does the first pass, so nested models (e.g.
    List[ProjectFile]) validate directly from raw dicts. The manual
    coercions below rescue prose-y shapes pydantic rejects (dict
    bullets meant as strings, newline-joined lists, int costs...).
    """

    if value is None:
        return None

    try:

        return _type_adapter(annotation).validate_python(value)

    except ValidationError:

        pass

    except Exception:

        # Annotations pydantic cannot build an adapter for; fall
        # through to the manual coercions.
        pass

    name = str(annotation).lower()

    if "bool" in name:
        return _salvage_bool(value)

    if "list" in name:
        return _salvage_list(value)

    if "str" in name:
        return _salvage_str(value)

    return value


def _generic_default(annotation):
    """Least-surprising valid value for a required schema field."""

    name = str(annotation).lower()

    if "bool" in name:
        return False

    if "list" in name:
        return []

    if "str" in name:
        return "Not available."

    return None


def _build_kwargs(schema, recovered: dict, fields: dict | None) -> dict:
    """
    Merge `recovered` (salvaged generation values), `fields` (the
    caller's fallback template) and generic type defaults into a kwargs
    dict covering every schema field, in that priority order.
    """

    kwargs = {}

    for name, field_info in getattr(schema, "model_fields", {}).items():

        if name in recovered:

            coerced = _coerce_value(
                field_info.annotation,
                recovered[name]
            )

            if coerced is not None:
                kwargs[name] = coerced
                continue

        if fields and name in fields:
            kwargs[name] = fields[name]
            continue

        generic = _generic_default(field_info.annotation)

        if generic is not None:
            kwargs[name] = generic

    return kwargs


def salvage(schema, error: Exception, fields: dict | None = None):
    """
    Try to build a valid `schema` instance from the model's intended
    generation recovered from a Groq 400 exception.

    Handles the shapes seen in production:
      1. a pure JSON payload (the CEO planner case),
      2. a markdown-fenced / prose-wrapped JSON payload (GLM-class
         proxies that ignore the json_schema response format),
      3. a free-form markdown report (the research agent crash),
      4. a JSON payload whose schema fields are nested under wrapper
         keys (e.g. {"departments": {"research": true, ...}} or a
         name list {"departments": ["research", ...]}).

    Recovered fields win; anything still missing from the (all-required)
    schemas is filled from `fields` (the agent's fallback template) and
    finally from generic type defaults, so a PARTIAL recovery still
    validates instead of being thrown away. Returns None only when the
    generation contained nothing usable at all.
    """

    generation = _extract_generation(error)

    if not generation:

        # No failed_generation payload - try raw-response metadata when
        # the installed langchain-openai stashes it on the error.
        generation = _raw_from_metadata(error)

    if not generation:

        # Last source: the raw input pydantic recorded while failing to
        # parse the message content itself.
        if isinstance(error, ValidationError):
            generation = _raw_input_from_pydantic_error(error)

    if not generation:
        return None

    candidate = None

    # --------------------------------------------------------
    # Shape 1: pure JSON payload
    # --------------------------------------------------------

    try:

        parsed = json.loads(generation)

        if isinstance(parsed, dict):
            candidate = parsed

    except (json.JSONDecodeError, ValueError):
        pass

    # --------------------------------------------------------
    # Shape 2: markdown-fenced / prose-wrapped JSON payload
    # --------------------------------------------------------

    if candidate is None:

        unwrapped = _strip_json_wrapping(generation)

        try:

            parsed = json.loads(unwrapped)

            if isinstance(parsed, dict):
                candidate = parsed

        except (json.JSONDecodeError, ValueError):
            pass

    # --------------------------------------------------------
    # Shape 3: free-form markdown report (research agent)
    # --------------------------------------------------------

    if (
        candidate is None
        and "market_overview" in getattr(schema, "model_fields", {})
    ):
        candidate = {"market_overview": generation}

    if not candidate:
        return None

    model_fields = getattr(schema, "model_fields", {})

    # The generation must map to at least one real schema field,
    # otherwise it is garbage (e.g. JSON about something else entirely)
    # and the ladder falls through to the hardcoded fallback instead of
    # fabricating a hollow object. GLM-class models sometimes nest the
    # fields under wrapper keys (e.g. {"departments": {...}}), so hoist
    # nested values first - top-level keys always win, nested ones only
    # fill gaps.
    candidate = _flatten_wrapped_fields(candidate, model_fields)

    if not any(name in candidate for name in model_fields):
        return None

    kwargs = _build_kwargs(schema, candidate, fields)

    try:
        return schema(**kwargs)
    except Exception as salvage_error:
        print(f"⚠️ llm_fallback - Salvage failed validation: {salvage_error}")
        return None

# ============================================================
# HARDCODED FALLBACK MODEL
# ============================================================

def fallback_model(schema, fields: dict):
    """
    Build a schema instance from hand-written defaults.

    `fields` maps schema field names to default values. Keys that are not
    real schema fields are ignored, and required fields missing from
    `fields` are filled with generic type defaults (False / [] / "Not
    available.") so a partial template can never raise. If construction
    still fails the function returns None and the ladder re-raises.
    """

    kwargs = _build_kwargs(schema, {}, fields)

    try:
        return schema(**kwargs)
    except Exception as fallback_error:
        print(f"⚠️ llm_fallback - Fallback model failed: {fallback_error}")
        return None


# ============================================================
# RESILIENT INVOCATION
# ============================================================

def invoke_structured(
    chain,
    schema,
    prompt_inputs: dict,
    fields: dict,
    retries: int = 1,
    label: str = "agent",
):
    """
    Invoke a structured-output chain with the full survival ladder:

    1. try the call,
    2. on a rate limit (429), a transient transport failure (timeout, dropped
       connection, 5xx) or a known recoverable model failure (Groq 400
       tool_use_failed, a pydantic JSON parse error), wait out the matching
       backoff and retry `retries` times,
    3. salvage the model's intended output from `failed_generation`
       or the raw recorded input,
    4. build the hand-written fallback model from `fields`,
    5. re-raise so the caller's own error handling takes over.

    Every attempt logs its own elapsed time, so a call that is slow and a
    call that is stuck are distinguishable in the console instead of having to
    be guessed at from how long the UI has been silent.

    `fields` doubles as the default payload template; every key must be a
    real schema field so the ladder can always construct a result.

    Errors that are NOT one of the known recoverable failures are
    re-raised immediately (no retry, no fallback) so the caller's own
    error handling decides what to do with them.
    """

    last_error = None

    for attempt in range(retries + 1):

        started = time.monotonic()

        try:

            result = chain.invoke(prompt_inputs)

            _log(
                f"✅ {label} - answered in "
                f"{time.monotonic() - started:.1f}s"
            )

            return result

        except Exception as error:

            elapsed = time.monotonic() - started
            last_error = error

            _log(
                f"⚠️ {label} - LLM call failed after {elapsed:.1f}s "
                f"(attempt {attempt + 1}/{retries + 1}): "
                f"{type(error).__name__}: {error}"
            )

            recoverable = (
                is_structured_output_failure(error)
                or is_pydantic_json_error(error)
            )

            if is_rate_limit_error(error):

                # A 429 carries no generation at all, so there is nothing to
                # salvage from it; the only useful response is to wait for
                # the window to refill and ask again. Once the attempts run
                # out the ladder falls through to the agent's hardcoded
                # fallback instead of marking the whole project failed.
                if attempt < retries:

                    delay = rate_limit_wait(attempt, error)

                    _log(
                        f"⚠️ {label} - Rate limited (429). "
                        f"Waiting {delay}s before retry..."
                    )

                    time.sleep(delay)

                continue

            if is_transient_error(error):

                # Same shape as a 429: nothing was generated, so salvage has
                # nothing to work on and the only move is to ask again. This
                # is what stops one stalled request from failing a project -
                # without it, the deadline added in llm.py would simply make
                # slow providers fatal.
                if attempt < retries:

                    delay = transient_wait(attempt)

                    _log(
                        f"⚠️ {label} - {transient_reason(error)}. "
                        f"Waiting {delay}s before retry..."
                    )

                    time.sleep(delay)

                continue

            if not recoverable:

                # Unknown failures are not recoverable here; bubble up so the
                # caller's own error handling takes over. The frames go first,
                # because nothing between here and the provider keeps a
                # traceback (graph_service prints repr(e) and main.py prints
                # str(e)), which is exactly what turned the `choices: null`
                # failure above into a search for where 'NoneType' had been
                # iterated instead of one line of output.
                _log(f"⚠️ {label} - unexpected failure, traceback follows:")
                traceback.print_exc()
                raise

            _log(
                f"⚠️ {label} - Recoverable structured-output "
                f"failure, retrying..."
            )

    # --------------------------------------------------------
    # SALVAGE THE INTENDED GENERATION
    # --------------------------------------------------------

    salvaged = salvage(schema, last_error, fields)

    if salvaged is not None:

        _log(f"⚠️ {label} - Recovered output from the failed generation")

        return salvaged

    # --------------------------------------------------------
    # HARDCODED FALLBACK
    # --------------------------------------------------------

    fallback = fallback_model(schema, fields)

    if fallback is not None:

        _log(f"⚠️ {label} - Using hardcoded fallback output")

        return fallback

    _log(f"❌ {label} - All recovery paths exhausted")

    raise last_error
