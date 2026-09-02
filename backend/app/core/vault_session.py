"""Server-side in-memory vault session store.

Manages the lifecycle of derived vault encryption keys in memory.
When a user logs in, their vault key is derived from their password via KDF
and stored here, associated with a unique vault_token (UUID).

The vault_token is returned to the client as an opaque session identifier.
It is NOT the encryption key itself — the key never leaves the server.

Architecture:
    Login → KDF(password, salt) → vault_key
         → vault_session.create(user_id, vault_key) → vault_token
         → client receives vault_token (opaque UUID)

    CRUD request → X-Vault-Token header → vault_session.get(token, user_id) → key
                 → encrypt/decrypt with key

Security guarantees:
    - Encryption keys are stored only in server memory, never on disk/DB.
    - Each vault_token is bound to a specific user_id (cross-user access denied).
    - Sessions expire automatically (TTL matches JWT expiration).
    - Revocation removes the key from memory immediately.

Limitations (acceptable for current architecture):
    - In-memory store is lost on server restart (users must re-login).
    - Not suitable for multi-process/multi-server deployments without
      a shared session backend (e.g., Redis). This is documented for
      future improvement.
"""

import uuid
import threading
from datetime import datetime, timedelta, timezone
from dataclasses import dataclass

from app.core.config import settings


@dataclass
class _VaultSession:
    """Internal session record holding a vault key and metadata."""
    user_id: uuid.UUID
    vault_key: bytes
    expires_at: datetime


class VaultSessionStore:
    """Thread-safe in-memory store for vault encryption keys.

    Usage:
        store = VaultSessionStore()
        token = store.create(user_id, vault_key)
        key = store.get(token, user_id)   # Returns key or None
        store.revoke(token)               # Explicit cleanup
    """

    def __init__(self) -> None:
        self._sessions: dict[str, _VaultSession] = {}
        self._lock = threading.Lock()

    def create(self, user_id: uuid.UUID, vault_key: bytes) -> str:
        """Store a vault key and return its session token.

        Args:
            user_id: The authenticated user's ID.
            vault_key: The derived 32-byte vault encryption key.

        Returns:
            A UUID string (vault_token) that the client uses to reference
            this session. This token is NOT the encryption key.
        """
        vault_token = uuid.uuid4().hex
        expires_at = datetime.now(timezone.utc) + timedelta(
            minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES
        )

        with self._lock:
            # Clean expired sessions opportunistically
            self._cleanup_expired()

            self._sessions[vault_token] = _VaultSession(
                user_id=user_id,
                vault_key=vault_key,
                expires_at=expires_at,
            )

        return vault_token

    def get(self, vault_token: str, user_id: uuid.UUID) -> bytes | None:
        """Retrieve a vault key by token, with user ownership verification.

        Returns the vault key only if:
            1. The token exists in the store.
            2. The session has not expired.
            3. The user_id matches the session's user_id.

        Args:
            vault_token: The session token from the client.
            user_id: The authenticated user's ID (from JWT).

        Returns:
            The 32-byte vault encryption key, or None if the session
            is invalid, expired, or belongs to a different user.
        """
        with self._lock:
            session = self._sessions.get(vault_token)

            if session is None:
                return None

            # Check expiration
            if datetime.now(timezone.utc) >= session.expires_at:
                del self._sessions[vault_token]
                return None

            # Ownership verification: prevent cross-user access
            if session.user_id != user_id:
                return None

            return session.vault_key

    def revoke(self, vault_token: str) -> None:
        """Remove a vault session, zeroing the key from memory.

        Args:
            vault_token: The session token to revoke.
        """
        with self._lock:
            session = self._sessions.pop(vault_token, None)
            if session is not None:
                # Overwrite key bytes in memory before discarding
                # (best-effort; Python GC may retain copies)
                session.vault_key = b"\x00" * len(session.vault_key)

    def _cleanup_expired(self) -> None:
        """Remove all expired sessions. Must be called under lock."""
        now = datetime.now(timezone.utc)
        expired_tokens = [
            token for token, session in self._sessions.items()
            if now >= session.expires_at
        ]
        for token in expired_tokens:
            session = self._sessions.pop(token)
            session.vault_key = b"\x00" * len(session.vault_key)


# Module-level singleton instance
vault_session_store = VaultSessionStore()
