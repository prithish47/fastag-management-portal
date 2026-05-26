from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Numeric, func
from sqlalchemy.orm import relationship
from app.database import Base


class TollCrossing(Base):
    __tablename__ = "toll_crossings"

    crossing_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    vehicle_id = Column(
        Integer,
        ForeignKey("vehicles.vehicle_id", ondelete="CASCADE"),
        nullable=False
    )
    fastag_id = Column(String(20), nullable=False)
    plaza_name = Column(String(255), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    location_state = Column(String(100), nullable=True)
    remarks = Column(String(255), nullable=True)
    wallet_balance_before = Column(Numeric(10, 2), nullable=False)
    wallet_balance_after = Column(Numeric(10, 2), nullable=False)
    transaction_id = Column(
        Integer,
        ForeignKey("transactions.transaction_id", ondelete="CASCADE"),
        nullable=False
    )
    crossed_at = Column(DateTime, server_default=func.now(), nullable=False)

    # Relationships
    vehicle = relationship("Vehicle")
    transaction = relationship("Transaction")
