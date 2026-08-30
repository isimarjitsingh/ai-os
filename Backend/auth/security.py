from datetime import datetime, timedelta, timezone

from jose import jwt
from passlib.context import CryptContext


# ==========================================================
# CONFIG
# ==========================================================

SECRET_KEY = "CHANGE_THIS_TO_A_LONG_RANDOM_SECRET_KEY"

ALGORITHM = "HS256"

ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24


# ==========================================================
# PASSWORD HASHING
# ==========================================================

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)


def hash_password(password: str) -> str:

    return pwd_context.hash(password)


def verify_password(
    plain_password: str,
    password_hash: str
) -> bool:

    return pwd_context.verify(
        plain_password,
        password_hash
    )


# ==========================================================
# JWT
# ==========================================================

def create_access_token(
    user_id: int
) -> str:

    expire = datetime.now(
        timezone.utc
    ) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload = {
        "sub": str(user_id),
        "exp": expire
    }

    token = jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    return token


def decode_access_token(
    token: str
):

    return jwt.decode(
        token,
        SECRET_KEY,
        algorithms=[ALGORITHM]
    )