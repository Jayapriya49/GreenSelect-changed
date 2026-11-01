from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from backend.app.database.session import get_db
from backend.app.schemas.statistics import NationalStatsResponse
from backend.app.services.stats_service import stats_service
from backend.app.services.site_service import site_service

router = APIRouter(tags=["Statistics & Metadata"])

@router.get("/statistics", response_model=NationalStatsResponse)
def get_national_statistics(db: Session = Depends(get_db)):
    """
    Returns real aggregated statistics, total analyzed area, estimated GW capacity,
    energy mix distributions, and regional breakdowns across India.
    """
    return stats_service.get_national_statistics(db)

@router.get("/states", response_model=List[dict])
def list_states(db: Session = Depends(get_db)):
    """
    Returns a list of all states with candidate sites, regional mapping, and average suitability scores.
    """
    return site_service.get_all_states(db)
