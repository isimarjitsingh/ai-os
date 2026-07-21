from state.company_state import CompanyState


def route_after_ceo(state: CompanyState):

    plan = state["execution_plan"]

    if plan["research"]:
        return "research"

    if plan["marketing"]:
        return "marketing"

    if plan["finance"]:
        return "finance"

    if plan["coding"]:
        return "coding"

    return "ceo_finalize"


def route_after_research(state: CompanyState):

    plan = state["execution_plan"]

    if plan["marketing"]:
        return "marketing"

    if plan["finance"]:
        return "finance"

    if plan["coding"]:
        return "coding"

    return "ceo_finalize"


def route_after_marketing(state: CompanyState):

    plan = state["execution_plan"]

    if plan["finance"]:
        return "finance"

    if plan["coding"]:
        return "coding"

    return "ceo_finalize"


def route_after_finance(state: CompanyState):

    plan = state["execution_plan"]

    if plan["coding"]:
        return "coding"

    return "ceo_finalize"