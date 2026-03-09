import { EducationLevel, Subject, CharacterBuddy } from "../types";

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  let data: any = null;

  try {
    data = await response.json();
  } catch {
    throw new Error(`Invalid server response from ${path}`);
  }

  if (!response.ok) {
    throw new Error(data?.error || `Request failed: ${response.status}`);
  }

  return data as T;
}

type LessonResponse = {
  provider?: string;
  title: string;
  content: string;
  characterGreeting?: string;
  cartoonDescription: string;
  interactiveDemo: string;
  quiz: Array<{
    question: string;
    options: string[];
    answer: string;
  }>;
  cartoonImageUrl?: string;
  characterImageUrl?: string;
};

type VoiceAnalysisResponse = {
  isCorrect: boolean;
  feedback: string;
  hint: string;
  pronunciationFeedback: string;
  clarityScore: number;
  strengths: string;
  improvements: string;
  futureHints: string;
};

type VisualAnalysisResponse = {
  actingScore: number;
  emotion: string;
  feedback: string;
  strengths: string;
  improvements: string;
  futureHints: string;
};

type SpeechResponse = {
  provider?: string;
  audioUrl?: string | null;
};

export async function generateLesson(
  level: EducationLevel,
  subject: Subject,
  topic: string,
  character: CharacterBuddy
): Promise<LessonResponse> {
  try {
    const data = await apiPost<LessonResponse>("/api/lesson", {
      level,
      subject,
      topic,
      character,
    });

    return {
      ...data,
      quiz: Array.isArray(data.quiz) ? data.quiz : [],
      cartoonImageUrl: data.cartoonImageUrl || "",
      characterImageUrl: data.characterImageUrl || "",
    };
  } catch (err) {
    console.error("Lesson generation failed:", err);

    return {
      title: "Lesson Error",
      content: "Sorry, we had trouble preparing this lesson. Please try again.",
      cartoonDescription: "A teacher looking confused at a computer.",
      interactiveDemo: "Try refreshing the page.",
      quiz: [],
      cartoonImageUrl: "",
      characterImageUrl: "",
    };
  }
}

export async function generateSpeech(text: string): Promise<string | null> {
  try {
    const data = await apiPost<SpeechResponse>("/api/speech", { text });
    return data.audioUrl || null;
  } catch (err) {
    console.error("TTS generation failed:", err);
    return null;
  }
}

export async function analyzeVoiceInput(
  userInput: string,
  context: string,
  characterName: string
): Promise<VoiceAnalysisResponse> {
  try {
    return await apiPost<VoiceAnalysisResponse>("/api/analyze-voice", {
      userInput,
      context,
      characterName,
    });
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
      futureHints: "Practice saying the words slowly.",
    };
  }
}

export async function analyzeVisualPractice(
  imageData: string,
  characterName: string,
  context: string
): Promise<VisualAnalysisResponse> {
  try {
    return await apiPost<VisualAnalysisResponse>("/api/analyze-visual", {
      imageData,
      characterName,
      context,
    });
  } catch (err) {
    console.error("Visual analysis failed:", err);

    return {
      actingScore: 50,
      emotion: "neutral",
      feedback: "Keep practicing your character acting! You're doing great.",
      strengths: "You have a great spirit!",
      improvements: "Try to be more expressive with your face.",
      futureHints: "Watch how the character moves and try to copy them!",
    };
  }
}
