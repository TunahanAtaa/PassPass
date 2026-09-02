"""Authentication request/response schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    """Schema for user registration."""

    email: EmailStr = Field(..., description="User email address")
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="Password (min 8 chars, must contain at least 1 letter and 1 digit)",
    )

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        """Ensure password contains at least one letter and one digit."""
        if not any(c.isalpha() for c in v):
            raise ValueError("Password must contain at least one letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class LoginRequest(BaseModel):
    """Schema for user login."""

    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., description="User password")


class TokenResponse(BaseModel):
    """Schema for JWT token response.

    The vault_token is an opaque session identifier used to access
    vault operations. It is NOT the encryption key — the key never
    leaves the server.
    """

    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field(default="bearer", description="Token type")
    vault_token: str = Field(default="", description="Opaque vault session token for X-Vault-Token header")


class UserResponse(BaseModel):
    """Safe user representation — never includes password_hash."""

    id: uuid.UUID = Field(..., description="User ID")
    email: str = Field(..., description="User email")
    is_active: bool = Field(..., description="Account active status")
    is_email_verified: bool = Field(..., description="Email verification status")
    created_at: datetime = Field(..., description="Account creation timestamp")

    model_config = {"from_attributes": True}
