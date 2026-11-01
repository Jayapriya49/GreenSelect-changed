from sqlalchemy import Column, Integer, Float, String, DateTime
from datetime import datetime
from backend.app.database.base import Base

class MNRESolarPark(Base):
    __tablename__ = "mnre_solar_parks"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    park_code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(200), nullable=False)
    state = Column(String(100), index=True, nullable=False)
    district = Column(String(100), index=True, nullable=False)
    region = Column(String(50), index=True, nullable=False)
    latitude = Column(Float, nullable=False, index=True)
    longitude = Column(Float, nullable=False, index=True)
    energy_type = Column(String(50), index=True, nullable=False)
    sanctioned_capacity_mw = Column(Float, nullable=False)
    operational_capacity_mw = Column(Float, nullable=False)
    status = Column(String(100), index=True, nullable=False)
    implementing_agency = Column(String(250), nullable=False)
    scheme_mode = Column(String(100), nullable=True)
    land_area_acres = Column(Float, nullable=True)
    grid_substation = Column(String(250), nullable=False)
    commissioning_year = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class MNREStatePotential(Base):
    __tablename__ = "mnre_state_potentials"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    state = Column(String(100), unique=True, index=True, nullable=False)
    region = Column(String(50), index=True, nullable=False)
    solar_potential_gw = Column(Float, nullable=False)
    wind_potential_120m_gw = Column(Float, nullable=False)
    small_hydro_potential_gw = Column(Float, nullable=False)
    biomass_potential_gw = Column(Float, nullable=False)
    total_potential_gw = Column(Float, nullable=False)
    installed_solar_mw = Column(Float, nullable=False)
    installed_wind_mw = Column(Float, nullable=False)
    total_installed_mw = Column(Float, nullable=False)
    target_2030_mw = Column(Float, nullable=False)
    achievement_pct = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
