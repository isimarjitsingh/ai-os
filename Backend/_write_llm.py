content = r'''import os

from functools import partial

import httpx
from dotenv import load_dotenv
from langchain_core.runnables import RunnableLambda
from langchain_openai import ChatOpenAI
from langchain_xai import ChatXAI
from langchain_groq import ChatGroq
from config import GROQ_API_KEY

from llm_fallback import json_schema_response_format, parse_structured_message

load_dotenv()


# ============================================================
# REQUEST BUDGET
# ============================================================
LLM_TIMEOUT_SECONDS = float(os.getenv("LLM_TIMEOUT_SECONDS", "300"))
LLM_CONNECT_TIMEOUT_SECONDS = float(os.getenv("LLM_CONNECT_TIMEOUT_SECONDS", "10"))

llm = ChatGroq(
    model="openai/gpt-oss-120b",
    api_key=GROQ_API_KEY,
    temperature=0
)


def get_llm(api_key=None):
    """Return a ChatGroq instance using the given API key, or the default."""
    return ChatGroq(
        model="openai/gpt-oss-120b",
        api_key=api_key or GROQ_API_KEY,
        temperature=0,
    )


def structured_llm(schema, strict=True, timeout=None, api_key=None):
    """Structured-output wrapper shared by every agent.

    `timeout` overrides the request budget for this one chain.
    `api_key` - optional user-provided API key; when given a fresh
    ChatGroq instance is built instead of reusing the module-level llm.
    """

    bind_kwargs = {}

    if timeout is not None:
        bind_kwargs["timeout"] = timeout

    active_llm = get_llm(api_key) if api_key else llm

    bound_llm = active_llm.bind(
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
'''

with open('llm.py', 'w', encoding='utf-8') as f:
    f.write(content)
print('llm.py written successfully')