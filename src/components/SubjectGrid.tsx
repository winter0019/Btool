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
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center mb-8">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors mr-2 md:mr-4"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800">{level} Curriculum</h2>
          <p className="text-sm md:text-base text-slate-500">Choose a subject to explore interactive lessons</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {subjects.map((subject, index) => (
          <motion.button
            key={subject.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ y: -5 }}
            onClick={() => onSelect(subject)}
            className={`flex flex-col items-start p-6 rounded-3xl border-2 border-transparent hover:border-slate-200 transition-all text-left shadow-sm hover:shadow-md ${subject.color}`}
          >
            <span className="text-4xl mb-4">{subject.icon}</span>
            <h3 className="text-xl font-bold mb-2">{subject.name}</h3>
            <p className="text-sm opacity-80 leading-relaxed">{subject.description}</p>
          </motion.button>
        ))}
      </div>
    </div>
  );
};
