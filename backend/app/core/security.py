from datetime import datetime, timedelta, timezone
import jwt
import bcrypt

import os
import warnings
from dotenv import load_dotenv

load_dotenv()

# Single source of truth for "am I in demo/dev mode?". When false (the default),
# the app is production-hardened: no seeded demo accounts, no login backdoor,
# and a real JWT_SECRET_KEY is mandatory.
ENABLE_DEMO_USERS = os.getenv("ENABLE_DEMO_USERS", "false").lower() == "true"

SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    if ENABLE_DEMO_USERS:
        warnings.warn(
            "JWT_SECRET_KEY not set — using insecure demo fallback because "
            "ENABLE_DEMO_USERS=true. NEVER do this in production.",
            RuntimeWarning,
            stacklevel=1,
        )
        SECRET_KEY = "super-secret-key-for-demo"
    else:
        raise RuntimeError(
            "JWT_SECRET_KEY is not set. Generate one and put it in the "
            "environment before starting the server, e.g.:\n"
            "  python -c \"import secrets; print(secrets.token_urlsafe(64))\"\n"
            "For local development only, set ENABLE_DEMO_USERS=true to allow an "
            "insecure fallback key."
        )

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
REFRESH_TOKEN_EXPIRE_DAYS = 7


def verify_password(plain_password, hashed_password):
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


def get_password_hash(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
