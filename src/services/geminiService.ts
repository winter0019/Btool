import { EducationLevel, Subject, CharacterBuddy } from "../types";

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    const response = await fn();
    return response;
  } catch (err: any) {
    // If it's a 429, we might want to wait longer
    if (err.status === 429) {
      const retryAfter = 30000; // 30 seconds default for quota
      console.warn(`Quota exceeded, retrying after ${retryAfter}ms...`);
      await new Promise(resolve => setTimeout(resolve, retryAfter));
      return withRetry(fn, retries - 1, delay * 2);
    }
    
    if (retries <= 0) throw err;
    await new Promise(resolve => setTimeout(resolve, delay));
    return withRetry(fn, retries - 1, delay * 2);
  }
}

async function apiCall(endpoint: string, body: any) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(errorData.error || `API call failed: ${response.status}`);
    (error as any).status = response.status;
    throw error;
  }

  return response.json();
}

export async function generateLesson(level: EducationLevel, subject: Subject, topic: string, character: CharacterBuddy) {
  try {
    const lessonData = await withRetry(() => apiCall('/api/lesson', {
      level,
      subjectName: subject.name,
      topic,
      character
    }));

    // Generate images via backend
    try {
      const imageData = await withRetry(() => apiCall('/api/generate-images', {
        characterName: character.name,
        lessonTitle: lessonData.title,
        cartoonDescription: lessonData.cartoonDescription
      }));

      lessonData.cartoonImageUrl = imageData.cartoonImageUrl || `https://picsum.photos/seed/${lessonData.title.replace(/\s/g, '')}/1200/675`;
      lessonData.characterImageUrl = imageData.characterImageUrl || `https://picsum.photos/seed/${character.name.replace(/\s/g, '')}/200/200`;
    } catch (err) {
      console.error("Failed to generate images:", err);
      lessonData.cartoonImageUrl = `https://picsum.photos/seed/${lessonData.title.replace(/\s/g, '')}/1200/675`;
      lessonData.characterImageUrl = `https://picsum.photos/seed/${character.name.replace(/\s/g, '')}/200/200`;
    }

    return lessonData;
  } catch (err) {
    console.error("Failed to fetch lesson:", err);
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
    const data = await withRetry(() => apiCall('/api/speech', { text }));
    const base64Audio = data.audio;

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
    return await withRetry(() => apiCall('/api/analyze-voice', { userInput, context, characterName }));
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
    // Extract base64 if it's a data URL
    const base64 = imageData.includes(',') ? imageData.split(',')[1] : imageData;
    return await withRetry(() => apiCall('/api/analyze-visual', { imageData: base64, characterName, context }));
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

