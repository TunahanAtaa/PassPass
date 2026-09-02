"""Vault encryption service using AES-256-GCM with Argon2id key derivation.

This module provides:
    1. Key Derivation: derive_vault_key() uses Argon2id to convert a user's
       password + salt into a 32-byte AES-256 encryption key.
    2. Authenticated Encryption: encrypt() and decrypt() use AES-256-GCM
       which provides both confidentiality and integrity.

Architecture:
    User Password + KDF Salt
            ↓
    Argon2id KDF (hash_secret_raw)
            ↓
    32-byte Vault Encryption Key
            ↓
    AES-256-GCM encrypt/decrypt

Security notes:
    - The KDF salt is NOT the same as the password hash salt.
    - The derived key is NEVER stored in the database.
    - The derived key is NEVER included in API responses.
    - The derived key is NEVER logged.
    - Each encryption operation uses a unique random nonce.
"""

import os
import base64

from argon2.low_level import hash_secret_raw, Type
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.core.config import settings

# AES-256 requires a 32-byte (256-bit) key
_AES_KEY_SIZE = 32

# GCM recommended nonce size: 96 bits (12 bytes)
_NONCE_SIZE = 12

# Argon2id KDF output length: 32 bytes for AES-256
_KDF_HASH_LEN = 32


def generate_kdf_salt() -> bytes:
    """Generate a cryptographically secure random salt for vault KDF.

    Returns a salt of the configured length (default: 16 bytes / 128 bits).
    This salt is separate from the password hash salt and must be stored
    with the user record for deterministic key re-derivation.

    Returns:
        Random bytes suitable for KDF salt.
    """
    return os.urandom(settings.VAULT_KDF_SALT_LENGTH)


def derive_vault_key(password: str, salt: bytes) -> bytes:
    """Derive a 32-byte vault encryption key from a password using Argon2id.

    This function uses Argon2id (via argon2-cffi low-level API) to perform
    key derivation. It is completely separate from password hashing:

        Password hashing: password → Argon2id → hash string (for DB storage)
        Key derivation:   password + salt → Argon2id → 32 raw bytes (for AES key)

    The derived key is deterministic: same password + same salt always
    produces the same key. This is required so users can decrypt their
    vault data across sessions.

    Args:
        password: The user's plaintext password.
        salt: The KDF salt stored with the user record.

    Returns:
        32-byte encryption key suitable for AES-256-GCM.
    """
    return hash_secret_raw(
        secret=password.encode("utf-8"),
        salt=salt,
        time_cost=settings.VAULT_KDF_TIME_COST,
        memory_cost=settings.VAULT_KDF_MEMORY_COST,
        parallelism=settings.VAULT_KDF_PARALLELISM,
        hash_len=_KDF_HASH_LEN,
        type=Type.ID,  # Argon2id: hybrid side-channel + GPU resistant
    )


def encrypt(plaintext: str, key: bytes) -> tuple[str, str]:
    """Encrypt plaintext using AES-256-GCM.

    A unique 96-bit nonce is generated for each call using os.urandom(),
    ensuring nonce reuse is cryptographically improbable.

    Args:
        plaintext: The string to encrypt.
        key: 32-byte AES-256 encryption key.

    Returns:
        A tuple of (ciphertext_b64, nonce_b64) where both values are
        base64-encoded strings suitable for database storage.

    Raises:
        ValueError: If the key length is incorrect.
    """
    if len(key) != _AES_KEY_SIZE:
        raise ValueError(f"Key must be exactly {_AES_KEY_SIZE} bytes.")

    # Generate a unique nonce for this encryption operation
    nonce = os.urandom(_NONCE_SIZE)

    aesgcm = AESGCM(key)
    # GCM appends the authentication tag to the ciphertext
    ciphertext = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)

    # Encode as base64 for safe database storage
    ciphertext_b64 = base64.b64encode(ciphertext).decode("ascii")
    nonce_b64 = base64.b64encode(nonce).decode("ascii")

    return ciphertext_b64, nonce_b64


def decrypt(ciphertext_b64: str, nonce_b64: str, key: bytes) -> str:
    """Decrypt AES-256-GCM encrypted data.

    Verifies the authentication tag during decryption. If the ciphertext
    or tag has been tampered with, an InvalidTag exception is raised.

    Args:
        ciphertext_b64: Base64-encoded ciphertext (includes GCM auth tag).
        nonce_b64: Base64-encoded nonce used during encryption.
        key: 32-byte AES-256 encryption key (must match the encryption key).

    Returns:
        The decrypted plaintext string.

    Raises:
        ValueError: If the key length is incorrect.
        cryptography.exceptions.InvalidTag: If authentication fails
            (wrong key, tampered ciphertext, or corrupted data).
    """
    if len(key) != _AES_KEY_SIZE:
        raise ValueError(f"Key must be exactly {_AES_KEY_SIZE} bytes.")

    ciphertext = base64.b64decode(ciphertext_b64)
    nonce = base64.b64decode(nonce_b64)

    aesgcm = AESGCM(key)
    plaintext_bytes = aesgcm.decrypt(nonce, ciphertext, None)

    return plaintext_bytes.decode("utf-8")
