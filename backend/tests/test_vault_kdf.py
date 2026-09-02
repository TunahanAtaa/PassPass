"""Integration tests for vault KDF-based encryption.

Tests cover:
- Vault unlock with correct/wrong password
- Cross-user isolation (User A cannot decrypt User B's data)
- KDF salt persistence in database
- Encryption key not stored in database
- Encryption key not in API responses
- Vault session management
"""

import uuid

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text

from app.core.config import settings


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _unique_email() -> str:
    """Generate a unique email address for test isolation."""
    return f"vault_kdf_{uuid.uuid4().hex[:8]}@passpass.dev"


def _register_and_login(client: TestClient) -> dict:
    """Register a new user and login, returning user info, auth header, and vault_token."""
    email = _unique_email()
    password = "StrongPass1"

    reg_resp = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password},
    )
    assert reg_resp.status_code == 201
    user_id = reg_resp.json()["id"]

    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert login_resp.status_code == 200
    login_data = login_resp.json()
    token = login_data["access_token"]
    vault_token = login_data["vault_token"]

    return {
        "user_id": user_id,
        "email": email,
        "password": password,
        "token": token,
        "vault_token": vault_token,
        "headers": {
            "Authorization": f"Bearer {token}",
            "X-Vault-Token": vault_token,
        },
    }


def _create_entry(
    client: TestClient,
    headers: dict,
    title: str = "GitHub",
    password: str = "MyGitHubPassword123!",
    notes: str = "Personal GitHub account",
) -> dict:
    """Create a password entry and return the response data."""
    resp = client.post(
        "/api/v1/passwords",
        json={
            "title": title,
            "username": "testuser",
            "url": "https://github.com",
            "password": password,
            "notes": notes,
        },
        headers=headers,
    )
    assert resp.status_code == 201
    return resp.json()


# ===========================================================================
# Vault Unlock Tests
# ===========================================================================

