import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from backend.app.models.site import CandidateSite, RecommendationLog
from backend.app.schemas.recommendation import (
    RecommendationRequest,
    RecommendationResponse,
    RecommendationResultItem
)
from backend.app.schemas.site import CandidateSiteResponse

class RecommendationService:
    @staticmethod
    def generate_recommendations(db: Session, req: RecommendationRequest) -> RecommendationResponse:
        query = db.query(CandidateSite)

        # Filter by energy type
        if req.energy_type and req.energy_type.lower() != "all":
            query = query.filter(func.lower(CandidateSite.energy_type) == req.energy_type.lower())

        # Filter by region
        if req.region and req.region.lower() not in ["all", "all india"]:
            query = query.filter(func.lower(CandidateSite.region) == req.region.lower())

        # Filter by state
        if req.state and req.state.lower() not in ["all", "all india"]:
            query = query.filter(func.lower(CandidateSite.state) == req.state.lower())

        # Threshold
        if req.min_suitability_threshold:
            query = query.filter(CandidateSite.ml_suitability_score >= req.min_suitability_threshold)

        candidates = query.all()
        if not candidates:
            return RecommendationResponse(
                energy_type=req.energy_type,
                region=req.region,
                state=req.state,
                total_evaluated_sites=0,
                results=[],
                methodology_note="No candidate sites matched the specified geographic and constraint criteria."
            )

        # Normalize priority weights
        p = req.priorities
        total_p_weight = (
            p.energy_potential +
            p.grid_accessibility +
            p.environmental_sustainability +
            p.land_suitability +
            p.economic_feasibility
        ) or 1.0

        w_energy = p.energy_potential / total_p_weight
        w_grid = p.grid_accessibility / total_p_weight
        w_env = p.environmental_sustainability / total_p_weight
        w_land = p.land_suitability / total_p_weight
        w_econ = p.economic_feasibility / total_p_weight

        ranked_items = []

        for site in candidates:
            # 1. Energy Sub-Score
            if site.energy_type.lower() == "solar":
                energy_score = np.clip((site.solar_ghi - 3.5) / (6.8 - 3.5), 0.0, 1.0) * 100.0
            elif site.energy_type.lower() == "wind":
                energy_score = (
                    np.clip((site.wind_speed_50m - 4.0) / (8.5 - 4.0), 0.0, 1.0) * 70.0 +
                    np.clip((site.wind_power_density - 100.0) / (450.0 - 100.0), 0.0, 1.0) * 30.0
                )
            else: # Hybrid
                sol = np.clip((site.solar_ghi - 3.5) / (6.8 - 3.5), 0.0, 1.0) * 50.0
                wnd = np.clip((site.wind_speed_50m - 4.0) / (8.5 - 4.0), 0.0, 1.0) * 50.0
                energy_score = sol + wnd

            # 2. Grid Sub-Score
            grid_score = np.clip(100.0 - (site.distance_to_grid_km / 45.0) * 100.0, 0.0, 100.0)

            # 3. Environmental Sub-Score
            env_score = np.clip(100.0 - site.environmental_penalty, 0.0, 100.0)

            # 4. Land Sub-Score
            land_score = site.land_suitability_score

            # 5. Economic / Civil Engineering Sub-Score (Road + Slope)
            road_comp = np.clip(100.0 - (site.distance_to_road_km / 25.0) * 100.0, 0.0, 100.0)
            slope_comp = np.clip(100.0 - (site.slope_deg / 12.0) * 100.0, 0.0, 100.0)
            econ_score = 0.5 * road_comp + 0.5 * slope_comp

            # Composite Multi-Attribute Score (combining user priority weighting with ML baseline)
            preference_weighted_score = (
                w_energy * energy_score +
                w_grid * grid_score +
                w_env * env_score +
                w_land * land_score +
                w_econ * econ_score
            )

            composite_score = round(0.35 * site.ml_suitability_score + 0.65 * preference_weighted_score, 1)

            # Extract key positive and negative factors
            pos_factors = site.shap_positive_factors or []
            neg_factors = site.shap_negative_factors or []

            # Verdict string
            if composite_score >= 88.0:
                verdict = "Top-tier prime candidate with exceptional resource yield and minimal siting risk."
            elif composite_score >= 78.0:
                verdict = "Highly viable site with strong techno-economic fundamentals."
            elif composite_score >= 65.0:
                verdict = "Moderately suitable site; may require moderate grid or civil infrastructure investment."
            else:
                verdict = "Viable with operational constraints."

            site_resp = CandidateSiteResponse.model_validate(site)

            ranked_items.append({
                "site": site_resp,
                "composite_recommendation_score": composite_score,
                "ml_suitability_score": site.ml_suitability_score,
                "energy_score": round(energy_score, 1),
                "grid_score": round(grid_score, 1),
                "environmental_score": round(env_score, 1),
                "land_score": round(land_score, 1),
                "economic_score": round(econ_score, 1),
                "top_positive_factors": pos_factors[:3],
                "top_negative_factors": neg_factors[:2],
                "recommendation_verdict": verdict
            })

        # Rank sites by composite score
        ranked_items.sort(key=lambda x: x["composite_recommendation_score"], reverse=True)
        top_results = ranked_items[:req.top_n]

        # Assign ranks
        results = [
            RecommendationResultItem(
                rank=idx + 1,
                **item
            )
            for idx, item in enumerate(top_results)
        ]

        # Log recommendation
        try:
            log_entry = RecommendationLog(
                energy_type=req.energy_type,
                region=req.region,
                state=req.state,
                priorities=req.priorities.model_dump(),
                recommended_site_ids=[r.site.id for r in results]
            )
            db.add(log_entry)
            db.commit()
        except Exception:
            db.rollback()

        return RecommendationResponse(
            energy_type=req.energy_type,
            region=req.region,
            state=req.state,
            total_evaluated_sites=len(candidates),
            results=results,
            methodology_note="Ranked using Multi-Attribute Preference Decision Matrix synthesized with Machine Learning Suitability Predictions."
        )

recommendation_service = RecommendationService()
