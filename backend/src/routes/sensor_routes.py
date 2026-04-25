"""
routes/sensor_routes.py
-----------------------
Updated for new dataset (orchid_data collection).

New field names:
  air_temp, air_humidity, air_pressure, soil_moisture,
  light_lux, water_level_percent, water_temp,
  water_level_raw, alert, node_id, received_at

Derived fields (computed in Python, not stored in MongoDB):
  water_status      → water_level_percent < 20 = Low, > 80 = High, else Normal
  water_detected    → water_level_raw > 0 = 1, else 0
  Root_Water_status → soil_moisture < 30 = Dry, > 70 = Wet, else Normal
  light_status      → light_lux < 1000 = Low, < 10000 = Medium, else High
  plant_health      → Critical / Warning / Healthy based on thresholds
  risk_score        → weighted formula (0-100)
  Risk_level        → Low / Medium / High
"""
import asyncio
import json
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from pymongo import DESCENDING, ASCENDING

from auth import require_role, get_current_user
from config import sensor_col

router = APIRouter(prefix="/sensor", tags=["Sensor"])


# ── Derivation Rules ──────────────────────────────────────────────────────────

def derive_fields(doc: dict) -> dict:
    """
    Compute all fields that are missing from the new dataset.
    These replace the old pre-computed CSV columns.
    """
    soil    = doc.get("soil_moisture", 0) or 0
    water   = doc.get("water_level_percent", 0) or 0
    temp    = doc.get("air_temp", 25) or 25
    humidity= doc.get("air_humidity", 50) or 50
    lux     = doc.get("light_lux", 0) or 0
    raw     = doc.get("water_level_raw", 0) or 0

    # Water status
    if water < 20:
        water_status = "Low"
    elif water > 80:
        water_status = "High"
    else:
        water_status = "Normal"

    # Water detected
    water_detected = 1 if raw > 0 else 0

    # Root water status
    if soil < 30:
        root_status = "Dry"
    elif soil > 70:
        root_status = "Wet"
    else:
        root_status = "Normal"

    # Light status
    if lux < 1000:
        light_status = "Low"
    elif lux < 10000:
        light_status = "Medium"
    else:
        light_status = "High"

    # Plant health
    if soil < 20 or water < 15:
        plant_health = "Critical"
    elif soil < 40 or temp > 35 or water < 30:
        plant_health = "Warning"
    else:
        plant_health = "Healthy"

    # Risk score (0-100 weighted formula)
    soil_risk  = max(0, (40 - soil) * 1.2) if soil < 40 else 0
    water_risk = max(0, (30 - water) * 1.5) if water < 30 else 0
    temp_risk  = max(0, (temp - 30) * 2.0)  if temp > 30 else 0
    humid_risk = 5 if humidity > 80 else 0
    light_risk = 3 if lux < 500 else 0
    risk_score = round(min(100, soil_risk + water_risk + temp_risk + humid_risk + light_risk), 2)

    # Risk level
    if risk_score > 50:
        risk_level = "High"
    elif risk_score > 25:
        risk_level = "Medium"
    else:
        risk_level = "Low"

    doc["water_status"]      = water_status
    doc["water_detected"]    = water_detected
    doc["Root_Water_status"] = root_status
    doc["light_status"]      = light_status
    doc["plant_health"]      = plant_health
    doc["risk_score"]        = risk_score
    doc["Risk_level"]        = risk_level

    return doc


# ── Helpers ───────────────────────────────────────────────────────────────────

def serialize(doc: dict) -> dict:
    """Convert ObjectId and ALL datetime fields to JSON-serializable types, then derive fields."""
    doc["_id"] = str(doc["_id"])
    for key, val in doc.items():
        if isinstance(val, datetime):
            doc[key] = val.isoformat()
    return derive_fields(doc)


def parse_ts(ts_str):
    """Parse ISO timestamp string to datetime."""
    if isinstance(ts_str, datetime):
        return ts_str
    try:
        return datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
    except Exception:
        return None


def date_range_filter(period: str) -> dict:
    """
    Timestamp filter. Handles both ISODate and string timestamps.
    Uses $expr with $gte on string comparison for ISO format strings.
    """
    now = datetime.utcnow()

    if period == "today":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "week":
        start = now - timedelta(days=7)
    elif period == "month":
        start = now - timedelta(days=30)
    elif period == "Q1":
        start = datetime(now.year, 1, 1)
    elif period == "Q2":
        start = datetime(now.year, 4, 1)
    elif period == "Q3":
        start = datetime(now.year, 7, 1)
    elif period == "Q4":
        start = datetime(now.year, 10, 1)
    else:
        start = now - timedelta(days=7)

    start_str = start.strftime("%Y-%m-%dT%H:%M:%S")
    # Support both ISODate objects and ISO string timestamps
    return {"$or": [
        {"timestamp": {"$gte": start}},
        {"timestamp": {"$gte": start_str}},
    ]}


