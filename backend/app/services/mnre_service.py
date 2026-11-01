import json
import logging
from pathlib import Path
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from backend.app.config import settings
from backend.app.models.mnre import MNRESolarPark, MNREStatePotential
from backend.app.schemas.mnre import (
    MNRESolarParkResponse,
    MNREStatePotentialResponse,
    MNREBenchmarkData,
    MNRESummaryResponse
)
from backend.app.gis.crs import haversine_distance_km

logger = logging.getLogger("renewai.mnre_service")

class MNREService:
    @staticmethod
    def get_solar_parks(
        db: Session,
        state: Optional[str] = None,
        region: Optional[str] = None,
        energy_type: Optional[str] = None,
        status: Optional[str] = None,
        min_capacity_mw: Optional[float] = None,
        limit: int = 100,
        offset: int = 0
    ) -> Tuple[List[MNRESolarPark], int]:
        query = db.query(MNRESolarPark)

        if state:
            query = query.filter(MNRESolarPark.state.ilike(f"%{state}%"))
        if region:
            query = query.filter(MNRESolarPark.region.ilike(f"%{region}%"))
        if energy_type and energy_type.lower() != "all":
            query = query.filter(MNRESolarPark.energy_type.ilike(f"%{energy_type}%"))
        if status and status.lower() != "all":
            query = query.filter(MNRESolarPark.status.ilike(f"%{status}%"))
        if min_capacity_mw is not None:
            query = query.filter(MNRESolarPark.sanctioned_capacity_mw >= min_capacity_mw)

        total = query.count()
        parks = query.order_by(desc(MNRESolarPark.sanctioned_capacity_mw)).offset(offset).limit(limit).all()
        return parks, total

    @staticmethod
    def get_solar_park_by_id(db: Session, park_id: int) -> Optional[MNRESolarPark]:
        return db.query(MNRESolarPark).filter(MNRESolarPark.id == park_id).first()

    @staticmethod
    def get_state_potentials(
        db: Session,
        region: Optional[str] = None
    ) -> List[MNREStatePotential]:
        query = db.query(MNREStatePotential)
        if region and region.lower() != "all":
            query = query.filter(MNREStatePotential.region.ilike(f"%{region}%"))
        return query.order_by(desc(MNREStatePotential.total_potential_gw)).all()

    @staticmethod
    def get_benchmarks() -> MNREBenchmarkData:
        benchmark_file = settings.RAW_DATA_DIR / "mnre_benchmarks.json"
        if benchmark_file.exists():
            with open(benchmark_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                return MNREBenchmarkData(**data)
        
        return MNREBenchmarkData(
            source="MNRE Guidelines",
            guidelines_title="MNRE Siting Benchmarks",
            land_norms={},
            cuf_benchmarks_pct={},
            green_energy_corridor={},
            environmental_clearance_regime={}
        )

    @staticmethod
    def get_summary(db: Session) -> MNRESummaryResponse:
        total_parks = db.query(MNRESolarPark).count()
        total_sanctioned = db.query(func.sum(MNRESolarPark.sanctioned_capacity_mw)).scalar() or 0.0
        total_operational = db.query(func.sum(MNRESolarPark.operational_capacity_mw)).scalar() or 0.0

        potentials = db.query(
            func.sum(MNREStatePotential.total_potential_gw).label("tot_pot"),
            func.sum(MNREStatePotential.solar_potential_gw).label("tot_sol"),
            func.sum(MNREStatePotential.wind_potential_120m_gw).label("tot_wnd"),
            func.sum(MNREStatePotential.total_installed_mw).label("tot_inst")
        ).first()

        total_national_pot = round(float(potentials.tot_pot or 1494.0), 2)
        total_sol_pot = round(float(potentials.tot_sol or 748.98), 2)
        total_wnd_pot = round(float(potentials.tot_wnd or 695.50), 2)
        total_installed_re = round(float(potentials.tot_inst or 147440.0) / 1000.0, 2)

        top_states = db.query(MNREStatePotential).order_by(desc(MNREStatePotential.total_potential_gw)).limit(8).all()

        # Group by status
        status_groups = db.query(
            MNRESolarPark.status,
            func.count(MNRESolarPark.id)
        ).group_by(MNRESolarPark.status).all()
        parks_by_status = {sg[0]: sg[1] for sg in status_groups}

        # Group by region
        region_groups = db.query(
            MNRESolarPark.region,
            func.count(MNRESolarPark.id)
        ).group_by(MNRESolarPark.region).all()
        parks_by_region = {rg[0]: rg[1] for rg in region_groups}

        return MNRESummaryResponse(
            total_sanctioned_parks=total_parks,
            total_sanctioned_capacity_gw=round(total_sanctioned / 1000.0, 2),
            total_operational_capacity_gw=round(total_operational / 1000.0, 2),
            total_national_potential_gw=total_national_pot,
            total_installed_re_gw=total_installed_re,
            solar_potential_gw=total_sol_pot,
            wind_potential_120m_gw=total_wnd_pot,
            top_potential_states=[MNREStatePotentialResponse.model_validate(s) for s in top_states],
            parks_by_status=parks_by_status,
            parks_by_region=parks_by_region
        )

    @staticmethod
    def find_nearest_mnre_park(db: Session, lat: float, lon: float) -> Dict[str, Any]:
        parks = db.query(MNRESolarPark).all()
        if not parks:
            return {
                "nearest_park_name": None,
                "distance_km": None,
                "in_green_corridor": "No"
            }

        min_dist = float("inf")
        nearest = None

        for p in parks:
            d = haversine_distance_km(lat, lon, p.latitude, p.longitude)
            if d < min_dist:
                min_dist = d
                nearest = p

        dist_rounded = round(min_dist, 1)
        in_gec = "Yes (Phase I)" if dist_rounded <= 50.0 else ("Yes (Phase II)" if dist_rounded <= 100.0 else "No")

        return {
            "nearest_park_name": nearest.name if nearest else None,
            "nearest_park_code": nearest.park_code if nearest else None,
            "sanctioned_capacity_mw": nearest.sanctioned_capacity_mw if nearest else None,
            "distance_km": dist_rounded,
            "in_green_corridor": in_gec
        }

mnre_service = MNREService()
