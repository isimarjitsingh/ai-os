from pydantic import BaseModel, Field

class ProjectFile(BaseModel):
    path: str
    purpose: str
    category: str