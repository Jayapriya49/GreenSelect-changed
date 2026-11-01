from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class WeatherQueryRequest(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude of target location")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude of target location")
    start_year: int = Field(2018, ge=1990, le=2025, description="Historical analysis start year")
    end_year: int = Field(2023, ge=1990, le=2025, description="Historical analysis end year")
    site_id: Optional[int] = Field(None, description="Optional candidate site ID")
    location_name: Optional[str] = Field(None, description="Location / candidate site name")
    state: Optional[str] = Field(None, description="State name")

class MonthlyWeatherItem(BaseModel):
    month: int = Field(..., ge=1, le=12)
    month_name: str
    solar_radiation: float = Field(..., description="Daily average solar irradiance (kWh/m²/day)")
    wind_speed: float = Field(..., description="Wind speed at 10m (m/s)")
    temperature: float = Field(..., description="Temperature at 2m (°C)")
    precipitation: float = Field(..., description="Precipitation rate (mm/day)")
    rainfall_month_mm: float = Field(..., description="Estimated total monthly rainfall (mm)")

class SeasonalWeatherItem(BaseModel):
    season_name: str  # Winter, Summer, Monsoon, Post-monsoon
    months_included: List[str]
    solar_radiation_avg: float
    wind_speed_avg: float
    temperature_avg: float
    precipitation_avg: float
    solar_delta_pct: float
    wind_delta_pct: float

class SeasonalSummary(BaseModel):
    best_solar_season: str
    best_solar_value: float
    best_wind_season: str
    best_wind_value: float
    annual_avg_solar: float
    annual_avg_wind: float
    annual_avg_temperature: float
    annual_total_rainfall_mm: float
    disclaimer: str

class WeatherAnalysisResponse(BaseModel):
    location_name: str
    state: Optional[str] = None
    district: Optional[str] = None
    latitude: float
    longitude: float
    start_year: int
    end_year: int
    data_source: str
    is_cached: bool
    monthly_data: List[MonthlyWeatherItem]
    seasonal_data: List[SeasonalWeatherItem]
    summary: SeasonalSummary
    yearly_trend: Optional[List[Dict[str, float]]] = None

class LocationComparisonRequest(BaseModel):
    site_ids: Optional[List[int]] = Field(None, description="List of candidate site IDs to compare")
    custom_locations: Optional[List[WeatherQueryRequest]] = Field(None, description="List of custom locations")
    start_year: int = Field(2018, ge=1990, le=2025)
    end_year: int = Field(2023, ge=1990, le=2025)

class LocationComparisonResponse(BaseModel):
    start_year: int
    end_year: int
    locations: List[WeatherAnalysisResponse]
    monthly_comparison: List[Dict[str, Any]]
    seasonal_comparison: List[Dict[str, Any]]

