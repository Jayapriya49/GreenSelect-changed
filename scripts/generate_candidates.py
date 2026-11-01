import json
import logging
import math
import random
import pandas as pd
import numpy as np
import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.app.ml.feature_engineering import compute_scientific_surrogate_suitability
from backend.app.gis.buffers import calculate_environmental_penalty, evaluate_land_suitability_class
from backend.app.gis.terrain import classify_terrain
from backend.app.gis.crs import haversine_distance_km

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("renewai.candidates")

BASE_DIR = Path(__file__).resolve().parent.parent
RAW_DIR = BASE_DIR / "data" / "raw"
PROCESSED_DIR = BASE_DIR / "data" / "processed"
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

# Comprehensive regional clusters across India's renewable energy landscape
REGIONAL_CLUSTERS = [
    # --- RAJASTHAN (Premier Solar & Wind Basin) ---
    {
        "state": "Rajasthan", "region": "North", "district": "Jaisalmer",
        "base_name": "Thar Desert Basin", "center_lat": 26.9157, "center_lon": 70.9083,
        "energy_types": ["Solar", "Wind", "Hybrid"], "elevation_m": 220, "slope_deg": 1.2,
        "land_cover": "Sandy Desert / Salt Flat", "base_grid_km": 8.5, "base_road_km": 3.2,
        "protected_area": "Desert National Park", "dist_protected_km": 18.5,
        "solar_ghi": 6.18, "solar_dni": 5.95, "wind_speed_50m": 6.85, "wind_10m": 5.1, "temp": 28.5
    },
    {
        "state": "Rajasthan", "region": "North", "district": "Phalodi",
        "base_name": "Bhadla Solar Corridor", "center_lat": 27.5381, "center_lon": 71.9167,
        "energy_types": ["Solar", "Hybrid"], "elevation_m": 210, "slope_deg": 0.8,
        "land_cover": "Barren / Wasteland", "base_grid_km": 4.2, "base_road_km": 1.8,
        "protected_area": "Tal Chhapar Sanctuary", "dist_protected_km": 42.0,
        "solar_ghi": 6.32, "solar_dni": 6.12, "wind_speed_50m": 5.92, "wind_10m": 4.3, "temp": 29.2
    },
    {
        "state": "Rajasthan", "region": "North", "district": "Bikaner",
        "base_name": "Pugal Renewable Complex", "center_lat": 28.3500, "center_lon": 72.8000,
        "energy_types": ["Solar", "Hybrid"], "elevation_m": 235, "slope_deg": 1.1,
        "land_cover": "Barren / Wasteland", "base_grid_km": 6.1, "base_road_km": 2.5,
        "protected_area": "Gajner Wildlife Sanctuary", "dist_protected_km": 35.0,
        "solar_ghi": 6.05, "solar_dni": 5.80, "wind_speed_50m": 5.75, "wind_10m": 4.2, "temp": 27.8
    },
    {
        "state": "Rajasthan", "region": "North", "district": "Barmer",
        "base_name": "Balotra-Sindhari Renewable Ridge", "center_lat": 25.7500, "center_lon": 71.4000,
        "energy_types": ["Solar", "Wind", "Hybrid"], "elevation_m": 180, "slope_deg": 2.1,
        "land_cover": "Degraded / Scrubland", "base_grid_km": 11.2, "base_road_km": 4.0,
        "protected_area": "Desert National Park", "dist_protected_km": 28.0,
        "solar_ghi": 6.12, "solar_dni": 5.88, "wind_speed_50m": 6.40, "wind_10m": 4.7, "temp": 28.9
    },

    # --- GUJARAT (Premier Hybrid & Offshore-Inland Wind/Solar) ---
    {
        "state": "Gujarat", "region": "West", "district": "Kutch",
        "base_name": "Khavda Hybrid Mega Park", "center_lat": 23.8500, "center_lon": 69.7500,
        "energy_types": ["Hybrid", "Solar", "Wind"], "elevation_m": 45, "slope_deg": 0.5,
        "land_cover": "Sandy Desert / Salt Flat", "base_grid_km": 5.5, "base_road_km": 2.2,
        "protected_area": "Kutch Desert Wildlife Sanctuary", "dist_protected_km": 14.0,
        "solar_ghi": 5.92, "solar_dni": 5.65, "wind_speed_50m": 7.45, "wind_10m": 5.6, "temp": 27.4
    },
    {
        "state": "Gujarat", "region": "West", "district": "Patan",
        "base_name": "Charanka Solar Basin", "center_lat": 23.9056, "center_lon": 71.2000,
        "energy_types": ["Solar"], "elevation_m": 35, "slope_deg": 0.6,
        "land_cover": "Barren / Wasteland", "base_grid_km": 3.8, "base_road_km": 1.5,
        "protected_area": "Wild Ass Sanctuary", "dist_protected_km": 22.0,
        "solar_ghi": 5.85, "solar_dni": 5.50, "wind_speed_50m": 5.60, "wind_10m": 4.1, "temp": 27.9
    },
    {
        "state": "Gujarat", "region": "West", "district": "Rajkot",
        "base_name": "Saurashtra Wind Corridor", "center_lat": 22.3039, "center_lon": 70.8022,
        "energy_types": ["Wind", "Hybrid"], "elevation_m": 135, "slope_deg": 3.2,
        "land_cover": "Degraded / Scrubland", "base_grid_km": 7.2, "base_road_km": 2.8,
        "protected_area": "Hingolgadh Sanctuary", "dist_protected_km": 38.0,
        "solar_ghi": 5.70, "solar_dni": 5.30, "wind_speed_50m": 7.15, "wind_10m": 5.4, "temp": 26.8
    },
    {
        "state": "Gujarat", "region": "West", "district": "Dwarka",
        "base_name": "Okha Coastal Wind Zone", "center_lat": 22.2400, "center_lon": 68.9689,
        "energy_types": ["Wind"], "elevation_m": 25, "slope_deg": 1.4,
        "land_cover": "Open Grassland / Grazing", "base_grid_km": 6.8, "base_road_km": 2.1,
        "protected_area": "Marine National Park", "dist_protected_km": 16.5,
        "solar_ghi": 5.65, "solar_dni": 5.20, "wind_speed_50m": 7.82, "wind_10m": 5.9, "temp": 26.2
    },

    # --- TAMIL NADU (World-Famous Wind & High Solar Belts) ---
    {
        "state": "Tamil Nadu", "region": "South", "district": "Kanyakumari",
        "base_name": "Muppandal Wind Pass", "center_lat": 8.2575, "center_lon": 77.5458,
        "energy_types": ["Wind", "Hybrid"], "elevation_m": 75, "slope_deg": 4.5,
        "land_cover": "Open Grassland / Grazing", "base_grid_km": 3.1, "base_road_km": 1.2,
        "protected_area": "Kanyakumari Wildlife Sanctuary", "dist_protected_km": 15.0,
        "solar_ghi": 5.45, "solar_dni": 4.85, "wind_speed_50m": 8.42, "wind_10m": 6.5, "temp": 27.5
    },
    {
        "state": "Tamil Nadu", "region": "South", "district": "Thoothukudi",
        "base_name": "Kayathar Wind Corridor", "center_lat": 8.9500, "center_lon": 77.7800,
        "energy_types": ["Wind", "Hybrid"], "elevation_m": 85, "slope_deg": 2.8,
        "land_cover": "Agricultural Fallow (Single Crop)", "base_grid_km": 5.2, "base_road_km": 1.9,
        "protected_area": "Gulf of Mannar Marine Park", "dist_protected_km": 26.0,
        "solar_ghi": 5.58, "solar_dni": 5.02, "wind_speed_50m": 7.95, "wind_10m": 6.1, "temp": 28.1
    },
    {
        "state": "Tamil Nadu", "region": "South", "district": "Ramanathapuram",
        "base_name": "Kamuthi Solar Valley", "center_lat": 9.3500, "center_lon": 78.3800,
        "energy_types": ["Solar"], "elevation_m": 40, "slope_deg": 0.7,
        "land_cover": "Barren / Wasteland", "base_grid_km": 4.5, "base_road_km": 1.6,
        "protected_area": "Chitrangudi Bird Sanctuary", "dist_protected_km": 19.0,
        "solar_ghi": 5.82, "solar_dni": 5.35, "wind_speed_50m": 6.10, "wind_10m": 4.5, "temp": 29.0
    },
    {
        "state": "Tamil Nadu", "region": "South", "district": "Coimbatore",
        "base_name": "Palghat Gap Wind Corridor", "center_lat": 10.8500, "center_lon": 76.9500,
        "energy_types": ["Wind"], "elevation_m": 410, "slope_deg": 5.2,
        "land_cover": "Open Grassland / Grazing", "base_grid_km": 6.5, "base_road_km": 2.4,
        "protected_area": "Anamalai Tiger Reserve", "dist_protected_km": 21.0,
        "solar_ghi": 5.30, "solar_dni": 4.70, "wind_speed_50m": 8.15, "wind_10m": 6.3, "temp": 26.5
    },

    # --- KARNATAKA (Pavagada Mega Solar & Deccan Wind Plateau) ---
    {
        "state": "Karnataka", "region": "South", "district": "Tumkur",
        "base_name": "Pavagada Solar Park", "center_lat": 14.1000, "center_lon": 77.2800,
        "energy_types": ["Solar", "Hybrid"], "elevation_m": 650, "slope_deg": 1.4,
        "land_cover": "Barren / Wasteland", "base_grid_km": 3.5, "base_road_km": 1.5,
        "protected_area": "Jaymangali Blackbuck Reserve", "dist_protected_km": 25.0,
        "solar_ghi": 5.88, "solar_dni": 5.45, "wind_speed_50m": 6.35, "wind_10m": 4.8, "temp": 26.0
    },
    {
        "state": "Karnataka", "region": "South", "district": "Koppal",
        "base_name": "Koppal Renewable Basin", "center_lat": 15.3467, "center_lon": 76.1558,
        "energy_types": ["Wind", "Hybrid"], "elevation_m": 530, "slope_deg": 2.6,
        "land_cover": "Agricultural Fallow (Single Crop)", "base_grid_km": 8.0, "base_road_km": 3.1,
        "protected_area": "Daroji Sloth Bear Sanctuary", "dist_protected_km": 32.0,
        "solar_ghi": 5.75, "solar_dni": 5.25, "wind_speed_50m": 7.30, "wind_10m": 5.5, "temp": 27.2
    },
    {
        "state": "Karnataka", "region": "South", "district": "Gadag",
        "base_name": "Gadag-Kappatagudda Wind Belt", "center_lat": 15.4300, "center_lon": 75.6300,
        "energy_types": ["Wind", "Hybrid"], "elevation_m": 680, "slope_deg": 4.1,
        "land_cover": "Degraded / Scrubland", "base_grid_km": 9.5, "base_road_km": 3.8,
        "protected_area": "Kappatagudda Wildlife Sanctuary", "dist_protected_km": 13.5,
        "solar_ghi": 5.68, "solar_dni": 5.15, "wind_speed_50m": 7.48, "wind_10m": 5.7, "temp": 25.8
    },

    # --- ANDHRA PRADESH (Kurnool, Anantapur, Kadapa) ---
    {
        "state": "Andhra Pradesh", "region": "South", "district": "Kurnool",
        "base_name": "Kurnool Ultra Solar Belt", "center_lat": 15.6800, "center_lon": 78.2800,
        "energy_types": ["Solar", "Hybrid"], "elevation_m": 290, "slope_deg": 1.1,
        "land_cover": "Barren / Wasteland", "base_grid_km": 4.0, "base_road_km": 1.7,
        "protected_area": "Rollapadu Wildlife Sanctuary", "dist_protected_km": 17.5,
        "solar_ghi": 5.95, "solar_dni": 5.60, "wind_speed_50m": 6.55, "wind_10m": 4.9, "temp": 28.4
    },
    {
        "state": "Andhra Pradesh", "region": "South", "district": "Anantapur",
        "base_name": "NP Kunta Solar-Wind Complex", "center_lat": 14.1500, "center_lon": 78.4200,
        "energy_types": ["Solar", "Wind", "Hybrid"], "elevation_m": 350, "slope_deg": 1.8,
        "land_cover": "Degraded / Scrubland", "base_grid_km": 5.1, "base_road_km": 2.0,
        "protected_area": "Sri Penusila Narasimha Sanctuary", "dist_protected_km": 36.0,
        "solar_ghi": 5.86, "solar_dni": 5.40, "wind_speed_50m": 7.20, "wind_10m": 5.4, "temp": 27.6
    },
    {
        "state": "Andhra Pradesh", "region": "South", "district": "Kadapa",
        "base_name": "Mylavaram Renewable Plain", "center_lat": 14.8500, "center_lon": 78.3300,
        "energy_types": ["Solar", "Hybrid"], "elevation_m": 210, "slope_deg": 1.5,
        "land_cover": "Barren / Wasteland", "base_grid_km": 7.8, "base_road_km": 2.9,
        "protected_area": "Sri Lankamalleswara Sanctuary", "dist_protected_km": 24.0,
        "solar_ghi": 5.80, "solar_dni": 5.32, "wind_speed_50m": 6.42, "wind_10m": 4.8, "temp": 28.2
    },

    # --- MADHYA PRADESH (Rewa, Neemuch, Agar Malwa) ---
    {
        "state": "Madhya Pradesh", "region": "Central", "district": "Rewa",
        "base_name": "Rewa Ultra Mega Solar Park", "center_lat": 24.5362, "center_lon": 81.2961,
        "energy_types": ["Solar"], "elevation_m": 310, "slope_deg": 1.2,
        "land_cover": "Barren / Wasteland", "base_grid_km": 3.2, "base_road_km": 1.4,
        "protected_area": "Mukundpur Tiger Safari", "dist_protected_km": 28.0,
        "solar_ghi": 5.65, "solar_dni": 5.20, "wind_speed_50m": 5.10, "wind_10m": 3.8, "temp": 26.5
    },
    {
        "state": "Madhya Pradesh", "region": "Central", "district": "Mandsaur",
        "base_name": "Neemuch-Mandsaur Solar Plateau", "center_lat": 24.0722, "center_lon": 75.0689,
        "energy_types": ["Solar", "Hybrid"], "elevation_m": 450, "slope_deg": 1.6,
        "land_cover": "Degraded / Scrubland", "base_grid_km": 6.4, "base_road_km": 2.3,
        "protected_area": "Gandhi Sagar Sanctuary", "dist_protected_km": 31.0,
        "solar_ghi": 5.72, "solar_dni": 5.35, "wind_speed_50m": 5.85, "wind_10m": 4.4, "temp": 26.1
    },
    {
        "state": "Madhya Pradesh", "region": "Central", "district": "Agar Malwa",
        "base_name": "Agar Malwa Solar Hub", "center_lat": 23.7100, "center_lon": 76.0200,
        "energy_types": ["Solar"], "elevation_m": 505, "slope_deg": 1.3,
        "land_cover": "Agricultural Fallow (Single Crop)", "base_grid_km": 8.2, "base_road_km": 3.0,
        "protected_area": "Ralamandal Wildlife Sanctuary", "dist_protected_km": 65.0,
        "solar_ghi": 5.68, "solar_dni": 5.28, "wind_speed_50m": 5.62, "wind_10m": 4.2, "temp": 25.9
    },

    # --- MAHARASHTRA (Dhule, Satara, Osmanabad) ---
    {
        "state": "Maharashtra", "region": "West", "district": "Dhule",
        "base_name": "Sakri Mega Solar Complex", "center_lat": 20.9980, "center_lon": 74.3160,
        "energy_types": ["Solar", "Hybrid"], "elevation_m": 390, "slope_deg": 1.7,
        "land_cover": "Barren / Wasteland", "base_grid_km": 5.8, "base_road_km": 2.1,
        "protected_area": "Gautala Autramghat Sanctuary", "dist_protected_km": 45.0,
        "solar_ghi": 5.70, "solar_dni": 5.25, "wind_speed_50m": 6.15, "wind_10m": 4.6, "temp": 26.8
    },
    {
        "state": "Maharashtra", "region": "West", "district": "Satara",
        "base_name": "Chalkewadi Wind Plateau", "center_lat": 17.5805, "center_lon": 73.8503,
        "energy_types": ["Wind"], "elevation_m": 1050, "slope_deg": 6.8,
        "land_cover": "Open Grassland / Grazing", "base_grid_km": 7.4, "base_road_km": 2.9,
        "protected_area": "Koyna Wildlife Sanctuary", "dist_protected_km": 18.0,
        "solar_ghi": 5.20, "solar_dni": 4.50, "wind_speed_50m": 8.05, "wind_10m": 6.2, "temp": 23.5
    },
    {
        "state": "Maharashtra", "region": "West", "district": "Osmanabad",
        "base_name": "Marathwada Solar Corridor", "center_lat": 18.1800, "center_lon": 76.0400,
        "energy_types": ["Solar", "Hybrid"], "elevation_m": 630, "slope_deg": 1.5,
        "land_cover": "Agricultural Fallow (Single Crop)", "base_grid_km": 8.9, "base_road_km": 3.4,
        "protected_area": "Yedshi Ramling Sanctuary", "dist_protected_km": 22.0,
        "solar_ghi": 5.62, "solar_dni": 5.15, "wind_speed_50m": 6.45, "wind_10m": 4.8, "temp": 27.0
    },

    # --- TELANGANA ---
    {
        "state": "Telangana", "region": "South", "district": "Mahbubnagar",
        "base_name": "Palwai Solar Valley", "center_lat": 16.7488, "center_lon": 78.0035,
        "energy_types": ["Solar"], "elevation_m": 440, "slope_deg": 1.4,
        "land_cover": "Degraded / Scrubland", "base_grid_km": 7.1, "base_road_km": 2.6,
        "protected_area": "Amrabad Tiger Reserve", "dist_protected_km": 38.0,
        "solar_ghi": 5.60, "solar_dni": 5.10, "wind_speed_50m": 5.70, "wind_10m": 4.3, "temp": 27.5
    },

    # --- LADAKH (High Altitude Cold Desert Solar) ---
    {
        "state": "Ladakh", "region": "North", "district": "Leh",
        "base_name": "Pang High-Altitude Solar Plateau", "center_lat": 33.1200, "center_lon": 77.8000,
        "energy_types": ["Solar"], "elevation_m": 4200, "slope_deg": 2.2,
        "land_cover": "Barren / Wasteland", "base_grid_km": 38.0, "base_road_km": 4.5,
        "protected_area": "Hemis National Park", "dist_protected_km": 26.0,
        "solar_ghi": 6.45, "solar_dni": 6.65, "wind_speed_50m": 5.20, "wind_10m": 3.9, "temp": 4.5
    },

    # --- ODISHA, UTTAR PRADESH, PUNJAB, JHARKHAND, ASSAM ---
    {
        "state": "Odisha", "region": "East", "district": "Balangir",
        "base_name": "Western Odisha Solar Belt", "center_lat": 20.7100, "center_lon": 83.4800,
        "energy_types": ["Solar"], "elevation_m": 170, "slope_deg": 1.3,
        "land_cover": "Agricultural Fallow (Single Crop)", "base_grid_km": 9.2, "base_road_km": 3.5,
        "protected_area": "Debrigarh Wildlife Sanctuary", "dist_protected_km": 48.0,
        "solar_ghi": 5.25, "solar_dni": 4.60, "wind_speed_50m": 4.80, "wind_10m": 3.5, "temp": 27.2
    },
    {
        "state": "Uttar Pradesh", "region": "North", "district": "Jhansi",
        "base_name": "Bundelkhand Solar Complex", "center_lat": 25.4484, "center_lon": 78.5685,
        "energy_types": ["Solar"], "elevation_m": 260, "slope_deg": 1.2,
        "land_cover": "Degraded / Scrubland", "base_grid_km": 6.8, "base_road_km": 2.4,
        "protected_area": "Ranipur Wildlife Sanctuary", "dist_protected_km": 52.0,
        "solar_ghi": 5.48, "solar_dni": 4.95, "wind_speed_50m": 4.95, "wind_10m": 3.7, "temp": 26.8
    },
    {
        "state": "Punjab", "region": "North", "district": "Bathinda",
        "base_name": "Bathinda Agro-Solar Zone", "center_lat": 30.2110, "center_lon": 74.9455,
        "energy_types": ["Solar"], "elevation_m": 205, "slope_deg": 0.5,
        "land_cover": "Agricultural Fallow (Single Crop)", "base_grid_km": 5.5, "base_road_km": 1.8,
        "protected_area": "Bir Bhunder Wildlife Sanctuary", "dist_protected_km": 24.0,
        "solar_ghi": 5.35, "solar_dni": 4.80, "wind_speed_50m": 4.75, "wind_10m": 3.6, "temp": 24.8
    },
    {
        "state": "Jharkhand", "region": "East", "district": "Deoghar",
        "base_name": "Santhal Pargana Solar Park", "center_lat": 24.4826, "center_lon": 86.7000,
        "energy_types": ["Solar"], "elevation_m": 250, "slope_deg": 2.0,
        "land_cover": "Degraded / Scrubland", "base_grid_km": 8.5, "base_road_km": 3.1,
        "protected_area": "Parasnath Wildlife Sanctuary", "dist_protected_km": 55.0,
        "solar_ghi": 5.22, "solar_dni": 4.55, "wind_speed_50m": 4.60, "wind_10m": 3.4, "temp": 26.4
    },
    {
        "state": "Assam", "region": "Northeast", "district": "Nagaon",
        "base_name": "Brahmaputra Valley Solar Plain", "center_lat": 26.3465, "center_lon": 92.6840,
        "energy_types": ["Solar"], "elevation_m": 65, "slope_deg": 0.9,
        "land_cover": "Agricultural Fallow (Single Crop)", "base_grid_km": 12.5, "base_road_km": 4.2,
        "protected_area": "Kaziranga National Park", "dist_protected_km": 32.0,
        "solar_ghi": 4.75, "solar_dni": 4.05, "wind_speed_50m": 4.20, "wind_10m": 3.1, "temp": 24.5
    }
]

