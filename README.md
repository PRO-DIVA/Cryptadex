# 🛡️ CryptaDex — AI-Powered Insider Threat Detection System

**Writeup of the project:** [CryptaDex Writeup](https://docs.google.com/document/d/1NyLFu0rqze3I4Y8iQTYbbqaNgWkAzMqHS8Zf7aNfXvY/edit?usp=sharing)

**Video Link of the project:** [CryptaDex Demo Video](https://drive.google.com/file/d/1hfKpLMl18uy9_AbgWmka3sCkTwaMqppz/view?usp=sharing)

> **PS3 Submission** | AI-Powered Insider Threat Detection Challenge

CryptaDex is a full-stack, end-to-end security intelligence platform that detects insider threats using **unsupervised machine learning (Isolation Forest)** combined with **temporal behavioral analysis**. It transforms raw organizational activity logs into actionable security intelligence through a modern, real-time dashboard.

---

## MVP
<img width="1920" height="919" alt="image" src="https://github.com/user-attachments/assets/79d81c28-96eb-4afc-9b14-2b08da3f3011" />

<img width="1919" height="917" alt="image" src="https://github.com/user-attachments/assets/9c13007d-b140-4828-af11-fb3d1b0f9c17" />

<img width="1920" height="916" alt="image" src="https://github.com/user-attachments/assets/7080f67a-de0f-40b0-89a2-cdab25fa79c0" />

<img width="1920" height="920" alt="image" src="https://github.com/user-attachments/assets/53581396-778b-4635-b18f-77f32d79e818" />

<img width="1920" height="919" alt="image" src="https://github.com/user-attachments/assets/36732317-17b1-4407-a3ac-15cac2e81b51" />


## 📚 Table of Contents

- [Overview](#-overview)
- [Architecture](#-architecture)
- [Key Features](#-key-features)
- [Tech Stack](#️-tech-stack)
- [Project Structure](#-project-structure)
- [Dataset](#-dataset)
- [Data Processing Pipeline](#-data-processing-pipeline)
- [ML Detection Engine](#-ml-detection-engine)
- [API Reference](#-api-reference)
- [Setup & Installation](#-setup--installation)
- [Usage Guide](#-usage-guide)
- [Deployment](#-deployment)
- [Privacy & Security](#-privacy--security)
- [Model Performance](#-model-performance)

---

## 🔍 Overview

Insider threats originate from individuals **within** an organization — employees, contractors, or partners — who may intentionally or unintentionally expose sensitive data. CryptaDex addresses this risk by:

1. **Ingesting** raw activity logs (logons, file access, emails, web browsing, device usage)
2. **Processing** them into a rich daily behavioral feature matrix per user
3. **Training** an Isolation Forest model on normal user baselines
4. **Scoring** anomalies with adaptive dynamic thresholding
5. **Visualizing** threats in real-time through an interactive security dashboard

The system uses a **2-out-of-3 rolling day temporal filter** to eliminate noise from one-off incidents and only surface persistent, multi-day threat patterns.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CryptaDex System                            │
│                                                                     │
│  ┌───────────────┐     ┌──────────────────┐     ┌───────────────┐  │
│  │  Raw Log CSVs │────▶│  process.py      │────▶│final_dataset  │  │
│  │  (CMU Dataset)│     │  (Feature Eng.)  │     │    .csv       │  │
│  └───────────────┘     └──────────────────┘     └───────┬───────┘  │
│                                                          │          │
│                                                          ▼          │
│  ┌───────────────┐     ┌──────────────────┐     ┌───────────────┐  │
│  │  React UI     │◀───▶│  FastAPI Backend │◀────│  model.py     │  │
│  │  (Vite/TS)    │     │  (main.py)       │     │  (Isolation   │  │
│  │  Port 5173    │     │  Port 8000       │     │   Forest)     │  │
│  └───────────────┘     └──────────────────┘     └───────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

**Data Flow:**
```
Raw CSV Upload → FastAPI /api/scan → run_insider_detection() → 
  Train Isolation Forest → Score Events → Rolling Temporal Filter → 
  User-level Aggregation → Threshold Calibration → 
  Persist Results → Dashboard Refresh
```

---

## 🚀 Key Features

### 1. 🤖 Detection Engine (`backend/model.py`)
| Feature | Description |
|---|---|
| **Algorithm** | Isolation Forest (unsupervised anomaly detection) |
| **Training** | Trained exclusively on normal user behavior (label=0) for clean baselines |
| **Temporal Filtering** | Rolling 3-day window; flags events with ≥2 anomalies in a 3-day span |
| **Dynamic Threshold** | Precision-Recall calibrated threshold with a 85th-percentile safety floor |
| **User-Level Rules** | Grid-search over score/temporal thresholds to calibrate with ≥50% recall |

### 2. 📊 Visualization & Insight Platform (`cryptadex-app/src/pages/`)
| Dashboard View | Description |
|---|---|
| **Main Dashboard** | KPIs, TP/FP counts, temporal alert trends, global behavior metrics |
| **Real-Time Detection** | Live terminal-style event feed with Isolate/Dismiss actions |
| **User Behavior Analysis** | Per-user deep-dive: risk trajectory, historical anomaly timeline |
| **System Health** | Infrastructure status, node loads, gateway/endpoint/network stats |

### 3. 🔧 Data Processing Module (`backend/process.py`)
- Extracts 20+ behavioral features per user per day
- Handles 5 log types: logon, file, email, HTTP, device
- SHA-256 anonymization of all user identifiers and PC IDs
- Labels data against known insiders from the CMU insider threat ground truth

### 4. 🔐 Privacy & Security
- All user IDs and PC hashes are SHA-256 hashed before any processing
- A `user_mapping.csv` preserves the original → hashed identity table for investigation
- Decoupled frontend/backend architecture for secure data transmission
- CORS configured for controlled API access

---

## 🛠️ Tech Stack

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Python | 3.10+ | Runtime |
| FastAPI | Latest | REST API framework |
| Uvicorn | Latest | ASGI server |
| Scikit-learn | Latest | Isolation Forest, StandardScaler, Metrics |
| Pandas | Latest | Data manipulation & feature engineering |
| NumPy | Latest | Numerical operations |
| python-multipart | Latest | File upload handling |

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 19.x | UI framework |
| TypeScript | 5.9.x | Type-safe JS |
| Vite | 8.x | Build tool & dev server |
| Tailwind CSS | 4.x | Utility-first styling |
| Recharts | 3.x | Data visualization charts |
| Lucide React | 0.577+ | Icon library |
| React Router DOM | 7.x | Client-side routing |
| PapaParse | 5.x | CSV file parsing |

---

## 📁 Project Structure

```
checkpointat2-main/
│
├── backend/                        # Python FastAPI backend
│   ├── main.py                     # FastAPI app, all API endpoints
│   ├── model.py                    # Isolation Forest detection engine
│   ├── process.py                  # Raw log → feature matrix pipeline
│   ├── environment.yml             # Conda environment specification
│   ├── render.yaml                 # Render.com deployment config
│   ├── final_dataset.csv           # Preprocessed training dataset
│   ├── event_results.csv           # Per-event detection output
│   ├── user_summary.csv            # Per-user prediction summary
│   ├── user_mapping.csv            # Hash ↔ original user mapping
│   ├── insiders.csv                # Predicted insider identities
│   └── uploaded_data.csv           # Last uploaded scan file
│
├── cryptadex-app/                  # React + Vite frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── MainDashboard.tsx         # Overview KPIs & trends
│   │   │   ├── RealTimeDetection.tsx     # Live event feed
│   │   │   ├── UserBehaviorAnalysis.tsx  # Per-user investigation
│   │   │   └── SystemHealth.tsx          # Infrastructure monitor
│   │   ├── components/
│   │   │   ├── DashboardLayout.tsx       # Sidebar & navigation shell
│   │   │   └── charts/
│   │   │       ├── AlertTrendsChart.tsx
│   │   │       ├── GlobalBehaviorChart.tsx
│   │   │       └── ThreatDistributionChart.tsx
│   │   └── services/
│   │       └── dataService.ts            # Typed API client
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── netlify.toml                # Netlify deployment config
│
├── main_dashboard_desktop_updated/ # Static UI mockup snapshot
├── real_time_detection_desktop/    # Static UI mockup snapshot
├── system_health_desktop/          # Static UI mockup snapshot
├── user_behavior_analysis_desktop/ # Static UI mockup snapshot
│
├── SAMPLE_INPUT.csv                # Sample data file for testing scans
├── PROMPT.txt                      # Original challenge problem statement
└── README.md                       # This file
```

---

## 📦 Dataset

CryptaDex uses the **Carnegie Mellon University (CMU) CERT Insider Threat Dataset r4.1**.

> 📥 Download: [https://resources.sei.cmu.edu/library/asset-view.cfm?assetid=508099](https://resources.sei.cmu.edu/library/asset-view.cfm?assetid=508099)

Place the following files inside a `backend/data/` directory before running `process.py`:

| File | Description |
|---|---|
| `logon.csv` | User logon/logoff events with PC and timestamp |
| `file.csv` | File access events with filename and timestamp |
| `email.csv` | Email send events with recipient list |
| `http.csv` | HTTP browsing events with visited URLs |
| `device.csv` | Removable device connection events |
| `insiders.csv` | Ground truth: known insider activity windows |

> ℹ️ A pre-processed `SAMPLE_INPUT.csv` is included in the root directory for testing the scan endpoint without running the full pipeline.

---

## 🔬 Data Processing Pipeline

**Script:** `backend/process.py`

```
Raw CSVs (logon, file, email, http, device)
         │
         ▼
  Load & Sort by date (up to 500,000 rows per source)
         │
         ▼
  SHA-256 Hash: user IDs + PC IDs → save user_mapping.csv
         │
         ▼
  Time Feature Extraction per event:
     • day (floor to date)
     • hour, weekday, is_weekend
     • is_after_hours (before 6am or after 8pm)
         │
         ▼
  Daily Aggregation per user:
  ┌─────────────────────────────────────────────────┐
  │ logon_features:                                 │
  │   total_logons, after_hours_logons,             │
  │   weekend_logons, distinct_pcs_accessed         │
  │ file_features:                                  │
  │   files_accessed, after_hours_files             │
  │ email_features:                                 │
  │   emails_sent, external_emails,                 │
  │   after_hours_emails                            │
  │ http_features:                                  │
  │   web_visits, suspicious_web_clicks,            │
  │   after_hours_web                               │
  │   (keywords: dropbox, drive, secret, spy, leak) │
  │ device_features:                                │
  │   device_activity, after_hours_device           │
  └─────────────────────────────────────────────────┘
         │
         ▼
  Merge all feature sets (left join on user + day)
         │
         ▼
  Compute: total_after_hours (sum across all activities)
         │
         ▼
  Label Assignment: cross-reference insiders.csv
    (label=1 where user matches and date is within window)
         │
         ▼
  Output: final_dataset.csv (20+ features per user-day)
```

---

## 🤖 ML Detection Engine

**Script:** `backend/model.py` | **Entry function:** `run_insider_detection()`

### Training Strategy
The model is trained **only on normal user days** (label=0) from the baseline period (`day < 2010-07-01`), ensuring the Isolation Forest learns a clean representation of typical behavior without contamination from insider activity.

### Feature Engineering (applied at inference time)
On top of the raw aggregated features, the model adds:
- **Change rates**: `logon_change`, `file_change`, `email_change` (day-over-day diff per user)
- **Z-scores**: `logon_zscore`, `file_zscore`, `email_zscore` (per-user normalization)

### Detection Pipeline

```
Temporal Splits:
  Train:      day < 2010-07-01   (normal behavior only)
  Validation: 2010-07-01 to 2010-09-01
  Test:        New uploaded data (or day >= 2010-09-01)

Model:
  IsolationForest(n_estimators=200, contamination=0.05, random_state=42)
  + StandardScaler (fit on train, transform on val/test)

Event-Level Scoring:
  anomaly_score = -model.decision_function(X_scaled)
  anomaly = (anomaly_score > event_threshold)

  Rolling Window:
  rolling_anomaly = 3-day rolling sum of anomaly flags per user
  temporal_flag   = (rolling_anomaly >= 2)  ← "2-out-of-3 days" rule

Threshold Calibration (on validation set):
  • Sweep 60 score thresholds × 5 temporal_min × 7 temporal_max values
  • Optimize F0.5 score (precision-weighted) with recall ≥ 50%
  • Safety floor: 85th percentile of validation anomaly scores

User-Level Aggregation:
  Per user: max(anomaly_score), sum(temporal_flag), max(label)

Final Prediction:
  flagged = (anomaly_score > score_threshold)
          & (temporal_flag >= temporal_min)
          & (temporal_flag <= temporal_max)
```

### Model Output Files

| File | Contents |
|---|---|
| `event_results.csv` | Per-user-day scores: `anomaly_score`, `temporal_flag`, `final_flag` |
| `user_summary.csv` | Per-user summary: `final_prediction` (0=clean, 1=flagged, 2=isolated) |
| `insiders.csv` | Only the users predicted as insiders, with original identity mapped back |

---

## 📡 API Reference

The FastAPI backend runs at **`http://localhost:8000`**.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/stats` | Dashboard KPIs: total users, flagged, TP, FP |
| `GET` | `/api/users` | Full user summary list with predictions |
| `GET` | `/api/events` | Per-day event results with all feature scores |
| `GET` | `/api/insiders` | Only predicted insider identities (with mapping) |
| `GET` | `/api/metrics` | Precision/Recall/F1 at user & event level |
| `GET` | `/api/health` | System health: node status, load, gateway info |
| `GET` | `/api/user-mapping` | Full hash → original username dictionary |
| `POST` | `/api/scan` | Upload a CSV file to run a new detection scan |
| `POST` | `/api/action/isolate` | Mark a user as isolated (`final_prediction = 2`) |
| `POST` | `/api/action/dismiss` | Dismiss a flagged event (`final_flag = 0`) |

**Interactive API docs:** `http://localhost:8000/docs` (Swagger UI)

---

## ⚙️ Setup & Installation

### Prerequisites
- **Python** 3.10 or higher
- **Node.js** 18 or higher
- **npm** (bundled with Node.js)
- *(Optional)* **Conda** for environment management

---

### 1. Clone the Repository
```bash
git clone <repository-url>
cd checkpointat2-main
```

---

### 2. Backend Setup

```bash
cd backend
```

**Option A — pip (recommended for most users):**
```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

pip install fastapi uvicorn pandas scikit-learn numpy python-multipart
```

**Option B — Conda:**
```bash
conda env create -f environment.yml
conda activate cryptadex-backend
pip install python-multipart  # add missing multipart support
```

**Start the backend server:**
```bash
python main.py
```
> The API will be live at `http://localhost:8000`

---

### 3. Frontend Setup

Open a **new terminal** and navigate to the frontend directory:

```bash
cd cryptadex-app
npm install
npm run dev
```
> The dashboard will open at `http://localhost:5173`

---

### 4. (Optional) Data Processing — Generate Your Own Dataset

If you have the raw CMU dataset, place all CSVs inside `backend/data/` and run:

```bash
cd backend
python process.py
```

This will generate `final_dataset.csv` and `user_mapping.csv` in the `backend/` directory.

---

## 🖥️ Usage Guide

### Running a New Scan

1. Open the dashboard at `http://localhost:5173`
2. Click **"START NEW SCAN"** in the left sidebar
3. Upload a pre-processed CSV file (e.g., `SAMPLE_INPUT.csv` from the project root)
4. The backend runs the full detection pipeline and refreshes the dashboard automatically

> **Input Format**: The uploaded CSV must match the schema produced by `process.py` — one row per user per day, with the 20+ behavioral features as columns.

### Investigating a Flagged User

1. From **Main Dashboard** or **Real-Time Detection**, find a flagged user entry
2. Click **"INVESTIGATE"** to navigate to the **User Behavior Analysis** page
3. Review their:
   - Risk trajectory over time
   - Daily anomaly score heatmap
   - Raw event log with feature breakdown

### Taking Action

| Action | Where | Effect |
|---|---|---|
| **ISOLATE** | Real-Time Detection, User Behavior | Sets `final_prediction = 2`; marks user as blocked |
| **DISMISS** | Real-Time Detection | Sets `final_flag = 0`; clears false-positive event |

---

## 🚀 Deployment

### Frontend — Netlify (Static Hosting)

The `cryptadex-app/` directory is pre-configured for Netlify deployment via `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

**Steps:**
1. Push `cryptadex-app/` to a GitHub repository
2. Connect the repo to [Netlify](https://netlify.com)
3. Netlify auto-detects the build config and deploys

### Backend — Render.com

The `backend/` directory is pre-configured for Render via `render.yaml`:

```yaml
services:
  - type: web
    name: cryptadex-backend
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: python main.py
    envVars:
      - key: PYTHON_VERSION
        value: "3.11"
```

**Steps:**
1. Push `backend/` to a GitHub repository
2. Connect the repo to [Render](https://render.com)
3. Update `API_URL` in `cryptadex-app/src/services/dataService.ts` to point to your Render URL

### Production Mode (Single Server)

The backend can serve the built frontend as static files. After `npm run build` inside `cryptadex-app/`:

```bash
cd backend
python main.py
```

The backend will serve the React SPA at `http://localhost:8000` and all `/api/*` routes remain available.

---

## 🔐 Privacy & Security

| Measure | Implementation |
|---|---|
| **User Anonymization** | All user IDs hashed with SHA-256 via `hashlib` before any feature computation or storage |
| **PC Anonymization** | PC identifiers also SHA-256 hashed in the processing pipeline |
| **Mapping Table** | A `user_mapping.csv` (hash → original) is stored locally and only used by authorized backend endpoints for investigation |
| **CORS Policy** | Backend configured with CORS middleware; restrict `allow_origins` before production use |
| **Decoupled Architecture** | Frontend and backend communicate via REST API; no direct DB access from the browser |

---

## 📊 Model Performance

CryptaDex achieves strong performance by combining unsupervised anomaly detection with temporal filtering:

| Metric | Description |
|---|---|
| **Precision** | High — calibrated threshold minimizes false positives from one-off user errors |
| **Recall** | Balanced — minimum 50% recall enforced during threshold grid search |
| **F1 / F0.5** | Optimized on validation set; F0.5 weighting favors precision for analyst efficiency |
| **Temporal Logic** | "2-out-of-3 day" rule greatly suppresses noise from single accidental events |

**Live metrics are visible** in the Main Dashboard under the *"Model Performance"* panel, including real-time Precision, Recall, F1, and Accuracy at both user-level and event-level granularity.

---

## 👥 Team & License

Developed for the **PS3: AI-Powered Insider Threat Detection System** challenge.

All core detection logic, feature engineering, and temporal analysis algorithms were implemented independently. The CMU CERT Insider Threat Dataset is used strictly for academic and research purposes in accordance with its terms of use.

> 🧠 **Dataset Credit**: CERT Division, Carnegie Mellon University — [CMU SEI CERT Insider Threat Dataset](https://resources.sei.cmu.edu/library/asset-view.cfm?assetid=508099)
