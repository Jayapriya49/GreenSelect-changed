from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from typing import List

from backend.app.database.session import get_db
from backend.app.schemas.cost import (
    CostEstimationRequest,
    CostEstimationResponse,
    CostAssumptionItem,
    CostAssumptionUpdateRequest,
    CostComparisonRequest,
    CostComparisonResponse
)
from backend.app.services.cost_service import cost_service

router = APIRouter(prefix="/cost-estimator", tags=["Infrastructure Cost Estimator"])

@router.post("/estimate", response_model=CostEstimationResponse)
def estimate_setup_cost(
    request: CostEstimationRequest,
    db: Session = Depends(get_db)
):
    """
    Calculates detailed itemized CAPEX setup costs for Solar, Wind, or Hybrid renewable plants.
    Takes into account grid distance, road logistics, and terrain slope.
    """
    return cost_service.calculate_cost(db=db, request=request)

@router.get("/assumptions", response_model=List[CostAssumptionItem])
def get_cost_assumptions(
    db: Session = Depends(get_db)
):
    """
    Retrieves all configurable benchmark cost assumptions stored in database.
    """
    return cost_service.get_all_assumptions(db=db)

@router.put("/assumptions", response_model=List[CostAssumptionItem])
def update_cost_assumptions(
    request: CostAssumptionUpdateRequest,
    db: Session = Depends(get_db)
):
    """
    Updates configurable benchmark cost assumptions in the database.
    """
    return cost_service.update_assumptions(db=db, updates=request.assumptions)

@router.post("/assumptions/reset", response_model=List[CostAssumptionItem])
def reset_cost_assumptions(
    db: Session = Depends(get_db)
):
    """
    Resets all benchmark cost assumptions back to Indian sector standard defaults.
    """
    return cost_service.reset_assumptions(db=db)

@router.post("/compare", response_model=CostComparisonResponse)
def compare_setup_costs(
    request: CostComparisonRequest,
    db: Session = Depends(get_db)
):
    """
    Compares setup costs across different locations, energy types (Solar vs Wind vs Hybrid),
    or installed capacity tiers (e.g. 25MW vs 50MW vs 100MW).
    """
    return cost_service.compare_costs(
        db=db,
        mode=request.mode,
        base_request=request.base_request,
        comparison_site_ids=request.comparison_site_ids,
        comparison_capacities=request.comparison_capacities
    )

@router.post("/report/pdf")
def download_pdf_report(
    request: CostEstimationRequest,
    db: Session = Depends(get_db)
):
    """
    Generates and returns an executive downloadable PDF report of the setup cost estimation.
    """
    est = cost_service.calculate_cost(db=db, request=request)
    pdf_bytes = cost_service.generate_pdf_report(est)
    
    filename = f"GreenSelect_Cost_Estimate_{est.location_name.replace(' ', '_')}_{est.energy_type}.pdf"
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )
