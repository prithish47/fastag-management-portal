from pydantic import BaseModel
from typing import Optional
from decimal import Decimal

class RechargeRequest(BaseModel):
    amount: Decimal
    payment_method: str
    vehicle_id: Optional[int] = None

class TollCrossingSimulationRequest(BaseModel):
    vehicle_id: int
    plaza_name: str
    amount: Decimal
    location_state: Optional[str] = None
    remarks: Optional[str] = None
