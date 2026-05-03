import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

/* ================== DB ================== */
mongoose.connect("mongodb://127.0.0.1:27017/mindcare")
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

/* ================== SCHEMA ================== */
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  emotion: String
});

const User = mongoose.model("User", userSchema);

/* ================== MEMORY ================== */
const conversations = {}; // stores chat per user

/* ================== SIGNUP ================== */
app.post("/signup", async (req, res) => {
  try {
    const { username, password, emotion } = req.body;

    if (!username || !password || !emotion) {
      return res.json({ success: false, message: "All fields required" });
    }

    const existingUser = await User.findOne({ username });

    if (existingUser) {
      return res.json({ success: false, message: "User already exists" });
    }

    await User.create({ username, password, emotion });

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ success: false });
  }
});

/* ================== LOGIN ================== */
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username, password });

    if (!user) {
      return res.status(401).json({ success: false });
    }

    res.json({
      success: true,
      user: { username: user.username }
    });

  } catch (err) {
    res.status(500).json({ success: false });
  }
});

/* ================== CHAT ================== */
app.post("/chat", async (req, res) => {
  try {
    const username = req.headers["x-auth"];
    const { message } = req.body;

    if (!username) {
      return res.status(401).json({ reply: "Login first" });
    }

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(401).json({ reply: "Invalid session" });
    }

    const finalEmotion = user.emotion || "neutral";

    /* ===== INIT MEMORY ===== */
    if (!conversations[username]) {
      conversations[username] = [
        {
          role: "system",
          content: `
You are a supportive mental health assistant.

STRICT RULES:
- Do NOT use ** or markdown symbols
- Use clean readable text only
- Use proper spacing between lines
- Use numbering for steps
- No repeated responses
- Understand context and continue conversation

RESPONSE FORMAT:
1. One short empathy line
2. 3 to 5 clear points (numbered)
3. One short supportive closing line

STYLE:
- Clean like ChatGPT
- Not too long
- Not too short
- Human tone

User emotion: ${finalEmotion}
          `
        }
      ];
    }

    /* ===== ADD USER MESSAGE ===== */
    conversations[username].push({
      role: "user",
      content: message
    });

    /* ===== AI CALL ===== */
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer YOUR_API_KEY_HERE"",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: conversations[username],
        temperature: 0.7,
        max_tokens: 400
      })
    });

    const data = await response.json();

    let reply = data?.choices?.[0]?.message?.content;

    /* ===== FALLBACK ===== */
    if (!reply) {
      reply = `Hey ${user.username}, I understand you're feeling ${finalEmotion}. Try taking a short break and focus on one step at a time.`;
    }

    /* ===== SAVE BOT RESPONSE ===== */
    conversations[username].push({
      role: "assistant",
      content: reply
    });

    res.json({ reply });

  } catch (err) {
    console.log(err);
    res.json({ reply: "Something went wrong. Try again." });
  }
});

/* ================== START ================== */
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});