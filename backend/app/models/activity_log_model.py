from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base

class VehicleActivityLog(Base):
    __tablename__ = "vehicle_activity_logs"

    log_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.vehicle_id", ondelete="CASCADE"), nullable=False)
    
    activity_type = Column(String(50), nullable=False) # e.g. "RC_UPLOAD", "VEHICLE_ADDED", "VERIFICATION_STATUS"
    activity_message = Column(String(255), nullable=False)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    vehicle = relationship("Vehicle")
