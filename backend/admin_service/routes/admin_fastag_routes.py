"""
Admin FASTag Inventory / Warehouse Routes
============================================
GET   /admin/fastag-inventory          — List all FASTag inventory items
GET   /admin/fastag-inventory/metrics  — Inventory summary metrics
GET   /admin/fastag-inventory/{tag_id} — Single FASTag detail
PATCH /admin/fastag-inventory/{tag_id}/status — Update tag status
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from pydantic import BaseModel
from app.utils.audit_logger import log_audit

from app.database import get_db
from app.models import User, Vehicle, FastagInventory
from app.models.activity_log_model import VehicleActivityLog
from app.models.notification_model import Notification
from admin_service.middleware.require_admin import get_current_admin
from admin_service.schemas.admin_schemas import (
    FastagInventoryMetrics,
    PaginatedResponse
)

router = APIRouter(tags=["Admin FASTag Inventory"])


class FastagStatusUpdateRequest(BaseModel):
    action: str  # BLACKLIST, REACTIVATE, MARK_DAMAGED


@router.get("/fastag-inventory/metrics", response_model=FastagInventoryMetrics)
def get_inventory_metrics(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get FASTag warehouse summary metrics with vehicle class distribution."""
    total = db.query(func.count(FastagInventory.id)).scalar() or 0
    unassigned = db.query(func.count(FastagInventory.id)).filter(FastagInventory.status == "UNASSIGNED").scalar() or 0
    assigned = db.query(func.count(FastagInventory.id)).filter(FastagInventory.status == "ASSIGNED").scalar() or 0
    active = db.query(func.count(FastagInventory.id)).filter(FastagInventory.status == "ACTIVE").scalar() or 0
    blacklisted = db.query(func.count(FastagInventory.id)).filter(FastagInventory.status == "BLACKLISTED").scalar() or 0
    damaged = db.query(func.count(FastagInventory.id)).filter(FastagInventory.status == "DAMAGED").scalar() or 0
    disabled = db.query(func.count(FastagInventory.id)).filter(FastagInventory.status == "DISABLED").scalar() or 0
    replaced = db.query(func.count(FastagInventory.id)).filter(FastagInventory.status == "REPLACED").scalar() or 0

    # Vehicle class distribution
    vehicle_classes = ["VC4", "VC5", "VC6", "VC7", "VC12", "VC16"]
    by_vc = {}
    for vc in vehicle_classes:
        vc_unassigned = db.query(func.count(FastagInventory.id)).filter(
            FastagInventory.vehicle_class == vc, FastagInventory.status == "UNASSIGNED"
        ).scalar() or 0
        vc_assigned = db.query(func.count(FastagInventory.id)).filter(
            FastagInventory.vehicle_class == vc, FastagInventory.status == "ASSIGNED"
        ).scalar() or 0
        vc_active = db.query(func.count(FastagInventory.id)).filter(
            FastagInventory.vehicle_class == vc, FastagInventory.status == "ACTIVE"
        ).scalar() or 0
        vc_blacklisted = db.query(func.count(FastagInventory.id)).filter(
            FastagInventory.vehicle_class == vc, FastagInventory.status == "BLACKLISTED"
        ).scalar() or 0
        vc_total = db.query(func.count(FastagInventory.id)).filter(
            FastagInventory.vehicle_class == vc
        ).scalar() or 0

        if vc_total > 0:
            by_vc[vc] = {
                "total": vc_total,
                "unassigned": vc_unassigned,
                "assigned": vc_assigned,
                "active": vc_active,
                "blacklisted": vc_blacklisted
            }

    return FastagInventoryMetrics(
        total_tags=total,
        unassigned=unassigned,
        assigned=assigned,
        active=active,
        blacklisted=blacklisted,
        damaged=damaged,
        disabled=disabled,
        replaced=replaced,
        by_vehicle_class=by_vc
    )


