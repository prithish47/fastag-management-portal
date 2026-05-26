from sqlalchemy import Column, Integer, String, Text, Numeric, DateTime, func, text, Boolean
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(100), nullable=False, unique=True, index=True)
    mobile_number = Column(String(15), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    address = Column(Text, nullable=True)
    wallet_balance = Column(Numeric(10, 2), server_default=text("0.00"))
    role = Column(String(20), server_default=text("'USER'"), nullable=False)
    account_status = Column(String(20), server_default=text("'ACTIVE'"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    
    # Low balance alerts configurations
    low_balance_alert_enabled = Column(Boolean, default=False, server_default=text("0"))
    low_balance_threshold = Column(Numeric(10, 2), default=100.00, server_default=text("100.00"))

    # Password reset tokens
    password_reset_token = Column(String(255), nullable=True, index=True)
    password_reset_expires = Column(DateTime, nullable=True)

    # Relationship: One User -> Many Vehicles
    vehicles = relationship("Vehicle", back_populates="owner", cascade="all, delete-orphan")
