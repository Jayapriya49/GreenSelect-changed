from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from backend.app.database.session import get_db
from backend.app.schemas.mnre import (
    MNRESolarParkResponse,
    MNREStatePotentialResponse,
    MNREBenchmarkData,
    MNRESummaryResponse
)
from backend.app.services.mnre_service import mnre_service

router = APIRouter(prefix="/mnre", tags=["MNRE Dataset"])

@router.get("/summary", response_model=MNRESummaryResponse)
def get_mnre_summary(db: Session = Depends(get_db)):
    """
    Returns high-level national aggregated statistics from the official MNRE / NISE / NIWE datasets.
    """
    return mnre_service.get_summary(db)

@router.get("/solar-parks", response_model=dict)
def list_solar_parks(
    state: Optional[str] = Query(None, description="Filter by Indian State"),
    region: Optional[str] = Query(None, description="North, South, East, West, Central, Northeast"),
    energy_type: Optional[str] = Query(None, description="Solar, Wind, Hybrid, or All"),
    status: Optional[str] = Query(None, description="Fully Operational, Partially Operational, Under Execution, Approved"),
    min_capacity_mw: Optional[float] = Query(None, description="Minimum sanctioned capacity in MW"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """
    Retrieves official MNRE sanctioned Ultra-Mega Solar and Renewable Parks across India.
    """
    parks, total = mnre_service.get_solar_parks(
        db=db,
        state=state,
        region=region,
        energy_type=energy_type,
        status=status,
        min_capacity_mw=min_capacity_mw,
        limit=limit,
        offset=offset
    )
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "parks": [MNRESolarParkResponse.model_validate(p) for p in parks]
    }

@router.get("/solar-parks/{park_id}", response_model=MNRESolarParkResponse)
def get_solar_park_details(park_id: int, db: Session = Depends(get_db)):
    """
    Retrieves detailed specifications for a specific MNRE sanctioned park.
    """
    park = mnre_service.get_solar_park_by_id(db, park_id)
    if not park:
        raise HTTPException(status_code=404, detail=f"MNRE Solar Park with ID {park_id} not found.")
    return MNRESolarParkResponse.model_validate(park)

@router.get("/state-potentials", response_model=List[MNREStatePotentialResponse])
def list_state_potentials(
    region: Optional[str] = Query(None, description="North, South, East, West, Central, Northeast, or All"),
    db: Session = Depends(get_db)
):
    """
    Retrieves authoritative state-level renewable potential estimates (NISE Solar & NIWE Wind at 120m).
    """
    potentials = mnre_service.get_state_potentials(db=db, region=region)
    return [MNREStatePotentialResponse.model_validate(p) for p in potentials]

@router.get("/benchmarks", response_model=MNREBenchmarkData)
def get_mnre_benchmarks():
    """
    Returns official MNRE siting guidelines, land footprint benchmarks, and CUF norms.
    """
    return mnre_service.get_benchmarks()
