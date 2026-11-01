import io
import logging
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
    KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

from backend.app.models.cost import CostAssumption, CostEstimation
from backend.app.models.site import CandidateSite
from backend.app.schemas.cost import (
    CostEstimationRequest,
    CostEstimationResponse,
    CategoryCostSummary,
    CostComponentItem,
    CostAssumptionItem,
    CostComparisonItem,
    CostComparisonResponse
)

logger = logging.getLogger("renewai.cost")

INR_PER_CRORE = 10_000_000.0

DEFAULT_COST_ASSUMPTIONS = [
    # SOLAR PARAMETERS
    {
        "parameter_key": "solar_panels_inr_per_mw",
        "parameter_name": "Solar PV Modules (Mono PERC / TOPCon)",
        "energy_type": "Solar",
        "category": "Equipment",
        "default_value": 18_500_000.0,
        "unit": "INR/MW",
        "description": "Tier-1 high efficiency bifacial monocrystalline solar modules (approx ₹1.85 Cr/MW)"
    },
    {
        "parameter_key": "solar_inverter_inr_per_mw",
        "parameter_name": "Solar Power Conditioning Units / Inverters",
        "energy_type": "Solar",
        "category": "Equipment",
        "default_value": 3_200_000.0,
        "unit": "INR/MW",
        "description": "Utility central inverters or high-power string inverters with MPPT controllers (approx ₹0.32 Cr/MW)"
    },
    {
        "parameter_key": "solar_mounting_inr_per_mw",
        "parameter_name": "Module Mounting Structures (MMS)",
        "energy_type": "Solar",
        "category": "Equipment",
        "default_value": 3_600_000.0,
        "unit": "INR/MW",
        "description": "Galvanized hot-dip fixed tilt or single-axis tracker frames with rust protection"
    },
    {
        "parameter_key": "solar_electrical_inr_per_mw",
        "parameter_name": "Solar Balance of Plant (BOP) Electricals",
        "energy_type": "Solar",
        "category": "Equipment",
        "default_value": 3_400_000.0,
        "unit": "INR/MW",
        "description": "AC/DC solar cables, junction arrays, pooling switchgear, transformers and surge protectors"
    },
    {
        "parameter_key": "solar_land_acres_per_mw",
        "parameter_name": "Solar Land Footprint Requirement",
        "energy_type": "Solar",
        "category": "Land",
        "default_value": 4.0,
        "unit": "Acres/MW",
        "description": "Standard land area needed per MW for utility solar including row spacing and inverter pads"
    },
    {
        "parameter_key": "solar_land_prep_inr_per_acre",
        "parameter_name": "Solar Land Preparation & Leveling",
        "energy_type": "Solar",
        "category": "Land",
        "default_value": 350_000.0,
        "unit": "INR/Acre",
        "description": "Site clearance, soil compaction, boundary fencing and drainage grading"
    },
    {
        "parameter_key": "solar_install_labour_inr_per_mw",
        "parameter_name": "Solar Mechanical & Electrical Installation",
        "energy_type": "Solar",
        "category": "Installation",
        "default_value": 2_800_000.0,
        "unit": "INR/MW",
        "description": "Civil ramming, pile testing, panel mounting, electrical wiring and commissioning labour"
    },
    {
        "parameter_key": "solar_civil_infra_inr_per_mw",
        "parameter_name": "Solar Civil Infrastructure & Facilities",
        "energy_type": "Solar",
        "category": "Civil",
        "default_value": 1_800_000.0,
        "unit": "INR/MW",
        "description": "Main control room, security watchtowers, peripheral road, storm drainage network"
    },

    # WIND PARAMETERS
    {
        "parameter_key": "wind_turbine_inr_per_mw",
        "parameter_name": "Wind Turbine Generator (WTG) Nacelle, Rotor & Blades",
        "energy_type": "Wind",
        "category": "Equipment",
        "default_value": 42_000_000.0,
        "unit": "INR/MW",
        "description": "Class II/III utility wind turbine generator with tubular steel tower, nacelle, rotor hub and composite blades (approx ₹4.20 Cr/MW)"
    },
    {
        "parameter_key": "wind_foundation_inr_per_mw",
        "parameter_name": "Wind Turbine Gravity / Piled Foundation",
        "energy_type": "Wind",
        "category": "Civil",
        "default_value": 4_800_000.0,
        "unit": "INR/MW",
        "description": "Heavy reinforced high-grade concrete anchor foundation with deep rock anchors"
    },
    {
        "parameter_key": "wind_transport_install_inr_per_mw",
        "parameter_name": "Wind Turbine Logistics, Heavy Crane Erection",
        "energy_type": "Wind",
        "category": "Installation",
        "default_value": 4_200_000.0,
        "unit": "INR/MW",
        "description": "Multi-axle specialized transport for long blades, 600T main crane erection, tailing crane and lifting"
    },
    {
        "parameter_key": "wind_electrical_inr_per_mw",
        "parameter_name": "Wind Internal Cabling & Pooling Switchgear",
        "energy_type": "Wind",
        "category": "Equipment",
        "default_value": 4_400_000.0,
        "unit": "INR/MW",
        "description": "Unit step-up pad transformers (0.69/33kV), underground 33kV medium voltage cable network"
    },
    {
        "parameter_key": "wind_internal_roads_inr_per_mw",
        "parameter_name": "Wind Heavy-Duty Internal Roads & Crane Hardstands",
        "energy_type": "Wind",
        "category": "Civil",
        "default_value": 2_200_000.0,
        "unit": "INR/MW",
        "description": "Heavy axle-load compacted crushed gravel access roads and compacted crane boom platforms"
    },
    {
        "parameter_key": "wind_civil_infra_inr_per_mw",
        "parameter_name": "Wind Master Control Center & O&M Facility",
        "energy_type": "Wind",
        "category": "Civil",
        "default_value": 1_600_000.0,
        "unit": "INR/MW",
        "description": "Central SCADA monitoring facility, spares store, anemometry mast and security gates"
    },
    {
        "parameter_key": "wind_land_acres_per_mw",
        "parameter_name": "Wind Land Footprint Requirement",
        "energy_type": "Wind",
        "category": "Land",
        "default_value": 2.2,
        "unit": "Acres/MW",
        "description": "Turbine footprint, crane pad and right-of-way easement per installed MW"
    },
    {
        "parameter_key": "wind_land_prep_inr_per_acre",
        "parameter_name": "Wind Site Clearing & Crane Pad Preparation",
        "energy_type": "Wind",
        "category": "Land",
        "default_value": 400_000.0,
        "unit": "INR/Acre",
        "description": "Site clearance, heavy load subgrade stabilization and pad grading"
    },

    # GRID & COMMON PARAMETERS
    {
        "parameter_key": "grid_line_inr_per_km",
        "parameter_name": "Transmission Line Evacuation Cost",
        "energy_type": "Common",
        "category": "Grid",
        "default_value": 4_200_000.0,
        "unit": "INR/km",
        "description": "Dedicated 33kV/132kV overhead double-circuit transmission line with towers, conductors and ROW (₹42 Lakhs/km)"
    },
    {
        "parameter_key": "grid_terminal_bay_inr",
        "parameter_name": "Grid Substation Terminal Bay & Switchgear",
        "energy_type": "Common",
        "category": "Grid",
        "default_value": 22_000_000.0,
        "unit": "INR/fixed",
        "description": "Dedicated line feeder bay, circuit breaker, isolators, current/potential transformers and metering at the utility substation"
    },

    # HYBRID SHARED SYNERGIES
    {
        "parameter_key": "hybrid_electrical_synergy_discount_pct",
        "parameter_name": "Hybrid Shared Pooling Substation Synergy Savings",
        "energy_type": "Hybrid",
        "category": "Adjustment",
        "default_value": 20.0,
        "unit": "Percentage",
        "description": "Cost savings from shared power transformers, common 33kV pooling busbar and shared switchyard"
    },
    {
        "parameter_key": "hybrid_grid_synergy_discount_pct",
        "parameter_name": "Hybrid Common Evacuation Line Synergy Savings",
        "energy_type": "Hybrid",
        "category": "Adjustment",
        "default_value": 50.0,
        "unit": "Percentage",
        "description": "Single shared transmission line avoids building separate redundant lines for solar and wind"
    },
    {
        "parameter_key": "hybrid_civil_synergy_discount_pct",
        "parameter_name": "Hybrid Shared Civil & Infrastructure Synergy Savings",
        "energy_type": "Hybrid",
        "category": "Adjustment",
        "default_value": 15.0,
        "unit": "Percentage",
        "description": "Savings on shared master control building, common security fence, perimeter access road"
    },

    # TERRAIN ADJUSTMENT MULTIPLIERS
    {
        "parameter_key": "terrain_slope_rolling_mult",
        "parameter_name": "Rolling Terrain Cost Multiplier (Slope 2°-5°)",
        "energy_type": "Common",
        "category": "Adjustment",
        "default_value": 1.15,
        "unit": "Multiplier",
        "description": "Adjustment factor on civil works and land leveling for rolling topography"
    },
    {
        "parameter_key": "terrain_slope_hilly_mult",
        "parameter_name": "Hilly Terrain Cost Multiplier (Slope 5°-10°)",
        "energy_type": "Common",
        "category": "Adjustment",
        "default_value": 1.35,
        "unit": "Multiplier",
        "description": "Adjustment factor on civil works, foundations and leveling for hilly undulating ground"
    },
    {
        "parameter_key": "terrain_slope_steep_mult",
        "parameter_name": "Steep Slope Cost Multiplier (Slope > 10°)",
        "energy_type": "Common",
        "category": "Adjustment",
        "default_value": 1.65,
        "unit": "Multiplier",
        "description": "Adjustment factor on civil works and foundations for steep gradient terrain"
    },
    {
        "parameter_key": "road_logistics_surcharge_per_km_pct",
        "parameter_name": "Heavy Logistics Road Distance Surcharge Rate",
        "energy_type": "Common",
        "category": "Adjustment",
        "default_value": 1.2,
        "unit": "Pct_per_km",
        "description": "Percentage increase in transport and crane mobilization per km beyond 3 km from paved road"
    }
]

