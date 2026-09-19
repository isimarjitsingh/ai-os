import ast
import re

from llm import structured_llm
from llm_fallback import invoke_structured
from services.agent_events import (
    emit_running,
    emit_completed,
)
from prompts.research import (
    RESEARCH_PROMPT,
    RESEARCH_RETRY_PROMPT,
)
from state.company_state import CompanyState
from schemas.research import ResearchOutput
from tools.web_search import web_search   # I still prefer this name

from database.database import SessionLocal
from database.crud import (
    get_complete_project,
    save_research_report
)

# json_schema mode instead of tool calling - tool_choice based structured
# output intermittently dies with Groq 400 "tool_use_failed" on
# openai/gpt-oss-120b, which used to crash the whole graph right here.
# Chains are built at runtime inside the agent functions so that
# a user-supplied API key can be passed through CompanyState.


def _build_chain(api_key: str | None = None):
    llm = structured_llm(ResearchOutput, api_key=api_key)
    return RESEARCH_PROMPT | llm


def _build_retry_chain(api_key: str | None = None):
    llm = structured_llm(ResearchOutput, api_key=api_key)
    return RESEARCH_RETRY_PROMPT | llm


# ============================================================
# LIST FIELD HYGIENE
# ============================================================
# Everything the company does after research reads these five lists: marketing
# takes audience/competitors/features, finance takes audience/opportunities/
# risks, and the coding agent takes audience/competitors/features/opportunities
# to decide what to build. A field that arrives empty is therefore not a
# cosmetic problem - the coding agent will plan an MVP with no features.

RESEARCH_LIST_FIELDS = (
    "target_audience",
    "competitors",
    "key_features",
    "opportunities",
    "risks",
)

# An item that is only punctuation, brackets or quotes - ", " and "['" are what
# a half-parsed Python list repr leaves behind - carries no information and is
# worse than nothing, because it looks like content downstream.
_JUNK_ITEM_RE = re.compile(r"^[\s\[\](){}/.,;:!'\"-]*$")


def _clean_items(value) -> list:
    """
    Coerce whatever arrived for a list field into real, non-empty strings.

    Handles the shapes seen in practice: a proper array, a Python list repr
    that a proxy turned back into a string ("[', ']", "['a', 'b']"), newline
    separated text, and arrays of objects. Junk and duplicates are dropped.
    """

    if value is None:
        return []

    if isinstance(value, str):
        text = value.strip()

        if text.startswith("[") and text.endswith("]"):
            try:
                # literal_eval, not eval: this parses a Python list repr, and
                # ast refuses anything that is not a literal.
                value = ast.literal_eval(text)
            except (ValueError, SyntaxError):
                value = re.split(r"[\n,]", text[1:-1])
        else:
            value = re.split(r"\n", text) if text else []

    if isinstance(value, dict):
        # An object where an array was asked for: keep its text values, which
        # is what a model that ignored the array shape usually means.
        value = list(value.values())

    if not isinstance(value, (list, tuple)):
        value = [value]

    cleaned = []

    for item in value:

        if isinstance(item, dict):
            # An object where a string was meant: keep the values, which are
            # the part a reader would recognise as the answer.
            item = ", ".join(str(part) for part in item.values())

        elif isinstance(item, (list, tuple)):
            item = ", ".join(str(part) for part in item)

        text = str(item or "").strip()

        if not text or _JUNK_ITEM_RE.match(text):
            continue

        if text not in cleaned:
            cleaned.append(text)

    return cleaned


def _normalize_lists(report: dict) -> list:
    """
    Clean every list field in place; return the names left empty.
    """

    empty = []

    for field in RESEARCH_LIST_FIELDS:

        items = _clean_items(report.get(field))
        report[field] = items

        if not items:
            empty.append(field)

    return empty



