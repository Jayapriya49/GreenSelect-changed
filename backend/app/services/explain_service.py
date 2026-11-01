from sqlalchemy.orm import Session
from fastapi import HTTPException
from typing import Optional
from backend.app.models.site import CandidateSite
from backend.app.schemas.explanation import SiteExplanationResponse, SHAPFactor, GlobalFeatureImportance
from backend.app.ml.explain import shap_engine
from backend.app.ml.feature_engineering import FEATURE_COLUMNS, FEATURE_DISPLAY_NAMES
from backend.app.ml.model_manager import model_manager

class ExplainService:
    @staticmethod
    def get_site_explanation(db: Session, site_id: int) -> SiteExplanationResponse:
        site = db.query(CandidateSite).filter(CandidateSite.id == site_id).first()
        if not site:
            raise HTTPException(status_code=404, detail=f"Site with ID {site_id} not found.")

        # If model is trained, compute fresh live SHAP explanation
        if model_manager.is_model_trained():
            site_features = {
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
                "temperature_avg": site.temperature_avg,
                "energy_type": site.energy_type,
                "state": site.state
            }
            raw_shap = shap_engine.explain_site(site_features)

            pos_factors = [SHAPFactor(**item) for item in raw_shap["positive_factors"]]
            neg_factors = [SHAPFactor(**item) for item in raw_shap["negative_factors"]]

            return SiteExplanationResponse(
                site_id=site.id,
                site_code=site.site_code,
                name=site.name,
                energy_type=site.energy_type,
                predicted_suitability_score=raw_shap["predicted_suitability_score"],
                base_value=raw_shap["base_value"],
                positive_factors=pos_factors,
                negative_factors=neg_factors,
                natural_language_explanation=raw_shap["natural_language_explanation"],
                methodology=raw_shap["methodology"]
            )
        else:
            # Fallback to stored explanations if model file not present
            pos = [SHAPFactor(**f) for f in (site.shap_positive_factors or [])]
            neg = [SHAPFactor(**f) for f in (site.shap_negative_factors or [])]
            return SiteExplanationResponse(
                site_id=site.id,
                site_code=site.site_code,
                name=site.name,
                energy_type=site.energy_type,
                predicted_suitability_score=site.ml_suitability_score,
                base_value=65.0,
                positive_factors=pos,
                negative_factors=neg,
                natural_language_explanation=site.explanation_summary or "High resource yield and proximity to infrastructure.",
                methodology="Precomputed TreeSHAP Feature Attribution"
            )

    @staticmethod
    def get_global_feature_importances() -> list[GlobalFeatureImportance]:
        meta = model_manager.get_metadata()
        importances = meta.get("feature_importances", [])
        
        category_map = {
            "solar_ghi": "Resource",
            "solar_dni": "Resource",
            "wind_speed_50m": "Resource",
            "wind_power_density": "Resource",
            "temperature_avg": "Resource",
            "elevation_m": "Terrain",
            "slope_deg": "Terrain",
            "distance_to_grid_km": "Infrastructure",
            "distance_to_road_km": "Infrastructure",
            "land_suitability_score": "Environment",
            "environmental_penalty": "Environment",
        }

        results = []
        for rank, imp in enumerate(importances, 1):
            results.append(GlobalFeatureImportance(
                feature_name=imp["feature_name"],
                display_name=imp["display_name"],
                mean_abs_shap=imp["importance"],
                importance_rank=rank,
                category=category_map.get(imp["feature_name"], "General")
            ))
        return results

explain_service = ExplainService()
