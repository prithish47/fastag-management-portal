"""
Admin Middleware — require_admin dependency
============================================
FastAPI dependency that:
  1. Extracts Bearer token
  2. Validates admin JWT (signature, expiry, audience, role)
  3. Loads admin user from DB
  4. Rejects non-admins with 403
"""
from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from admin_service.auth.admin_auth import verify_admin_token

security = HTTPBearer()


def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency that validates admin JWT and returns the admin User.
    Use as: admin = Depends(get_current_admin)
    """
    token = credentials.credentials
    payload = verify_admin_token(token)

    if not payload:
        raise HTTPException(
            status_code=403,
            detail="Invalid or expired admin token. Access denied."
        )

    # Validate required claims
    user_id = payload.get("user_id")
    role = payload.get("role")

    if not user_id or role != "ADMIN":
        raise HTTPException(
            status_code=403,
            detail="Insufficient permissions. Admin access required."
        )

    # Load user from DB and double-check role
    user = db.query(User).filter(User.user_id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="Admin user not found."
        )

    if user.role != "ADMIN":
        raise HTTPException(
            status_code=403,
            detail="User does not have admin privileges."
        )

    if user.account_status != "ACTIVE":
        raise HTTPException(
            status_code=403,
            detail="Admin account is suspended or disabled."
        )

    return user
