import numpy as np
import pandas as pd

FEATURE_COLUMNS = [
    "solar_ghi",
    "solar_dni",
    "wind_speed_50m",
    "wind_power_density",
    "elevation_m",
    "slope_deg",
    "distance_to_grid_km",
    "distance_to_road_km",
    "land_suitability_score",
    "environmental_penalty",
    "temperature_avg"
]

FEATURE_DISPLAY_NAMES = {
    "solar_ghi": "Global Horizontal Irradiance (GHI)",
    "solar_dni": "Direct Normal Irradiance (DNI)",
    "wind_speed_50m": "Wind Speed at 50m",
    "wind_power_density": "Wind Power Density",
    "elevation_m": "Elevation",
    "slope_deg": "Terrain Slope",
    "distance_to_grid_km": "Grid Distance",
    "distance_to_road_km": "Road Distance",
    "land_suitability_score": "Land Suitability",
    "environmental_penalty": "Environmental Risk",
    "temperature_avg": "Average Temperature"
}

FEATURE_UNITS = {
    "solar_ghi": "kWh/m²/day",
    "solar_dni": "kWh/m²/day",
    "wind_speed_50m": "m/s",
    "wind_power_density": "W/m²",
    "elevation_m": "m",
    "slope_deg": "°",
    "distance_to_grid_km": "km",
    "distance_to_road_km": "km",
    "land_suitability_score": "pts",
    "environmental_penalty": "pts",
    "temperature_avg": "°C"
}

def compute_scientific_surrogate_suitability(
    energy_type: str,
    solar_ghi: float,
    solar_dni: float,
    wind_speed_50m: float,
    wind_power_density: float,
    slope_deg: float,
    distance_to_grid_km: float,
    distance_to_road_km: float,
    land_suitability_score: float,
    environmental_penalty: float,
    temperature_avg: float
) -> float:
    """
    Computes a scientifically defensible Analytical Hierarchy Process (AHP) / 
    Weighted Multi-Criteria Decision Analysis (MCDA) ground-truth surrogate suitability index (0-100),
    adhering to NREL and IRENA siting criteria.
    """
    # 1. Solar Resource Score (0-100)
    # GHI > 5.5 is excellent (100), < 3.5 is poor (0)
    # Temperature penalty: Solar panels lose efficiency above 25°C (~0.4%/°C)
    norm_ghi = np.clip((solar_ghi - 3.5) / (6.8 - 3.5), 0.0, 1.0) * 100.0
    temp_factor = np.clip(1.0 - max(0.0, temperature_avg - 25.0) * 0.005, 0.85, 1.0)
    solar_score = norm_ghi * temp_factor

    # 2. Wind Resource Score (0-100)
    # Wind Speed at 50m > 7.5 m/s is excellent, < 4.0 m/s is uneconomic
    norm_wind = np.clip((wind_speed_50m - 4.0) / (8.5 - 4.0), 0.0, 1.0) * 70.0
    norm_wpd = np.clip((wind_power_density - 100.0) / (450.0 - 100.0), 0.0, 1.0) * 30.0
    wind_score = norm_wind + norm_wpd

    # 3. Grid Accessibility Score (0-100)
    # Closer to transmission lines = higher score. < 5km is 100, > 50km drops toward 0
    grid_score = np.clip(100.0 - (distance_to_grid_km / 50.0) * 100.0, 0.0, 100.0)

    # 4. Road Accessibility Score (0-100)
    # < 2km is 100, > 25km drops to 0
    road_score = np.clip(100.0 - (distance_to_road_km / 25.0) * 100.0, 0.0, 100.0)

    # 5. Slope Penalty (0-100)
    # Solar: Ideal < 3 deg, unacceptable > 10 deg
    # Wind: Tolerates up to 15 deg
    if energy_type.lower() == "solar":
        slope_score = np.clip(100.0 - (slope_deg / 8.0) * 100.0, 0.0, 100.0)
    elif energy_type.lower() == "wind":
        slope_score = np.clip(100.0 - (slope_deg / 15.0) * 100.0, 0.0, 100.0)
    else: # Hybrid
        slope_score = np.clip(100.0 - (slope_deg / 10.0) * 100.0, 0.0, 100.0)

    # 6. Land Cover Score
    land_score = land_suitability_score

    # Calculate weighted baseline suitability depending on energy type
    if energy_type.lower() == "solar":
        base_score = (
            0.35 * solar_score +
            0.20 * grid_score +
            0.15 * land_score +
            0.15 * slope_score +
            0.10 * road_score +
            0.05 * (100.0 - environmental_penalty)
        )
    elif energy_type.lower() == "wind":
        base_score = (
            0.40 * wind_score +
            0.20 * grid_score +
            0.15 * land_score +
            0.10 * slope_score +
            0.10 * road_score +
            0.05 * (100.0 - environmental_penalty)
        )
    else: # Hybrid
        base_score = (
            0.25 * solar_score +
            0.25 * wind_score +
            0.20 * grid_score +
            0.12 * land_score +
            0.10 * slope_score +
            0.08 * road_score
        )

    # Apply strict environmental buffer deduction
    final_score = base_score - (environmental_penalty * 0.40)
    return round(float(np.clip(final_score, 5.0, 99.5)), 1)
