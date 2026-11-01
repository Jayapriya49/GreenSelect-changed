from sqlalchemy import Column, Integer, Float, String, DateTime, Text, JSON, Boolean
from datetime import datetime
from backend.app.database.base import Base

class CostAssumption(Base):
    __tablename__ = "cost_assumptions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    parameter_key = Column(String(100), unique=True, index=True, nullable=False)
    parameter_name = Column(String(200), nullable=False)
    energy_type = Column(String(50), index=True, nullable=False)  # Solar, Wind, Hybrid, Common
    category = Column(String(100), index=True, nullable=False)    # Equipment, Land, Grid, Installation, Civil, Adjustment
    default_value = Column(Float, nullable=False)
    current_value = Column(Float, nullable=False)
    unit = Column(String(50), nullable=False)                     # INR_per_MW, INR_per_km, INR_per_acre, percentage
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class CostEstimation(Base):
    __tablename__ = "cost_estimations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    site_id = Column(Integer, index=True, nullable=True)
    site_name = Column(String(200), nullable=False)
    state = Column(String(100), nullable=False)
    energy_type = Column(String(50), index=True, nullable=False)  # Solar, Wind, Hybrid
    capacity_mw = Column(Float, nullable=False)
    solar_capacity_mw = Column(Float, nullable=True)
    wind_capacity_mw = Column(Float, nullable=True)
    
    land_requirement_acres = Column(Float, nullable=False)
    grid_distance_km = Column(Float, nullable=False)
    road_distance_km = Column(Float, nullable=False)
    terrain_type = Column(String(100), nullable=False)
    slope_deg = Column(Float, nullable=False)
    
    # Subtotal cost categories (INR)
    equipment_cost_inr = Column(Float, nullable=False)
    land_development_cost_inr = Column(Float, nullable=False)
    grid_connection_cost_inr = Column(Float, nullable=False)
    installation_cost_inr = Column(Float, nullable=False)
    civil_infrastructure_cost_inr = Column(Float, nullable=False)
    shared_synergy_savings_inr = Column(Float, default=0.0)
    
    # Grand totals
    total_cost_inr = Column(Float, nullable=False)
    total_cost_crores = Column(Float, nullable=False)
    cost_per_mw_crores = Column(Float, nullable=False)
    
    cost_breakdown = Column(JSON, nullable=False)
    assumptions_snapshot = Column(JSON, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
