import json
import logging
import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pandas as pd
from backend.app.config import settings
from backend.app.ml.train import train_and_persist_model
from backend.app.ml.model_manager import model_manager
from backend.app.ml.explain import shap_engine

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("renewai.pipeline")

def run_full_ml_pipeline():
    logger.info("==========================================")
    logger.info("STARTING RENEWAI MACHINE LEARNING PIPELINE")
    logger.info("==========================================")

    # 1. Train Model & Save Artifacts
    metrics = train_and_persist_model()
    logger.info(f"Model Training Complete. Best Model: {metrics['model_name']} (R²: {metrics['r2_score']}, RMSE: {metrics['rmse']})")

    # Reload model manager to ensure fresh models in memory
    model_manager.reload()

    # 2. Enrich Processed Dataset with SHAP Factors
    logger.info("Generating real SHAP explanations for all candidate sites...")
    df = pd.read_csv(settings.PROCESSED_DATA_PATH)
    
    pos_factors_list = []
    neg_factors_list = []
    explanations_list = []

    for _, row in df.iterrows():
        feat_dict = row.to_dict()
        explanation = shap_engine.explain_site(feat_dict)
        pos_factors_list.append(json.dumps(explanation["positive_factors"]))
        neg_factors_list.append(json.dumps(explanation["negative_factors"]))
        explanations_list.append(explanation["natural_language_explanation"])

    df["shap_positive_factors"] = pos_factors_list
    df["shap_negative_factors"] = neg_factors_list
    df["explanation_summary"] = explanations_list

    df.to_csv(settings.PROCESSED_DATA_PATH, index=False)
    logger.info("Successfully updated candidate dataset with real SHAP attributions.")
    logger.info("==========================================")
    logger.info("RENEWAI ML PIPELINE EXECUTION COMPLETED")
    logger.info("==========================================")

if __name__ == "__main__":
    run_full_ml_pipeline()
