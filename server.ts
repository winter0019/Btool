import express from "express";
import OpenAI from "openai";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

const app = express();
app.use(express.json({ limit: '50mb' }));

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

// API Routes (Only OpenAI fallbacks if needed, but primary logic moved to frontend)
app.post("/api/generate-images", async (req, res) => {
  try {
    const { prompt, size = "1024x1024", model = "gpt-image-1" } = req.body;

    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ error: "OpenAI API key not configured" });
    }

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model,
        prompt,
        size,
        response_format: "b64_json"
      })
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error: any) {
    console.error("OpenAI Image Generation Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/lesson-fallback", async (req, res) => {
  try {
    const { level, subjectName, topic, character } = req.body;
    
    if (!openai) {
      return res.status(503).json({ error: "OpenAI fallback not configured" });
    }

    const prompt = `You are an expert teacher for Nigerian students at the ${level} level. 
      Create a fun, interactive lesson on the topic: "${topic}" for the subject: "${subjectName}".
      Assistant: ${character.name}.
      Return a JSON object with: title, content (Markdown), characterGreeting, cartoonDescription, interactiveDemo, and quiz.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a helpful educational assistant. Always respond in valid JSON." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });
    
    res.json(JSON.parse(completion.choices[0].message.content || "{}"));
  } catch (error: any) {
    console.error("OpenAI Fallback Error:", error);
    res.status(error.status || 500).json({ error: error.message });
  }
});

async function startServer() {
  const PORT = 3000;

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files from dist in production
    app.use(express.static("dist"));
    
    // SPA fallback for production
    app.get("*", (req, res) => {
      res.sendFile(path.resolve("dist/index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

export { app };
