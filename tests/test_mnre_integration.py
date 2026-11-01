import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_mnre_endpoints():
    print("Testing /api/mnre/summary...")
    res = client.get("/api/mnre/summary")
    assert res.status_code == 200, f"Failed: {res.text}"
    summary = res.json()
    print(f"  Summary: {summary['total_sanctioned_parks']} parks, {summary['total_sanctioned_capacity_gw']} GW sanctioned, {summary['total_national_potential_gw']} GW potential")
    assert summary["total_sanctioned_parks"] >= 20
    assert summary["total_sanctioned_capacity_gw"] > 30

    print("Testing /api/mnre/solar-parks...")
    res = client.get("/api/mnre/solar-parks?limit=10")
    assert res.status_code == 200
    parks = res.json()
    assert parks["total"] >= 20
    assert len(parks["parks"]) > 0
    print(f"  First park: {parks['parks'][0]['name']} ({parks['parks'][0]['sanctioned_capacity_mw']} MW)")

    print("Testing /api/mnre/solar-parks/1...")
    res = client.get("/api/mnre/solar-parks/1")
    assert res.status_code == 200
    park1 = res.json()
    print(f"  Park 1: {park1['name']} in {park1['state']}")

    print("Testing /api/mnre/state-potentials...")
    res = client.get("/api/mnre/state-potentials")
    assert res.status_code == 200
    potentials = res.json()
    assert len(potentials) >= 10
    print(f"  Top state potential: {potentials[0]['state']} with {potentials[0]['total_potential_gw']} GW")

    print("Testing /api/mnre/benchmarks...")
    res = client.get("/api/mnre/benchmarks")
    assert res.status_code == 200
    bench = res.json()
    assert "land_norms" in bench
    print(f"  Benchmarks title: {bench['guidelines_title']}")

    print("Testing /api/sites with MNRE integration fields...")
    res = client.get("/api/sites?limit=5")
    assert res.status_code == 200
    sites = res.json()
    first_site = sites["sites"][0]
    print(f"  Site: {first_site['name']}")
    print(f"  Nearest MNRE Park: {first_site.get('nearest_mnre_park')} ({first_site.get('distance_to_mnre_park_km')} km)")
    print(f"  In Green Energy Corridor: {first_site.get('in_mnre_green_corridor')}")
    assert first_site.get("nearest_mnre_park") is not None

    print("Testing /api/statistics...")
    res = client.get("/api/statistics")
    assert res.status_code == 200
    stats = res.json()
    print(f"  Data sources count: {len(stats['data_source_summary'])}")
    assert "Government Benchmarks" in stats["data_source_summary"]

    print("\nALL MNRE INTEGRATION TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_mnre_endpoints()
