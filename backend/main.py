from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import json
import os
import shutil
from sklearn.metrics import precision_score, recall_score, f1_score, accuracy_score
from model import run_insider_detection

# Configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
EVENT_FILE = os.path.join(BASE_DIR, "event_results.csv")
USER_FILE = os.path.join(BASE_DIR, "user_summary.csv")
INSIDER_FILE = os.path.join(BASE_DIR, "insiders.csv")
MAPPING_FILE = os.path.join(BASE_DIR, "user_mapping.csv")

_mapping_cache = {"mtime": None, "data": None}

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def _get_user_mapping():
    if not os.path.exists(MAPPING_FILE):
        _mapping_cache["mtime"] = None
        _mapping_cache["data"] = None
        return None
    mtime = os.path.getmtime(MAPPING_FILE)
    if _mapping_cache["mtime"] != mtime:
        mapping = pd.read_csv(MAPPING_FILE)
        if "hashed_user" in mapping.columns and "original_user" in mapping.columns:
            mapping = mapping.dropna(subset=["hashed_user", "original_user"])
            _mapping_cache["data"] = dict(zip(mapping["hashed_user"].astype(str), mapping["original_user"].astype(str)))
            _mapping_cache["mtime"] = mtime
        else:
            _mapping_cache["mtime"] = None
            _mapping_cache["data"] = None
    return _mapping_cache["data"]


def parse_csv_to_dict(filepath, attach_mapping: bool = False):
    if not os.path.exists(filepath):
        return []
    df = pd.read_csv(filepath)
    # Replace NaNs with None for valid JSON serialization
    df = df.where(pd.notnull(df), None)
    records = df.to_dict(orient="records")
    if attach_mapping:
        mapping = _get_user_mapping()
        if mapping is not None:
            for r in records:
                if r.get("original_user") is None and r.get("user") is not None:
                    r["original_user"] = mapping.get(str(r["user"]))
    return records


def _binary_metrics(y_true, y_pred):
    if y_true is None or y_pred is None:
        return {"precision": None, "recall": None, "f1": None, "accuracy": None}
    
    # Ensure they are numeric and same length
    y_true = pd.Series(y_true).fillna(0).astype(int)
    y_pred = pd.Series(y_pred).fillna(0).astype(int)
    
    if len(y_true) == 0:
        return {"precision": None, "recall": None, "f1": None, "accuracy": None}
        
    return {
        "precision": float(precision_score(y_true, y_pred, pos_label=1, zero_division=0)),
        "recall": float(recall_score(y_true, y_pred, pos_label=1, zero_division=0)),
        "f1": float(f1_score(y_true, y_pred, pos_label=1, zero_division=0)),
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "support": int(len(y_true)),
        "positives": int((y_true == 1).sum()),
        "predicted_positives": int((y_pred == 1).sum()),
    }

@app.get("/api/users")
def get_users():
    """Returns the list of user summaries with predictions and labels."""
    return parse_csv_to_dict(USER_FILE, attach_mapping=False)

@app.get("/api/events")
def get_events():
    """Returns the raw event results."""
    return parse_csv_to_dict(EVENT_FILE, attach_mapping=False)


@app.get("/api/insiders")
def get_insiders():
    """Returns only predicted insider identities; reveals original_user when mapping exists."""
    return parse_csv_to_dict(INSIDER_FILE, attach_mapping=True)


@app.get("/api/user-mapping")
def get_user_mapping():
    """Returns the full hash-to-original user mapping dictionary."""
    mapping = _get_user_mapping()
    if mapping is None:
        return {}
    return mapping

@app.get("/api/stats")
def get_stats():
    """Returns aggregated dashboard stats directly from the CSV data."""
    users = parse_csv_to_dict(USER_FILE)
    if not users:
        return {"total_users": 0, "flagged": 0, "true_positives": 0, "false_positives": 0}
        
    df = pd.DataFrame(users)
    total_users = len(df)
    
    # Accurate stats based on backend definitions
    flagged = int((df['final_prediction'] >= 1).sum())
    tp = int(((df['final_prediction'] >= 1) & (df['label'] == 1)).sum())
    fp = int(((df['final_prediction'] >= 1) & (df['label'] == 0)).sum())
    
    return {
        "total_users": total_users,
        "flagged": flagged,
        "true_positives": tp,
        "false_positives": fp
    }


