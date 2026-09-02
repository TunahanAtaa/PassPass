"""Unit tests for AES-256-GCM encryption and Argon2id key derivation."""

import os

import pytest
from cryptography.exceptions import InvalidTag

from app.core.encryption import (
    encrypt,
    decrypt,
    derive_vault_key,
    generate_kdf_salt,
)


# Use a fixed test key (32 bytes) — NOT derived from a real password
_TEST_KEY = os.urandom(32)


# ===========================================================================
# Encrypt / Decrypt Roundtrip Tests
# ===========================================================================

class TestEncryptDecryptRoundtrip:
    """Test that encrypt → decrypt produces the original plaintext."""

    def test_roundtrip_basic(self):
        """Encrypting and decrypting returns the original plaintext."""
        plaintext = "MyGitHubPassword123!"
        ciphertext, nonce = encrypt(plaintext, _TEST_KEY)
        result = decrypt(ciphertext, nonce, _TEST_KEY)
        assert result == plaintext

    def test_roundtrip_unicode(self):
        """Unicode text survives encrypt/decrypt roundtrip."""
        plaintext = "パスワード🔐 şifre"
        ciphertext, nonce = encrypt(plaintext, _TEST_KEY)
        result = decrypt(ciphertext, nonce, _TEST_KEY)
        assert result == plaintext

    def test_roundtrip_empty_string(self):
        """Empty string can be encrypted and decrypted."""
        plaintext = ""
        ciphertext, nonce = encrypt(plaintext, _TEST_KEY)
        result = decrypt(ciphertext, nonce, _TEST_KEY)
        assert result == plaintext

    def test_roundtrip_long_text(self):
        """Long text encrypts and decrypts correctly."""
        plaintext = "A" * 10000
        ciphertext, nonce = encrypt(plaintext, _TEST_KEY)
        result = decrypt(ciphertext, nonce, _TEST_KEY)
        assert result == plaintext


# ===========================================================================
# Nonce Uniqueness Tests
# ===========================================================================

class TestNonceUniqueness:
    """Test that each encryption produces a unique nonce."""

    def test_different_nonces_for_same_plaintext(self):
        """Two encryptions of the same plaintext must produce different nonces."""
        plaintext = "SamePassword"
        _, nonce1 = encrypt(plaintext, _TEST_KEY)
        _, nonce2 = encrypt(plaintext, _TEST_KEY)
        assert nonce1 != nonce2

    def test_different_ciphertexts_for_same_plaintext(self):
        """Two encryptions of the same plaintext must produce different ciphertexts."""
        plaintext = "SamePassword"
        ct1, _ = encrypt(plaintext, _TEST_KEY)
        ct2, _ = encrypt(plaintext, _TEST_KEY)
        assert ct1 != ct2


# ===========================================================================
# Decryption Failure Tests
# ===========================================================================

class TestDecryptionFailures:
    """Test that tampered data is rejected."""

    def test_wrong_key_fails(self):
        """Decrypting with a different key raises InvalidTag."""
        plaintext = "SecretData"
        ciphertext, nonce = encrypt(plaintext, _TEST_KEY)

        wrong_key = os.urandom(32)
        with pytest.raises(InvalidTag):
            decrypt(ciphertext, nonce, wrong_key)

    def test_tampered_ciphertext_fails(self):
        """Modified ciphertext causes authentication tag verification to fail."""
        import base64

        plaintext = "IntegrityCheck"
        ciphertext_b64, nonce = encrypt(plaintext, _TEST_KEY)

        # Tamper with the ciphertext
        raw = bytearray(base64.b64decode(ciphertext_b64))
        raw[0] ^= 0xFF  # flip bits in first byte
        tampered_b64 = base64.b64encode(bytes(raw)).decode("ascii")

        with pytest.raises(InvalidTag):
            decrypt(tampered_b64, nonce, _TEST_KEY)

    def test_tampered_nonce_fails(self):
        """Modified nonce causes decryption to fail."""
        import base64

        plaintext = "NonceCheck"
        ciphertext, nonce_b64 = encrypt(plaintext, _TEST_KEY)

        # Tamper with the nonce
        raw = bytearray(base64.b64decode(nonce_b64))
        raw[0] ^= 0xFF
        tampered_nonce = base64.b64encode(bytes(raw)).decode("ascii")

        with pytest.raises(InvalidTag):
            decrypt(ciphertext, tampered_nonce, _TEST_KEY)


