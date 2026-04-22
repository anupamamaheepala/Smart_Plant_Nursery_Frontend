# 🌱 NurseryPulse — IoT Smart Agriculture Dashboard

A full-stack IoT dashboard for monitoring plant sensor data in real time.
Built with **FastAPI + MongoDB + React (Vite)**, deployed as a single server.

---

## 📁 Project Structure

```
project-iot/
├── backend/
│   ├── venv/                  ← Python virtual environment (not committed)
│   ├── requirements.txt
│   └── src/
│       ├── main.py            ← FastAPI entry point
│       ├── config.py          ← MongoDB connection + env vars
│       ├── auth.py            ← JWT auth + password utils
│       ├── .env               ← secrets (not committed)
│       ├── routes/
│       │   ├── auth_routes.py
│       │   ├── sensor_routes.py
│       │   └── user_routes.py
│       └── frontend/          ← React app (Vite)
│           ├── index.html
│           ├── package.json
│           ├── vite.config.js
│           └── src/
│               ├── App.jsx
│               ├── main.jsx
│               ├── index.css
│               ├── api/
│               ├── components/
│               ├── context/
│               └── pages/
│                   ├── Login.jsx
│                   ├── gardener/
│                   ├── owner/
│                   └── admin/
```

---

## ⚙️ Prerequisites

- [Python 3.13](https://www.python.org/downloads/) installed
- [Node.js 18+](https://nodejs.org/) installed
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster set up
- A `plant_nursery` database with:
  - `plant_data` collection (sensor readings)
  - `users` collection (admin, gardener, owner)

---

## 🔐 Environment Variables

Create a `.env` file inside `backend/src/`:

```env
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net
DB_NAME=plant_nursery
JWT_SECRET=your_super_secret_key_change_this
JWT_EXPIRE_MINUTES=480
```

> ⚠️ Never commit `.env` to Git. Add it to `.gitignore`.

---

## 🐍 Backend Setup

All commands run from the `backend/` folder unless stated otherwise.

### 1. Create virtual environment using Python 3.13

**Windows (PowerShell):**
```powershell
py -3.13 -m venv venv
```

**Mac/Linux:**
```bash
python3.13 -m venv venv
```

### 2. Activate the virtual environment

**Windows:**
```powershell
venv\Scripts\activate
```

**Mac/Linux:**
```bash
source venv/bin/activate
```

You should see `(venv)` at the start of your terminal line.

> ⚠️ You must activate the venv every time you open a new terminal.

### 3. Install Python dependencies

```powershell
pip install -r requirements.txt
```

---

## 🚀 Running in Development (2 servers)

Development uses two servers running simultaneously — FastAPI for the API and Vite for the React frontend with hot reload.

### Terminal 1 — Start FastAPI backend

```powershell
cd backend\src
uvicorn main:app --reload --port 8000
```

API will be available at: `http://localhost:8000`  
Interactive API docs at: `http://localhost:8000/docs`

### Terminal 2 — Start React frontend

```powershell
cd backend\src\frontend
npm install        # only needed first time
npm run dev
```

Frontend will be available at: `http://localhost:5173`

> The Vite dev server proxies all `/api/*` requests to FastAPI on port 8000 automatically.

---

## 🏗️ Running in Production (1 server)

In production, React is compiled into static files and served directly by FastAPI — only one server needed.

### Step 1 — Build the React app

```powershell
cd backend\src\frontend
npm run build
```

This creates `backend/src/frontend/dist/` with the compiled app.

### Step 2 — Run FastAPI only

```powershell
cd backend\src
uvicorn main:app --port 8000
```

Everything — frontend and API — is now served from `http://localhost:8000`.

> Remove `--reload` in production. It's only for development.

---

## 👤 Default Users

| Username   | Password | Role     | Dashboard            |
|------------|----------|----------|----------------------|
| `Anupama` | `1234`   | Gardener | Live / Alerts / Trends |
| `Rashini`    | `1234`   | Owner    | Business Overview    |
| `Himansa`    | `1234`   | Admin    | User Management      |

> ⚠️ Change all passwords before deploying to production.

---

## 📡 API Endpoints

All endpoints are prefixed with `/api`.

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | All | Login, returns JWT |
| GET | `/api/sensor/latest` | Gardener | Most recent sensor reading |
| GET | `/api/sensor/today` | Gardener | Last 24h readings |
| GET | `/api/sensor/alerts` | Gardener | Warning + Critical events |
| GET | `/api/sensor/kpi?period=week` | Owner | KPI summary cards |
| GET | `/api/sensor/health-dist` | Owner | Health distribution chart |
| GET | `/api/sensor/risk-dist` | Owner | Risk distribution chart |
| GET | `/api/sensor/env-trend` | Owner | Temp/humidity/pressure trend |
| GET | `/api/sensor/soil-trend` | Owner | Soil moisture trend |
| GET | `/api/sensor/water-trend` | Owner | Water level trend |
| GET | `/api/sensor/risk-trend` | Owner | Risk score trend |
| GET | `/api/sensor/critical-events` | Owner | Critical events log |
| GET | `/api/users/` | Admin | List all users |
| POST | `/api/users/` | Admin | Create user |
| PUT | `/api/users/{id}` | Admin | Update user |
| DELETE | `/api/users/{id}` | Admin | Delete user |

**Period filter options:** `today`, `week`, `month`, `Q1`, `Q2`, `Q3`, `Q4`

---

## 🌡️ Sensors & Data Fields

| Sensor | Fields |
|--------|--------|
| BME280 | `temperature_C`, `humidity_%`, `pressure_hPa` |
| Capacitive Soil Moisture | `soil_moisture_%`, `Root_Water_status` |
| LDR | `light_level_lux`, `light_status` |
| DS18B20 (Waterproof) | `water_temperature_C` |
| Water Level Sensor | `water_level_%`, `water_status`, `water_detected` |
| Derived | `plant_health`, `risk_score`, `Risk_level`, `timestamp` |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Database | MongoDB Atlas |
| Backend | Python 3.13 + FastAPI + PyMongo |
| Auth | JWT (python-jose) + bcrypt |
| Frontend | React 18 + Vite |
| Charts | Recharts |
| Routing | React Router v6 |
| HTTP Client | Axios |
| IoT Hardware | ESP32 + HiveMQ + DS18B20 + BME280 + LDR + Capacitive + Water Level |

---

## 🚂 Deploying to Railway

1. Push your project to GitHub (make sure `.env` and `venv/` are in `.gitignore`)
2. Build the frontend first: `npm run build` inside `backend/src/frontend/`
3. Commit the `frontend/dist/` folder
4. In Railway, set the following environment variables:
   - `MONGO_URI`
   - `DB_NAME`
   - `JWT_SECRET`
   - `JWT_EXPIRE_MINUTES`
5. Set the start command to:
   ```
   cd src && uvicorn main:app --host 0.0.0.0 --port $PORT
   ```

---

## 🔮 Future Improvements

- [ ] Live MQTT data via ESP32 + HiveMQ → MongoDB Change Streams + WebSocket
- [ ] Push notifications for Critical alerts
- [ ] Gardener action log (watered, fertilized, etc.)
- [ ] Multi-plant / multi-zone support
- [ ] Export reports as PDF