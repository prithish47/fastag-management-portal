import os
import shutil
from datetime import datetime
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Security, UploadFile, File, Form, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.utils.audit_logger import log_audit

from app.database import SessionLocal
from app.models import User, Vehicle
from app.models.activity_log_model import VehicleActivityLog
from app.models.notification_model import Notification
from app.auth.jwt_handler import verify_access_token
from pydantic import BaseModel
from app.schemas.vehicle_schema import VehicleListResponse, VehicleAddResponse

router = APIRouter(
    prefix="/vehicles",
    tags=["Vehicles"]
)

security = HTTPBearer()

from fastapi.responses import FileResponse

# ─── Constants ─────────────────────────────────────────────────────────────────
UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads" / "rc_documents"
ALLOWED_EXTENSIONS = {"pdf", "jpg", "jpeg", "png"}
ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "application/pdf"
}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB

VALID_VEHICLE_CLASSES = {"VC4", "VC5", "VC7", "VC12", "VC16"}


# ─── Dependency: DB Session ──────────────────────────────────────────────────
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def validate_rc_file(file: UploadFile, file_content: bytes):
    if not file.filename or "." not in file.filename:
        raise HTTPException(status_code=400, detail="Uploaded file is missing a file extension")
    
    ext = file.filename.rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file extension. Allowed extensions: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid MIME type. Allowed MIME types: {', '.join(ALLOWED_MIME_TYPES)}"
        )
        
    if len(file_content) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="File size exceeds the maximum limit of 5MB"
        )
        
    if len(file_content) == 0:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty"
        )


def get_current_user_or_admin(
    request: Request,
    db: Session = Depends(get_db)
) -> User:
    token = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1]
    
    if not token:
        token = request.query_params.get("token")
        
    if not token:
        raise HTTPException(status_code=401, detail="Authentication token required")
        
    payload = verify_access_token(token)
    if not payload:
        from admin_service.auth.admin_auth import verify_admin_token
        payload = verify_admin_token(token)
        
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
        
    user_id = payload.get("user_id")
    email = payload.get("sub")
    
    if user_id:
        user = db.query(User).filter(User.user_id == user_id).first()
    elif email:
        user = db.query(User).filter(User.email == email).first()
    else:
        raise HTTPException(status_code=401, detail="Invalid token payload")
        
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.account_status != "ACTIVE":
        raise HTTPException(status_code=403, detail="User account is suspended or disabled")
        
    return user


# ─── Dependency: Authenticated User from JWT ──────────────────────────────────
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: Session = Depends(get_db)
) -> User:
    token = credentials.credentials
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


# ─── Helper: Safe Filename ───────────────────────────────────────────────────
def generate_safe_filename(vehicle_number: str, original_filename: str, suffix: str = "") -> str:
    ext = original_filename.rsplit(".", 1)[-1].lower()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_number = vehicle_number.replace(" ", "").upper()
    if suffix:
        return f"{safe_number}_{suffix}_{timestamp}.{ext}"
    return f"{safe_number}_{timestamp}.{ext}"


