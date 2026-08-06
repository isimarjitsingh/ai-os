from typing import Annotated
from typing_extensions import TypedDict
from schemas.execution_plan import ExecutionPlan
from schemas.research import ResearchOutput
from operator import add



class CompanyState(TypedDict):

    thread_id: str
    # Input
    user_goal: str
    # Output
    execution_plan: ExecutionPlan
    research_report: dict
    marketing_report: dict
    finance_report: dict
    coding_report: dict
    completed_agents: Annotated[list[str], add]
    generated_project: str
    generated_files: list[str]
    final_report: str