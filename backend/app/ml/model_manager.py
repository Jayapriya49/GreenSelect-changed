import json
import logging
import joblib
from pathlib import Path
from backend.app.config import settings

logger = logging.getLogger("renewai.model_manager")

class ModelManager:
    def __init__(self):
        self._model = None
        self._scaler = None
        self._metadata = None

    def is_model_trained(self) -> bool:
        return settings.MODEL_PATH.exists() and settings.SCALER_PATH.exists()

    def get_model(self):
        if self._model is None:
            if not self.is_model_trained():
                raise FileNotFoundError(
                    f"Trained model not found at {settings.MODEL_PATH}. Please run the training pipeline first: `python backend/app/ml/train.py`"
                )
            self._model = joblib.load(settings.MODEL_PATH)
        return self._model

    def get_scaler(self):
        if self._scaler is None:
            if not self.is_model_trained():
                raise FileNotFoundError(
                    f"Scaler not found at {settings.SCALER_PATH}. Please run the training pipeline first."
                )
            self._scaler = joblib.load(settings.SCALER_PATH)
        return self._scaler

    def get_metadata(self) -> dict:
        if self._metadata is None:
            if settings.METADATA_PATH.exists():
                with open(settings.METADATA_PATH, "r") as f:
                    self._metadata = json.load(f)
            else:
                self._metadata = {
                    "model_name": "XGBoost Regressor / Random Forest",
                    "status": "Not yet trained",
                    "features": []
                }
        return self._metadata

    def reload(self):
        self._model = None
        self._scaler = None
        self._metadata = None

model_manager = ModelManager()
