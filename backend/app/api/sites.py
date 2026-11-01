from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from backend.app.database.session import get_db
from backend.app.schemas.site import (
    CandidateSiteResponse,
    CandidateSiteSummary,
    SiteFilterParams,
    NearbyQueryParams
)
from backend.app.schemas.explanation import SiteExplanationResponse
from backend.app.services.site_service import site_service
from backend.app.services.explain_service import explain_service

router = APIRouter(prefix="/sites", tags=["Sites"])

@router.get("", response_model=dict)
def list_sites(
    energy_type: Optional[str] = Query(None, description="Solar, Wind, Hybrid, or All"),
    region: Optional[str] = Query(None, description="North, South, East, West, Central, Northeast"),
    state: Optional[str] = Query(None, description="Indian State name"),
    min_suitability: Optional[float] = Query(None, description="Minimum ML suitability score (e.g. 70, 80, 90)"),
    max_grid_distance: Optional[float] = Query(None, description="Max distance to grid in km"),
    max_slope: Optional[float] = Query(None, description="Max terrain slope in degrees"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """
    Retrieves candidate renewable energy sites across India with real-time geospatial and techno-economic filtering.
    """
    filters = SiteFilterParams(
        energy_type=energy_type,
        region=region,
        state=state,
        min_suitability=min_suitability,
        max_grid_distance=max_grid_distance,
        max_slope=max_slope,
        limit=limit,
        offset=offset
    )
    sites, total = site_service.get_sites(db, filters)
    
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "sites": [CandidateSiteResponse.model_validate(s) for s in sites]
    }

@router.get("/nearby", response_model=List[dict])
def get_nearby_sites(
    latitude: float = Query(..., description="Target point latitude"),
    longitude: float = Query(..., description="Target point longitude"),
    radius_km: float = Query(150.0, ge=1.0, le=1000.0, description="Radial search distance in km"),
    energy_type: Optional[str] = Query(None, description="Solar, Wind, Hybrid, or All"),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """
    Finds candidate sites within a geodesic radius (km) from a target point.
    """
    params = NearbyQueryParams(
        latitude=latitude,
        longitude=longitude,
        radius_km=radius_km,
        energy_type=energy_type,
        limit=limit
    )
    results = site_service.get_nearby_sites(db, params)
    return [
        {
            "site": CandidateSiteResponse.model_validate(r["site"]),
            "distance_km": r["distance_km"]
        }
        for r in results
    ]

@router.get("/{site_id}", response_model=CandidateSiteResponse)
def get_site_details(site_id: int, db: Session = Depends(get_db)):
    """
    Retrieves full techno-economic, GIS, and environmental details for a candidate site.
    """
    site = site_service.get_site_by_id(db, site_id)
    if not site:
        raise HTTPException(status_code=404, detail=f"Candidate site with ID {site_id} not found.")
    return CandidateSiteResponse.model_validate(site)

@router.get("/{site_id}/explanation", response_model=SiteExplanationResponse)
def get_site_explanation(site_id: int, db: Session = Depends(get_db)):
    """
    Returns real SHAP TreeExplainer attribution factors and natural language interpretation for the site.
    """
    return explain_service.get_site_explanation(db, site_id)

@router.get("/{site_id}/features", response_model=dict)
def get_site_features(site_id: int, db: Session = Depends(get_db)):
    """
    Returns normalized and raw feature vector for the candidate site.
    """
    site = site_service.get_site_by_id(db, site_id)
    if not site:
        raise HTTPException(status_code=404, detail=f"Candidate site with ID {site_id} not found.")
    
    return {
        "site_id": site.id,
        "site_code": site.site_code,
        "energy_type": site.energy_type,
        "raw_features": {
            "solar_ghi": site.solar_ghi,
            "solar_dni": site.solar_dni,
            "wind_speed_50m": site.wind_speed_50m,
            "wind_power_density": site.wind_power_density,
            "elevation_m": site.elevation_m,
            "slope_deg": site.slope_deg,
            "distance_to_grid_km": site.distance_to_grid_km,
            "distance_to_road_km": site.distance_to_road_km,
            "land_suitability_score": site.land_suitability_score,
            "environmental_penalty": site.environmental_penalty,
            "temperature_avg": site.temperature_avg
        },
        "suitability_score": site.ml_suitability_score,
        "suitability_tier": site.suitability_tier
    }
