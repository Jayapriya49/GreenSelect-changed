import json
import logging
import pandas as pd
import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.app.database.base import Base
from backend.app.database.session import engine, SessionLocal
from backend.app.models.site import CandidateSite
from backend.app.models.mnre import MNRESolarPark, MNREStatePotential
from backend.app.config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("renewai.seed")

def seed_database():
    logger.info("Initializing and recreating database tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # 1. Seed MNRE Official Solar Parks
        solar_parks_file = settings.RAW_DATA_DIR / "mnre_solar_parks.json"
        if solar_parks_file.exists():
            logger.info(f"Loading MNRE Solar Parks from {solar_parks_file}...")
            with open(solar_parks_file, "r", encoding="utf-8") as f:
                parks_data = json.load(f).get("parks", [])

            db.query(MNRESolarPark).delete()
            db.commit()

            parks_to_add = []
            for p in parks_data:
                park = MNRESolarPark(
                    park_code=p["park_code"],
                    name=p["name"],
                    state=p["state"],
                    district=p["district"],
                    region=p["region"],
                    latitude=float(p["latitude"]),
                    longitude=float(p["longitude"]),
                    energy_type=p["energy_type"],
                    sanctioned_capacity_mw=float(p["sanctioned_capacity_mw"]),
                    operational_capacity_mw=float(p["operational_capacity_mw"]),
                    status=p["status"],
                    implementing_agency=p["implementing_agency"],
                    scheme_mode=p.get("scheme_mode"),
                    land_area_acres=float(p["land_area_acres"]) if p.get("land_area_acres") else None,
                    grid_substation=p["grid_substation"],
                    commissioning_year=int(p["commissioning_year"]) if p.get("commissioning_year") else None
                )
                parks_to_add.append(park)

            db.bulk_save_objects(parks_to_add)
            db.commit()
            logger.info(f"Seeded {len(parks_to_add)} official MNRE Solar & Renewable Parks.")

        # 2. Seed MNRE State Potentials
        potential_file = settings.RAW_DATA_DIR / "mnre_state_potential.json"
        if potential_file.exists():
            logger.info(f"Loading MNRE State Potential data from {potential_file}...")
            with open(potential_file, "r", encoding="utf-8") as f:
                states_data = json.load(f).get("states", [])

            db.query(MNREStatePotential).delete()
            db.commit()

            states_to_add = []
            for s in states_data:
                st = MNREStatePotential(
                    state=s["state"],
                    region=s["region"],
                    solar_potential_gw=float(s["solar_potential_gw"]),
                    wind_potential_120m_gw=float(s["wind_potential_120m_gw"]),
                    small_hydro_potential_gw=float(s["small_hydro_potential_gw"]),
                    biomass_potential_gw=float(s["biomass_potential_gw"]),
                    total_potential_gw=float(s["total_potential_gw"]),
                    installed_solar_mw=float(s["installed_solar_mw"]),
                    installed_wind_mw=float(s["installed_wind_mw"]),
                    total_installed_mw=float(s["total_installed_mw"]),
                    target_2030_mw=float(s["target_2030_mw"]),
                    achievement_pct=float(s["achievement_pct"])
                )
                states_to_add.append(st)

            db.bulk_save_objects(states_to_add)
            db.commit()
            logger.info(f"Seeded {len(states_to_add)} MNRE State Potential records.")

        # 3. Seed Candidate Sites
        csv_path = settings.PROCESSED_DATA_PATH
        if not csv_path.exists():
            logger.error(f"Candidate dataset not found at {csv_path}. Please run `scripts/generate_candidates.py` first.")
            return

        logger.info(f"Loading candidate sites from {csv_path}...")
        df = pd.read_csv(csv_path)

        deleted_count = db.query(CandidateSite).delete()
        if deleted_count > 0:
            logger.info(f"Cleared {deleted_count} existing candidate sites from database.")
        db.commit()

        sites_to_add = []
        for _, row in df.iterrows():
            pos_factors = []
            neg_factors = []
            if pd.notna(row.get("shap_positive_factors")):
                try:
                    pos_factors = json.loads(row["shap_positive_factors"])
                except Exception:
                    pos_factors = []
            if pd.notna(row.get("shap_negative_factors")):
                try:
                    neg_factors = json.loads(row["shap_negative_factors"])
                except Exception:
                    neg_factors = []

            site = CandidateSite(
                site_code=str(row["site_code"]),
                name=str(row["name"]),
                state=str(row["state"]),
                district=str(row["district"]),
                region=str(row["region"]),
                latitude=float(row["latitude"]),
                longitude=float(row["longitude"]),
                energy_type=str(row["energy_type"]),
                solar_ghi=float(row["solar_ghi"]),
                solar_dni=float(row["solar_dni"]),
                solar_pvout=float(row["solar_pvout"]),
                temperature_avg=float(row["temperature_avg"]),
                wind_speed_10m=float(row["wind_speed_10m"]),
                wind_speed_50m=float(row["wind_speed_50m"]),
                wind_power_density=float(row["wind_power_density"]),
                elevation_m=float(row["elevation_m"]),
                slope_deg=float(row["slope_deg"]),
                terrain_type=str(row["terrain_type"]),
                distance_to_grid_km=float(row["distance_to_grid_km"]),
                distance_to_substation_km=float(row["distance_to_substation_km"]),
                distance_to_road_km=float(row["distance_to_road_km"]),
                road_type=str(row["road_type"]),
                land_cover_class=str(row["land_cover_class"]),
                land_suitability_score=float(row["land_suitability_score"]),
                environmental_penalty=float(row["environmental_penalty"]),
                nearest_protected_area=str(row["nearest_protected_area"]) if pd.notna(row.get("nearest_protected_area")) else None,
                distance_to_protected_area_km=float(row["distance_to_protected_area_km"]),
                nearest_mnre_park=str(row["nearest_mnre_park"]) if pd.notna(row.get("nearest_mnre_park")) else None,
                distance_to_mnre_park_km=float(row["distance_to_mnre_park_km"]) if pd.notna(row.get("distance_to_mnre_park_km")) else None,
                in_mnre_green_corridor=str(row["in_mnre_green_corridor"]) if pd.notna(row.get("in_mnre_green_corridor")) else "No",
                ml_suitability_score=float(row["ml_suitability_score"]),
                suitability_tier=str(row["suitability_tier"]),
                estimated_capacity_mw=float(row["estimated_capacity_mw"]),
                annual_energy_potential_gwh=float(row["annual_energy_potential_gwh"]),
                lcoe_inr_kwh=float(row["lcoe_inr_kwh"]),
                co2_offset_tonnes_year=float(row["co2_offset_tonnes_year"]),
                shap_positive_factors=pos_factors,
                shap_negative_factors=neg_factors,
                explanation_summary=str(row["explanation_summary"]) if pd.notna(row.get("explanation_summary")) else None
            )
            sites_to_add.append(site)

        db.bulk_save_objects(sites_to_add)
        db.commit()
        logger.info(f"Successfully seeded database with {len(sites_to_add)} candidate sites.")

    except Exception as e:
        db.rollback()
        logger.error(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
