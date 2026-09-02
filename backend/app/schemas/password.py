"""Password entry request/response schemas."""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class PasswordCreate(BaseModel):
    """Schema for creating a new password entry."""

    title: str = Field(
        ..., min_length=1, max_length=512, description="Entry title (e.g. GitHub)"
    )
    username: Optional[str] = Field(
        None, max_length=320, description="Username or email for the service"
    )
    url: Optional[str] = Field(
        None, max_length=2048, description="Service URL"
    )
    password: Optional[str] = Field(
        None, description="Password to store (will be encrypted)"
    )
    notes: Optional[str] = Field(
        None, description="Additional notes (will be encrypted)"
    )


class PasswordUpdate(BaseModel):
    """Schema for updating a password entry. All fields optional."""

    title: Optional[str] = Field(
        None, min_length=1, max_length=512, description="Entry title"
    )
    username: Optional[str] = Field(
        None, max_length=320, description="Username or email for the service"
    )
    url: Optional[str] = Field(
        None, max_length=2048, description="Service URL"
    )
    password: Optional[str] = Field(
        None, description="New password (will be re-encrypted)"
    )
    notes: Optional[str] = Field(
        None, description="New notes (will be re-encrypted)"
    )


class PasswordResponse(BaseModel):
    """Single password entry response — includes decrypted password and notes.

    Never exposes encryption internals (encrypted_password, password_nonce,
    encrypted_notes, notes_nonce, encryption key).
    """

    id: uuid.UUID = Field(..., description="Entry ID")
    title: str = Field(..., description="Entry title")
    username: Optional[str] = Field(None, description="Username")
    url: Optional[str] = Field(None, description="Service URL")
    password: Optional[str] = Field(None, description="Decrypted password")
    notes: Optional[str] = Field(None, description="Decrypted notes")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    model_config = {"from_attributes": True}


class PasswordListItem(BaseModel):
    """Password entry in list response — no password/notes for security.

    Listing endpoints should not return decrypted sensitive data.
    """

    id: uuid.UUID = Field(..., description="Entry ID")
    title: str = Field(..., description="Entry title")
    username: Optional[str] = Field(None, description="Username")
    url: Optional[str] = Field(None, description="Service URL")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    model_config = {"from_attributes": True}


class PasswordListResponse(BaseModel):
    """Response for listing password entries."""

    items: list[PasswordListItem] = Field(..., description="Password entries")
    count: int = Field(..., description="Total number of entries")
