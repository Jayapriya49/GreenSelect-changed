import pytest
import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_weather_years():
    res = client.get("/api/weather/years")
    assert res.status_code == 200
    data = res.json()
    assert "min_year" in data
    assert "max_year" in data
    assert data["default_start"] == 2018
    assert data["default_end"] == 2023
    print("[PASS] /api/weather/years passed")

def test_weather_historical_candidate_site():
    # Test for Site 1 (Thar Desert Basin)
    res = client.get("/api/weather/historical?latitude=26.9436&longitude=70.8133&start_year=2021&end_year=2022&site_id=1")
    assert res.status_code == 200
    data = res.json()
    assert data["latitude"] == 26.9436
    assert data["longitude"] == 70.8133

    assert len(data["monthly_data"]) == 12
    assert len(data["seasonal_data"]) == 4
    
    # Check that months are Jan to Dec with valid numbers
    jan = data["monthly_data"][0]
    assert jan["month"] == 1
    assert jan["month_name"] == "Jan"
    assert jan["solar_radiation"] > 0
    assert jan["wind_speed"] > 0
    assert jan["temperature"] is not None
    
    # Check seasons: Winter, Summer, Monsoon, Post-monsoon
    season_names = [s["season_name"] for s in data["seasonal_data"]]
    assert "Winter" in season_names
    assert "Summer" in season_names
    assert "Monsoon" in season_names
    assert "Post-monsoon" in season_names
    
    # Check summary
    summary = data["summary"]
    assert summary["best_solar_season"] in season_names
    assert summary["best_wind_season"] in season_names
    assert summary["annual_avg_solar"] > 0
    assert summary["annual_avg_wind"] > 0
    assert "NASA POWER" in summary["disclaimer"]
    print(f"[PASS] /api/weather/historical passed for {data['location_name']}: Best Solar = {summary['best_solar_season']}, Best Wind = {summary['best_wind_season']}")

def test_weather_caching():
    # Calling the exact same coordinates and year range should hit DB cache
    res = client.get("/api/weather/historical?latitude=27.5381&longitude=71.9167&start_year=2021&end_year=2022&site_id=1")
    assert res.status_code == 200
    data = res.json()
    assert data["is_cached"] is True
    print("[PASS] Weather caching works properly")

