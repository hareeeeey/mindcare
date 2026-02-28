import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
import joblib

# Load dataset
data = pd.read_csv("dataset.csv")

X = data["text"]
y = data["label"]

# Create ML pipeline
model = Pipeline([
    ("tfidf", TfidfVectorizer(stop_words="english")),
    ("clf", LogisticRegression(max_iter=1000))
])

# Train model
model.fit(X, y)

# Save trained model
joblib.dump(model, "emotion_model.pkl")

print("Model trained and saved as emotion_model.pkl")