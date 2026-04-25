"""
routes/prediction_routes.py
---------------------------
Loads all 4 trained ML models on startup and serves predictions
based on the latest sensor reading from MongoDB.

Endpoints:
  GET /predict/gardener        → plant health, watering need, tank depletion, risk score
  GET /predict/owner/insights  → feature importances + model accuracy summary

To swap models later: just replace the .pkl files in backend/src/models/
No code changes needed anywhere.
"""
import os
import joblib
import numpy as np
from fastapi import APIRouter, Depends, HTTPException
from pymongo import DESCENDING

from auth import require_role
from config import sensor_col

router = APIRouter(prefix="/predict", tags=["Predictions"])

# ── Load all 4 models once on startup ─────────────────────────────────────────
MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "models")

def load_model(filename):
    path = os.path.join(MODELS_DIR, filename)
    if not os.path.exists(path):
        print(f"  ⚠  Model not found: {filename} — endpoint will return error")
        return None
    model = joblib.load(path)
    print(f"  ✓  Loaded: {filename}")
    return model

print("\n[ML] Loading models...")
plant_health_model   = load_model("rf_plant_health_model.pkl")
watering_need_model  = load_model("rf_watering_need_model.pkl")
tank_depletion_model = load_model("rf_water_level_depletion_model.pkl")
risk_score_model     = load_model("xgb_risk_forecast_model_V2.pkl")
print("[ML] Done.\n")

# ── Feature sets — must exactly match training order ──────────────────────────
PLANT_HEALTH_FEATURES = [
    "temperature_C", "humidity_%", "pressure_hPa",
    "soil_moisture_%", "light_level_lux",
    "water_level_%", "water_temperature_C"
]
WATERING_FEATURES = [
    "soil_moisture_%", "temperature_C", "humidity_%", "light_level_lux"
]
TANK_FEATURES = [
    "water_level_%", "temperature_C", "humidity_%"
]
RISK_SCORE_FEATURES = [
    "temperature_C", "humidity_%", "pressure_hPa",
    "soil_moisture_%", "light_level_lux",
    "water_level_%", "water_temperature_C"
]

# ── Helpers ───────────────────────────────────────────────────────────────────

def get_latest_reading():
    doc = sensor_col.find_one(sort=[("timestamp", DESCENDING)])
    if not doc:
        raise HTTPException(status_code=404, detail="No sensor data found")
    return doc

def extract(doc, features):
    """Pull feature values from MongoDB doc in correct column order."""
    return np.array([[doc.get(f, 0) for f in features]])

def fmt_ts(ts):
    return ts.isoformat() if hasattr(ts, "isoformat") else str(ts)


# ── GET /predict/gardener ─────────────────────────────────────────────────────

