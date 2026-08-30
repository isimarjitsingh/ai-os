from typing import Annotated, Optional
from typing_extensions import TypedDict
from schemas.execution_plan import ExecutionPlan
from operator import add


class CompanyState(TypedDict):

    thread_id: str

    user_goal: str

    user_id: int

    execution_plan: ExecutionPlan

    research_report: Optional[dict]
    marketing_report: Optional[dict]
    finance_report: Optional[dict]
    coding_report: Optional[dict]

    completed_agents: Annotated[
        list[str],
        add
    ]

    generated_project: Optional[str]
    generated_files: Optional[list[str]]

    final_report: Optional[str]