class TestVaultUnlock:
    """Test that correct password unlocks vault and wrong password doesn't."""

    def test_correct_password_reads_vault_data(self, client: TestClient):
        """User can read their vault data with correct password (via vault session)."""
        user = _register_and_login(client)
        original_pw = "SuperSecret!42"
        original_notes = "My private notes"

        created = _create_entry(
            client, user["headers"],
            password=original_pw, notes=original_notes,
        )

        resp = client.get(
            f"/api/v1/passwords/{created['id']}",
            headers=user["headers"],
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["password"] == original_pw
        assert data["notes"] == original_notes

    def test_wrong_password_cannot_decrypt_vault(self, client: TestClient):
        """Wrong password produces a different vault key that cannot decrypt data."""
        from app.core.encryption import derive_vault_key, decrypt
        from cryptography.exceptions import InvalidTag
        import base64

        # Register and create entry with correct password
        user = _register_and_login(client)
        _create_entry(client, user["headers"], password="CorrectPassword1!")

        # Verify the entry is in DB
        engine = create_engine(settings.DATABASE_URL)
        with engine.connect() as conn:
            row = conn.execute(
                text(
                    "SELECT encrypted_password, password_nonce, u.vault_kdf_salt "
                    "FROM password_entries pe "
                    "JOIN users u ON pe.user_id = u.id "
                    "WHERE u.id = :uid"
                ),
                {"uid": user["user_id"]},
            ).fetchone()
        engine.dispose()

        assert row is not None
        kdf_salt = base64.b64decode(row[2])

        # Derive key with wrong password
        wrong_key = derive_vault_key("WrongPassword1!", kdf_salt)

        # Attempt to decrypt with wrong key should fail
        with pytest.raises(InvalidTag):
            decrypt(row[0], row[1], wrong_key)

    def test_invalid_vault_token_returns_401(self, client: TestClient):
        """Invalid vault token returns 401 for vault operations."""
        user = _register_and_login(client)

        headers = {
            "Authorization": f"Bearer {user['token']}",
            "X-Vault-Token": "invalid-token-value",
        }
        resp = client.post(
            "/api/v1/passwords",
            json={"title": "Test", "password": "secret123"},
            headers=headers,
        )
        assert resp.status_code == 401

    def test_missing_vault_token_returns_422(self, client: TestClient):
        """Missing X-Vault-Token header returns 422 for vault operations."""
        user = _register_and_login(client)

        headers = {"Authorization": f"Bearer {user['token']}"}
        resp = client.post(
            "/api/v1/passwords",
            json={"title": "Test", "password": "secret123"},
            headers=headers,
        )
        assert resp.status_code == 422


# ===========================================================================
# Cross-User Isolation Tests
# ===========================================================================

class TestCrossUserIsolation:
    """Test that users cannot decrypt each other's vault data."""

    def test_user_cannot_read_other_users_entry(self, client: TestClient):
        """User B cannot access User A's password entry."""
        user_a = _register_and_login(client)
        user_b = _register_and_login(client)

        entry = _create_entry(client, user_a["headers"])

        # User B tries to read User A's entry
        resp = client.get(
            f"/api/v1/passwords/{entry['id']}",
            headers=user_b["headers"],
        )
        assert resp.status_code == 404

    def test_vault_token_bound_to_user(self, client: TestClient):
        """User A's vault_token cannot be used by User B."""
        user_a = _register_and_login(client)
        user_b = _register_and_login(client)

        # User B tries to use User A's vault token
        headers = {
            "Authorization": f"Bearer {user_b['token']}",
            "X-Vault-Token": user_a["vault_token"],
        }
        resp = client.post(
            "/api/v1/passwords",
            json={"title": "Test", "password": "secret123"},
            headers=headers,
        )
        assert resp.status_code == 401

    def test_different_users_have_different_vault_keys(self, client: TestClient):
        """Two users with the same password get different vault keys (different salts)."""
        from app.core.encryption import derive_vault_key
        import base64

        password = "SamePassword1!"

        email_a = _unique_email()
        email_b = _unique_email()

        client.post("/api/v1/auth/register", json={"email": email_a, "password": password})
        client.post("/api/v1/auth/register", json={"email": email_b, "password": password})

        engine = create_engine(settings.DATABASE_URL)
        with engine.connect() as conn:
            row_a = conn.execute(
                text("SELECT vault_kdf_salt FROM users WHERE email = :e"),
                {"e": email_a},
            ).fetchone()
            row_b = conn.execute(
                text("SELECT vault_kdf_salt FROM users WHERE email = :e"),
                {"e": email_b},
            ).fetchone()
        engine.dispose()

        salt_a = base64.b64decode(row_a[0])
        salt_b = base64.b64decode(row_b[0])

        # Same password, different salts → different keys
        key_a = derive_vault_key(password, salt_a)
        key_b = derive_vault_key(password, salt_b)

        assert salt_a != salt_b, "Each user must have a unique KDF salt"
        assert key_a != key_b, "Different salts must produce different keys"


# ===========================================================================
# Database Security Tests
# ===========================================================================

class TestDatabaseSecurity:
    """Test that sensitive data is properly stored in the database."""

    def test_kdf_salt_stored_in_database(self, client: TestClient):
        """KDF salt must be present in the user's database record."""
        user = _register_and_login(client)

        engine = create_engine(settings.DATABASE_URL)
        with engine.connect() as conn:
            row = conn.execute(
                text("SELECT vault_kdf_salt FROM users WHERE id = :uid"),
                {"uid": user["user_id"]},
            ).fetchone()
        engine.dispose()

        assert row is not None
        assert row[0] is not None, "vault_kdf_salt should not be null"
        assert len(row[0]) > 0, "vault_kdf_salt should not be empty"

    def test_encryption_key_not_in_database(self, client: TestClient):
        """The derived encryption key must NOT be stored in the database."""
        user = _register_and_login(client)

        engine = create_engine(settings.DATABASE_URL)
        with engine.connect() as conn:
            # Check users table columns
            columns = conn.execute(
                text(
                    "SELECT column_name FROM information_schema.columns "
                    "WHERE table_name = 'users'"
                )
            ).fetchall()
        engine.dispose()

        column_names = [col[0] for col in columns]
        # No column should store the encryption key
        assert "vault_key" not in column_names
        assert "encryption_key" not in column_names
        assert "vault_encryption_key" not in column_names

    def test_encryption_key_not_in_api_response(self, client: TestClient):
        """Encryption key must NOT appear in any API response."""
        user = _register_and_login(client)

        # Login response
        login_resp = client.post(
            "/api/v1/auth/login",
            json={"email": user["email"], "password": user["password"]},
        )
        login_data = login_resp.json()
        assert "vault_key" not in login_data
        assert "encryption_key" not in login_data

        # Create entry response
        entry = _create_entry(client, user["headers"])
        assert "vault_key" not in entry
        assert "encryption_key" not in entry
        assert "encrypted_password" not in entry
        assert "password_nonce" not in entry

        # Get entry response
        get_resp = client.get(
            f"/api/v1/passwords/{entry['id']}",
            headers=user["headers"],
        )
        get_data = get_resp.json()
        assert "vault_key" not in get_data
        assert "encryption_key" not in get_data

    def test_password_not_stored_plaintext(self, client: TestClient):
        """Password must be encrypted in the database, not stored as plaintext."""
        user = _register_and_login(client)
        password = "PlaintextCheck1!"
        entry = _create_entry(client, user["headers"], password=password)

        engine = create_engine(settings.DATABASE_URL)
        with engine.connect() as conn:
            row = conn.execute(
                text(
                    "SELECT encrypted_password, password_nonce "
                    "FROM password_entries WHERE id = :eid"
                ),
                {"eid": entry["id"]},
            ).fetchone()
        engine.dispose()

        assert row[0] != password, "Password stored as plaintext!"
        assert row[0] is not None
        assert row[1] is not None


# ===========================================================================
# Vault Session Tests
# ===========================================================================

class TestVaultSession:
    """Test vault session store behavior."""

    def test_login_returns_vault_token(self, client: TestClient):
        """Login response must include a non-empty vault_token."""
        email = _unique_email()
        password = "StrongPass1"

        client.post(
            "/api/v1/auth/register",
            json={"email": email, "password": password},
        )

        login_resp = client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": password},
        )
        data = login_resp.json()

        assert "vault_token" in data
        assert len(data["vault_token"]) > 0

    def test_vault_token_is_not_jwt(self, client: TestClient):
        """vault_token must be a simple opaque token, not a JWT."""
        user = _register_and_login(client)
        vault_token = user["vault_token"]

        # JWTs have dots separating header.payload.signature
        assert "." not in vault_token, "vault_token should not be a JWT"

    def test_vault_token_is_not_encryption_key(self, client: TestClient):
        """vault_token must NOT be the encryption key itself."""
        user = _register_and_login(client)
        vault_token = user["vault_token"]

        # vault_token is a UUID hex (32 chars), not 64 hex chars of a 32-byte key
        # But more importantly, it's a session ID, not key material
        assert len(vault_token) == 32, "vault_token should be a UUID hex"


# Need pytest import for raises
import pytest
