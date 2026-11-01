import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
MODELS_DIR = BASE_DIR / "models"
RAW_DATA_DIR = DATA_DIR / "raw"
PROCESSED_DATA_DIR = DATA_DIR / "processed"

class Settings(BaseSettings):
    PROJECT_NAME: str = "GreenSelect"
    PROJECT_DESCRIPTION: str = "AI-Powered Renewable Energy Site Selection for India"
    API_V1_STR: str = "/api"
    DATA_DIR: Path = DATA_DIR
    RAW_DATA_DIR: Path = RAW_DATA_DIR
    PROCESSED_DATA_DIR: Path = PROCESSED_DATA_DIR
    MODELS_DIR: Path = MODELS_DIR
    
    # Database configuration (Defaults to SQLite for local development, connects to PostgreSQL/PostGIS in production)
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/renewai.db")
    
    # ML & GIS configurations
    MODEL_PATH: Path = MODELS_DIR / "renewable_site_model.joblib"
    SCALER_PATH: Path = MODELS_DIR / "scaler.joblib"
    METADATA_PATH: Path = MODELS_DIR / "model_metadata.json"
    PROCESSED_DATA_PATH: Path = PROCESSED_DATA_DIR / "india_candidate_sites.csv"
    
    # NASA POWER API settings
    NASA_POWER_BASE_URL: str = "https://power.larc.nasa.gov/api/temporal/climatology/point"
    
    # CORS Origins
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "*"
    ]
    
    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