# ─── POST /vehicles/add ───────────────────────────────────────────────────────
@router.post("/add", response_model=VehicleAddResponse, status_code=201)
async def add_vehicle(
    request: Request,
    vehicle_number: str = Form(...),
    vehicle_class: str = Form(...),
    vehicle_type: str = Form(...),
    engine_number: str = Form(...),
    chassis_number: str = Form(...),
    rc_front_file: UploadFile = File(...),
    rc_back_file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # ── Validate vehicle_class ────────────────────────────────────────────────
    if vehicle_class not in VALID_VEHICLE_CLASSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid vehicle class. Must be one of: {', '.join(VALID_VEHICLE_CLASSES)}"
        )

    # ── Validate file extensions and existence ───────────────────────────────────────────────
    if not rc_front_file.filename:
        raise HTTPException(status_code=400, detail="RC Front document file is required")
    if not rc_back_file.filename:
        raise HTTPException(status_code=400, detail="RC Back document file is required")

    front_ext = rc_front_file.filename.rsplit(".", 1)[-1].lower() if "." in rc_front_file.filename else ""
    if front_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid front file type '{front_ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    back_ext = rc_back_file.filename.rsplit(".", 1)[-1].lower() if "." in rc_back_file.filename else ""
    if back_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid back file type '{back_ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # ── Validate file sizes ────────────────────────────────────────────────────
    front_content = await rc_front_file.read()
    if len(front_content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail="RC Front file size exceeds the 10MB limit"
        )
    if len(front_content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded RC Front file is empty")

    back_content = await rc_back_file.read()
    if len(back_content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail="RC Back file size exceeds the 10MB limit"
        )
    if len(back_content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded RC Back file is empty")

    # ── Normalize inputs ──────────────────────────────────────────────────────
    vehicle_number = vehicle_number.strip().upper()
    engine_number = engine_number.strip().upper()
    chassis_number = chassis_number.strip().upper()

    # ── Check duplicate vehicle_number ────────────────────────────────────────
    existing_vn = db.query(Vehicle).filter(
        Vehicle.vehicle_number == vehicle_number
    ).first()
    if existing_vn:
        raise HTTPException(
            status_code=409,
            detail="Vehicle with this vehicle number is already registered"
        )

    # ── Check duplicate engine_number ─────────────────────────────────────────
    existing_en = db.query(Vehicle).filter(
        Vehicle.engine_number == engine_number
    ).first()
    if existing_en:
        raise HTTPException(
            status_code=409,
            detail="Vehicle with this engine number is already registered"
        )

    # ── Check duplicate chassis_number ────────────────────────────────────────
    existing_ch = db.query(Vehicle).filter(
        Vehicle.chassis_number == chassis_number
    ).first()
    if existing_ch:
        raise HTTPException(
            status_code=409,
            detail="Vehicle with this chassis number is already registered"
        )

    # ── Ensure upload directory exists ────────────────────────────────────────
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    # ── Save files to disk ─────────────────────────────────────────────────────
    safe_front_filename = generate_safe_filename(vehicle_number, rc_front_file.filename, "front")
    front_file_path = UPLOAD_DIR / safe_front_filename
    with open(front_file_path, "wb") as f:
        f.write(front_content)

    safe_back_filename = generate_safe_filename(vehicle_number, rc_back_file.filename, "back")
    back_file_path = UPLOAD_DIR / safe_back_filename
    with open(back_file_path, "wb") as f:
        f.write(back_content)

    relative_front_path = f"uploads/rc_documents/{safe_front_filename}"
    relative_back_path = f"uploads/rc_documents/{safe_back_filename}"

    new_vehicle = Vehicle(
        user_id=current_user.user_id,
        vehicle_number=vehicle_number,
        vehicle_class=vehicle_class,
        vehicle_type=vehicle_type.strip(),
        engine_number=engine_number,
        chassis_number=chassis_number,
        rc_front_path=relative_front_path,
        rc_back_path=relative_back_path,
        fastag_status="INACTIVE",
        rc_verification_status="PENDING",
        rc_uploaded_at=datetime.now()
    )

    db.add(new_vehicle)
    db.commit()
    db.refresh(new_vehicle)

    # ── Create Activity Logs ──────────────────────────────────────────────────
    log1 = VehicleActivityLog(
        vehicle_id=new_vehicle.vehicle_id,
        activity_type="VEHICLE_ADDED",
        activity_message="Vehicle registered in system"
    )
    log2 = VehicleActivityLog(
        vehicle_id=new_vehicle.vehicle_id,
        activity_type="RC_FRONT_UPLOADED",
        activity_message="Initial RC Front document uploaded for verification"
    )
    log3 = VehicleActivityLog(
        vehicle_id=new_vehicle.vehicle_id,
        activity_type="RC_BACK_UPLOADED",
        activity_message="Initial RC Back document uploaded for verification"
    )
    db.add_all([log1, log2, log3])
    db.commit()

    log_audit(
        action="VEHICLE_ADDED",
        actor_id=current_user.user_id,
        actor_email=current_user.email,
        actor_role=current_user.role,
        entity_type="Vehicle",
        entity_id=new_vehicle.vehicle_id,
        new_values={
            "vehicle_number": new_vehicle.vehicle_number,
            "vehicle_class": new_vehicle.vehicle_class,
            "vehicle_type": new_vehicle.vehicle_type,
            "rc_front_path": new_vehicle.rc_front_path,
            "rc_back_path": new_vehicle.rc_back_path
        },
        request=request
    )
    log_audit(
        action="RC_FRONT_UPLOADED",
        actor_id=current_user.user_id,
        actor_email=current_user.email,
        actor_role=current_user.role,
        entity_type="Vehicle",
        entity_id=new_vehicle.vehicle_id,
        new_values={"rc_front_path": new_vehicle.rc_front_path},
        request=request
    )
    log_audit(
        action="RC_BACK_UPLOADED",
        actor_id=current_user.user_id,
        actor_email=current_user.email,
        actor_role=current_user.role,
        entity_type="Vehicle",
        entity_id=new_vehicle.vehicle_id,
        new_values={"rc_back_path": new_vehicle.rc_back_path},
        request=request
    )

    return new_vehicle


# ─── GET /vehicles/my-vehicles ───────────────────────────────────────────────
@router.get("/my-vehicles", response_model=List[VehicleListResponse])
def get_my_vehicles(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    vehicles = (
        db.query(Vehicle)
        .filter(Vehicle.user_id == current_user.user_id)
        .order_by(Vehicle.created_at.desc())
        .all()
    )
    return vehicles

# ─── GET /vehicles/{vehicle_id} ──────────────────────────────────────────────
@router.get("/{vehicle_id}")
def get_vehicle_details(
    vehicle_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    vehicle = db.query(Vehicle).filter(
        Vehicle.vehicle_id == vehicle_id,
        Vehicle.user_id == current_user.user_id
    ).first()
    
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
        
    activities = db.query(VehicleActivityLog).filter(
        VehicleActivityLog.vehicle_id == vehicle_id
    ).order_by(VehicleActivityLog.created_at.desc()).all()
    
    return {
        "vehicle": vehicle,
        "activities": activities
    }

# ─── POST /vehicles/{vehicle_id}/rc-reupload/front ───────────────────────────
@router.post("/{vehicle_id}/rc-reupload/front")
async def reupload_rc_front(
    vehicle_id: int,
    request: Request,
    rc_front_file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    vehicle = db.query(Vehicle).filter(
        Vehicle.vehicle_id == vehicle_id,
        Vehicle.user_id == current_user.user_id
    ).first()
    
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
        
    if not rc_front_file.filename:
        raise HTTPException(status_code=400, detail="RC Front document file is required")

    file_content = await rc_front_file.read()
    validate_rc_file(rc_front_file, file_content)
        
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    safe_filename = generate_safe_filename(vehicle.vehicle_number, rc_front_file.filename, "front")
    file_path = UPLOAD_DIR / safe_filename
    
    with open(file_path, "wb") as f:
        f.write(file_content)

    relative_rc_path = f"uploads/rc_documents/{safe_filename}"
    
    # Update vehicle status
    vehicle.rc_front_path = relative_rc_path
    vehicle.rc_verification_status = "PENDING"
    vehicle.rc_uploaded_at = datetime.now()
    
    # Generate activity log
    log = VehicleActivityLog(
        vehicle_id=vehicle_id,
        activity_type="RC_FRONT_UPLOADED",
        activity_message="RC Front document reuploaded for verification"
    )
    
    db.add(log)
    db.commit()
    db.refresh(vehicle)
    
    log_audit(
        action="RC_FRONT_UPLOADED",
        actor_id=current_user.user_id,
        actor_email=current_user.email,
        actor_role=current_user.role,
        entity_type="Vehicle",
        entity_id=vehicle_id,
        new_values={"rc_front_path": relative_rc_path},
        request=request
    )
    
    return {"message": "RC Front document uploaded successfully", "rc_front_path": relative_rc_path}


# ─── POST /vehicles/{vehicle_id}/rc-reupload/back ────────────────────────────
@router.post("/{vehicle_id}/rc-reupload/back")
async def reupload_rc_back(
    vehicle_id: int,
    request: Request,
    rc_back_file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    vehicle = db.query(Vehicle).filter(
        Vehicle.vehicle_id == vehicle_id,
        Vehicle.user_id == current_user.user_id
    ).first()
    
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
        
    if not rc_back_file.filename:
        raise HTTPException(status_code=400, detail="RC Back document file is required")

    file_content = await rc_back_file.read()
    validate_rc_file(rc_back_file, file_content)
        
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    safe_filename = generate_safe_filename(vehicle.vehicle_number, rc_back_file.filename, "back")
    file_path = UPLOAD_DIR / safe_filename
    
    with open(file_path, "wb") as f:
        f.write(file_content)

    relative_rc_path = f"uploads/rc_documents/{safe_filename}"
    
    # Update vehicle status
    vehicle.rc_back_path = relative_rc_path
    vehicle.rc_verification_status = "PENDING"
    vehicle.rc_uploaded_at = datetime.now()
    
    # Generate activity log
    log = VehicleActivityLog(
        vehicle_id=vehicle_id,
        activity_type="RC_BACK_UPLOADED",
        activity_message="RC Back document reuploaded for verification"
    )
    
    db.add(log)
    db.commit()
    db.refresh(vehicle)
    
    log_audit(
        action="RC_BACK_UPLOADED",
        actor_id=current_user.user_id,
        actor_email=current_user.email,
        actor_role=current_user.role,
        entity_type="Vehicle",
        entity_id=vehicle_id,
        new_values={"rc_back_path": relative_rc_path},
        request=request
    )
    
    return {"message": "RC Back document uploaded successfully", "rc_back_path": relative_rc_path}

class VehicleStatusUpdate(BaseModel):
    status: str

@router.patch("/{vehicle_id}/status")
def update_vehicle_status(
    vehicle_id: int,
    payload: VehicleStatusUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == vehicle_id, Vehicle.user_id == current_user.user_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
        
    valid_statuses = ["ACTIVE", "INACTIVE", "DISABLED", "PENDING_REPLACEMENT"]
    if payload.status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")
        
    vehicle.fastag_status = payload.status
    vehicle.updated_at = datetime.now()
    
    activity_type = "FASTAG_UPDATED"
    if payload.status == "ACTIVE":
        activity_type = "FASTAG_ENABLED"
    elif payload.status == "DISABLED":
        activity_type = "FASTAG_DISABLED"
    elif payload.status == "PENDING_REPLACEMENT":
        activity_type = "FASTAG_REPLACED"

    log = VehicleActivityLog(
        vehicle_id=vehicle.vehicle_id,
        activity_type=activity_type,
        activity_message=f"FASTag status updated to {payload.status.replace('_', ' ')}"
    )
    db.add(log)
    
    notif = Notification(
        user_id=current_user.user_id,
        title="FASTag Status Changed",
        message=f"Your FASTag for {vehicle.vehicle_number} is now {payload.status.replace('_', ' ')}.",
        type="SYSTEM"
    )
    db.add(notif)
    
    old_status = vehicle.fastag_status
    db.commit()
    
    log_audit(
        action="FASTAG_STATUS_UPDATED",
        actor_id=current_user.user_id,
        actor_email=current_user.email,
        actor_role=current_user.role,
        entity_type="Vehicle",
        entity_id=vehicle_id,
        old_values={"fastag_status": old_status},
        new_values={"fastag_status": payload.status},
        request=request
    )
    
    return {"message": "Status updated successfully", "new_status": payload.status}


@router.get("/download/rc/{vehicle_id}/{side}")
def download_rc_document(
    vehicle_id: int,
    side: str,
    current_user: User = Depends(get_current_user_or_admin),
    db: Session = Depends(get_db)
):
    if side not in ("front", "back"):
        raise HTTPException(status_code=400, detail="Invalid side. Must be 'front' or 'back'")
        
    vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
        
    # ONLY vehicle owner OR admin can access files.
    # Database-backed role check is used for admin validation.
    if vehicle.user_id != current_user.user_id and current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Unauthorized access to this vehicle's RC document")
        
    relative_path = vehicle.rc_front_path if side == "front" else vehicle.rc_back_path
    if not relative_path:
        raise HTTPException(status_code=404, detail="RC file path not set for this vehicle")
        
    backend_root = Path(__file__).resolve().parent.parent.parent
    file_path = backend_root / relative_path
    
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="RC document file not found on disk")
        
    # Prevent directory traversal
    try:
        resolved_file = file_path.resolve()
        uploads_resolved = (backend_root / "uploads").resolve()
        if not str(resolved_file).startswith(str(uploads_resolved)):
            raise HTTPException(status_code=400, detail="Invalid file path")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid file path")
        
    return FileResponse(path=file_path)
