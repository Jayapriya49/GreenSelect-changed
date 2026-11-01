from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import Optional, List
from backend.app.models.site import CandidateSite
from backend.app.schemas.site import SiteFilterParams, NearbyQueryParams
from backend.app.gis.crs import haversine_distance_km

class SiteService:
    @staticmethod
    def get_sites(db: Session, filters: SiteFilterParams) -> tuple[List[CandidateSite], int]:
        query = db.query(CandidateSite)

        if filters.energy_type and filters.energy_type.lower() != "all":
            query = query.filter(func.lower(CandidateSite.energy_type) == filters.energy_type.lower())

        if filters.region and filters.region.lower() not in ["all", "all india"]:
            query = query.filter(func.lower(CandidateSite.region) == filters.region.lower())

        if filters.state and filters.state.lower() not in ["all", "all india"]:
            query = query.filter(func.lower(CandidateSite.state) == filters.state.lower())

        if filters.min_suitability is not None:
            query = query.filter(CandidateSite.ml_suitability_score >= filters.min_suitability)

        if filters.max_grid_distance is not None:
            query = query.filter(CandidateSite.distance_to_grid_km <= filters.max_grid_distance)

        if filters.max_slope is not None:
            query = query.filter(CandidateSite.slope_deg <= filters.max_slope)

        total = query.count()
        sites = query.order_by(desc(CandidateSite.ml_suitability_score)).offset(filters.offset).limit(filters.limit).all()
        return sites, total

    @staticmethod
    def get_site_by_id(db: Session, site_id: int) -> Optional[CandidateSite]:
        return db.query(CandidateSite).filter(CandidateSite.id == site_id).first()

    @staticmethod
    def get_site_by_code(db: Session, site_code: str) -> Optional[CandidateSite]:
        return db.query(CandidateSite).filter(CandidateSite.site_code == site_code).first()

    @staticmethod
    def get_nearby_sites(db: Session, params: NearbyQueryParams) -> List[dict]:
        query = db.query(CandidateSite)
        if params.energy_type and params.energy_type.lower() != "all":
            query = query.filter(func.lower(CandidateSite.energy_type) == params.energy_type.lower())

        all_sites = query.all()
        nearby = []
        for s in all_sites:
            d = haversine_distance_km(params.latitude, params.longitude, s.latitude, s.longitude)
            if d <= params.radius_km:
                nearby.append({
                    "site": s,
                    "distance_km": d
                })

        nearby.sort(key=lambda x: x["distance_km"])
        return nearby[:params.limit]

    @staticmethod
    def get_all_states(db: Session) -> List[dict]:
        results = db.query(
            CandidateSite.state,
            CandidateSite.region,
            func.count(CandidateSite.id).label("site_count"),
            func.avg(CandidateSite.ml_suitability_score).label("avg_score")
        ).group_by(CandidateSite.state, CandidateSite.region).order_by(desc("site_count")).all()

        return [
            {
                "state": r[0],
                "region": r[1],
                "site_count": r[2],
                "avg_score": round(float(r[3]), 1)
            }
            for r in results
        ]

site_service = SiteService()