# ===========================================================================
# Key Validation Tests
# ===========================================================================

class TestKeyValidation:
    """Test key length validation."""

    def test_encrypt_rejects_short_key(self):
        """Encrypt raises ValueError for keys shorter than 32 bytes."""
        with pytest.raises(ValueError, match="32 bytes"):
            encrypt("test", os.urandom(16))

    def test_decrypt_rejects_short_key(self):
        """Decrypt raises ValueError for keys shorter than 32 bytes."""
        ciphertext, nonce = encrypt("test", _TEST_KEY)
        with pytest.raises(ValueError, match="32 bytes"):
            decrypt(ciphertext, nonce, os.urandom(16))

    def test_encrypt_rejects_long_key(self):
        """Encrypt raises ValueError for keys longer than 32 bytes."""
        with pytest.raises(ValueError, match="32 bytes"):
            encrypt("test", os.urandom(64))


# ===========================================================================
# Key Derivation (KDF) Tests
# ===========================================================================

class TestKeyDerivation:
    """Test Argon2id key derivation function."""

    def test_same_password_same_salt_produces_same_key(self):
        """Deterministic: same password + same salt → same key."""
        password = "MyVaultPassword1!"
        salt = generate_kdf_salt()

        key1 = derive_vault_key(password, salt)
        key2 = derive_vault_key(password, salt)

        assert key1 == key2

    def test_same_password_different_salt_produces_different_key(self):
        """Different salt → different key (even with same password)."""
        password = "MyVaultPassword1!"
        salt1 = generate_kdf_salt()
        salt2 = generate_kdf_salt()

        key1 = derive_vault_key(password, salt1)
        key2 = derive_vault_key(password, salt2)

        assert key1 != key2

    def test_different_password_same_salt_produces_different_key(self):
        """Different password → different key (even with same salt)."""
        salt = generate_kdf_salt()

        key1 = derive_vault_key("PasswordOne1!", salt)
        key2 = derive_vault_key("PasswordTwo2!", salt)

        assert key1 != key2

    def test_kdf_output_is_32_bytes(self):
        """KDF must produce exactly 32 bytes for AES-256."""
        password = "TestPassword1!"
        salt = generate_kdf_salt()

        key = derive_vault_key(password, salt)

        assert isinstance(key, bytes)
        assert len(key) == 32

    def test_kdf_key_works_with_encryption(self):
        """A KDF-derived key can be used for AES-256-GCM encrypt/decrypt."""
        password = "VaultKey1!"
        salt = generate_kdf_salt()
        key = derive_vault_key(password, salt)

        plaintext = "Sensitive vault data"
        ciphertext, nonce = encrypt(plaintext, key)
        result = decrypt(ciphertext, nonce, key)

        assert result == plaintext


# ===========================================================================
# KDF Salt Generation Tests
# ===========================================================================

class TestKDFSaltGeneration:
    """Test KDF salt generation."""

    def test_salt_is_bytes(self):
        """generate_kdf_salt returns bytes."""
        salt = generate_kdf_salt()
        assert isinstance(salt, bytes)

    def test_salt_has_correct_length(self):
        """Salt length matches configured VAULT_KDF_SALT_LENGTH."""
        from app.core.config import settings
        salt = generate_kdf_salt()
        assert len(salt) == settings.VAULT_KDF_SALT_LENGTH

    def test_salts_are_unique(self):
        """Two generated salts must be different (random)."""
        salt1 = generate_kdf_salt()
        salt2 = generate_kdf_salt()
        assert salt1 != salt2
