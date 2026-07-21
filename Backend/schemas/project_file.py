from pydantic import BaseModel, Field

class ProjectFile(BaseModel):
    path: str=Field(description="Tells the path of the files liek where they wold exist or need to create")
    purpose: str=Field(description="Tells why we develooping this file")
    description: str=Field(description="tells what types fetures need to build in this file")