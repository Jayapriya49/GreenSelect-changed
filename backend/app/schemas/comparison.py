from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from .site import CandidateSiteResponse

class SiteComparisonRequest(BaseModel):
    site_ids: List[int] = Field(..., min_length=2, max_length=3)

class ParameterComparisonRow(BaseModel):
    parameter: str
    category: str
    unit: str
    values: Dict[int, Any] # site_id -> value
    best_site_id: Optional[int] = None
    interpretation: str

class SiteComparisonResponse(BaseModel):
    sites: List[CandidateSiteResponse]
    comparison_table: List[ParameterComparisonRow]
    radar_metrics: List[Dict[str, Any]] # e.g. [{"metric": "Solar Potential", "site_1": 92, "site_2": 85, "site_3": 78}]
    recommended_winner_site_id: int
    winner_rationale: str
