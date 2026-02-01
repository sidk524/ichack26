"""Application configuration using pydantic-settings."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Application
    app_name: str = "Disaster Call Processor"
    debug: bool = False
    log_level: str = "INFO"

    # MongoDB
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_database: str = "disaster_calls"

    # Anthropic Claude
    anthropic_api_key: str = ""
    claude_model: str = "claude-sonnet-4-20250514"
    claude_max_tokens: int = 1024
    claude_rate_limit_rpm: int = 50  # requests per minute

    # WebSocket
    ws_heartbeat_interval: int = 30  # seconds
    ws_connection_timeout: int = 60  # seconds

    # Processing
    chunk_buffer_size: int = 3  # chunks to buffer before LLM call
    summary_update_interval: int = 5  # seconds between summary updates


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
