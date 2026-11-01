import numpy as np
import pandas as pd
from .model_manager import model_manager
from .feature_engineering import FEATURE_COLUMNS

def predict_suitability(features_dict: dict) -> float:
    """
    Predicts suitability score (0-100) for a candidate site feature dictionary.
    """
    model = model_manager.get_model()
    scaler = model_manager.get_scaler()

    # Extract features in the correct order
    feature_vector = np.array([[features_dict[col] for col in FEATURE_COLUMNS]])
    scaled_vector = scaler.transform(feature_vector)

    pred = model.predict(scaled_vector)[0]
    return round(float(np.clip(pred, 0.0, 100.0)), 1)
