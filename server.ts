import express from "express";
import { GoogleGenAI, Type, Modality } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json({ limit: '50mb' }));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// API Routes
app.post("/api/lesson", async (req, res) => {
  try {
    const { level, subjectName, topic, character } = req.body;
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are an expert teacher for Nigerian students at the ${level} level. 
      Create a fun, interactive lesson on the topic: "${topic}" for the subject: "${subjectName}".
      
      Your teaching assistant is ${character.name} (${character.description}).
      
      Guidelines:
      - Use clear, engaging language suitable for ${level}.
      - The character ${character.name} should be the one "teaching" the lesson in the content, using their unique personality and catchphrases.
      - Include a "Character Greeting" from ${character.name} to the student.
      - Include a "Cartoon Scene" description featuring ${character.name} in a Nigerian setting related to the topic.
      - Include an "Interactive Demo" idea.
      - Keep it engaging and culturally relevant to Nigeria.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            content: { type: Type.STRING, description: "The main lesson text in Markdown" },
            characterGreeting: { type: Type.STRING, description: "A friendly greeting from the character" },
            cartoonDescription: { type: Type.STRING, description: "Description of a cartoon scene to accompany the lesson" },
            interactiveDemo: { type: Type.STRING, description: "A simple interactive task for the student" },
            quiz: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING }, description: "At least 3 multiple choice options" },
                  answer: { type: Type.STRING, description: "The correct option from the options array" }
                },
                required: ["question", "options", "answer"]
              }
            }
          },
          required: ["title", "content", "characterGreeting", "cartoonDescription", "interactiveDemo", "quiz"]
        }
      }
    });

    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.error("Lesson generation error:", error);
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.post("/api/generate-images", async (req, res) => {
  try {
    const { characterName, lessonTitle, cartoonDescription } = req.body;

    const sceneResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `A high-quality, vibrant, educational cartoon illustration for a student. The scene features ${characterName} teaching about ${lessonTitle} in a friendly Nigerian classroom or setting. Description: ${cartoonDescription}. Style: Modern 3D cartoon, bright colors, friendly, educational.` }],
      },
      config: { imageConfig: { aspectRatio: "16:9" } }
    });

    const characterResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `A clean, high-quality portrait of ${characterName}. Style: 3D cartoon headshot, white background, friendly expression, perfect for a mask sticker. No background elements.` }],
      },
      config: { imageConfig: { aspectRatio: "1:1" } }
    });

    const result: any = { cartoonImageUrl: null, characterImageUrl: null };

    const sceneParts = sceneResponse.candidates?.[0]?.content?.parts;
    if (sceneParts) {
      for (const part of sceneParts) {
        if (part.inlineData) {
          result.cartoonImageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    const characterParts = characterResponse.candidates?.[0]?.content?.parts;
    if (characterParts) {
      for (const part of characterParts) {
        if (part.inlineData) {
          result.characterImageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    res.json(result);
  } catch (error: any) {
    console.error("Image generation error:", error);
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.post("/api/speech", async (req, res) => {
  try {
    const { text } = req.body;
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Say clearly and cheerfully for a student: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    res.json({ audio: base64Audio });
  } catch (error: any) {
    console.error("Speech generation error:", error);
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.post("/api/analyze-voice", async (req, res) => {
  try {
    const { userInput, context, characterName } = req.body;
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `The student said: "${userInput}". 
      The context of the lesson is: "${context}".
      The character teaching is: "${characterName}".
      Evaluate if the student is correct, provide a gentle correction if needed, and give a helpful hint to improve their understanding. 
      Also, provide specific feedback on their pronunciation and clarity of speech.
      Identify:
      1. Strengths: What did they do well?
      2. Improvements: What specifically should they work on?
      3. Future Hints: How can they improve for next time?
      The feedback should be in the voice and personality of ${characterName}.
      Keep the tone encouraging and suitable for a Nigerian student.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isCorrect: { type: Type.BOOLEAN },
            feedback: { type: Type.STRING },
            hint: { type: Type.STRING },
            pronunciationFeedback: { type: Type.STRING, description: "Specific feedback on how to pronounce words better" },
            clarityScore: { type: Type.INTEGER, description: "Score from 0 to 100 on how clear the speech was" },
            strengths: { type: Type.STRING, description: "What the student did well" },
            improvements: { type: Type.STRING, description: "What the student should improve" },
            futureHints: { type: Type.STRING, description: "Hints for future practice" }
          },
          required: ["isCorrect", "feedback", "hint", "pronunciationFeedback", "clarityScore", "strengths", "improvements", "futureHints"]
        }
      }
    });
    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.error("Voice analysis error:", error);
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.post("/api/analyze-visual", async (req, res) => {
  try {
    const { imageData, characterName, context } = req.body;
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { data: imageData, mimeType: "image/jpeg" } },
          { text: `Analyze the student's performance in this visual practice session. 
          The student is acting or talking like the character: "${characterName}".
          The context of the lesson is: "${context}".
          Evaluate:
          1. Acting/Engagement: How well are they embodying the character?
          2. Facial Expression & Posture: Are they focused and expressive?
          3. Strengths: What did they do well in their performance?
          4. Improvements: What could they do better?
          5. Future Hints: How to improve their acting or focus for next time?
          The feedback should be in the voice and personality of ${characterName}.
          Keep the tone encouraging and suitable for a Nigerian student.` }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            actingScore: { type: Type.NUMBER, description: "Score from 0 to 100 on how well they embodied the character" },
            emotion: { type: Type.STRING, description: "The detected primary emotion" },
            feedback: { type: Type.STRING, description: "A supportive message from the character" },
            strengths: { type: Type.STRING, description: "What the student did well visually" },
            improvements: { type: Type.STRING, description: "What the student should improve visually" },
            futureHints: { type: Type.STRING, description: "Hints for future visual practice" }
          },
          required: ["actingScore", "emotion", "feedback", "strengths", "improvements", "futureHints"]
        }
      }
    });
    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.error("Visual analysis error:", error);
    res.status(error.status || 500).json({ error: error.message });
  }
});

export async function startServer() {
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
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (process.env.NODE_ENV !== "production" || !process.env.NETLIFY) {
  startServer();
}

export { app };

