# ICU Sentinel — AI-Based ICU Patient Monitoring and Clinical Deterioration Prediction Dashboard

**ICU Sentinel** is a comprehensive clinical dashboard and bedside charting application designed for Intensive Care Unit (ICU) environments. It provides real-time multi-patient central monitoring, vital sign telemetry, trend tracking, threshold alerts, and structured bedside clinical charting (Medication Administration Record, Fluid Intake & Output, Lab & Blood Gas Results, and Doctor/Nursing Notes) connected to **Neon PostgreSQL**.

---

## 1. Project Architecture & Directory Structure

```text
D:\FY Project\
│
├── frontend\                      # React + Vite Frontend Application
│   ├── src\
│   │   ├── components\            # Header (Theme Toggle, Live Clock, DB Status), Sidebar
│   │   ├── pages\                 # Dashboard (Central Monitoring Station), ManualDataEntry (MAR, Fluids, Labs)
│   │   ├── services\              # Dedicated API Service Module (api.js)
│   │   ├── context\               # PatientDataContext (Shared state, theme & DB sync)
│   │   ├── data\                  # Demo clinical datasets (Vitals, MAR, Fluids, Labs, Alerts)
│   │   ├── App.jsx                # Main shell & routing coordinator
│   │   ├── main.jsx               # React entrypoint
│   │   └── styles.css             # Medical UI design system (Light & Dark mode)
│   ├── index.html                 # HTML5 template & typography
│   ├── package.json               # Frontend dependencies (React, Lucide React, Recharts, Vite)
│   ├── package-lock.json
│   └── vite.config.js             # Vite configuration
│
├── backend\                       # Node.js + Express.js API Server
│   ├── src\
│   │   ├── app.js                 # Express app configuration, CORS & route mounts
│   │   ├── server.js              # Server entrypoint & database connection tester
│   │   ├── config\
│   │   │   └── database.js        # PostgreSQL pool configuration with SSL for Neon (pg)
│   │   ├── controllers\           # Parameterized SQL controllers (Patients, Vitals, Clinical Data)
│   │   │   ├── patientController.js
│   │   │   ├── vitalsController.js
│   │   │   └── clinicalDataController.js
│   │   ├── routes\                # Express route definitions
│   │   │   ├── patientRoutes.js
│   │   │   └── vitalsRoutes.js
│   │   └── middleware\            # Centralized error handler & validators
│   │       └── errorHandler.js
│   ├── .env                       # Local environment variables (excluded from Git)
│   ├── .env.example               # Template environment variables
│   ├── package.json               # Backend dependencies (express, pg, dotenv, cors)
│   └── package-lock.json
│
├── database\                      # Database Scripts & Schema Definitions
│   └── schema.sql                 # Neon PostgreSQL schema (Patients, Admissions, Vitals, MAR, Fluids, Labs)
│
├── .gitignore                     # Git ignore rules for node_modules, dist, and .env files
└── README.md                      # Project documentation & setup instructions
```

---

## 2. API Endpoints Reference

All endpoints use parameterized SQL queries against the `neondb` PostgreSQL database:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health-check endpoint verifying API & DB readiness |
| `GET` | `/api/patients` | List all ICU patients with active admission & latest vitals |
| `POST` | `/api/patients` | Create a new patient record with optional initial admission |
| `GET` | `/api/patients/:id` | Get individual patient demographic & admission details |
| `GET` | `/api/patients/:id/admissions` | Retrieve admission history for a patient |
| `POST` | `/api/patients/:id/admissions` | Create a new admission/bed assignment for a patient |
| `GET` | `/api/patients/:id/vitals` | Retrieve vital sign observation history (ordered by `recorded_at DESC`) |
| `POST` | `/api/patients/:id/vitals` | Record manual or spot vital signs observation |
| `POST` | `/api/vitals` | Direct vital signs observation recording |
| `GET` | `/api/patients/:id/notes` | Retrieve physician & nursing clinical examination notes |
| `POST` | `/api/patients/:id/notes` | Save clinical note with findings, plan, GCS, and pupil response |
| `GET` | `/api/patients/:id/medications` | Retrieve Medication Administration Records (MAR) |
| `POST` | `/api/patients/:id/medications` | Save medication administration record (dose, route, status) |
| `GET` | `/api/patients/:id/fluids` | Retrieve fluid intake & output and urine balance records |
| `POST` | `/api/patients/:id/fluids` | Save fluid intake/output record (net balance automatically computed) |
| `GET` | `/api/patients/:id/labs` | Retrieve laboratory & Arterial Blood Gas (ABG) panels |
| `POST` | `/api/patients/:id/labs` | Save laboratory test results (JSONB test values) |

---

## 3. Frontend Setup & Execution

### Installation
From the project root:
```bash
cd frontend
npm install
```

### Start Development Server
```bash
cd frontend
npm run dev
```
The frontend starts at: `http://localhost:5173/`

### Production Build
```bash
cd frontend
npm run build
```

---

## 4. Backend Setup & Neon Database Configuration

### Installation
From the project root:
```bash
cd backend
npm install
```

### Configure Neon PostgreSQL Connection String Privately
1. Open the [Neon Console](https://console.neon.tech/) and navigate to your project `icu-sentinel` (branch `production`, database `neondb`).
2. Copy your **Pooled connection string** (starts with `postgresql://...`).
3. Open `backend/.env` and paste your connection string:
   ```dotenv
   DATABASE_URL=postgresql://USER:PASSWORD@HOST/neondb?sslmode=require
   PORT=5000
   FRONTEND_URL=http://localhost:5173
   ```
   *(Note: `backend/.env` is excluded by `.gitignore` to keep credentials secure).*

### Start Backend Server
```bash
# In development mode (with auto-reload)
cd backend
npm run dev

# Or in standard mode
npm start
```
The server starts on port `5000`. Test the health-check endpoint:
```
http://localhost:5000/api/health
```

---

## 5. Applying the Database Schema

Review the SQL tables in `database/schema.sql`.

The database schema utilizes exactly 4 PostgreSQL tables:
* `patients` (Patient stay, bed allocation, admission & discharge status)
* `manual_lab_records` (Nurse-entered FiO2, pH, PaCO2, and lactate)
* `telemetry_snapshots` (Persistent vital-sign telemetry history: HR, SpO2, SBP, MAP, DBP, RR)
* `deterioration_alerts` (Risk predictions, early-warning flags, shock index, and acknowledgments)
