"""Password vault CRUD routes.

All endpoints require:
    1. JWT authentication via get_current_user (Authorization: Bearer <token>)
    2. Vault session via get_vault_key (X-Vault-Token: <token>)

User identity is always resolved from the JWT — never from request body.
Vault encryption key is resolved from server-side session — never from client.
Ownership isolation ensures users can only access their own entries.
"""

import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_vault_key
from app.db.session import get_db
from app.models.user import User
from app.schemas.password import (
    PasswordCreate,
    PasswordUpdate,
    PasswordResponse,
    PasswordListItem,
    PasswordListResponse,
)
from app.services import password_service

router = APIRouter()


@router.post(
    "",
    response_model=PasswordResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new password entry",
)
def create_password(
    body: PasswordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    vault_key: bytes = Depends(get_vault_key),
) -> PasswordResponse:
    """Create a new password entry in the authenticated user's vault.

    Password and notes fields are encrypted before storage using the
    user's derived vault key. The user_id is taken from the JWT.
    """
    entry = password_service.create_password(db, current_user.id, body, vault_key)
    decrypted = password_service._entry_to_decrypted_dict(entry, vault_key)
    return PasswordResponse(**decrypted)


@router.get(
    "",
    response_model=PasswordListResponse,
    summary="List all password entries",
)
def list_passwords(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PasswordListResponse:
    """List all password entries belonging to the authenticated user.

    Does not include decrypted passwords or notes in the response.
    Other users' entries are never returned.
    No vault key needed for listing (no decryption performed).
    """
    entries = password_service.list_passwords(db, current_user.id)
    items = [PasswordListItem.model_validate(e) for e in entries]
    return PasswordListResponse(items=items, count=len(items))


@router.get(
    "/{entry_id}",
    response_model=PasswordResponse,
    summary="Get a password entry",
)
def get_password(
    entry_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    vault_key: bytes = Depends(get_vault_key),
) -> PasswordResponse:
    """Get a single password entry with decrypted values.

    Returns 404 if the entry doesn't exist or belongs to another user.
    """
    result = password_service.get_password(db, current_user.id, entry_id, vault_key)
    return PasswordResponse(**result)


@router.put(
    "/{entry_id}",
    response_model=PasswordResponse,
    summary="Update a password entry",
)
def update_password(
    entry_id: uuid.UUID,
    body: PasswordUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    vault_key: bytes = Depends(get_vault_key),
) -> PasswordResponse:
    """Update an existing password entry.

    Re-encrypts password and notes if they are changed.
    Returns 404 if the entry doesn't exist or belongs to another user.
    """
    result = password_service.update_password(
        db, current_user.id, entry_id, body, vault_key,
    )
    return PasswordResponse(**result)


@router.delete(
    "/{entry_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a password entry",
)
def delete_password(
    entry_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """Delete a password entry from the vault.

    Returns 404 if the entry doesn't exist or belongs to another user.
    No vault key needed for deletion.
    """
    password_service.delete_password(db, current_user.id, entry_id)
