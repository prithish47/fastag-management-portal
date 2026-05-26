"""
Admin User Management Routes
==============================
GET    /admin/users                              — List users (paginated, searchable, filterable)
GET    /admin/users/{user_id}                    — User detail
PATCH  /admin/users/{user_id}/status             — Enable/disable/suspend user
GET    /admin/users/{user_id}/transactions       — Recent transactions
GET    /admin/users/{user_id}/activity-timeline  — Unified activity timeline
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import Optional
from app.utils.audit_logger import log_audit

from app.database import get_db
from app.models import User, Vehicle, FastagInventory
from app.models.notification_model import Notification
from app.models.transaction_model import Transaction
from app.models.activity_log_model import VehicleActivityLog
from admin_service.middleware.require_admin import get_current_admin
from admin_service.schemas.admin_schemas import (
    AdminUserListItem,
    UserStatusUpdateRequest,
    PaginatedResponse
)

router = APIRouter(tags=["Admin Users"])


@router.get("/users")
def list_users(
    search: Optional[str] = Query(None, description="Search by name, email, or mobile"),
    role_filter: Optional[str] = Query(None, description="Filter by role: USER, ADMIN"),
    status_filter: Optional[str] = Query(None, description="Filter by status: ACTIVE, SUSPENDED, DISABLED"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """List all users with search, filter, and pagination."""
    query = db.query(User)

    # Search
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                User.full_name.ilike(search_term),
                User.email.ilike(search_term),
                User.mobile_number.ilike(search_term)
            )
        )

    # Filters
    if role_filter:
        query = query.filter(User.role == role_filter)

    if status_filter:
        query = query.filter(User.account_status == status_filter)

    # Count total
    total = query.count()

    # Paginate
    users = query.order_by(User.created_at.desc()).offset(
        (page - 1) * page_size
    ).limit(page_size).all()

    # Build response with vehicle counts
    items = []
    for u in users:
        vehicle_count = db.query(func.count(Vehicle.vehicle_id)).filter(
            Vehicle.user_id == u.user_id
        ).scalar() or 0

        items.append(AdminUserListItem(
            user_id=u.user_id,
            full_name=u.full_name,
            email=u.email,
            mobile_number=u.mobile_number,
            wallet_balance=float(u.wallet_balance or 0),
            vehicle_count=vehicle_count,
            role=u.role,
            account_status=u.account_status,
            created_at=u.created_at.strftime("%d %b %Y, %I:%M %p") if u.created_at else None
        ))

    total_pages = (total + page_size - 1) // page_size

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/users/{user_id}")
def get_user_detail(
    user_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get detailed user information with linked vehicles and FASTag data."""
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    vehicles = db.query(Vehicle).filter(Vehicle.user_id == user_id).all()

    # Enrich vehicles with FASTag assignment info
    vehicle_list = []
    for v in vehicles:
        assigned_tag = db.query(FastagInventory).filter(
            FastagInventory.assigned_vehicle_id == v.vehicle_id,
            FastagInventory.status == "ASSIGNED"
        ).first()

        vehicle_list.append({
            "vehicle_id": v.vehicle_id,
            "vehicle_number": v.vehicle_number,
            "vehicle_class": v.vehicle_class,
            "vehicle_type": v.vehicle_type,
            "fastag_status": v.fastag_status or "INACTIVE",
            "rc_verification_status": v.rc_verification_status or "PENDING",
            "fastag_id": assigned_tag.fastag_id if assigned_tag else None,
            "wallet_sufficient": float(user.wallet_balance or 0) >= 100,
        })

    # Last activity timestamp
    last_activity = None
    last_txn = db.query(Transaction).filter(
        Transaction.user_id == user_id
    ).order_by(Transaction.created_at.desc()).first()
    if last_txn and last_txn.created_at:
        last_activity = last_txn.created_at.strftime("%d %b %Y, %I:%M %p")

    return {
        "user_id": user.user_id,
        "full_name": user.full_name,
        "email": user.email,
        "mobile_number": user.mobile_number,
        "address": user.address,
        "wallet_balance": float(user.wallet_balance or 0),
        "role": user.role,
        "account_status": user.account_status,
        "created_at": user.created_at.strftime("%d %b %Y, %I:%M %p") if user.created_at else None,
        "last_activity": last_activity,
        "vehicles": vehicle_list,
    }


