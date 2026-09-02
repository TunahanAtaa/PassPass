from typing import Optional
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Health check response schema."""

    status: str = Field(default="ok", description="Application health status")
    app_name: Optional[str] = Field(default="PassPass API", description="Application name")
    database: Optional[str] = Field(default=None, description="Database connection status")
