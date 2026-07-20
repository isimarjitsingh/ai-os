from typing import List
from pydantic import BaseModel, Field


class CEOFinalOutput(BaseModel):

    project_name: str = Field(
        description="Suggested name of the business or product."
    )

    executive_summary: str = Field(
        description="Overall summary of the business idea and execution plan."
    )

    business_viability: str = Field(
        description="CEO's assessment of whether the business is worth pursuing."
    )

    target_market: str = Field(
        description="Primary customer segment."
    )

    unique_value_proposition: str = Field(
        description="Main competitive advantage."
    )

    recommended_mvp: List[str] = Field(
        description="Essential MVP features."
    )

    recommended_tech_stack: List[str] = Field(
        description="Recommended technologies from the engineering team."
    )

    launch_strategy: List[str] = Field(
        description="High-level go-to-market strategy."
    )

    estimated_budget: str = Field(
        description="Estimated startup budget."
    )

    major_risks: List[str] = Field(
        description="Biggest business risks."
    )

    next_steps: List[str] = Field(
        description="Recommended execution roadmap."
    )