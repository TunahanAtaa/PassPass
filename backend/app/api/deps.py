"""API dependencies for authentication and vault access."""

import uuid

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.vault_session import vault_session_store
from app.db.session import get_db
from app.models.user import User
from app.repositories import user_repository

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """FastAPI dependency that extracts and validates the current user from a JWT.

    Flow:
        1. Extract Bearer token from Authorization header
        2. Decode and validate JWT (including expiration)
        3. Look up user by ID from token 'sub' claim
        4. Verify user is active

    Raises:
        HTTPException 401: Token missing, invalid, expired, or user not found/inactive.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        sub: str | None = payload.get("sub")
        if sub is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    try:
        user_id = uuid.UUID(sub)
    except (ValueError, AttributeError):
        raise credentials_exception

    user = user_repository.get_user_by_id(db, user_id)
    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive user",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def get_vault_key(
    current_user: User = Depends(get_current_user),
    x_vault_token: str = Header(..., description="Vault session token from login response"),
) -> bytes:
    """FastAPI dependency that retrieves the vault encryption key from session.

    Flow:
        1. User is authenticated via JWT (get_current_user)
        2. Vault session token is extracted from X-Vault-Token header
        3. Vault key is retrieved from server-side session store
        4. User ownership is verified (prevents cross-user access)

    The encryption key never appears in request/response bodies.
    It is stored only in server memory and accessed via opaque token.

    Returns:
        32-byte vault encryption key.

    Raises:
        HTTPException 401: If vault token is missing, invalid, expired,
            or doesn't belong to the current user.
    """
    vault_key = vault_session_store.get(x_vault_token, current_user.id)

    if vault_key is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired vault session. Please login again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return vault_key
