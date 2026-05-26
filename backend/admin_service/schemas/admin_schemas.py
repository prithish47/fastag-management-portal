"""
Admin Pydantic Schemas
=======================
Request/response models for all admin API endpoints.
"""
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any
from datetime import datetime
from decimal import Decimal


# ─── Auth ──────────────────────────────────────────────────────────────────────
class AdminLoginRequest(BaseModel):
    email: EmailStr
    password: str


class AdminLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    admin_name: str
    role: str = "ADMIN"


# ─── Dashboard Metrics ────────────────────────────────────────────────────────
class DashboardMetricsResponse(BaseModel):
    total_users: int
    total_vehicles: int
    active_fastags: int
    disabled_fastags: int
    pending_rc_verifications: int
    wallet_volume: float
    today_transactions: int
    failed_transactions: int
    total_fastag_inventory: int
    available_fastags: int


# ─── User Management ──────────────────────────────────────────────────────────
class AdminUserListItem(BaseModel):
    user_id: int
    full_name: str
    email: str
    mobile_number: str
    wallet_balance: float
    vehicle_count: int
    role: str
    account_status: str
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class UserStatusUpdateRequest(BaseModel):
    account_status: str  # ACTIVE, SUSPENDED, DISABLED


# ─── Vehicle Management ───────────────────────────────────────────────────────
class AdminVehicleListItem(BaseModel):
    vehicle_id: int
    vehicle_number: str
    vehicle_class: str
    vehicle_type: Optional[str] = None
    fastag_status: str
    rc_verification_status: str
    owner_name: str
    owner_email: str
    owner_id: int
    wallet_balance: float
    wallet_sufficient: bool
    last_activity: Optional[str] = None
    fastag_id: Optional[str] = None

    class Config:
        from_attributes = True


class FastagStatusUpdateRequest(BaseModel):
    action: str  # ENABLE, DISABLE, REPLACE


class RcStatusUpdateRequest(BaseModel):
    status: str  # VERIFIED, REJECTED


# ─── Transaction Monitoring ───────────────────────────────────────────────────
class AdminTransactionListItem(BaseModel):
    transaction_id: int
    reference_number: Optional[str] = None
    user_name: str
    user_email: str
    vehicle_number: Optional[str] = None
    transaction_type: str
    amount: float
    status: str
    payment_method: Optional[str] = None
    plaza_name: Optional[str] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


# ─── Activity Feed ─────────────────────────────────────────────────────────────
class ActivityFeedItem(BaseModel):
    log_id: int
    activity_type: str
    activity_message: str
    vehicle_number: Optional[str] = None
    owner_name: Optional[str] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


# ─── FASTag Inventory ─────────────────────────────────────────────────────────
class FastagInventoryItem(BaseModel):
    id: int
    fastag_id: str
    tag_serial_number: str
    vehicle_class: str
    status: str
    is_blacklisted: bool
    assigned_vehicle_id: Optional[int] = None
    assigned_vehicle_number: Optional[str] = None
    issued_at: Optional[str] = None
    activated_at: Optional[str] = None
    last_assigned_at: Optional[str] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class FastagInventoryMetrics(BaseModel):
    total_tags: int
    unassigned: int
    assigned: int
    active: int
    blacklisted: int
    damaged: int
    disabled: int
    replaced: int
    by_vehicle_class: dict  # { "VC4": {"unassigned": 5, "assigned": 3, ...}, ... }


# ─── Pagination ────────────────────────────────────────────────────────────────
class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    page_size: int
    total_pages: int
