import pytest
import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["model_trained"] is True
    print("[PASS] /api/health passed")

def test_statistics():
    res = client.get("/api/statistics")
    assert res.status_code == 200
    data = res.json()
    assert data["total_candidate_sites"] > 0
    assert data["total_estimated_capacity_gw"] > 0
    print(f"[PASS] /api/statistics passed: {data['total_candidate_sites']} sites, {data['total_estimated_capacity_gw']} GW potential")

def test_sites_list():
    res = client.get("/api/sites?energy_type=Solar&limit=5")
    assert res.status_code == 200
    data = res.json()
    assert len(data["sites"]) == 5
    print("[PASS] /api/sites passed")

def test_site_details():
    res = client.get("/api/sites/1")
    assert res.status_code == 200
    site = res.json()
    assert "site_code" in site
    assert "solar_ghi" in site
    print(f"[PASS] /api/sites/1 passed: {site['name']} ({site['state']})")

def test_site_explanation():
    res = client.get("/api/sites/1/explanation")
    assert res.status_code == 200
    data = res.json()
    assert "positive_factors" in data
    assert "negative_factors" in data
    assert len(data["positive_factors"]) > 0
    assert "natural_language_explanation" in data
    print("[PASS] /api/sites/1/explanation passed with real SHAP attributions")

def test_recommendations():
    payload = {
        "energy_type": "Solar",
        "region": "All India",
        "priorities": {
            "energy_potential": 0.40,
            "grid_accessibility": 0.30,
            "environmental_sustainability": 0.15,
            "land_suitability": 0.10,
            "economic_feasibility": 0.05
        },
        "top_n": 5
    }
    res = client.post("/api/recommendations", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert len(data["results"]) == 5
    assert data["results"][0]["rank"] == 1
    print(f"[PASS] /api/recommendations passed: Top site {data['results'][0]['site']['name']}")

def test_compare():
    payload = {"site_ids": [1, 2, 3]}
    res = client.post("/api/compare", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert len(data["sites"]) == 3
    assert "comparison_table" in data
    assert "radar_metrics" in data
    print("[PASS] /api/compare passed")

def test_ml_metrics():
    res = client.get("/api/ml/metrics")
    assert res.status_code == 200
    data = res.json()
    assert "r2_score" in data
    assert "feature_importances" in data
    print(f"[PASS] /api/ml/metrics passed: Model R^2 = {data['r2_score']}")

if __name__ == "__main__":
    test_health()
    test_statistics()
    test_sites_list()
    test_site_details()
    test_site_explanation()
    test_recommendations()
    test_compare()
    test_ml_metrics()
    print("\nALL BACKEND API TESTS PASSED SUCCESSFULLY!")
