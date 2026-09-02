from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models.
    
    All future PassPass entity models (User, Vault, PasswordEntry, etc.)
    will inherit from this Base.
    """
    pass
