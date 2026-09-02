"""User ORM model."""

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Boolean, String, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class User(Base):
    """Represents a PassPass user account.

    Each user has a unique email and can own multiple password entries.
    """

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )
    email: Mapped[str] = mapped_column(
        String(320),
        unique=True,
        nullable=False,
        index=True,
    )
    password_hash: Mapped[str] = mapped_column(
        String(256),
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )
    # Per-user salt for vault encryption key derivation (base64-encoded).
    # Separate from the password_hash salt. Stored as base64 string.
    # NULL for users created before KDF migration (vault unlock unavailable).
    vault_kdf_salt: Mapped[Optional[str]] = mapped_column(
        String(64),
        nullable=True,
    )
    is_email_verified: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # One-to-many: User -> PasswordEntry
    password_entries: Mapped[list["PasswordEntry"]] = relationship(
        "PasswordEntry",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id!r}, email={self.email!r})>"
