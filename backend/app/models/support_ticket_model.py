from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base


class SupportTicket(Base):
    __tablename__ = "support_tickets"

    ticket_id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    user_id = Column(
        Integer,
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    vehicle_id = Column(
        Integer,
        ForeignKey("vehicles.vehicle_id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    category = Column(String(50), nullable=False)
    # FASTAG_ISSUE, RC_VERIFICATION, WALLET_ISSUE, TOLL_DEDUCTION,
    # REPLACEMENT_REQUEST, ACCOUNT_ISSUE, OTHER


    status = Column(String(20), nullable=False, server_default="OPEN", index=True)
    # OPEN, IN_PROGRESS, RESOLVED, CLOSED

    subject = Column(String(200), nullable=False)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    last_message_at = Column(DateTime, nullable=True)
    closed_at = Column(DateTime, nullable=True)  # Only set when status = CLOSED

    # Relationships
    user = relationship("User")
    vehicle = relationship("Vehicle")
    messages = relationship("SupportMessage", back_populates="ticket", cascade="all, delete-orphan", order_by="SupportMessage.created_at")
