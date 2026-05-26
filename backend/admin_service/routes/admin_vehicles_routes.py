"""
Admin Vehicle Management Routes
=================================
GET    /admin/vehicles                         — List all vehicles
GET    /admin/vehicles/{vehicle_id}            — Vehicle detail
PATCH  /admin/vehicles/{vehicle_id}/fastag     — Enable/disable/replace FASTag
PATCH  /admin/vehicles/{vehicle_id}/rc-status  — Approve/reject RC
"""
import random
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import Optional
from app.utils.audit_logger import log_audit

from app.database import get_db
from app.models import User, Vehicle, FastagInventory
from app.models.activity_log_model import VehicleActivityLog
from app.models.notification_model import Notification
from admin_service.middleware.require_admin import get_current_admin
from admin_service.schemas.admin_schemas import (
    FastagStatusUpdateRequest,
    RcStatusUpdateRequest,
    PaginatedResponse
)

router = APIRouter(tags=["Admin Vehicles"])


@router.get("/vehicles")
def list_vehicles(
    search: Optional[str] = Query(None, description="Search by vehicle number or owner"),
    fastag_filter: Optional[str] = Query(None, description="Filter by FASTag status"),
    rc_filter: Optional[str] = Query(None, description="Filter by RC status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """List all vehicles with search, filter, and pagination."""
    query = db.query(Vehicle, User).join(User, Vehicle.user_id == User.user_id)

    # Search
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Vehicle.vehicle_number.ilike(search_term),
                User.full_name.ilike(search_term),
                User.email.ilike(search_term)
            )
        )

    # Filters
    if fastag_filter:
        query = query.filter(Vehicle.fastag_status == fastag_filter)
    if rc_filter:
        query = query.filter(Vehicle.rc_verification_status == rc_filter)

    # Count total
    total = query.count()

    # Paginate
    results = query.order_by(Vehicle.created_at.desc()).offset(
        (page - 1) * page_size
    ).limit(page_size).all()

    items = []
    for vehicle, owner in results:
        # Get last activity
        last_log = db.query(VehicleActivityLog).filter(
            VehicleActivityLog.vehicle_id == vehicle.vehicle_id
        ).order_by(VehicleActivityLog.created_at.desc()).first()

        # Get assigned FASTag
        assigned_tag = db.query(FastagInventory).filter(
            FastagInventory.assigned_vehicle_id == vehicle.vehicle_id,
            FastagInventory.status.in_(["ASSIGNED", "ACTIVE", "DISABLED"])
        ).first()

        items.append({
            "vehicle_id": vehicle.vehicle_id,
            "vehicle_number": vehicle.vehicle_number,
            "vehicle_class": vehicle.vehicle_class,
            "vehicle_type": vehicle.vehicle_type,
            "fastag_status": vehicle.fastag_status or "INACTIVE",
            "rc_verification_status": vehicle.rc_verification_status or "PENDING",
            "owner_name": owner.full_name,
            "owner_email": owner.email,
            "owner_id": owner.user_id,
            "wallet_balance": float(owner.wallet_balance or 0),
            "wallet_sufficient": float(owner.wallet_balance or 0) >= 100,
            "last_activity": last_log.created_at.strftime("%d %b %Y, %I:%M %p") if last_log and last_log.created_at else None,
            "fastag_id": assigned_tag.fastag_id if assigned_tag else None,
        })

    total_pages = (total + page_size - 1) // page_size

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/vehicles/{vehicle_id}")
def get_vehicle_detail(
    vehicle_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get detailed vehicle information including owner and activity logs."""
    vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    owner = db.query(User).filter(User.user_id == vehicle.user_id).first()

    activities = db.query(VehicleActivityLog).filter(
        VehicleActivityLog.vehicle_id == vehicle_id
    ).order_by(VehicleActivityLog.created_at.desc()).limit(20).all()

    assigned_tag = db.query(FastagInventory).filter(
        FastagInventory.assigned_vehicle_id == vehicle_id,
        FastagInventory.status.in_(["ASSIGNED", "ACTIVE", "DISABLED"])
    ).first()

    return {
        "vehicle": {
            "vehicle_id": vehicle.vehicle_id,
            "vehicle_number": vehicle.vehicle_number,
            "vehicle_class": vehicle.vehicle_class,
            "vehicle_type": vehicle.vehicle_type,
            "engine_number": vehicle.engine_number,
            "chassis_number": vehicle.chassis_number,
            "fastag_status": vehicle.fastag_status,
            "rc_verification_status": vehicle.rc_verification_status,
            "rc_front_path": vehicle.rc_front_path,
            "rc_back_path": vehicle.rc_back_path,
            "created_at": vehicle.created_at.strftime("%d %b %Y, %I:%M %p") if vehicle.created_at else None,
        },
        "owner": {
            "user_id": owner.user_id,
            "full_name": owner.full_name,
            "email": owner.email,
            "wallet_balance": float(owner.wallet_balance or 0),
        } if owner else None,
        "assigned_fastag": {
            "fastag_id": assigned_tag.fastag_id,
            "tag_serial_number": assigned_tag.tag_serial_number,
            "status": assigned_tag.status,
            "is_blacklisted": assigned_tag.is_blacklisted,
            "activated_at": assigned_tag.activated_at.strftime("%d %b %Y, %I:%M %p") if assigned_tag and assigned_tag.activated_at else None,
            "last_assigned_at": assigned_tag.last_assigned_at.strftime("%d %b %Y, %I:%M %p") if assigned_tag and assigned_tag.last_assigned_at else None,
        } if assigned_tag else None,
        "activities": [
            {
                "log_id": a.log_id,
                "activity_type": a.activity_type,
                "activity_message": a.activity_message,
                "created_at": a.created_at.strftime("%d %b %Y, %I:%M %p") if a.created_at else None,
            }
            for a in activities
        ]
    }


@router.patch("/vehicles/{vehicle_id}/fastag")
def update_fastag_status(
    vehicle_id: int,
    payload: FastagStatusUpdateRequest,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Admin FASTag operations:
      ENABLE   — activate FASTag on vehicle
      DISABLE  — disable FASTag on vehicle
      REPLACE  — blacklist old tag, assign new tag from inventory
    """
    valid_actions = ["ENABLE", "DISABLE", "REPLACE"]
    if payload.action not in valid_actions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid action. Must be one of: {', '.join(valid_actions)}"
        )

    vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    if payload.action == "ENABLE":
        assigned_tag = db.query(FastagInventory).filter(
            FastagInventory.assigned_vehicle_id == vehicle_id,
            FastagInventory.status.in_(["ASSIGNED", "ACTIVE", "DISABLED"])
        ).first()
        if not assigned_tag:
            raise HTTPException(
                status_code=400,
                detail="Cannot enable FASTag. No FASTag is assigned to this vehicle."
            )

        vehicle.fastag_status = "ACTIVE"
        vehicle.updated_at = datetime.now()
        assigned_tag.status = "ACTIVE"
        assigned_tag.last_assigned_at = datetime.now()

        log = VehicleActivityLog(
            vehicle_id=vehicle_id,
            activity_type="FASTAG_ENABLED",
            activity_message="FASTag activated by administrator"
        )
        db.add(log)

        notif = Notification(
            user_id=vehicle.user_id,
            title="FASTag Activated",
            message=f"FASTag for {vehicle.vehicle_number} has been activated by administrator.",
            type="SYSTEM"
        )
        db.add(notif)

    elif payload.action == "DISABLE":
        vehicle.fastag_status = "DISABLED"
        vehicle.updated_at = datetime.now()

        # Also update inventory tag if assigned
        assigned_tag = db.query(FastagInventory).filter(
            FastagInventory.assigned_vehicle_id == vehicle_id,
            FastagInventory.status.in_(["ASSIGNED", "ACTIVE"])
        ).first()
        if assigned_tag:
            assigned_tag.status = "DISABLED"

        log = VehicleActivityLog(
            vehicle_id=vehicle_id,
            activity_type="FASTAG_DISABLED",
            activity_message="FASTag disabled by administrator"
        )
        db.add(log)

        notif = Notification(
            user_id=vehicle.user_id,
            title="FASTag Disabled",
            message=f"FASTag for {vehicle.vehicle_number} has been disabled by administrator.",
            type="SYSTEM"
        )
        db.add(notif)

    elif payload.action == "REPLACE":
        # 1. Mark old tag as REPLACED and unlink it
        old_tag = db.query(FastagInventory).filter(
            FastagInventory.assigned_vehicle_id == vehicle_id,
            FastagInventory.status.in_(["ASSIGNED", "ACTIVE", "DISABLED"])
        ).first()

        if old_tag:
            old_tag.status = "REPLACED"
            old_tag.assigned_vehicle_id = None

        # 2. Find available tag with matching vehicle class (UNASSIGNED)
        new_tag = db.query(FastagInventory).filter(
            FastagInventory.status == "UNASSIGNED",
            FastagInventory.vehicle_class == vehicle.vehicle_class
        ).first()

        if not new_tag:
            # Try any available tag regardless of class
            new_tag = db.query(FastagInventory).filter(
                FastagInventory.status == "UNASSIGNED"
            ).first()

        if not new_tag:
            raise HTTPException(
                status_code=409,
                detail="No available FASTags in inventory for replacement"
            )

        # 3. Assign new tag in ACTIVE state
        new_tag.status = "ACTIVE"
        new_tag.assigned_vehicle_id = vehicle_id
        new_tag.activated_at = datetime.now()
        new_tag.issued_at = datetime.now()
        new_tag.last_assigned_at = datetime.now()

        # 4. Update vehicle
        vehicle.fastag_status = "ACTIVE"
        vehicle.updated_at = datetime.now()

        log = VehicleActivityLog(
            vehicle_id=vehicle_id,
            activity_type="FASTAG_REPLACED",
            activity_message=f"FASTag replaced by administrator. New tag: {new_tag.fastag_id}"
        )
        db.add(log)

        notif = Notification(
            user_id=vehicle.user_id,
            title="FASTag Replaced",
            message=f"FASTag for {vehicle.vehicle_number} has been replaced. New FASTag ID: {new_tag.fastag_id}",
            type="SYSTEM"
        )
        db.add(notif)

    db.commit()

    return {
        "message": f"FASTag {payload.action} completed successfully",
        "vehicle_id": vehicle_id,
        "new_fastag_status": vehicle.fastag_status
    }


@router.patch("/vehicles/{vehicle_id}/rc-status")
def update_rc_status(
    vehicle_id: int,
    payload: RcStatusUpdateRequest,
    request: Request,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Approve, reject, or force re-review of RC verification for a vehicle."""
    valid_statuses = ["VERIFIED", "REJECTED", "PENDING"]
    if payload.status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
        )

    vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    old_status = vehicle.rc_verification_status
    vehicle.rc_verification_status = payload.status
    vehicle.updated_at = datetime.now()

    auto_assigned_tag_id = None

    if payload.status == "PENDING":
        # Optionally, we could delete the physical files from disk here.
        # But since the user might want to preserve files if we force a review from status active/rejected,
        # we will just nullify the paths. (The clear endpoints will handle physical deletion).
        vehicle.rc_front_path = None
        vehicle.rc_back_path = None
        vehicle.rc_uploaded_at = None
        activity_type = "RC_REVIEW_REQUESTED"
        activity_msg = "Administrator requested re-upload of RC document"
        notif_msg = f"Your RC document for {vehicle.vehicle_number} requires re-upload and review. Please upload a clear copy from your dashboard."
    else:
        activity_type = "RC_VERIFIED" if payload.status == "VERIFIED" else "RC_REJECTED"
        activity_msg = (
            "RC document verified by administrator"
            if payload.status == "VERIFIED"
            else "RC document rejected by administrator"
        )
        notif_msg = f"RC document for {vehicle.vehicle_number} has been {payload.status.lower()} by administrator."

        if payload.status == "VERIFIED":
            vehicle.fastag_status = "ACTIVE"
            # Assign FASTag automatically if not already assigned
            existing_tag = db.query(FastagInventory).filter(
                FastagInventory.assigned_vehicle_id == vehicle_id,
                FastagInventory.status.in_(["ASSIGNED", "ACTIVE"])
            ).first()

            if existing_tag:
                existing_tag.status = "ACTIVE"
                existing_tag.last_assigned_at = datetime.now()
            else:
                # Find available tag with matching vehicle class
                new_tag = db.query(FastagInventory).filter(
                    FastagInventory.status == "UNASSIGNED",
                    FastagInventory.vehicle_class == vehicle.vehicle_class
                ).first()

                if not new_tag:
                    # Try any available tag regardless of class
                    new_tag = db.query(FastagInventory).filter(
                        FastagInventory.status == "UNASSIGNED"
                    ).first()

                if not new_tag:
                    # Do NOT fail. Change status to FASTAG_PENDING and log it
                    vehicle.fastag_status = "FASTAG_PENDING"
                    fastag_log = VehicleActivityLog(
                        vehicle_id=vehicle_id,
                        activity_type="FASTAG_ASSIGNMENT_PENDING",
                        activity_message="RC approved but no available FASTags in inventory. Vehicle set to FASTAG_PENDING."
                    )
                    db.add(fastag_log)
                else:
                    # Assign tag in ACTIVE state
                    new_tag.status = "ACTIVE"
                    new_tag.assigned_vehicle_id = vehicle_id
                    new_tag.activated_at = datetime.now()
                    new_tag.issued_at = datetime.now()
                    new_tag.last_assigned_at = datetime.now()
                    auto_assigned_tag_id = new_tag.fastag_id

                    # Log FASTag assignment activity
                    fastag_log = VehicleActivityLog(
                        vehicle_id=vehicle_id,
                        activity_type="FASTAG_ENABLED",
                        activity_message=f"FASTag ({new_tag.fastag_id}) automatically assigned and activated upon RC approval"
                    )
                    db.add(fastag_log)

    log = VehicleActivityLog(
        vehicle_id=vehicle_id,
        activity_type=activity_type,
        activity_message=activity_msg
    )
    db.add(log)

    notif = Notification(
        user_id=vehicle.user_id,
        title="RC Verification Update",
        message=notif_msg,
        type="VEHICLE"
    )
    db.add(notif)

    db.commit()

    log_audit(
        action="RC_VERIFICATION_STATUS_UPDATED",
        actor_id=admin.user_id,
        actor_email=admin.email,
        actor_role=admin.role,
        entity_type="Vehicle",
        entity_id=vehicle_id,
        old_values={"rc_verification_status": old_status},
        new_values={"rc_verification_status": payload.status},
        request=request
    )

    if auto_assigned_tag_id:
        log_audit(
            action="FASTAG_AUTO_ASSIGNED",
            actor_id=admin.user_id,
            actor_email=admin.email,
            actor_role=admin.role,
            entity_type="Vehicle",
            entity_id=vehicle_id,
            new_values={"fastag_id": auto_assigned_tag_id},
            request=request
        )

    return {
        "message": f"RC status updated from {old_status} to {payload.status}",
        "vehicle_id": vehicle_id,
        "new_rc_status": payload.status
    }


from pydantic import BaseModel
import os
from pathlib import Path

class ClearRcRequest(BaseModel):
    reason: Optional[str] = None


@router.patch("/vehicles/{vehicle_id}/clear-rc/front")
def clear_rc_front(
    vehicle_id: int,
    payload: ClearRcRequest,
    request: Request,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    old_front_path = vehicle.rc_front_path

    # Delete file from disk if exists
    if vehicle.rc_front_path:
        file_path = Path(vehicle.rc_front_path)
        if file_path.exists():
            try:
                file_path.unlink()
            except Exception as e:
                print(f"Failed to delete file {file_path}: {e}")

    # Remove from DB & set status to PENDING
    vehicle.rc_front_path = None
    vehicle.rc_verification_status = "PENDING"
    vehicle.updated_at = datetime.now()

    # Log activity
    log = VehicleActivityLog(
        vehicle_id=vehicle_id,
        activity_type="RC_FRONT_REMOVED_BY_ADMIN",
        activity_message=f"RC Front image cleared by administrator. Reason: {payload.reason or 'No reason provided'}"
    )
    db.add(log)

    # User notification
    notif_reason = f"because: {payload.reason}" if payload.reason else "because the uploaded image was unclear"
    notif_msg = f"Your RC Front image was removed {notif_reason}. Please upload a clearer image for verification."
    notif = Notification(
        user_id=vehicle.user_id,
        title="RC Front Upload Removed",
        message=notif_msg,
        type="VEHICLE"
    )
    db.add(notif)
    db.commit()

    log_audit(
        action="RC_FRONT_REMOVED_BY_ADMIN",
        actor_id=admin.user_id,
        actor_email=admin.email,
        actor_role=admin.role,
        entity_type="Vehicle",
        entity_id=vehicle_id,
        old_values={"rc_front_path": old_front_path},
        new_values={
            "rc_front_path": None,
            "rc_verification_status": "PENDING",
            "reason": payload.reason
        },
        request=request
    )

    return {"message": "RC Front image cleared successfully", "vehicle_id": vehicle_id}


@router.patch("/vehicles/{vehicle_id}/clear-rc/back")
def clear_rc_back(
    vehicle_id: int,
    payload: ClearRcRequest,
    request: Request,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    old_back_path = vehicle.rc_back_path

    # Delete file from disk if exists
    if vehicle.rc_back_path:
        file_path = Path(vehicle.rc_back_path)
        if file_path.exists():
            try:
                file_path.unlink()
            except Exception as e:
                print(f"Failed to delete file {file_path}: {e}")

    # Remove from DB & set status to PENDING
    vehicle.rc_back_path = None
    vehicle.rc_verification_status = "PENDING"
    vehicle.updated_at = datetime.now()

    # Log activity
    log = VehicleActivityLog(
        vehicle_id=vehicle_id,
        activity_type="RC_BACK_REMOVED_BY_ADMIN",
        activity_message=f"RC Back image cleared by administrator. Reason: {payload.reason or 'No reason provided'}"
    )
    db.add(log)

    # User notification
    notif_reason = f"because: {payload.reason}" if payload.reason else "because the uploaded image was unclear"
    notif_msg = f"Your RC Back image was removed {notif_reason}. Please upload a clearer image for verification."
    notif = Notification(
        user_id=vehicle.user_id,
        title="RC Back Upload Removed",
        message=notif_msg,
        type="VEHICLE"
    )
    db.add(notif)
    db.commit()

    log_audit(
        action="RC_BACK_REMOVED_BY_ADMIN",
        actor_id=admin.user_id,
        actor_email=admin.email,
        actor_role=admin.role,
        entity_type="Vehicle",
        entity_id=vehicle_id,
        old_values={"rc_back_path": old_back_path},
        new_values={
            "rc_back_path": None,
            "rc_verification_status": "PENDING",
            "reason": payload.reason
        },
        request=request
    )

    return {"message": "RC Back image cleared successfully", "vehicle_id": vehicle_id}


@router.get("/review-queue")
def get_review_queue(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Returns a list of vehicles that require admin review/action.
    Only vehicles with rc_verification_status == "PENDING" and both RC paths uploaded (not null/empty) are returned.
    """
    vehicles = db.query(Vehicle, User).join(User, Vehicle.user_id == User.user_id).filter(
        Vehicle.rc_verification_status == "PENDING",
        Vehicle.rc_front_path.isnot(None),
        Vehicle.rc_front_path != "",
        Vehicle.rc_back_path.isnot(None),
        Vehicle.rc_back_path != ""
    ).all()

    queue_items = []
    for vehicle, owner in vehicles:
        # Get assigned FASTag
        assigned_tag = db.query(FastagInventory).filter(
            FastagInventory.assigned_vehicle_id == vehicle.vehicle_id,
            FastagInventory.status.in_(["ASSIGNED", "ACTIVE", "DISABLED"])
        ).first()

        queue_items.append({
            "vehicle_id": vehicle.vehicle_id,
            "vehicle_number": vehicle.vehicle_number,
            "owner_name": owner.full_name,
            "fastag_id": assigned_tag.fastag_id if assigned_tag else None,
            "review_type": "RC_PENDING",
            "created_at": vehicle.rc_uploaded_at.isoformat() if vehicle.rc_uploaded_at else vehicle.created_at.isoformat(),
            "rc_verification_status": vehicle.rc_verification_status or "PENDING",
            "fastag_status": vehicle.fastag_status or "INACTIVE"
        })

    # Sort queue items by created_at ascending (oldest first)
    queue_items.sort(key=lambda x: x["created_at"] or "")

    return queue_items


