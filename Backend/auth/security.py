from datetime import datetime, timedelta, timezone
import os

from dotenv import load_dotenv
from jose import jwt
from passlib.context import CryptContext


load_dotenv()

# ==========================================================
# CONFIG
# ==========================================================

_PLACEHOLDER_SECRET = "CHANGE_THIS_TO_A_LONG_RANDOM_SECRET_KEY"

# The previous value was this module's own literal, which meant every deployed
# copy shared it and anyone could mint a token for any user id. Reading it from
# the environment is only useful if a missing value is fatal rather than
# silently falling back, so this raises at import time instead.
SECRET_KEY = os.getenv("SECRET_KEY")

if not SECRET_KEY or SECRET_KEY == _PLACEHOLDER_SECRET:
    raise RuntimeError(
        "SECRET_KEY is missing or still the placeholder value. Generate one "
        "with a long random string (for example: "
        "python -c \"import secrets;print(secrets.token_urlsafe(48))\") and set "
        "it in .env locally and in your host's environment variables in "
        "production. Refusing to start: tokens minted with a known secret let "
        "anyone authenticate as any user."
    )

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