from typing import Literal
from pydantic import BaseModel, Field


class ProjectFile(BaseModel):

    path: str = Field(
        description="Relative path of the file, for example frontend/src/App.jsx"
    )

    purpose: str = Field(
        description="Why this file is needed in the project"
    )

    description: str = Field(
        description="What functionality or implementation this file should contain"
    )

    category: Literal[
        "frontend",
        "backend",
        "database",
        "config",
        "documentation"
    ] = Field(
        description="Category of the file"
    )