@router.get("/gardener")
def get_gardener_predictions(
    user=Depends(require_role("gardener", "owner", "admin"))
):
    """
    Returns all 4 predictions based on the most recent sensor reading.
    Used by the Gardener AI Predictions page.
    """
    doc = get_latest_reading()

    result = {
        "based_on_timestamp": fmt_ts(doc.get("timestamp")),
        "current_readings": {
            "soil_moisture": doc.get("soil_moisture_%"),
            "temperature":   doc.get("temperature_C"),
            "humidity":      doc.get("humidity_%"),
            "water_level":   doc.get("water_level_%"),
            "light_lux":     doc.get("light_level_lux"),
        }
    }

    # 1 ── Plant Health ────────────────────────────────────────────────────────
    if plant_health_model:
        X     = extract(doc, PLANT_HEALTH_FEATURES)
        pred  = plant_health_model.predict(X)[0]
        proba = plant_health_model.predict_proba(X)[0]
        result["plant_health"] = {
            "prediction":  pred,
            "confidence":  round(float(max(proba)) * 100, 1),
            "probabilities": {
                cls: round(float(p) * 100, 1)
                for cls, p in zip(plant_health_model.classes_, proba)
            }
        }
    else:
        result["plant_health"] = {"error": "Model not loaded"}

    # 2 ── Watering Need (next 1 hour) ─────────────────────────────────────────
    if watering_need_model:
        X     = extract(doc, WATERING_FEATURES)
        pred  = int(watering_need_model.predict(X)[0])
        proba = watering_need_model.predict_proba(X)[0]
        result["watering_need"] = {
            "needs_water": bool(pred),
            "confidence":  round(float(max(proba)) * 100, 1),
            "label":       "Needs Water 💧" if pred else "No Water Needed ✓",
        }
    else:
        result["watering_need"] = {"error": "Model not loaded"}

    # 3 ── Tank Depletion (next 2 hours) ──────────────────────────────────────
    if tank_depletion_model:
        X     = extract(doc, TANK_FEATURES)
        pred  = int(tank_depletion_model.predict(X)[0])
        proba = tank_depletion_model.predict_proba(X)[0]
        result["tank_depletion"] = {
            "will_run_low": bool(pred),
            "confidence":   round(float(max(proba)) * 100, 1),
            "label":        "Tank Will Run Low ⚠" if pred else "Tank Level OK ✓",
        }
    else:
        result["tank_depletion"] = {"error": "Model not loaded"}

    # 4 ── Risk Score Forecast ─────────────────────────────────────────────────
    if risk_score_model:
        X         = extract(doc, RISK_SCORE_FEATURES)
        predicted = float(risk_score_model.predict(X)[0])
        actual    = float(doc.get("risk_score", 0))
        diff      = round(predicted - actual, 2)
        result["risk_score"] = {
            "predicted":  round(predicted, 2),
            "actual":     round(actual, 2),
            "difference": diff,
            "trend":      "↑ Rising" if diff > 1 else ("↓ Falling" if diff < -1 else "→ Stable"),
            "level":      "High" if predicted > 50 else ("Medium" if predicted > 30 else "Low"),
        }
    else:
        result["risk_score"] = {"error": "Model not loaded"}

    return result


# ── GET /predict/owner/insights ───────────────────────────────────────────────

@router.get("/owner/insights")
def get_owner_insights(
    user=Depends(require_role("owner", "admin"))
):
    """
    Returns feature importances and model accuracy summary
    for the Owner AI Insights section.
    """
    result = {}

    # Feature importance from Plant Health model
    if plant_health_model and hasattr(plant_health_model, "feature_importances_"):
        imps = plant_health_model.feature_importances_
        result["plant_health_importance"] = [
            {"feature": f.replace("_%", " %").replace("_", " ").title(),
             "importance": round(float(v) * 100, 2)}
            for f, v in sorted(
                zip(PLANT_HEALTH_FEATURES, imps),
                key=lambda x: x[1], reverse=True
            )
        ]

    # Feature importance from Watering Need model
    if watering_need_model and hasattr(watering_need_model, "feature_importances_"):
        imps = watering_need_model.feature_importances_
        result["watering_importance"] = [
            {"feature": f.replace("_%", " %").replace("_", " ").title(),
             "importance": round(float(v) * 100, 2)}
            for f, v in sorted(
                zip(WATERING_FEATURES, imps),
                key=lambda x: x[1], reverse=True
            )
        ]

    # Model accuracy summary
    result["model_summary"] = [
        {"model": "Plant Health Prediction", "algorithm": "Random Forest",
         "accuracy": "80.44%", "type": "Classification", "member": "Himansa"},
        {"model": "Watering Need (next 1hr)", "algorithm": "Random Forest",
         "accuracy": "80.01%", "type": "Classification", "member": "Anupama"},
        {"model": "Tank Depletion (next 2hr)", "algorithm": "Random Forest",
         "accuracy": "83.48%", "type": "Classification", "member": "Sadith"},
        {"model": "Risk Score Forecast", "algorithm": "XGBoost",
         "accuracy": "R²=92.12%", "type": "Regression", "member": "Rashini"},
    ]

    return result
