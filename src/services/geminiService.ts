import { GoogleGenAI, Type, Modality } from "@google/genai";
import { EducationLevel, Subject, CharacterBuddy } from "../types";

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (retries <= 0) throw err;
    await new Promise(resolve => setTimeout(resolve, delay));
    return withRetry(fn, retries - 1, delay * 2);
  }
}

export async function generateLesson(level: EducationLevel, subject: Subject, topic: string, character: CharacterBuddy) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const fetchLesson = () => ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are an expert teacher for Nigerian students at the ${level} level. 
    Create a fun, interactive lesson on the topic: "${topic}" for the subject: "${subject.name}".
    
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

  const response = await withRetry(fetchLesson);

  let lessonData;
  try {
    lessonData = JSON.parse(response.text || "{}");
  } catch (err) {
    console.error("Failed to parse AI response:", err);
    return {
      title: "Lesson Error",
      content: "Sorry, we had trouble preparing this lesson. Please try again.",
      cartoonDescription: "A teacher looking confused at a computer.",
      interactiveDemo: "Try refreshing the page.",
      quiz: [],
      cartoonImageUrl: "",
      characterImageUrl: ""
    };
  }

  // Generate a cartoon image based on the description and character
  try {
    const [sceneResponse, characterResponse] = await withRetry(() => Promise.all([
      ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: {
          parts: [{ text: `A high-quality, vibrant, educational cartoon illustration for a student. The scene features ${character.name} teaching about ${lessonData.title} in a friendly Nigerian classroom or setting. Description: ${lessonData.cartoonDescription}. Style: Modern 3D cartoon, bright colors, friendly, educational.` }],
        },
        config: { imageConfig: { aspectRatio: "16:9", imageSize: "1K" } }
      }),
      ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: {
          parts: [{ text: `A clean, high-quality portrait of ${character.name}. Style: 3D cartoon headshot, white background, friendly expression, perfect for a mask sticker. No background elements.` }],
        },
        config: { imageConfig: { aspectRatio: "1:1", imageSize: "1K" } }
      })
    ]));

    const sceneParts = sceneResponse.candidates?.[0]?.content?.parts;
    if (sceneParts) {
      for (const part of sceneParts) {
        if (part.inlineData) {
          lessonData.cartoonImageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    const characterParts = characterResponse.candidates?.[0]?.content?.parts;
    if (characterParts) {
      for (const part of characterParts) {
        if (part.inlineData) {
          lessonData.characterImageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }
    }
  } catch (err) {
    console.error("Failed to generate images:", err);
    lessonData.cartoonImageUrl = `https://picsum.photos/seed/${lessonData.title.replace(/\s/g, '')}/1200/675`;
    lessonData.characterImageUrl = `https://picsum.photos/seed/${character.name.replace(/\s/g, '')}/200/200`;
  }

  return lessonData;
}

export async function generateSpeech(text: string) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const response = await withRetry(() => ai.models.generateContent({
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
    }));

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      // Gemini TTS returns raw PCM 16-bit 24kHz. Browsers need a WAV header to play via src.
      const pcmData = Uint8Array.from(atob(base64Audio), c => c.charCodeAt(0));
      const wavHeader = new ArrayBuffer(44);
      const view = new DataView(wavHeader);

      // RIFF identifier
      view.setUint32(0, 0x52494646, false);
      // File length
      view.setUint32(4, 36 + pcmData.length, true);
      // RIFF type
      view.setUint32(8, 0x57415645, false);
      // Format chunk identifier
      view.setUint32(12, 0x666d7420, false);
      // Format chunk length
      view.setUint32(16, 16, true);
      // Sample format (1 is PCM)
      view.setUint16(20, 1, true);
      // Channel count (1 for mono)
      view.setUint16(22, 1, true);
      // Sample rate (24000)
      view.setUint32(24, 24000, true);
      // Byte rate (sample rate * block align)
      view.setUint32(28, 24000 * 2, true);
      // Block align (channel count * bytes per sample)
      view.setUint16(32, 2, true);
      // Bits per sample (16)
      view.setUint16(34, 16, true);
      // Data chunk identifier
      view.setUint32(36, 0x64617461, false);
      // Data chunk length
      view.setUint32(40, pcmData.length, true);

      const blob = new Blob([wavHeader, pcmData], { type: 'audio/wav' });
      return URL.createObjectURL(blob);
    }
  } catch (err) {
    console.error("TTS generation failed:", err);
  }
  return null;
}

export async function analyzeVoiceInput(userInput: string, context: string, characterName: string) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const response = await withRetry(() => ai.models.generateContent({
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
    }));
    return JSON.parse(response.text || "{}");
  } catch (err) {
    console.error("Voice analysis failed:", err);
    return { 
      isCorrect: false, 
      feedback: "I couldn't quite hear that. Could you try again?", 
      hint: "Try speaking clearly!",
      pronunciationFeedback: "Try to articulate each word clearly.",
      clarityScore: 0,
      strengths: "You're trying your best!",
      improvements: "Speak a bit louder next time.",
      futureHints: "Practice saying the words slowly."
    };
  }
}

export async function analyzeVisualPractice(imageData: string, characterName: string, context: string) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { data: imageData.split(',')[1], mimeType: "image/jpeg" } },
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
    }));

    return JSON.parse(response.text || "{}");
  } catch (err) {
    console.error("Visual analysis failed:", err);
    return {
      actingScore: 50,
      emotion: "neutral",
      feedback: "Keep practicing your character acting! You're doing great.",
      strengths: "You have a great spirit!",
      improvements: "Try to be more expressive with your face.",
      futureHints: "Watch how the character moves and try to copy them!"
    };
  }
}
