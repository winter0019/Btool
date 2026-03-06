import React from 'react';
import { EducationLevel } from '../types';
import { LEVELS } from '../constants';
import { motion } from 'motion/react';
import { GraduationCap, School, BookOpen } from 'lucide-react';

interface LevelSelectorProps {
  onSelect: (level: EducationLevel) => void;
}

const LEVEL_ICONS: Record<EducationLevel, React.ReactNode> = {
  'Primary 1-3': <GraduationCap size={48} />,
  'Primary 4-5': <GraduationCap size={48} />,
  JSS: <School size={48} />,
  SSS: <BookOpen size={48} />,
};

const LEVEL_COLORS: Record<EducationLevel, string> = {
  'Primary 1-3': 'bg-amber-100 border-amber-200 text-amber-700 hover:bg-amber-200',
  'Primary 4-5': 'bg-orange-100 border-orange-200 text-orange-700 hover:bg-orange-200',
  JSS: 'bg-emerald-100 border-emerald-200 text-emerald-700 hover:bg-emerald-200',
  SSS: 'bg-indigo-100 border-indigo-200 text-indigo-700 hover:bg-indigo-200',
};

export const LevelSelector: React.FC<LevelSelectorProps> = ({ onSelect }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 md:p-8">
      <motion.h2 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl md:text-4xl font-bold text-slate-800 mb-2 text-center"
      >
        Welcome to NaijaLearn!
      </motion.h2>
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-slate-500 mb-12 text-center max-w-md"
      >
        Select your school level to start your interactive learning journey.
      </motion.p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-6xl">
        {LEVELS.map((level, index) => (
          <motion.button
            key={level}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 * index }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(level)}
            className={`flex flex-col items-center justify-center p-8 rounded-3xl border-2 transition-all duration-300 shadow-lg ${LEVEL_COLORS[level]}`}
          >
            <div className="mb-4 p-4 bg-white/50 rounded-2xl">
              {LEVEL_ICONS[level]}
            </div>
            <span className="text-xl font-bold uppercase tracking-wide text-center">{level}</span>
            <span className="text-xs mt-2 opacity-70 text-center">
              {level === 'Primary 1-3' ? 'Lower Primary' : level === 'Primary 4-5' ? 'Upper Primary' : level === 'JSS' ? 'Junior Secondary' : 'Senior Secondary'}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
};
