"""PasswordEntry ORM model."""

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import String, Text, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class PasswordEntry(Base):
    """Represents a stored password entry belonging to a user.

    Encryption fields (encrypted_password, password_nonce, encrypted_notes)
    are schema placeholders for a future encryption implementation.
    """

    __tablename__ = "password_entries"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(
        String(512),
        nullable=False,
    )
    username: Mapped[Optional[str]] = mapped_column(
        String(320),
        nullable=True,
    )
    url: Mapped[Optional[str]] = mapped_column(
        String(2048),
        nullable=True,
    )
    encrypted_password: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    password_nonce: Mapped[Optional[str]] = mapped_column(
        String(64),
        nullable=True,
    )
    encrypted_notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    notes_nonce: Mapped[Optional[str]] = mapped_column(
        String(64),
        nullable=True,
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

    # Many-to-one: PasswordEntry -> User
    user: Mapped["User"] = relationship(
        "User",
        back_populates="password_entries",
    )

    def __repr__(self) -> str:
        return f"<PasswordEntry(id={self.id!r}, title={self.title!r})>"
