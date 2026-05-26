"""
Admin Activity Feed and Audit Log Routes
=========================================
GET /admin/activity-feed — Recent global activity logs
GET /admin/audit-logs    — Immutable audit log system
"""
import json
from datetime import datetime
from fastapi import APIRouter, Depends, Query, Request, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional, List

from app.database import get_db
from app.models import User, Vehicle
from app.models.audit_log_model import AuditLog
from app.models.activity_log_model import VehicleActivityLog
from app.utils.audit_logger import log_audit
from admin_service.middleware.require_admin import get_current_admin

router = APIRouter(tags=["Admin Activity Feed & Audit Logs"])


@router.get("/activity-feed")
def get_activity_feed(
    limit: int = Query(50, ge=1, le=100),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Returns the latest activity logs across ALL vehicles,
    joined with vehicle and user data for the live ops feed.
    """
    results = (
        db.query(VehicleActivityLog, Vehicle, User)
        .join(Vehicle, VehicleActivityLog.vehicle_id == Vehicle.vehicle_id)
        .join(User, Vehicle.user_id == User.user_id)
        .order_by(VehicleActivityLog.created_at.desc())
        .limit(limit)
        .all()
    )

    feed = []
    for log, vehicle, user in results:
        feed.append({
            "log_id": log.log_id,
            "activity_type": log.activity_type,
            "activity_message": log.activity_message,
            "vehicle_number": vehicle.vehicle_number,
            "vehicle_id": vehicle.vehicle_id,
            "owner_name": user.full_name,
            "owner_id": user.user_id,
            "created_at": log.created_at.strftime("%d %b %Y, %I:%M %p") if log.created_at else None,
            "timestamp_iso": log.created_at.isoformat() if log.created_at else None,
        })

    return feed


@router.get("/audit-logs")
def get_audit_logs(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    actor_role: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Retrieves read-only system audit logs.
    Captures actor, action, target entity, state changes, network metadata, and timestamps.
    """
    # Log the view action if we're requesting the first page
    if page == 1:
        log_audit(
            action="VIEW_AUDIT_LOGS",
            actor_id=admin.user_id,
            actor_email=admin.email,
            actor_role=admin.role,
            request=request
        )

    query = db.query(AuditLog)

    # Apply filters
    if actor_role:
        query = query.filter(AuditLog.actor_role == actor_role)
    if action:
        query = query.filter(AuditLog.action == action)
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)

    if search:
        search_filter = or_(
            AuditLog.actor_email.ilike(f"%{search}%"),
            AuditLog.action.ilike(f"%{search}%"),
            AuditLog.ip_address.ilike(f"%{search}%")
        )
        # Check if search is numeric to search entity_id
        if search.isdigit():
            search_filter = or_(search_filter, AuditLog.entity_id == int(search))
        query = query.filter(search_filter)

    total = query.count()
    pages = (total + limit - 1) // limit

    logs = (
        query.order_by(AuditLog.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    items = []
    for log in logs:
        # Safely parse JSON strings
        old_val = None
        new_val = None
        if log.old_values:
            try:
                old_val = json.loads(log.old_values)
            except Exception:
                old_val = log.old_values
        if log.new_values:
            try:
                new_val = json.loads(log.new_values)
            except Exception:
                new_val = log.new_values

        items.append({
            "log_id": log.log_id,
            "actor_id": log.actor_id,
            "actor_email": log.actor_email,
            "actor_role": log.actor_role,
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "old_values": old_val,
            "new_values": new_val,
            "ip_address": log.ip_address,
            "user_agent": log.user_agent,
            "created_at": log.created_at.isoformat() if log.created_at else None
        })

    return {
        "items": items,
        "total": total,
        "pages": pages,
        "page": page,
        "limit": limit
    }
