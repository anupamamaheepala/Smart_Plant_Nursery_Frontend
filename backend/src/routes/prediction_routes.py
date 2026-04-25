"""
routes/prediction_routes.py
---------------------------
Updated for new dataset field names.

The ML models were trained on OLD field names:
  temperature_C, humidity_%, pressure_hPa, soil_moisture_%,
  light_level_lux, water_level_%, water_temperature_C

New MongoDB field names:
  air_temp, air_humidity, air_pressure, soil_moisture,
  light_lux, water_level_percent, water_temp

The extract() function maps new → old automatically so models
work without retraining. When you retrain on the new dataset,
just update the FEATURE sets below.
"""
import os
import joblib
import numpy as np
from fastapi import APIRouter, Depends, HTTPException
from pymongo import DESCENDING

from auth import require_role
from config import sensor_col

router = APIRouter(prefix="/predict", tags=["Predictions"])

# ── Load models ───────────────────────────────────────────────────────────────
MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "models")

def load_model(filename):
    path = os.path.join(MODELS_DIR, filename)
    if not os.path.exists(path):
        print(f"  ⚠  Model not found: {filename}")
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

# ── Field mapping: new DB name → old training name ────────────────────────────
FIELD_MAP = {
    "temperature_C":     "air_temp",
    "humidity_%":        "air_humidity",
    "pressure_hPa":      "air_pressure",
    "soil_moisture_%":   "soil_moisture",
    "light_level_lux":   "light_lux",
    "water_level_%":     "water_level_percent",
    "water_temperature_C": "water_temp",
}

# ── Feature sets (OLD names — what the models expect) ─────────────────────────
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

def extract(doc, old_feature_names):
    """
    Extract feature values using old feature names.
    Looks up the new field name via FIELD_MAP, falls back to old name.
    """
    values = []
    for old_name in old_feature_names:
        new_name = FIELD_MAP.get(old_name, old_name)
        values.append(doc.get(new_name, doc.get(old_name, 0)) or 0)
    return np.array([values])

def fmt_ts(ts):
    return ts.isoformat() if hasattr(ts, "isoformat") else str(ts)


# ── GET /predict/gardener ─────────────────────────────────────────────────────

@router.get("/gardener")
def get_gardener_predictions(
    user=Depends(require_role("gardener", "owner", "admin"))
):
    doc = get_latest_reading()

    result = {
        "based_on_timestamp": fmt_ts(doc.get("timestamp")),
        "current_readings": {
            "soil_moisture": doc.get("soil_moisture"),
            "temperature":   doc.get("air_temp"),
            "humidity":      doc.get("air_humidity"),
            "water_level":   doc.get("water_level_percent"),
            "light_lux":     doc.get("light_lux"),
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
        # Derive current risk score using same formula as sensor_routes
        soil  = doc.get("soil_moisture", 0) or 0
        water = doc.get("water_level_percent", 0) or 0
        temp  = doc.get("air_temp", 25) or 25
        humid = doc.get("air_humidity", 50) or 50
        lux   = doc.get("light_lux", 0) or 0
        actual = min(100, max(0,
            (max(0, (40 - soil) * 1.2) if soil < 40 else 0) +
            (max(0, (30 - water) * 1.5) if water < 30 else 0) +
            (max(0, (temp - 30) * 2.0) if temp > 30 else 0) +
            (5 if humid > 80 else 0) +
            (3 if lux < 500 else 0)
        ))
        diff = round(predicted - actual, 2)
        result["risk_score"] = {
            "predicted":  round(predicted, 2),
            "actual":     round(actual, 2),
            "difference": diff,
            "trend":      "↑ Rising" if diff > 1 else ("↓ Falling" if diff < -1 else "→ Stable"),
            "level":      "High" if predicted > 50 else ("Medium" if predicted > 25 else "Low"),
        }
    else:
        result["risk_score"] = {"error": "Model not loaded"}

    return result


# ── GET /predict/owner/insights ───────────────────────────────────────────────

@router.get("/owner/insights")
def get_owner_insights(
    user=Depends(require_role("owner", "admin"))
):
    result = {}

    # Clean feature labels for display (map old names to readable labels)
    LABEL_MAP = {
        "temperature_C":     "Air Temp",
        "humidity_%":        "Humidity",
        "pressure_hPa":      "Pressure",
        "soil_moisture_%":   "Soil Moisture",
        "light_level_lux":   "Light Level",
        "water_level_%":     "Water Level",
        "water_temperature_C": "Water Temp",
    }

    if plant_health_model and hasattr(plant_health_model, "feature_importances_"):
        imps = plant_health_model.feature_importances_
        result["plant_health_importance"] = [
            {"feature": LABEL_MAP.get(f, f), "importance": round(float(v) * 100, 2)}
            for f, v in sorted(
                zip(PLANT_HEALTH_FEATURES, imps),
                key=lambda x: x[1], reverse=True
            )
        ]

    if watering_need_model and hasattr(watering_need_model, "feature_importances_"):
        imps = watering_need_model.feature_importances_
        result["watering_importance"] = [
            {"feature": LABEL_MAP.get(f, f), "importance": round(float(v) * 100, 2)}
            for f, v in sorted(
                zip(WATERING_FEATURES, imps),
                key=lambda x: x[1], reverse=True
            )
        ]

    result["model_summary"] = [
        {"model": "Plant Health Prediction",  "algorithm": "Random Forest", "accuracy": "80.44%",    "type": "Classification", "member": "Himansa"},
        {"model": "Watering Need (next 1hr)", "algorithm": "Random Forest", "accuracy": "80.01%",    "type": "Classification", "member": "Anupama"},
        {"model": "Tank Depletion (next 2hr)","algorithm": "Random Forest", "accuracy": "83.48%",    "type": "Classification", "member": "Sadith"},
        {"model": "Risk Score Forecast",      "algorithm": "XGBoost",       "accuracy": "R²=92.12%", "type": "Regression",     "member": "Rashini"},
    ]

    return result