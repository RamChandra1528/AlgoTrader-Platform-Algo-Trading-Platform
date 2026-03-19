import os


class Settings:
    PROJECT_NAME: str = "Algo Trading Platform"
    VERSION: str = "1.0.0"

    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "sqlite:///./algotrading.db",
    )

    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-key-change-me")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
    )
    ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL", "admin@algotrader.local")
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "Admin@123")
    ADMIN_FULL_NAME: str = os.getenv("ADMIN_FULL_NAME", "Platform Administrator")


settings = Settings()
