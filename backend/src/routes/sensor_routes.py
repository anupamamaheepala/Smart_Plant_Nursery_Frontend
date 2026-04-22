"""
routes/sensor_routes.py
-----------------------
All sensor data endpoints.

Gardener endpoints:
  GET /sensor/latest          → most recent reading (Live page)
  GET /sensor/today           → last 24h readings (Trends page)
  GET /sensor/alerts          → Warning + Critical readings (Alerts page)

Owner endpoints:
  GET /sensor/kpi             → summary stats with date filter
  GET /sensor/health-dist     → plant_health count breakdown
  GET /sensor/risk-dist       → Risk_level count breakdown
  GET /sensor/risk-trend      → avg risk_score over time
  GET /sensor/env-trend       → temp, humidity, pressure over time
  GET /sensor/soil-trend      → soil moisture over time
  GET /sensor/water-trend     → water level over time
  GET /sensor/critical-events → all Critical health records
"""
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from pymongo import DESCENDING, ASCENDING

from auth import require_role, get_current_user
from config import sensor_col

router = APIRouter(prefix="/sensor", tags=["Sensor"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def serialize(doc: dict) -> dict:
    """Convert ObjectId and datetime to JSON-serializable types."""
    doc["_id"] = str(doc["_id"])
    if isinstance(doc.get("timestamp"), datetime):
        doc["timestamp"] = doc["timestamp"].isoformat()
    return doc


def date_range_filter(period: str) -> dict:
    """
    Convert period string to a MongoDB timestamp $gte filter.
    Periods: today | week | month | Q1 | Q2 | Q3 | Q4
    """
    now = datetime.utcnow()

    if period == "today":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    elif period == "week":
        start = now - timedelta(days=7)

    elif period == "month":
        start = now - timedelta(days=30)

    elif period == "Q1":
        year = now.year
        start = datetime(year, 1, 1)

    elif period == "Q2":
        year = now.year
        start = datetime(year, 4, 1)

    elif period == "Q3":
        year = now.year
        start = datetime(year, 7, 1)

    elif period == "Q4":
        year = now.year
        start = datetime(year, 10, 1)

    else:
        # Default: last 7 days
        start = now - timedelta(days=7)

    return {"timestamp": {"$gte": start}}


def time_group_by_period(period: str) -> dict:
    """
    MongoDB $dateToString format for grouping by period.
    """
    if period == "today":
        return {"$dateToString": {"format": "%Y-%m-%dT%H:00", "date": "$timestamp"}}
    elif period == "week":
        return {"$dateToString": {"format": "%Y-%m-%d", "date": "$timestamp"}}
    else:
        return {"$dateToString": {"format": "%Y-%m-%d", "date": "$timestamp"}}


# ── GARDENER: Latest Reading ──────────────────────────────────────────────────

@router.get("/latest")
def get_latest(user=Depends(require_role("gardener", "admin", "owner"))):
    """Returns the single most recent sensor reading."""
    doc = sensor_col.find_one(sort=[("timestamp", DESCENDING)])
    if not doc:
        return {}
    return serialize(doc)


# ── GARDENER: Last 24 Hours ───────────────────────────────────────────────────

@router.get("/today")
def get_today(user=Depends(require_role("gardener", "admin", "owner"))):
    """Returns all readings from the last 24 hours for trend charts."""
    since = datetime.utcnow() - timedelta(hours=24)
    docs = sensor_col.find(
        {"timestamp": {"$gte": since}},
        sort=[("timestamp", ASCENDING)]
    )
    return [serialize(d) for d in docs]


# ── GARDENER: Alerts ─────────────────────────────────────────────────────────

@router.get("/alerts")
def get_alerts(
    limit: int = Query(50, ge=1, le=200),
    user=Depends(require_role("gardener", "admin", "owner"))
):
    """Returns most recent Warning and Critical readings."""
    docs = sensor_col.find(
        {"plant_health": {"$in": ["Warning", "Critical"]}},
        sort=[("timestamp", DESCENDING)],
        limit=limit
    )
    return [serialize(d) for d in docs]


# ── OWNER: KPI Summary ────────────────────────────────────────────────────────

@router.get("/kpi")
def get_kpi(
    period: str = Query("week", enum=["today", "week", "month", "Q1", "Q2", "Q3", "Q4"]),
    user=Depends(require_role("owner", "admin"))
):
    """Returns aggregated KPIs: averages + critical event count."""
    match = date_range_filter(period)

    pipeline = [
        {"$match": match},
        {"$group": {
            "_id": None,
            "avg_temp":          {"$avg": "$temperature_C"},
            "avg_humidity":      {"$avg": "$humidity_%"},
            "avg_soil_moisture": {"$avg": "$soil_moisture_%"},
            "avg_water_level":   {"$avg": "$water_level_%"},
            "avg_risk_score":    {"$avg": "$risk_score"},
            "avg_light":         {"$avg": "$light_level_lux"},
            "total_readings":    {"$sum": 1},
            "critical_count": {
                "$sum": {"$cond": [{"$eq": ["$plant_health", "Critical"]}, 1, 0]}
            },
            "warning_count": {
                "$sum": {"$cond": [{"$eq": ["$plant_health", "Warning"]}, 1, 0]}
            },
            "healthy_count": {
                "$sum": {"$cond": [{"$eq": ["$plant_health", "Healthy"]}, 1, 0]}
            },
        }}
    ]

    result = list(sensor_col.aggregate(pipeline))
    if not result:
        return {}
    r = result[0]
    r.pop("_id", None)
    # Round floats
    return {k: round(v, 2) if isinstance(v, float) else v for k, v in r.items()}


# ── OWNER: Health Distribution ────────────────────────────────────────────────

@router.get("/health-dist")
def get_health_dist(
    period: str = Query("week", enum=["today", "week", "month", "Q1", "Q2", "Q3", "Q4"]),
    user=Depends(require_role("owner", "admin"))
):
    """Returns count of Healthy / Warning / Critical readings."""
    match = date_range_filter(period)
    pipeline = [
        {"$match": match},
        {"$group": {"_id": "$plant_health", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ]
    return [{"status": r["_id"], "count": r["count"]}
            for r in sensor_col.aggregate(pipeline)]


# ── OWNER: Risk Distribution ──────────────────────────────────────────────────

@router.get("/risk-dist")
def get_risk_dist(
    period: str = Query("week", enum=["today", "week", "month", "Q1", "Q2", "Q3", "Q4"]),
    user=Depends(require_role("owner", "admin"))
):
    """Returns count of Low / Medium / High risk readings."""
    match = date_range_filter(period)
    pipeline = [
        {"$match": match},
        {"$group": {"_id": "$Risk_level", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ]
    return [{"level": r["_id"], "count": r["count"]}
            for r in sensor_col.aggregate(pipeline)]


# ── OWNER: Risk Score Trend ───────────────────────────────────────────────────

@router.get("/risk-trend")
def get_risk_trend(
    period: str = Query("week", enum=["today", "week", "month", "Q1", "Q2", "Q3", "Q4"]),
    user=Depends(require_role("owner", "admin"))
):
    """Returns avg risk_score grouped by time bucket."""
    match = date_range_filter(period)
    group_by = time_group_by_period(period)
    pipeline = [
        {"$match": match},
        {"$group": {
            "_id": group_by,
            "avg_risk": {"$avg": "$risk_score"},
        }},
        {"$sort": {"_id": 1}}
    ]
    return [{"time": r["_id"], "avg_risk": round(r["avg_risk"], 2)}
            for r in sensor_col.aggregate(pipeline)]


# ── OWNER: Environmental Trend (Temp, Humidity, Pressure) ────────────────────

@router.get("/env-trend")
def get_env_trend(
    period: str = Query("week", enum=["today", "week", "month", "Q1", "Q2", "Q3", "Q4"]),
    user=Depends(require_role("owner", "admin"))
):
    """Returns avg temperature, humidity, pressure grouped by time bucket."""
    match = date_range_filter(period)
    group_by = time_group_by_period(period)
    pipeline = [
        {"$match": match},
        {"$group": {
            "_id": group_by,
            "avg_temp":     {"$avg": "$temperature_C"},
            "avg_humidity": {"$avg": "$humidity_%"},
            "avg_pressure": {"$avg": "$pressure_hPa"},
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
    """Returns avg soil moisture grouped by time bucket."""
    match = date_range_filter(period)
    group_by = time_group_by_period(period)
    pipeline = [
        {"$match": match},
        {"$group": {
            "_id":          group_by,
            "avg_moisture": {"$avg": "$soil_moisture_%"},
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
    """Returns avg water level grouped by time bucket."""
    match = date_range_filter(period)
    group_by = time_group_by_period(period)
    pipeline = [
        {"$match": match},
        {"$group": {
            "_id":       group_by,
            "avg_water": {"$avg": "$water_level_%"},
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
    """Returns all Critical plant_health records in the period."""
    match = {**date_range_filter(period), "plant_health": "Critical"}
    docs = sensor_col.find(match, sort=[("timestamp", DESCENDING)], limit=limit)
    return [serialize(d) for d in docs]