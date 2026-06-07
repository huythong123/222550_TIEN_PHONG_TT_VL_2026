from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
from urllib.parse import quote_plus
from pathlib import Path


ENV_FILE_PATH = Path(__file__).resolve().parent.parent / ".env"

class Settings(BaseSettings):
    APP_NAME: str = "Auto Ads Video Generator"
    SECRET_KEY: Optional[str] = ""
    OPENAI_API_KEY: Optional[str] = ""
    KLING_API_KEY: Optional[str] = None
    KLING_ACCESS_KEY: Optional[str] = None
    OUTPUT_DIR: str = "utils/download"
    # Credits configuration
    # One credit equals 1 second of generated video
    CREDIT_UNIT_SECONDS: int = 1
    # One credit equals this many characters of voiceover text when billing voice (step5)
    CREDIT_UNIT_CHARS: int = 100
    # Credits per USD. 2 USD => 35 credits => 1 USD => 17.5 credits
    CREDITS_PER_DOLLAR: float = 17.5
    MYSQL_HOST: str = "127.0.0.1"
    MYSQL_PORT: int = 3306
    MYSQL_USER: str = "root"
    MYSQL_PASSWORD: str = ""
    MYSQL_DATABASE: str = "autoads_system"
    DEFAULT_ADMIN_USERNAME: str = "admin"
    DEFAULT_ADMIN_PASSWORD: str = "admin123"
    DEFAULT_ADMIN_EMAIL: Optional[str] = "admin@autoads.local"
    FRONTEND_URL: str = "http://localhost:5173"
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/google/callback"
    GOOGLE_AUTH_URL: str = "https://accounts.google.com/o/oauth2/v2/auth"
    GOOGLE_TOKEN_URL: str = "https://oauth2.googleapis.com/token"
    GOOGLE_USERINFO_URL: str = "https://www.googleapis.com/oauth2/v3/userinfo"

    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM_EMAIL: Optional[str] = None
    SMTP_FROM_NAME: str = "AutoAds System"

    # Payment / SePay settings
    SEPAY_API_KEY: Optional[str] = None
    SEPAY_ACCOUNT_NUMBER: Optional[str] = None
    SEPAY_ACCOUNT_NAME: Optional[str] = None
    SEPAY_BANK_BRAND: Optional[str] = None
    # USD to VND conversion rate for creating VND amount (adjust as needed)
    USD_TO_VND: int = 24000
    # XOR key used to obfuscate payment ids
    # Accept hex string (e.g. 0x5EAFB) or integer in .env. Use `PAYMENT_XOR_KEY_INT` property to get int.
    PAYMENT_XOR_KEY: str = "0x5EAFB"
    # Expire minutes for pending payments
    PAYMENT_EXPIRE_MINUTES: int = 60
    # Short name used in bank transfer content prefix (no spaces)
    NAME_WEB: str = "AUToads"
    # Tolerance in VND when matching incoming transfer amount (to allow fees/rounding)
    PAYMENT_MATCH_TOLERANCE_VND: int = 1000

    MAX_CRAWL_TIMEOUT: int = 15

    @property
    def DATABASE_URL(self) -> str:
        encoded_password = quote_plus(self.MYSQL_PASSWORD)
        return (
            f"mysql+pymysql://{self.MYSQL_USER}:{encoded_password}"
            f"@{self.MYSQL_HOST}:{self.MYSQL_PORT}/{self.MYSQL_DATABASE}?charset=utf8mb4"
        )

    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE_PATH),
        env_ignore_empty=True,
        extra="ignore"
    )

settings = Settings()


@property
def PAYMENT_XOR_KEY_INT(self) -> int:  # type: ignore[override]
    raw = getattr(self, 'PAYMENT_XOR_KEY', None)
    if raw is None:
        return 0x5EAFB
    try:
        # allow hex (0x...) or decimal
        return int(str(raw), 0)
    except Exception:
        try:
            return int(str(raw))
        except Exception:
            return 0x5EAFB

# attach helper to settings instance
setattr(settings.__class__, 'PAYMENT_XOR_KEY_INT', PAYMENT_XOR_KEY_INT)