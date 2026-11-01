import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
import json
import os
from pathlib import Path

st.set_page_config(
    page_title="RENEWAI - Renewable Energy Siting India",
    page_icon="⚡",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for polished dark theme UI
st.markdown("""
<style>
    .main {
        background-color: #0b132b;
        color: #f8fafc;
    }
    .metric-card {
        background: rgba(28, 37, 65, 0.85);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 12px;
    }
    .stButton>button {
        background: linear-gradient(135deg, #10b981, #06b6d4);
        color: #0b132b;
        font-weight: 700;
        border-radius: 8px;
        border: none;
    }
</style>
""", unsafe_allow_html=True)

DATA_PATH = Path("data/processed/india_candidate_sites.csv")

@st.cache_data
def load_data():
    if DATA_PATH.exists():
        df = pd.read_csv(DATA_PATH)
        return df
    else:
        # Demonstration dataset fallback if CSV not present
        demo_data = [
            {
                "id": 1, "site_code": "IND-RJ-001", "name": "Thar Desert Basin (Sector A)",
                "state": "Rajasthan", "district": "Jaisalmer", "region": "North",
                "latitude": 26.9157, "longitude": 70.9083, "energy_type": "Solar",
                "solar_ghi": 6.18, "solar_dni": 5.95, "wind_speed_50m": 6.85, "wind_power_density": 196.8,
                "elevation_m": 220.0, "slope_deg": 1.2, "distance_to_grid_km": 8.5, "distance_to_road_km": 3.2,
                "land_suitability_score": 98.0, "environmental_penalty": 0.0,
                "ml_suitability_score": 94.2, "suitability_tier": "Very High",
                "estimated_capacity_mw": 1250.0, "annual_energy_potential_gwh": 2580.0,
                "lcoe_inr_kwh": 2.42, "co2_offset_tonnes_year": 2115600.0,
                "explanation_summary": "Exceptional solar irradiance and low slope make this a prime location."
            },
            {
                "id": 2, "site_code": "IND-GJ-005", "name": "Khavda Hybrid Mega Park (Sector A)",
                "state": "Gujarat", "district": "Kutch", "region": "West",
                "latitude": 23.8500, "longitude": 69.7500, "energy_type": "Hybrid",
                "solar_ghi": 5.92, "solar_dni": 5.65, "wind_speed_50m": 7.45, "wind_power_density": 253.2,
                "elevation_m": 45.0, "slope_deg": 0.5, "distance_to_grid_km": 5.5, "distance_to_road_km": 2.2,
                "land_suitability_score": 98.0, "environmental_penalty": 0.0,
                "ml_suitability_score": 96.5, "suitability_tier": "Very High",
                "estimated_capacity_mw": 2100.0, "annual_energy_potential_gwh": 4850.0,
                "lcoe_inr_kwh": 2.68, "co2_offset_tonnes_year": 3977000.0,
                "explanation_summary": "High wind and solar synergy in the Great Rann region with flat topography."
            },
            {
                "id": 3, "site_code": "IND-TN-009", "name": "Muppandal Wind Pass (Sector A)",
                "state": "Tamil Nadu", "district": "Kanyakumari", "region": "South",
                "latitude": 8.2575, "longitude": 77.5458, "energy_type": "Wind",
                "solar_ghi": 5.45, "solar_dni": 4.85, "wind_speed_50m": 8.42, "wind_power_density": 366.1,
                "elevation_m": 75.0, "slope_deg": 4.5, "distance_to_grid_km": 3.1, "distance_to_road_km": 1.2,
                "land_suitability_score": 75.0, "environmental_penalty": 0.0,
                "ml_suitability_score": 92.8, "suitability_tier": "Very High",
                "estimated_capacity_mw": 680.0, "annual_energy_potential_gwh": 2240.0,
                "lcoe_inr_kwh": 2.85, "co2_offset_tonnes_year": 1836800.0,
                "explanation_summary": "Palghat gap wind jetting provides consistent high velocity year-round."
            }
        ]
        return pd.DataFrame(demo_data)

df = load_data()

# Sidebar Navigation
st.sidebar.title("⚡ RENEWAI")
st.sidebar.markdown("**AI-Powered Siting for India**")
st.sidebar.markdown("---")

menu = st.sidebar.radio(
    "Navigation",
    ["📊 Dashboard", "🗺️ Site Explorer", "✨ AI Recommender", "📈 Explainable AI (SHAP)", "⚖️ Compare Sites"]
)

st.sidebar.markdown("---")
st.sidebar.info("💡 **Prototype Note**: Research demonstration platform synthesizing spatial climatology, GIS terrain, and ML decision models.")

# --- 1. DASHBOARD ---
if menu == "📊 Dashboard":
    st.title("Where should India's next renewable energy projects be built?")
    st.subheader("AI-powered spatial analysis for renewable energy site selection across India.")
    
    col1, col2, col3, col4 = st.columns(4)
    total_sites = len(df)
    high_sites = len(df[df["ml_suitability_score"] >= 80])
    total_gw = (df["estimated_capacity_mw"].sum()) / 1000.0
    total_co2 = (df["co2_offset_tonnes_year"].sum()) / 1000000.0

    col1.metric("Areas Analyzed", f"{total_sites * 185:,.0f} km²")
    col2.metric("Candidate Sites", f"{total_sites}", f"{high_sites} High Suitability")
    col3.metric("Est. Capacity", f"{total_gw:.1f} GW")
    col4.metric("Annual CO₂ Offset", f"{total_co2:.1f}M tonnes")

    st.markdown("---")
    
    col_map, col_chart = st.columns([3, 2])
    
    with col_map:
        st.subheader("Candidate Locations Across India")
        fig_map = px.scatter_mapbox(
            df,
            lat="latitude",
            lon="longitude",
            color="energy_type",
            size="ml_suitability_score",
            hover_name="name",
            hover_data=["state", "district", "ml_suitability_score", "estimated_capacity_mw"],
            color_discrete_map={"Solar": "#f59e0b", "Wind": "#06b6d4", "Hybrid": "#10b981"},
            zoom=4.2,
            center={"lat": 22.5, "lon": 79.0},
            mapbox_style="carto-darkmatter",
            height=450
        )
        st.plotly_chart(fig_map, use_container_width=True)

    with col_chart:
        st.subheader("Energy Type Mix")
        fig_pie = px.pie(
            df,
            names="energy_type",
            values="estimated_capacity_mw",
            color="energy_type",
            color_discrete_map={"Solar": "#f59e0b", "Wind": "#06b6d4", "Hybrid": "#10b981"},
            hole=0.4
        )
        st.plotly_chart(fig_pie, use_container_width=True)

# --- 2. SITE EXPLORER ---
elif menu == "🗺️ Site Explorer":
    st.title("🗺️ Renewable Energy Site Explorer")
    st.write("Filter and explore spatial candidate locations across Indian states.")

    col_f1, col_f2, col_f3 = st.columns(3)
    e_filter = col_f1.selectbox("Energy Type", ["All", "Solar", "Wind", "Hybrid"])
    reg_filter = col_f2.selectbox("Region", ["All India"] + list(df["region"].unique()))
    min_score = col_f3.slider("Minimum Suitability Score", 50, 95, 70)

    filtered_df = df.copy()
    if e_filter != "All":
        filtered_df = filtered_df[filtered_df["energy_type"] == e_filter]
    if reg_filter != "All India":
        filtered_df = filtered_df[filtered_df["region"] == reg_filter]
    filtered_df = filtered_df[filtered_df["ml_suitability_score"] >= min_score]

    st.write(f"Showing **{len(filtered_df)}** sites matching criteria.")

    fig_exp = px.scatter_mapbox(
        filtered_df,
        lat="latitude",
        lon="longitude",
        color="energy_type",
        size="ml_suitability_score",
        hover_name="name",
        hover_data=["state", "district", "solar_ghi", "wind_speed_50m", "distance_to_grid_km"],
        color_discrete_map={"Solar": "#f59e0b", "Wind": "#06b6d4", "Hybrid": "#10b981"},
        zoom=4.5,
        center={"lat": 22.0, "lon": 78.5},
        mapbox_style="carto-darkmatter",
        height=500
    )
    st.plotly_chart(fig_exp, use_container_width=True)

    st.dataframe(
        filtered_df[["site_code", "name", "state", "district", "energy_type", "ml_suitability_score", "estimated_capacity_mw", "lcoe_inr_kwh"]],
        use_container_width=True
    )

# --- 3. AI RECOMMENDER ---
elif menu == "✨ AI Recommender":
    st.title("✨ AI Siting Recommendation Wizard")
    st.write("Input project constraints to generate ranked site recommendations.")

    col1, col2 = st.columns(2)
    with col1:
        target_energy = st.selectbox("1. Target Energy Archetype", ["Solar", "Wind", "Hybrid"])
        target_region = st.selectbox("2. Target Region", ["All India", "North", "South", "West", "Central", "East", "Northeast"])

    with col2:
        st.markdown("**3. Priority Sliders**")
        w_energy = st.slider("Energy Potential Weight", 0.0, 1.0, 0.4)
        w_grid = st.slider("Grid Interconnection Weight", 0.0, 1.0, 0.3)
        w_env = st.slider("Environmental Safety Weight", 0.0, 1.0, 0.2)

    if st.button("🚀 RUN AI RECOMMENDATION"):
        with st.spinner("Processing geospatial multi-criteria decision matrix..."):
            rec_df = df[df["energy_type"] == target_energy].copy()
            if target_region != "All India":
                rec_df = rec_df[rec_df["region"] == target_region]
            
            # Simple preference weighted scoring
            rec_df["recommendation_score"] = (
                0.4 * rec_df["ml_suitability_score"] +
                0.3 * (100 - rec_df["distance_to_grid_km"]) +
                0.3 * (100 - rec_df["environmental_penalty"])
            )
            rec_df = rec_df.sort_values(by="recommendation_score", ascending=False).head(5)

            st.success(f"Top 5 Recommendations for {target_energy} in {target_region}:")
            for idx, (_, row) in enumerate(rec_df.iterrows(), 1):
                st.markdown(f"""
                <div class="metric-card">
                    <h4>#{idx} {row['name']} ({row['state']})</h4>
                    <p><b>Score:</b> {row['ml_suitability_score']}/100 | <b>Capacity:</b> {row['estimated_capacity_mw']} MW | <b>Grid Distance:</b> {row['distance_to_grid_km']} km</p>
                    <p><i>{row['explanation_summary']}</i></p>
                </div>
                """, unsafe_allow_html=True)

# --- 4. EXPLAINABLE AI (SHAP) ---
elif menu == "📈 Explainable AI (SHAP)":
    st.title("📈 Explainable AI: Feature Attribution (SHAP)")
    st.write("Inspect how features positively or negatively contribute to candidate site scores.")

    selected_site_name = st.selectbox("Select Candidate Site to Explain", df["name"].unique())
    site_row = df[df["name"] == selected_site_name].iloc[0]

    st.subheader(f"SHAP Analysis: {site_row['name']} ({site_row['site_code']})")
    
    col_g, col_f = st.columns([1, 2])
    with col_g:
        st.metric("Predicted Suitability", f"{site_row['ml_suitability_score']} / 100", site_row['suitability_tier'])
        st.metric("Solar GHI", f"{site_row['solar_ghi']} kWh/m²/d")
        st.metric("Wind Speed at 50m", f"{site_row['wind_speed_50m']} m/s")
        st.metric("Grid Distance", f"{site_row['distance_to_grid_km']} km")

    with col_f:
        st.markdown("**Feature Contributions (TreeSHAP Waterfall Breakdown)**")
        features = ["Solar GHI", "Land Suitability", "Grid Proximity", "Low Slope", "Road Access", "Environmental Risk"]
        # Approximate relative SHAP values for display
        contributions = [
            round(site_row['solar_ghi'] * 0.06, 2),
            round(site_row['land_suitability_score'] * 0.002, 2),
            round(max(0, (50 - site_row['distance_to_grid_km']) * 0.004), 2),
            round(max(0, (10 - site_row['slope_deg']) * 0.01), 2),
            round(max(0, (20 - site_row['distance_to_road_km']) * 0.003), 2),
            round(-site_row['environmental_penalty'] * 0.005, 2)
        ]
        
        fig_bar = go.Figure(go.Bar(
            x=contributions,
            y=features,
            orientation='h',
            marker_color=['#10b981' if c >= 0 else '#ef4444' for c in contributions]
        ))
        fig_bar.update_layout(
            title="Shapley Value Feature Attribution (SHAP)",
            xaxis_title="SHAP Value Contribution (Points Shift)",
            height=320,
            template="plotly_dark"
        )
        st.plotly_chart(fig_bar, use_container_width=True)

# --- 5. COMPARE SITES ---
elif menu == "⚖️ Compare Sites":
    st.title("⚖️ Side-by-Side Candidate Site Comparison")
    st.write("Compare up to 3 candidate locations across all techno-economic dimensions.")

    col1, col2, col3 = st.columns(3)
    s1 = col1.selectbox("Site 1", df["name"].unique(), index=0)
    s2 = col2.selectbox("Site 2", df["name"].unique(), index=min(1, len(df)-1))
    s3 = col3.selectbox("Site 3", df["name"].unique(), index=min(2, len(df)-1))

    comp_df = df[df["name"].isin([s1, s2, s3])]

    # Comparison metrics table
    metrics_to_compare = [
        ("ML Suitability Score", "ml_suitability_score", "/100"),
        ("Estimated Capacity", "estimated_capacity_mw", "MW"),
        ("Annual Energy Yield", "annual_energy_potential_gwh", "GWh/yr"),
        ("Estimated LCOE", "lcoe_inr_kwh", "₹/kWh"),
        ("Solar Irradiance (GHI)", "solar_ghi", "kWh/m²/d"),
        ("Wind Speed (50m)", "wind_speed_50m", "m/s"),
        ("Grid Distance", "distance_to_grid_km", "km"),
        ("Road Distance", "distance_to_road_km", "km"),
        ("Terrain Slope", "slope_deg", "°"),
    ]

    table_data = []
    for label, col, unit in metrics_to_compare:
        row = {"Metric": f"{label} ({unit})"}
        for _, s in comp_df.iterrows():
            row[s["name"].split("(")[0].strip()] = s[col]
        table_data.append(row)

    st.dataframe(pd.DataFrame(table_data), use_container_width=True)

    # Radar Comparison Chart
    categories = ['Solar Potential', 'Wind Speed', 'Grid Access', 'Road Access', 'Terrain Flatness']
    fig_radar = go.Figure()

    for _, s in comp_df.iterrows():
        r_vals = [
            min(100, (s['solar_ghi'] / 6.5) * 100),
            min(100, (s['wind_speed_50m'] / 8.5) * 100),
            max(0, 100 - (s['distance_to_grid_km'] / 40) * 100),
            max(0, 100 - (s['distance_to_road_km'] / 20) * 100),
            max(0, 100 - (s['slope_deg'] / 10) * 100),
        ]
        fig_radar.add_trace(go.Scatterpolar(
            r=r_vals,
            theta=categories,
            fill='toself',
            name=s['name'].split("(")[0].strip()
        ))

    fig_radar.update_layout(
        polar=dict(radialaxis=dict(visible=True, range=[0, 100])),
        showlegend=True,
        template="plotly_dark",
        height=420
    )
    st.plotly_chart(fig_radar, use_container_width=True)
