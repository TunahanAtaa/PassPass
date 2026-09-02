"""Password entry repository — data access layer for PasswordEntry model."""

import uuid
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.password_entry import PasswordEntry


def create_entry(
    db: Session,
    *,
    user_id: uuid.UUID,
    title: str,
    username: Optional[str] = None,
    url: Optional[str] = None,
    encrypted_password: Optional[str] = None,
    password_nonce: Optional[str] = None,
    encrypted_notes: Optional[str] = None,
    notes_nonce: Optional[str] = None,
) -> PasswordEntry:
    """Persist a new password entry to the database.

    Caller is responsible for encrypting sensitive fields before passing them here.
    """
    entry = PasswordEntry(
        user_id=user_id,
        title=title,
        username=username,
        url=url,
        encrypted_password=encrypted_password,
        password_nonce=password_nonce,
        encrypted_notes=encrypted_notes,
        notes_nonce=notes_nonce,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def get_entry_by_id(db: Session, entry_id: uuid.UUID) -> Optional[PasswordEntry]:
    """Find a password entry by primary key.

    Returns the PasswordEntry or None if not found.
    Does NOT filter by user — caller must verify ownership.
    """
    return db.get(PasswordEntry, entry_id)


def get_entries_by_user_id(db: Session, user_id: uuid.UUID) -> list[PasswordEntry]:
    """Get all password entries belonging to a specific user.

    Returns entries ordered by creation time (newest first).
    """
    stmt = (
        select(PasswordEntry)
        .where(PasswordEntry.user_id == user_id)
        .order_by(PasswordEntry.created_at.desc())
    )
    return list(db.execute(stmt).scalars().all())


def update_entry(
    db: Session,
    entry: PasswordEntry,
    **kwargs,
) -> PasswordEntry:
    """Update fields on an existing password entry.

    Only provided kwargs are set; omitted fields remain unchanged.
    Caller is responsible for encrypting sensitive fields before passing them.
    """
    for field, value in kwargs.items():
        if hasattr(entry, field):
            setattr(entry, field, value)
    db.commit()
    db.refresh(entry)
    return entry


def delete_entry(db: Session, entry: PasswordEntry) -> None:
    """Delete a password entry from the database."""
    db.delete(entry)
    db.commit()
