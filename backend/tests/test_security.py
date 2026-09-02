"""Unit tests for core security utilities (password hashing & JWT)."""

from datetime import timedelta

from jose import jwt

from app.core.config import settings
from app.core.security import create_access_token, hash_password, verify_password


class TestPasswordHashing:
    """Tests for Argon2id password hashing."""

    def test_hash_password_returns_argon2_hash(self):
        """hash_password should return an Argon2id hash string."""
        hashed = hash_password("TestPass123")
        assert hashed.startswith("$argon2id$")

    def test_same_password_produces_different_hashes(self):
        """Two calls with the same password must produce different hashes (unique salt)."""
        h1 = hash_password("IdenticalPassword1")
        h2 = hash_password("IdenticalPassword1")
        assert h1 != h2

    def test_verify_password_correct(self):
        """verify_password returns True for matching password."""
        password = "CorrectHorse99"
        hashed = hash_password(password)
        assert verify_password(password, hashed) is True

    def test_verify_password_wrong(self):
        """verify_password returns False for non-matching password."""
        hashed = hash_password("RealPassword1")
        assert verify_password("WrongPassword1", hashed) is False

    def test_verify_password_invalid_hash(self):
        """verify_password returns False for a malformed hash string."""
        assert verify_password("anything", "not-a-valid-hash") is False


class TestJWT:
    """Tests for JWT token creation."""

    def test_create_access_token_returns_string(self):
        """create_access_token should return a JWT string."""
        token = create_access_token(data={"sub": "test-user-id"})
        assert isinstance(token, str)
        assert len(token) > 0

    def test_create_access_token_contains_sub(self):
        """The decoded JWT should contain the 'sub' claim."""
        token = create_access_token(data={"sub": "my-user-123"})
        payload = jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        assert payload["sub"] == "my-user-123"

    def test_create_access_token_contains_exp(self):
        """The decoded JWT should contain an 'exp' claim."""
        token = create_access_token(data={"sub": "x"})
        payload = jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        assert "exp" in payload

    def test_create_access_token_custom_expiry(self):
        """create_access_token accepts a custom expires_delta."""
        token = create_access_token(
            data={"sub": "x"}, expires_delta=timedelta(minutes=5)
        )
        payload = jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        assert "exp" in payload
