from pydantic import BaseModel


class ExecutionPlan(BaseModel):
    research: bool
    marketing: bool
    finance: bool
    coding: bool
    hr: bool
    sales: bool
    customer_support: bool