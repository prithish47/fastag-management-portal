from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base


class SupportMessage(Base):
    __tablename__ = "support_messages"

    message_id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    ticket_id = Column(
        Integer,
        ForeignKey("support_tickets.ticket_id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Plain integer, no FK — sender_role already disambiguates USER vs ADMIN
    sender_id = Column(Integer, nullable=True)
    sender_role = Column(String(20), nullable=False)  # USER or ADMIN

    message = Column(Text, nullable=False)

    attachment_path = Column(String(255), nullable=True)
    attachment_name = Column(String(255), nullable=True)

    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    ticket = relationship("SupportTicket", back_populates="messages")
