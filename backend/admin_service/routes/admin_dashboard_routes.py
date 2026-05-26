"""
Admin Dashboard Metrics Routes
================================
GET /admin/dashboard/metrics — Aggregate operational metrics
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, timedelta

from app.database import get_db
from app.models import User, Vehicle, FastagInventory
from app.models.transaction_model import Transaction
from admin_service.middleware.require_admin import get_current_admin
from admin_service.schemas.admin_schemas import DashboardMetricsResponse

router = APIRouter(tags=["Admin Dashboard"])


@router.get("/dashboard/metrics", response_model=DashboardMetricsResponse)
def get_dashboard_metrics(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Return all 10 operational metrics for the admin dashboard."""

    # Total users (excluding admins)
    total_users = db.query(func.count(User.user_id)).filter(
        User.role == "USER"
    ).scalar() or 0

    # Total vehicles
    total_vehicles = db.query(func.count(Vehicle.vehicle_id)).scalar() or 0

    # Active FASTags
    active_fastags = db.query(func.count(Vehicle.vehicle_id)).filter(
        Vehicle.fastag_status == "ACTIVE"
    ).scalar() or 0

    # Disabled FASTags
    disabled_fastags = db.query(func.count(Vehicle.vehicle_id)).filter(
        Vehicle.fastag_status == "DISABLED"
    ).scalar() or 0

    # Pending RC verifications
    pending_rc = db.query(func.count(Vehicle.vehicle_id)).filter(
        Vehicle.rc_verification_status == "PENDING"
    ).scalar() or 0

    # Total wallet volume (sum of all user wallet balances)
    wallet_volume = db.query(func.sum(User.wallet_balance)).filter(
        User.role == "USER"
    ).scalar() or 0.0

    # Today's transactions
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    today_txns = db.query(func.count(Transaction.transaction_id)).filter(
        Transaction.created_at >= today_start
    ).scalar() or 0

    # Failed transactions (all time)
    failed_txns = db.query(func.count(Transaction.transaction_id)).filter(
        Transaction.status == "FAILED"
    ).scalar() or 0

    # FASTag inventory totals
    total_inventory = db.query(func.count(FastagInventory.id)).scalar() or 0
    available_tags = db.query(func.count(FastagInventory.id)).filter(
        FastagInventory.status == "AVAILABLE"
    ).scalar() or 0

    return DashboardMetricsResponse(
        total_users=total_users,
        total_vehicles=total_vehicles,
        active_fastags=active_fastags,
        disabled_fastags=disabled_fastags,
        pending_rc_verifications=pending_rc,
        wallet_volume=float(wallet_volume),
        today_transactions=today_txns,
        failed_transactions=failed_txns,
        total_fastag_inventory=total_inventory,
        available_fastags=available_tags
    )
