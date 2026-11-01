from fastapi import APIRouter
from backend.app.ml.model_manager import model_manager

router = APIRouter(prefix="/ml", tags=["Machine Learning Metrics"])

@router.get("/metrics", response_model=dict)
def get_ml_metrics():
    """
    Returns real cross-validation and test set evaluation metrics for the trained suitability model.
    """
    return model_manager.get_metadata()