def test_weather_compare():
    # Compare site 1 and site 2
    payload = {
        "site_ids": [1, 2],
        "start_year": 2021,
        "end_year": 2022
    }
    res = client.post("/api/weather/compare", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert len(data["locations"]) == 2
    assert len(data["monthly_comparison"]) == 12
    assert len(data["seasonal_comparison"]) == 4
    print("[PASS] /api/weather/compare passed")

def test_cost_assumptions_endpoints():
    # 1. GET assumptions
    res = client.get("/api/cost-estimator/assumptions")
    assert res.status_code == 200
    assumptions = res.json()
    assert len(assumptions) > 0
    
    keys = [a["parameter_key"] for a in assumptions]
    assert "solar_panels_inr_per_mw" in keys
    assert "wind_turbine_inr_per_mw" in keys
    assert "grid_line_inr_per_km" in keys
    
    # 2. PUT assumptions update
    update_payload = {
        "assumptions": {
            "solar_panels_inr_per_mw": 19000000.0
        }
    }
    res_up = client.put("/api/cost-estimator/assumptions", json=update_payload)
    assert res_up.status_code == 200
    updated = next(a for a in res_up.json() if a["parameter_key"] == "solar_panels_inr_per_mw")
    assert updated["current_value"] == 19000000.0
    
    # 3. POST reset
    res_reset = client.post("/api/cost-estimator/assumptions/reset")
    assert res_reset.status_code == 200
    reset_item = next(a for a in res_reset.json() if a["parameter_key"] == "solar_panels_inr_per_mw")
    assert reset_item["current_value"] == reset_item["default_value"]
    print("[PASS] Cost assumptions CRUD passed")

def test_solar_cost_estimation():
    payload = {
        "site_id": 1,
        "location_name": "Bhadla Solar Park",
        "state": "Rajasthan",
        "energy_type": "Solar",
        "capacity_mw": 100.0,
        "distance_to_grid_km": 12.5,
        "distance_to_road_km": 2.0,
        "terrain_type": "Flat Plain",
        "slope_deg": 1.2
    }
    res = client.post("/api/cost-estimator/estimate", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["energy_type"] == "Solar"
    assert data["capacity_mw"] == 100.0
    assert data["total_cost_crores"] > 0
    assert data["total_cost_inr"] > 0
    assert data["cost_per_mw_crores"] > 0
    assert len(data["all_components"]) > 0
    assert len(data["categories"]) == 5
    
    # Verify subtotal sums match grand total
    calc_sum_inr = (
        data["equipment_cost_inr"] +
        data["land_development_cost_inr"] +
        data["grid_connection_cost_inr"] +
        data["installation_cost_inr"] +
        data["civil_infrastructure_cost_inr"]
    )
    assert abs(calc_sum_inr - data["total_cost_inr"]) < 100.0
    print(f"[PASS] Solar Cost Estimation: 100 MW = ₹{data['total_cost_crores']:.2f} Cr (₹{data['cost_per_mw_crores']:.2f} Cr/MW)")

def test_wind_cost_estimation():
    payload = {
        "location_name": "Muppandal Wind Belt",
        "state": "Tamil Nadu",
        "energy_type": "Wind",
        "capacity_mw": 50.0,
        "distance_to_grid_km": 8.0,
        "distance_to_road_km": 4.5,
        "terrain_type": "Rolling Terrain",
        "slope_deg": 3.5
    }
    res = client.post("/api/cost-estimator/estimate", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["energy_type"] == "Wind"
    assert data["capacity_mw"] == 50.0
    assert data["total_cost_crores"] > 0
    # Wind cost per MW is typically higher than solar in India (around 6-7.5 Cr/MW vs 3.5-4.5 Cr/MW)
    assert data["cost_per_mw_crores"] > 5.0
    assert any("Turbine" in c["name"] for c in data["all_components"])
    print(f"[PASS] Wind Cost Estimation: 50 MW = ₹{data['total_cost_crores']:.2f} Cr (₹{data['cost_per_mw_crores']:.2f} Cr/MW)")

def test_hybrid_cost_estimation_and_synergy():
    payload = {
        "location_name": "Khavda Hybrid Complex",
        "state": "Gujarat",
        "energy_type": "Hybrid",
        "capacity_mw": 100.0,
        "solar_capacity_mw": 60.0,
        "wind_capacity_mw": 40.0,
        "distance_to_grid_km": 15.0,
        "distance_to_road_km": 3.0,
        "terrain_type": "Flat Plain",
        "slope_deg": 1.0
    }
    res = client.post("/api/cost-estimator/estimate", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["energy_type"] == "Hybrid"
    assert data["solar_capacity_mw"] == 60.0
    assert data["wind_capacity_mw"] == 40.0
    # Shared synergy savings must be positive
    assert data["shared_synergy_savings_crores"] > 0
    assert data["shared_synergy_savings_inr"] > 0
    assert data["synergy_details"] is not None
    print(f"[PASS] Hybrid Cost Estimation: 100 MW (60S/40W) = ₹{data['total_cost_crores']:.2f} Cr (Saved ₹{data['shared_synergy_savings_crores']:.2f} Cr in shared infra)")

def test_cost_comparison():
    base_req = {
        "location_name": "Jaisalmer Site",
        "state": "Rajasthan",
        "energy_type": "Solar",
        "capacity_mw": 50.0,
        "distance_to_grid_km": 10.0,
        "distance_to_road_km": 2.0,
        "terrain_type": "Flat Plain",
        "slope_deg": 1.0
    }
    
    # 1. Compare energy types (Solar vs Wind vs Hybrid)
    res_type = client.post("/api/cost-estimator/compare", json={
        "mode": "energy_types",
        "base_request": base_req
    })
    assert res_type.status_code == 200
    types_data = res_type.json()
    assert len(types_data["items"]) == 3
    
    # 2. Compare capacities
    res_cap = client.post("/api/cost-estimator/compare", json={
        "mode": "capacities",
        "base_request": base_req,
        "comparison_capacities": [25.0, 50.0, 100.0]
    })
    assert res_cap.status_code == 200
    assert len(res_cap.json()["items"]) == 3
    print("[PASS] /api/cost-estimator/compare passed")

def test_cost_pdf_report():
    payload = {
        "location_name": "Bhadla Solar Park",
        "state": "Rajasthan",
        "energy_type": "Solar",
        "capacity_mw": 50.0,
        "distance_to_grid_km": 10.0,
        "distance_to_road_km": 2.0,
        "terrain_type": "Flat Plain",
        "slope_deg": 1.0
    }
    res = client.post("/api/cost-estimator/report/pdf", json=payload)
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    assert len(res.content) > 1000  # Non-empty PDF
    assert res.content.startswith(b"%PDF")
    print(f"[PASS] /api/cost-estimator/report/pdf generated valid PDF ({len(res.content)} bytes)")

if __name__ == "__main__":
    test_weather_years()
    test_weather_historical_candidate_site()
    test_weather_caching()
    test_weather_compare()
    test_cost_assumptions_endpoints()
    test_solar_cost_estimation()
    test_wind_cost_estimation()
    test_hybrid_cost_estimation_and_synergy()
    test_cost_comparison()
    test_cost_pdf_report()
    print("\nALL FEATURE 1 & FEATURE 2 BACKEND TESTS PASSED!")
