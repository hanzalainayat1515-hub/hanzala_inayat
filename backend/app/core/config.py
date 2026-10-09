from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "StudyMind AI"
    environment: str = "development"
    secret_key: str = "change-this-development-secret-before-deploying"
    database_url: str = "sqlite:///./data/studymind.db"
    data_dir: Path = Path("./data")
    upload_dir: Path = Path("./data/uploads")
    chroma_dir: Path = Path("./data/chroma")
    max_upload_mb: int = Field(default=25, ge=1, le=200)
    cors_origins: str = "http://localhost:5173"
    ai_provider: str = "openai"
    openai_api_key: str | None = None
    chat_model: str = "gpt-4o-mini"
    embedding_model: str = "text-embedding-3-small"
    ollama_base_url: str = "http://localhost:11434"
    ollama_chat_model: str = "llama3.1"
    ollama_embedding_model: str = "nomic-embed-text"
    chunk_size: int = 1000
    chunk_overlap: int = 180
    retrieval_k: int = 5
    jwt_expire_minutes: int = 60 * 24

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
