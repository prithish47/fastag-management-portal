from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.auth_routes import router as auth_router
from app.routes.info_routes import router as info_router
from app.routes.dashboard_routes import router as dashboard_router
from app.routes.vehicle_routes import router as vehicle_router
from app.routes.wallet_routes import router as wallet_router
from app.routes.transaction_routes import router as transaction_router
from app.routes.notification_routes import router as notification_router
from app.routes.support_routes import router as support_router
from admin_service.main import admin_router

from app.limiter import limiter
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

import os


app = FastAPI(
    title="FASTag Portal API",
    description="GI Technology FASTag Management Portal",
    version="1.0.0"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Ensure uploads directory exists
os.makedirs("uploads/rc_documents", exist_ok=True)
os.makedirs("uploads/support_attachments", exist_ok=True)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── User Service Routes ──────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(info_router)
app.include_router(dashboard_router)
app.include_router(vehicle_router)
app.include_router(wallet_router)
app.include_router(transaction_router)
app.include_router(notification_router)
app.include_router(support_router)

# ─── Admin Service Routes ─────────────────────────────────────────────────────
app.include_router(admin_router, prefix="/admin", tags=["Admin Operations"])

@app.get("/")
def home():
    return {
        "message": "FASTag Backend Running"
    }