"""Authentication routes: register, login, and current user."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.security import create_access_token
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from app.services import auth_service

router = APIRouter()


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
)
def register(body: RegisterRequest, db: Session = Depends(get_db)) -> UserResponse:
    """Create a new user account.

    - Validates email format and password strength.
    - Checks for duplicate email (409 Conflict).
    - Hashes password with Argon2id before storing.
    - Never returns password_hash in the response.
    """
    user = auth_service.register_user(db, email=body.email, password=body.password)
    return UserResponse.model_validate(user)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login and obtain JWT",
)
def login(body: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    """Authenticate with email and password.

    Returns a JWT access token and a vault_token on success.
    The vault_token is an opaque session identifier for vault operations
    (sent via X-Vault-Token header). It is NOT the encryption key.
    Returns a generic 401 error for invalid credentials
    (does not reveal whether the email exists).
    """
    user, vault_token = auth_service.authenticate_user(
        db, email=body.email, password=body.password,
    )
    access_token = create_access_token(data={"sub": str(user.id)})
    return TokenResponse(access_token=access_token, vault_token=vault_token)


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current authenticated user",
)
def get_me(current_user: User = Depends(get_current_user)) -> UserResponse:
    """Return the currently authenticated user's profile.

    Requires a valid Bearer JWT token in the Authorization header.
    Never includes password_hash in the response.
    """
    return UserResponse.model_validate(current_user)
