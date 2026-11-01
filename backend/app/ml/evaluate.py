import numpy as np
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from .feature_engineering import FEATURE_COLUMNS, FEATURE_DISPLAY_NAMES

def evaluate_regression_model(model, X_test: np.ndarray, y_test: np.ndarray) -> dict:
    """
    Computes rigorous academic regression evaluation metrics:
    - R² (Coefficient of Determination)
    - RMSE (Root Mean Squared Error)
    - MAE (Mean Absolute Error)
    - Explained Variance
    - Residual statistics
    """
    y_pred = model.predict(X_test)
    
    r2 = float(r2_score(y_test, y_pred))
    mse = float(mean_squared_error(y_test, y_pred))
    rmse = float(np.sqrt(mse))
    mae = float(mean_absolute_error(y_test, y_pred))

    # Calculate discrete classification metrics from continuous thresholds (for academic transparency)
    # Tiers: >=80: Very High, >=70: High, >=55: Moderate, <55: Low
    y_test_tiers = np.digitize(y_test, [55, 70, 80])
    y_pred_tiers = np.digitize(y_pred, [55, 70, 80])
    tier_accuracy = float(np.mean(y_test_tiers == y_pred_tiers))

    # Feature importances
    if hasattr(model, "feature_importances_"):
        raw_importances = model.feature_importances_
        feature_importance_list = [
            {
                "feature_name": feat,
                "display_name": FEATURE_DISPLAY_NAMES.get(feat, feat),
                "importance": round(float(imp), 4)
            }
            for feat, imp in sorted(zip(FEATURE_COLUMNS, raw_importances), key=lambda x: x[1], reverse=True)
        ]
    else:
        feature_importance_list = []

    return {
        "r2_score": round(r2, 4),
        "rmse": round(rmse, 4),
        "mae": round(mae, 4),
        "tier_classification_accuracy": round(tier_accuracy, 4),
        "feature_importances": feature_importance_list,
        "sample_test_size": len(y_test)
    }
