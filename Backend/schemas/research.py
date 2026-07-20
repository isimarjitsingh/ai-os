from typing import List
from pydantic import BaseModel, Field


class ResearchOutput(BaseModel):

    market_overview: str = Field(
        description="A short overview of the market."
    )

    target_audience: List[str] = Field(
        description="Primary target users."
    )

    competitors: List[str] = Field(
        description="Top competitors."
    )

    key_features: List[str] = Field(
        description="Important features users expect."
    )

    opportunities: List[str] = Field(
        description="Business opportunities."
    )

    risks: List[str] = Field(
        description="Potential business risks."
    )