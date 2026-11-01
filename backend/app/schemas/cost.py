from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class CostEstimationRequest(BaseModel):
    site_id: Optional[int] = Field(None, description="Candidate site ID if selected from database")
    location_name: str = Field("Selected Location", description="Name of candidate site or location")
    state: str = Field("India", description="State name")
    energy_type: str = Field("Solar", description="Solar, Wind, or Hybrid")
    capacity_mw: float = Field(..., gt=0, le=5000, description="Total installed capacity in MW")
    solar_capacity_mw: Optional[float] = Field(None, ge=0, description="Solar capacity in MW (for Hybrid)")
    wind_capacity_mw: Optional[float] = Field(None, ge=0, description="Wind capacity in MW (for Hybrid)")
    land_requirement_acres: Optional[float] = Field(None, ge=0, description="Land requirement in acres (auto-computed if omitted)")
    distance_to_grid_km: float = Field(..., ge=0, le=500, description="Distance from power grid evacuation substation in km")
    distance_to_road_km: Optional[float] = Field(2.0, ge=0, le=200, description="Distance from nearest paved road in km")
    terrain_type: Optional[str] = Field("Flat Plain", description="Terrain description: Flat Plain, Rolling Terrain, Hilly, Steep Slope")
    slope_deg: Optional[float] = Field(1.5, ge=0, le=90, description="Ground slope in degrees")
    custom_assumptions: Optional[Dict[str, float]] = Field(None, description="Optional custom parameter overrides")

class CostComponentItem(BaseModel):
    name: str
    category: str  # Equipment, Land, Grid, Installation, Civil
    base_unit_rate: float
    unit: str
    quantity: float
    quantity_unit: str
    adjustment_factor: float
    total_cost_inr: float
    total_cost_crores: float
    percentage_of_total: float
    calculation_formula: str
    description: str

class CategoryCostSummary(BaseModel):
    category: str
    total_inr: float
    total_crores: float
    percentage_of_total: float
    components: List[CostComponentItem]

class CostEstimationResponse(BaseModel):
    location_name: str
    state: str
    energy_type: str
    capacity_mw: float
    solar_capacity_mw: Optional[float] = None
    wind_capacity_mw: Optional[float] = None
    land_requirement_acres: float
    distance_to_grid_km: float
    distance_to_road_km: float
    terrain_type: str
    slope_deg: float
    
    # Adjustments
    terrain_adjustment_multiplier: float
    road_distance_adjustment_multiplier: float
    grid_distance_adjustment_multiplier: float
    
    # Category totals
    equipment_cost_crores: float
    equipment_cost_inr: float
    land_development_cost_crores: float
    land_development_cost_inr: float
    grid_connection_cost_crores: float
    grid_connection_cost_inr: float
    installation_cost_crores: float
    installation_cost_inr: float
    civil_infrastructure_cost_crores: float
    civil_infrastructure_cost_inr: float
    
    # Hybrid synergy savings
    shared_synergy_savings_crores: float
    shared_synergy_savings_inr: float
    synergy_details: Optional[Dict[str, Any]] = None
    
    # Grand totals
    total_cost_crores: float
    total_cost_inr: float
    cost_per_mw_crores: float
    
    # Breakdown by category
    categories: List[CategoryCostSummary]
    all_components: List[CostComponentItem]
    
    # Metadata & disclaimer
    assumptions_used: Dict[str, Any]
    currency: str = "INR (₹) & Crores"
    disclaimer: str = (
        "Indicative techno-economic capital expenditure (CAPEX) estimate for preliminary planning. "
        "Actual costs may vary based on market auction tariffs, EPC vendor contracts, currency exchange, "
        "and detailed geotechnical soil investigations."
    )

class CostAssumptionItem(BaseModel):
    id: Optional[int] = None
    parameter_key: str
    parameter_name: str
    energy_type: str
    category: str
    default_value: float
    current_value: float
    unit: str
    description: Optional[str] = None

class CostAssumptionUpdateRequest(BaseModel):
    assumptions: Dict[str, float] = Field(..., description="Dictionary of parameter_key to new current_value")

class CostComparisonRequest(BaseModel):
    mode: str = Field(..., description="'locations' | 'energy_types' | 'capacities'")
    base_request: CostEstimationRequest
    comparison_site_ids: Optional[List[int]] = None
    comparison_capacities: Optional[List[float]] = None

class CostComparisonItem(BaseModel):
    label: str
    energy_type: str
    capacity_mw: float
    location_name: str
    state: str
    equipment_crores: float
    land_crores: float
    grid_crores: float
    installation_crores: float
    civil_crores: float
    total_crores: float
    cost_per_mw_crores: float

class CostComparisonResponse(BaseModel):
    comparison_mode: str
    items: List[CostComparisonItem]
