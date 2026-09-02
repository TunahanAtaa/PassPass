"""User repository — data access layer for User model."""

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User


def get_user_by_email(db: Session, email: str) -> User | None:
    """Find a user by email address.

    Returns the User or None if not found.
    """
    stmt = select(User).where(User.email == email)
    return db.execute(stmt).scalar_one_or_none()


def get_user_by_id(db: Session, user_id: uuid.UUID) -> User | None:
    """Find a user by primary key.

    Returns the User or None if not found.
    """
    return db.get(User, user_id)


def create_user(db: Session, *, email: str, password_hash: str, vault_kdf_salt: str | None = None) -> User:
    """Persist a new user to the database.

    Caller is responsible for providing a properly hashed password
    and a base64-encoded KDF salt for vault encryption.
    """
    user = User(email=email, password_hash=password_hash, vault_kdf_salt=vault_kdf_salt)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
