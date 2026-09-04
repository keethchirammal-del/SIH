"""
Trains an XGBoost regressor to predict extra delay (minutes) for RailSense.

Since real live IR data isn't available, this generates a synthetic dataset
whose structure mirrors the routes already defined in app.js (halts, type,
approx distance), plus the three sliders your UI already collects:
weatherDelay, congestionDelay, signalDelay.

Run this once (or whenever you want to retrain):
    python train_model.py
It writes eta_model.pkl into this folder — main.py loads that file.
"""

import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error
import joblib

# Same 5 routes as in app.js's `routes` object, with halts + type carried over.
# distance_km is approximated from the route's coordinate list (straight-line-ish).
ROUTES = {
    "rajdhani": {"halts": 6, "is_nonstop": 0, "distance_km": 1385},
    "shatabdi": {"halts": 3, "is_nonstop": 0, "distance_km": 245},
    "duronto": {"halts": 2, "is_nonstop": 1, "distance_km": 192},
    "garib":   {"halts": 3, "is_nonstop": 0, "distance_km": 280},
    "tejas":   {"halts": 4, "is_nonstop": 0, "distance_km": 493},
}

RNG = np.random.default_rng(42)
N_SAMPLES = 6000

rows = []
route_keys = list(ROUTES.keys())

for _ in range(N_SAMPLES):
    route_key = route_keys[RNG.integers(0, len(route_keys))]
    r = ROUTES[route_key]

    # sliders — same 0-30 min range as your UI inputs
    weather_delay = RNG.integers(0, 31)
    congestion_delay = RNG.integers(0, 31)
    signal_delay = RNG.integers(0, 31)

    halts = r["halts"]
    is_nonstop = r["is_nonstop"]
    distance_km = r["distance_km"]

    # --- synthetic "ground truth" pattern (this is what XGBoost has to learn) ---
    # Delays interact rather than simply add: congestion hits harder on routes
    # with more halts (more places to queue behind another train), fog/weather
    # hits harder on longer routes, non-stop routes recover faster from signal
    # delays (fewer chances to get stuck behind precedence conflicts).
    base = (
        0.55 * weather_delay
        + 0.5 * congestion_delay * (1 + 0.12 * halts)
        + 0.45 * signal_delay * (0.7 if is_nonstop else 1.0)
        + 0.004 * distance_km
    )
    noise = RNG.normal(0, 3.5)
    extra_delay_min = max(0, base + noise)

    rows.append({
        "halts": halts,
        "is_nonstop": is_nonstop,
        "distance_km": distance_km,
        "weatherDelay": weather_delay,
        "congestionDelay": congestion_delay,
        "signalDelay": signal_delay,
        "extra_delay_min": extra_delay_min,
    })

df = pd.DataFrame(rows)

FEATURES = ["halts", "is_nonstop", "distance_km", "weatherDelay", "congestionDelay", "signalDelay"]
X = df[FEATURES]
y = df["extra_delay_min"]

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = xgb.XGBRegressor(
    n_estimators=300,
    max_depth=4,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    objective="reg:squarederror",
    random_state=42,
)
model.fit(X_train, y_train)

preds = model.predict(X_test)
mae = mean_absolute_error(y_test, preds)
rmse = mean_squared_error(y_test, preds) ** 0.5
print(f"Validation MAE:  {mae:.2f} min")
print(f"Validation RMSE: {rmse:.2f} min")
print("\nFeature importances:")
for feat, score in sorted(zip(FEATURES, model.feature_importances_), key=lambda x: -x[1]):
    print(f"  {feat:<16} {score:.3f}")

joblib.dump({"model": model, "features": FEATURES, "routes": ROUTES}, "eta_model.pkl")
print("\nSaved eta_model.pkl")
