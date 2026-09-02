"""Password service — business logic for vault CRUD with encryption and ownership.

All encryption operations use a vault_key parameter that is derived from
the user's password via Argon2id KDF and stored in server-side session.
The key is never stored in the database or included in API responses.
"""

import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.encryption import encrypt, decrypt
from app.models.password_entry import PasswordEntry
from app.repositories import password_repository
from app.schemas.password import PasswordCreate, PasswordUpdate


def create_password(
    db: Session,
    user_id: uuid.UUID,
    data: PasswordCreate,
    vault_key: bytes,
) -> PasswordEntry:
    """Create a new password entry with encrypted sensitive fields.

    Encrypts password and notes before database storage.
    Plaintext is never persisted.
    """
    encrypted_password = None
    password_nonce = None
    encrypted_notes = None
    notes_nonce = None

    if data.password is not None:
        encrypted_password, password_nonce = encrypt(data.password, vault_key)

    if data.notes is not None:
        encrypted_notes, notes_nonce = encrypt(data.notes, vault_key)

    return password_repository.create_entry(
        db,
        user_id=user_id,
        title=data.title,
        username=data.username,
        url=data.url,
        encrypted_password=encrypted_password,
        password_nonce=password_nonce,
        encrypted_notes=encrypted_notes,
        notes_nonce=notes_nonce,
    )


def get_password(
    db: Session,
    user_id: uuid.UUID,
    entry_id: uuid.UUID,
    vault_key: bytes,
) -> dict:
    """Get a single password entry with decrypted sensitive fields.

    Verifies ownership: returns 404 if entry doesn't exist or belongs
    to another user (prevents IDOR by not revealing entry existence).
    """
    entry = _get_owned_entry(db, user_id, entry_id)
    return _entry_to_decrypted_dict(entry, vault_key)


def list_passwords(
    db: Session,
    user_id: uuid.UUID,
) -> list[PasswordEntry]:
    """List all password entries for the authenticated user.

    Returns ORM objects directly — no decryption needed for list view.
    Only returns entries owned by the specified user.
    """
    return password_repository.get_entries_by_user_id(db, user_id)


def update_password(
    db: Session,
    user_id: uuid.UUID,
    entry_id: uuid.UUID,
    data: PasswordUpdate,
    vault_key: bytes,
) -> dict:
    """Update a password entry, re-encrypting sensitive fields if changed.

    Verifies ownership before allowing updates.
    """
    entry = _get_owned_entry(db, user_id, entry_id)

    update_fields = {}

    # Non-sensitive fields: update if explicitly provided
    if data.title is not None:
        update_fields["title"] = data.title
    if data.username is not None:
        update_fields["username"] = data.username
    if data.url is not None:
        update_fields["url"] = data.url

    # Sensitive fields: re-encrypt if changed
    if data.password is not None:
        enc_pw, pw_nonce = encrypt(data.password, vault_key)
        update_fields["encrypted_password"] = enc_pw
        update_fields["password_nonce"] = pw_nonce

    if data.notes is not None:
        enc_notes, n_nonce = encrypt(data.notes, vault_key)
        update_fields["encrypted_notes"] = enc_notes
        update_fields["notes_nonce"] = n_nonce

    if update_fields:
        entry = password_repository.update_entry(db, entry, **update_fields)

    return _entry_to_decrypted_dict(entry, vault_key)


def delete_password(
    db: Session,
    user_id: uuid.UUID,
    entry_id: uuid.UUID,
) -> None:
    """Delete a password entry after verifying ownership."""
    entry = _get_owned_entry(db, user_id, entry_id)
    password_repository.delete_entry(db, entry)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _get_owned_entry(
    db: Session,
    user_id: uuid.UUID,
    entry_id: uuid.UUID,
) -> PasswordEntry:
    """Retrieve a password entry and verify it belongs to the given user.

    Returns 404 for both missing entries and ownership mismatches
    to prevent information leakage (IDOR protection).
    """
    entry = password_repository.get_entry_by_id(db, entry_id)

    if entry is None or entry.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Password entry not found",
        )

    return entry


def _entry_to_decrypted_dict(entry: PasswordEntry, vault_key: bytes) -> dict:
    """Convert a PasswordEntry to a dict with decrypted sensitive fields.

    Decrypts encrypted_password and encrypted_notes if present.
    """
    decrypted_password = None
    if entry.encrypted_password and entry.password_nonce:
        decrypted_password = decrypt(
            entry.encrypted_password, entry.password_nonce, vault_key
        )

    decrypted_notes = None
    if entry.encrypted_notes and entry.notes_nonce:
        decrypted_notes = decrypt(
            entry.encrypted_notes, entry.notes_nonce, vault_key
        )

    return {
        "id": entry.id,
        "title": entry.title,
        "username": entry.username,
        "url": entry.url,
        "password": decrypted_password,
        "notes": decrypted_notes,
        "created_at": entry.created_at,
        "updated_at": entry.updated_at,
    }
