"""
Admin Service — Router Aggregation
====================================
Combines all admin routes into a single router.
Mounted into the main app with prefix /admin.
"""
from fastapi import APIRouter

from admin_service.routes.admin_auth_routes import router as auth_router
from admin_service.routes.admin_dashboard_routes import router as dashboard_router
from admin_service.routes.admin_users_routes import router as users_router
from admin_service.routes.admin_vehicles_routes import router as vehicles_router
from admin_service.routes.admin_transactions_routes import router as transactions_router
from admin_service.routes.admin_activity_routes import router as activity_router
from admin_service.routes.admin_fastag_routes import router as fastag_router
from admin_service.routes.admin_support_routes import router as support_router
from admin_service.routes.admin_integrity_routes import router as integrity_router

admin_router = APIRouter()

# Include all sub-routers
admin_router.include_router(auth_router)
admin_router.include_router(dashboard_router)
admin_router.include_router(users_router)
admin_router.include_router(vehicles_router)
admin_router.include_router(transactions_router)
admin_router.include_router(activity_router)
admin_router.include_router(fastag_router)
admin_router.include_router(support_router)
admin_router.include_router(integrity_router)
