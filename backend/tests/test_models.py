"""Tests for database models: User and PasswordEntry."""

import uuid

import pytest
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.db.base import Base
from app.models.user import User
from app.models.password_entry import PasswordEntry


@pytest.fixture(scope="module")
def db_session():
    """Provide a database session connected to the real PostgreSQL instance.

    Uses a transaction that is rolled back after the test module completes,
    keeping the database clean.
    """
    engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()
    engine.dispose()


# ---------- Table existence ----------

class TestTablesExist:
    """Verify that migration created the expected tables."""

    def test_users_table_exists(self, db_session: Session):
        """users table should exist in the database."""
        inspector = inspect(db_session.bind)
        tables = inspector.get_table_names()
        assert "users" in tables

    def test_password_entries_table_exists(self, db_session: Session):
        """password_entries table should exist in the database."""
        inspector = inspect(db_session.bind)
        tables = inspector.get_table_names()
        assert "password_entries" in tables


# ---------- Constraint checks ----------

class TestConstraints:
    """Verify database-level constraints are correctly applied."""

    def test_users_email_unique_constraint(self, db_session: Session):
        """users.email should have a UNIQUE constraint."""
        inspector = inspect(db_session.bind)
        unique_constraints = inspector.get_unique_constraints("users")
        indexes = inspector.get_indexes("users")

        # The unique constraint may appear as a unique index
        unique_columns = set()
        for uc in unique_constraints:
            for col in uc["column_names"]:
                unique_columns.add(col)
        for idx in indexes:
            if idx.get("unique"):
                for col in idx["column_names"]:
                    unique_columns.add(col)

        assert "email" in unique_columns

    def test_password_entries_user_id_foreign_key(self, db_session: Session):
        """password_entries.user_id should reference users.id via FK."""
        inspector = inspect(db_session.bind)
        fks = inspector.get_foreign_keys("password_entries")

        user_id_fk = None
        for fk in fks:
            if "user_id" in fk["constrained_columns"]:
                user_id_fk = fk
                break

        assert user_id_fk is not None, "Foreign key on user_id not found"
        assert user_id_fk["referred_table"] == "users"
        assert user_id_fk["referred_columns"] == ["id"]


# ---------- CRUD & relationship ----------

class TestUserModel:
    """Test User model creation and basic behaviour."""

    def test_create_user(self, db_session: Session):
        """A User instance can be persisted and queried back."""
        user = User(
            email="test_create@passpass.dev",
            password_hash="placeholder_hash_value",
        )
        db_session.add(user)
        db_session.flush()

        assert user.id is not None
        assert isinstance(user.id, uuid.UUID)
        assert user.email == "test_create@passpass.dev"
        assert user.created_at is not None
        assert user.updated_at is not None

    def test_user_email_is_required(self, db_session: Session):
        """Inserting a User without email should raise an integrity error."""
        from sqlalchemy.exc import IntegrityError

        user = User(password_hash="some_hash")
        db_session.add(user)
        with pytest.raises(IntegrityError):
            db_session.flush()
        db_session.rollback()

    def test_user_repr(self, db_session: Session):
        """User.__repr__ returns a useful string."""
        user = User(
            email="repr_test@passpass.dev",
            password_hash="hash",
        )
        db_session.add(user)
        db_session.flush()
        repr_str = repr(user)
        assert "User" in repr_str
        assert "repr_test@passpass.dev" in repr_str


class TestPasswordEntryModel:
    """Test PasswordEntry model creation and basic behaviour."""

    def test_create_password_entry(self, db_session: Session):
        """A PasswordEntry instance can be persisted and queried back."""
        user = User(
            email="entry_owner@passpass.dev",
            password_hash="placeholder_hash",
        )
        db_session.add(user)
        db_session.flush()

        entry = PasswordEntry(
            user_id=user.id,
            title="GitHub",
            username="devuser",
            url="https://github.com",
        )
        db_session.add(entry)
        db_session.flush()

        assert entry.id is not None
        assert isinstance(entry.id, uuid.UUID)
        assert entry.title == "GitHub"
        assert entry.user_id == user.id
        assert entry.created_at is not None

    def test_password_entry_requires_title(self, db_session: Session):
        """Inserting a PasswordEntry without title should raise an error."""
        from sqlalchemy.exc import IntegrityError

        user = User(
            email="no_title_test@passpass.dev",
            password_hash="hash",
        )
        db_session.add(user)
        db_session.flush()

        entry = PasswordEntry(user_id=user.id)
        db_session.add(entry)
        with pytest.raises(IntegrityError):
            db_session.flush()
        db_session.rollback()

    def test_password_entry_requires_user_id(self, db_session: Session):
        """Inserting a PasswordEntry without user_id should raise an error."""
        from sqlalchemy.exc import IntegrityError

        entry = PasswordEntry(title="Orphan Entry")
        db_session.add(entry)
        with pytest.raises(IntegrityError):
            db_session.flush()
        db_session.rollback()


class TestRelationships:
    """Test User <-> PasswordEntry relationship."""

    def test_user_has_password_entries(self, db_session: Session):
        """Accessing user.password_entries returns associated entries."""
        user = User(
            email="rel_test@passpass.dev",
            password_hash="hash",
        )
        db_session.add(user)
        db_session.flush()

        entry1 = PasswordEntry(user_id=user.id, title="Site A")
        entry2 = PasswordEntry(user_id=user.id, title="Site B")
        db_session.add_all([entry1, entry2])
        db_session.flush()

        # Expire to force re-load of relationship
        db_session.expire(user)
        assert len(user.password_entries) == 2
        titles = {e.title for e in user.password_entries}
        assert titles == {"Site A", "Site B"}

    def test_password_entry_has_user(self, db_session: Session):
        """Accessing password_entry.user returns the owning User."""
        user = User(
            email="backref_test@passpass.dev",
            password_hash="hash",
        )
        db_session.add(user)
        db_session.flush()

        entry = PasswordEntry(user_id=user.id, title="My Bank")
        db_session.add(entry)
        db_session.flush()

        db_session.expire(entry)
        assert entry.user is not None
        assert entry.user.id == user.id
        assert entry.user.email == "backref_test@passpass.dev"

    def test_cascade_delete(self, db_session: Session):
        """Deleting a User should cascade-delete their PasswordEntries."""
        user = User(
            email="cascade_test@passpass.dev",
            password_hash="hash",
        )
        db_session.add(user)
        db_session.flush()
        user_id = user.id

        entry = PasswordEntry(user_id=user_id, title="Cascade Target")
        db_session.add(entry)
        db_session.flush()
        entry_id = entry.id

        db_session.delete(user)
        db_session.flush()

        orphan = db_session.get(PasswordEntry, entry_id)
        assert orphan is None
