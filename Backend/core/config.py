# ============================================================
# core/config.py  –  Centralized application configuration
# Reads from .env via pydantic-settings and exposes a global
# ``settings`` instance used throughout the application.
# ============================================================

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings populated from environment variables / .env file.

    Key behaviour:
    - ``DATABASE_URL``: port 5432 is **automatically replaced** with 6543
      so the connection goes through Supavisor (connection pooler).
    - ``DB_ECHO``: coerced to ``bool``.
    - ``ACCESS_TOKEN_EXPIRE_MINUTES``: coerced to ``int``.
    """

    # --- Database -----------------------------------------------------------
    DATABASE_URL: str
    DB_ECHO: bool = False

    # --- Auth / JWT ---------------------------------------------------------
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # --- Google Maps API ----------------------------------------------------
    GOOGLE_MAPS_API_KEY: str = ""          # Dummy key – set in .env for real use
    DEVIATION_THRESHOLD_METERS: int = 500  # Ngưỡng cảnh báo chệch hướng (m)
    DEFAULT_CHECKIN_RADIUS_METERS: int = 100
    AVG_CITY_SPEED_KMH: float = 30.0      # Tốc độ TB ước lượng trong thành phố

    # --- Pydantic-settings config -------------------------------------------
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",          # silently ignore env vars not declared here
    )

    # --- Validators ---------------------------------------------------------
    @field_validator("DATABASE_URL", mode="after")
    @classmethod
    def swap_port_to_supavisor(cls, v: str) -> str:
        """
        Supabase pooler (Supavisor) listens on port **6543**.
        If the URL still contains the default Postgres port (5432),
        swap it automatically so developers don't have to remember.
        """
        if ":5432" in v:
            v = v.replace(":5432", ":6543")
        return v


# ---------------------------------------------------------------------------
# Global singleton – import this everywhere:
#   from core.config import settings
# ---------------------------------------------------------------------------
settings = Settings()