# Hardcoded minimum-viable research report used when every recovery path
# fails, so the marketing / finance / coding agents downstream still get
# the keys they read from state["research_report"].
RESEARCH_FALLBACK_FIELDS = {
    "market_overview": (
        "Automated market research is unavailable, so no live market "
        "overview could be retrieved for this idea."
    ),
    "target_audience": [
        "Early adopters interested in this product category",
        "Small teams looking for productivity gains",
    ],
    "competitors": [
        "Established incumbents in this category",
        "Emerging startups targeting the same segment",
    ],
    "key_features": [
        "Core user workflow",
        "Simple onboarding",
        "Dashboard and reporting",
    ],
    "opportunities": [
        "Underserved niche within the category",
        "Better onboarding and pricing than incumbents",
    ],
    "risks": [
        "Competition from established players",
        "Customer acquisition cost uncertainty",
    ],
}


def _reask_for_lists(prompt_inputs: dict, report: dict, empty: list, api_key: str | None = None):
    """
    One extra request, with the completeness instruction, for the blank fields.

    Returns the report to use and the fields still empty afterwards. Only
    fields that were blank are taken from the retry, so a good first answer is
    never overwritten by a worse second one.
    """

    print(
        f"⚠️ Research Agent - re-asking once for "
        f"{len(empty)} empty field(s)"
    )

    try:

        retry = invoke_structured(
            _build_retry_chain(api_key),
            ResearchOutput,
            prompt_inputs,
            fields=RESEARCH_FALLBACK_FIELDS,
            retries=0,
            label="Research Agent / re-ask",
        )

    except Exception as error:

        # The ladder is deliberately not re-run here: this is a bonus attempt
        # on top of the retries the first call already spent.
        print(
            f"⚠️ Research Agent - re-ask failed "
            f"({type(error).__name__}); keeping the first answer"
        )

        return report, empty

    retried = retry.model_dump()
    still_empty = set(_normalize_lists(retried))

    for field in empty:

        if field in still_empty:
            continue

        report[field] = retried[field]

        print(
            f"✅ Research Agent - {field} recovered "
            f"on re-ask ({len(retried[field])} items)"
        )

    return report, [field for field in empty if not report.get(field)]


def research_agent(state: CompanyState):

    emit_running(
        state,
        "research"
    )
   
    print("🔍 Research Agent Started")

    try:
        search_results = web_search.invoke(
            {
                "query": state["user_goal"]
            }
        )

    except Exception as e:
        print(f"Web Search Error: {e}")
        search_results = "No web search results available."

    prompt_inputs = {
        "user_goal": state["user_goal"],
        "web_results": search_results,
    }

    response = invoke_structured(
        _build_chain(state.get("api_key")),
        ResearchOutput,
        prompt_inputs,
        fields=RESEARCH_FALLBACK_FIELDS,
        label="Research Agent"
    )

    # --------------------------------------------------------
    # A reply can satisfy the schema and still be useless: five
    # validated List[str] fields, every one of them empty, or full of
    # the ", " fragments a half-parsed list repr leaves behind. That
    # used to flow straight into marketing / finance / coding, where
    # "Key features: []" becomes an MVP with no features - so emptiness
    # is handled here, at the last point where it is cheap to fix.
    # --------------------------------------------------------

    report = response.model_dump()
    empty = _normalize_lists(report)

    if empty:

        # Which side of the wire the blanks came from is only answerable from
        # the raw reply, so it is printed before anything else touches it.
        print(
            f"⚠️ Research Agent - no usable content in: "
            f"{', '.join(empty)}"
        )
        print("🔎 Research Agent - raw model reply:", response.model_dump())

        report, empty = _reask_for_lists(prompt_inputs, report, empty, state.get("api_key"))

    for field in empty:

        report[field] = list(RESEARCH_FALLBACK_FIELDS[field])

        print(
            f"⚠️ Research Agent - {field} filled from the "
            f"fallback report"
        )

    db = SessionLocal()

    try:

        project = get_complete_project(

            db,

            state["thread_id"],

            state["user_id"]

        )

        if project:

            save_research_report(

                db,

                project,

                report

            )

    finally:

        db.close()

    print("✅ Research Agent Completed")

    emit_completed(
        state,
        "research",
        report
    )

    return {
        "research_report": report
    }
