"""Comprehensive End-to-End Smoke Test for PassPass.

Validates the full user journey:
Register -> Login -> /me -> Create Password -> List -> Get (Decrypted) -> Update -> Delete -> Cross-User Isolation
"""

import sys
import uuid
import httpx

BASE_URL = "http://localhost:8000"

def run_smoke_test():
    print("=" * 60)
    print("Starting PassPass End-to-End Smoke Test")
    print(f"Target API: {BASE_URL}")
    print("=" * 60)

    client = httpx.Client(base_url=BASE_URL, timeout=10.0)

    # 1. Health check
    print("\n[Step 1] Health Check...")
    r = client.get("/api/v1/health")
    assert r.status_code == 200, f"Health check failed: {r.text}"
    health_data = r.json()
    assert health_data["status"] == "ok"
    assert health_data["database"] == "connected"
    print("  -> Health Check Passed (Database: connected, Status: ok)")

    # 2. Register User 1
    user1_email = f"e2e_user_{uuid.uuid4().hex[:8]}@passpass.dev"
    user1_password = "MasterPassword123!"
    print(f"\n[Step 2] Registering User 1 ({user1_email})...")
    r = client.post("/api/v1/auth/register", json={
        "email": user1_email,
        "password": user1_password,
    })
    assert r.status_code == 201, f"Registration failed: {r.text}"
    u1_reg_data = r.json()
    assert u1_reg_data["email"] == user1_email
    assert "id" in u1_reg_data
    print(f"  -> User 1 registered successfully (ID: {u1_reg_data['id']})")

    # 3. Login User 1 (retrieve access_token & vault_token)
    print("\n[Step 3] Logging in User 1...")
    r = client.post("/api/v1/auth/login", json={
        "email": user1_email,
        "password": user1_password,
    })
    assert r.status_code == 200, f"Login failed: {r.text}"
    u1_auth = r.json()
    access_token_u1 = u1_auth["access_token"]
    vault_token_u1 = u1_auth["vault_token"]
    assert access_token_u1, "access_token missing"
    assert vault_token_u1, "vault_token missing"
    print("  -> User 1 Login successful. Tokens acquired (JWT + Vault Session Token)")

    headers_u1 = {
        "Authorization": f"Bearer {access_token_u1}",
        "X-Vault-Token": vault_token_u1,
    }

    # 4. Verify /me endpoint
    print("\n[Step 4] Verifying /me profile...")
    r = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {access_token_u1}"})
    assert r.status_code == 200, f"GET /me failed: {r.text}"
    me_data = r.json()
    assert me_data["email"] == user1_email
    print(f"  -> Authenticated as: {me_data['email']}")

    # 5. Create Password Entry
    print("\n[Step 5] Creating encrypted password entry in vault...")
    entry_payload = {
        "title": "AWS Production Cloud",
        "username": "admin@aws.passpass.dev",
        "url": "https://aws.amazon.com",
        "password": "k!9P#vL8$zQ2@mX4",
        "notes": "Root console credentials and MFA recovery seed",
    }
    r = client.post("/api/v1/passwords", json=entry_payload, headers=headers_u1)
    assert r.status_code == 201, f"Create password entry failed: {r.text}"
    entry_data = r.json()
    entry_id = entry_data["id"]
    assert entry_data["title"] == entry_payload["title"]
    assert entry_data["username"] == entry_payload["username"]
    assert entry_data["url"] == entry_payload["url"]
    assert entry_data["password"] == entry_payload["password"]
    assert entry_data["notes"] == entry_payload["notes"]
    print(f"  -> Password entry created successfully (ID: {entry_id})")

    # 6. List Passwords (Metadata list - verify no plaintext leak in list endpoint)
    print("\n[Step 6] Listing vault password entries...")
    r = client.get("/api/v1/passwords", headers={"Authorization": f"Bearer {access_token_u1}"})
    assert r.status_code == 200, f"List passwords failed: {r.text}"
    list_data = r.json()
    assert list_data["count"] == 1
    item = list_data["items"][0]
    assert item["id"] == entry_id
    assert item["title"] == "AWS Production Cloud"
    assert "password" not in item, "SECURITY VIOLATION: Password leaked in list endpoint!"
    assert "notes" not in item, "SECURITY VIOLATION: Notes leaked in list endpoint!"
    print("  -> List verified: 1 entry, zero plaintext password leak in list endpoint")

    # 7. Get Single Decrypted Password
    print(f"\n[Step 7] Reading single decrypted entry (ID: {entry_id})...")
    r = client.get(f"/api/v1/passwords/{entry_id}", headers=headers_u1)
    assert r.status_code == 200, f"Get single password failed: {r.text}"
    decrypted_data = r.json()
    assert decrypted_data["password"] == "k!9P#vL8$zQ2@mX4"
    assert decrypted_data["notes"] == "Root console credentials and MFA recovery seed"
    print("  -> Decrypted password & notes verified accurately with AES-256-GCM")

    # 8. Update Password Entry
    print(f"\n[Step 8] Updating password entry...")
    update_payload = {
        "title": "AWS Production Cloud - Primary",
        "password": "NewUpdatedSecretPassword#2026!",
        "notes": "Updated rotation key",
    }
    r = client.put(f"/api/v1/passwords/{entry_id}", json=update_payload, headers=headers_u1)
    assert r.status_code == 200, f"Update password failed: {r.text}"
    updated_data = r.json()
    assert updated_data["title"] == "AWS Production Cloud - Primary"
    assert updated_data["password"] == "NewUpdatedSecretPassword#2026!"
    assert updated_data["notes"] == "Updated rotation key"
    print("  -> Entry updated and re-encrypted successfully")

    # 9. Cross-User Isolation Check
    print("\n[Step 9] Testing Cross-User Isolation (User 2)...")
    user2_email = f"e2e_user2_{uuid.uuid4().hex[:8]}@passpass.dev"
    user2_password = "User2MasterPass123!"
    client.post("/api/v1/auth/register", json={"email": user2_email, "password": user2_password})
    r2 = client.post("/api/v1/auth/login", json={"email": user2_email, "password": user2_password})
    headers_u2 = {
        "Authorization": f"Bearer {r2.json()['access_token']}",
        "X-Vault-Token": r2.json()["vault_token"],
    }

    # User 2 list should be empty
    r = client.get("/api/v1/passwords", headers={"Authorization": f"Bearer {r2.json()['access_token']}"})
    assert r.json()["count"] == 0, "User 2 can see User 1's entries!"

    # User 2 attempting to read User 1's entry must return 404
    r = client.get(f"/api/v1/passwords/{entry_id}", headers=headers_u2)
    assert r.status_code == 404, f"SECURITY VIOLATION: User 2 accessed User 1's entry! (Status: {r.status_code})"

    # User 2 attempting to delete User 1's entry must return 404
    r = client.delete(f"/api/v1/passwords/{entry_id}", headers=headers_u2)
    assert r.status_code == 404, f"SECURITY VIOLATION: User 2 deleted User 1's entry! (Status: {r.status_code})"
    print("  -> Cross-user isolation verified: User 2 cannot list, view, or delete User 1's data")

    # 10. Delete Password Entry
    print(f"\n[Step 10] Deleting password entry as User 1...")
    r = client.delete(f"/api/v1/passwords/{entry_id}", headers=headers_u1)
    assert r.status_code == 204, f"Delete password failed: {r.text}"
    print("  -> Password entry deleted (204 No Content)")

    # 11. Verify Vault is Empty for User 1
    r = client.get("/api/v1/passwords", headers={"Authorization": f"Bearer {access_token_u1}"})
    assert r.json()["count"] == 0
    print("  -> User 1 vault is now empty (count: 0)")

    print("\n" + "=" * 60)
    print("🎉 ALL 11 END-TO-END SMOKE TEST STEPS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    try:
        run_smoke_test()
    except Exception as e:
        print(f"\n❌ Smoke Test FAILED: {e}", file=sys.stderr)
        sys.exit(1)
