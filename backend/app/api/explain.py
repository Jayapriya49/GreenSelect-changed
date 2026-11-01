from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from backend.app.database.session import get_db
from backend.app.schemas.explanation import (
    SiteExplanationResponse,
    GlobalFeatureImportance
)
from backend.app.services.explain_service import explain_service

router = APIRouter(prefix="/explain", tags=["Explainable AI"])

@router.get("/global", response_model=List[GlobalFeatureImportance])
def get_global_feature_importance():
    """
    Returns global feature importance rankings across all training data.
    """
    return explain_service.get_global_feature_importances()

@router.get("/{site_id}", response_model=SiteExplanationResponse)
def get_site_shap_explanation(site_id: int, db: Session = Depends(get_db)):
    """
    Computes real Shapley values (TreeSHAP) explaining positive and negative drivers for this specific site.
    """
    return explain_service.get_site_explanation(db, site_id)
