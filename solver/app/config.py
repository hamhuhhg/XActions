from __future__ import annotations

from typing import Optional

from pydantic import Field, AliasChoices
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    HOST: str = "0.0.0.0"
    PORT: int = Field(default=8191, validation_alias=AliasChoices("SOLVER_PORT", "TURNSTILE_PORT"))
    LOG_LEVEL: str = "info"
    MAX_TIMEOUT: int = 60000
    MAX_BROWSERS: int = 4
    HEADLESS: bool = False
    BROWSER_EXECUTABLE_PATH: Optional[str] = None

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


settings = Settings()
VERSION = "0.1.0"
