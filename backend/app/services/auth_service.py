"""Authentication service — business logic for register and login.

Register flow:
    1. Check for duplicate email
    2. Hash password with Argon2id (for DB storage)
    3. Generate KDF salt (for vault encryption key derivation)
    4. Persist user with hashed password + KDF salt

Login flow:
    1. Verify credentials (email + password against Argon2id hash)
    2. Derive vault key from password + KDF salt (Argon2id KDF)
    3. Store vault key in server-side session store
    4. Return user + vault_token (opaque session identifier)
"""

import base64

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.encryption import generate_kdf_salt, derive_vault_key
from app.core.security import hash_password, verify_password
from app.core.vault_session import vault_session_store
from app.models.user import User
from app.repositories import user_repository


def register_user(db: Session, email: str, password: str) -> User:
    """Register a new user.

    Checks for duplicate email, hashes the password, generates a KDF salt,
    and persists the user.

    Raises:
        HTTPException 409: If email is already registered.
    """
    existing = user_repository.get_user_by_email(db, email)
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    hashed = hash_password(password)

    # Generate a unique KDF salt for vault encryption key derivation.
    # This salt is separate from the Argon2id password hash salt.
    kdf_salt = generate_kdf_salt()
    kdf_salt_b64 = base64.b64encode(kdf_salt).decode("ascii")

    return user_repository.create_user(
        db, email=email, password_hash=hashed, vault_kdf_salt=kdf_salt_b64,
    )


def authenticate_user(db: Session, email: str, password: str) -> tuple[User, str]:
    """Authenticate a user with email and password.

    On successful authentication:
        1. Derives the vault encryption key via Argon2id KDF
        2. Stores the key in the server-side vault session store
        3. Returns (User, vault_token)

    The vault_token is an opaque UUID string that the client sends
    via X-Vault-Token header to access encrypted vault data.
    The encryption key itself never leaves the server.

    Returns:
        A tuple of (authenticated User, vault_token string).

    Raises:
        HTTPException 401: If credentials are invalid.
            Uses a generic message to avoid leaking whether the email exists.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    user = user_repository.get_user_by_email(db, email)
    if user is None:
        raise credentials_exception

    if not verify_password(password, user.password_hash):
        raise credentials_exception

    # Derive vault key and create session
    vault_token = _create_vault_session(user, password)

    return user, vault_token


def _create_vault_session(user: User, password: str) -> str:
    """Derive vault key from password and store in session.

    Returns the vault_token for the client. If the user has no KDF salt
    (pre-migration user), returns an empty string and vault operations
    will be unavailable until the user re-registers or salt is populated.
    """
    if not user.vault_kdf_salt:
        # Pre-migration user without KDF salt — vault unavailable
        return ""

    kdf_salt = base64.b64decode(user.vault_kdf_salt)
    vault_key = derive_vault_key(password, kdf_salt)

    return vault_session_store.create(user.id, vault_key)
