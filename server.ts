import express from "express";
import { GoogleGenAI, Type, Modality } from "@google/genai";
import OpenAI from "openai";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

const app = express();
app.use(express.json({ limit: '50mb' }));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

// API Routes
app.post("/api/lesson", async (req, res) => {
  try {
    const { level, subjectName, topic, character } = req.body;
    
    const prompt = `You are an expert teacher for Nigerian students at the ${level} level. 
      Create a fun, interactive lesson on the topic: "${topic}" for the subject: "${subjectName}".
      
      Your teaching assistant is ${character.name} (${character.description}).
      
      Guidelines:
      - Use clear, engaging language suitable for ${level}.
      - The character ${character.name} should be the one "teaching" the lesson in the content, using their unique personality and catchphrases.
      - Include a "Character Greeting" from ${character.name} to the student.
      - Include a "Cartoon Scene" description featuring ${character.name} in a Nigerian setting related to the topic.
      - Include an "Interactive Demo" idea.
      - Keep it engaging and culturally relevant to Nigeria.
      
      Return a JSON object with: title, content (Markdown), characterGreeting, cartoonDescription, interactiveDemo, and quiz (array of objects with question, options, answer).`;

    try {
      // Try Gemini first
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              content: { type: Type.STRING },
              characterGreeting: { type: Type.STRING },
              cartoonDescription: { type: Type.STRING },
              interactiveDemo: { type: Type.STRING },
              quiz: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                    answer: { type: Type.STRING }
                  },
                  required: ["question", "options", "answer"]
                }
              }
            },
            required: ["title", "content", "characterGreeting", "cartoonDescription", "interactiveDemo", "quiz"]
          }
        }
      });
      return res.json(JSON.parse(response.text || "{}"));
    } catch (geminiError) {
      console.warn("Gemini lesson generation failed, trying OpenAI fallback:", geminiError);
      if (openai) {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You are a helpful educational assistant. Always respond in valid JSON." },
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" }
        });
        return res.json(JSON.parse(completion.choices[0].message.content || "{}"));
      }
      throw geminiError;
    }
  } catch (error: any) {
    console.error("Lesson generation error:", error);
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.post("/api/generate-images", async (req, res) => {
  try {
    const { characterName, lessonTitle, cartoonDescription } = req.body;

    console.log(`Generating images for: ${characterName} - ${lessonTitle}`);

    const scenePrompt = `A high-quality, vibrant, educational cartoon illustration for a student. The scene features ${characterName} teaching about ${lessonTitle} in a friendly Nigerian classroom or setting. Description: ${cartoonDescription}. Style: Modern 3D cartoon, bright colors, friendly, educational.`;
    const characterPrompt = `A clean, high-quality portrait of ${characterName}. Style: 3D cartoon headshot, white background, friendly expression, perfect for a mask sticker. No background elements.`;

    const result: any = { cartoonImageUrl: null, characterImageUrl: null };

    try {
      // Try Gemini first
      const [sceneResponse, characterResponse] = await Promise.all([
        ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts: [{ text: scenePrompt }] },
          config: { imageConfig: { aspectRatio: "16:9" } }
        }),
        ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts: [{ text: characterPrompt }] },
          config: { imageConfig: { aspectRatio: "1:1" } }
        })
      ]);

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
    } catch (geminiError: any) {
      console.warn("Gemini image generation failed, trying OpenAI fallback:", geminiError.message);
      if (openai) {
        const [sceneImg, charImg] = await Promise.all([
          openai.images.generate({
            model: "dall-e-3",
            prompt: scenePrompt,
            n: 1,
            size: "1024x1024",
            response_format: "b64_json"
          }),
          openai.images.generate({
            model: "dall-e-3",
            prompt: characterPrompt,
            n: 1,
            size: "1024x1024",
            response_format: "b64_json"
          })
        ]);
        result.cartoonImageUrl = `data:image/png;base64,${sceneImg.data[0].b64_json}`;
        result.characterImageUrl = `data:image/png;base64,${charImg.data[0].b64_json}`;
      } else {
        throw geminiError;
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
    
    // Try OpenAI TTS first if available (often higher quality for varied accents)
    if (openai) {
      try {
        const mp3 = await openai.audio.speech.create({
          model: "tts-1",
          voice: "alloy",
          input: text,
        });
        const buffer = Buffer.from(await mp3.arrayBuffer());
        return res.json({ audio: buffer.toString('base64'), format: 'mp3' });
      } catch (openaiError) {
        console.warn("OpenAI TTS failed, falling back to Gemini:", openaiError);
      }
    }

    // Gemini Fallback
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
    res.json({ audio: base64Audio, format: 'pcm' });
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

