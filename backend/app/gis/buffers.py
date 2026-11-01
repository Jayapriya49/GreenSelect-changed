def calculate_environmental_penalty(distance_to_protected_km: float, buffer_threshold_km: float = 10.0) -> float:
    """
    Computes environmental risk penalty score (0 to 100):
    - Sites < 2km from National Park/Sanctuary: Critical Exclusion Penalty (100)
    - Sites 2km - 5km: High Penalty (60 - 90)
    - Sites 5km - 10km: Moderate Buffer Penalty (10 - 50)
    - Sites > 10km: Clean zone (0 penalty)
    """
    if distance_to_protected_km <= 2.0:
        return 100.0
    elif distance_to_protected_km <= 5.0:
        # Linear ramp from 90 down to 50
        return round(90.0 - ((distance_to_protected_km - 2.0) / 3.0) * 40.0, 1)
    elif distance_to_protected_km <= buffer_threshold_km:
        # Linear ramp from 50 down to 0
        return round(50.0 - ((distance_to_protected_km - 5.0) / 5.0) * 50.0, 1)
    else:
        return 0.0

def evaluate_land_suitability_class(land_cover_class: str) -> tuple[float, bool]:
    """
    Evaluates land suitability based on scientific land-cover taxonomy:
    Returns (suitability_score [0-100], is_eligible)
    """
    suitability_map = {
        "Barren / Wasteland": (95.0, True),
        "Sandy Desert / Salt Flat": (98.0, True),
        "Degraded / Scrubland": (90.0, True),
        "Open Grassland / Grazing": (75.0, True),
        "Agricultural Fallow (Single Crop)": (60.0, True),
        "Intensive Cropland": (30.0, False),
        "Dense Forest / Reserved": (0.0, False),
        "Wetland / Mangrove": (0.0, False),
        "Water Body": (0.0, False),
        "Urban / Built-up Infrastructure": (5.0, False),
    }
    return suitability_map.get(land_cover_class, (50.0, True))
