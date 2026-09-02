from fastapi import APIRouter
from app.api.routes import auth, health, passwords

api_router = APIRouter()

# Register route modules
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(passwords.router, prefix="/passwords", tags=["passwords"])

