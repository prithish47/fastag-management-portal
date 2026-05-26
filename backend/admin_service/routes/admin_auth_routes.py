"""
Admin Authentication Routes
============================
POST /admin/login — Admin-only login endpoint
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.utils.audit_logger import log_audit

from app.database import get_db
from app.models import User
from app.auth.password_handler import verify_password
from admin_service.auth.admin_auth import create_admin_token
from admin_service.schemas.admin_schemas import AdminLoginRequest, AdminLoginResponse
from app.limiter import limiter

router = APIRouter(tags=["Admin Authentication"])


@router.post("/login", response_model=AdminLoginResponse)
@limiter.limit("5/minute")
def admin_login(
    data: AdminLoginRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Admin login endpoint.
    Only users with role=ADMIN and account_status=ACTIVE can authenticate.
    Returns an admin JWT with audience='admin-service'.
    """
    # 1. Find user by email
    user = db.query(User).filter(User.email == data.email).first()

    if not user:
        log_audit(
            action="ADMIN_LOGIN_FAILED",
            actor_email=data.email,
            actor_role="ADMIN",
            new_values={"reason": "User not found"},
            request=request
        )
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials"
        )

    # 2. Verify password
    if not verify_password(data.password, user.password_hash):
        log_audit(
            action="ADMIN_LOGIN_FAILED",
            actor_id=user.user_id,
            actor_email=user.email,
            actor_role="ADMIN",
            new_values={"reason": "Invalid password"},
            request=request
        )
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials"
        )

    # 3. Check role
    if user.role != "ADMIN":
        log_audit(
            action="ADMIN_LOGIN_FAILED",
            actor_id=user.user_id,
            actor_email=user.email,
            actor_role=user.role,
            new_values={"reason": "Access denied. Admin privileges required."},
            request=request
        )
        raise HTTPException(
            status_code=403,
            detail="Access denied. Admin privileges required."
        )

    # 4. Check account status
    if user.account_status != "ACTIVE":
        log_audit(
            action="ADMIN_LOGIN_FAILED",
            actor_id=user.user_id,
            actor_email=user.email,
            actor_role=user.role,
            new_values={"reason": "Admin account is suspended or disabled."},
            request=request
        )
        raise HTTPException(
            status_code=403,
            detail="Admin account is suspended or disabled."
        )

    # 5. Generate admin token
    token = create_admin_token(user)

    log_audit(
        action="ADMIN_LOGIN",
        actor_id=user.user_id,
        actor_email=user.email,
        actor_role="ADMIN",
        request=request
    )

    return AdminLoginResponse(
        access_token=token,
        admin_name=user.full_name
    )
