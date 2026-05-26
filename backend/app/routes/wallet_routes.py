import asyncio
from datetime import datetime
import random
import string
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Security, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import User, Vehicle
from app.models.transaction_model import Transaction, TransactionType, TransactionStatus
from app.models.activity_log_model import VehicleActivityLog
from app.models.notification_model import Notification
from app.schemas.wallet_schema import RechargeRequest, TollCrossingSimulationRequest
from app.auth.jwt_handler import verify_access_token
from app.utils.audit_logger import log_audit
from app.limiter import limiter

router = APIRouter(
    prefix="/wallet",
    tags=["Wallet"]
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

def generate_txn_reference():
    # Example: TXN7F2K91A
    random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=7))
    return f"TXN{random_str}"

@router.post("/recharge")
@limiter.limit("10/minute")
async def recharge_wallet(req: RechargeRequest, request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="Recharge amount must be greater than zero.")
        
    # Simulate backend payment processing delay
    await asyncio.sleep(1.5)
    
    # 1. Fetch current wallet balance
    balance_before = current_user.wallet_balance or Decimal('0.00')
    balance_after = balance_before + req.amount
    
    # 2. Update user wallet balance
    current_user.wallet_balance = balance_after
    
    # 3. Create transaction record
    txn_ref = generate_txn_reference()
    new_txn = Transaction(
        user_id=current_user.user_id,
        vehicle_id=req.vehicle_id,
        amount=req.amount,
        transaction_type=TransactionType.WALLET_RECHARGE.value,
        status=TransactionStatus.SUCCESS.value,
        payment_method=req.payment_method,
        balance_before=balance_before,
        balance_after=balance_after,
        reference_number=txn_ref
    )
    db.add(new_txn)
    
    # 4. Create activity log (if tied to a vehicle, else skip or log globally)
    if req.vehicle_id:
        activity = VehicleActivityLog(
            vehicle_id=req.vehicle_id,
            activity_type="WALLET_RECHARGE",
            activity_message=f"Wallet recharged with ₹{req.amount} via {req.payment_method}"
        )
        db.add(activity)
        
    # 5. Create Notification
    notification = Notification(
        user_id=current_user.user_id,
        title="Wallet Recharge Successful",
        message=f"₹{req.amount} added to your FASTag wallet. Reference: {txn_ref}",
        type="WALLET"
    )
    db.add(notification)
    
    db.commit()
    db.refresh(new_txn)
    
    log_audit(
        action="WALLET_RECHARGE",
        actor_id=current_user.user_id,
        actor_email=current_user.email,
        actor_role=current_user.role,
        entity_type="Transaction",
        entity_id=new_txn.transaction_id,
        new_values={
            "amount": float(req.amount),
            "payment_method": req.payment_method,
            "reference_number": txn_ref,
            "vehicle_id": req.vehicle_id,
            "balance_after": float(balance_after)
        },
        request=request
    )
    
    return {
        "message": "Recharge successful",
        "reference_number": txn_ref,
        "new_balance": float(balance_after)
    }


def generate_toll_txn_reference():
    random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"TOLL{random_str}"


