"""
Admin JWT Authentication
========================
Separate JWT flow for admin users.
Admin tokens include role and audience claims.
"""
from jose import jwt, JWTError
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY environment variable is missing. The application cannot start safely.")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ADMIN_TOKEN_EXPIRE_HOURS = 12


def create_admin_token(user) -> str:
    """
    Create a JWT token with admin-specific claims.
    Payload:
        sub: user email
        user_id: user ID
        role: ADMIN
        aud: admin-service
        exp: expiry timestamp
    """
    expire = datetime.utcnow() + timedelta(hours=ADMIN_TOKEN_EXPIRE_HOURS)

    payload = {
        "sub": user.email,
        "user_id": user.user_id,
        "role": "ADMIN",
        "aud": "admin-service",
        "exp": expire,
    }

    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verify_admin_token(token: str) -> dict | None:
    """
    Verify an admin JWT token.
    Validates:
        - signature
        - expiry
        - audience == 'admin-service'
        - role == 'ADMIN'
    Returns payload dict or None on failure.
    """
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
            audience="admin-service"
        )

        # Double-check role claim
        if payload.get("role") != "ADMIN":
            return None

        return payload
    except JWTError:
        return None
