import sys
import os
import joblib
import numpy as np

# ---------------- PATH FIX ----------------
BASE_DIR = os.path.dirname(__file__)
MODEL_PATH = os.path.join(BASE_DIR, "emotion_model.pkl")

# Load trained model safely
model = joblib.load(MODEL_PATH)

# ---------------- INPUT ----------------
if len(sys.argv) < 2:
    print("normal|0.00")
    sys.exit(0)

text = sys.argv[1]

# ---------------- PREDICTION ----------------
prediction = model.predict([text])[0]

# Confidence score
if hasattr(model, "predict_proba"):
    confidence = float(np.max(model.predict_proba([text])))
else:
    confidence = 0.50  # fallback

# ---------------- OUTPUT ----------------
# Format: emotion|confidence
print(prediction)