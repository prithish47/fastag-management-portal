from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

class UserRegister(BaseModel):
    full_name: str
    email: EmailStr
    mobile_number: str
    password: str
    address: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str

class ForgotPasswordSchema(BaseModel):
    email: EmailStr

class ResetPasswordSchema(BaseModel):
    token: str
    new_password: str

class VehicleResponse(BaseModel):
    vehicle_id: int
    vehicle_number: str
    vehicle_class: str
    vehicle_type: Optional[str] = None
    fastag_status: str
    rc_verification_status: str = "PENDING"

    class Config:
        from_attributes = True

class DashboardDataResponse(BaseModel):
    full_name: str
    email: str
    mobile_number: str
    wallet_balance: float
    vehicles: List[VehicleResponse]
    low_balance_alert_enabled: bool = False
    low_balance_threshold: float = 100.00

    class Config:
        from_attributes = True

class AlertSettingsRequest(BaseModel):
    enabled: bool
    threshold: float