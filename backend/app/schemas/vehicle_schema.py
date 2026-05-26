from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class VehicleAddResponse(BaseModel):
    vehicle_id: int
    vehicle_number: str
    vehicle_class: str
    vehicle_type: Optional[str] = None
    fastag_status: str
    rc_verification_status: str = "PENDING"
    rc_front_path: Optional[str] = None
    rc_back_path: Optional[str] = None
    rc_uploaded_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class VehicleListResponse(BaseModel):
    vehicle_id: int
    vehicle_number: str
    vehicle_class: str
    vehicle_type: Optional[str] = None
    fastag_status: str
    rc_verification_status: str = "PENDING"
    rc_front_path: Optional[str] = None
    rc_back_path: Optional[str] = None
    rc_uploaded_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
