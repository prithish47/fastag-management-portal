import json
from fastapi import Request
from app.database import SessionLocal
from app.models.audit_log_model import AuditLog

def log_audit(
    action: str,
    actor_id: int = None,
    actor_email: str = None,
    actor_role: str = None,
    entity_type: str = None,
    entity_id: int = None,
    old_values: dict = None,
    new_values: dict = None,
    request: Request = None
):
    """
    Writes an audit log entry in an independent database session.
    This guarantees that audit records are committed regardless of the main transaction's lifecycle,
    making the audit logs transaction-safe and reliable.
    """
    ip_address = None
    user_agent = None
    
    if request:
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")

    db = SessionLocal()
    try:
        audit_entry = AuditLog(
            actor_id=actor_id,
            actor_email=actor_email,
            actor_role=actor_role,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            old_values=json.dumps(old_values) if old_values is not None else None,
            new_values=json.dumps(new_values) if new_values is not None else None,
            ip_address=ip_address,
            user_agent=user_agent
        )
        db.add(audit_entry)
        db.commit()
        db.refresh(audit_entry)
        return audit_entry
    except Exception as e:
        print(f"[AUDIT LOG ERROR] Failed to write audit log: {e}")
        db.rollback()
        return None
    finally:
        db.close()
