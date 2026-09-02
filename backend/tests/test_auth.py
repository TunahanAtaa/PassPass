"""Integration tests for authentication endpoints: register, login, and /auth/me."""

import uuid
from datetime import timedelta

from fastapi.testclient import TestClient
from jose import jwt

from app.core.config import settings
from app.core.security import create_access_token


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _unique_email() -> str:
    """Generate a unique email address for test isolation."""
    return f"test_{uuid.uuid4().hex[:8]}@passpass.dev"


def _register_user(client: TestClient, email: str | None = None, password: str = "StrongPass1") -> dict:
    """Register a user and return the response dict."""
    email = email or _unique_email()
    response = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password},
    )
    return {"response": response, "email": email, "password": password}


def _login_user(client: TestClient, email: str, password: str) -> dict:
    """Login and return the response."""
    response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    return response


# ===========================================================================
# Register Tests
# ===========================================================================

class TestRegister:
    """Tests for POST /api/v1/auth/register."""

    def test_register_success(self, client: TestClient):
        """Valid registration returns 201 with user data, no password_hash."""
        result = _register_user(client)
        resp = result["response"]

        assert resp.status_code == 201
        data = resp.json()
        assert data["email"] == result["email"]
        assert "id" in data
        assert "password_hash" not in data
        assert "password" not in data
        assert data["is_active"] is True
        assert data["is_email_verified"] is False

    def test_register_duplicate_email(self, client: TestClient):
        """Registering the same email twice returns 409 Conflict."""
        email = _unique_email()
        first = _register_user(client, email=email)
        assert first["response"].status_code == 201

        second = _register_user(client, email=email)
        assert second["response"].status_code == 409

    def test_register_invalid_email(self, client: TestClient):
        """Invalid email format returns 422 Validation Error."""
        resp = client.post(
            "/api/v1/auth/register",
            json={"email": "not-an-email", "password": "ValidPass1"},
        )
        assert resp.status_code == 422

    def test_register_weak_password_too_short(self, client: TestClient):
        """Password shorter than 8 characters returns 422."""
        resp = client.post(
            "/api/v1/auth/register",
            json={"email": _unique_email(), "password": "Sh0rt"},
        )
        assert resp.status_code == 422

    def test_register_weak_password_no_digit(self, client: TestClient):
        """Password without digits returns 422."""
        resp = client.post(
            "/api/v1/auth/register",
            json={"email": _unique_email(), "password": "NoDigitsHere"},
        )
        assert resp.status_code == 422

    def test_register_weak_password_no_letter(self, client: TestClient):
        """Password without letters returns 422."""
        resp = client.post(
            "/api/v1/auth/register",
            json={"email": _unique_email(), "password": "12345678"},
        )
        assert resp.status_code == 422

    def test_register_password_not_stored_plaintext(self, client: TestClient):
        """The password_hash in the DB must not equal the plaintext password."""
        from sqlalchemy import create_engine, text

        password = "MySecretPass1"
        result = _register_user(client, password=password)
        assert result["response"].status_code == 201
        user_id = result["response"].json()["id"]

        engine = create_engine(settings.DATABASE_URL)
        with engine.connect() as conn:
            row = conn.execute(
                text("SELECT password_hash FROM users WHERE id = :uid"),
                {"uid": user_id},
            ).fetchone()
        engine.dispose()

        assert row is not None
        assert row[0] != password
        assert row[0].startswith("$argon2id$")


# ===========================================================================
# Login Tests
# ===========================================================================

class TestLogin:
    """Tests for POST /api/v1/auth/login."""

    def test_login_success(self, client: TestClient):
        """Correct credentials return 200 with access_token and vault_token."""
        reg = _register_user(client)
        assert reg["response"].status_code == 201

        resp = _login_user(client, reg["email"], reg["password"])
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert "vault_token" in data
        assert len(data["vault_token"]) > 0

    def test_login_wrong_password(self, client: TestClient):
        """Wrong password returns 401."""
        reg = _register_user(client)
        assert reg["response"].status_code == 201

        resp = _login_user(client, reg["email"], "WrongPassword1")
        assert resp.status_code == 401

    def test_login_nonexistent_email(self, client: TestClient):
        """Email that doesn't exist returns 401 (same error as wrong password)."""
        resp = _login_user(client, "nobody@passpass.dev", "Whatever1")
        assert resp.status_code == 401

    def test_login_returns_valid_jwt(self, client: TestClient):
        """The access_token from login is a decodable JWT with expected claims."""
        reg = _register_user(client)
        resp = _login_user(client, reg["email"], reg["password"])
        token = resp.json()["access_token"]

        payload = jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        assert "sub" in payload
        assert "exp" in payload
        # sub should be a valid UUID string
        uuid.UUID(payload["sub"])


# ===========================================================================
# Protected Endpoint (/auth/me) Tests
# ===========================================================================

class TestAuthMe:
    """Tests for GET /api/v1/auth/me."""

    def test_me_with_valid_token(self, client: TestClient):
        """Valid Bearer token returns 200 with current user data."""
        reg = _register_user(client)
        login_resp = _login_user(client, reg["email"], reg["password"])
        token = login_resp.json()["access_token"]

        resp = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == reg["email"]
        assert "password_hash" not in data
        assert "id" in data

    def test_me_without_token(self, client: TestClient):
        """Request without Authorization header returns 401."""
        resp = client.get("/api/v1/auth/me")
        assert resp.status_code == 401

    def test_me_with_invalid_token(self, client: TestClient):
        """Garbage token returns 401."""
        resp = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer invalid.token.here"},
        )
        assert resp.status_code == 401

    def test_me_with_expired_token(self, client: TestClient):
        """Expired JWT returns 401."""
        reg = _register_user(client)
        user_id = reg["response"].json()["id"]

        # Create a token that expired 1 hour ago
        expired_token = create_access_token(
            data={"sub": user_id},
            expires_delta=timedelta(hours=-1),
        )

        resp = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {expired_token}"},
        )
        assert resp.status_code == 401


# ===========================================================================
# User Identity Test
# ===========================================================================

class TestUserIdentity:
    """Test that JWT resolves to the correct user."""

    def test_jwt_resolves_correct_user(self, client: TestClient):
        """The /auth/me endpoint returns the user who logged in."""
        # Register two users
        reg1 = _register_user(client)
        reg2 = _register_user(client)

        # Login as user 1
        login_resp = _login_user(client, reg1["email"], reg1["password"])
        token = login_resp.json()["access_token"]

        # /me should return user 1, not user 2
        resp = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == reg1["email"]
        assert data["id"] == reg1["response"].json()["id"]
        assert data["email"] != reg2["email"]
