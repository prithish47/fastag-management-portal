from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from app.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    log_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    actor_id = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    actor_email = Column(String(100), nullable=True, index=True)
    actor_role = Column(String(20), nullable=True)  # 'USER', 'ADMIN', 'SYSTEM'
    action = Column(String(100), nullable=False, index=True)
    entity_type = Column(String(50), nullable=True, index=True)
    entity_id = Column(Integer, nullable=True, index=True)
    old_values = Column(Text, nullable=True)  # JSON text format
    new_values = Column(Text, nullable=True)  # JSON text format
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(255), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