def generate_candidate_dataset(num_variations_per_cluster: int = 4) -> pd.DataFrame:
    """
    Generates a dense, realistic, geographically grounded dataset of candidate sites across India.
    """
    logger.info("Generating candidate sites from authoritative clusters...")
    random.seed(42)
    np.random.seed(42)

    rows = []
    site_counter = 1

    # Load MNRE Parks for spatial proximity calculation
    mnre_file = RAW_DIR / "mnre_solar_parks.json"
    mnre_parks = []
    if mnre_file.exists():
        with open(mnre_file, "r", encoding="utf-8") as f:
            mnre_data = json.load(f)
            mnre_parks = mnre_data.get("parks", [])

    for cluster in REGIONAL_CLUSTERS:
        for energy_type in cluster["energy_types"]:
            for v in range(num_variations_per_cluster):
                # Spatial jitter within realistic contiguous zone (~0.05° to 0.15° ≈ 5-15km)
                lat_jitter = (random.random() - 0.5) * 0.20
                lon_jitter = (random.random() - 0.5) * 0.20
                lat = round(cluster["center_lat"] + lat_jitter, 4)
                lon = round(cluster["center_lon"] + lon_jitter, 4)

                # Climatological variation
                ghi_delta = round((random.random() - 0.5) * 0.15, 2)
                solar_ghi = max(3.5, round(cluster["solar_ghi"] + ghi_delta, 2))
                solar_dni = max(3.0, round(cluster["solar_dni"] + ghi_delta * 1.1, 2))
                solar_pvout = round(solar_ghi * 365 * 0.78, 1) # Specific PV yield (kWh/kWp/yr)

                wind_delta = round((random.random() - 0.5) * 0.35, 2)
                wind_speed_50m = max(3.5, round(cluster["wind_speed_50m"] + wind_delta, 2))
                wind_speed_10m = max(2.5, round(cluster["wind_10m"] + wind_delta * 0.7, 2))
                # Standard Wind Power Density: WPD = 0.5 * 1.225 * v^3
                wind_power_density = round(0.5 * 1.225 * (wind_speed_50m ** 3), 1)

                temp_avg = round(cluster["temp"] + (random.random() - 0.5) * 1.5, 1)

                # Terrain
                elevation = max(10.0, round(cluster["elevation_m"] + (random.random() - 0.5) * 40.0, 1))
                slope = max(0.2, round(cluster["slope_deg"] + (random.random() - 0.5) * 0.8, 1))
                terrain_type = classify_terrain(elevation, slope)

                # Distances
                grid_dist = max(1.2, round(cluster["base_grid_km"] + (random.random() - 0.5) * 4.0, 1))
                substation_dist = round(grid_dist * random.uniform(1.1, 1.4), 1)
                road_dist = max(0.5, round(cluster["base_road_km"] + (random.random() - 0.5) * 2.0, 1))
                road_type = "National Highway" if road_dist < 3.0 else ("State Highway" if road_dist < 8.0 else "Major District Road")

                # Land & Environmental
                land_cover = cluster["land_cover"]
                land_suit_score, _ = evaluate_land_suitability_class(land_cover)
                # Apply slight local variance
                land_suit_score = round(min(100.0, max(40.0, land_suit_score + (random.random() - 0.5) * 6.0)), 1)

                prot_dist = max(5.0, round(cluster["dist_protected_km"] + (random.random() - 0.5) * 8.0, 1))
                env_penalty = calculate_environmental_penalty(prot_dist)

                # Find nearest MNRE Sanctioned Park & GEC status
                nearest_park_name = "N/A"
                nearest_park_dist = 999.0
                if mnre_parks:
                    min_p_dist = float("inf")
                    best_p = None
                    for p in mnre_parks:
                        pd_dist = haversine_distance_km(lat, lon, p["latitude"], p["longitude"])
                        if pd_dist < min_p_dist:
                            min_p_dist = pd_dist
                            best_p = p
                    if best_p:
                        nearest_park_name = best_p["name"]
                        nearest_park_dist = round(min_p_dist, 1)

                in_gec = "Yes (Phase I)" if nearest_park_dist <= 65.0 else ("Yes (Phase II)" if nearest_park_dist <= 120.0 else "No")

                # Compute Ground-Truth Surrogate Suitability
                suitability_score = compute_scientific_surrogate_suitability(
                    energy_type=energy_type,
                    solar_ghi=solar_ghi,
                    solar_dni=solar_dni,
                    wind_speed_50m=wind_speed_50m,
                    wind_power_density=wind_power_density,
                    slope_deg=slope,
                    distance_to_grid_km=grid_dist,
                    distance_to_road_km=road_dist,
                    land_suitability_score=land_suit_score,
                    environmental_penalty=env_penalty,
                    temperature_avg=temp_avg
                )

                # Determine Suitability Tier
                if suitability_score >= 85.0:
                    tier = "Very High"
                elif suitability_score >= 72.0:
                    tier = "High"
                elif suitability_score >= 58.0:
                    tier = "Moderate"
                else:
                    tier = "Low"

                # Techno-Economic Modeling
                # Capacity sizing based on energy type and suitability
                if energy_type == "Solar":
                    cap_mw = round(random.uniform(250.0, 1500.0) * (suitability_score / 100.0), 0)
                    cf = min(0.26, max(0.18, (solar_ghi / 6.5) * 0.25))
                    lcoe = round(2.35 + (grid_dist / 40.0) * 0.35 + (slope / 10.0) * 0.25, 2)
                elif energy_type == "Wind":
                    cap_mw = round(random.uniform(150.0, 800.0) * (suitability_score / 100.0), 0)
                    cf = min(0.42, max(0.24, (wind_speed_50m / 9.0) * 0.40))
                    lcoe = round(2.80 + (grid_dist / 40.0) * 0.40 + (road_dist / 20.0) * 0.20, 2)
                else: # Hybrid
                    cap_mw = round(random.uniform(500.0, 2400.0) * (suitability_score / 100.0), 0)
                    cf = min(0.48, max(0.32, (solar_ghi / 6.5) * 0.20 + (wind_speed_50m / 9.0) * 0.28))
                    lcoe = round(2.65 + (grid_dist / 40.0) * 0.30, 2)

                annual_gwh = round((cap_mw * 8760.0 * cf) / 1000.0, 1)
                # India CEA grid emission factor: 0.82 tonnes CO2 per MWh (820 tonnes per GWh)
                co2_offset = round(annual_gwh * 820.0, 0)

                # Site Code & Name
                state_abbr = cluster["state"][:2].upper()
                site_code = f"IND-{state_abbr}-{site_counter:03d}"
                zone_label = f"Sector {chr(65 + (v % 6))}"
                name = f"{cluster['base_name']} ({zone_label})"

                rows.append({
                    "id": site_counter,
                    "site_code": site_code,
                    "name": name,
                    "state": cluster["state"],
                    "district": cluster["district"],
                    "region": cluster["region"],
                    "latitude": lat,
                    "longitude": lon,
                    "energy_type": energy_type,
                    "solar_ghi": solar_ghi,
                    "solar_dni": solar_dni,
                    "solar_pvout": solar_pvout,
                    "temperature_avg": temp_avg,
                    "wind_speed_10m": wind_speed_10m,
                    "wind_speed_50m": wind_speed_50m,
                    "wind_power_density": wind_power_density,
                    "elevation_m": elevation,
                    "slope_deg": slope,
                    "terrain_type": terrain_type,
                    "distance_to_grid_km": grid_dist,
                    "distance_to_substation_km": substation_dist,
                    "distance_to_road_km": road_dist,
                    "road_type": road_type,
                    "land_cover_class": land_cover,
                    "land_suitability_score": land_suit_score,
                    "environmental_penalty": env_penalty,
                    "nearest_protected_area": cluster["protected_area"],
                    "distance_to_protected_area_km": prot_dist,
                    "nearest_mnre_park": nearest_park_name,
                    "distance_to_mnre_park_km": nearest_park_dist,
                    "in_mnre_green_corridor": in_gec,
                    "ml_suitability_score": suitability_score,
                    "suitability_tier": tier,
                    "estimated_capacity_mw": cap_mw,
                    "annual_energy_potential_gwh": annual_gwh,
                    "lcoe_inr_kwh": lcoe,
                    "co2_offset_tonnes_year": co2_offset
                })
                site_counter += 1

    df = pd.DataFrame(rows)
    output_path = PROCESSED_DIR / "india_candidate_sites.csv"
    df.to_csv(output_path, index=False)
    logger.info(f"Generated {len(df)} candidate sites across India. Saved to {output_path}")
    return df

if __name__ == "__main__":
    generate_candidate_dataset()
