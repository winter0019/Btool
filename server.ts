import express from "express";
import OpenAI from "openai";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: "50mb" }));

const openaiClient = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

type LessonBody = {
  level: string;
  subject: { name: string };
  topic: string;
  character: { name: string; description?: string };
};

app.get("/", (_req, res) => {
  res.send("Server is running");
});

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
  });
});

app.post("/api/generate-images", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Prompt is required" });
    }

    if (!openaiClient) {
      return res.status(503).json({ error: "OpenAI API key not configured" });
    }

    const result = await openaiClient.images.generate({
      model: "gpt-image-1",
      prompt,
      size: "1024x1024",
    });

    const b64 = result.data?.[0]?.b64_json;

    if (!b64) {
      return res.status(500).json({ error: "No image returned from OpenAI" });
    }

    return res.json({
      provider: "openai",
      imageBase64: b64,
      mimeType: "image/png",
    });
  } catch (error: any) {
    console.error("OpenAI image generation error:", error);
    return res.status(error?.status || 500).json({
      error: error?.message || "Cartoon generation failed",
    });
  }
});

app.post("/api/lesson", async (req, res) => {
  try {
    const { level, subject, topic, character } = req.body as LessonBody;

    if (!level || !subject?.name || !topic || !character?.name) {
      return res.status(400).json({ error: "Missing lesson fields" });
    }

    if (!openaiClient) {
      return res.status(503).json({ error: "OpenAI API key not configured" });
    }

    const lessonPrompt = `
You are an expert teacher for Nigerian students at the ${level} level.

Create a fun, educational, classroom-friendly lesson on:
Topic: "${topic}"
Subject: "${subject.name}"

Teaching character:
${character.name}${character.description ? ` - ${character.description}` : ""}

Rules:
- Use simple language suitable for children.
- Use Nigerian examples where natural.
- Keep it educational, clear, warm, and interactive.
- Make the character sound like a friendly teaching buddy.
- For Mathematics, make the examples visual and arithmetic-based.
- For Science, make the examples observational and practical.

Return valid JSON with:
{
  "title": string,
  "content": string,
  "characterGreeting": string,
  "cartoonDescription": string,
  "interactiveDemo": string,
  "quiz": [
    {
      "question": string,
      "options": string[],
      "answer": string
    }
  ]
}
`;

    const completion = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful educational assistant. Return only valid JSON.",
        },
        {
          role: "user",
          content: lessonPrompt,
        },
      ],
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    const lessonData = JSON.parse(raw);

    if (!Array.isArray(lessonData.quiz)) {
      lessonData.quiz = [];
    }

    const subjectIsMath = subject.name.toLowerCase().includes("math");

    const scenePrompt = subjectIsMath
      ? `Create a bright educational cartoon scene for primary or junior school students in Nigeria.
Topic: ${lessonData.title}.
Character: ${character.name}.
Show clear arithmetic visuals with large visible numbers and counted objects such as oranges, apples, books, balls, or farm produce.
Scene description: ${lessonData.cartoonDescription}.
Style: modern 3D cartoon, colorful, child-safe, educational, friendly.`
      : `Create a bright educational cartoon scene for Nigerian pupils.
Topic: ${lessonData.title}.
Character: ${character.name}.
Scene description: ${lessonData.cartoonDescription}.
Style: modern 3D cartoon, colorful, child-safe, educational, friendly.`;

    const characterPrompt = `Create a clean cartoon portrait of ${character.name}.
${character.description ? `Description: ${character.description}.` : ""}
Style: friendly, child-safe, 3D cartoon, centered face, plain background, suitable for a cartoon mask or avatar.`;

    let cartoonImageUrl = "";
    let characterImageUrl = "";

    try {
      const [sceneImage, characterImage] = await Promise.all([
        openaiClient.images.generate({
          model: "gpt-image-1",
          prompt: scenePrompt,
          size: "1024x1024",
        }),
        openaiClient.images.generate({
          model: "gpt-image-1",
          prompt: characterPrompt,
          size: "1024x1024",
        }),
      ]);

      const sceneB64 = sceneImage.data?.[0]?.b64_json;
      const charB64 = characterImage.data?.[0]?.b64_json;

      if (sceneB64) {
        cartoonImageUrl = `data:image/png;base64,${sceneB64}`;
      }

      if (charB64) {
        characterImageUrl = `data:image/png;base64,${charB64}`;
      }
    } catch (imgErr) {
      console.error("Lesson image generation failed:", imgErr);
    }

    return res.json({
      provider: "openai",
      ...lessonData,
      cartoonImageUrl,
      characterImageUrl,
    });
  } catch (error: any) {
    console.error("Lesson generation failed:", error);
    return res.status(error?.status || 500).json({
      error: error?.message || "Failed to generate lesson",
    });
  }
});

app.post("/api/speech", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Text is required" });
    }

    if (!openaiClient) {
      return res.status(503).json({ error: "OpenAI API key not configured" });
    }

    const speech = await openaiClient.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: `Say clearly and cheerfully for a student: ${text}`,
    });

    const buffer = Buffer.from(await speech.arrayBuffer());
    const base64Audio = buffer.toString("base64");

    return res.json({
      provider: "openai",
      audioUrl: `data:audio/mpeg;base64,${base64Audio}`,
    });
  } catch (error: any) {
    console.error("Speech generation failed:", error);
    return res.status(error?.status || 500).json({
      error: error?.message || "Failed to generate speech",
    });
  }
});

app.post("/api/analyze-voice", async (req, res) => {
  try {
    const { userInput, context, characterName } = req.body;

    if (!openaiClient) {
      return res.status(503).json({ error: "OpenAI API key not configured" });
    }

    const prompt = `
The student said: "${userInput}".
Lesson context: "${context}".
Character teaching: "${characterName}".

Evaluate:
- whether the answer is correct
- a gentle correction if needed
- a helpful hint
- pronunciation feedback
- clarity score from 0 to 100
- strengths
- improvements
- future hints

Return valid JSON:
{
  "isCorrect": boolean,
  "feedback": string,
  "hint": string,
  "pronunciationFeedback": string,
  "clarityScore": number,
  "strengths": string,
  "improvements": string,
  "futureHints": string
}
`;

    const completion = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Return only valid JSON." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });

    return res.json(JSON.parse(completion.choices[0]?.message?.content || "{}"));
  } catch (error: any) {
    console.error("Voice analysis failed:", error);
    return res.status(error?.status || 500).json({
      error: error?.message || "Failed to analyze voice",
    });
  }
});

app.post("/api/analyze-visual", async (req, res) => {
  try {
    const { characterName, context } = req.body;

    if (!openaiClient) {
      return res.status(503).json({ error: "OpenAI API key not configured" });
    }

    const prompt = `
Analyze a student's visual practice session.

Character: "${characterName}"
Lesson context: "${context}"

Return valid JSON:
{
  "actingScore": number,
  "emotion": string,
  "feedback": string,
  "strengths": string,
  "improvements": string,
  "futureHints": string
}
`;

    const completion = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Return only valid JSON." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });

    return res.json(JSON.parse(completion.choices[0]?.message?.content || "{}"));
  } catch (error: any) {
    console.error("Visual analysis failed:", error);
    return res.status(error?.status || 500).json({
      error: error?.message || "Failed to analyze visual practice",
    });
  }
});

async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    const indexPath = path.join(distPath, "index.html");

    app.use(express.static(distPath));

    app.get("*", (_req, res) => {
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error("Failed to send dist/index.html:", err);
          res.status(500).send("Frontend build not found.");
        }
      });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Server startup failed:", err);
  process.exit(1);
});

export { app };
