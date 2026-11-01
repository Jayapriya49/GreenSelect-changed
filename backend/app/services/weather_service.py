import logging
import httpx
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException

from backend.app.models.weather import WeatherHistoryCache
from backend.app.models.site import CandidateSite
from backend.app.schemas.weather import (
    MonthlyWeatherItem,
    SeasonalWeatherItem,
    SeasonalSummary,
    WeatherAnalysisResponse,
    LocationComparisonResponse
)

logger = logging.getLogger("renewai.weather")

NASA_MONTHLY_URL = "https://power.larc.nasa.gov/api/temporal/monthly/point"

MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

SEASON_DEFINITIONS = {
    "Winter": {
        "months": [12, 1, 2],
        "display": "Winter (Dec - Feb)"
    },
    "Summer": {
        "months": [3, 4, 5],
        "display": "Summer (Mar - May)"
    },
    "Monsoon": {
        "months": [6, 7, 8, 9],
        "display": "Monsoon (Jun - Sep)"
    },
    "Post-monsoon": {
        "months": [10, 11],
        "display": "Post-monsoon (Oct - Nov)"
    }
}

class WeatherService:
    def __init__(self):
        self.timeout = 25.0

    async def get_historical_weather(
        self,
        db: Session,
        latitude: float,
        longitude: float,
        start_year: int = 2018,
        end_year: int = 2023,
        site_id: Optional[int] = None,
        location_name: Optional[str] = None,
        state: Optional[str] = None
    ) -> WeatherAnalysisResponse:
        """
        Fetches or retrieves cached historical weather & solar/wind climatology from NASA POWER.
        Calculates monthly and seasonal averages according to Indian meteorological seasons.
        """
        # Validate years
        if start_year > end_year:
            raise HTTPException(status_code=400, detail="start_year cannot be greater than end_year.")
        if end_year > 2025:
            end_year = 2024
        if start_year < 1990:
            start_year = 1990

        # Resolve location metadata if site_id provided
        district = None
        if site_id:
            site = db.query(CandidateSite).filter(CandidateSite.id == site_id).first()
            if site:
                location_name = site.name
                state = site.state
                district = site.district
                latitude = site.latitude
                longitude = site.longitude
        
        if not location_name:
            location_name = f"Location ({latitude:.2f}°N, {longitude:.2f}°E)"

        lat_rounded = round(latitude, 4)
        lon_rounded = round(longitude, 4)

        # Check DB Cache
        cached_entry = db.query(WeatherHistoryCache).filter(
            WeatherHistoryCache.latitude == lat_rounded,
            WeatherHistoryCache.longitude == lon_rounded,
            WeatherHistoryCache.start_year == start_year,
            WeatherHistoryCache.end_year == end_year
        ).first()

        if cached_entry:
            logger.info(f"Weather cache HIT for ({lat_rounded}, {lon_rounded}) {start_year}-{end_year}")
            monthly_items = [MonthlyWeatherItem(**item) for item in cached_entry.monthly_data]
            seasonal_items = [SeasonalWeatherItem(**item) for item in cached_entry.seasonal_data]
            summary = self._calculate_summary(monthly_items, seasonal_items)
            return WeatherAnalysisResponse(
                location_name=location_name,
                state=state,
                district=district,
                latitude=latitude,
                longitude=longitude,
                start_year=start_year,
                end_year=end_year,
                data_source="NASA POWER Monthly Climatology API (Cached)",
                is_cached=True,
                monthly_data=monthly_items,
                seasonal_data=seasonal_items,
                summary=summary
            )

        # Fetch from NASA POWER API
        logger.info(f"Fetching from NASA POWER API for ({latitude}, {longitude}) {start_year}-{end_year}...")
        params = {
            "parameters": "ALLSKY_SFC_SW_DWN,WS10M,T2M,PRECTOTCORR",
            "community": "RE",
            "longitude": f"{longitude:.4f}",
            "latitude": f"{latitude:.4f}",
            "start": str(start_year),
            "end": str(end_year),
            "format": "JSON"
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(NASA_MONTHLY_URL, params=params)
                
            if resp.status_code != 200:
                logger.error(f"NASA POWER API error: HTTP {resp.status_code} - {resp.text}")
                raise HTTPException(
                    status_code=502,
                    detail=f"NASA POWER API returned status {resp.status_code}. Please verify coordinates and retry."
                )

            data = resp.json()
            raw_parameters = data.get("properties", {}).get("parameter", {})

            if not raw_parameters:
                raise HTTPException(
                    status_code=502,
                    detail="NASA POWER API returned an empty parameters payload for this location."
                )

        except httpx.TimeoutException:
            logger.error("NASA POWER API timed out after 25 seconds.")
            raise HTTPException(
                status_code=504,
                detail="NASA POWER API request timed out. NASA servers may be experiencing high load. Please retry."
            )
        except httpx.RequestError as exc:
            logger.error(f"NASA POWER API network failure: {exc}")
            raise HTTPException(
                status_code=503,
                detail=f"Unable to connect to NASA POWER API server ({exc.__class__.__name__}). Please check internet connection and retry."
            )

        # Process monthly and seasonal data
        monthly_items, seasonal_items, yearly_trend = self._process_nasa_data(raw_parameters, start_year, end_year)
        summary = self._calculate_summary(monthly_items, seasonal_items)

        # Cache in Database
        try:
            new_cache = WeatherHistoryCache(
                latitude=lat_rounded,
                longitude=lon_rounded,
                start_year=start_year,
                end_year=end_year,
                monthly_data=[item.model_dump() for item in monthly_items],
                seasonal_data=[item.model_dump() for item in seasonal_items],
                raw_parameters={"sample_keys": list(raw_parameters.keys())}
            )
            db.add(new_cache)
            db.commit()
            logger.info(f"Cached NASA POWER data for ({lat_rounded}, {lon_rounded})")
        except Exception as e:
            db.rollback()
            logger.warning(f"Failed to save weather cache entry: {e}")

        return WeatherAnalysisResponse(
            location_name=location_name,
            state=state,
            district=district,
            latitude=latitude,
            longitude=longitude,
            start_year=start_year,
            end_year=end_year,
            data_source="NASA POWER Monthly Climatology API (Live)",
            is_cached=False,
            monthly_data=monthly_items,
            seasonal_data=seasonal_items,
            summary=summary,
            yearly_trend=yearly_trend
        )

    def _process_nasa_data(
        self,
        parameters: Dict[str, Dict[str, float]],
        start_year: int,
        end_year: int
    ) -> Tuple[List[MonthlyWeatherItem], List[SeasonalWeatherItem], List[Dict[str, float]]]:
        """
        Parses NASA POWER parameters dictionary, ignores month 13 (annual sum),
        filters out -999 fill values, and aggregates monthly and seasonal numbers.
        """
        solar_raw = parameters.get("ALLSKY_SFC_SW_DWN", {})
        wind_raw = parameters.get("WS10M", {})
        temp_raw = parameters.get("T2M", {})
        precip_raw = parameters.get("PRECTOTCORR", {})

        # Monthly bins (month 1..12 -> list of valid readings)
        monthly_bins: Dict[int, Dict[str, List[float]]] = {
            m: {"solar": [], "wind": [], "temp": [], "precip": []} for m in range(1, 13)
        }

        # Yearly bins for trend
        yearly_bins: Dict[int, Dict[str, List[float]]] = {}

        for ym_key, val in solar_raw.items():
            if len(ym_key) != 6:
                continue
            year = int(ym_key[:4])
            month = int(ym_key[4:])
            if month < 1 or month > 12:
                continue  # skip month 13 (annual total)
            
            solar_val = val if val > -900 else None
            wind_val = wind_raw.get(ym_key)
            wind_val = wind_val if wind_val is not None and wind_val > -900 else None
            temp_val = temp_raw.get(ym_key)
            temp_val = temp_val if temp_val is not None and temp_val > -900 else None
            precip_val = precip_raw.get(ym_key)
            precip_val = precip_val if precip_val is not None and precip_val > -900 else None

            if solar_val is not None:
                monthly_bins[month]["solar"].append(solar_val)
            if wind_val is not None:
                monthly_bins[month]["wind"].append(wind_val)
            if temp_val is not None:
                monthly_bins[month]["temp"].append(temp_val)
            if precip_val is not None:
                monthly_bins[month]["precip"].append(precip_val)

            # Year trend
            if year not in yearly_bins:
                yearly_bins[year] = {"solar": [], "wind": [], "temp": [], "precip": []}
            if solar_val is not None: yearly_bins[year]["solar"].append(solar_val)
            if wind_val is not None: yearly_bins[year]["wind"].append(wind_val)
            if temp_val is not None: yearly_bins[year]["temp"].append(temp_val)
            if precip_val is not None: yearly_bins[year]["precip"].append(precip_val)

        # Build Monthly Items
        monthly_items: List[MonthlyWeatherItem] = []
        for m in range(1, 13):
            s_list = monthly_bins[m]["solar"]
            w_list = monthly_bins[m]["wind"]
            t_list = monthly_bins[m]["temp"]
            p_list = monthly_bins[m]["precip"]

            solar_avg = round(sum(s_list) / len(s_list), 2) if s_list else 0.0
            wind_avg = round(sum(w_list) / len(w_list), 2) if w_list else 0.0
            temp_avg = round(sum(t_list) / len(t_list), 2) if t_list else 0.0
            precip_avg = round(sum(p_list) / len(p_list), 2) if p_list else 0.0
            rainfall_mm = round(precip_avg * DAYS_IN_MONTH[m - 1], 1)

            monthly_items.append(
                MonthlyWeatherItem(
                    month=m,
                    month_name=MONTH_NAMES[m - 1],
                    solar_radiation=solar_avg,
                    wind_speed=wind_avg,
                    temperature=temp_avg,
                    precipitation=precip_avg,
                    rainfall_month_mm=rainfall_mm
                )
            )

        # Compute Annual Averages
        annual_solar = sum(item.solar_radiation for item in monthly_items) / 12.0
        annual_wind = sum(item.wind_speed for item in monthly_items) / 12.0

        # Build Seasonal Items
        seasonal_items: List[SeasonalWeatherItem] = []
        for s_name, s_def in SEASON_DEFINITIONS.items():
            s_months = s_def["months"]
            relevant_items = [item for item in monthly_items if item.month in s_months]
            if not relevant_items:
                continue

            s_solar = round(sum(it.solar_radiation for it in relevant_items) / len(relevant_items), 2)
            s_wind = round(sum(it.wind_speed for it in relevant_items) / len(relevant_items), 2)
            s_temp = round(sum(it.temperature for it in relevant_items) / len(relevant_items), 2)
            s_precip = round(sum(it.precipitation for it in relevant_items) / len(relevant_items), 2)

            solar_delta = round(((s_solar - annual_solar) / annual_solar) * 100.0, 1) if annual_solar > 0 else 0.0
            wind_delta = round(((s_wind - annual_wind) / annual_wind) * 100.0, 1) if annual_wind > 0 else 0.0

            seasonal_items.append(
                SeasonalWeatherItem(
                    season_name=s_name,
                    months_included=[MONTH_NAMES[m - 1] for m in s_months],
                    solar_radiation_avg=s_solar,
                    wind_speed_avg=s_wind,
                    temperature_avg=s_temp,
                    precipitation_avg=s_precip,
                    solar_delta_pct=solar_delta,
                    wind_delta_pct=wind_delta
                )
            )

        # Yearly Trends
        yearly_trends: List[Dict[str, float]] = []
        for yr in sorted(yearly_bins.keys()):
            y_s = yearly_bins[yr]["solar"]
            y_w = yearly_bins[yr]["wind"]
            y_t = yearly_bins[yr]["temp"]
            yearly_trends.append({
                "year": yr,
                "solar_radiation": round(sum(y_s) / len(y_s), 2) if y_s else 0.0,
                "wind_speed": round(sum(y_w) / len(y_w), 2) if y_w else 0.0,
                "temperature": round(sum(y_t) / len(y_t), 2) if y_t else 0.0
            })

        return monthly_items, seasonal_items, yearly_trends

    def _calculate_summary(
        self,
        monthly_items: List[MonthlyWeatherItem],
        seasonal_items: List[SeasonalWeatherItem]
    ) -> SeasonalSummary:
        best_solar = max(seasonal_items, key=lambda s: s.solar_radiation_avg)
        best_wind = max(seasonal_items, key=lambda s: s.wind_speed_avg)

        ann_solar = round(sum(it.solar_radiation for it in monthly_items) / 12.0, 2)
        ann_wind = round(sum(it.wind_speed for it in monthly_items) / 12.0, 2)
        ann_temp = round(sum(it.temperature for it in monthly_items) / 12.0, 2)
        ann_rain = round(sum(it.rainfall_month_mm for it in monthly_items), 1)

        disclaimer = (
            "Historical averages calculated from NASA POWER meteorological satellite observations. "
            "These metrics represent multi-year statistical climatological baselines and are not predictive future weather forecasts."
        )

        return SeasonalSummary(
            best_solar_season=best_solar.season_name,
            best_solar_value=best_solar.solar_radiation_avg,
            best_wind_season=best_wind.season_name,
            best_wind_value=best_wind.wind_speed_avg,
            annual_avg_solar=ann_solar,
            annual_avg_wind=ann_wind,
            annual_avg_temperature=ann_temp,
            annual_total_rainfall_mm=ann_rain,
            disclaimer=disclaimer
        )

    async def compare_locations(
        self,
        db: Session,
        site_ids: List[int],
        start_year: int = 2018,
        end_year: int = 2023
    ) -> LocationComparisonResponse:
        """
        Retrieves historical weather analyses for multiple sites and aggregates
        them for comparative Recharts graphs.
        """
        locations_res: List[WeatherAnalysisResponse] = []
        for sid in site_ids:
            try:
                res = await self.get_historical_weather(
                    db=db,
                    latitude=0.0,
                    longitude=0.0,
                    start_year=start_year,
                    end_year=end_year,
                    site_id=sid
                )
                locations_res.append(res)
            except Exception as e:
                logger.error(f"Failed to fetch weather for site {sid}: {e}")

        # Build monthly comparison table
        monthly_comparison = []
        for m_idx in range(12):
            row = {
                "month": m_idx + 1,
                "month_name": MONTH_NAMES[m_idx]
            }
            for loc in locations_res:
                loc_key = loc.location_name
                row[f"{loc_key}_solar"] = loc.monthly_data[m_idx].solar_radiation
                row[f"{loc_key}_wind"] = loc.monthly_data[m_idx].wind_speed
                row[f"{loc_key}_temp"] = loc.monthly_data[m_idx].temperature
            monthly_comparison.append(row)

        # Build seasonal comparison table
        seasonal_comparison = []
        for s_idx, s_name in enumerate(["Winter", "Summer", "Monsoon", "Post-monsoon"]):
            row = {"season": s_name}
            for loc in locations_res:
                loc_key = loc.location_name
                s_item = next((s for s in loc.seasonal_data if s.season_name == s_name), None)
                if s_item:
                    row[f"{loc_key}_solar"] = s_item.solar_radiation_avg
                    row[f"{loc_key}_wind"] = s_item.wind_speed_avg
                    row[f"{loc_key}_temp"] = s_item.temperature_avg
            seasonal_comparison.append(row)

        return LocationComparisonResponse(
            start_year=start_year,
            end_year=end_year,
            locations=locations_res,
            monthly_comparison=monthly_comparison,
            seasonal_comparison=seasonal_comparison
        )

weather_service = WeatherService()
