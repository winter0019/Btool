import React from 'react';
import { CharacterBuddy, EducationLevel } from '../types';
import { CHARACTERS } from '../constants';
import { motion } from 'motion/react';
import { ArrowLeft, Sparkles } from 'lucide-react';

interface CharacterSelectorProps {
  level: EducationLevel;
  onSelect: (character: CharacterBuddy) => void;
  onBack: () => void;
}

export const CharacterSelector: React.FC<CharacterSelectorProps> = ({ level, onSelect, onBack }) => {
  const characters = CHARACTERS[level];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center mb-12">
        <button 
          onClick={onBack}
          className="p-3 bg-white hover:bg-slate-50 border border-slate-100 rounded-2xl transition-all mr-4 md:mr-6 shadow-sm hover:shadow-md group"
        >
          <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
        </button>
        <div>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Pick Your <span className="text-indigo-600">Brain Buddy</span></h2>
          <p className="text-sm md:text-base font-medium text-slate-400 uppercase tracking-widest mt-1">Select a character to guide your mission</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {characters.map((character, index) => (
          <motion.button
            key={character.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, type: 'spring', stiffness: 100 }}
            whileHover={{ y: -10, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(character)}
            className="group relative flex flex-col items-center p-10 rounded-[2.5rem] border-2 border-transparent bg-white shadow-xl shadow-slate-200/50 hover:shadow-indigo-200/30 transition-all text-center overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1.5 bg-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="text-7xl mb-6 p-8 bg-indigo-50 rounded-[2rem] group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500">
              {character.avatar}
            </div>
            <h3 className="text-2xl font-black mb-3 tracking-tight text-slate-900">{character.name}</h3>
            <p className="text-sm font-medium text-slate-500 leading-relaxed mb-6">{character.description}</p>
            
            <div className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600 px-4 py-2 rounded-full">
              <Sparkles size={12} />
              <span>Select Buddy</span>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};
