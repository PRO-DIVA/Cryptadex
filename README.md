# CryptaDex: AI-Powered Insider Threat Detection System

![SOC Sentinel](https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=futuristic+cybersecurity+dashboard+with+threat+vectors+and+neural+network+patterns+dark+theme+high+tech&image_size=landscape_16_9)

## Project Overview
CryptaDex is an advanced, end-to-end security monitoring solution designed to identify and mitigate insider threats within organizational networks. By leveraging Machine Learning (Isolation Forests) and temporal behavioral analysis, CryptaDex transforms raw activity logs into actionable intelligence, providing security teams with a powerful "Sentinel" to protect sensitive data.

This project was developed in response to the **PS3: AI-Powered Insider Threat Detection System** prompt, focusing on high precision, real-time visualization, and logical investigation workflows.

---

## 🚀 Key Features

### 1. Detection Engine
- **ML Model**: Uses an **Isolation Forest** algorithm trained on normal user behavior to detect anomalies.
- **Temporal Filtering**: Implements a rolling window analysis to identify persistent suspicious patterns rather than one-off events.
- **Dynamic Thresholding**: Automatically calculates risk thresholds based on statistical distributions (Mean + 1.5 * StdDev) to balance sensitivity and false alarms.

### 2. Visualization & Insight Platform
- **Main Dashboard**: High-level KPIs, detection engine performance (TP/FP), and temporal threat trends.
- **Live Detection Feed**: Real-time terminal-style stream of system events with instant "Isolate" and "Dismiss" capabilities.
- **User Behavior Analysis**: Deep-dive investigation view for specific at-risk identities, showing risk trajectories and historical log feeds.
- **System Health**: Monitoring infrastructure integrity, node status, and ingestion capacity.

### 3. Data Processing Module
- **Pipeline**: Converts raw activity logs (logons, file access, email, web, device) into structured feature sets.
- **Feature Engineering**: Calculates Z-scores and change rates for key behavioral indicators to enhance model sensitivity.

### 4. Privacy & Security
- **Anonymization**: All user identifiers are hashed/anonymized in the UI and backend processing.
- **Secure Architecture**: Decoupled frontend (React) and backend (FastAPI) for secure data transmission.

---

## 🛠️ Tech Stack
- **Frontend**: React 19, Vite, Tailwind CSS 4, Recharts, Lucide React.
- **Backend**: FastAPI (Python 3), Pandas, Scikit-learn, NumPy, Uvicorn.
- **ML Model**: Isolation Forest with Temporal Aggregation.

---

## 📋 Setup Instructions

### Prerequisites
- Python 3.10+
- Node.js 18+
- npm

### Backend Setup
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install fastapi uvicorn pandas scikit-learn numpy python-multipart
   ```
4. Start the backend server:
   ```bash
   python3 main.py
   ```
   The API will be available at `http://localhost:8000`.

### Frontend Setup
1. Navigate to the `cryptadex-app` directory:
   ```bash
   cd cryptadex-app
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   The dashboard will be available at `http://localhost:5173`.

---

## 🔍 How to Use
1. **Initial View**: Open the dashboard to see current system stats and trends based on the default dataset.
2. **New Scan**: Click **"START NEW SCAN"** in the sidebar to upload a new CSV log file (e.g., `SAMPLE_INPUT.csv`). The backend will process it through the ML model.
3. **Investigate**: From the dashboard or live feed, click **"INVESTIGATE"** on any flagged user to see their detailed risk trajectory.
4. **Action**: Use **"ISOLATE"** to block a high-risk user or **"DISMISS"** for false positives.

---

## 📊 Evaluation Results
The system achieves a high F1-score by combining unsupervised anomaly detection with a temporal "2-out-of-3" day filter, significantly reducing noise from accidental user errors while capturing deliberate, multi-day threat patterns.

---

## 🛡️ License
Developed for the Insider Threat Detection Challenge. All core logic and algorithms implemented independently.
