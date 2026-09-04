"""
RailSense prediction API.

Run:
    uvicorn main:app --reload --port 8000

Exposes POST /predict/eta — takes a route key + the same three slider
values your dashboard already has (weatherDelay, congestionDelay,
signalDelay) and returns a model-predicted extra delay in minutes.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import joblib
import pandas as pd

app = FastAPI(title="RailSense ETA API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten to your deployed frontend domain before going live
    allow_methods=["*"],
    allow_headers=["*"],
)

bundle = joblib.load("eta_model.pkl")
model = bundle["model"]
FEATURES = bundle["features"]
ROUTES = bundle["routes"]

# Base scheduled ETA per route, same values currently hardcoded in
# app.js's confidenceProfiles — kept here so the API can return a full
# projected ETA, not just a delay figure.
BASE_ETA = {
    "rajdhani": "19:04",
    "shatabdi": "18:42",
    "duronto": "19:26",
    "garib": "19:18",
    "tejas": "20:02",
}


class SimulationRequest(BaseModel):
    routeKey: str
    weatherDelay: float = Field(ge=0, le=30)
    congestionDelay: float = Field(ge=0, le=30)
    signalDelay: float = Field(ge=0, le=30)


@app.post("/predict/eta")
def predict_eta(req: SimulationRequest):
    if req.routeKey not in ROUTES:
        raise HTTPException(status_code=404, detail=f"Unknown route '{req.routeKey}'")

    route = ROUTES[req.routeKey]
    features = pd.DataFrame([{
        "halts": route["halts"],
        "is_nonstop": route["is_nonstop"],
        "distance_km": route["distance_km"],
        "weatherDelay": req.weatherDelay,
        "congestionDelay": req.congestionDelay,
        "signalDelay": req.signalDelay,
    }])[FEATURES]

    predicted_delay = float(model.predict(features)[0])
    predicted_delay = round(max(0, predicted_delay), 1)

    base_h, base_m = map(int, BASE_ETA[req.routeKey].split(":"))
    total_minutes = base_h * 60 + base_m + predicted_delay
    total_minutes %= 24 * 60
    projected_h, projected_m = divmod(int(total_minutes), 60)

    return {
        "routeKey": req.routeKey,
        "predicted_delay_min": predicted_delay,
        "projected_eta": f"{projected_h:02d}:{projected_m:02d}",
    }


@app.get("/health")
def health():
    return {"status": "ok"}
