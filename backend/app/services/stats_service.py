from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from backend.app.models.site import CandidateSite
from backend.app.schemas.statistics import (
    NationalStatsResponse,
    StateStatItem,
    EnergyTypeStatItem
)

class StatsService:
    @staticmethod
    def get_national_statistics(db: Session) -> NationalStatsResponse:
        total_sites = db.query(CandidateSite).count()
        if total_sites == 0:
            return NationalStatsResponse(
                total_candidate_sites=0,
                total_analyzed_area_sqkm=0.0,
                high_suitability_zones_count=0,
                total_estimated_capacity_gw=0.0,
                total_annual_generation_twh=0.0,
                total_annual_co2_offset_m_tonnes=0.0,
                energy_type_distribution=[],
                top_states=[],
                regional_breakdown={},
                avg_solar_ghi=0.0,
                avg_wind_speed_50m=0.0,
                data_source_summary={}
            )

        # High suitability zones (score >= 80.0)
        high_suitability_count = db.query(CandidateSite).filter(CandidateSite.ml_suitability_score >= 80.0).count()

        # Aggregated capacities
        totals = db.query(
            func.sum(CandidateSite.estimated_capacity_mw).label("total_mw"),
            func.sum(CandidateSite.annual_energy_potential_gwh).label("total_gwh"),
            func.sum(CandidateSite.co2_offset_tonnes_year).label("total_co2"),
            func.avg(CandidateSite.solar_ghi).label("avg_ghi"),
            func.avg(CandidateSite.wind_speed_50m).label("avg_wind")
        ).first()

        total_gw = round((totals.total_mw or 0.0) / 1000.0, 2)
        total_twh = round((totals.total_gwh or 0.0) / 1000.0, 2)
        total_co2_m_tonnes = round((totals.total_co2 or 0.0) / 1_000_000.0, 2)
        avg_ghi = round(float(totals.avg_ghi or 0.0), 2)
        avg_wind = round(float(totals.avg_wind or 0.0), 2)

        # Approx analyzed area: 25 km² per candidate zone grid cluster
        analyzed_sqkm = round(total_sites * 185.0, 1)

        # Energy type breakdown
        energy_groups = db.query(
            CandidateSite.energy_type,
            func.count(CandidateSite.id).label("count"),
            func.avg(CandidateSite.ml_suitability_score).label("avg_score"),
            func.sum(CandidateSite.estimated_capacity_mw).label("sum_mw"),
            func.sum(CandidateSite.annual_energy_potential_gwh).label("sum_gwh")
        ).group_by(CandidateSite.energy_type).all()

        energy_dist = [
            EnergyTypeStatItem(
                energy_type=eg[0],
                count=eg[1],
                avg_suitability=round(float(eg[2]), 1),
                total_capacity_mw=round(float(eg[3] or 0.0), 1),
                annual_generation_gwh=round(float(eg[4] or 0.0), 1)
            )
            for eg in energy_groups
        ]

        # State-level breakdown
        state_groups = db.query(
            CandidateSite.state,
            CandidateSite.region,
            func.count(CandidateSite.id).label("cnt"),
            func.avg(CandidateSite.ml_suitability_score).label("avg_s"),
            func.avg(CandidateSite.solar_ghi).label("avg_g"),
            func.avg(CandidateSite.wind_speed_50m).label("avg_w"),
            func.sum(CandidateSite.estimated_capacity_mw).label("sum_mw")
        ).group_by(CandidateSite.state, CandidateSite.region).order_by(desc("cnt")).all()

        top_states = [
            StateStatItem(
                state=sg[0],
                region=sg[1],
                total_sites=sg[2],
                avg_suitability=round(float(sg[3]), 1),
                avg_solar_ghi=round(float(sg[4]), 2),
                avg_wind_speed=round(float(sg[5]), 2),
                total_potential_mw=round(float(sg[6] or 0.0), 1),
                top_energy_type="Solar" if "Rajasthan" in sg[0] or "Karnataka" in sg[0] else ("Wind" if "Tamil Nadu" in sg[0] else "Hybrid")
            )
            for sg in state_groups
        ]

        # Regional counts
        region_groups = db.query(
            CandidateSite.region,
            func.count(CandidateSite.id)
        ).group_by(CandidateSite.region).all()
        regional_breakdown = {rg[0]: rg[1] for rg in region_groups}

        data_sources = {
            "Solar Resource": "NASA POWER Climatology (ALLSKY_SFC_SW_DWN, ALLSKY_SFC_SW_DNI)",
            "Wind Resource": "NASA POWER Climatology (WS50M, WS10M, Wind Power Density)",
            "Government Benchmarks": "Ministry of New and Renewable Energy (MNRE) Ultra Mega Solar Parks Scheme",
            "State Potentials": "National Institute of Solar Energy (NISE) & National Institute of Wind Energy (NIWE)",
            "Elevation & Slope": "NASA / USGS SRTM Digital Elevation Model (30m resolution)",
            "Infrastructure & Roads": "OpenStreetMap India Highway & Substation Overpass Network",
            "Environmental Constraints": "Protected Planet WDPA & MoEFCC Protected Reserve Zones",
            "Model Architecture": "Ensemble Gradient Boosting (XGBoost / Random Forest) + SHAP TreeExplainer"
        }

        return NationalStatsResponse(
            total_candidate_sites=total_sites,
            total_analyzed_area_sqkm=analyzed_sqkm,
            high_suitability_zones_count=high_suitability_count,
            total_estimated_capacity_gw=total_gw,
            total_annual_generation_twh=total_twh,
            total_annual_co2_offset_m_tonnes=total_co2_m_tonnes,
            energy_type_distribution=energy_dist,
            top_states=top_states,
            regional_breakdown=regional_breakdown,
            avg_solar_ghi=avg_ghi,
            avg_wind_speed_50m=avg_wind,
            data_source_summary=data_sources
        )

stats_service = StatsService()
