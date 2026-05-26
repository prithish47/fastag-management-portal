from fastapi import APIRouter, Depends, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import User, Vehicle
from app.models.transaction_model import Transaction
from app.auth.jwt_handler import verify_access_token
from typing import Optional
import io
import os
from fastapi.responses import StreamingResponse
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

router = APIRouter(
    prefix="/transactions",
    tags=["Transactions"]
)

security = HTTPBearer()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security), db: Session = Depends(get_db)) -> User:
    token = credentials.credentials
    payload = verify_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    email = payload.get("sub")
    if not email:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.get("/")
def get_transactions(
    type_filter: Optional[str] = None, # "RECHARGE" or "TOLL"
    vehicle_id: Optional[int] = None,
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    query = db.query(Transaction).filter(Transaction.user_id == current_user.user_id)
    
    if type_filter == "RECHARGE":
        query = query.filter(Transaction.transaction_type == "WALLET_RECHARGE")
    elif type_filter == "TOLL":
        query = query.filter(Transaction.transaction_type == "TOLL_DEDUCTION")
        
    if vehicle_id:
        query = query.filter(Transaction.vehicle_id == vehicle_id)
        
    transactions = query.order_by(Transaction.created_at.desc()).all()
    
    results = []
    for txn in transactions:
        vehicle_num = "—"
        if txn.vehicle:
            vehicle_num = txn.vehicle.vehicle_number
            
        results.append({
            "transaction_id": txn.transaction_id,
            "reference_number": txn.reference_number,
            "amount": float(txn.amount),
            "transaction_type": txn.transaction_type,
            "status": txn.status,
            "payment_method": txn.payment_method or "—",
            "plaza_name": txn.plaza_name or "Wallet Recharge",
            "vehicle_number": vehicle_num,
            "created_at": txn.created_at.strftime("%d %b %Y, %I:%M %p") if txn.created_at else "",
            "failure_reason": txn.failure_reason
        })
        
    return results

@router.get("/export/pdf")
def export_transactions_pdf(
    type_filter: Optional[str] = None, # "RECHARGE" or "TOLL"
    vehicle_id: Optional[int] = None,
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    query = db.query(Transaction).filter(Transaction.user_id == current_user.user_id)
    
    if type_filter == "RECHARGE":
        query = query.filter(Transaction.transaction_type == "WALLET_RECHARGE")
    elif type_filter == "TOLL":
        query = query.filter(Transaction.transaction_type == "TOLL_DEDUCTION")
        
    if vehicle_id:
        query = query.filter(Transaction.vehicle_id == vehicle_id)
        
    transactions = query.order_by(Transaction.created_at.desc()).all()

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
    elements = []
    styles = getSampleStyleSheet()

    # Create Header with logos
    frontend_public = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "..", "frontend", "public")
    fastag_logo_path = os.path.join(frontend_public, "Fastag_logo.png")
    gi_logo_path = os.path.join(frontend_public, "GI_Technology.png")
    
    header_data = []
    has_logos = os.path.exists(fastag_logo_path) and os.path.exists(gi_logo_path)
    if has_logos:
        header_data.append([Image(fastag_logo_path, width=80, height=24), Image(gi_logo_path, width=100, height=25)])
    else:
        header_data.append(["FASTag", "GI Technology"])
    
    header_table = Table(header_data, colWidths=[270, 270])
    header_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 30))

    # Title
    title_style = ParagraphStyle(
        name='TitleStyle',
        parent=styles['Heading1'],
        alignment=1, # Center
        fontSize=18,
        spaceAfter=10,
        textColor=colors.HexColor("#00478F")
    )
    elements.append(Paragraph("Account Statement", title_style))
    elements.append(Spacer(1, 10))
    
    elements.append(Paragraph(f"<b>Account Holder:</b> {current_user.full_name}", styles['Normal']))
    elements.append(Paragraph(f"<b>Email:</b> {current_user.email}", styles['Normal']))
    elements.append(Paragraph(f"<b>Mobile:</b> {current_user.mobile_number}", styles['Normal']))
    elements.append(Spacer(1, 20))

    # Table data
    data = [["Date", "Reference", "Description", "Vehicle", "Amount (Rs)", "Status"]]
    for txn in transactions:
        vehicle_num = txn.vehicle.vehicle_number if txn.vehicle else "-"
        desc = txn.plaza_name or "Wallet Recharge"
        amount_str = f"+{txn.amount}" if txn.transaction_type == "WALLET_RECHARGE" else f"-{txn.amount}"
        date_str = txn.created_at.strftime("%d %b %Y, %I:%M %p") if txn.created_at else ""
        data.append([date_str, txn.reference_number, desc, vehicle_num, amount_str, txn.status])

    table = Table(data, colWidths=[100, 80, 140, 80, 70, 70])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#00478F")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (4, 0), (4, -1), 'RIGHT'), # Amount right aligned
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('BACKGROUND', (0, 1), (-1, -1), colors.whitesmoke),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    
    elements.append(table)
    
    # Footer info
    elements.append(Spacer(1, 40))
    footer_style = ParagraphStyle(name='Footer', parent=styles['Normal'], alignment=1, fontSize=8, textColor=colors.gray)
    elements.append(Paragraph("This is a computer-generated statement and does not require a signature.", footer_style))
    elements.append(Paragraph("GI Technology FASTag Portal | Support: fastag-support@gitechnology.in", footer_style))

    doc.build(elements)
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=Account_Statement.pdf"}
    )
