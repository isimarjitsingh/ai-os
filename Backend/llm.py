import os

from functools import partial

import httpx
from dotenv import load_dotenv
from langchain_core.runnables import RunnableLambda
from langchain_openai import ChatOpenAI

from llm_fallback import json_schema_response_format, parse_structured_message

load_dotenv()


# ============================================================
# REQUEST BUDGET
# ============================================================
# LangChain forwards `timeout=self.request_timeout` to the OpenAI SDK
# unconditionally. Leaving it unset therefore does NOT inherit the SDK's 600s
# default - it sends an explicit None, which switches the deadline off
# (measured against a mock transport: connect=None read=None write=None).
# A provider that stops answering then blocks the workflow forever, which is
# how a coding call sat for 15+ minutes with no log line and no retry.
#
# 300s is not a guess: in the last live run research took 3m05s, marketing
# 2m40s and finance 1m03s, so a tighter ceiling such as the 180s first
# considered would fail calls that were working fine.
LLM_TIMEOUT_SECONDS = float(os.getenv("LLM_TIMEOUT_SECONDS", "300"))
LLM_CONNECT_TIMEOUT_SECONDS = float(os.getenv("LLM_CONNECT_TIMEOUT_SECONDS", "10"))

llm = ChatOpenAI(
    model="nvidia/nemotron-3-ultra-550b-a55b:free",
    temperature=0,
    api_key=os.getenv("BAI_API_KEY"),
    base_url="https://openrouter.ai/api/v1",
    timeout=httpx.Timeout(
        LLM_TIMEOUT_SECONDS,
        connect=LLM_CONNECT_TIMEOUT_SECONDS,
    ),
    # The SDK retries twice on its own by default, silently, and that private
    # ladder neither honours Retry-After nor reports to invoke_structured():
    # one slow request can burn three full timeouts before our code learns
    # anything happened. With 0 here, every retry is the visible,
    # rate-limit-aware one inside llm_fallback.invoke_structured().
    max_retries=0,
)


def structured_llm(schema, strict: bool = True, timeout: float = None):
    """
    Structured-output wrapper shared by every agent.

    `timeout` overrides the request budget for this one chain, which is how a
    phase known to be large can be given a different deadline from every other
    agent. Verified against a mock transport: the value reaches the wire as the
    SDK's x-stainless-read-timeout header and wins over the client-level
    timeout set in this module.

    Sends the same request as
    llm.with_structured_output(schema, method="json_schema", strict=strict)
    - the native json_schema response format, no tools and no tool_choice,
    which is what keeps Groq's "tool_use_failed" 400 away - but the reply is
    validated here by llm_fallback.parse_structured_message instead of by the
    OpenAI SDK. That is the whole point: the SDK only parses message.content
    when the schema is bound as a class, and its parse chokes the moment the
    BAI proxy answers with a ```json block, so the schema has to go over as a
    dict (see llm_fallback.py). Fence-wrapped JSON now parses on the first
    attempt - no retry burned, no warning logged, no fallback needed.

    Failure behaviour is deliberately unchanged: a reply that is still
    invalid after unwrapping raises the same pydantic ValidationError the SDK
    used to raise, so invoke_structured()'s retry -> salvage -> hardcoded
    fallback ladder keeps driving recovery exactly as before, and unknown
    errors still bubble up to each agent's own handling.
    """

    bind_kwargs = {}

    if timeout is not None:
        bind_kwargs["timeout"] = timeout

    bound_llm = llm.bind(
        response_format=json_schema_response_format(schema, strict=strict),
        ls_structured_output_format={
            "kwargs": {"method": "json_schema", "strict": strict},
            "schema": schema,
        },
        **bind_kwargs,
    )

    output_parser = RunnableLambda(
        partial(parse_structured_message, schema=schema)
    ).with_types(output_type=schema)

    return bound_llm | output_parser