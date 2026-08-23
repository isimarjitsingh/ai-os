from typing import List
from pydantic import BaseModel, Field


class CEOFinalOutput(BaseModel):

    project_name: str = Field(
        description="Final recommended name of the business or product."
    )

    executive_summary: str = Field(
        description="Concise executive summary of the business idea, findings, and recommended direction."
    )

    business_viability: str = Field(
        description="CEO assessment of whether the business is commercially viable and why."
    )

    target_market: str = Field(
        description="Primary target customer segment and market."
    )

    unique_value_proposition: str = Field(
        description="The main unique value proposition and competitive advantage."
    )

    recommended_mvp: List[str] = Field(
        description="A list of essential MVP features. Return multiple concise feature items."
    )

    recommended_tech_stack: List[str] = Field(
        description="A list of recommended technologies for the project. Return concise technology items."
    )

    launch_strategy: List[str] = Field(
        description="A list of high-level launch and go-to-market actions."
    )

    estimated_budget: str = Field(
        description="Estimated startup or MVP development budget."
    )

    major_risks: List[str] = Field(
        description="A list of the most important business or technical risks."
    )

    next_steps: List[str] = Field(
        description="A list of concrete next steps for executing the project."
    )