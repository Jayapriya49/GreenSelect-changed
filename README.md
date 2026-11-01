# GreenSelect: AI-Powered Renewable Energy Site Selection for India

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%20%7C%20TypeScript%20%7C%20Vite-61DAFB.svg?style=flat&logo=react)](https://react.dev)
[![TailwindCSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-38B2AC.svg?style=flat&logo=tailwind-css)](https://tailwindcss.com)
[![PostGIS](https://img.shields.io/badge/Spatial%20DB-PostgreSQL%20%2B%20PostGIS-336791.svg?style=flat&logo=postgresql)](https://postgis.net)
[![SHAP](https://img.shields.io/badge/XAI-TreeSHAP%20Explainability-FF6F00.svg?style=flat)](https://shap.readthedocs.io)

> **GreenSelect** is a university research-grade, production-style decision-support platform engineered to identify, evaluate, rank, and explain optimal greenfield sites for **Utility-Scale Solar PV**, **Onshore Wind**, and **Co-located Solar-Wind Hybrid** energy projects across India.

---

## 🏛️ System Architecture

```text
                                 ┌────────────────────────────────────────────────────────┐
                                 │                 React 19 + Vite Frontend               │
                                 │  (TypeScript, Tailwind CSS, Leaflet GIS, Recharts)    │
                                 └──────────────────────────┬─────────────────────────────┘
                                                            │ REST API (Axios)
                                                            ▼
                                 ┌────────────────────────────────────────────────────────┐
                                 │                 FastAPI Python Backend                 │
                                 │  ┌──────────────┬──────────────┬────────────────────┐  │
                                 │  │  API Routers │ ML Services  │ XAI Engine (SHAP)  │  │
                                 │  ├──────────────┼──────────────┼────────────────────┤  │
                                 │  │ GIS Engine   │ Recommender  │ Data Access Layer  │  │
                                 │  └──────────────┴──────────────┴────────────────────┘  │
                                 └─────────────┬──────────────────────────┬───────────────┘
                                               │                          │
                                               ▼                          ▼
                                 ┌────────────────────────┐  ┌────────────────────────────┐
                                 │  PostgreSQL + PostGIS   │  │   Trained ML Artifacts     │
                                 │  (Candidate Sites, GIS  │  │   (RandomForest & XGBoost, │
                                 │   Features, Buffers)   │  │    SHAP Explainer, Scalers)│
                                 └────────────────────────┘  └────────────────────────────┘
                                               ▲
                                               │ Ingestion & Processing Pipeline
                                 ┌─────────────┴──────────────────────────────────────────┐
                                 │        Data Pipeline (NASA POWER + OSM + DEM)          │
                                 └────────────────────────────────────────────────────────┘
```

---

## 🔬 Scientific Methodology & Real Data Lineage

RENEWAI strictly avoids fabricated mock records, adopting an empirical multi-tier data ingestion pipeline:

| Dimension | Authoritative Dataset | Parameters Extracted | Resolution / Units |
| :--- | :--- | :--- | :--- |
| **Solar Resource** | **NASA POWER Climatology API** | Global Horizontal Irradiance (GHI), Direct Normal Irradiance (DNI), Top-of-Atmosphere Insolation, 2m Ambient Temperature | Multi-year climatological avg ($kWh/m^2/day$, $°C$) |
| **Wind Resource** | **NASA POWER & Global Wind Atlas** | Wind Speed at 50m hub height (`WS50M`), Wind Speed at 10m (`WS10M`), Derived Wind Power Density ($WPD = \frac{1}{2}\rho v^3$) | $m/s$, $W/m^2$ ($\rho = 1.225 kg/m^3$) |
| **Government Mega Parks** | **Ministry of New & Renewable Energy (MNRE)** | Ultra-Mega Solar Parks Scheme catalog, sanctioned & operational MW, implementing agencies | 25+ mega parks ($42.8+ GW$) |
| **State RE Potential** | **NISE & NIWE (Govt. of India)** | State-wise Solar potential (748 GW) & Wind potential at 120m hub height (695 GW), 2030 targets | State-level potential & achievement ($GW$, $MW$) |
| **Topography** | **NASA / USGS SRTM DEM** | Ground Elevation ($m$), Finite-difference Slope Angle ($\theta^\circ$) | 30-meter spatial grid |
| **Road Transport** | **OpenStreetMap (Overpass API)** | Distance to National Highways (`highway=motorway\|trunk\|primary`) | Geodesic metric distance ($km$) |
| **Transmission Grid** | **Central Transmission Utility & OSM** | Distance to high-voltage transmission lines (`power=line`) and substations (`power=substation`), Green Energy Corridor | Geodesic metric distance ($km$) |
| **Environmental Risk** | **Protected Planet (WDPA) & MoEFCC** | Spatial exclusion zones around National Parks, Wildlife Sanctuaries, Forest reserves, and Ramsar Wetlands | 2km-10km buffer penalty rings |
| **Land Suitability** | **ESA WorldCover Taxonomy** | Barren land, scrubland, salt flats vs dense forest/cropland | Normalized suitability index ($0-100$) |

---

## 🤖 Machine Learning & Surrogate Suitability Modeling

### 1. The Siting Dilemma & Surrogate Formulation
Because nationwide ground-truth commercial installation licenses are proprietary and constrained by local micro-politics, RENEWAI formulates a defensible **Analytical Hierarchy Process (AHP) / Weighted Multi-Criteria Decision Analysis (MCDA)** grounded in NREL and IRENA siting literature:

$$S_{base} = w_{sol} \cdot \tilde{GHI} + w_{wnd} \cdot \tilde{WPD} + w_{grd} \cdot \tilde{D}_{grid} + w_{rd} \cdot \tilde{D}_{road} + w_{slp} \cdot \tilde{S}_{slope} + w_{lnd} \cdot \tilde{L}_{land} - Penalty_{env}$$

### 2. Machine Learning Surrogate Learning
Ensemble Gradient Boosting (**XGBoost Regressor**) and **Random Forest Regressors** are trained on the multi-dimensional feature space to learn non-linear interactions, topography tradeoffs, and regional feature importance hierarchies.

- **Cross-Validation**: 5-Fold Stratified Cross-Validation
- **Metrics Computed**:
  - $R^2$ (Coefficient of Determination)
  - RMSE (Root Mean Squared Error)
  - MAE (Mean Absolute Error)
  - Tier Categorization Accuracy ($Very High \ge 80, High \ge 72, Moderate \ge 58, Low < 58$)

---

## 🔍 Explainable AI (SHAP TreeExplainer)

RENEWAI implements **TreeSHAP** (*Lundberg et al., Nature Machine Intelligence 2020*) to provide exact additive feature attribution:

$$f(x) = \phi_0 + \sum_{i=1}^{M} \phi_i(x)$$

For every candidate site recommendation, the API computes:
- **Positive Drivers**: Factors increasing suitability (e.g. $+0.38$ Solar GHI, $+0.22$ Land Suitability, $+0.17$ Grid Proximity)
- **Negative Drivers**: Siting restrictions (e.g. $-0.06$ Environmental Buffer, $-0.04$ Road Distance)
- **Automated Natural Language Report**: Synthesizing the model rationale in plain English.

---

## 🗄️ Database Schema & PostGIS Integration

The database layer utilizes **PostgreSQL 16 + PostGIS 3.4** (with zero-configuration SQLite spatial fallback for instant local execution):

```sql
CREATE TABLE candidate_sites (
    id SERIAL PRIMARY KEY,
    site_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    state VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    region VARCHAR(50) NOT NULL,
    latitude FLOAT NOT NULL,
    longitude FLOAT NOT NULL,
    energy_type VARCHAR(50) NOT NULL,
    solar_ghi FLOAT NOT NULL,
    solar_dni FLOAT NOT NULL,
    solar_pvout FLOAT NOT NULL,
    temperature_avg FLOAT NOT NULL,
    wind_speed_10m FLOAT NOT NULL,
    wind_speed_50m FLOAT NOT NULL,
    wind_power_density FLOAT NOT NULL,
    elevation_m FLOAT NOT NULL,
    slope_deg FLOAT NOT NULL,
    terrain_type VARCHAR(100) NOT NULL,
    distance_to_grid_km FLOAT NOT NULL,
    distance_to_substation_km FLOAT NOT NULL,
    distance_to_road_km FLOAT NOT NULL,
    road_type VARCHAR(100) NOT NULL,
    land_cover_class VARCHAR(100) NOT NULL,
    land_suitability_score FLOAT NOT NULL,
    environmental_penalty FLOAT NOT NULL,
    nearest_protected_area VARCHAR(200),
    distance_to_protected_area_km FLOAT NOT NULL,
    ml_suitability_score FLOAT NOT NULL,
    suitability_tier VARCHAR(50) NOT NULL,
    estimated_capacity_mw FLOAT NOT NULL,
    annual_energy_potential_gwh FLOAT NOT NULL,
    lcoe_inr_kwh FLOAT NOT NULL,
    co2_offset_tonnes_year FLOAT NOT NULL,
    shap_positive_factors JSON,
    shap_negative_factors JSON,
    explanation_summary TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🌐 REST API Endpoints

The FastAPI backend exposes an interactive OpenAPI Swagger UI at `http://localhost:8000/docs`:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/statistics` | Aggregated national KPIs, total GW capacity, state breakdowns |
| `GET` | `/api/sites` | Filter candidate sites by energy type, min score, region, state, grid distance |
| `GET` | `/api/sites/{id}` | Full technical dossier, telemetry, and capacity calculations |
| `GET` | `/api/sites/{id}/explanation` | Live TreeSHAP positive/negative factor attribution |
| `GET` | `/api/sites/{id}/features` | Raw feature vector vs benchmarks |
| `GET` | `/api/sites/nearby` | Radial spatial query within radius ($km$) |
| `GET` | `/api/mnre/summary` | Official MNRE national summary metrics & sanctioned capacity |
| `GET` | `/api/mnre/solar-parks` | Official Ultra-Mega Solar & Renewable Parks registry |
| `GET` | `/api/mnre/solar-parks/{id}`| Detailed park specifications, implementing agency, evacuation grid |
| `GET` | `/api/mnre/state-potentials`| State-level NISE Solar & NIWE Wind potentials vs installed achievements |
| `GET` | `/api/mnre/benchmarks` | Official MNRE technical & siting guidelines, land norms, CUF rules |
| `POST` | `/api/recommendations` | Multi-attribute AI recommendation engine with custom user priorities |
| `POST` | `/api/compare` | Side-by-side comparison of 2-3 sites with radar metrics & dynamic winner |
| `GET` | `/api/ml/metrics` | Model cross-validation scores, RMSE, MAE, and Gini feature importances |
| `GET` | `/api/states` | List of all states with candidate site counts |
| `GET` | `/api/health` | Service health status and model load status |

---

## 💻 Frontend Application Views

1. **Dashboard**: High-level national statistics, capacity gauges, energy distribution charts, and interactive overview map with MNRE overlays.
2. **Site Explorer**: Full-page interactive Leaflet map with custom glowing markers (Solar amber, Wind cyan, Hybrid emerald), MNRE Sanctioned Parks layer toggle, multi-filter drawer, and quick inspection cards.
3. **MNRE Registry & Data Hub**: Dedicated portal for exploring official Ultra-Mega Solar Parks, NISE/NIWE state potential comparisons, and interactive land acreage calculator.
4. **AI Recommendation Wizard**: 3-step configurator (Generation Archetype $\rightarrow$ Region $\rightarrow$ Priority Sliders) generating ranked recommendations with score breakdowns.
5. **Site Details**: Large animated suitability gauge, NASA climatological flux cards, grid/road proximity profiles, nearest MNRE park & Green Energy Corridor badges, environmental risk checks, and local GIS map preview.
5. **Explainable AI (SHAP)**: Waterfall factor attribution, global feature importance charts, and automated natural language interpretation.
6. **Compare Sites**: Side-by-side benchmarking matrix for up to 3 sites with radar chart overlay and algorithmic winner selection.
7. **Model Validation**: Academic transparency dashboard displaying test set $R^2$, RMSE, MAE, classification tier accuracy, and research methodology documentation.

---

## 🚀 Quick Start Guide

### Option 1: Docker Compose (Recommended)
Start the entire full-stack platform (React frontend + FastAPI backend + PostGIS database) in one command:

```bash
docker compose up --build
```
- **React Frontend**: `http://localhost`
- **FastAPI Backend & Swagger**: `http://localhost:8000/docs`
- **PostgreSQL/PostGIS**: `localhost:5432`

---

### Option 2: Local Developer Setup

#### 1. Backend Setup
```bash
# Install Python dependencies
pip install -r backend/requirements.txt

# Run the automated data ingestion & ML pipeline
python scripts/download_data.py
python scripts/generate_candidates.py
python scripts/train_pipeline.py
python scripts/seed_database.py

# Start FastAPI backend
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🧪 Running Automated Backend Tests

RENEWAI includes a full automated test suite verifying all API endpoints, database queries, and SHAP calculations:

```bash
python tests/test_backend_api.py
```

---

## 📜 Academic Citations & Research References

1. **NASA POWER Project**: *Prediction of Worldwide Energy Resources Climatology Dataset*, NASA Langley Research Center.
2. **Lundberg, S. M., et al. (2020)**: *From local explanations to global understanding with explainable AI for trees*, Nature Machine Intelligence, 2(1), 56-67.
3. **NREL (National Renewable Energy Laboratory)**: *Renewable Energy Potential and Siting Methodology Guidelines*.
4. **Central Electricity Authority (CEA), Ministry of Power, Government of India**: *CO2 Baseline Database for the Indian Power Sector*.
5. **OpenStreetMap Contributors**: *Planet Dump Infrastructure Vector Geometries*.

---

## 📄 License & Integrity
Developed as an advanced full-stack research decision-support system. All data processing pipelines and machine learning algorithms are designed for reproducible academic analysis.
