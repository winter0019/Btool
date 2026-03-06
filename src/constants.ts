import { Subject, EducationLevel } from './types';

export const LEVELS: EducationLevel[] = ['Primary 1-3', 'Primary 4-5', 'JSS', 'SSS'];

export const SUBJECTS: Record<EducationLevel, Subject[]> = {
  'Primary 1-3': [
    { id: 'eng', name: 'English', icon: '📖', description: 'Fun with letters, phonics and stories', color: 'bg-blue-100 text-blue-700' },
    { id: 'sci', name: 'Science', icon: '🧪', description: 'Plants, animals and the world around us', color: 'bg-green-100 text-green-700' },
    { id: 'culture', name: 'Nigerian Culture', icon: '🇳🇬', description: 'Our songs, stories and traditions', color: 'bg-emerald-100 text-emerald-700' },
  ],
  'Primary 4-5': [
    { id: 'eng', name: 'English', icon: '📖', description: 'Grammar, reading and writing stories', color: 'bg-blue-100 text-blue-700' },
    { id: 'sci', name: 'Science', icon: '🧪', description: 'Discovering how things work', color: 'bg-green-100 text-green-700' },
    { id: 'quant', name: 'Quantitative', icon: '🔢', description: 'Puzzles and logical thinking', color: 'bg-orange-100 text-orange-700' },
    { id: 'art', name: 'Art & Creativity', icon: '🎨', description: 'Draw, paint, and create', color: 'bg-pink-100 text-pink-700' },
    { id: 'culture', name: 'Nigerian Culture', icon: '🇳🇬', description: 'Our history and diverse people', color: 'bg-emerald-100 text-emerald-700' },
  ],
  JSS: [
    { id: 'eng', name: 'English Language', icon: '📚', description: 'Grammar, composition and literature', color: 'bg-blue-100 text-blue-700' },
    { id: 'sci', name: 'Basic Science', icon: '🔬', description: 'Physics, Chemistry, and Biology basics', color: 'bg-green-100 text-green-700' },
    { id: 'quant', name: 'Mathematics', icon: '📐', description: 'Algebra, Geometry and logic', color: 'bg-orange-100 text-orange-700' },
    { id: 'art', name: 'Creative Arts', icon: '🎭', description: 'Drama, music and visual arts', color: 'bg-pink-100 text-pink-700' },
    { id: 'culture', name: 'Social Studies', icon: '🌍', description: 'Civic education and development', color: 'bg-emerald-100 text-emerald-700' },
  ],
  SSS: [
    { id: 'eng', name: 'English & Lit', icon: '🖋️', description: 'Advanced communication and analysis', color: 'bg-blue-100 text-blue-700' },
    { id: 'sci', name: 'Core Sciences', icon: '⚛️', description: 'Deep dive into scientific principles', color: 'bg-green-100 text-green-700' },
    { id: 'quant', name: 'Further Maths', icon: '📈', description: 'Calculus, statistics and mechanics', color: 'bg-orange-100 text-orange-700' },
    { id: 'art', name: 'Visual Arts', icon: '🖼️', description: 'Professional artistic techniques', color: 'bg-pink-100 text-pink-700' },
    { id: 'culture', name: 'Government & History', icon: '🏛️', description: 'Nigerian political development', color: 'bg-emerald-100 text-emerald-700' },
  ],
};
