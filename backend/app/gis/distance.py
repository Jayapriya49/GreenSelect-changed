from .crs import haversine_distance_km

def find_nearest_feature_distance(site_lat: float, site_lon: float, feature_coordinates: list[tuple[float, float]]) -> tuple[float, int]:
    """
    Finds the minimum distance from a candidate site to a list of infrastructure/protected features.
    Returns (min_distance_km, nearest_index)
    """
    if not feature_coordinates:
        return 999.0, -1

    min_dist = float('inf')
    best_idx = -1

    for idx, (f_lat, f_lon) in enumerate(feature_coordinates):
        d = haversine_distance_km(site_lat, site_lon, f_lat, f_lon)
        if d < min_dist:
            min_dist = d
            best_idx = idx

    return round(min_dist, 2), best_idx
