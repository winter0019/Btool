import { EducationLevel, Subject, CharacterBuddy } from "../types";

async function apiPost(path: string, body: unknown) {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error || `Request failed: ${response.status}`);
  }

  return data;
}

export async function generateLesson(
  level: EducationLevel,
  subject: Subject,
  topic: string,
  character: CharacterBuddy
) {
  return apiPost("/api/lesson", {
    level,
    subject,
    topic,
    character,
  });
}

export async function generateSpeech(text: string) {
  const data = await apiPost("/api/speech", { text });
  return data.audioUrl || null;
}

export async function analyzeVoiceInput(
  userInput: string,
  context: string,
  characterName: string
) {
  return apiPost("/api/analyze-voice", {
    userInput,
    context,
    characterName,
  });
}

export async function analyzeVisualPractice(
  imageData: string,
  characterName: string,
  context: string
) {
  return apiPost("/api/analyze-visual", {
    imageData,
    characterName,
    context,
  });
}