@app.get("/api/metrics")
def get_metrics():
    if not os.path.exists(USER_FILE) or not os.path.exists(EVENT_FILE):
        return {"user_level": {"precision": None, "recall": None, "f1": None}, "event_level": {"precision": None, "recall": None, "f1": None}}

    user_df = pd.read_csv(USER_FILE)
    event_df = pd.read_csv(EVENT_FILE)

    user_true = user_df["label"] if "label" in user_df.columns else None
    user_pred = (user_df["final_prediction"] >= 1).astype(int) if "final_prediction" in user_df.columns else None

    # For event level, we calculate metrics based on the current visible events
    event_true = event_df["label"] if "label" in event_df.columns else None
    event_pred = (event_df["final_flag"] >= 1).astype(int) if "final_flag" in event_df.columns else None

    return {
        "user_level": _binary_metrics(user_true, user_pred), 
        "event_level": _binary_metrics(event_true, event_pred)
    }

@app.post("/api/scan")
async def scan_data(file: UploadFile = File(...)):
    """Receives a CSV file, runs the ML model, and updates the local CSVs."""
    upload_path = os.path.join(BASE_DIR, "uploaded_data.csv")
    with open(upload_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Run the detection model on the new data
    results = run_insider_detection(input_path=upload_path)
    
    # Save the new results to disk so the dashboard updates on next fetch
    results["event_data"].to_csv(EVENT_FILE, index=False)
    results["user_summary"].to_csv(USER_FILE, index=False)
    if results.get("insiders") is not None:
        results["insiders"].to_csv(INSIDER_FILE, index=False)
    
    return {"status": "success", "message": "Scan complete", "metrics": results.get("metrics")}

@app.get("/api/health")
def get_health():
    """Returns simulated system health data."""
    users = parse_csv_to_dict(USER_FILE)
    events = parse_csv_to_dict(EVENT_FILE)
    
    flagged_users = sum(1 for u in users if u.get('final_prediction') == 1)
    critical_events = sum(1 for e in events if e.get('final_flag') == 1)
    
    # Calculate a dynamic health score (base 100, drops with alerts)
    health_score = max(45, 100 - (flagged_users * 2) - (critical_events / 10))
    
    return {
        "status": "OPTIMAL" if health_score > 90 else "STABLE" if health_score > 70 else "DEGRADED",
        "score": round(health_score, 2),
        "uptime": "142 Days, 04:22:11",
        "nodes": [
            {"id": "UID_4921_ALPHA", "cluster": "Primary_DC_West", "status": "Healthy", "load": 34},
            {"id": "UID_8830_SIGMA", "cluster": "Backup_Relay_04", "status": "Healthy", "load": 12},
            {"id": "UID_1102_DELTA", "cluster": "Gateway_External", "status": "Healthy", "load": 78},
            {"id": "UID_7231_GAMMA", "cluster": "Mail_Filter_Array", "status": "Healthy", "load": 44}
        ],
        "gateways": {"total": 14, "stable": 14},
        "endpoints": {"total": 2400, "active": 2352},
        "network_nodes": {"total": 89, "synced": 89}
    }

@app.post("/api/action/isolate")
async def isolate_user(user_id: str = Form(...)):
    """Isolates a user by updating their prediction status in the CSV."""
    if not os.path.exists(USER_FILE):
        return {"status": "error", "message": "User file not found"}
        
    df = pd.read_csv(USER_FILE)
    if user_id in df['user'].values:
        # We'll set final_prediction to 2 to indicate 'isolated'
        df.loc[df['user'] == user_id, 'final_prediction'] = 2
        df.to_csv(USER_FILE, index=False)
        return {"status": "success", "message": f"User {user_id} isolated"}
    return {"status": "error", "message": f"User {user_id} not found"}

@app.post("/api/action/dismiss")
async def dismiss_event(event_id: str = Form(...), user_id: str = Form(None), day: str = Form(None)):
    """Dismisses a security event by updating the final_flag in the CSV."""
    if not os.path.exists(EVENT_FILE):
        return {"status": "error", "message": "Event file not found"}
        
    df = pd.read_csv(EVENT_FILE)
    
    # Since event_id is just an index from the frontend, we use user_id and day if provided
    if user_id and day:
        mask = (df['user'] == user_id) & (df['day'] == day)
        if mask.any():
            df = df[~mask]
            df.to_csv(EVENT_FILE, index=False)
            return {"status": "success", "message": f"Event for {user_id} on {day} dismissed and removed"}
    else:
        # Fallback to index if user_id/day not provided (less reliable if CSV changed)
        try:
            idx = int(event_id)
            if 0 <= idx < len(df):
                df = df.drop(df.index[idx])
                df.to_csv(EVENT_FILE, index=False)
                return {"status": "success", "message": "Event dismissed and removed"}
        except (ValueError, IndexError):
            pass
            
    return {"status": "error", "message": "Event not found"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
