import React, { useState } from 'react';
import { EducationLevel, Subject } from './types';
import { LevelSelector } from './components/LevelSelector';
import { SubjectGrid } from './components/SubjectGrid';
import { LearningModule } from './components/LearningModule';
import { CameraFeed } from './components/CameraFeed';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, GraduationCap } from 'lucide-react';

export default function App() {
  const [level, setLevel] = useState<EducationLevel | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [engagementFeedback, setEngagementFeedback] = useState<{ engagementScore: number; emotion: string; confidence: string; feedback: string } | undefined>();

  const handleLevelSelect = (selectedLevel: EducationLevel) => {
    setLevel(selectedLevel);
  };

  const handleSubjectSelect = (selectedSubject: Subject) => {
    setSubject(selectedSubject);
  };

  const handleBackToLevels = () => {
    setLevel(null);
    setSubject(null);
  };

  const handleBackToSubjects = () => {
    setSubject(null);
  };

  const handleEngagementAnalysis = (analysis: { engagementScore: number; emotion: string; confidence: string; feedback: string }) => {
    setEngagementFeedback(analysis);
  };

  return (
    <div className="min-h-screen bg-[#FDFCF9] text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 md:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div 
            className="flex items-center space-x-3 cursor-pointer group"
            onClick={() => { setLevel(null); setSubject(null); }}
          >
            <div className="p-2 bg-indigo-600 rounded-xl text-white group-hover:rotate-12 transition-transform">
              <GraduationCap size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">NaijaLearn</h1>
          </div>
          
          <div className="flex items-center space-x-6">
            <nav className="hidden md:flex items-center space-x-6 text-sm font-medium text-slate-500">
              <a href="#" className="hover:text-indigo-600 transition-colors">Curriculum</a>
              <a href="#" className="hover:text-indigo-600 transition-colors">Culture</a>
              <a href="#" className="hover:text-indigo-600 transition-colors">About</a>
            </nav>
            <div className="h-6 w-px bg-slate-200 hidden md:block" />
            <div className="flex items-center space-x-2 bg-indigo-50 px-3 py-1.5 rounded-full text-indigo-700 text-xs font-bold">
              <Sparkles size={14} />
              <span>AI Tutor Active</span>
            </div>
          </div>
        </div>
      </header>

      <main className="relative">
        <AnimatePresence mode="wait">
          {!level ? (
            <motion.div
              key="level-selector"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <LevelSelector onSelect={handleLevelSelect} />
            </motion.div>
          ) : !subject ? (
            <motion.div
              key="subject-grid"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <SubjectGrid 
                level={level} 
                onSelect={handleSubjectSelect} 
                onBack={handleBackToLevels} 
              />
            </motion.div>
          ) : (
            <motion.div
              key="learning-module"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
            >
              <LearningModule 
                level={level} 
                subject={subject} 
                onBack={handleBackToSubjects}
                engagementFeedback={engagementFeedback}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-slate-100 py-12 px-4 md:px-8 bg-white">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-indigo-600 rounded-xl text-white">
                <GraduationCap size={20} />
              </div>
              <h2 className="text-lg font-bold tracking-tight text-slate-800">NaijaLearn</h2>
            </div>
            <p className="text-slate-500 max-w-sm leading-relaxed">
              Empowering Nigerian students with interactive, culturally-relevant education powered by AI. From Primary to SSS, we make learning fun and engaging.
            </p>
          </div>
          <div>
            <h3 className="font-bold text-slate-800 mb-4">Resources</h3>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><a href="#" className="hover:text-indigo-600">Nigerian Curriculum</a></li>
              <li><a href="#" className="hover:text-indigo-600">Teacher Portal</a></li>
              <li><a href="#" className="hover:text-indigo-600">Parent Dashboard</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-slate-800 mb-4">Support</h3>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><a href="#" className="hover:text-indigo-600">Help Center</a></li>
              <li><a href="#" className="hover:text-indigo-600">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-indigo-600">Contact Us</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center text-xs text-slate-400">
          <p>© 2026 NaijaLearn. All rights reserved.</p>
          <p className="mt-4 md:mt-0">Made for the future of Nigerian Education 🇳🇬</p>
        </div>
      </footer>
    </div>
  );
}

