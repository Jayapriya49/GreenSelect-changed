from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.database.session import get_db
from backend.app.schemas.comparison import (
    SiteComparisonRequest,
    SiteComparisonResponse
)
from backend.app.services.comparison_service import comparison_service

router = APIRouter(prefix="/compare", tags=["Site Comparison"])

@router.post("", response_model=SiteComparisonResponse)
def compare_candidate_sites(
    request: SiteComparisonRequest,
    db: Session = Depends(get_db)
):
    """
    Compares 2 to 3 candidate sites across all techno-economic, GIS, and risk dimensions,
    generating radar metrics and an algorithmic winner determination.
    """
    return comparison_service.compare_sites(db, request)
