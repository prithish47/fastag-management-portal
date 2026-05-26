"""
User Support Ticket Routes
============================
POST   /support/tickets                         — Create a support ticket
GET    /support/tickets                         — List user's tickets
GET    /support/tickets/{ticket_id}             — Ticket detail + thread
POST   /support/tickets/{ticket_id}/reply       — Reply to ticket
"""
from datetime import datetime
import os
import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Security, Request, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import desc
from pydantic import BaseModel
from typing import Optional

from app.database import SessionLocal
from app.models import User, Vehicle, SupportTicket, SupportMessage
from app.models.notification_model import Notification
from app.auth.jwt_handler import verify_access_token
from app.utils.audit_logger import log_audit
from app.utils.email_helper import send_ticket_created_email

from fastapi.responses import FileResponse

router = APIRouter(prefix="/support", tags=["Support"])
security = HTTPBearer()

UPLOAD_DIR = Path("uploads/support_attachments")
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "pdf"}
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user_or_admin(
    request: Request,
    db: Session = Depends(get_db)
) -> User:
    token = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1]
    
    if not token:
        token = request.query_params.get("token")
        
    if not token:
        raise HTTPException(status_code=401, detail="Authentication token required")
        
    payload = verify_access_token(token)
    if not payload:
        from admin_service.auth.admin_auth import verify_admin_token
        payload = verify_admin_token(token)
        
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
        
    user_id = payload.get("user_id")
    email = payload.get("sub")
    
    if user_id:
        user = db.query(User).filter(User.user_id == user_id).first()
    elif email:
        user = db.query(User).filter(User.email == email).first()
    else:
        raise HTTPException(status_code=401, detail="Invalid token payload")
        
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.account_status != "ACTIVE":
        raise HTTPException(status_code=403, detail="User account is suspended or disabled")
        
    return user


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: Session = Depends(get_db)
) -> User:
    token = credentials.credentials
    payload = verify_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    email = payload.get("sub")
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# ── Schemas ────────────────────────────────────────────────────────────────────

VALID_CATEGORIES = [
    "FASTAG_ISSUE", "RC_VERIFICATION", "WALLET_ISSUE",
    "TOLL_DEDUCTION", "REPLACEMENT_REQUEST", "ACCOUNT_ISSUE", "OTHER"
]

class CreateTicketRequest(BaseModel):
    category: str
    subject: str
    description: str
    vehicle_id: Optional[int] = None


class ReplyRequest(BaseModel):
    message: str


# ── POST /support/tickets ─────────────────────────────────────────────────────

