export type EducationLevel = 'Primary 1-3' | 'Primary 4-5' | 'JSS' | 'SSS';

export interface Subject {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
}

export interface Lesson {
  id: string;
  title: string;
  content: string;
  cartoonUrl?: string;
  interactiveDemo?: string;
}

export interface CharacterBuddy {
  id: string;
  name: string;
  description: string;
  avatar: string;
}

export interface UserState {
  level: EducationLevel | null;
  currentSubject: Subject | null;
  currentLesson: Lesson | null;
  selectedCharacter: CharacterBuddy | null;
}