def time_group_by_period(period: str) -> dict:
    if period == "today":
        return {"$substr": ["$timestamp", 0, 13]}   # "2026-04-25T11"
    else:
        return {"$substr": ["$timestamp", 0, 10]}    # "2026-04-25"


# ── GARDENER: Latest Reading ──────────────────────────────────────────────────

@router.get("/latest")
def get_latest(user=Depends(require_role("gardener", "admin", "owner"))):
    doc = sensor_col.find_one(sort=[("timestamp", DESCENDING)])
    if not doc:
        return {}
    return serialize(doc)


# ── GARDENER: SSE Stream ──────────────────────────────────────────────────────

@router.get("/stream")
async def stream_sensor(user=Depends(require_role("gardener", "admin", "owner"))):
    async def generate():
        last_id = None

        def _fetch():
            return sensor_col.find_one(sort=[("timestamp", DESCENDING)])

        doc = await asyncio.to_thread(_fetch)
        if doc:
            last_id = str(doc["_id"])
            yield f"data: {json.dumps(serialize(doc))}\n\n"

        while True:
            await asyncio.sleep(28)
            doc = await asyncio.to_thread(_fetch)
            if doc:
                doc_id = str(doc["_id"])
                if doc_id != last_id:
                    last_id = doc_id
                    yield f"data: {json.dumps(serialize(doc))}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ── GARDENER: Last 24 Hours ───────────────────────────────────────────────────

@router.get("/today")
def get_today(user=Depends(require_role("gardener", "admin", "owner"))):
    since     = datetime.utcnow() - timedelta(hours=24)
    since_str = since.strftime("%Y-%m-%dT%H:%M:%S")
    docs = sensor_col.find(
        {"$or": [
            {"timestamp": {"$gte": since}},
            {"timestamp": {"$gte": since_str}},
        ]},
        sort=[("timestamp", ASCENDING)]
    )
    return [serialize(d) for d in docs]


# ── GARDENER: Alerts ──────────────────────────────────────────────────────────

@router.get("/alerts")
def get_alerts(
    limit: int = Query(50, ge=1, le=200),
    user=Depends(require_role("gardener", "admin", "owner"))
):
    """
    Since plant_health is derived (not stored), we fetch recent docs
    and filter by derived plant_health in Python.
    """
    docs = sensor_col.find(
        {},
        sort=[("timestamp", DESCENDING)],
        limit=limit * 3   # fetch extra to account for filtering
    )
    alerts = []
    for d in docs:
        enriched = serialize(d)
        if enriched.get("plant_health") in ["Warning", "Critical"]:
            alerts.append(enriched)
        if len(alerts) >= limit:
            break
    return alerts


# ── OWNER: KPI Summary ────────────────────────────────────────────────────────

@router.get("/kpi")
def get_kpi(
    period: str = Query("week", enum=["today", "week", "month", "Q1", "Q2", "Q3", "Q4"]),
    user=Depends(require_role("owner", "admin"))
):
    match = date_range_filter(period)
    pipeline = [
        {"$match": match},
        {"$group": {
            "_id": None,
            "avg_temp":          {"$avg": "$air_temp"},
            "avg_humidity":      {"$avg": "$air_humidity"},
            "avg_soil_moisture": {"$avg": "$soil_moisture"},
            "avg_water_level":   {"$avg": "$water_level_percent"},
            "avg_light":         {"$avg": "$light_lux"},
            "total_readings":    {"$sum": 1},
        }}
    ]
    result = list(sensor_col.aggregate(pipeline))
    if not result:
        return {}
    r = result[0]
    r.pop("_id", None)

    # Compute derived counts by fetching docs in period and deriving
    docs = list(sensor_col.find(match))
    critical_count = 0
    warning_count  = 0
    healthy_count  = 0
    risk_total     = 0.0
    for d in docs:
        en = derive_fields(dict(d))
        ph = en.get("plant_health")
        if ph == "Critical": critical_count += 1
        elif ph == "Warning": warning_count += 1
        else: healthy_count += 1
        risk_total += en.get("risk_score", 0)

    r["critical_count"] = critical_count
    r["warning_count"]  = warning_count
    r["healthy_count"]  = healthy_count
    r["avg_risk_score"] = round(risk_total / len(docs), 2) if docs else 0

    return {k: round(v, 2) if isinstance(v, float) else v for k, v in r.items()}


# ── OWNER: Health Distribution ────────────────────────────────────────────────

@router.get("/health-dist")
def get_health_dist(
    period: str = Query("week", enum=["today", "week", "month", "Q1", "Q2", "Q3", "Q4"]),
    user=Depends(require_role("owner", "admin"))
):
    match  = date_range_filter(period)
    docs   = sensor_col.find(match)
    counts = {"Healthy": 0, "Warning": 0, "Critical": 0}
    for d in docs:
        ph = derive_fields(dict(d)).get("plant_health", "Healthy")
        counts[ph] = counts.get(ph, 0) + 1
    return [{"status": k, "count": v} for k, v in counts.items()]


