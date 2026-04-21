import express from "express";
import fs from "fs";
import path from "path";
import cors from "cors";
import { exec } from "child_process"; // ✅ ML integration

const app = express();
app.use(cors());
app.use(express.json());

const USERS_FILE = path.join(process.cwd(), "data/users.json");

/* -------- HELPERS -------- */
function readUsers() {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE));
  } catch {
    return [];
  }
}

function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

/* -------- ML FUNCTION -------- */
function getEmotion(text) {
  return new Promise((resolve) => {
const scriptPath = path.join(process.cwd(), "..", "ml", "predict.py");
    exec(`python3 "${scriptPath}" "${text}"`, (error, stdout, stderr) => {
      if (error) {
        console.log("ML ERROR:", error.message);
        return resolve("neutral");
      }

      const emotion = stdout.trim();
      resolve(emotion || "neutral");
    });
  });
}

/* -------- SIGNUP -------- */
app.post("/signup", (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.json({ success: false, message: "All fields required" });
  }

  let users = readUsers();

  if (users.find(u => u.email === email)) {
    return res.json({ success: false, message: "User already exists" });
  }

  users.push({ name, email, password });
  writeUsers(users);

  res.json({ success: true });
});

/* -------- LOGIN -------- */
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  const users = readUsers();

  const user = users.find(
    u => u.email === email && u.password === password
  );

  if (!user) {
    return res.status(401).json({ success: false });
  }

  res.json({
    success: true,
    user: {
      name: user.name,
      email: user.email
    }
  });
});

/* -------- CHAT -------- */
app.post("/chat", async (req, res) => {

  const email = req.headers["x-auth"];
  const { message } = req.body;

  if (!email) {
    return res.status(401).json({ reply: "Login first" });
  }

  const users = readUsers();
  const user = users.find(u => u.email === email);

  if (!user) {
    return res.status(401).json({ reply: "Invalid session" });
  }

  try {
    // 🔥 STEP 1: GET EMOTION FROM ML
    const emotion = await getEmotion(message);
    console.log("PREDICTED EMOTION:", emotion);

    // 🔥 STEP 2: CALL OPENROUTER
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer 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", // 🔥 PUT YOUR KEY HERE
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `
You are a mental health support assistant.

User emotion: ${emotion}

IMPORTANT:
- First, acknowledge the user's feeling naturally
- Then give specific, practical advice based on their situation
- Adapt your response based on the emotion
- Give 3–5 actionable tips
- Keep it concise

If emotion is:
- stress → give calming + planning tips
- anxiety → give grounding + breathing techniques
- sadness → give emotional support + small steps

Tone:
- calm
- human
- supportive

Always try to actually help solve the problem.
`
          },
          {
            role: "user",
            content: message
          }
        ]
      })
    });

    // 🔴 API ERROR CHECK
    if (!response.ok) {
      const errorText = await response.text();
      console.log("API ERROR:", errorText);

      return res.json({
        reply: "API error — check terminal"
      });
    }

    const data = await response.json();

    console.log("OPENROUTER RESPONSE:", JSON.stringify(data, null, 2));

    let reply = null;

    if (data?.choices?.[0]?.message?.content) {
      reply = data.choices[0].message.content;
    } else if (data?.choices?.[0]?.text) {
      reply = data.choices[0].text;
    } else if (data?.error?.message) {
      reply = "API Error: " + data.error.message;
    }

    if (!reply) {
      reply = `Hey ${user.name}, I’m here for you. Tell me more.`;
    }

    return res.json({ reply });

  } catch (err) {
    console.log("SERVER ERROR:", err.message);

    return res.json({
      reply: `Hey ${user.name}, something went wrong. Try again.`
    });
  }

});

/* -------- START -------- */
app.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});