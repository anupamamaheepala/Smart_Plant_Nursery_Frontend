# 🚂 Railway Deployment Guide — NurseryPulse

Step-by-step guide to deploy the full NurseryPulse stack (FastAPI + React) as a single service on Railway.

---

## 📋 Prerequisites

- [Railway account](https://railway.app) — free tier works
- [GitHub account](https://github.com) — Railway deploys from a repo
- Project pushed to a GitHub repository
- MongoDB Atlas cluster running (same one used locally)

---

## 📁 Before You Push to GitHub

### 1. Build the React frontend locally first

```powershell
cd backend\src\frontend
npm run build
```

This creates `backend/src/frontend/dist/` — this folder **must be committed** to GitHub so Railway can serve it.

### 2. Make sure your `.gitignore` is correct

Create or update `.gitignore` at the project root:

```gitignore
# Python
backend/venv/
backend/src/__pycache__/
backend/src/routes/__pycache__/
*.pyc
*.pyo

# Environment variables — NEVER commit this
backend/src/.env

# Node
backend/src/frontend/node_modules/

# Keep dist/ — Railway needs it
# backend/src/frontend/dist/   ← do NOT ignore this
```

> ⚠️ `frontend/dist/` must **not** be in `.gitignore`. Railway needs those built files.

### 3. Add a `Procfile` in `backend/`

Create a file named exactly `Procfile` (no extension) inside `backend/`:

```
web: cd src && uvicorn main:app --host 0.0.0.0 --port $PORT
```

### 4. Your final folder structure before pushing

```
project-iot/
├── .gitignore
├── README.md
└── backend/
    ├── Procfile               ← new
    ├── requirements.txt
    └── src/
        ├── main.py
        ├── config.py
        ├── auth.py
        ├── .env               ← NOT committed
        ├── routes/
        └── frontend/
            ├── dist/          ← committed (built files)
            ├── src/           ← committed (source files)
            ├── package.json
            └── vite.config.js
```

---

## 🐙 Push to GitHub

```powershell
git init                          # if not already a git repo
git add .
git commit -m "Initial commit — NurseryPulse IoT dashboard"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

---

## 🚂 Deploy on Railway

### Step 1 — Create a new project

1. Go to [railway.app](https://railway.app) and log in
2. Click **New Project**
3. Select **Deploy from GitHub repo**
4. Authorize Railway to access your GitHub if prompted
5. Select your repository

### Step 2 — Configure the service settings

Once Railway detects your repo:

1. Click on the service that was created
2. Go to **Settings** tab
3. Under **Root Directory** set it to:
   ```
   backend
   ```
4. Under **Start Command** set it to:
   ```
   cd src && uvicorn main:app --host 0.0.0.0 --port $PORT
   ```

### Step 3 — Set environment variables

1. Go to the **Variables** tab in your Railway service
2. Add each variable one by one:

| Variable | Value |
|----------|-------|
| `MONGO_URI` | `mongodb+srv://<user>:<password>@<cluster>.mongodb.net` |
| `DB_NAME` | `plant_nursery` |
| `JWT_SECRET` | `some_long_random_secret_string` |
| `JWT_EXPIRE_MINUTES` | `480` |

> 💡 For `JWT_SECRET`, use something long and random — e.g. `nursery_pulse_jwt_2026_xk92mq`

### Step 4 — Allow Railway's IP in MongoDB Atlas

Railway's servers need access to your Atlas cluster:

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Navigate to **Network Access** → **Add IP Address**
3. Click **Allow Access from Anywhere** → `0.0.0.0/0`
4. Click **Confirm**

> ⚠️ This allows all IPs. For production hardening, use Railway's static IP instead (available on paid plans).

### Step 5 — Trigger a deploy

1. Go to the **Deployments** tab in Railway
2. Click **Deploy** (or it may auto-deploy after setting variables)
3. Watch the build logs — a successful deploy ends with:
   ```
   Application startup complete.
   ```

### Step 6 — Get your live URL

1. Go to **Settings** → **Networking**
2. Click **Generate Domain**
3. Railway gives you a URL like:
   ```
   https://nurserypulse-production.up.railway.app
   ```

Open it — your full dashboard should be live! ✅

---

## 🔄 How to Redeploy After Changes

### If you changed backend code only:
```powershell
git add .
git commit -m "Update backend"
git push
```
Railway auto-deploys on every push to `main`.

### If you changed frontend code:
```powershell
# 1. Rebuild frontend
cd backend\src\frontend
npm run build

# 2. Commit the new dist/
cd ..\..\..
git add .
git commit -m "Rebuild frontend"
git push
```

> Every frontend change needs a rebuild before pushing — Railway serves the pre-built `dist/` files.

---

## 🐛 Troubleshooting

| Problem | Fix |
|---------|-----|
| `Module not found` error in logs | Make sure `requirements.txt` is inside `backend/` and Root Directory is set to `backend` |
| `Cannot connect to MongoDB` | Check `MONGO_URI` env var and Atlas Network Access whitelist |
| Login returns 404 | `dist/` folder not committed — run `npm run build` and push again |
| App loads but shows blank page | `base: './'` must be set in `vite.config.js` |
| `$PORT` not found | Make sure Start Command uses `$PORT` not a hardcoded port number |

---

## ✅ Deployment Checklist

- [ ] `npm run build` run and `dist/` folder exists
- [ ] `dist/` is NOT in `.gitignore`
- [ ] `backend/src/.env` IS in `.gitignore`
- [ ] `Procfile` created inside `backend/`
- [ ] All env variables added in Railway dashboard
- [ ] MongoDB Atlas Network Access allows `0.0.0.0/0`
- [ ] Root Directory set to `backend` in Railway settings
- [ ] Start Command set correctly in Railway settings
