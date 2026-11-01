from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class MNRESolarParkBase(BaseModel):
    park_code: str
    name: str
    state: str
    district: str
    region: str
    latitude: float
    longitude: float
    energy_type: str
    sanctioned_capacity_mw: float
    operational_capacity_mw: float
    status: str
    implementing_agency: str
    scheme_mode: Optional[str] = None
    land_area_acres: Optional[float] = None
    grid_substation: str
    commissioning_year: Optional[int] = None

class MNRESolarParkResponse(MNRESolarParkBase):
    id: int

    class Config:
        from_attributes = True

class MNREStatePotentialBase(BaseModel):
    state: str
    region: str
    solar_potential_gw: float
    wind_potential_120m_gw: float
    small_hydro_potential_gw: float
    biomass_potential_gw: float
    total_potential_gw: float
    installed_solar_mw: float
    installed_wind_mw: float
    total_installed_mw: float
    target_2030_mw: float
    achievement_pct: float

class MNREStatePotentialResponse(MNREStatePotentialBase):
    id: int

    class Config:
        from_attributes = True

class MNREBenchmarkData(BaseModel):
    source: str
    guidelines_title: str
    land_norms: Dict[str, Any]
    cuf_benchmarks_pct: Dict[str, Any]
    green_energy_corridor: Dict[str, Any]
    environmental_clearance_regime: Dict[str, Any]

class MNRESummaryResponse(BaseModel):
    total_sanctioned_parks: int
    total_sanctioned_capacity_gw: float
    total_operational_capacity_gw: float
    total_national_potential_gw: float
    total_installed_re_gw: float
    solar_potential_gw: float
    wind_potential_120m_gw: float
    top_potential_states: List[MNREStatePotentialResponse]
    parks_by_status: Dict[str, int]
    parks_by_region: Dict[str, int]
