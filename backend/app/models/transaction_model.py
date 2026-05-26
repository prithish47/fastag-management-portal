from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func, DECIMAL, Enum
from sqlalchemy.orm import relationship
from app.database import Base
import enum

class TransactionType(str, enum.Enum):
    TOLL_DEDUCTION = "TOLL_DEDUCTION"
    WALLET_RECHARGE = "WALLET_RECHARGE"

class TransactionStatus(str, enum.Enum):
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    PENDING = "PENDING"

class Transaction(Base):
    __tablename__ = "transactions"

    transaction_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    vehicle_id = Column(Integer, ForeignKey("vehicles.vehicle_id", ondelete="CASCADE"), nullable=True)
    
    amount = Column(DECIMAL(10, 2), nullable=False)
    transaction_type = Column(String(50), nullable=False)
    status = Column(String(30), nullable=False, default=TransactionStatus.SUCCESS.value)
    payment_method = Column(String(50), nullable=True)
    
    plaza_name = Column(String(255), nullable=True) # Used for tolls
    reference_number = Column(String(100), nullable=True, unique=True)
    balance_before = Column(DECIMAL(10, 2), nullable=True)
    balance_after = Column(DECIMAL(10, 2), nullable=True)
    failure_reason = Column(String(255), nullable=True) # e.g. INSUFFICIENT_BALANCE, FASTAG_DISABLED, RC_UNVERIFIED
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User")
    vehicle = relationship("Vehicle")
