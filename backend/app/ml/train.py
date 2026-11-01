import json
import logging
import joblib
import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent))

import pandas as pd
from datetime import datetime
from sklearn.ensemble import RandomForestRegressor
import xgboost as xgb
from sklearn.model_selection import cross_val_score

from backend.app.config import settings
from .preprocessing import prepare_training_data
from .evaluate import evaluate_regression_model

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("renewai.train")

def train_and_persist_model(data_path: str = None) -> dict:
    """
    Trains XGBoost and RandomForest models on real candidate dataset, evaluates them,
    and serializes the best model + scaler + metadata to disk.
    """
    target_data_path = data_path or settings.PROCESSED_DATA_PATH
    logger.info(f"Loading training data from {target_data_path}...")
    df = pd.read_csv(target_data_path)

    X_train, X_test, y_train, y_test, scaler, feature_names = prepare_training_data(df)

    logger.info(f"Training on {X_train.shape[0]} samples with {X_train.shape[1]} features...")

    # Train Random Forest Regressor
    rf = RandomForestRegressor(n_estimators=100, max_depth=12, random_state=42, n_jobs=-1)
    rf_cv_scores = cross_val_score(rf, X_train, y_train, cv=5, scoring="r2")
    logger.info(f"Random Forest 5-fold CV R²: {rf_cv_scores.mean():.4f}")

    # Train XGBoost Regressor
    xgb_model = xgb.XGBRegressor(
        n_estimators=120,
        max_depth=6,
        learning_rate=0.08,
        subsample=0.85,
        colsample_bytree=0.85,
        random_state=42
    )
    xgb_cv_scores = cross_val_score(xgb_model, X_train, y_train, cv=5, scoring="r2")
    logger.info(f"XGBoost 5-fold CV R²: {xgb_cv_scores.mean():.4f}")

    # Select best model based on CV R² score
    if xgb_cv_scores.mean() >= rf_cv_scores.mean():
        selected_model = xgb_model
        model_name = "XGBoost Regressor"
        cv_score = float(xgb_cv_scores.mean())
    else:
        selected_model = rf
        model_name = "Random Forest Regressor"
        cv_score = float(rf_cv_scores.mean())

    selected_model.fit(X_train, y_train)

    # Evaluate on held-out test set
    metrics = evaluate_regression_model(selected_model, X_test, y_test)
    metrics["model_name"] = model_name
    metrics["cross_val_r2"] = round(cv_score, 4)
    metrics["training_date"] = datetime.utcnow().isoformat()
    metrics["features"] = feature_names
    metrics["total_samples"] = len(df)

    # Ensure output directories exist
    settings.MODELS_DIR.mkdir(parents=True, exist_ok=True)

    # Save model and scaler
    joblib.dump(selected_model, settings.MODEL_PATH)
    joblib.dump(scaler, settings.SCALER_PATH)

    with open(settings.METADATA_PATH, "w") as f:
        json.dump(metrics, f, indent=2)

    logger.info(f"Successfully trained {model_name} (R²: {metrics['r2_score']}, RMSE: {metrics['rmse']})")
    logger.info(f"Model saved to {settings.MODEL_PATH}")

    return metrics

if __name__ == "__main__":
    train_and_persist_model()
