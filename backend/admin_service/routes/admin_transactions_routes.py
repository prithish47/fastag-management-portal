"""
Admin Transaction Monitoring Routes
=====================================
GET /admin/transactions — List ALL transactions (paginated, filterable)
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional
from datetime import datetime

from app.database import get_db
from app.models import User, Vehicle
from app.models.transaction_model import Transaction
from admin_service.middleware.require_admin import get_current_admin
from admin_service.schemas.admin_schemas import PaginatedResponse

router = APIRouter(tags=["Admin Transactions"])


@router.get("/transactions")
def list_transactions(
    search: Optional[str] = Query(None, description="Search by reference, user name, or email"),
    user_id: Optional[int] = Query(None),
    vehicle_id: Optional[int] = Query(None),
    type_filter: Optional[str] = Query(None, description="WALLET_RECHARGE or TOLL_DEDUCTION"),
    status_filter: Optional[str] = Query(None, description="SUCCESS, FAILED, PENDING"),
    date_from: Optional[str] = Query(None, description="Date from (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="Date to (YYYY-MM-DD)"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """List all transactions across all users with filtering and pagination."""
    query = db.query(Transaction, User, Vehicle).outerjoin(
        User, Transaction.user_id == User.user_id
    ).outerjoin(
        Vehicle, Transaction.vehicle_id == Vehicle.vehicle_id
    )

    # Search
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Transaction.reference_number.ilike(search_term),
                User.full_name.ilike(search_term),
                User.email.ilike(search_term)
            )
        )

    # Filters
    if user_id:
        query = query.filter(Transaction.user_id == user_id)
    if vehicle_id:
        query = query.filter(Transaction.vehicle_id == vehicle_id)
    if type_filter:
        query = query.filter(Transaction.transaction_type == type_filter)
    if status_filter:
        query = query.filter(Transaction.status == status_filter)

    # Date range
    if date_from:
        try:
            dt_from = datetime.strptime(date_from, "%Y-%m-%d")
            query = query.filter(Transaction.created_at >= dt_from)
        except ValueError:
            pass

    if date_to:
        try:
            dt_to = datetime.strptime(date_to, "%Y-%m-%d").replace(
                hour=23, minute=59, second=59
            )
            query = query.filter(Transaction.created_at <= dt_to)
        except ValueError:
            pass

    # Count total
    total = query.count()

    # Paginate
    results = query.order_by(Transaction.created_at.desc()).offset(
        (page - 1) * page_size
    ).limit(page_size).all()

    items = []
    for txn, user, vehicle in results:
        items.append({
            "transaction_id": txn.transaction_id,
            "reference_number": txn.reference_number,
            "user_name": user.full_name if user else "Unknown",
            "user_email": user.email if user else "—",
            "user_id": txn.user_id,
            "vehicle_number": vehicle.vehicle_number if vehicle else "—",
            "transaction_type": txn.transaction_type,
            "amount": float(txn.amount),
            "status": txn.status,
            "payment_method": txn.payment_method or "—",
            "plaza_name": txn.plaza_name or "Wallet Recharge",
            "created_at": txn.created_at.strftime("%d %b %Y, %I:%M %p") if txn.created_at else None,
            "failure_reason": txn.failure_reason
        })

    total_pages = (total + page_size - 1) // page_size

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )
