"""Integration tests for Password Vault CRUD API.

Tests cover:
- Authentication requirements (401 without/with invalid JWT)
- Vault session requirements (vault_token via X-Vault-Token header)
- Create with encryption verification
- Read with decryption and ownership checks
- List with ownership isolation
- Update with re-encryption
- Delete with ownership checks
- IDOR / Broken Access Control prevention
"""

import uuid
from datetime import timedelta

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text

from app.core.config import settings
from app.core.security import create_access_token


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _unique_email() -> str:
    """Generate a unique email address for test isolation."""
    return f"vault_{uuid.uuid4().hex[:8]}@passpass.dev"


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
    username: str = "tuno",
    url: str = "https://github.com",
    password: str = "MyGitHubPassword123!",
    notes: str = "Personal GitHub account",
) -> dict:
    """Create a password entry and return the response data."""
    resp = client.post(
        "/api/v1/passwords",
        json={
            "title": title,
            "username": username,
            "url": url,
            "password": password,
            "notes": notes,
        },
        headers=headers,
    )
    assert resp.status_code == 201
    return resp.json()


# ===========================================================================
# Authentication Tests
# ===========================================================================

class TestPasswordAuth:
    """Test that all password endpoints require valid JWT."""

    def test_list_without_token_returns_401(self, client: TestClient):
        """GET /passwords without JWT returns 401."""
        resp = client.get("/api/v1/passwords")
        assert resp.status_code == 401

    def test_create_without_token_returns_401(self, client: TestClient):
        """POST /passwords without JWT returns 401."""
        resp = client.post(
            "/api/v1/passwords",
            json={"title": "Test", "password": "secret123"},
        )
        assert resp.status_code == 401

    def test_get_without_token_returns_401(self, client: TestClient):
        """GET /passwords/{id} without JWT returns 401."""
        resp = client.get(f"/api/v1/passwords/{uuid.uuid4()}")
        assert resp.status_code == 401

    def test_update_without_token_returns_401(self, client: TestClient):
        """PUT /passwords/{id} without JWT returns 401."""
        resp = client.put(
            f"/api/v1/passwords/{uuid.uuid4()}",
            json={"title": "Updated"},
        )
        assert resp.status_code == 401

    def test_delete_without_token_returns_401(self, client: TestClient):
        """DELETE /passwords/{id} without JWT returns 401."""
        resp = client.delete(f"/api/v1/passwords/{uuid.uuid4()}")
        assert resp.status_code == 401

    def test_list_with_invalid_token_returns_401(self, client: TestClient):
        """GET /passwords with garbage JWT returns 401."""
        resp = client.get(
            "/api/v1/passwords",
            headers={"Authorization": "Bearer invalid.token.garbage"},
        )
        assert resp.status_code == 401

    def test_list_with_expired_token_returns_401(self, client: TestClient):
        """GET /passwords with expired JWT returns 401."""
        user = _register_and_login(client)
        expired_token = create_access_token(
            data={"sub": user["user_id"]},
            expires_delta=timedelta(hours=-1),
        )
        resp = client.get(
            "/api/v1/passwords",
            headers={"Authorization": f"Bearer {expired_token}"},
        )
        assert resp.status_code == 401


# ===========================================================================
# Create Tests
# ===========================================================================

