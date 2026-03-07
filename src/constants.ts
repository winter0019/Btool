import { Subject, EducationLevel, CharacterBuddy } from './types';

export const LEVELS: EducationLevel[] = ['Primary 1-3', 'Primary 4-5', 'JSS', 'SSS'];

export const SUBJECTS: Record<EducationLevel, Subject[]> = {
  'Primary 1-3': [
    { id: 'math', name: 'Mathematics', icon: '🔢', description: 'Fun with numbers, shapes and counting', color: 'bg-orange-100 text-orange-700' },
    { id: 'eng', name: 'English', icon: '📖', description: 'Fun with letters, phonics and stories', color: 'bg-blue-100 text-blue-700' },
    { id: 'sci', name: 'Science', icon: '🧪', description: 'Plants, animals and the world around us', color: 'bg-green-100 text-green-700' },
    { id: 'culture', name: 'Nigerian Culture', icon: '🇳🇬', description: 'Our songs, stories and traditions', color: 'bg-emerald-100 text-emerald-700' },
  ],
  'Primary 4-5': [
    { id: 'math', name: 'Mathematics', icon: '📐', description: 'Fractions, decimals and problem solving', color: 'bg-orange-100 text-orange-700' },
    { id: 'eng', name: 'English', icon: '📖', description: 'Grammar, reading and writing stories', color: 'bg-blue-100 text-blue-700' },
    { id: 'sci', name: 'Science', icon: '🧪', description: 'Discovering how things work', color: 'bg-green-100 text-green-700' },
    { id: 'quant', name: 'Quantitative', icon: '🔢', description: 'Puzzles and logical thinking', color: 'bg-amber-100 text-amber-700' },
    { id: 'art', name: 'Art & Creativity', icon: '🎨', description: 'Draw, paint, and create', color: 'bg-pink-100 text-pink-700' },
    { id: 'culture', name: 'Nigerian Culture', icon: '🇳🇬', description: 'Our history and diverse people', color: 'bg-emerald-100 text-emerald-700' },
  ],
  JSS: [
    { id: 'math', name: 'Mathematics', icon: '📐', description: 'Algebra, Geometry and logic', color: 'bg-orange-100 text-orange-700' },
    { id: 'eng', name: 'English Language', icon: '📚', description: 'Grammar, composition and literature', color: 'bg-blue-100 text-blue-700' },
    { id: 'sci', name: 'Basic Science', icon: '🔬', description: 'Physics, Chemistry, and Biology basics', color: 'bg-green-100 text-green-700' },
    { id: 'art', name: 'Creative Arts', icon: '🎭', description: 'Drama, music and visual arts', color: 'bg-pink-100 text-pink-700' },
    { id: 'culture', name: 'Social Studies', icon: '🌍', description: 'Civic education and development', color: 'bg-emerald-100 text-emerald-700' },
  ],
  SSS: [
    { id: 'math', name: 'Mathematics', icon: '📐', description: 'Calculus, statistics and advanced logic', color: 'bg-orange-100 text-orange-700' },
    { id: 'eng', name: 'English & Lit', icon: '🖋️', description: 'Advanced communication and analysis', color: 'bg-blue-100 text-blue-700' },
    { id: 'sci', name: 'Core Sciences', icon: '⚛️', description: 'Deep dive into scientific principles', color: 'bg-green-100 text-green-700' },
    { id: 'quant', name: 'Further Maths', icon: '📈', description: 'Calculus, statistics and mechanics', color: 'bg-amber-100 text-amber-700' },
    { id: 'art', name: 'Visual Arts', icon: '🖼️', description: 'Professional artistic techniques', color: 'bg-pink-100 text-pink-700' },
    { id: 'culture', name: 'Government & History', icon: '🏛️', description: 'Nigerian political development', color: 'bg-emerald-100 text-emerald-700' },
  ],
};

export const CHARACTERS: Record<EducationLevel, CharacterBuddy[]> = {
  'Primary 1-3': [
    { id: 'spiderman', name: 'Spiderman', description: 'Your friendly neighborhood Science buddy! Let\'s explore how things work together.', avatar: '🕷️' },
    { id: 'elsa', name: 'Elsa', description: 'Let\'s learn with some magic! I\'ll help you discover the beauty of our world.', avatar: '❄️' },
    { id: 'simba', name: 'Simba', description: 'Roar into learning! Together, we\'ll find the king of knowledge in you.', avatar: '🦁' },
  ],
  'Primary 4-5': [
    { id: 'ninja-turtle', name: 'Ninja Turtle', description: 'Cowabunga! Ready for some math? Let\'s solve these number puzzles like a ninja!', avatar: '🐢' },
    { id: 'shark', name: 'Friendly Shark', description: 'Dive deep into knowledge! There\'s a whole ocean of things to learn.', avatar: '🦈' },
    { id: 'robot', name: 'Robo-Tutor', description: 'Beep boop! Let\'s boost your brain with some high-tech learning.', avatar: '🤖' },
  ],
  'JSS': [
    { id: 'mr-bean', name: 'Mr. Bean', description: 'Learning is funny and easy! I\'ll show you that even big problems can be solved with a smile.', avatar: '👔' },
    { id: 'detective', name: 'Detective Brain', description: 'Let\'s solve the mystery of science. Every question is a clue!', avatar: '🔍' },
    { id: 'pilot', name: 'Captain Knowledge', description: 'Flying high with education! Fasten your seatbelt for a journey of discovery.', avatar: '👨‍✈️' },
  ],
  'SSS': [
    { id: 'einstein', name: 'Albert Einstein', description: 'Imagination is more important than knowledge. Let\'s think big together!', avatar: '👴' },
    { id: 'soyinka', name: 'Wole Soyinka', description: 'Mastering the art of words. Let\'s weave beautiful stories and learn our language.', avatar: '✍️' },
    { id: 'curie', name: 'Marie Curie', description: 'Be less curious about people and more curious about ideas. Let\'s discover the secrets of the universe.', avatar: '🧪' },
  ],
};
