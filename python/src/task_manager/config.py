"""Pattern 5 -- Configuration Externalisation.

All application settings are declared as typed fields on a Pydantic
Settings class.  Values are loaded from environment variables (or a
.env file) and validated at import time.  No hard-coded connection
strings, magic numbers, or stringly-typed config dictionaries appear
anywhere else in the codebase.
"""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Validated, externalised application configuration."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # -- application --------------------------------------------------------
    app_name: str = "Task Manager"
    app_debug: bool = False

    # -- database -----------------------------------------------------------
    database_url: str = "sqlite+aiosqlite:///./tasks.db"

    # -- pagination ---------------------------------------------------------
    default_page_size: int = 20

    # -- server -------------------------------------------------------------
    server_host: str = "0.0.0.0"
    server_port: int = 8000


def get_settings() -> Settings:
    """Factory used by the DI container to produce a validated Settings."""
    return Settings()
