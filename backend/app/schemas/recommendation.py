from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from .site import CandidateSiteResponse

class PriorityWeights(BaseModel):
    energy_potential: float = Field(default=0.35, ge=0.0, le=1.0)
    grid_accessibility: float = Field(default=0.25, ge=0.0, le=1.0)
    environmental_sustainability: float = Field(default=0.15, ge=0.0, le=1.0)
    land_suitability: float = Field(default=0.15, ge=0.0, le=1.0)
    economic_feasibility: float = Field(default=0.10, ge=0.0, le=1.0)

class RecommendationRequest(BaseModel):
    energy_type: str = Field(default="Solar") # Solar, Wind, Hybrid
    region: Optional[str] = None # All India, North, South, East, West, Central, Northeast
    state: Optional[str] = None
    priorities: PriorityWeights = Field(default_factory=PriorityWeights)
    top_n: int = Field(default=10, ge=1, le=50)
    min_suitability_threshold: Optional[float] = Field(default=60.0, ge=0.0, le=100.0)

class RecommendationResultItem(BaseModel):
    rank: int
    site: CandidateSiteResponse
    composite_recommendation_score: float # 0-100
    ml_suitability_score: float
    energy_score: float
    grid_score: float
    environmental_score: float
    land_score: float
    economic_score: float
    top_positive_factors: List[Dict[str, Any]]
    top_negative_factors: List[Dict[str, Any]]
    recommendation_verdict: str

class RecommendationResponse(BaseModel):
    energy_type: str
    region: Optional[str] = None
    state: Optional[str] = None
    total_evaluated_sites: int
    results: List[RecommendationResultItem]
    methodology_note: str
