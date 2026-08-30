from pydantic import BaseModel, EmailStr, ConfigDict


# ==========================================================
# REGISTER
# ==========================================================

class RegisterRequest(BaseModel):

    name: str

    email: EmailStr

    password: str


# ==========================================================
# LOGIN
# ==========================================================

class LoginRequest(BaseModel):

    email: EmailStr

    password: str


# ==========================================================
# USER RESPONSE
# ==========================================================

class UserResponse(BaseModel):

    id: int

    name: str

    email: EmailStr

    model_config = ConfigDict(
        from_attributes=True
    )