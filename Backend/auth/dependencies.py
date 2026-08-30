from fastapi import Request, HTTPException, status
from jose import JWTError

from database.database import SessionLocal
from database.models import User

from auth.security import decode_access_token


# ==========================================================
# CURRENT USER
# ==========================================================

def get_current_user(
    request: Request
):

    # Try to get token from both cookie and Authorization header
    token = request.cookies.get(
        "access_token"
    )

    if not token:
        # Try Authorization header as fallback
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.replace("Bearer ", "")

    if not token:
        # Try query parameter as fallback (for SSE requests)
        token = request.query_params.get("token")

    if not token:

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )

    try:

        payload = decode_access_token(
            token
        )

        user_id = payload.get("sub")

        if not user_id:

            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token"
            )

        user_id = int(user_id)

    except (
        JWTError,
        ValueError,
        TypeError
    ):

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token"
        )

    db = SessionLocal()

    try:

        user = (
            db.query(User)
            .filter(
                User.id == user_id
            )
            .first()
        )

        if not user:

            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )

        return user

    finally:

        db.close()