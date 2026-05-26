"""
Admin Integrity Scan & Resolve Routes
======================================
GET  /admin/integrity/check   - Scan warehouse and vehicle assignments for inconsistencies (Read-only)
POST /admin/integrity/resolve - Auto-resolve inconsistencies and return a summary of resolutions
"""
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user_model import User
from admin_service.middleware.require_admin import get_current_admin
from app.services.integrity_service import IntegrityService
from app.utils.audit_logger import log_audit

router = APIRouter(prefix="/integrity", tags=["Admin Integrity Engine"])


@router.get("/check")
def check_warehouse_integrity(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Scans the warehouse databases and assignments for inconsistencies.
    Strictly read-only; does not modify any state.
    """
    anomalies = IntegrityService.check_integrity(db)
    return {
        "status": "success",
        "anomalies_count": len(anomalies),
        "anomalies": anomalies
    }


@router.post("/resolve")
def resolve_warehouse_integrity(
    request: Request,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Performs auto-resolution of warehouse inconsistencies and returns a summary.
    Does not automatically disable vehicles; updates them to FASTAG_PENDING if no tag is linked.
    """
    resolved_actions = IntegrityService.resolve_integrity(db)
    
    if resolved_actions:
        # Log to system audit log
        log_audit(
            action="WAREHOUSE_INTEGRITY_RESOLVED",
            actor_id=admin.user_id,
            actor_email=admin.email,
            actor_role=admin.role,
            entity_type="System",
            entity_id=0,
            old_values={},
            new_values={"resolved_actions": resolved_actions},
            request=request
        )
        
    return {
        "status": "success",
        "resolved_count": len(resolved_actions),
        "resolved": resolved_actions
    }