@router.post("/simulate-toll-crossing")
@limiter.limit("20/minute")
async def simulate_toll_crossing(
    req: TollCrossingSimulationRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Amount validation
    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="Toll amount must be greater than zero.")
    if req.amount > 5000:
        raise HTTPException(status_code=400, detail="Unrealistic toll amount. Maximum limit is ₹5,000.")

    # 2. Fetch vehicle and verify ownership
    vehicle = db.query(Vehicle).filter(
        Vehicle.vehicle_id == req.vehicle_id,
        Vehicle.user_id == current_user.user_id
    ).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found or not owned by current user.")

    # 3. Check RC verification status
    if vehicle.rc_verification_status != "VERIFIED":
        failure_reason = "RC_UNVERIFIED"
        # Failed Flow
        txn_ref = generate_toll_txn_reference()
        new_txn = Transaction(
            user_id=current_user.user_id,
            vehicle_id=vehicle.vehicle_id,
            amount=req.amount,
            transaction_type=TransactionType.TOLL_DEDUCTION.value,
            status=TransactionStatus.FAILED.value,
            reference_number=txn_ref,
            plaza_name=req.plaza_name,
            failure_reason=failure_reason
        )
        db.add(new_txn)

        notification = Notification(
            user_id=current_user.user_id,
            title="Toll Crossing Rejected",
            message=f"Toll crossing at {req.plaza_name} failed. Vehicle RC book is not verified.",
            type="VEHICLE"
        )
        db.add(notification)
        db.commit()

        return {
            "success": False,
            "barrier_state": "CLOSED",
            "failure_reason": failure_reason,
            "reference_number": txn_ref,
            "amount": float(req.amount),
            "plaza_name": req.plaza_name,
            "timestamp": datetime.now().strftime("%d %b %Y, %I:%M %p")
        }

    # 4. Check FASTag active status (both in vehicle status and inventory)
    from app.models.fastag_inventory_model import FastagInventory
    active_tag = db.query(FastagInventory).filter(
        FastagInventory.assigned_vehicle_id == vehicle.vehicle_id,
        FastagInventory.status == "ACTIVE"
    ).first()

    if vehicle.fastag_status != "ACTIVE" or not active_tag:
        failure_reason = "FASTAG_DISABLED"
        # Failed Flow
        txn_ref = generate_toll_txn_reference()
        new_txn = Transaction(
            user_id=current_user.user_id,
            vehicle_id=vehicle.vehicle_id,
            amount=req.amount,
            transaction_type=TransactionType.TOLL_DEDUCTION.value,
            status=TransactionStatus.FAILED.value,
            reference_number=txn_ref,
            plaza_name=req.plaza_name,
            failure_reason=failure_reason
        )
        db.add(new_txn)

        notification = Notification(
            user_id=current_user.user_id,
            title="Toll Crossing Rejected",
            message=f"Toll crossing at {req.plaza_name} failed. FASTag is disabled/inactive.",
            type="VEHICLE"
        )
        db.add(notification)
        db.commit()

        return {
            "success": False,
            "barrier_state": "CLOSED",
            "failure_reason": failure_reason,
            "reference_number": txn_ref,
            "amount": float(req.amount),
            "plaza_name": req.plaza_name,
            "timestamp": datetime.now().strftime("%d %b %Y, %I:%M %p")
        }

    # 5. Check wallet balance
    balance_before = current_user.wallet_balance or Decimal('0.00')
    if balance_before < req.amount:
        failure_reason = "INSUFFICIENT_BALANCE"
        # Failed Flow
        txn_ref = generate_toll_txn_reference()
        new_txn = Transaction(
            user_id=current_user.user_id,
            vehicle_id=vehicle.vehicle_id,
            amount=req.amount,
            transaction_type=TransactionType.TOLL_DEDUCTION.value,
            status=TransactionStatus.FAILED.value,
            reference_number=txn_ref,
            plaza_name=req.plaza_name,
            failure_reason=failure_reason
        )
        db.add(new_txn)

        notification = Notification(
            user_id=current_user.user_id,
            title="Toll Crossing Rejected",
            message=f"Toll crossing at {req.plaza_name} failed due to insufficient wallet balance.",
            type="WALLET"
        )
        db.add(notification)
        db.commit()

        # Trigger low balance alert/email
        if current_user.low_balance_alert_enabled:
            from app.utils.email_helper import send_low_balance_email
            send_low_balance_email(
                to_email=current_user.email,
                full_name=current_user.full_name,
                balance=float(balance_before),
                threshold=float(current_user.low_balance_threshold)
            )

        return {
            "success": False,
            "barrier_state": "CLOSED",
            "failure_reason": failure_reason,
            "reference_number": txn_ref,
            "amount": float(req.amount),
            "plaza_name": req.plaza_name,
            "timestamp": datetime.now().strftime("%d %b %Y, %I:%M %p")
        }

    # 6. Successful Flow
    # Deduct wallet balance
    balance_after = balance_before - req.amount
    current_user.wallet_balance = balance_after

    # Create transaction
    txn_ref = generate_toll_txn_reference()
    new_txn = Transaction(
        user_id=current_user.user_id,
        vehicle_id=vehicle.vehicle_id,
        amount=req.amount,
        transaction_type=TransactionType.TOLL_DEDUCTION.value,
        status=TransactionStatus.SUCCESS.value,
        reference_number=txn_ref,
        plaza_name=req.plaza_name,
        balance_before=balance_before,
        balance_after=balance_after
    )
    db.add(new_txn)
    db.flush() # Populate new_txn.transaction_id

    # Create TollCrossing record
    from app.models.toll_crossing_model import TollCrossing
    new_crossing = TollCrossing(
        vehicle_id=vehicle.vehicle_id,
        fastag_id=active_tag.fastag_id,
        plaza_name=req.plaza_name,
        amount=req.amount,
        location_state=req.location_state,
        remarks=req.remarks,
        wallet_balance_before=balance_before,
        wallet_balance_after=balance_after,
        transaction_id=new_txn.transaction_id
    )
    db.add(new_crossing)

    # Create VehicleActivityLog
    activity = VehicleActivityLog(
        vehicle_id=vehicle.vehicle_id,
        activity_type="TOLL_CROSSED",
        activity_message=f"Toll crossed at {req.plaza_name}. Amount: ₹{req.amount}"
    )
    db.add(activity)

    # Create Notification
    notification = Notification(
        user_id=current_user.user_id,
        title="Toll Deducted",
        message=f"₹{req.amount} deducted at {req.plaza_name}.",
        type="WALLET"
    )
    db.add(notification)

    # Trigger low balance alert if threshold crossed
    if current_user.low_balance_alert_enabled and balance_after < current_user.low_balance_threshold:
        from app.utils.email_helper import send_low_balance_email
        send_low_balance_email(
            to_email=current_user.email,
            full_name=current_user.full_name,
            balance=float(balance_after),
            threshold=float(current_user.low_balance_threshold)
        )
        # Also add a notification for low balance
        warn_notif = Notification(
            user_id=current_user.user_id,
            title="Low Wallet Balance Warning",
            message=f"Your wallet balance has fallen below the threshold to ₹{balance_after}.",
            type="WALLET"
        )
        db.add(warn_notif)

    db.commit()

    # Log audit
    log_audit(
        action="TOLL_CROSSED",
        actor_id=current_user.user_id,
        actor_email=current_user.email,
        actor_role=current_user.role,
        entity_type="TollCrossing",
        entity_id=new_crossing.crossing_id,
        new_values={
            "amount": float(req.amount),
            "plaza_name": req.plaza_name,
            "vehicle_number": vehicle.vehicle_number,
            "reference_number": txn_ref,
            "balance_after": float(balance_after)
        },
        request=request
    )

    return {
        "success": True,
        "barrier_state": "OPENED",
        "reference_number": txn_ref,
        "amount": float(req.amount),
        "plaza_name": req.plaza_name,
        "wallet_balance_after": float(balance_after),
        "timestamp": datetime.now().strftime("%d %b %Y, %I:%M %p")
    }
