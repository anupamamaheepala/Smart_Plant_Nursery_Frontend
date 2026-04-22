# 💻 Local Development Setup

## Step 1 — Clone the repo
```powershell
git clone https://github.com/<your-username>/<repo-name>.git
cd project-iot
```

## Step 2 — Create virtual environment
```powershell
cd backend
py -3.13 -m venv venv
```

## Step 3 — Activate virtual environment
```powershell
venv\Scripts\activate
```

## Step 4 — Install Python dependencies
```powershell
pip install -r requirements.txt
```

## Step 5 — Create the .env file
Create `backend/src/.env` and add:
```env
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net
DB_NAME=plant_nursery
JWT_SECRET=your_secret_key
JWT_EXPIRE_MINUTES=480
```

## Step 6 — Install frontend dependencies
```powershell
cd src\frontend
npm install
```

## Step 7 — Run both servers

**Terminal 1 — Backend:**
```powershell
cd backend\src
uvicorn main:app --reload --port 8000
```

**Terminal 2 — Frontend:**
```powershell
cd backend\src\frontend
npm run dev
```

Open **http://localhost:5173** 🌱

---

## Credentials
| Username | Password | Role |
|----------|----------|------|
| `Anupama` | `1234` | Gardener |
| `Himansa` | `1234` | Owner |
| `Rashini` | `1234` | Admin |
