from typing import List
from pydantic import BaseModel, Field


class FinanceOutput(BaseModel):

    startup_cost: str = Field(
        description="Estimated startup cost."
    )

    monthly_cost: str = Field(
        description="Estimated monthly operational cost."
    )

    revenue_model: List[str] = Field(
        description="Ways the business can generate revenue."
    )

    pricing_strategy: str = Field(
        description="Recommended pricing strategy."
    )

    financial_risks: List[str] = Field(
        description="Potential financial risks."
    )

    break_even_estimate: str = Field(
        description="Estimated break-even timeline."
    )