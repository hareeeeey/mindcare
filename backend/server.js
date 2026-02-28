console.log("Starting server...");

import { execSync } from "child_process";
import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

/* ---------------- SIMPLE AUTH ---------------- */
const users = [{ email: "student@test.com", password: "1234" }];

app.post("/login", (req, res) => {
  const { email, password } = req.body;

  const ok = users.find(
    u => u.email === email && u.password === password
  );

  if (!ok) {
    return res.status(401).json({ success: false });
  }

  res.json({ success: true });
});

/* ---------------- OFFLINE RESPONSE ENGINE ---------------- */
const OFFLINE_RESPONSES = {
  stress: {
    intro: "Here are some ways to reduce stress:",
    suggestions: [
      "Take a slow deep breath and pause for a moment.",
      "Break your syllabus into smaller topics and study one at a time.",
      "Start with easier chapters to build confidence.",
      "Create a simple study schedule and follow it."
    ]
  },

  anxiety: {
    intro: "Here are some ways to calm anxiety:",
    suggestions: [
      "Inhale for 4 seconds and exhale for 6 seconds.",
      "Focus on what you can see and touch around you.",
      "Limit overthinking by focusing on the present moment.",
      "Take a short walk or step away from screens."
    ]
  },

  panic: {
    intro: "Here’s what you can do during panic:",
    suggestions: [
      "Sit down and focus on slow, steady breathing.",
      "Keep your feet firmly on the ground.",
      "Remind yourself that panic symptoms will pass.",
      "Stay present until your body settles."
    ]
  },

  sadness: {
    intro: "Here are some ways to cope right now:",
    suggestions: [
      "Rest without feeling guilty.",
      "Do one small comforting activity.",
      "Avoid complete isolation.",
      "Be kind to yourself today."
    ]
  },

  fatigue: {
    intro: "Here are ways to regain energy:",
    suggestions: [
      "Take short breaks instead of pushing continuously.",
      "Make sure you get proper sleep.",
      "Eat something healthy and drink water.",
      "Reduce workload where possible."
    ]
  },

  anger: {
    intro: "Here are ways to manage anger:",
    suggestions: [
      "Pause and take a few deep breaths.",
      "Move your body to release tension.",
      "Write down what triggered the feeling.",
      "Give yourself time before reacting."
    ]
  },

  fear: {
    intro: "Here are ways to deal with fear:",
    suggestions: [
      "Focus only on what you can control.",
      "Replace worst-case thoughts with realistic ones.",
      "Break the problem into small steps.",
      "Recall past situations you handled well."
    ]
  },

  confusion: {
    intro: "Here are ways to clear your mind:",
    suggestions: [
      "Write down what feels confusing.",
      "Handle one issue at a time.",
      "Ask someone you trust for clarity.",
      "Take a short mental break."
    ]
  },

  normal: {
    intro: "Here are some healthy habits to follow:",
    suggestions: [
      "Maintain a balanced daily routine.",
      "Take short breaks regularly.",
      "Pay attention to your mental well-being."
    ]
  }
};

/* ---------------- CHAT ROUTE ---------------- */
app.post("/chat", (req, res) => {
  // AUTH CHECK
  if (!req.headers["x-auth"]) {
    return res.status(401).json({
      reply: "Please login first."
    });
  }

  const userMessage = req.body.message;

  let emotion = "normal";
  let confidence = 0.0;

  try {
    const output = execSync(
      `python3 ../ml/predict.py "${userMessage.replace(/"/g, "")}"`
    )
      .toString()
      .trim();

    const [e, c] = output.split("|");
    emotion = e;
    confidence = parseFloat(c);

    console.log("Predicted:", emotion, confidence);
  } catch {
    console.error("Prediction failed");
  }

  /* ---------------- CRISIS HANDLING ---------------- */
  if (emotion === "crisis" && confidence >= 0.6) {
    return res.json({
      reply:
        "I’m really glad you reached out. If you’re feeling unsafe right now, please contact local emergency services or talk to someone you trust immediately."
    });
  }

  /* ---------------- ALWAYS GIVE SUGGESTIONS ---------------- */
  const response =
    OFFLINE_RESPONSES[emotion] || OFFLINE_RESPONSES.normal;

  const suggestions = response.suggestions
    .sort(() => 0.5 - Math.random())
    .slice(0, 3);

  let reply =
    response.intro + "\n\nHere are some things you can try:\n";

  suggestions.forEach(s => {
    reply += `• ${s}\n`;
  });

  res.json({ reply });
});

/* ---------------- START SERVER ---------------- */
app.listen(3000, () => {
  console.log("Backend running at http://localhost:3000");
});