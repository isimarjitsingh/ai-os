"""One-shot LIVE check of the request budget against the real endpoint.

Costs a couple of tiny requests - it is not a workflow run. What it proves is
the thing the offline mocks cannot: that a deadline is actually enforced by
this provider, that it surfaces as the transient class, and that the ladder
retries it instead of failing.

  .venv\\Scripts\\python.exe _live_check.py
"""
import sys
import time

for stream in (sys.stdout, sys.stderr):

    try:
        stream.reconfigure(encoding="utf-8", errors="replace")

    except Exception:
        pass

import llm as llm_module

from llm_fallback import is_transient_error, invoke_structured
from schemas.execution_plan import ExecutionPlan

PLAN_FIELDS = {
    "research": True,
    "marketing": True,
    "finance": True,
    "coding": True,
    "hr": False,
    "sales": False,
    "customer_support": False,
}

PROMPT = (
    "Decide which departments a one-person freelancer invoicing tool needs. "
    "Keep every list to two items."
)

print(f"configured read timeout: {llm_module.LLM_TIMEOUT_SECONDS}s")
print(f"configured SDK retries:  {llm_module.llm.max_retries}")

# ------------------------------------------------------------
# 1. A normal call still works under the new client config
# ------------------------------------------------------------

print("\n[1] normal call, default budget")

chain = llm_module.structured_llm(ExecutionPlan)

started = time.monotonic()

try:

    plan = chain.invoke(PROMPT)
    elapsed = time.monotonic() - started

    print(f"    ok in {elapsed:.1f}s -> {plan}")

except Exception as error:

    elapsed = time.monotonic() - started

    print(f"    FAILED after {elapsed:.1f}s -> {type(error).__name__}: {error}")
    sys.exit(1)

# ------------------------------------------------------------
# 2. A deadline that cannot be met must raise, be transient,
#    and be survived by the ladder (not a hard project failure)
# ------------------------------------------------------------

print("\n[2] 1-second budget (the provider cannot answer that fast)")

tight = llm_module.structured_llm(ExecutionPlan, timeout=1.0)

started = time.monotonic()

try:

    tight.invoke(PROMPT)
    print("    unexpected: the call answered inside 1s - raise the budget")

except Exception as error:

    elapsed = time.monotonic() - started

    print(f"    raised {type(error).__name__} after {elapsed:.1f}s")

    print(f"    is_transient_error -> {is_transient_error(error)}")

    if elapsed > 5:
        print("    FAIL: the deadline was not enforced")
        sys.exit(1)

    if not is_transient_error(error):
        print("    FAIL: a timeout was not classified as transient")
        sys.exit(1)

# ------------------------------------------------------------
# 3. The same failure through the ladder: it must fall back,
#    not propagate
# ------------------------------------------------------------

print("\n[3] the ladder absorbs the timeout")

started = time.monotonic()

result = invoke_structured(
    tight,
    ExecutionPlan,
    PROMPT,
    fields=PLAN_FIELDS,
    retries=1,
    label="live-check",
)

elapsed = time.monotonic() - started

print(f"    returned in {elapsed:.1f}s -> {result}")

if isinstance(result, ExecutionPlan):
    print("\nLIVE CHECK OK: deadline enforced, timeout classified, ladder held")
else:
    print("\nLIVE CHECK FAILED: the ladder returned nothing usable")
    sys.exit(1)
