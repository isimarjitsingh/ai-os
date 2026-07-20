from typing import List
from pydantic import BaseModel, Field


class CodingOutput(BaseModel):

    project_name: str = Field(
        description="Suggested project name."
    )

    tech_stack: List[str] = Field(
        description="Recommended technologies."
    )

    frontend: List[str] = Field(
        description="Frontend technologies."
    )

    backend: List[str] = Field(
        description="Backend technologies."
    )

    database: str = Field(
        description="Recommended database."
    )

    architecture: str = Field(
        description="Software architecture."
    )

    core_features: List[str] = Field(
        description="Core application features."
    )

    api_endpoints: List[str] = Field(
        description="Important API endpoints."
    )

    development_steps: List[str] = Field(
        description="Recommended implementation roadmap."
    )

    system_architecture: str = Field(
        description="High-level architecture of the application."
    )
