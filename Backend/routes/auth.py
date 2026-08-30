from fastapi import (
    APIRouter,
    HTTPException,
    Response,
    Depends
)

from database.database import SessionLocal

from database.crud import (
    get_user_by_email,
    create_user
)

from schemas.auth import (
    RegisterRequest,
    LoginRequest,
    UserResponse
)

from auth.security import (
    hash_password,
    verify_password,
    create_access_token
)

from auth.dependencies import get_current_user


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


# ==========================================================
# COOKIE
# ==========================================================

def set_auth_cookie(
    response: Response,
    token: str
):

    response.set_cookie(
        key="access_token",
        value=token,

        httponly=True,

        secure=False,

        samesite="lax",

        max_age=60 * 60 * 24,

        path="/"
    )


# ==========================================================
# REGISTER
# ==========================================================

@router.post("/register")
def register(
    request: RegisterRequest,
    response: Response
):

    db = SessionLocal()

    try:

        existing_user = get_user_by_email(
            db,
            request.email
        )

        if existing_user:

            raise HTTPException(
                status_code=400,
                detail="Email already registered"
            )

        password_hash = hash_password(
            request.password
        )

        user = create_user(
            db=db,
            name=request.name,
            email=request.email,
            password_hash=password_hash
        )

        token = create_access_token(
            user.id
        )

        set_auth_cookie(
            response,
            token
        )

        return {
            "success": True,
            "message": "Registration successful",
            "access_token": token,
            "user": UserResponse.model_validate(user)
        }

    finally:

        db.close()


# ==========================================================
# LOGIN
# ==========================================================

@router.post("/login")
def login(
    request: LoginRequest,
    response: Response
):

    db = SessionLocal()

    try:

        user = get_user_by_email(
            db,
            request.email
        )

        if not user:

            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )

        valid_password = verify_password(
            request.password,
            user.password_hash
        )

        if not valid_password:

            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )

        token = create_access_token(
            user.id
        )

        set_auth_cookie(
            response,
            token
        )

        return {
            "success": True,
            "message": "Login successful",
            "access_token": token,
            "user": UserResponse.model_validate(user)
        }

    finally:

        db.close()


# ==========================================================
# CURRENT USER
# ==========================================================

@router.get("/me")
def get_me(
    current_user=Depends(get_current_user)
):

    return {
        "success": True,
        "user": UserResponse.model_validate(
            current_user
        )
    }


# ==========================================================
# LOGOUT
# ==========================================================

@router.post("/logout")
def logout(
    response: Response
):

    response.delete_cookie(
        key="access_token",
        path="/"
    )

    return {
        "success": True,
        "message": "Logged out successfully"
    }