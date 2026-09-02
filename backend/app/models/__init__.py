"""ORM Models package.

This module exposes the SQLAlchemy Base metadata and all entity models.
Models are imported here so that Alembic and SQLAlchemy metadata can
discover them automatically.
"""
from app.db.base import Base
from app.models.user import User
from app.models.password_entry import PasswordEntry

__all__ = ["Base", "User", "PasswordEntry"]