@router.get("/fastag-inventory/{tag_id}")
def get_fastag_detail(
    tag_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get detailed info for a single FASTag including assigned vehicle and owner."""
    tag = db.query(FastagInventory).filter(FastagInventory.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="FASTag not found")

    vehicle = None
    owner = None
    if tag.assigned_vehicle_id:
        vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == tag.assigned_vehicle_id).first()
        if vehicle:
            owner = db.query(User).filter(User.user_id == vehicle.user_id).first()

    # Build lifecycle from existing data
    lifecycle = []
    if tag.created_at:
        lifecycle.append({
            "event": "Tag Created",
            "detail": f"FASTag {tag.fastag_id} added to inventory",
            "timestamp": tag.created_at.isoformat(),
            "display_time": tag.created_at.strftime("%d %b %Y, %I:%M %p"),
        })
    if tag.issued_at:
        lifecycle.append({
            "event": "Tag Issued",
            "detail": f"Serial: {tag.tag_serial_number}",
            "timestamp": tag.issued_at.isoformat(),
            "display_time": tag.issued_at.strftime("%d %b %Y, %I:%M %p"),
        })
    if tag.activated_at:
        lifecycle.append({
            "event": "Tag Activated",
            "detail": f"Assigned to {vehicle.vehicle_number if vehicle else 'vehicle'}",
            "timestamp": tag.activated_at.isoformat(),
            "display_time": tag.activated_at.strftime("%d %b %Y, %I:%M %p"),
        })
    if tag.last_assigned_at:
        lifecycle.append({
            "event": "Tag Assigned",
            "detail": f"Assigned to {vehicle.vehicle_number if vehicle else 'vehicle'}",
            "timestamp": tag.last_assigned_at.isoformat(),
            "display_time": tag.last_assigned_at.strftime("%d %b %Y, %I:%M %p"),
        })
    if tag.is_blacklisted:
        lifecycle.append({
            "event": "Tag Blacklisted",
            "detail": "Tag was blacklisted by administrator",
            "timestamp": tag.created_at.isoformat() if tag.created_at else None,
            "display_time": "—",
        })
    if tag.status == "DAMAGED":
        lifecycle.append({
            "event": "Marked Damaged",
            "detail": "Tag marked as damaged",
            "timestamp": None,
            "display_time": "—",
        })

    lifecycle.sort(key=lambda x: x.get("timestamp") or "", reverse=False)

    return {
        "id": tag.id,
        "fastag_id": tag.fastag_id,
        "tag_serial_number": tag.tag_serial_number,
        "vehicle_class": tag.vehicle_class,
        "status": tag.status,
        "is_blacklisted": tag.is_blacklisted,
        "issued_at": tag.issued_at.strftime("%d %b %Y, %I:%M %p") if tag.issued_at else None,
        "activated_at": tag.activated_at.strftime("%d %b %Y, %I:%M %p") if tag.activated_at else None,
        "last_assigned_at": tag.last_assigned_at.strftime("%d %b %Y, %I:%M %p") if tag.last_assigned_at else None,
        "created_at": tag.created_at.strftime("%d %b %Y, %I:%M %p") if tag.created_at else None,
        "assigned_vehicle": {
            "vehicle_id": vehicle.vehicle_id,
            "vehicle_number": vehicle.vehicle_number,
            "vehicle_class": vehicle.vehicle_class,
            "fastag_status": vehicle.fastag_status,
        } if vehicle else None,
        "assigned_owner": {
            "user_id": owner.user_id,
            "full_name": owner.full_name,
            "email": owner.email,
        } if owner else None,
        "lifecycle": lifecycle,
    }


@router.patch("/fastag-inventory/{tag_id}/status")
def update_fastag_inventory_status(
    tag_id: int,
    payload: FastagStatusUpdateRequest,
    request: Request,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Admin FASTag inventory operations:
      BLACKLIST     — blacklist tag, unassign from vehicle
      REACTIVATE    — return tag to UNASSIGNED status
      MARK_DAMAGED  — mark tag as DAMAGED, unassign
    """
    valid_actions = ["BLACKLIST", "REACTIVATE", "MARK_DAMAGED"]
    if payload.action not in valid_actions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid action. Must be one of: {', '.join(valid_actions)}"
        )

    tag = db.query(FastagInventory).filter(FastagInventory.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="FASTag not found")

    old_status = tag.status

    if payload.action == "BLACKLIST":
        # Unassign from vehicle if assigned
        if tag.assigned_vehicle_id:
            vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == tag.assigned_vehicle_id).first()
            if vehicle:
                # Do NOT auto-disable vehicle, change status to FASTAG_PENDING
                vehicle.fastag_status = "FASTAG_PENDING"
                vehicle.updated_at = datetime.now()

                log = VehicleActivityLog(
                    vehicle_id=vehicle.vehicle_id,
                    activity_type="FASTAG_BLACKLISTED",
                    activity_message=f"FASTag {tag.fastag_id} blacklisted by administrator. Vehicle set to FASTAG_PENDING."
                )
                db.add(log)

                notif = Notification(
                    user_id=vehicle.user_id,
                    title="FASTag Blacklisted",
                    message=f"FASTag {tag.fastag_id} for {vehicle.vehicle_number} has been blacklisted. Please assign a new tag.",
                    type="SYSTEM"
                )
                db.add(notif)

        tag.status = "BLACKLISTED"
        tag.is_blacklisted = True
        tag.assigned_vehicle_id = None

    elif payload.action == "REACTIVATE":
        if tag.status in ("ASSIGNED", "ACTIVE"):
            raise HTTPException(status_code=400, detail="Cannot reactivate an assigned/active tag. Unassign first.")
        tag.status = "UNASSIGNED"
        tag.is_blacklisted = False

    elif payload.action == "MARK_DAMAGED":
        # Unassign from vehicle if assigned
        if tag.assigned_vehicle_id:
            vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == tag.assigned_vehicle_id).first()
            if vehicle:
                # Do NOT auto-disable vehicle, change status to FASTAG_PENDING
                vehicle.fastag_status = "FASTAG_PENDING"
                vehicle.updated_at = datetime.now()

                log = VehicleActivityLog(
                    vehicle_id=vehicle.vehicle_id,
                    activity_type="FASTAG_DAMAGED",
                    activity_message=f"FASTag {tag.fastag_id} marked as damaged. Vehicle set to FASTAG_PENDING."
                )
                db.add(log)

                notif = Notification(
                    user_id=vehicle.user_id,
                    title="FASTag Damaged",
                    message=f"FASTag {tag.fastag_id} for {vehicle.vehicle_number} has been marked as damaged. Please replace it.",
                    type="SYSTEM"
                )
                db.add(notif)

        tag.status = "DAMAGED"
        tag.assigned_vehicle_id = None

    db.commit()

    audit_action = "FASTAG_BLACKLISTED" if payload.action == "BLACKLIST" else "FASTAG_STATUS_UPDATED"
    log_audit(
        action=audit_action,
        actor_id=admin.user_id,
        actor_email=admin.email,
        actor_role=admin.role,
        entity_type="FastagInventory",
        entity_id=tag_id,
        old_values={"status": old_status},
        new_values={"status": tag.status, "action_performed": payload.action},
        request=request
    )

    return {
        "message": f"FASTag status updated from {old_status} to {tag.status}",
        "tag_id": tag_id,
        "new_status": tag.status
    }


