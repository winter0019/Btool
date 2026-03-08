import { GoogleGenAI, Type, Modality } from "@google/genai";
import { EducationLevel, Subject, CharacterBuddy } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    const message = err.message || String(err);
    const is429 = err.status === 429 || message.includes('429') || message.includes('RESOURCE_EXHAUSTED');
    const is503 = err.status === 503 || message.includes('503') || message.includes('UNAVAILABLE');

    // If it's a 429 (Rate Limit), wait longer
    if (is429) {
      const retryAfter = 45000; // 45 seconds for quota reset
      console.warn(`Quota exceeded (429), retrying in ${retryAfter / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, retryAfter));
      return withRetry(fn, retries, delay);
    }
    
    // If it's a 503 (Service Unavailable), use exponential backoff
    if (is503 && retries > 0) {
      console.warn(`Gemini service unavailable (503), retrying in ${delay / 1000}s... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }

    if (retries <= 0) {
      console.error("Max retries reached. Error:", err);
      throw err;
    }
    
    console.warn(`Request failed, retrying in ${delay / 1000}s... (${retries} retries left)`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return withRetry(fn, retries - 1, delay * 2);
  }
}

export async function generateLesson(level: EducationLevel, subject: Subject, topic: string, character: CharacterBuddy) {
  const scienceScriptReference = `
    Science is the way we learn about the world around us. Scientists observe carefully, ask questions, and try to discover how things work.
    For example, when you ask questions like: "Why is the sky bright during the day?" or "How does rain help crops like maize grow on the farm?", you are already thinking like a scientist.
    Scientists use their five senses to explore and understand the world:
    1. Seeing – observing the beautiful colors of a butterfly.
    2. Hearing – listening to the sound of a vehicle or a Keke Napep moving along the road.
    3. Touching – feeling whether a stone is smooth or rough.
    4. Smelling – noticing different smells around us, like delicious jollof rice cooking in the kitchen.
    5. Tasting – recognizing different flavors in the foods we eat.
    Science helps us understand many amazing things around us—from the large animals in places like Yankari Game Reserve to the tiny ants we see near our homes.
    By learning science, we can solve problems, make discoveries, and improve our lives and communities.
  `;

  const mathScriptReference = `
    Mathematics is the study of numbers, shapes, and patterns. It helps us solve problems and understand how things are measured and counted.
    For example, when you count how many mangoes are in a basket, or when you share snacks equally with your friends, you are using Mathematics!
    We use Math every day, like when we check the time to go to school or when we use money to buy something at the market.
    By learning Mathematics, we can become better at solving puzzles and making smart decisions.
    Every time you count, measure, or solve a problem, you are practicing Mathematics!
  `;

  const prompt = `You are an expert teacher for Nigerian students at the ${level} level. 
    Create a fun, interactive, and highly educational lesson on the topic: "${topic}" for the subject: "${subject.name}".
    
    Your teaching assistant is ${character.name} (${character.description}).
    
    Educational Guidelines:
    - Use simple, clear, and classroom-friendly language suitable for ${level} learners.
    - Make the content engaging but prioritize educational value.
    - Use culturally relevant Nigerian examples (e.g., Keke Napep, Yankari Game Reserve, local foods like Jollof rice or Maize, Nigerian markets).
    - If the subject is Science, use a tone and structure similar to this reference: "${scienceScriptReference}".
    - If the subject is Mathematics, use a tone and structure similar to this reference: "${mathScriptReference}".
    - For other subjects (Energy, Weather, Plants, Technology), maintain this same friendly, observational, and practical tone.
    - The character ${character.name} should be the one "teaching" the lesson, using their unique personality and catchphrases.
    - Include a "Character Greeting" from ${character.name}.
    - Include a "Cartoon Scene" description featuring ${character.name} in a Nigerian setting related to the topic.
    - Include an "Interactive Demo" idea that students can try at home or in class.
    
    Return a JSON object with: title, content (Markdown), characterGreeting, cartoonDescription, interactiveDemo, and quiz (array of objects with question, options, answer).`;

  try {
    const response = await withRetry(() => ai.models.generateContent({
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
    }));

    const lessonData = JSON.parse(response.text || "{}");
    lessonData.provider = "gemini";

    // Generate images using OpenAI via backend
    try {
      const visualContext = subject.name.toLowerCase().includes('math') 
        ? `Educational math visual: ${lessonData.title}. Show objects being counted or added clearly (e.g., oranges, apples, or farm animals). Large visible numbers.`
        : `Educational scene: ${lessonData.title}.`;

      const scenePrompt = `Create a bright, high-quality, vibrant educational cartoon illustration for a primary school student. 
        Setting: Friendly Nigerian classroom or local setting (e.g., market, farm).
        Characters: ${character.name} (${character.description}) teaching the student.
        Topic: ${lessonData.title}.
        Visual details: ${visualContext} ${lessonData.cartoonDescription}.
        Style: Modern 3D cartoon, bright colors, friendly, child-safe, educational.`;

      const characterPrompt = `A clean, high-quality 3D cartoon portrait of ${character.name}. 
        Style: Friendly expression, white background, perfect for a mask sticker. No background elements.`;

      const [sceneResponse, charResponse] = await Promise.all([
        fetch('/api/generate-images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: scenePrompt })
        }).then(r => r.json()),
        fetch('/api/generate-images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: characterPrompt })
        }).then(r => r.json())
      ]);

      if (sceneResponse.imageBase64) {
        lessonData.cartoonImageUrl = `data:${sceneResponse.mimeType || 'image/png'};base64,${sceneResponse.imageBase64}`;
      }

      if (charResponse.imageBase64) {
        lessonData.characterImageUrl = `data:${charResponse.mimeType || 'image/png'};base64,${charResponse.imageBase64}`;
      }
    } catch (err) {
      console.error("Failed to generate images with OpenAI:", err);
    }

    // Fallback images if generation failed
    if (!lessonData.cartoonImageUrl) {
      const cleanTopic = encodeURIComponent(lessonData.title.split(' ').slice(0, 3).join(','));
      lessonData.cartoonImageUrl = `https://loremflickr.com/1200/675/nigeria,education,${cleanTopic}`;
    }
    if (!lessonData.characterImageUrl) {
      const cleanName = encodeURIComponent(character.name.split(' ')[0]);
      lessonData.characterImageUrl = `https://loremflickr.com/200/200/${cleanName},cartoon`;
    }

    return lessonData;
  } catch (err) {
    console.warn("Gemini lesson generation failed, trying OpenAI fallback:", err);
    try {
      const fallbackData = await fetch('/api/lesson-fallback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level, subjectName: subject.name, topic, character })
      });
      if (fallbackData.ok) {
        return await fallbackData.json();
      } else {
        console.error(`OpenAI fallback failed with status ${fallbackData.status}`);
      }
    } catch (fallbackErr) {
      console.error("OpenAI fallback request failed:", fallbackErr);
    }

    console.error("Both Gemini and OpenAI fallback failed. Original Gemini error:", err);
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
}

export async function generateSpeech(text: string) {
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
  try {
    const base64 = imageData.includes(',') ? imageData.split(',')[1] : imageData;
    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { data: base64, mimeType: "image/jpeg" } },
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


