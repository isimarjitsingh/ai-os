from typing import Annotated
from typing_extensions import TypedDict
from schemas.execution_plan import ExecutionPlan
from schemas.research import ResearchOutput
from operator import add



class CompanyState(TypedDict):

    user_goal: str

    execution_plan: ExecutionPlan

    research_report: dict
    marketing_report: dict
    finance_report: dict
    coding_report: dict
    completed_agents: Annotated[list[str], add]

    final_report: str