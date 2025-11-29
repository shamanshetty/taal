from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding='utf-8', extra='ignore')

    # Database
    database_url: str = "postgresql://user:password@localhost:5432/taalai"

    # API Keys
    gemini_api_key: str = "dummy-key-for-development"
    gemini_model: str = "gemini-2.0-flash"
    google_speech_api_key: Optional[str] = None

    # Twilio
    twilio_account_sid: Optional[str] = None
    twilio_auth_token: Optional[str] = None
    twilio_whatsapp_number: Optional[str] = None

    # JWT
    secret_key: str = "development-secret-key-change-in-production-min-32-chars"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # CORS
    allowed_origins: str = "http://localhost:3000"

    # Supabase
    supabase_url: Optional[str] = None
    supabase_service_key: Optional[str] = None

settings = Settings()