class TestPasswordCreate:
    """Tests for POST /api/v1/passwords."""

    def test_create_password_success(self, client: TestClient):
        """Authenticated user can create a password entry."""
        user = _register_and_login(client)
        data = _create_entry(client, user["headers"])

        assert "id" in data
        assert data["title"] == "GitHub"
        assert data["username"] == "tuno"
        assert data["url"] == "https://github.com"
        assert data["password"] == "MyGitHubPassword123!"
        assert data["notes"] == "Personal GitHub account"
        assert "created_at" in data
        assert "updated_at" in data

    def test_create_password_without_optional_fields(self, client: TestClient):
        """Password entry can be created with only title."""
        user = _register_and_login(client)
        resp = client.post(
            "/api/v1/passwords",
            json={"title": "Minimal Entry"},
            headers=user["headers"],
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "Minimal Entry"
        assert data["username"] is None
        assert data["password"] is None
        assert data["notes"] is None

    def test_create_password_not_stored_plaintext(self, client: TestClient):
        """Password must NOT be stored as plaintext in the database."""
        user = _register_and_login(client)
        password = "SuperSecret!Password42"
        notes = "Very private notes here"
        data = _create_entry(
            client, user["headers"],
            password=password, notes=notes,
        )
        entry_id = data["id"]

        # Directly query the database to check stored values
        engine = create_engine(settings.DATABASE_URL)
        with engine.connect() as conn:
            row = conn.execute(
                text(
                    "SELECT encrypted_password, password_nonce, "
                    "encrypted_notes, notes_nonce "
                    "FROM password_entries WHERE id = :eid"
                ),
                {"eid": entry_id},
            ).fetchone()
        engine.dispose()

        assert row is not None
        # Encrypted values must NOT equal plaintext
        assert row[0] != password, "Password stored as plaintext!"
        assert row[0] is not None, "encrypted_password should not be null"
        assert row[1] is not None, "password_nonce should not be null"
        assert row[2] != notes, "Notes stored as plaintext!"
        assert row[2] is not None, "encrypted_notes should not be null"
        assert row[3] is not None, "notes_nonce should not be null"

    def test_create_password_response_no_internal_fields(self, client: TestClient):
        """Response must not include encryption internals."""
        user = _register_and_login(client)
        data = _create_entry(client, user["headers"])

        assert "encrypted_password" not in data
        assert "password_nonce" not in data
        assert "encrypted_notes" not in data
        assert "notes_nonce" not in data
        assert "password_hash" not in data
        assert "user_id" not in data

    def test_create_password_empty_title_returns_422(self, client: TestClient):
        """Creating entry with empty title returns 422."""
        user = _register_and_login(client)
        resp = client.post(
            "/api/v1/passwords",
            json={"title": ""},
            headers=user["headers"],
        )
        assert resp.status_code == 422


# ===========================================================================
# Read Tests
# ===========================================================================

class TestPasswordRead:
    """Tests for GET /api/v1/passwords/{id}."""

    def test_read_own_password(self, client: TestClient):
        """User can read their own password entry."""
        user = _register_and_login(client)
        created = _create_entry(client, user["headers"])

        resp = client.get(
            f"/api/v1/passwords/{created['id']}",
            headers=user["headers"],
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == created["id"]
        assert data["title"] == "GitHub"

    def test_read_password_decrypted_correctly(self, client: TestClient):
        """Decrypted password and notes match the original plaintext."""
        user = _register_and_login(client)
        original_pw = "MyRealPassword!99"
        original_notes = "Important notes for this account"

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

    def test_read_other_users_password_returns_404(self, client: TestClient):
        """User cannot read another user's password entry (IDOR prevention)."""
        user_a = _register_and_login(client)
        user_b = _register_and_login(client)

        # User A creates an entry
        entry = _create_entry(client, user_a["headers"])

        # User B tries to read User A's entry
        resp = client.get(
            f"/api/v1/passwords/{entry['id']}",
            headers=user_b["headers"],
        )
        assert resp.status_code == 404

    def test_read_nonexistent_entry_returns_404(self, client: TestClient):
        """Reading a non-existent entry returns 404."""
        user = _register_and_login(client)
        resp = client.get(
            f"/api/v1/passwords/{uuid.uuid4()}",
            headers=user["headers"],
        )
        assert resp.status_code == 404


# ===========================================================================
# List Tests
# ===========================================================================

class TestPasswordList:
    """Tests for GET /api/v1/passwords."""

    def test_list_own_entries(self, client: TestClient):
        """User sees only their own entries."""
        user = _register_and_login(client)
        _create_entry(client, user["headers"], title="GitHub")
        _create_entry(client, user["headers"], title="Gmail")

        resp = client.get(
            "/api/v1/passwords",
            headers={"Authorization": f"Bearer {user['token']}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["count"] == 2
        titles = {item["title"] for item in data["items"]}
        assert titles == {"GitHub", "Gmail"}

    def test_list_excludes_other_users_entries(self, client: TestClient):
        """User A's list does not include User B's entries."""
        user_a = _register_and_login(client)
        user_b = _register_and_login(client)

        _create_entry(client, user_a["headers"], title="A-GitHub")
        _create_entry(client, user_a["headers"], title="A-Gmail")
        _create_entry(client, user_b["headers"], title="B-Discord")

        # User A should see only their 2 entries
        resp_a = client.get(
            "/api/v1/passwords",
            headers={"Authorization": f"Bearer {user_a['token']}"},
        )
        data_a = resp_a.json()
        assert data_a["count"] == 2
        titles_a = {item["title"] for item in data_a["items"]}
        assert "B-Discord" not in titles_a

        # User B should see only their 1 entry
        resp_b = client.get(
            "/api/v1/passwords",
            headers={"Authorization": f"Bearer {user_b['token']}"},
        )
        data_b = resp_b.json()
        assert data_b["count"] == 1
        assert data_b["items"][0]["title"] == "B-Discord"

    def test_list_does_not_include_password_or_notes(self, client: TestClient):
        """List response must not include decrypted password or notes."""
        user = _register_and_login(client)
        _create_entry(client, user["headers"])

        resp = client.get(
            "/api/v1/passwords",
            headers={"Authorization": f"Bearer {user['token']}"},
        )
        data = resp.json()
        for item in data["items"]:
            assert "password" not in item
            assert "notes" not in item
            assert "encrypted_password" not in item
            assert "encrypted_notes" not in item

    def test_list_empty_vault(self, client: TestClient):
        """New user has an empty vault."""
        user = _register_and_login(client)
        resp = client.get(
            "/api/v1/passwords",
            headers={"Authorization": f"Bearer {user['token']}"},
        )
        data = resp.json()
        assert data["count"] == 0
        assert data["items"] == []


# ===========================================================================
# Update Tests
# ===========================================================================

class TestPasswordUpdate:
    """Tests for PUT /api/v1/passwords/{id}."""

    def test_update_title(self, client: TestClient):
        """User can update the title of their entry."""
        user = _register_and_login(client)
        created = _create_entry(client, user["headers"], title="Old Title")

        resp = client.put(
            f"/api/v1/passwords/{created['id']}",
            json={"title": "New Title"},
            headers=user["headers"],
        )
        assert resp.status_code == 200
        assert resp.json()["title"] == "New Title"

    def test_update_password_re_encrypts(self, client: TestClient):
        """Updating password re-encrypts it in the database."""
        user = _register_and_login(client)
        old_pw = "OldPassword1!"
        new_pw = "NewPassword2@"
        created = _create_entry(client, user["headers"], password=old_pw)
        entry_id = created["id"]

        # Get the old encrypted value from DB
        engine = create_engine(settings.DATABASE_URL)
        with engine.connect() as conn:
            old_row = conn.execute(
                text(
                    "SELECT encrypted_password, password_nonce "
                    "FROM password_entries WHERE id = :eid"
                ),
                {"eid": entry_id},
            ).fetchone()
        engine.dispose()

        # Update the password
        resp = client.put(
            f"/api/v1/passwords/{entry_id}",
            json={"password": new_pw},
            headers=user["headers"],
        )
        assert resp.status_code == 200
        assert resp.json()["password"] == new_pw

        # Verify encrypted value changed in DB
        engine = create_engine(settings.DATABASE_URL)
        with engine.connect() as conn:
            new_row = conn.execute(
                text(
                    "SELECT encrypted_password, password_nonce "
                    "FROM password_entries WHERE id = :eid"
                ),
                {"eid": entry_id},
            ).fetchone()
        engine.dispose()

        # Encrypted password and nonce should differ after update
        assert new_row[0] != old_row[0], "Encrypted password not re-encrypted"
        assert new_row[0] != new_pw, "New password stored as plaintext!"

    def test_update_other_users_entry_returns_404(self, client: TestClient):
        """User cannot update another user's entry (IDOR prevention)."""
        user_a = _register_and_login(client)
        user_b = _register_and_login(client)

        entry = _create_entry(client, user_a["headers"])

        resp = client.put(
            f"/api/v1/passwords/{entry['id']}",
            json={"title": "Hacked!"},
            headers=user_b["headers"],
        )
        assert resp.status_code == 404

    def test_update_nonexistent_entry_returns_404(self, client: TestClient):
        """Updating a non-existent entry returns 404."""
        user = _register_and_login(client)
        resp = client.put(
            f"/api/v1/passwords/{uuid.uuid4()}",
            json={"title": "Ghost"},
            headers=user["headers"],
        )
        assert resp.status_code == 404

    def test_update_preserves_unchanged_fields(self, client: TestClient):
        """Updating one field preserves other fields."""
        user = _register_and_login(client)
        created = _create_entry(
            client, user["headers"],
            title="GitHub", username="tuno", password="OriginalPW1!",
        )

        resp = client.put(
            f"/api/v1/passwords/{created['id']}",
            json={"title": "GitLab"},
            headers=user["headers"],
        )
        data = resp.json()
        assert data["title"] == "GitLab"
        assert data["username"] == "tuno"
        assert data["password"] == "OriginalPW1!"


# ===========================================================================
# Delete Tests
# ===========================================================================

class TestPasswordDelete:
    """Tests for DELETE /api/v1/passwords/{id}."""

    def test_delete_own_entry(self, client: TestClient):
        """User can delete their own entry."""
        user = _register_and_login(client)
        created = _create_entry(client, user["headers"])

        resp = client.delete(
            f"/api/v1/passwords/{created['id']}",
            headers={"Authorization": f"Bearer {user['token']}"},
        )
        assert resp.status_code == 204

        # Verify it's gone
        resp = client.get(
            f"/api/v1/passwords/{created['id']}",
            headers=user["headers"],
        )
        assert resp.status_code == 404

    def test_delete_other_users_entry_returns_404(self, client: TestClient):
        """User cannot delete another user's entry (IDOR prevention)."""
        user_a = _register_and_login(client)
        user_b = _register_and_login(client)

        entry = _create_entry(client, user_a["headers"])

        resp = client.delete(
            f"/api/v1/passwords/{entry['id']}",
            headers={"Authorization": f"Bearer {user_b['token']}"},
        )
        assert resp.status_code == 404

        # Verify entry still exists for User A
        resp = client.get(
            f"/api/v1/passwords/{entry['id']}",
            headers=user_a["headers"],
        )
        assert resp.status_code == 200

    def test_delete_nonexistent_entry_returns_404(self, client: TestClient):
        """Deleting a non-existent entry returns 404."""
        user = _register_and_login(client)
        resp = client.delete(
            f"/api/v1/passwords/{uuid.uuid4()}",
            headers={"Authorization": f"Bearer {user['token']}"},
        )
        assert resp.status_code == 404

    def test_delete_reduces_list_count(self, client: TestClient):
        """Deleting an entry reduces the list count."""
        user = _register_and_login(client)
        e1 = _create_entry(client, user["headers"], title="Entry1")
        e2 = _create_entry(client, user["headers"], title="Entry2")

        # List should have 2
        resp = client.get(
            "/api/v1/passwords",
            headers={"Authorization": f"Bearer {user['token']}"},
        )
        assert resp.json()["count"] == 2

        # Delete one
        client.delete(
            f"/api/v1/passwords/{e1['id']}",
            headers={"Authorization": f"Bearer {user['token']}"},
        )

        # List should have 1
        resp = client.get(
            "/api/v1/passwords",
            headers={"Authorization": f"Bearer {user['token']}"},
        )
        data = resp.json()
        assert data["count"] == 1
        assert data["items"][0]["title"] == "Entry2"
