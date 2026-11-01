from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class CandidateSiteBase(BaseModel):
    site_code: str
    name: str
    state: str
    district: str
    region: str
    latitude: float
    longitude: float
    energy_type: str # Solar, Wind, Hybrid

    # Solar
    solar_ghi: float
    solar_dni: float
    solar_pvout: float
    temperature_avg: float

    # Wind
    wind_speed_10m: float
    wind_speed_50m: float
    wind_power_density: float

    # Terrain
    elevation_m: float
    slope_deg: float
    terrain_type: str

    # Infrastructure
    distance_to_grid_km: float
    distance_to_substation_km: float
    distance_to_road_km: float
    road_type: str

    # Land & Environment
    land_cover_class: str
    land_suitability_score: float
    environmental_penalty: float
    nearest_protected_area: Optional[str] = None
    distance_to_protected_area_km: float

    # Metrics
    ml_suitability_score: float
    suitability_tier: str
    estimated_capacity_mw: float
    annual_energy_potential_gwh: float
    lcoe_inr_kwh: float
    co2_offset_tonnes_year: float

    # MNRE Integration
    nearest_mnre_park: Optional[str] = None
    distance_to_mnre_park_km: Optional[float] = None
    in_mnre_green_corridor: Optional[str] = None

class CandidateSiteSummary(BaseModel):
    id: int
    site_code: str
    name: str
    state: str
    district: str
    region: str
    latitude: float
    longitude: float
    energy_type: str
    ml_suitability_score: float
    suitability_tier: str
    solar_ghi: float
    wind_speed_50m: float
    distance_to_grid_km: float
    estimated_capacity_mw: float
    nearest_mnre_park: Optional[str] = None
    distance_to_mnre_park_km: Optional[float] = None
    in_mnre_green_corridor: Optional[str] = None

    class Config:
        from_attributes = True

class CandidateSiteResponse(CandidateSiteBase):
    id: int
    shap_positive_factors: Optional[List[Dict[str, Any]]] = None
    shap_negative_factors: Optional[List[Dict[str, Any]]] = None
    explanation_summary: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class SiteFilterParams(BaseModel):
    energy_type: Optional[str] = None # All, Solar, Wind, Hybrid
    region: Optional[str] = None # North, South, East, West, Central, Northeast
    state: Optional[str] = None
    min_suitability: Optional[float] = None # 70, 80, 90
    max_grid_distance: Optional[float] = None
    max_slope: Optional[float] = None
    limit: int = Field(default=100, ge=1, le=500)
    offset: int = Field(default=0, ge=0)

class NearbyQueryParams(BaseModel):
    latitude: float
    longitude: float
    radius_km: float = Field(default=150.0, ge=1.0, le=1000.0)
    energy_type: Optional[str] = None
    limit: int = Field(default=10, ge=1, le=50)
