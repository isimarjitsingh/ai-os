from typing import List
from pydantic import BaseModel, Field
from .project_file import ProjectFile


class CodingArchitecture(BaseModel):
    """
    Everything the coding agent decides except the file list.

    The blueprint used to ride along in this same request, which made coding
    the single largest structured answer this system asks for - and the one
    that stalled hardest. Splitting the two means a timeout costs one phase
    instead of the whole project, and the architecture that did complete still
    gets used.
    """

    project_name: str = Field(
        description="Suggested project name"
    )

    tech_stack: List[str] = Field(
        description="Recommended technologies"
    )

    frontend: List[str] = Field(
        description="Frontend technologies"
    )

    backend: List[str] = Field(
        description="Backend technologies"
    )

    database: str = Field(
        description="Recommended database"
    )

    architecture: str = Field(
        description="Software architecture"
    )

    core_features: List[str] = Field(
        description="Core application features"
    )

    api_endpoints: List[str] = Field(
        description="Important API endpoints"
    )

    development_steps: List[str] = Field(
        description="Recommended implementation roadmap"
    )

    system_architecture: str = Field(
        description="High-level architecture"
    )


class FileBlueprint(BaseModel):
    """
    The planned file list on its own - the second half of the split coding
    request.

    One field instead of eleven: the answer is bounded by the number of files
    rather than by how much prose the model felt like writing, and it is the
    only place ProjectFile is ever asked for, so the two calls cannot drift
    apart on the file shape.
    """

    files: List[ProjectFile] = Field(
        description="Planned project files, dependencies listed first",
        default=[]
    )


class CodingOutput(CodingArchitecture):
    """
    The merged contract every downstream consumer reads.

    `file_generator`, `context_builder`, `save_coding_report` and the frontend
    all take this shape. It is deliberately unchanged: the coding agent now
    produces CodingArchitecture + FileBlueprint in two calls and merges them
    into this model, so nothing downstream learns the split happened.
    """

    files: List[ProjectFile] = Field(
        description="List of project files and their paths",
        default=[]
    )