from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class SHAPFactor(BaseModel):
    feature_name: str
    display_name: str
    feature_value: Any
    unit: str
    shap_value: float
    percentage_impact: float
    direction: str # "positive" or "negative"
    explanation: str

class SiteExplanationResponse(BaseModel):
    site_id: int
    site_code: str
    name: str
    energy_type: str
    predicted_suitability_score: float
    base_value: float
    positive_factors: List[SHAPFactor]
    negative_factors: List[SHAPFactor]
    natural_language_explanation: str
    methodology: str

class GlobalFeatureImportance(BaseModel):
    feature_name: str
    display_name: str
    mean_abs_shap: float
    importance_rank: int
    category: str # "Resource", "Terrain", "Infrastructure", "Environment"
