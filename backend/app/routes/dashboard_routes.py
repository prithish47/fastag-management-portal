from fastapi import APIRouter, Depends, HTTPException, Security, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import User, Vehicle
from app.schemas.user_schema import DashboardDataResponse, AlertSettingsRequest
from app.auth.jwt_handler import get_email_from_unverified_token, verify_access_token
from app.utils.audit_logger import log_audit

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)

security = HTTPBearer()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security), db: Session = Depends(get_db)):
    token = credentials.credentials
    # In a real app we verify signature strictly. Here we use verify_access_token logic from auth_routes
    # Assuming standard access token verification (not the dynamic reset token one)
    payload = verify_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    email = payload.get("sub")
    if not email:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user

@router.get("/me", response_model=DashboardDataResponse)
def get_dashboard_data(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # We map the SQLAlchemy models to the Pydantic schema
    # Pydantic's from_attributes=True (orm_mode) will handle the translation.
    
    # Let's explicitly format it
    vehicles_data = []
    for v in current_user.vehicles:
        vehicles_data.append({
            "vehicle_id": v.vehicle_id,
            "vehicle_number": v.vehicle_number,
            "vehicle_class": v.vehicle_class,
            "vehicle_type": v.vehicle_type,
            "fastag_status": v.fastag_status or "INACTIVE",
            "rc_verification_status": v.rc_verification_status or "PENDING"
        })
        
    return DashboardDataResponse(
        full_name=current_user.full_name,
        email=current_user.email,
        mobile_number=current_user.mobile_number,
        wallet_balance=float(current_user.wallet_balance),
        vehicles=vehicles_data,
        low_balance_alert_enabled=bool(current_user.low_balance_alert_enabled),
        low_balance_threshold=float(current_user.low_balance_threshold or 100.00)
    )

@router.put("/alert-settings")
def update_alert_settings(
    payload: AlertSettingsRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    old_enabled = bool(current_user.low_balance_alert_enabled)
    old_threshold = float(current_user.low_balance_threshold or 100.0)
    
    current_user.low_balance_alert_enabled = payload.enabled
    current_user.low_balance_threshold = payload.threshold
    db.commit()
    
    log_audit(
        action="LOW_BALANCE_ALERT_SETTINGS_UPDATED",
        actor_id=current_user.user_id,
        actor_email=current_user.email,
        actor_role=current_user.role,
        entity_type="User",
        entity_id=current_user.user_id,
        old_values={
            "low_balance_alert_enabled": old_enabled,
            "low_balance_threshold": old_threshold
        },
        new_values={
            "low_balance_alert_enabled": payload.enabled,
            "low_balance_threshold": float(payload.threshold)
        },
        request=request
    )
    
    return {
        "message": "Alert settings updated successfully",
        "low_balance_alert_enabled": current_user.low_balance_alert_enabled,
        "low_balance_threshold": float(current_user.low_balance_threshold)
    }

