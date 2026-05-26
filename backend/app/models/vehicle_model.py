from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func, text
from sqlalchemy.orm import relationship
from app.database import Base


class Vehicle(Base):
    __tablename__ = "vehicles"

    vehicle_id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    user_id = Column(
        Integer,
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False
    )

    vehicle_number = Column(String(20), nullable=False, unique=True, index=True)
    vehicle_class = Column(String(10), nullable=False)
    vehicle_type = Column(String(50), nullable=True)

    engine_number = Column(String(100), nullable=False, unique=True)
    chassis_number = Column(String(100), nullable=False, unique=True)

    fastag_status = Column(
        String(30),
        server_default=text("'INACTIVE'")
    )

    rc_front_path = Column(String(255), nullable=True)
    rc_back_path = Column(String(255), nullable=True)

    rc_verification_status = Column(
        String(30),
        server_default=text("'PENDING'")
    )
    
    rc_uploaded_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    owner = relationship("User", back_populates="vehicles") 