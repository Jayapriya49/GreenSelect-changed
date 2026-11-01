from sqlalchemy.orm import Session
from fastapi import HTTPException
from backend.app.models.site import CandidateSite
from backend.app.schemas.site import CandidateSiteResponse
from backend.app.schemas.comparison import (
    SiteComparisonRequest,
    SiteComparisonResponse,
    ParameterComparisonRow
)

class ComparisonService:
    @staticmethod
    def compare_sites(db: Session, req: SiteComparisonRequest) -> SiteComparisonResponse:
        sites = db.query(CandidateSite).filter(CandidateSite.id.in_(req.site_ids)).all()
        if len(sites) < 2:
            raise HTTPException(status_code=400, detail="Must provide at least 2 valid site IDs for comparison.")

        site_resps = [CandidateSiteResponse.model_validate(s) for s in sites]

        # Build comparison parameters
        rows: list[ParameterComparisonRow] = []

        def add_row(param: str, cat: str, unit: str, key_fn, higher_is_better: bool, interp_fn):
            values = {s.id: key_fn(s) for s in sites}
            if higher_is_better:
                best_id = max(values.keys(), key=lambda k: values[k])
            else:
                best_id = min(values.keys(), key=lambda k: values[k])
            
            rows.append(ParameterComparisonRow(
                parameter=param,
                category=cat,
                unit=unit,
                values=values,
                best_site_id=best_id,
                interpretation=interp_fn(values[best_id])
            ))

        add_row("ML Suitability Score", "Overall", "/100", lambda s: s.ml_suitability_score, True, lambda v: f"Top score: {v}/100")
        add_row("Estimated Capacity", "Techno-Economic", "MW", lambda s: s.estimated_capacity_mw, True, lambda v: f"Max capacity: {v} MW")
        add_row("Annual Generation Potential", "Techno-Economic", "GWh/yr", lambda s: s.annual_energy_potential_gwh, True, lambda v: f"Highest yield: {v} GWh")
        add_row("Estimated LCOE", "Economics", "₹/kWh", lambda s: s.lcoe_inr_kwh, False, lambda v: f"Lowest levelized cost: ₹{v}/kWh")
        add_row("Global Horizontal Irradiance", "Resource", "kWh/m²/day", lambda s: s.solar_ghi, True, lambda v: f"Highest solar flux: {v} kWh/m²/day")
        add_row("Wind Speed at 50m", "Resource", "m/s", lambda s: s.wind_speed_50m, True, lambda v: f"Highest wind velocity: {v} m/s")
        add_row("Grid Distance", "Infrastructure", "km", lambda s: s.distance_to_grid_km, False, lambda v: f"Closest to transmission: {v} km")
        add_row("Road Distance", "Infrastructure", "km", lambda s: s.distance_to_road_km, False, lambda v: f"Closest to highway: {v} km")
        add_row("Terrain Slope", "Civil Engineering", "°", lambda s: s.slope_deg, False, lambda v: f"Flattest terrain: {v}°")
        add_row("Environmental Penalty", "Risk & Ecology", "pts", lambda s: s.environmental_penalty, False, lambda v: f"Lowest ecological risk: {v} pts")
        add_row("CO2 Offset Potential", "Sustainability", "k tonnes/yr", lambda s: round(s.co2_offset_tonnes_year / 1000.0, 1), True, lambda v: f"Highest decarbonization impact: {v}k tonnes/yr")

        # Build Radar Metrics for visual radar chart
        radar_metrics = [
            {"metric": "Overall Suitability", **{f"site_{s.id}": round(s.ml_suitability_score, 1) for s in sites}},
            {"metric": "Solar Resource", **{f"site_{s.id}": round(min(100.0, (s.solar_ghi / 6.5) * 100.0), 1) for s in sites}},
            {"metric": "Wind Resource", **{f"site_{s.id}": round(min(100.0, (s.wind_speed_50m / 8.0) * 100.0), 1) for s in sites}},
            {"metric": "Grid Proximity", **{f"site_{s.id}": round(max(0.0, 100.0 - (s.distance_to_grid_km / 40.0) * 100.0), 1) for s in sites}},
            {"metric": "Road Access", **{f"site_{s.id}": round(max(0.0, 100.0 - (s.distance_to_road_km / 20.0) * 100.0), 1) for s in sites}},
            {"metric": "Terrain Slope", **{f"site_{s.id}": round(max(0.0, 100.0 - (s.slope_deg / 10.0) * 100.0), 1) for s in sites}},
            {"metric": "Eco Safety", **{f"site_{s.id}": round(max(0.0, 100.0 - s.environmental_penalty), 1) for s in sites}},
        ]

        # Determine winner site
        winner = max(sites, key=lambda s: s.ml_suitability_score)
        rationale = (
            f"Site {winner.site_code} ({winner.name}, {winner.state}) is selected as the top candidate "
            f"with an overall suitability score of {winner.ml_suitability_score}/100, offering superior resource potential "
            f"and lower infrastructure interconnection expenditure."
        )

        return SiteComparisonResponse(
            sites=site_resps,
            comparison_table=rows,
            radar_metrics=radar_metrics,
            recommended_winner_site_id=winner.id,
            winner_rationale=rationale
        )

comparison_service = ComparisonService()
