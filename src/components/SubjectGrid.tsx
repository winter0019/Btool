import React from 'react';
import { Subject, EducationLevel } from '../types';
import { SUBJECTS } from '../constants';
import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';

interface SubjectGridProps {
  level: EducationLevel;
  onSelect: (subject: Subject) => void;
  onBack: () => void;
}

export const SubjectGrid: React.FC<SubjectGridProps> = ({ level, onSelect, onBack }) => {
  const subjects = SUBJECTS[level];

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
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">{level} <span className="text-indigo-600">Missions</span></h2>
          <p className="text-sm md:text-base font-medium text-slate-400 uppercase tracking-widest mt-1">Select a subject to boost your knowledge</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {subjects.map((subject, index) => (
          <motion.button
            key={subject.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, type: 'spring', stiffness: 100 }}
            whileHover={{ y: -8, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(subject)}
            className={`group flex flex-col items-start p-8 rounded-[2.5rem] border-2 border-transparent transition-all text-left shadow-xl shadow-slate-200/50 hover:shadow-indigo-200/30 relative overflow-hidden ${subject.color}`}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform duration-700" />
            <div className="text-5xl mb-6 p-4 bg-white/30 backdrop-blur-sm rounded-2xl group-hover:rotate-12 transition-transform duration-500">
              {subject.icon}
            </div>
            <h3 className="text-2xl font-black mb-3 tracking-tight">{subject.name}</h3>
            <p className="text-sm font-medium opacity-80 leading-relaxed max-w-[200px]">{subject.description}</p>
            
            <div className="mt-8 flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest bg-black/5 px-3 py-1 rounded-full">
              <span>Start Mission</span>
              <ArrowLeft size={10} className="rotate-180" />
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};
