import React, { useState } from 'react';
import { EducationLevel, Subject, CharacterBuddy } from './types';
import { LevelSelector } from './components/LevelSelector';
import { SubjectGrid } from './components/SubjectGrid';
import { CharacterSelector } from './components/CharacterSelector';
import { LearningModule } from './components/LearningModule';
import { CameraFeed } from './components/CameraFeed';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Brain, Zap, ShieldCheck } from 'lucide-react';

export default function App() {
  const [level, setLevel] = useState<EducationLevel | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [character, setCharacter] = useState<CharacterBuddy | null>(null);
  const [engagementFeedback, setEngagementFeedback] = useState<{ engagementScore: number; emotion: string; confidence: string; feedback: string } | undefined>();

  const handleLevelSelect = (selectedLevel: EducationLevel) => {
    setLevel(selectedLevel);
  };

  const handleSubjectSelect = (selectedSubject: Subject) => {
    setSubject(selectedSubject);
  };

  const handleCharacterSelect = (selectedCharacter: CharacterBuddy) => {
    setCharacter(selectedCharacter);
  };

  const handleBackToLevels = () => {
    setLevel(null);
    setSubject(null);
    setCharacter(null);
  };

  const handleBackToSubjects = () => {
    setSubject(null);
    setCharacter(null);
  };

  const handleBackToCharacters = () => {
    setCharacter(null);
  };

  const handleEngagementAnalysis = (analysis: { engagementScore: number; emotion: string; confidence: string; feedback: string }) => {
    setEngagementFeedback(analysis);
  };

  return (
    <div className="min-h-screen bg-[#FDFCF9] text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-slate-100/50 px-4 md:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div 
            className="flex items-center space-x-3 cursor-pointer group"
            onClick={() => { setLevel(null); setSubject(null); }}
          >
            <div className="relative">
              <div className="p-2.5 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl text-white shadow-lg shadow-indigo-200 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                <Brain size={24} />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full animate-pulse" />
            </div>
            <div className="flex flex-col -space-y-1">
              <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase italic">B-tool</h1>
              <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">brain tool</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4 md:space-x-8">
            <nav className="hidden lg:flex items-center space-x-8 text-xs font-bold uppercase tracking-widest text-slate-400">
              <a href="#" className="hover:text-indigo-600 transition-colors flex items-center space-x-2">
                <Zap size={14} />
                <span>Boosters</span>
              </a>
              <a href="#" className="hover:text-indigo-600 transition-colors flex items-center space-x-2">
                <ShieldCheck size={14} />
                <span>Safe Zone</span>
              </a>
            </nav>
            <div className="h-6 w-px bg-slate-200 hidden lg:block" />
            <div className="flex items-center space-x-2 bg-indigo-50/50 border border-indigo-100 px-4 py-2 rounded-2xl text-indigo-700 text-[10px] font-black uppercase tracking-widest shadow-sm">
              <Sparkles size={14} className="animate-pulse" />
              <span>AI Engine Active</span>
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
          ) : !character ? (
            <motion.div
              key="character-selector"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <CharacterSelector 
                level={level} 
                onSelect={handleCharacterSelect} 
                onBack={handleBackToSubjects} 
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
                character={character}
                onBack={handleBackToCharacters}
                engagementFeedback={engagementFeedback}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-slate-100 py-16 px-4 md:px-8 bg-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-20" />
        
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2.5 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-100">
                <Brain size={20} />
              </div>
              <h2 className="text-xl font-black tracking-tight text-slate-900 uppercase italic">B-tool</h2>
            </div>
            <p className="text-slate-500 max-w-sm leading-relaxed text-sm">
              The ultimate brain-boosting platform for Nigerian students. We combine advanced AI with culturally-rich content to create a learning experience that feels like magic.
            </p>
            <div className="mt-8 flex space-x-4">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all cursor-pointer">
                <Zap size={18} />
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all cursor-pointer">
                <ShieldCheck size={18} />
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-6">Learning Path</h3>
            <ul className="space-y-4 text-sm font-bold text-slate-400">
              <li><a href="#" className="hover:text-indigo-600 transition-colors">Primary Boosters</a></li>
              <li><a href="#" className="hover:text-indigo-600 transition-colors">Secondary Mastery</a></li>
              <li><a href="#" className="hover:text-indigo-600 transition-colors">Exam Prep AI</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-6">Connect</h3>
            <ul className="space-y-4 text-sm font-bold text-slate-400">
              <li><a href="#" className="hover:text-indigo-600 transition-colors">Community</a></li>
              <li><a href="#" className="hover:text-indigo-600 transition-colors">Support Lab</a></li>
              <li><a href="#" className="hover:text-indigo-600 transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
          <p>© 2026 B-tool (brain tool). All rights reserved.</p>
          <p className="mt-4 md:mt-0 flex items-center space-x-2">
            <span>Built for the future of Nigeria</span>
            <span className="text-lg">🇳🇬</span>
          </p>
        </div>
      </footer>
    </div>
  );
}

