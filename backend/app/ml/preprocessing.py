import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from .feature_engineering import FEATURE_COLUMNS

def prepare_training_data(df: pd.DataFrame) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, StandardScaler, list[str]]:
    """
    Extracts features, scales them, and performs a train/test split (80/20).
    """
    X = df[FEATURE_COLUMNS].copy()
    y = df["ml_suitability_score"].values

    X_train_raw, X_test_raw, y_train, y_test = train_test_split(
        X.values, y, test_size=0.2, random_state=42, shuffle=True
    )

    scaler = StandardScaler()
    X_train = scaler.fit_transform(X_train_raw)
    X_test = scaler.transform(X_test_raw)

    return X_train, X_test, y_train, y_test, scaler, FEATURE_COLUMNS
