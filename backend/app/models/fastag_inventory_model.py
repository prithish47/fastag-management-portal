from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, func, text
from sqlalchemy.orm import relationship
from app.database import Base


class FastagInventory(Base):
    __tablename__ = "fastag_inventory"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    fastag_id = Column(String(20), nullable=False, unique=True, index=True)
    tag_serial_number = Column(String(50), nullable=False, unique=True)
    vehicle_class = Column(String(10), nullable=False)  # VC4, VC5, VC6, VC7, VC12, VC16
    status = Column(
        String(30),
        server_default=text("'UNASSIGNED'"),
        nullable=False
    )  # UNASSIGNED, ASSIGNED, ACTIVE, DISABLED, BLACKLISTED, REPLACED, DAMAGED
    is_blacklisted = Column(Boolean, default=False)
    assigned_vehicle_id = Column(
        Integer,
        ForeignKey("vehicles.vehicle_id", ondelete="SET NULL"),
        nullable=True
    )
    issued_at = Column(DateTime, nullable=True)
    activated_at = Column(DateTime, nullable=True)
    last_assigned_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    # Relationship
    assigned_vehicle = relationship("Vehicle", foreign_keys=[assigned_vehicle_id])
