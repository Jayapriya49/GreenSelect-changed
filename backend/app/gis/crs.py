import math

WGS84_EPSG = 4326
INDIA_PROJECTED_EPSG = 7755 # India National Grid
WEB_MERCATOR_EPSG = 3857

def wgs84_to_meters(lat: float, lon: float) -> tuple[float, float]:
    """
    Approximates projection of WGS84 coordinates to meters (Spherical Mercator).
    """
    r = 6378137.0
    x = r * math.radians(lon)
    lat_rad = math.radians(lat)
    y = r * math.log(math.tan(math.pi / 4 + lat_rad / 2))
    return x, y

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Computes accurate great-circle (haversine) geodesic distance in kilometers between two lat/lon points.
    """
    r = 6371.0 # Earth's radius in km
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(r * c, 2)
