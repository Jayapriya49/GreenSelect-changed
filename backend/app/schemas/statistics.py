from pydantic import BaseModel
from typing import List, Dict, Any

class StateStatItem(BaseModel):
    state: str
    region: str
    total_sites: int
    avg_suitability: float
    avg_solar_ghi: float
    avg_wind_speed: float
    total_potential_mw: float
    top_energy_type: str

class EnergyTypeStatItem(BaseModel):
    energy_type: str
    count: int
    avg_suitability: float
    total_capacity_mw: float
    annual_generation_gwh: float

class NationalStatsResponse(BaseModel):
    total_candidate_sites: int
    total_analyzed_area_sqkm: float
    high_suitability_zones_count: int
    total_estimated_capacity_gw: float
    total_annual_generation_twh: float
    total_annual_co2_offset_m_tonnes: float
    energy_type_distribution: List[EnergyTypeStatItem]
    top_states: List[StateStatItem]
    regional_breakdown: Dict[str, int]
    avg_solar_ghi: float
    avg_wind_speed_50m: float
    data_source_summary: Dict[str, str]
