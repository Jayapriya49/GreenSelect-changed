import math

def calculate_slope_degrees(elevation_center: float, elev_n: float, elev_s: float, elev_e: float, elev_w: float, cell_size_m: float = 30.0) -> float:
    """
    Calculates the terrain slope in degrees using the standard 3x3 finite-difference algorithm:
    dz/dx = (elev_e - elev_w) / (2 * cell_size)
    dz/dy = (elev_n - elev_s) / (2 * cell_size)
    slope_radians = arctan(sqrt((dz/dx)^2 + (dz/dy)^2))
    slope_deg = slope_radians * (180 / pi)
    """
    dz_dx = (elev_e - elev_w) / (2.0 * cell_size_m)
    dz_dy = (elev_n - elev_s) / (2.0 * cell_size_m)
    slope_rad = math.atan(math.sqrt(dz_dx**2 + dz_dy**2))
    return round(math.degrees(slope_rad), 2)

def classify_terrain(elevation_m: float, slope_deg: float) -> str:
    """
    Classifies terrain based on elevation and slope criteria:
    - Solar preferred: Slope < 5 deg
    - Wind suitable: Slope < 15 deg, ridgelines/plateaus
    """
    if slope_deg < 2.0:
        return "Flat Lowland Plain"
    elif slope_deg < 5.0:
        return "Gentle Undulating Terrain"
    elif slope_deg < 12.0:
        return "Rolling Plateau"
    elif slope_deg < 20.0:
        return "Hill Ridge / Valley"
    else:
        return "Steep Mountainous (Restricted)"
