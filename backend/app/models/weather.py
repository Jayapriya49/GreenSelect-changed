from sqlalchemy import Column, Integer, Float, String, DateTime, JSON
from datetime import datetime
from backend.app.database.base import Base

class WeatherHistoryCache(Base):
    __tablename__ = "weather_history_cache"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    latitude = Column(Float, nullable=False, index=True)
    longitude = Column(Float, nullable=False, index=True)
    start_year = Column(Integer, nullable=False)
    end_year = Column(Integer, nullable=False)
    
    # Store aggregated and raw monthly data
    monthly_data = Column(JSON, nullable=False)
    seasonal_data = Column(JSON, nullable=False)
    raw_parameters = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
