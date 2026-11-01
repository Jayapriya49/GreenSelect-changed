from sqlalchemy import Column, Integer, Float, String, DateTime, Text, JSON
from datetime import datetime
from backend.app.database.base import Base

class CandidateSite(Base):
    __tablename__ = "candidate_sites"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    site_code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(200), nullable=False)
    state = Column(String(100), index=True, nullable=False)
    district = Column(String(100), index=True, nullable=False)
    region = Column(String(50), index=True, nullable=False)
    latitude = Column(Float, nullable=False, index=True)
    longitude = Column(Float, nullable=False, index=True)
    energy_type = Column(String(50), index=True, nullable=False) # Solar, Wind, Hybrid

    # Solar Resource Features (NASA POWER & GSA data)
    solar_ghi = Column(Float, nullable=False)             # kWh/m2/day
    solar_dni = Column(Float, nullable=False)             # kWh/m2/day
    solar_pvout = Column(Float, nullable=False)           # kWh/kWp/year
    temperature_avg = Column(Float, nullable=False)       # °C

    # Wind Resource Features (NASA POWER & GWA data)
    wind_speed_10m = Column(Float, nullable=False)        # m/s
    wind_speed_50m = Column(Float, nullable=False)        # m/s
    wind_power_density = Column(Float, nullable=False)    # W/m2

    # Terrain Features (SRTM DEM)
    elevation_m = Column(Float, nullable=False)           # meters
    slope_deg = Column(Float, nullable=False)             # degrees
    terrain_type = Column(String(100), nullable=False)

    # Infrastructure Proximity (OSM)
    distance_to_grid_km = Column(Float, nullable=False)   # km
    distance_to_substation_km = Column(Float, nullable=False) # km
    distance_to_road_km = Column(Float, nullable=False)   # km
    road_type = Column(String(100), nullable=False)

    # Land Cover & Environmental
    land_cover_class = Column(String(100), nullable=False)
    land_suitability_score = Column(Float, nullable=False)# 0-100
    environmental_penalty = Column(Float, nullable=False) # 0-100
    nearest_protected_area = Column(String(200), nullable=True)
    distance_to_protected_area_km = Column(Float, nullable=False)

    # ML Output & Capacity Estimates
    ml_suitability_score = Column(Float, nullable=False, index=True) # 0-100
    suitability_tier = Column(String(50), index=True, nullable=False) # Very High, High, Moderate, Low
    estimated_capacity_mw = Column(Float, nullable=False)
    annual_energy_potential_gwh = Column(Float, nullable=False)
    lcoe_inr_kwh = Column(Float, nullable=False)
    co2_offset_tonnes_year = Column(Float, nullable=False)
    
    # MNRE Integration & Benchmark Corridors
    nearest_mnre_park = Column(String(200), nullable=True)
    distance_to_mnre_park_km = Column(Float, nullable=True)
    in_mnre_green_corridor = Column(String(50), nullable=True) # Yes / Phase I / Phase II / No

    # Precomputed SHAP explanations cache
    shap_positive_factors = Column(JSON, nullable=True)
    shap_negative_factors = Column(JSON, nullable=True)
    explanation_summary = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

class RecommendationLog(Base):
    __tablename__ = "recommendation_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    energy_type = Column(String(50), nullable=False)
    region = Column(String(50), nullable=True)
    state = Column(String(100), nullable=True)
    priorities = Column(JSON, nullable=False)
    recommended_site_ids = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
