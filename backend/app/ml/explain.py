import numpy as np
import shap
from .model_manager import model_manager
from .feature_engineering import FEATURE_COLUMNS, FEATURE_DISPLAY_NAMES, FEATURE_UNITS

class SHAPExplanationEngine:
    def __init__(self):
        self._explainer = None

    def get_explainer(self):
        if self._explainer is None:
            model = model_manager.get_model()
            self._explainer = shap.TreeExplainer(model)
        return self._explainer

    def explain_site(self, features_dict: dict) -> dict:
        """
        Computes real SHAP values for a single candidate site feature vector.
        Returns positive and negative factor contributions and natural language synthesis.
        """
        explainer = self.get_explainer()
        scaler = model_manager.get_scaler()

        # Build feature array
        raw_vals = [float(features_dict.get(col, 0.0)) for col in FEATURE_COLUMNS]
        feature_vector = np.array([raw_vals])
        scaled_vector = scaler.transform(feature_vector)

        # Compute SHAP values
        shap_vals = explainer.shap_values(scaled_vector)[0]
        base_value = float(explainer.expected_value) if np.isscalar(explainer.expected_value) else float(explainer.expected_value[0])
        predicted_value = float(base_value + np.sum(shap_vals))

        positive_factors = []
        negative_factors = []

        total_abs_impact = np.sum(np.abs(shap_vals)) or 1.0

        for col, raw_val, s_val in zip(FEATURE_COLUMNS, raw_vals, shap_vals):
            pct = round(float((abs(s_val) / total_abs_impact) * 100.0), 1)
            item = {
                "feature_name": col,
                "display_name": FEATURE_DISPLAY_NAMES.get(col, col),
                "feature_value": round(raw_val, 2),
                "unit": FEATURE_UNITS.get(col, ""),
                "shap_value": round(float(s_val), 3),
                "percentage_impact": pct,
                "direction": "positive" if s_val >= 0 else "negative",
                "explanation": self._generate_feature_sentence(col, raw_val, s_val)
            }
            if s_val >= 0:
                positive_factors.append(item)
            else:
                negative_factors.append(item)

        # Sort by absolute SHAP magnitude
        positive_factors.sort(key=lambda x: abs(x["shap_value"]), reverse=True)
        negative_factors.sort(key=lambda x: abs(x["shap_value"]), reverse=True)

        nl_summary = self._generate_natural_language_summary(
            predicted_value, positive_factors, negative_factors, features_dict
        )

        return {
            "predicted_suitability_score": round(predicted_value, 1),
            "base_value": round(base_value, 1),
            "positive_factors": positive_factors,
            "negative_factors": negative_factors,
            "natural_language_explanation": nl_summary,
            "methodology": "TreeSHAP (Lundberg et al., Nature MI 2020) applied to production ensemble model."
        }

    def _generate_feature_sentence(self, feature_name: str, value: float, shap_val: float) -> str:
        d = "boosts" if shap_val >= 0 else "penalizes"
        if feature_name == "solar_ghi":
            return f"High solar irradiance of {value:.2f} kWh/m²/day {d} suitability by +{shap_val:.2f} pts."
        elif feature_name == "wind_speed_50m":
            return f"Wind speed of {value:.2f} m/s at 50m hub height {d} generation efficiency."
        elif feature_name == "distance_to_grid_km":
            return f"Transmission grid distance of {value:.1f} km {d} grid interconnection feasibility."
        elif feature_name == "slope_deg":
            return f"Terrain slope of {value:.1f}° {d} civil engineering and mounting structure costs."
        elif feature_name == "environmental_penalty":
            return f"Environmental buffer distance {d} project score due to ecological sensitivity."
        elif feature_name == "land_suitability_score":
            return f"Land use classification score ({value:.0f}/100) {d} acquisition and siting feasibility."
        return f"{FEATURE_DISPLAY_NAMES.get(feature_name, feature_name)} of {value} {d} overall suitability."

    def _generate_natural_language_summary(self, score: float, pos: list, neg: list, feat: dict) -> str:
        top_pos = [f"{p['display_name']} (+{p['percentage_impact']}%)" for p in pos[:3]]
        top_neg = [f"{n['display_name']} (-{n['percentage_impact']}%)" for n in neg[:2]]

        energy_type = feat.get("energy_type", "Renewable")
        state = feat.get("state", "the region")

        pos_str = ", ".join(top_pos) if top_pos else "balanced environmental and geographical factors"
        neg_str = f" The primary limiting factors were {', '.join(top_neg)}." if top_neg else " No major operational constraints were detected."

        return (
            f"The AI model assigned a suitability score of {score:.1f}/100 for this {energy_type} candidate location in {state}. "
            f"The primary positive drivers elevating the site rank are {pos_str}.{neg_str} "
            f"Overall, this site demonstrates strong techno-economic viability."
        )

shap_engine = SHAPExplanationEngine()
