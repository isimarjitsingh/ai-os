from typing import List
from pydantic import BaseModel, Field


class MarketingOutput(BaseModel):

    marketing_summary: str = Field(
        description="Overall marketing strategy."
    )

    positioning: str = Field(
        description="Unique value proposition."
    )

    target_channels: List[str] = Field(
        description="Recommended marketing channels."
    )

    launch_strategy: List[str] = Field(
        description="Launch plan."
    )

    content_ideas: List[str] = Field(
        description="Content marketing ideas."
    )

    kpis: List[str] = Field(
        description="Marketing KPIs."
    )