from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List

from backend.app.database.session import get_db
from backend.app.schemas.weather import (
    WeatherAnalysisResponse,
    LocationComparisonRequest,
    LocationComparisonResponse
)
from backend.app.services.weather_service import weather_service

router = APIRouter(prefix="/weather", tags=["Weather & Seasonal Analysis"])

@router.get("/historical", response_model=WeatherAnalysisResponse)
async def get_historical_weather(
    latitude: float = Query(..., ge=-90.0, le=90.0, description="Target location latitude"),
    longitude: float = Query(..., ge=-180.0, le=180.0, description="Target location longitude"),
    start_year: int = Query(2018, ge=1990, le=2025, description="Start year"),
    end_year: int = Query(2023, ge=1990, le=2025, description="End year"),
    site_id: Optional[int] = Query(None, description="Candidate site ID if linking from site explorer"),
    location_name: Optional[str] = Query(None, description="Location display name"),
    state: Optional[str] = Query(None, description="State name"),
    db: Session = Depends(get_db)
):
    """
    Retrieves historical monthly and seasonal weather conditions (solar radiation, wind speed,
    temperature, rainfall) from NASA POWER for a given location or candidate site in India.
    Calculates seasonal potential (Winter, Summer, Monsoon, Post-monsoon).
    Uses caching to avoid redundant NASA POWER calls.
    """
    return await weather_service.get_historical_weather(
        db=db,
        latitude=latitude,
        longitude=longitude,
        start_year=start_year,
        end_year=end_year,
        site_id=site_id,
        location_name=location_name,
        state=state
    )

@router.post("/compare", response_model=LocationComparisonResponse)
async def compare_locations(
    request: LocationComparisonRequest,
    db: Session = Depends(get_db)
):
    """
    Compares historical solar radiation, wind speed and seasonal potential
    across two or more candidate sites in India.
    """
    if not request.site_ids or len(request.site_ids) < 2:
        raise HTTPException(status_code=400, detail="Please select at least 2 candidate sites to compare.")
    
    return await weather_service.compare_locations(
        db=db,
        site_ids=request.site_ids,
        start_year=request.start_year,
        end_year=request.end_year
    )

@router.get("/years")
def get_available_years():
    """
    Returns available historical year range for NASA POWER satellite data analysis.
    """
    return {
        "min_year": 2000,
        "max_year": 2024,
        "default_start": 2018,
        "default_end": 2023
    }
