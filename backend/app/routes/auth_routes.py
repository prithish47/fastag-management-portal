from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.utils.audit_logger import log_audit
import secrets
from datetime import datetime, timedelta
from app.limiter import limiter

from app.database import SessionLocal
from app.models import User
from app.utils.email_helper import send_password_reset_email

from app.schemas.user_schema import (
    UserRegister,
    UserLogin,
    ForgotPasswordSchema,
    ResetPasswordSchema
)

from app.auth.password_handler import (
    hash_password,
    verify_password
)

from app.auth.jwt_handler import (
    create_access_token,
    create_reset_token,
    verify_reset_token,
    get_email_from_unverified_token
)

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

def get_db():

    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()

@router.post("/register")
def register_user(
    user: UserRegister,
    request: Request,
    db: Session = Depends(get_db)
):

    existing_email = db.query(User).filter(
        User.email == user.email
    ).first()

    if existing_email:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    existing_mobile = db.query(User).filter(
        User.mobile_number == user.mobile_number
    ).first()

    if existing_mobile:
        raise HTTPException(
            status_code=400,
            detail="Mobile number already registered"
        )

    hashed_pw = hash_password(user.password)

    new_user = User(
        full_name=user.full_name,
        email=user.email,
        mobile_number=user.mobile_number,
        password_hash=hashed_pw,
        address=user.address
    )

    db.add(new_user)

    db.commit()

    db.refresh(new_user)

    log_audit(
        action="USER_REGISTER",
        actor_id=new_user.user_id,
        actor_email=new_user.email,
        actor_role="USER",
        entity_type="User",
        entity_id=new_user.user_id,
        new_values={
            "full_name": new_user.full_name,
            "email": new_user.email,
            "mobile_number": new_user.mobile_number,
            "role": new_user.role
        },
        request=request
    )

    return {
        "message": "User registered successfully"
    }

@router.post("/login")
@limiter.limit("5/minute")
def login_user(
    user: UserLogin,
    request: Request,
    db: Session = Depends(get_db)
):

    existing_user = db.query(User).filter(
        User.email == user.email
    ).first()

    if not existing_user:
        log_audit(
            action="USER_LOGIN_FAILED",
            actor_email=user.email,
            actor_role="USER",
            new_values={"reason": "User not found"},
            request=request
        )
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    valid_password = verify_password(
        user.password,
        existing_user.password_hash
    )

    if not valid_password:
        log_audit(
            action="USER_LOGIN_FAILED",
            actor_id=existing_user.user_id,
            actor_email=existing_user.email,
            actor_role=existing_user.role,
            new_values={"reason": "Invalid password"},
            request=request
        )
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    token = create_access_token({
        "sub": existing_user.email
    })

    log_audit(
        action="USER_LOGIN",
        actor_id=existing_user.user_id,
        actor_email=existing_user.email,
        actor_role=existing_user.role,
        request=request
    )

    return {
        "access_token": token,
        "token_type": "bearer"
    }

@router.post("/forgot-password")
@limiter.limit("3/minute")
def forgot_password(
    data: ForgotPasswordSchema,
    request: Request,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == data.email).first()
    if user:
        # Generate a secure reset token
        reset_token = secrets.token_hex(32)
        # Expiry: 15 minutes from now
        user.password_reset_token = reset_token
        user.password_reset_expires = datetime.now() + timedelta(minutes=15)
        db.commit()
        
        # Build reset link using path route
        reset_link = f"http://localhost:5173/reset-password/{reset_token}"
        # Send/Simulate email
        send_password_reset_email(user.email, user.full_name, reset_link)
        
        log_audit(
            action="PASSWORD_RESET_REQUESTED",
            actor_id=user.user_id,
            actor_email=user.email,
            actor_role=user.role,
            entity_type="User",
            entity_id=user.user_id,
            request=request
        )
    else:
        log_audit(
            action="PASSWORD_RESET_REQUEST_FAILED",
            actor_email=data.email,
            actor_role="USER",
            new_values={"reason": "Email not registered"},
            request=request
        )
    
    # Always return success to prevent email enumeration
    return {"message": "If the email is registered, a password reset link has been sent to it."}

@router.post("/reset-password")
def reset_password(
    data: ResetPasswordSchema,
    request: Request,
    db: Session = Depends(get_db)
):
    # Find user with matching token that hasn't expired yet
    user = db.query(User).filter(
        User.password_reset_token == data.token,
        User.password_reset_expires > datetime.now()
    ).first()
    
    if not user:
        log_audit(
            action="PASSWORD_RESET_FAILED",
            actor_role="USER",
            new_values={"reason": "Invalid or expired token"},
            request=request
        )
        raise HTTPException(
            status_code=400,
            detail="The password reset link is invalid, has expired, or has already been used."
        )
    
    hashed_pw = hash_password(data.new_password)
    user.password_hash = hashed_pw
    # Invalidate token immediately
    user.password_reset_token = None
    user.password_reset_expires = None
    db.commit()
    
    log_audit(
        action="PASSWORD_RESET_COMPLETED",
        actor_id=user.user_id,
        actor_email=user.email,
        actor_role=user.role,
        entity_type="User",
        entity_id=user.user_id,
        request=request
    )
    
    return {"message": "Password reset successfully. You can now log in with your new password."}