class CostService:
    def ensure_default_assumptions(self, db: Session):
        """
        Populates cost_assumptions table with benchmark rates if empty.
        """
        count = db.query(CostAssumption).count()
        if count == 0:
            logger.info("Seeding default renewable infrastructure cost assumptions...")
            for item in DEFAULT_COST_ASSUMPTIONS:
                assumption = CostAssumption(
                    parameter_key=item["parameter_key"],
                    parameter_name=item["parameter_name"],
                    energy_type=item["energy_type"],
                    category=item["category"],
                    default_value=item["default_value"],
                    current_value=item["default_value"],
                    unit=item["unit"],
                    description=item["description"],
                    is_active=True
                )
                db.add(assumption)
            db.commit()
            logger.info("Cost assumptions seeded successfully.")

    def get_all_assumptions(self, db: Session) -> List[CostAssumptionItem]:
        self.ensure_default_assumptions(db)
        records = db.query(CostAssumption).filter(CostAssumption.is_active == True).all()
        return [
            CostAssumptionItem(
                id=r.id,
                parameter_key=r.parameter_key,
                parameter_name=r.parameter_name,
                energy_type=r.energy_type,
                category=r.category,
                default_value=r.default_value,
                current_value=r.current_value,
                unit=r.unit,
                description=r.description
            )
            for r in records
        ]

    def update_assumptions(self, db: Session, updates: Dict[str, float]) -> List[CostAssumptionItem]:
        self.ensure_default_assumptions(db)
        for key, val in updates.items():
            record = db.query(CostAssumption).filter(CostAssumption.parameter_key == key).first()
            if record:
                record.current_value = float(val)
        db.commit()
        return self.get_all_assumptions(db)

    def reset_assumptions(self, db: Session) -> List[CostAssumptionItem]:
        self.ensure_default_assumptions(db)
        records = db.query(CostAssumption).all()
        for r in records:
            r.current_value = r.default_value
        db.commit()
        return self.get_all_assumptions(db)

    def _get_active_assumption_map(self, db: Session, overrides: Optional[Dict[str, float]] = None) -> Dict[str, float]:
        self.ensure_default_assumptions(db)
        records = db.query(CostAssumption).filter(CostAssumption.is_active == True).all()
        val_map = {r.parameter_key: r.current_value for r in records}
        if overrides:
            for k, v in overrides.items():
                if v is not None:
                    val_map[k] = float(v)
        return val_map

    def calculate_cost(
        self,
        db: Session,
        request: CostEstimationRequest
    ) -> CostEstimationResponse:
        """
        Executes a transparent, itemized infrastructure CAPEX estimation for Solar, Wind, or Hybrid.
        Incorporates terrain slope adjustments, road access logistics, and grid evacuation distance.
        """
        # Auto-fill from candidate site if site_id provided
        if request.site_id:
            site = db.query(CandidateSite).filter(CandidateSite.id == request.site_id).first()
            if site:
                if request.location_name == "Selected Location":
                    request.location_name = site.name
                if request.state == "India":
                    request.state = site.state
                if request.distance_to_grid_km is None or request.distance_to_grid_km == 0:
                    request.distance_to_grid_km = site.distance_to_grid_km
                if request.distance_to_road_km is None:
                    request.distance_to_road_km = site.distance_to_road_km
                if request.slope_deg is None:
                    request.slope_deg = site.slope_deg
                if not request.terrain_type or request.terrain_type == "Flat Plain":
                    request.terrain_type = site.terrain_type

        # Fetch assumption rates
        assumptions = self._get_active_assumption_map(db, request.custom_assumptions)

        energy_type = request.energy_type.capitalize()
        if energy_type not in ["Solar", "Wind", "Hybrid"]:
            raise HTTPException(status_code=400, detail="energy_type must be Solar, Wind, or Hybrid.")

        # Determine capacities
        total_mw = float(request.capacity_mw)
        if total_mw <= 0:
            raise HTTPException(status_code=400, detail="Capacity must be greater than 0 MW.")

        if energy_type == "Hybrid":
            if request.solar_capacity_mw is not None and request.wind_capacity_mw is not None:
                solar_mw = float(request.solar_capacity_mw)
                wind_mw = float(request.wind_capacity_mw)
                total_mw = solar_mw + wind_mw
            else:
                # Default 60% Solar, 40% Wind
                solar_mw = round(total_mw * 0.60, 2)
                wind_mw = round(total_mw * 0.40, 2)
        elif energy_type == "Solar":
            solar_mw = total_mw
            wind_mw = 0.0
        else:
            solar_mw = 0.0
            wind_mw = total_mw

        # Slope & Terrain Multiplier
        slope = float(request.slope_deg or 1.5)
        if slope <= 2.0:
            terrain_mult = 1.00
            terrain_desc = "Flat Plain (≤ 2° slope: Standard baseline)"
        elif slope <= 5.0:
            terrain_mult = assumptions.get("terrain_slope_rolling_mult", 1.15)
            terrain_desc = f"Rolling Terrain (2°-5° slope: +{int((terrain_mult-1)*100)}% civil/grading)"
        elif slope <= 10.0:
            terrain_mult = assumptions.get("terrain_slope_hilly_mult", 1.35)
            terrain_desc = f"Hilly Undulating (5°-10° slope: +{int((terrain_mult-1)*100)}% terracing & foundations)"
        else:
            terrain_mult = assumptions.get("terrain_slope_steep_mult", 1.65)
            terrain_desc = f"Steep Terrain (>10° slope: +{int((terrain_mult-1)*100)}% specialized engineering)"

        # Road Logistics Multiplier
        road_km = float(request.distance_to_road_km or 2.0)
        surcharge_rate = assumptions.get("road_logistics_surcharge_per_km_pct", 1.2)
        if road_km > 3.0:
            excess_km = road_km - 3.0
            road_mult = 1.0 + (excess_km * (surcharge_rate / 100.0))
        else:
            road_mult = 1.00

        # Land Requirement
        if request.land_requirement_acres and request.land_requirement_acres > 0:
            land_acres = float(request.land_requirement_acres)
        else:
            if energy_type == "Solar":
                land_acres = solar_mw * assumptions.get("solar_land_acres_per_mw", 4.0)
            elif energy_type == "Wind":
                land_acres = wind_mw * assumptions.get("wind_land_acres_per_mw", 2.2)
            else:
                # Hybrid land efficiency: solar requires 3.8 acres/MW, wind co-located adds 1.0 acres/MW
                land_acres = (solar_mw * 3.8) + (wind_mw * 1.0)
            land_acres = round(land_acres, 1)

        # Components List
        components: List[CostComponentItem] = []

        # ---------------- SOLAR COMPONENTS ----------------
        if solar_mw > 0:
            # 1. Solar Panels
            panel_rate = assumptions.get("solar_panels_inr_per_mw", 18_500_000.0)
            cost_panels = solar_mw * panel_rate
            components.append(CostComponentItem(
                name="Solar PV Modules (Mono PERC / TOPCon)",
                category="Equipment",
                base_unit_rate=panel_rate,
                unit="INR/MW",
                quantity=solar_mw,
                quantity_unit="MW",
                adjustment_factor=1.0,
                total_cost_inr=cost_panels,
                total_cost_crores=round(cost_panels / INR_PER_CRORE, 2),
                percentage_of_total=0.0,
                calculation_formula=f"{solar_mw:.1f} MW × ₹{panel_rate/INR_PER_CRORE:.2f} Cr/MW",
                description="Tier-1 bifacial photovoltaic panels, high temperature coefficient tolerance"
            ))

            # 2. Inverters
            inv_rate = assumptions.get("solar_inverter_inr_per_mw", 3_200_000.0)
            cost_inv = solar_mw * inv_rate
            components.append(CostComponentItem(
                name="Solar Inverters & Power Conditioning Units",
                category="Equipment",
                base_unit_rate=inv_rate,
                unit="INR/MW",
                quantity=solar_mw,
                quantity_unit="MW",
                adjustment_factor=1.0,
                total_cost_inr=cost_inv,
                total_cost_crores=round(cost_inv / INR_PER_CRORE, 2),
                percentage_of_total=0.0,
                calculation_formula=f"{solar_mw:.1f} MW × ₹{inv_rate/INR_PER_CRORE:.2f} Cr/MW",
                description="Central or string inverters with Maximum Power Point Tracking (MPPT)"
            ))

            # 3. Mounting Structures
            mount_rate = assumptions.get("solar_mounting_inr_per_mw", 3_600_000.0)
            cost_mount = solar_mw * mount_rate * terrain_mult
            components.append(CostComponentItem(
                name="Module Mounting Structures (MMS)",
                category="Equipment",
                base_unit_rate=mount_rate,
                unit="INR/MW",
                quantity=solar_mw,
                quantity_unit="MW",
                adjustment_factor=terrain_mult,
                total_cost_inr=cost_mount,
                total_cost_crores=round(cost_mount / INR_PER_CRORE, 2),
                percentage_of_total=0.0,
                calculation_formula=f"{solar_mw:.1f} MW × ₹{mount_rate/INR_PER_CRORE:.2f} Cr/MW × {terrain_mult:.2f} (Terrain)",
                description="Galvanized steel structures engineered for local wind shear and terrain gradient"
            ))

            # 4. Solar Electrical
            solar_elec_rate = assumptions.get("solar_electrical_inr_per_mw", 3_400_000.0)
            # If hybrid, apply shared electrical synergy discount to solar portion
            elec_discount = (1.0 - assumptions.get("hybrid_electrical_synergy_discount_pct", 20.0)/100.0) if energy_type == "Hybrid" else 1.0
            cost_solar_elec = solar_mw * solar_elec_rate * elec_discount
            formula_elec = f"{solar_mw:.1f} MW × ₹{solar_elec_rate/INR_PER_CRORE:.2f} Cr/MW"
            if energy_type == "Hybrid":
                formula_elec += f" × {elec_discount:.2f} (Hybrid Shared Substation Synergy)"
            components.append(CostComponentItem(
                name="Solar DC/AC Cabling & Pooling Switchgear",
                category="Equipment",
                base_unit_rate=solar_elec_rate,
                unit="INR/MW",
                quantity=solar_mw,
                quantity_unit="MW",
                adjustment_factor=elec_discount,
                total_cost_inr=cost_solar_elec,
                total_cost_crores=round(cost_solar_elec / INR_PER_CRORE, 2),
                percentage_of_total=0.0,
                calculation_formula=formula_elec,
                description="Solar array DC cables, combiner boxes, inverter step-up transformers and 33kV switchgear"
            ))

            # 5. Solar Installation & Labour
            inst_rate = assumptions.get("solar_install_labour_inr_per_mw", 2_800_000.0)
            cost_solar_inst = solar_mw * inst_rate * road_mult
            components.append(CostComponentItem(
                name="Solar Installation, Erection & Commissioning Labour",
                category="Installation",
                base_unit_rate=inst_rate,
                unit="INR/MW",
                quantity=solar_mw,
                quantity_unit="MW",
                adjustment_factor=road_mult,
                total_cost_inr=cost_solar_inst,
                total_cost_crores=round(cost_solar_inst / INR_PER_CRORE, 2),
                percentage_of_total=0.0,
                calculation_formula=f"{solar_mw:.1f} MW × ₹{inst_rate/INR_PER_CRORE:.2f} Cr/MW × {road_mult:.2f} (Logistics)",
                description="Piling, mechanical tracker assembly, module fixing, cable termination and trial run testing"
            ))

            # 6. Solar Civil Infrastructure
            solar_civil_rate = assumptions.get("solar_civil_infra_inr_per_mw", 1_800_000.0)
            civil_discount = (1.0 - assumptions.get("hybrid_civil_synergy_discount_pct", 15.0)/100.0) if energy_type == "Hybrid" else 1.0
            cost_solar_civil = solar_mw * solar_civil_rate * terrain_mult * civil_discount
            components.append(CostComponentItem(
                name="Solar Civil Facilities & Internal Roads",
                category="Civil",
                base_unit_rate=solar_civil_rate,
                unit="INR/MW",
                quantity=solar_mw,
                quantity_unit="MW",
                adjustment_factor=terrain_mult * civil_discount,
                total_cost_inr=cost_solar_civil,
                total_cost_crores=round(cost_solar_civil / INR_PER_CRORE, 2),
                percentage_of_total=0.0,
                calculation_formula=f"{solar_mw:.1f} MW × ₹{solar_civil_rate/INR_PER_CRORE:.2f} Cr/MW × {terrain_mult:.2f} (Slope) × {civil_discount:.2f} (Synergy)",
                description="Control building, perimeter security fencing, stormwater culverts and internal service roads"
            ))

        # ---------------- WIND COMPONENTS ----------------
        if wind_mw > 0:
            # 1. Wind Turbines
            wtg_rate = assumptions.get("wind_turbine_inr_per_mw", 42_000_000.0)
            cost_wtg = wind_mw * wtg_rate
            components.append(CostComponentItem(
                name="Wind Turbine Generators (WTGs) & Towers",
                category="Equipment",
                base_unit_rate=wtg_rate,
                unit="INR/MW",
                quantity=wind_mw,
                quantity_unit="MW",
                adjustment_factor=1.0,
                total_cost_inr=cost_wtg,
                total_cost_crores=round(cost_wtg / INR_PER_CRORE, 2),
                percentage_of_total=0.0,
                calculation_formula=f"{wind_mw:.1f} MW × ₹{wtg_rate/INR_PER_CRORE:.2f} Cr/MW",
                description="Utility turbines with nacelle, permanent magnet generator, composite blades and 120m+ tower sections"
            ))

            # 2. Wind Foundations
            found_rate = assumptions.get("wind_foundation_inr_per_mw", 4_800_000.0)
            cost_found = wind_mw * found_rate * terrain_mult
            components.append(CostComponentItem(
                name="Wind Turbine Deep Reinforced Foundations",
                category="Civil",
                base_unit_rate=found_rate,
                unit="INR/MW",
                quantity=wind_mw,
                quantity_unit="MW",
                adjustment_factor=terrain_mult,
                total_cost_inr=cost_found,
                total_cost_crores=round(cost_found / INR_PER_CRORE, 2),
                percentage_of_total=0.0,
                calculation_formula=f"{wind_mw:.1f} MW × ₹{found_rate/INR_PER_CRORE:.2f} Cr/MW × {terrain_mult:.2f} (Terrain)",
                description="Octagonal mass-concrete gravity/piled foundation caps, anchor bolts and rock consolidation"
            ))

            # 3. Wind Transportation & Installation
            wind_trans_rate = assumptions.get("wind_transport_install_inr_per_mw", 4_200_000.0)
            cost_wind_trans = wind_mw * wind_trans_rate * road_mult
            components.append(CostComponentItem(
                name="Heavy Blade Transport & Main Crane Erection",
                category="Installation",
                base_unit_rate=wind_trans_rate,
                unit="INR/MW",
                quantity=wind_mw,
                quantity_unit="MW",
                adjustment_factor=road_mult,
                total_cost_inr=cost_wind_trans,
                total_cost_crores=round(cost_wind_trans / INR_PER_CRORE, 2),
                percentage_of_total=0.0,
                calculation_formula=f"{wind_mw:.1f} MW × ₹{wind_trans_rate/INR_PER_CRORE:.2f} Cr/MW × {road_mult:.2f} (Logistics)",
                description="Multi-axle hydraulic trailer haulage for 70m+ blades, 600-800 ton crawler crane mobilization and tower tandem lifting"
            ))

            # 4. Wind Electrical BOP
            wind_elec_rate = assumptions.get("wind_electrical_inr_per_mw", 4_400_000.0)
            elec_discount = (1.0 - assumptions.get("hybrid_electrical_synergy_discount_pct", 20.0)/100.0) if energy_type == "Hybrid" else 1.0
            cost_wind_elec = wind_mw * wind_elec_rate * elec_discount
            formula_welec = f"{wind_mw:.1f} MW × ₹{wind_elec_rate/INR_PER_CRORE:.2f} Cr/MW"
            if energy_type == "Hybrid":
                formula_welec += f" × {elec_discount:.2f} (Hybrid Shared Pooling Synergy)"
            components.append(CostComponentItem(
                name="Wind Internal MV Cabling & Step-Up Transformers",
                category="Equipment",
                base_unit_rate=wind_elec_rate,
                unit="INR/MW",
                quantity=wind_mw,
                quantity_unit="MW",
                adjustment_factor=elec_discount,
                total_cost_inr=cost_wind_elec,
                total_cost_crores=round(cost_wind_elec / INR_PER_CRORE, 2),
                percentage_of_total=0.0,
                calculation_formula=formula_welec,
                description="Base-of-tower 0.69/33kV unit transformers, underground trench cabling, circuit breakers and lightning surge protection"
            ))

            # 5. Wind Internal Heavy Roads & Hardstands
            wind_road_rate = assumptions.get("wind_internal_roads_inr_per_mw", 2_200_000.0)
            cost_wind_road = wind_mw * wind_road_rate * terrain_mult
            components.append(CostComponentItem(
                name="Wind Crane Hardstands & Heavy Access Tracks",
                category="Civil",
                base_unit_rate=wind_road_rate,
                unit="INR/MW",
                quantity=wind_mw,
                quantity_unit="MW",
                adjustment_factor=terrain_mult,
                total_cost_inr=cost_wind_road,
                total_cost_crores=round(cost_wind_road / INR_PER_CRORE, 2),
                percentage_of_total=0.0,
                calculation_formula=f"{wind_mw:.1f} MW × ₹{wind_road_rate/INR_PER_CRORE:.2f} Cr/MW × {terrain_mult:.2f} (Slope)",
                description="Engineered high-bearing compacted crushed-gravel pathways and heavy-duty 40m crane boom pads"
            ))

            # 6. Wind Civil & O&M Facility
            wind_civil_rate = assumptions.get("wind_civil_infra_inr_per_mw", 1_600_000.0)
            civil_discount = (1.0 - assumptions.get("hybrid_civil_synergy_discount_pct", 15.0)/100.0) if energy_type == "Hybrid" else 1.0
            cost_wind_civil = wind_mw * wind_civil_rate * terrain_mult * civil_discount
            components.append(CostComponentItem(
                name="Wind O&M Master Building & SCADA Center",
                category="Civil",
                base_unit_rate=wind_civil_rate,
                unit="INR/MW",
                quantity=wind_mw,
                quantity_unit="MW",
                adjustment_factor=terrain_mult * civil_discount,
                total_cost_inr=cost_wind_civil,
                total_cost_crores=round(cost_wind_civil / INR_PER_CRORE, 2),
                percentage_of_total=0.0,
                calculation_formula=f"{wind_mw:.1f} MW × ₹{wind_civil_rate/INR_PER_CRORE:.2f} Cr/MW × {terrain_mult:.2f} (Slope) × {civil_discount:.2f} (Synergy)",
                description="Central control room, meteorological calibration mast, spares warehouse and security checkpoint"
            ))

        # ---------------- LAND DEVELOPMENT (ALL TYPES) ----------------
        land_prep_rate = assumptions.get("solar_land_prep_inr_per_acre", 350_000.0) if energy_type == "Solar" else assumptions.get("wind_land_prep_inr_per_acre", 400_000.0)
        cost_land = land_acres * land_prep_rate * terrain_mult
        components.append(CostComponentItem(
            name="Land Development, Leveling & Perimeter Boundary",
            category="Land",
            base_unit_rate=land_prep_rate,
            unit="INR/Acre",
            quantity=land_acres,
            quantity_unit="Acres",
            adjustment_factor=terrain_mult,
            total_cost_inr=cost_land,
            total_cost_crores=round(cost_land / INR_PER_CRORE, 2),
            percentage_of_total=0.0,
            calculation_formula=f"{land_acres:.1f} Acres × ₹{land_prep_rate:,.0f}/Acre × {terrain_mult:.2f} (Slope)",
            description="Site grading, topsoil stabilization, security chain-link fencing, gate complexes and surface water runoff channels"
        ))

        # ---------------- GRID CONNECTION (SHARED FOR HYBRID) ----------------
        grid_km = float(request.distance_to_grid_km)
        line_rate = assumptions.get("grid_line_inr_per_km", 4_200_000.0)
        bay_rate = assumptions.get("grid_terminal_bay_inr", 22_000_000.0)

        # Transmission Line
        cost_line = grid_km * line_rate
        components.append(CostComponentItem(
            name="Dedicated Overhead Transmission Evacuation Line",
            category="Grid",
            base_unit_rate=line_rate,
            unit="INR/km",
            quantity=grid_km,
            quantity_unit="km",
            adjustment_factor=1.0,
            total_cost_inr=cost_line,
            total_cost_crores=round(cost_line / INR_PER_CRORE, 2),
            percentage_of_total=0.0,
            calculation_formula=f"{grid_km:.1f} km × ₹{line_rate/INR_PER_CRORE:.2f} Cr/km",
            description="Dedicated 33kV/132kV double-circuit overhead evacuation line connecting plant to state grid utility substation"
        ))

        # Terminal Substation Bay
        components.append(CostComponentItem(
            name="Grid Substation Dedicated Feeder Bay & Switchgear",
            category="Grid",
            base_unit_rate=bay_rate,
            unit="INR/bay",
            quantity=1.0,
            quantity_unit="Bay",
            adjustment_factor=1.0,
            total_cost_inr=bay_rate,
            total_cost_crores=round(bay_rate / INR_PER_CRORE, 2),
            percentage_of_total=0.0,
            calculation_formula=f"1 Dedicated Bay × ₹{bay_rate/INR_PER_CRORE:.2f} Cr",
            description="High voltage breaker bay, metering equipment, CT/PT instrument transformers and relay protection panels at grid substation"
        ))

        # ---------------- CALCULATE TOTALS & SYNERGY SAVINGS ----------------
        total_inr = sum(c.total_cost_inr for c in components)
        total_crores = round(total_inr / INR_PER_CRORE, 2)
        cost_per_mw_crores = round(total_crores / total_mw, 2)

        # Update percentage of total for each component
        for c in components:
            c.percentage_of_total = round((c.total_cost_inr / total_inr) * 100.0, 1) if total_inr > 0 else 0.0

        # Calculate category sums
        categories_dict: Dict[str, List[CostComponentItem]] = {
            "Equipment": [],
            "Land": [],
            "Grid": [],
            "Installation": [],
            "Civil": []
        }
        for c in components:
            if c.category in categories_dict:
                categories_dict[c.category].append(c)

        category_summaries: List[CategoryCostSummary] = []
        for cat_name, cat_items in categories_dict.items():
            cat_inr = sum(it.total_cost_inr for it in cat_items)
            category_summaries.append(CategoryCostSummary(
                category=cat_name,
                total_inr=cat_inr,
                total_crores=round(cat_inr / INR_PER_CRORE, 2),
                percentage_of_total=round((cat_inr / total_inr) * 100.0, 1) if total_inr > 0 else 0.0,
                components=cat_items
            ))

        # Hybrid Synergy Calculation:
        shared_savings_inr = 0.0
        synergy_details = None
        if energy_type == "Hybrid":
            # Compare what separate standalone solar and standalone wind would have cost:
            # Standalone redundant line cost saved:
            standalone_grid_saved = (grid_km * line_rate + bay_rate) * 0.50
            # Electrical pooling saved:
            elec_saved = ((solar_mw * assumptions.get("solar_electrical_inr_per_mw", 3_400_000.0)) +
                          (wind_mw * assumptions.get("wind_electrical_inr_per_mw", 4_400_000.0))) * (assumptions.get("hybrid_electrical_synergy_discount_pct", 20.0)/100.0)
            # Civil saved:
            civil_saved = ((solar_mw * assumptions.get("solar_civil_infra_inr_per_mw", 1_800_000.0)) +
                           (wind_mw * assumptions.get("wind_civil_infra_inr_per_mw", 1_600_000.0))) * (assumptions.get("hybrid_civil_synergy_discount_pct", 15.0)/100.0)
            shared_savings_inr = standalone_grid_saved + elec_saved + civil_saved
            synergy_details = {
                "shared_grid_savings_crores": round(standalone_grid_saved / INR_PER_CRORE, 2),
                "shared_substation_savings_crores": round(elec_saved / INR_PER_CRORE, 2),
                "shared_civil_savings_crores": round(civil_saved / INR_PER_CRORE, 2),
                "total_synergy_savings_crores": round(shared_savings_inr / INR_PER_CRORE, 2),
                "description": "Shared transmission corridor, combined pooling substation and unified O&M facilities eliminate duplicate infrastructure."
            }

        equipment_sum = next((c.total_inr for c in category_summaries if c.category == "Equipment"), 0.0)
        land_sum = next((c.total_inr for c in category_summaries if c.category == "Land"), 0.0)
        grid_sum = next((c.total_inr for c in category_summaries if c.category == "Grid"), 0.0)
        install_sum = next((c.total_inr for c in category_summaries if c.category == "Installation"), 0.0)
        civil_sum = next((c.total_inr for c in category_summaries if c.category == "Civil"), 0.0)

        # Store record in database
        try:
            db_record = CostEstimation(
                site_id=request.site_id,
                site_name=request.location_name,
                state=request.state,
                energy_type=energy_type,
                capacity_mw=total_mw,
                solar_capacity_mw=solar_mw if energy_type == "Hybrid" else None,
                wind_capacity_mw=wind_mw if energy_type == "Hybrid" else None,
                land_requirement_acres=land_acres,
                grid_distance_km=grid_km,
                road_distance_km=road_km,
                terrain_type=terrain_desc,
                slope_deg=slope,
                equipment_cost_inr=equipment_sum,
                land_development_cost_inr=land_sum,
                grid_connection_cost_inr=grid_sum,
                installation_cost_inr=install_sum,
                civil_infrastructure_cost_inr=civil_sum,
                shared_synergy_savings_inr=shared_savings_inr,
                total_cost_inr=total_inr,
                total_cost_crores=total_crores,
                cost_per_mw_crores=cost_per_mw_crores,
                cost_breakdown=[c.model_dump() for c in components],
                assumptions_snapshot=assumptions
            )
            db.add(db_record)
            db.commit()
        except Exception as e:
            db.rollback()
            logger.warning(f"Could not persist cost estimation log: {e}")

        return CostEstimationResponse(
            location_name=request.location_name,
            state=request.state,
            energy_type=energy_type,
            capacity_mw=total_mw,
            solar_capacity_mw=solar_mw if energy_type == "Hybrid" else None,
            wind_capacity_mw=wind_mw if energy_type == "Hybrid" else None,
            land_requirement_acres=land_acres,
            distance_to_grid_km=grid_km,
            distance_to_road_km=road_km,
            terrain_type=terrain_desc,
            slope_deg=slope,
            terrain_adjustment_multiplier=terrain_mult,
            road_distance_adjustment_multiplier=road_mult,
            grid_distance_adjustment_multiplier=1.0,
            equipment_cost_crores=round(equipment_sum / INR_PER_CRORE, 2),
            equipment_cost_inr=equipment_sum,
            land_development_cost_crores=round(land_sum / INR_PER_CRORE, 2),
            land_development_cost_inr=land_sum,
            grid_connection_cost_crores=round(grid_sum / INR_PER_CRORE, 2),
            grid_connection_cost_inr=grid_sum,
            installation_cost_crores=round(install_sum / INR_PER_CRORE, 2),
            installation_cost_inr=install_sum,
            civil_infrastructure_cost_crores=round(civil_sum / INR_PER_CRORE, 2),
            civil_infrastructure_cost_inr=civil_sum,
            shared_synergy_savings_crores=round(shared_savings_inr / INR_PER_CRORE, 2),
            shared_synergy_savings_inr=shared_savings_inr,
            synergy_details=synergy_details,
            total_cost_crores=total_crores,
            total_cost_inr=total_inr,
            cost_per_mw_crores=cost_per_mw_crores,
            categories=category_summaries,
            all_components=components,
            assumptions_used=assumptions
        )

    def compare_costs(
        self,
        db: Session,
        mode: str,
        base_request: CostEstimationRequest,
        comparison_site_ids: Optional[List[int]] = None,
        comparison_capacities: Optional[List[float]] = None
    ) -> CostComparisonResponse:
        """
        Supports 3 comparison dimensions:
        1. 'locations': Compare base location against candidate sites from database.
        2. 'energy_types': Compare Solar vs Wind vs Hybrid for same location.
        3. 'capacities': Compare different installed capacities (e.g. 25 MW, 50 MW, 100 MW, 250 MW).
        """
        items: List[CostComparisonItem] = []

        if mode == "locations":
            # 1. Base location
            base_est = self.calculate_cost(db, base_request)
            items.append(CostComparisonItem(
                label=f"{base_est.location_name} ({base_est.energy_type})",
                energy_type=base_est.energy_type,
                capacity_mw=base_est.capacity_mw,
                location_name=base_est.location_name,
                state=base_est.state,
                equipment_crores=base_est.equipment_cost_crores,
                land_crores=base_est.land_development_cost_crores,
                grid_crores=base_est.grid_connection_cost_crores,
                installation_crores=base_est.installation_cost_crores,
                civil_crores=base_est.civil_infrastructure_cost_crores,
                total_crores=base_est.total_cost_crores,
                cost_per_mw_crores=base_est.cost_per_mw_crores
            ))

            # Additional sites
            site_ids = comparison_site_ids or []
            for s_id in site_ids:
                site = db.query(CandidateSite).filter(CandidateSite.id == s_id).first()
                if not site:
                    continue
                req = CostEstimationRequest(
                    site_id=site.id,
                    location_name=site.name,
                    state=site.state,
                    energy_type=base_request.energy_type,
                    capacity_mw=base_request.capacity_mw,
                    distance_to_grid_km=site.distance_to_grid_km,
                    distance_to_road_km=site.distance_to_road_km,
                    terrain_type=site.terrain_type,
                    slope_deg=site.slope_deg
                )
                est = self.calculate_cost(db, req)
                items.append(CostComparisonItem(
                    label=f"{site.name} ({site.state})",
                    energy_type=est.energy_type,
                    capacity_mw=est.capacity_mw,
                    location_name=site.name,
                    state=site.state,
                    equipment_crores=est.equipment_cost_crores,
                    land_crores=est.land_development_cost_crores,
                    grid_crores=est.grid_connection_cost_crores,
                    installation_crores=est.installation_cost_crores,
                    civil_crores=est.civil_infrastructure_cost_crores,
                    total_crores=est.total_cost_crores,
                    cost_per_mw_crores=est.cost_per_mw_crores
                ))

        elif mode == "energy_types":
            for etype in ["Solar", "Wind", "Hybrid"]:
                req = CostEstimationRequest(
                    site_id=base_request.site_id,
                    location_name=base_request.location_name,
                    state=base_request.state,
                    energy_type=etype,
                    capacity_mw=base_request.capacity_mw,
                    distance_to_grid_km=base_request.distance_to_grid_km,
                    distance_to_road_km=base_request.distance_to_road_km,
                    terrain_type=base_request.terrain_type,
                    slope_deg=base_request.slope_deg
                )
                est = self.calculate_cost(db, req)
                items.append(CostComparisonItem(
                    label=f"{etype} Plant ({est.capacity_mw:.0f} MW)",
                    energy_type=etype,
                    capacity_mw=est.capacity_mw,
                    location_name=est.location_name,
                    state=est.state,
                    equipment_crores=est.equipment_cost_crores,
                    land_crores=est.land_development_cost_crores,
                    grid_crores=est.grid_connection_cost_crores,
                    installation_crores=est.installation_cost_crores,
                    civil_crores=est.civil_infrastructure_cost_crores,
                    total_crores=est.total_cost_crores,
                    cost_per_mw_crores=est.cost_per_mw_crores
                ))

        elif mode == "capacities":
            caps = comparison_capacities or [25.0, 50.0, 100.0, 250.0]
            for cap in caps:
                req = CostEstimationRequest(
                    site_id=base_request.site_id,
                    location_name=base_request.location_name,
                    state=base_request.state,
                    energy_type=base_request.energy_type,
                    capacity_mw=cap,
                    distance_to_grid_km=base_request.distance_to_grid_km,
                    distance_to_road_km=base_request.distance_to_road_km,
                    terrain_type=base_request.terrain_type,
                    slope_deg=base_request.slope_deg
                )
                est = self.calculate_cost(db, req)
                items.append(CostComparisonItem(
                    label=f"{cap:.0f} MW Capacity",
                    energy_type=est.energy_type,
                    capacity_mw=cap,
                    location_name=est.location_name,
                    state=est.state,
                    equipment_crores=est.equipment_cost_crores,
                    land_crores=est.land_development_cost_crores,
                    grid_crores=est.grid_connection_cost_crores,
                    installation_crores=est.installation_cost_crores,
                    civil_crores=est.civil_infrastructure_cost_crores,
                    total_crores=est.total_cost_crores,
                    cost_per_mw_crores=est.cost_per_mw_crores
                ))

        return CostComparisonResponse(
            comparison_mode=mode,
            items=items
        )

    def generate_pdf_report(self, est: CostEstimationResponse) -> bytes:
        """
        Creates an executive printable PDF setup cost estimation report
        with GreenSelect branding, breakdown tables, and methodology notes.
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()

        # Custom styles
        header_title = ParagraphStyle(
            'HeaderTitle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=18,
            leading=22,
            textColor=colors.HexColor('#065f46')
        )
        header_sub = ParagraphStyle(
            'HeaderSub',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            leading=12,
            textColor=colors.HexColor('#475569')
        )
        section_h = ParagraphStyle(
            'SectionHeader',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=12,
            leading=16,
            textColor=colors.HexColor('#0f172a'),
            spaceBefore=10,
            spaceAfter=4
        )
        body_text = ParagraphStyle(
            'Body',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=8.5,
            leading=11,
            textColor=colors.HexColor('#1e293b')
        )
        bold_text = ParagraphStyle(
            'BoldBody',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=8.5,
            leading=11,
            textColor=colors.HexColor('#0f172a')
        )
        small_text = ParagraphStyle(
            'Small',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=7.5,
            leading=9.5,
            textColor=colors.HexColor('#64748b')
        )

        story = []

        # 1. Header Banner
        header_table = Table([
            [
                Paragraph("<b>GreenSelect INDIA</b> — Renewable Energy Decision Platform", header_title),
                Paragraph("<b>CONFIDENTIAL PLANNING DOSSIER</b><br/>Setup CAPEX Cost Estimation Report", header_sub)
            ]
        ], colWidths=[340, 180])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('ALIGN', (1,0), (1,0), 'RIGHT')
        ]))
        story.append(header_table)
        story.append(Spacer(1, 8))
        story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#10b981'), spaceAfter=10))

        # 2. Executive Summary Box
        summary_data = [
            [
                Paragraph("<b>Location:</b>", bold_text), Paragraph(f"{est.location_name}, {est.state}", body_text),
                Paragraph("<b>Energy Type:</b>", bold_text), Paragraph(f"{est.energy_type} Power Plant", body_text)
            ],
            [
                Paragraph("<b>Installed Capacity:</b>", bold_text), Paragraph(f"<b>{est.capacity_mw:.1f} MW</b>", bold_text),
                Paragraph("<b>Total Estimated Setup:</b>", bold_text), Paragraph(f"<font color='#047857' size='11'><b>₹ {est.total_cost_crores:,.2f} Crores</b></font>", body_text)
            ],
            [
                Paragraph("<b>Cost per MW:</b>", bold_text), Paragraph(f"₹ {est.cost_per_mw_crores:.2f} Cr / MW", body_text),
                Paragraph("<b>Land Requirement:</b>", bold_text), Paragraph(f"{est.land_requirement_acres:,.1f} Acres", body_text)
            ],
            [
                Paragraph("<b>Grid Distance:</b>", bold_text), Paragraph(f"{est.distance_to_grid_km:.1f} km to Evacuation Point", body_text),
                Paragraph("<b>Terrain Topography:</b>", bold_text), Paragraph(f"{est.terrain_type} ({est.slope_deg:.1f}° slope)", body_text)
            ]
        ]
        if est.energy_type == "Hybrid" and est.shared_synergy_savings_crores > 0:
            summary_data.append([
                Paragraph("<b>Shared Synergy Savings:</b>", bold_text),
                Paragraph(f"<font color='#0284c7'><b>₹ {est.shared_synergy_savings_crores:.2f} Crores Saved</b> (Shared Substation & Grid Line)</font>", body_text),
                Paragraph("<b>Configuration:</b>", bold_text),
                Paragraph(f"{est.solar_capacity_mw:.1f} MW Solar + {est.wind_capacity_mw:.1f} MW Wind", body_text)
            ])

        sum_table = Table(summary_data, colWidths=[120, 140, 120, 140])
        sum_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
        story.append(sum_table)
        story.append(Spacer(1, 12))

        # 3. Itemized Cost Breakdown Table
        story.append(Paragraph("1. Itemized Infrastructure Cost Breakdown", section_h))

        table_rows = [
            [
                Paragraph("<b>Component Name</b>", bold_text),
                Paragraph("<b>Category</b>", bold_text),
                Paragraph("<b>Quantity / Unit</b>", bold_text),
                Paragraph("<b>Calculation Formula / Basis</b>", bold_text),
                Paragraph("<b>Cost (₹ Cr)</b>", bold_text),
                Paragraph("<b>Share</b>", bold_text)
            ]
        ]

        for comp in est.all_components:
            table_rows.append([
                Paragraph(f"<b>{comp.name}</b><br/><font size='6.5' color='#64748b'>{comp.description[:60]}...</font>", body_text),
                Paragraph(comp.category, body_text),
                Paragraph(f"{comp.quantity:.1f} {comp.quantity_unit}", body_text),
                Paragraph(comp.calculation_formula, small_text),
                Paragraph(f"₹ {comp.total_cost_crores:.2f}", bold_text),
                Paragraph(f"{comp.percentage_of_total:.1f}%", body_text)
            ])

        # Grand Total Row
        table_rows.append([
            Paragraph("<b>TOTAL ESTIMATED SETUP COST (CAPEX)</b>", bold_text),
            Paragraph("<b>ALL</b>", bold_text),
            Paragraph(f"<b>{est.capacity_mw:.1f} MW</b>", bold_text),
            Paragraph("<b>Turnkey Engineering, Procurement & Construction (EPC)</b>", bold_text),
            Paragraph(f"<b>₹ {est.total_cost_crores:,.2f} Cr</b>", bold_text),
            Paragraph("<b>100.0%</b>", bold_text)
        ])

        breakdown_table = Table(table_rows, colWidths=[130, 60, 65, 165, 60, 40])
        breakdown_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#065f46')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
            ('BACKGROUND', (0,-1), (-1,-1), colors.HexColor('#e6f4ea')),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('TOPPADDING', (0,0), (-1,-1), 3),
            ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ]))
        story.append(breakdown_table)
        story.append(Spacer(1, 10))

        # 4. Category Summary Subtotals
        story.append(Paragraph("2. Category Subtotals", section_h))
        cat_data = [
            [
                Paragraph("<b>Category</b>", bold_text),
                Paragraph("<b>Total (INR ₹)</b>", bold_text),
                Paragraph("<b>Total (₹ Crores)</b>", bold_text),
                Paragraph("<b>Share (%)</b>", bold_text)
            ]
        ]
        for cat in est.categories:
            cat_data.append([
                Paragraph(cat.category, body_text),
                Paragraph(f"₹ {cat.total_inr:,.0f}", body_text),
                Paragraph(f"₹ {cat.total_crores:.2f} Cr", bold_text),
                Paragraph(f"{cat.percentage_of_total:.1f}%", body_text)
            ])

        cat_table = Table(cat_data, colWidths=[140, 150, 130, 100])
        cat_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1e293b')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
            ('TOPPADDING', (0,0), (-1,-1), 3),
            ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ]))
        story.append(cat_table)
        story.append(Spacer(1, 10))

        # 5. Planning Methodology & Disclaimer
        story.append(Paragraph("3. Methodology & Planning Notice", section_h))
        methodology_text = (
            "<b>Benchmark Source:</b> Capital expenditure assumptions are derived from Central Electricity Regulatory Commission (CERC) "
            "benchmark capital cost orders, Ministry of New and Renewable Energy (MNRE) guidelines, and standard Indian EPC metrics.<br/>"
            "<b>Adjustments:</b> Grid interconnection scales linearly with transmission distance to the substation. "
            "Terrain adjustments account for grading, retaining walls and piled foundations on slopes. Road distance factors heavy crane logistics.<br/>"
            f"<b>Notice:</b> <i>{est.disclaimer}</i>"
        )
        story.append(Paragraph(methodology_text, small_text))

        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()

cost_service = CostService()