# ── OWNER: Risk Distribution ──────────────────────────────────────────────────

@router.get("/risk-dist")
def get_risk_dist(
    period: str = Query("week", enum=["today", "week", "month", "Q1", "Q2", "Q3", "Q4"]),
    user=Depends(require_role("owner", "admin"))
):
    match  = date_range_filter(period)
    docs   = sensor_col.find(match)
    counts = {"Low": 0, "Medium": 0, "High": 0}
    for d in docs:
        rl = derive_fields(dict(d)).get("Risk_level", "Low")
        counts[rl] = counts.get(rl, 0) + 1
    return [{"level": k, "count": v} for k, v in counts.items()]


# ── OWNER: Risk Score Trend ───────────────────────────────────────────────────

@router.get("/risk-trend")
def get_risk_trend(
    period: str = Query("week", enum=["today", "week", "month", "Q1", "Q2", "Q3", "Q4"]),
    user=Depends(require_role("owner", "admin"))
):
    match  = date_range_filter(period)
    docs   = sensor_col.find(match, sort=[("timestamp", ASCENDING)])
    bucket = {}
    for d in docs:
        en  = derive_fields(dict(d))
        ts  = str(d.get("timestamp", ""))
        key = ts[:13] if period == "today" else ts[:10]
        if key not in bucket:
            bucket[key] = []
        bucket[key].append(en.get("risk_score", 0))
    return [
        {"time": k, "avg_risk": round(sum(v) / len(v), 2)}
        for k, v in sorted(bucket.items())
    ]


# ── OWNER: Environmental Trend ────────────────────────────────────────────────

@router.get("/env-trend")
def get_env_trend(
    period: str = Query("week", enum=["today", "week", "month", "Q1", "Q2", "Q3", "Q4"]),
    user=Depends(require_role("owner", "admin"))
):
    match  = date_range_filter(period)
    group_by = time_group_by_period(period)
    pipeline = [
        {"$match": match},
        {"$group": {
            "_id":          group_by,
            "avg_temp":     {"$avg": "$air_temp"},
            "avg_humidity": {"$avg": "$air_humidity"},
            "avg_pressure": {"$avg": "$air_pressure"},
        }},
        {"$sort": {"_id": 1}}
    ]
    return [
        {
            "time":         r["_id"],
            "avg_temp":     round(r["avg_temp"], 2),
            "avg_humidity": round(r["avg_humidity"], 2),
            "avg_pressure": round(r["avg_pressure"], 2),
        }
        for r in sensor_col.aggregate(pipeline)
    ]


# ── OWNER: Soil Moisture Trend ────────────────────────────────────────────────

@router.get("/soil-trend")
def get_soil_trend(
    period: str = Query("week", enum=["today", "week", "month", "Q1", "Q2", "Q3", "Q4"]),
    user=Depends(require_role("owner", "admin"))
):
    match    = date_range_filter(period)
    group_by = time_group_by_period(period)
    pipeline = [
        {"$match": match},
        {"$group": {
            "_id":          group_by,
            "avg_moisture": {"$avg": "$soil_moisture"},
        }},
        {"$sort": {"_id": 1}}
    ]
    return [{"time": r["_id"], "avg_moisture": round(r["avg_moisture"], 2)}
            for r in sensor_col.aggregate(pipeline)]


# ── OWNER: Water Level Trend ──────────────────────────────────────────────────

@router.get("/water-trend")
def get_water_trend(
    period: str = Query("week", enum=["today", "week", "month", "Q1", "Q2", "Q3", "Q4"]),
    user=Depends(require_role("owner", "admin"))
):
    match    = date_range_filter(period)
    group_by = time_group_by_period(period)
    pipeline = [
        {"$match": match},
        {"$group": {
            "_id":       group_by,
            "avg_water": {"$avg": "$water_level_percent"},
        }},
        {"$sort": {"_id": 1}}
    ]
    return [{"time": r["_id"], "avg_water": round(r["avg_water"], 2)}
            for r in sensor_col.aggregate(pipeline)]


# ── OWNER: Critical Events Log ────────────────────────────────────────────────

@router.get("/critical-events")
def get_critical_events(
    period: str = Query("week", enum=["today", "week", "month", "Q1", "Q2", "Q3", "Q4"]),
    limit: int = Query(100, ge=1, le=500),
    user=Depends(require_role("owner", "admin"))
):
    match = date_range_filter(period)
    docs  = sensor_col.find(match, sort=[("timestamp", DESCENDING)], limit=limit * 3)
    critical = []
    for d in docs:
        en = serialize(d)
        if en.get("plant_health") == "Critical":
            critical.append(en)
        if len(critical) >= limit:
            break
    return critical