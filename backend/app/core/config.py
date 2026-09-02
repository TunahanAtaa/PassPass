import json
from typing import Any, List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """PassPass Application Settings."""

    PROJECT_NAME: str = "PassPass API"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = True

    # PostgreSQL Configuration
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "passpass"
    POSTGRES_PASSWORD: str = ""
    POSTGRES_DB: str = "passpass_db"


    # CORS Configuration
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

    # JWT Configuration
    JWT_SECRET_KEY: str = ""
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Vault KDF Configuration (Argon2id key derivation for vault encryption)
    # These parameters control how the user's password is converted into
    # a 32-byte AES-256 encryption key. Defaults follow OWASP recommendations.
    VAULT_KDF_MEMORY_COST: int = 65536   # 64 MB memory usage
    VAULT_KDF_TIME_COST: int = 3         # 3 iterations
    VAULT_KDF_PARALLELISM: int = 4       # 4 parallel threads
    VAULT_KDF_SALT_LENGTH: int = 16      # 128-bit salt (bytes)

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, str) and v.startswith("["):
            return json.loads(v)
        elif isinstance(v, list):
            return v
        raise ValueError(v)

    @property
    def DATABASE_URL(self) -> str:
        """Construct the PostgreSQL SQLAlchemy connection URL using psycopg (psycopg3)."""
        return (
            f"postgresql+psycopg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@"
            f"{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
