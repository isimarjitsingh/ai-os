DEPARTMENT_DEPENDENCIES = {
    "research": [],
    "marketing": ["research"],
    "finance": ["research", "marketing"],
    "coding": ["research", "marketing", "finance"],
    "sales": ["marketing"],
    "hr": [],
    "customer_support": [],
}


def resolve_execution_plan(plan: dict[str, bool]) -> dict[str, bool]:
    resolved = plan.copy()

    changed = True

    while changed:
        changed = False

        for department, enabled in resolved.items():

            if not enabled:
                continue

            for dependency in DEPARTMENT_DEPENDENCIES[department]:

                if not resolved.get(dependency, False):
                    resolved[dependency] = True
                    changed = True

    return resolved