@router.patch("/users/{user_id}/status")
def update_user_status(
    user_id: int,
    payload: UserStatusUpdateRequest,
    request: Request,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Enable, suspend, or disable a user account."""
    valid_statuses = ["ACTIVE", "SUSPENDED", "DISABLED"]
    if payload.account_status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
        )

    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent admin from disabling themselves
    if user.user_id == admin.user_id:
        raise HTTPException(
            status_code=400,
            detail="Cannot change your own account status"
        )

    old_status = user.account_status
    user.account_status = payload.account_status
    db.commit()

    # Create notification for the user
    status_messages = {
        "ACTIVE": "Your account has been activated by an administrator.",
        "SUSPENDED": "Your account has been temporarily suspended. Contact support for details.",
        "DISABLED": "Your account has been disabled by an administrator.",
    }

    notification = Notification(
        user_id=user.user_id,
        title="Account Status Updated",
        message=status_messages.get(payload.account_status, "Your account status has changed."),
        type="SYSTEM"
    )
    db.add(notification)
    db.commit()

    log_audit(
        action="USER_STATUS_UPDATED",
        actor_id=admin.user_id,
        actor_email=admin.email,
        actor_role=admin.role,
        entity_type="User",
        entity_id=user_id,
        old_values={"account_status": old_status},
        new_values={"account_status": payload.account_status},
        request=request
    )

    return {
        "message": f"User status updated from {old_status} to {payload.account_status}",
        "user_id": user.user_id,
        "new_status": payload.account_status
    }


@router.get("/users/{user_id}/transactions")
def get_user_transactions(
    user_id: int,
    limit: int = Query(10, ge=1, le=50),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get recent transactions for a specific user."""
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    txns = (
        db.query(Transaction, Vehicle)
        .outerjoin(Vehicle, Transaction.vehicle_id == Vehicle.vehicle_id)
        .filter(Transaction.user_id == user_id)
        .order_by(Transaction.created_at.desc())
        .limit(limit)
        .all()
    )

    return [
        {
            "transaction_id": t.transaction_id,
            "reference_number": t.reference_number,
            "transaction_type": t.transaction_type,
            "amount": float(t.amount),
            "status": t.status,
            "payment_method": t.payment_method or "-",
            "plaza_name": t.plaza_name,
            "vehicle_number": v.vehicle_number if v else "-",
            "balance_after": float(t.balance_after) if t.balance_after else None,
            "created_at": t.created_at.strftime("%d %b %Y, %I:%M %p") if t.created_at else None,
            "timestamp_iso": t.created_at.isoformat() if t.created_at else None,
        }
        for t, v in txns
    ]


@router.get("/users/{user_id}/activity-timeline")
def get_user_activity_timeline(
    user_id: int,
    limit: int = Query(30, ge=1, le=100),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Unified activity timeline merging:
    - transactions
    - vehicle activity logs
    - notifications
    Returns items sorted by timestamp descending.
    """
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    timeline = []

    # 1. Transactions
    txns = (
        db.query(Transaction, Vehicle)
        .outerjoin(Vehicle, Transaction.vehicle_id == Vehicle.vehicle_id)
        .filter(Transaction.user_id == user_id)
        .order_by(Transaction.created_at.desc())
        .limit(limit)
        .all()
    )
    for t, v in txns:
        is_recharge = t.transaction_type == "WALLET_RECHARGE"
        timeline.append({
            "type": "transaction",
            "event": "Wallet Recharge" if is_recharge else "Toll Deduction",
            "detail": f"{'+'if is_recharge else '-'}Rs.{float(t.amount):.2f}" + (f" at {t.plaza_name}" if t.plaza_name else ""),
            "status": t.status,
            "vehicle_number": v.vehicle_number if v else None,
            "timestamp": t.created_at.isoformat() if t.created_at else None,
            "display_time": t.created_at.strftime("%d %b, %I:%M %p") if t.created_at else None,
        })

    # 2. Vehicle activity logs
    user_vehicle_ids = [v.vehicle_id for v in db.query(Vehicle).filter(Vehicle.user_id == user_id).all()]
    if user_vehicle_ids:
        logs = (
            db.query(VehicleActivityLog, Vehicle)
            .join(Vehicle, VehicleActivityLog.vehicle_id == Vehicle.vehicle_id)
            .filter(VehicleActivityLog.vehicle_id.in_(user_vehicle_ids))
            .order_by(VehicleActivityLog.created_at.desc())
            .limit(limit)
            .all()
        )
        for log, v in logs:
            timeline.append({
                "type": "activity",
                "event": log.activity_type.replace("_", " ").title(),
                "detail": log.activity_message,
                "status": None,
                "vehicle_number": v.vehicle_number if v else None,
                "timestamp": log.created_at.isoformat() if log.created_at else None,
                "display_time": log.created_at.strftime("%d %b, %I:%M %p") if log.created_at else None,
            })

    # 3. Notifications
    notifs = (
        db.query(Notification)
        .filter(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
        .all()
    )
    for n in notifs:
        timeline.append({
            "type": "notification",
            "event": n.title,
            "detail": n.message,
            "status": None,
            "vehicle_number": None,
            "timestamp": n.created_at.isoformat() if n.created_at else None,
            "display_time": n.created_at.strftime("%d %b, %I:%M %p") if n.created_at else None,
        })

    # Sort all by timestamp descending
    timeline.sort(key=lambda x: x.get("timestamp") or "", reverse=True)

    return timeline[:limit]

