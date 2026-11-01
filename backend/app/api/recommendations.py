from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.database.session import get_db
from backend.app.schemas.recommendation import (
    RecommendationRequest,
    RecommendationResponse
)
from backend.app.services.recommendation_service import recommendation_service

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])

@router.post("", response_model=RecommendationResponse)
def generate_recommendations(
    request: RecommendationRequest,
    db: Session = Depends(get_db)
):
    """
    Executes the multi-attribute recommendation engine across candidate sites in India,
    synthesizing machine learning suitability predictions with custom user priorities.
    """
    return recommendation_service.generate_recommendations(db, request)

@router.post("/analyze", response_model=RecommendationResponse)
def analyze_deep_dive(
    request: RecommendationRequest,
    db: Session = Depends(get_db)
):
    """
    Performs comprehensive multi-criteria deep dive analysis.
    """
    return recommendation_service.generate_recommendations(db, request)
