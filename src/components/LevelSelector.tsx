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
        className="text-4xl md:text-5xl font-black text-slate-900 mb-4 text-center tracking-tight"
      >
        Activate Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Brain Power</span>
      </motion.h2>
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-slate-500 mb-16 text-center max-w-lg text-lg font-medium"
      >
        Choose your mission level to begin your AI-powered learning adventure.
      </motion.p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 w-full max-w-7xl">
        {LEVELS.map((level, index) => (
          <motion.button
            key={level}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * index, type: 'spring', stiffness: 100 }}
            whileHover={{ y: -10, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(level)}
            className={`group relative flex flex-col items-center justify-center p-10 rounded-[2.5rem] border-2 transition-all duration-500 shadow-2xl shadow-indigo-100/20 overflow-hidden ${LEVEL_COLORS[level]}`}
          >
            <div className="absolute top-0 left-0 w-full h-1.5 bg-white/30 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="mb-6 p-6 bg-white/40 backdrop-blur-sm rounded-3xl group-hover:rotate-6 transition-transform duration-500">
              {LEVEL_ICONS[level]}
            </div>
            <span className="text-2xl font-black uppercase tracking-tight text-center">{level}</span>
            <div className="mt-3 px-4 py-1 bg-black/5 rounded-full">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-60 text-center">
                {level === 'Primary 1-3' ? 'Lower Primary' : level === 'Primary 4-5' ? 'Upper Primary' : level === 'JSS' ? 'Junior Secondary' : 'Senior Secondary'}
              </span>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};
