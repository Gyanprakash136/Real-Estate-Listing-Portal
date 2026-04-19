from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    app_name: str = "Real Estate Portal API"
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440

    # Database
    database_url: str

    # Kafka
    kafka_bootstrap_servers: str = "kafka:29092"
    schema_registry_url: str = "http://localhost:8081"

    # Kafka Topics
    topic_listing_created: str = "listing.created"
    topic_listing_updated: str = "listing.updated"
    topic_inquiry_submitted: str = "inquiry.submitted"
    topic_analytics_pageview: str = "analytics.pageview"

    # File uploads
    upload_dir: str = "./uploads"
    max_file_size_mb: int = 10

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
