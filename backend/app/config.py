from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "ProcJus"
    secret_key: str = "dev-secret-change-me-before-deploying-procjus"
    access_token_minutes: int = 60 * 24
    cookie_name: str = "procjus_session"
    cookie_secure: bool = False
    cors_origins: list[str] = ["http://localhost:5173"]

    database_url: str = "sqlite:///./procjus.db"

    max_upload_mb: int = 10
    max_document_chars: int = 400_000
    chat_history_turns: int = 12

    llm_provider: Literal["gemini", "openai_compat", "fake"] = "fake"
    llm_timeout_seconds: float = 120.0

    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"
    gemini_max_input_chars: int = 600_000

    openai_compat_base_url: str = "https://api.groq.com/openai/v1"
    openai_compat_api_key: str = ""
    openai_compat_model: str = "llama-3.3-70b-versatile"
    openai_compat_max_input_chars: int = 40_000


@lru_cache
def get_settings() -> Settings:
    return Settings()