@router.post("/tickets")
async def create_ticket(
    request: Request,
    category: str = Form(...),
    subject: str = Form(...),
    description: str = Form(...),
    vehicle_id: Optional[int] = Form(None),
    attachment: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new support ticket with the first message and an optional attachment."""
    if category not in VALID_CATEGORIES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid category. Must be one of: {', '.join(VALID_CATEGORIES)}"
        )
    if not subject.strip():
        raise HTTPException(status_code=400, detail="Subject is required")
    if not description.strip():
        raise HTTPException(status_code=400, detail="Description is required")

    # Validate vehicle ownership if provided
    if vehicle_id:
        vehicle = db.query(Vehicle).filter(
            Vehicle.vehicle_id == vehicle_id,
            Vehicle.user_id == current_user.user_id
        ).first()
        if not vehicle:
            raise HTTPException(status_code=404, detail="Vehicle not found or does not belong to you")

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

    # Create ticket
    ticket = SupportTicket(
        user_id=current_user.user_id,
        vehicle_id=vehicle_id,
        category=category,
        status="OPEN",
        subject=subject.strip(),
        last_message_at=now
    )
    db.add(ticket)
    db.flush()  # Get ticket_id

    # Create first message
    first_msg = SupportMessage(
        ticket_id=ticket.ticket_id,
        sender_id=current_user.user_id,
        sender_role="USER",
        message=description.strip(),
        attachment_path=attachment_path,
        attachment_name=attachment_name
    )
    db.add(first_msg)

    db.commit()
    db.refresh(ticket)

    # Audit log
    log_audit(
        action="SUPPORT_TICKET_CREATED",
        actor_id=current_user.user_id,
        actor_email=current_user.email,
        actor_role="USER",
        entity_type="SupportTicket",
        entity_id=ticket.ticket_id,
        new_values={
            "category": category,
            "subject": subject,
            "vehicle_id": vehicle_id,
            "attachment_name": attachment_name
        },
        request=request
    )

    # Send confirmation email
    try:
        send_ticket_created_email(
            to_email=current_user.email,
            full_name=current_user.full_name,
            ticket_id=ticket.ticket_id,
            subject=subject,
            category=category
        )
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send ticket created email: {e}")

    return {
        "message": "Support ticket created successfully",
        "ticket_id": ticket.ticket_id,
        "status": ticket.status
    }


# ── GET /support/tickets ───────────────────────────────────────────────────────

@router.get("/tickets")
def list_tickets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all support tickets for the current user."""
    tickets = db.query(SupportTicket).filter(
        SupportTicket.user_id == current_user.user_id
    ).order_by(desc(SupportTicket.last_message_at), desc(SupportTicket.created_at)).all()

    # Get linked vehicle numbers for display
    items = []
    for t in tickets:
        vehicle_number = None
        if t.vehicle_id:
            v = db.query(Vehicle).filter(Vehicle.vehicle_id == t.vehicle_id).first()
            vehicle_number = v.vehicle_number if v else None

        # Count messages
        msg_count = db.query(SupportMessage).filter(
            SupportMessage.ticket_id == t.ticket_id
        ).count()

        items.append({
            "ticket_id": t.ticket_id,
            "subject": t.subject,
            "category": t.category,
            "status": t.status,
            "vehicle_number": vehicle_number,
            "message_count": msg_count,
            "created_at": t.created_at.isoformat() if t.created_at else None,
            "updated_at": t.updated_at.isoformat() if t.updated_at else None,
            "last_message_at": t.last_message_at.isoformat() if t.last_message_at else None,
        })

    return items


# ── GET /support/tickets/{ticket_id} ──────────────────────────────────────────

@router.get("/tickets/{ticket_id}")
def get_ticket_detail(
    ticket_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get ticket details with full conversation thread."""
    ticket = db.query(SupportTicket).filter(
        SupportTicket.ticket_id == ticket_id,
        SupportTicket.user_id == current_user.user_id
    ).first()

    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    # Vehicle info
    vehicle_number = None
    if ticket.vehicle_id:
        v = db.query(Vehicle).filter(Vehicle.vehicle_id == ticket.vehicle_id).first()
        vehicle_number = v.vehicle_number if v else None

    # Messages (chronological)
    messages = db.query(SupportMessage).filter(
        SupportMessage.ticket_id == ticket_id
    ).order_by(SupportMessage.created_at.asc()).all()

    return {
        "ticket": {
            "ticket_id": ticket.ticket_id,
            "subject": ticket.subject,
            "category": ticket.category,
            "status": ticket.status,
            "vehicle_number": vehicle_number,
            "vehicle_id": ticket.vehicle_id,
            "created_at": ticket.created_at.isoformat() if ticket.created_at else None,
            "updated_at": ticket.updated_at.isoformat() if ticket.updated_at else None,
            "last_message_at": ticket.last_message_at.isoformat() if ticket.last_message_at else None,
            "closed_at": ticket.closed_at.isoformat() if ticket.closed_at else None,
        },
        "messages": [
            {
                "message_id": m.message_id,
                "sender_id": m.sender_id,
                "sender_role": m.sender_role,
                "message": m.message,
                "attachment_path": m.attachment_path,
                "attachment_name": m.attachment_name,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in messages
        ]
    }


# ── POST /support/tickets/{ticket_id}/reply ───────────────────────────────────

@router.post("/tickets/{ticket_id}/reply")
async def reply_to_ticket(
    ticket_id: int,
    request: Request,
    message: str = Form(...),
    attachment: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """User reply to an existing ticket thread with optional attachment."""
    ticket = db.query(SupportTicket).filter(
        SupportTicket.ticket_id == ticket_id,
        SupportTicket.user_id == current_user.user_id
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
        sender_id=current_user.user_id,
        sender_role="USER",
        message=message.strip(),
        attachment_path=attachment_path,
        attachment_name=attachment_name
    )
    db.add(msg)

    ticket.updated_at = now
    ticket.last_message_at = now

    db.commit()
    db.refresh(msg)

    # Audit log
    log_audit(
        action="SUPPORT_REPLY_ADDED",
        actor_id=current_user.user_id,
        actor_email=current_user.email,
        actor_role="USER",
        entity_type="SupportTicket",
        entity_id=ticket_id,
        new_values={
            "message_id": msg.message_id,
            "attachment_name": attachment_name
        },
        request=request
    )

    return {
        "message": "Reply sent successfully",
        "message_id": msg.message_id
    }


@router.get("/tickets/{ticket_id}/messages/{message_id}/attachment")
def download_support_attachment(
    ticket_id: int,
    message_id: int,
    current_user: User = Depends(get_current_user_or_admin),
    db: Session = Depends(get_db)
):
    ticket = db.query(SupportTicket).filter(SupportTicket.ticket_id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    # ONLY ticket owner OR admin can access files.
    # Database-backed role check is used for admin validation.
    if ticket.user_id != current_user.user_id and current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Unauthorized access to this ticket's attachments")
        
    message = db.query(SupportMessage).filter(
        SupportMessage.message_id == message_id,
        SupportMessage.ticket_id == ticket_id
    ).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found in this ticket")
        
    if not message.attachment_path:
        raise HTTPException(status_code=404, detail="This message does not have an attachment")
        
    backend_root = Path(__file__).resolve().parent.parent.parent
    file_path = backend_root / message.attachment_path
    
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Attachment file not found on disk")
        
    # Prevent directory traversal
    try:
        resolved_file = file_path.resolve()
        uploads_resolved = (backend_root / "uploads").resolve()
        if not str(resolved_file).startswith(str(uploads_resolved)):
            raise HTTPException(status_code=400, detail="Invalid file path")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid file path")
        
    filename = message.attachment_name or file_path.name
    filename = "".join(c for c in filename if c.isalnum() or c in "._- ")
    
    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"'
    }
    
    return FileResponse(path=file_path, headers=headers)
