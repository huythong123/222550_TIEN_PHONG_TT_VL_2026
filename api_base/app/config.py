from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    APP_NAME: str = "Auto Ads Video Generator"
    SECRET_KEY: Optional[str] = ""
    RUNWAY_API_KEY: Optional[str] = ""
    OPENAI_API_KEY: Optional[str] = ""
    OUTPUT_DIR: str = "utils/download"

    # --- THÊM DÒNG NÀY VÀO ĐỂ SỬA LỖI BÊN CRAWLER ---
    MAX_CRAWL_TIMEOUT: int = 15

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"
    )

settings = Settings()