@router.get("/fastag-inventory")
def list_fastag_inventory(
    search: Optional[str] = Query(None, description="Search by FASTag ID or serial number"),
    status_filter: Optional[str] = Query(None, description="Filter by status"),
    vc_filter: Optional[str] = Query(None, description="Filter by vehicle class"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """List all FASTag inventory items with search, filter, and pagination."""
    from sqlalchemy import or_

    query = db.query(FastagInventory)

    # Search
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                FastagInventory.fastag_id.ilike(search_term),
                FastagInventory.tag_serial_number.ilike(search_term)
            )
        )

    # Filters
    if status_filter:
        query = query.filter(FastagInventory.status == status_filter)
    if vc_filter:
        query = query.filter(FastagInventory.vehicle_class == vc_filter)

    # Count total
    total = query.count()

    # Paginate
    tags = query.order_by(FastagInventory.created_at.desc()).offset(
        (page - 1) * page_size
    ).limit(page_size).all()

    items = []
    for tag in tags:
        # Get assigned vehicle + owner info
        vehicle_number = None
        owner_name = None
        if tag.assigned_vehicle_id:
            vehicle = db.query(Vehicle).filter(
                Vehicle.vehicle_id == tag.assigned_vehicle_id
            ).first()
            if vehicle:
                vehicle_number = vehicle.vehicle_number
                owner = db.query(User).filter(User.user_id == vehicle.user_id).first()
                if owner:
                    owner_name = owner.full_name

        items.append({
            "id": tag.id,
            "fastag_id": tag.fastag_id,
            "tag_serial_number": tag.tag_serial_number,
            "vehicle_class": tag.vehicle_class,
            "status": tag.status,
            "is_blacklisted": tag.is_blacklisted,
            "assigned_vehicle_id": tag.assigned_vehicle_id,
            "assigned_vehicle_number": vehicle_number,
            "owner_name": owner_name,
            "issued_at": tag.issued_at.strftime("%d %b %Y") if tag.issued_at else None,
            "activated_at": tag.activated_at.strftime("%d %b %Y") if tag.activated_at else None,
            "last_assigned_at": tag.last_assigned_at.strftime("%d %b %Y") if tag.last_assigned_at else None,
            "created_at": tag.created_at.strftime("%d %b %Y") if tag.created_at else None,
        })

    total_pages = (total + page_size - 1) // page_size

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )

