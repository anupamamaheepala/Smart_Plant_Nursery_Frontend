"""
main.py — FastAPI entry point for Plant Nursery IoT backend
Serves React frontend as static files in production.
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from routes.auth_routes        import router as auth_router
from routes.sensor_routes      import router as sensor_router
from routes.user_routes        import router as user_router
from routes.prediction_routes  import router as prediction_router

app = FastAPI(
    title="Plant Nursery IoT API",
    description="Backend for Gardener, Owner, and Admin dashboards",
    version="1.0.0"
)

# ── CORS — only needed in dev (React dev server on :5173) ────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API Routers ───────────────────────────────────────────────────────────────
app.include_router(auth_router,       prefix="/api")
app.include_router(sensor_router,     prefix="/api")
app.include_router(user_router,       prefix="/api")
app.include_router(prediction_router, prefix="/api")


@app.get("/api/health", tags=["Health"])
def health():
    return {"status": "ok", "message": "Plant Nursery API is running 🌱"}


# ── Serve React build (production) ────────────────────────────────────────────
FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "frontend", "dist")

if os.path.exists(FRONTEND_DIST):
    app.mount("/assets", StaticFiles(
        directory=os.path.join(FRONTEND_DIST, "assets")), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        """Catch-all: serve React app for all non-API routes."""
        index = os.path.join(FRONTEND_DIST, "index.html")
        return FileResponse(index)