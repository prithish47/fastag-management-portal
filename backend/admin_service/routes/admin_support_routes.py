"""
Admin Support Ticket Routes
==============================
GET    /admin/support/tickets                          — List all tickets (with filters + search)
GET    /admin/support/tickets/{ticket_id}              — Ticket detail + thread
POST   /admin/support/tickets/{ticket_id}/reply        — Admin reply
PATCH  /admin/support/tickets/{ticket_id}/status       — Update ticket status
"""
from datetime import datetime
import os
import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.models import User, Vehicle, SupportTicket, SupportMessage
from app.models.notification_model import Notification
from admin_service.middleware.require_admin import get_current_admin
from app.utils.audit_logger import log_audit
from app.utils.email_helper import send_admin_reply_email

router = APIRouter(tags=["Admin Support"])

UPLOAD_DIR = Path("uploads/support_attachments")
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "pdf"}
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB


# ── Schemas ────────────────────────────────────────────────────────────────────

class AdminReplyRequest(BaseModel):
    message: str


class StatusUpdateRequest(BaseModel):
    status: str  # OPEN, IN_PROGRESS, RESOLVED, CLOSED


VALID_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]


# ── GET /support/tickets ──────────────────────────────────────────────────────

@router.get("/support/tickets")
def list_all_tickets(
    search: Optional[str] = Query(None, description="Search by ticket ID, vehicle number, or user email"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status"),
    category_filter: Optional[str] = Query(None, alias="category", description="Filter by category"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """List all support tickets with filters, search, and pagination."""
    query = db.query(SupportTicket, User).join(User, SupportTicket.user_id == User.user_id)

    # Filters
    if status_filter:
        query = query.filter(SupportTicket.status == status_filter)
    if category_filter:
        query = query.filter(SupportTicket.category == category_filter)

    # Search
    if search:
        search_term = search.strip()
        # Try numeric search for ticket ID
        conditions = []
        try:
            ticket_id_val = int(search_term)
            conditions.append(SupportTicket.ticket_id == ticket_id_val)
        except ValueError:
            pass

        search_like = f"%{search_term}%"
        conditions.append(User.email.ilike(search_like))

        # Join vehicle for vehicle_number search
        vehicle_subquery = db.query(Vehicle.vehicle_id).filter(
            Vehicle.vehicle_number.ilike(search_like)
        ).subquery()
        conditions.append(SupportTicket.vehicle_id.in_(vehicle_subquery))

        if conditions:
            query = query.filter(or_(*conditions))

    # Count total
    total = query.count()

    # Sort by last_message_at descending (most recent communication first)
    results = query.order_by(
        desc(SupportTicket.last_message_at),
        desc(SupportTicket.created_at)
    ).offset((page - 1) * page_size).limit(page_size).all()

    items = []
    for ticket, user in results:
        vehicle_number = None
        if ticket.vehicle_id:
            v = db.query(Vehicle).filter(Vehicle.vehicle_id == ticket.vehicle_id).first()
            vehicle_number = v.vehicle_number if v else None

        msg_count = db.query(SupportMessage).filter(
            SupportMessage.ticket_id == ticket.ticket_id
        ).count()

        items.append({
            "ticket_id": ticket.ticket_id,
            "subject": ticket.subject,
            "category": ticket.category,
            "status": ticket.status,
            "user_name": user.full_name,
            "user_email": user.email,
            "user_id": user.user_id,
            "vehicle_number": vehicle_number,
            "message_count": msg_count,
            "created_at": ticket.created_at.isoformat() if ticket.created_at else None,
            "updated_at": ticket.updated_at.isoformat() if ticket.updated_at else None,
            "last_message_at": ticket.last_message_at.isoformat() if ticket.last_message_at else None,
            "closed_at": ticket.closed_at.isoformat() if ticket.closed_at else None,
        })

    total_pages = (total + page_size - 1) // page_size

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }


# ── GET /support/tickets/{ticket_id} ─────────────────────────────────────────

@router.get("/support/tickets/{ticket_id}")
def get_ticket_detail(
    ticket_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get ticket details with full conversation thread (admin view)."""
    ticket = db.query(SupportTicket).filter(
        SupportTicket.ticket_id == ticket_id
    ).first()

    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    # User info
    user = db.query(User).filter(User.user_id == ticket.user_id).first()

    # Vehicle info
    vehicle_number = None
    vehicle_info = None
    if ticket.vehicle_id:
        v = db.query(Vehicle).filter(Vehicle.vehicle_id == ticket.vehicle_id).first()
        if v:
            vehicle_number = v.vehicle_number
            vehicle_info = {
                "vehicle_id": v.vehicle_id,
                "vehicle_number": v.vehicle_number,
                "vehicle_class": v.vehicle_class,
                "fastag_status": v.fastag_status,
            }

    # Messages (chronological)
    messages = db.query(SupportMessage).filter(
        SupportMessage.ticket_id == ticket_id
    ).order_by(SupportMessage.created_at.asc()).all()

    # Resolve sender names
    message_items = []
    for m in messages:
        sender_name = None
        if m.sender_role == "USER" and user:
            sender_name = user.full_name
        elif m.sender_role == "ADMIN" and m.sender_id:
            admin_user = db.query(User).filter(User.user_id == m.sender_id).first()
            sender_name = admin_user.full_name if admin_user else "Administrator"
        else:
            sender_name = "Administrator"

        message_items.append({
            "message_id": m.message_id,
            "sender_id": m.sender_id,
            "sender_role": m.sender_role,
            "sender_name": sender_name,
            "message": m.message,
            "attachment_path": m.attachment_path,
            "attachment_name": m.attachment_name,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        })

    return {
        "ticket": {
            "ticket_id": ticket.ticket_id,
            "subject": ticket.subject,
            "category": ticket.category,
            "status": ticket.status,
            "vehicle_number": vehicle_number,
            "vehicle_id": ticket.vehicle_id,
            "user_id": ticket.user_id,
            "user_name": user.full_name if user else None,
            "user_email": user.email if user else None,
            "created_at": ticket.created_at.isoformat() if ticket.created_at else None,
            "updated_at": ticket.updated_at.isoformat() if ticket.updated_at else None,
            "last_message_at": ticket.last_message_at.isoformat() if ticket.last_message_at else None,
            "closed_at": ticket.closed_at.isoformat() if ticket.closed_at else None,
        },
        "vehicle": vehicle_info,
        "messages": message_items,
    }


# ── POST /support/tickets/{ticket_id}/reply ───────────────────────────────────

@router.post("/support/tickets/{ticket_id}/reply")
async def admin_reply_to_ticket(
    ticket_id: int,
    request: Request,
    message: str = Form(...),
    attachment: Optional[UploadFile] = File(None),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin reply to a support ticket with optional attachment."""
    ticket = db.query(SupportTicket).filter(
        SupportTicket.ticket_id == ticket_id
    ).first()

    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if ticket.status == "CLOSED":
        raise HTTPException(status_code=400, detail="Cannot reply to a closed ticket")

    if not message.strip():
        raise HTTPException(status_code=400, detail="Message is required")

    # Handle Attachment
    attachment_path = None
    attachment_name = None
    if attachment and attachment.filename:
        ext = attachment.filename.rsplit(".", 1)[-1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(status_code=400, detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")
        
        content = await attachment.read()
        if len(content) > MAX_FILE_SIZE_BYTES:
            raise HTTPException(status_code=400, detail="File size exceeds 5MB limit")
        
        # Save file
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        unique_filename = f"{uuid.uuid4()}_{attachment.filename}"
        file_path = UPLOAD_DIR / unique_filename
        with open(file_path, "wb") as f:
            f.write(content)
        
        attachment_path = f"uploads/support_attachments/{unique_filename}"
        attachment_name = attachment.filename

    now = datetime.now()

    msg = SupportMessage(
        ticket_id=ticket_id,
        sender_id=admin.user_id,
        sender_role="ADMIN",
        message=message.strip(),
        attachment_path=attachment_path,
        attachment_name=attachment_name
    )
    db.add(msg)

    ticket.updated_at = now
    ticket.last_message_at = now

    # Auto-transition OPEN → IN_PROGRESS on first admin reply
    old_status = ticket.status
    if ticket.status == "OPEN":
        ticket.status = "IN_PROGRESS"

    # Notify user
    ticket_user = db.query(User).filter(User.user_id == ticket.user_id).first()

    notif = Notification(
        user_id=ticket.user_id,
        title="Support Reply",
        message=f"Admin replied to your support ticket #{ticket_id}: {ticket.subject}",
        type="SUPPORT"
    )
    db.add(notif)

    db.commit()
    db.refresh(msg)

    # Audit log
    log_audit(
        action="SUPPORT_REPLY_ADDED",
        actor_id=admin.user_id,
        actor_email=admin.email,
        actor_role="ADMIN",
        entity_type="SupportTicket",
        entity_id=ticket_id,
        new_values={
            "message_id": msg.message_id,
            "attachment_name": attachment_name,
            "auto_status_change": f"{old_status} → {ticket.status}" if old_status != ticket.status else None
        },
        request=request
    )

    # Send email notification
    if ticket_user:
        try:
            send_admin_reply_email(
                to_email=ticket_user.email,
                full_name=ticket_user.full_name,
                ticket_id=ticket_id,
                subject=ticket.subject,
                reply_preview=message.strip()[:200]
            )
        except Exception as e:
            print(f"[EMAIL ERROR] Failed to send admin reply email: {e}")

    return {
        "message": "Reply sent successfully",
        "message_id": msg.message_id,
        "new_status": ticket.status
    }


# ── PATCH /support/tickets/{ticket_id}/status ─────────────────────────────────

@router.patch("/support/tickets/{ticket_id}/status")
def update_ticket_status(
    ticket_id: int,
    payload: StatusUpdateRequest,
    request: Request,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update ticket status. CLOSED tickets cannot be reopened."""
    ticket = db.query(SupportTicket).filter(
        SupportTicket.ticket_id == ticket_id
    ).first()

    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if payload.status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {', '.join(VALID_STATUSES)}"
        )

    # Cannot reopen closed tickets
    if ticket.status == "CLOSED":
        raise HTTPException(status_code=400, detail="Closed tickets cannot be reopened or modified")

    old_status = ticket.status
    now = datetime.now()

    ticket.status = payload.status
    ticket.updated_at = now

    # Only set closed_at when status = CLOSED
    if payload.status == "CLOSED":
        ticket.closed_at = now

    # Notify user
    notif = Notification(
        user_id=ticket.user_id,
        title="Ticket Status Updated",
        message=f"Your support ticket #{ticket_id} is now {payload.status.replace('_', ' ')}.",
        type="SUPPORT"
    )
    db.add(notif)

    db.commit()

    # Audit log
    log_audit(
        action="SUPPORT_TICKET_STATUS_UPDATED",
        actor_id=admin.user_id,
        actor_email=admin.email,
        actor_role="ADMIN",
        entity_type="SupportTicket",
        entity_id=ticket_id,
        old_values={"status": old_status},
        new_values={"status": payload.status},
        request=request
    )

    return {
        "message": f"Ticket status updated from {old_status} to {payload.status}",
        "ticket_id": ticket_id,
        "new_status": payload.status
    }
