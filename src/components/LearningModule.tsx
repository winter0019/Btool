import React, { useState, useEffect } from 'react';
import { Subject, EducationLevel } from '../types';
import { generateLesson, generateSpeech } from '../services/geminiService';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Sparkles, Brain, Play, CheckCircle2, AlertCircle, Volume2, VolumeX } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import confetti from 'canvas-confetti';
import { VoicePractice } from './VoicePractice';
import { VisualPractice } from './VisualPractice';

interface LearningModuleProps {
  level: EducationLevel;
  subject: Subject;
  onBack: () => void;
  engagementFeedback?: { engagementScore: number; emotion: string; confidence: string; feedback: string };
}

export const LearningModule: React.FC<LearningModuleProps> = ({ level, subject, onBack, engagementFeedback }) => {
  const [loading, setLoading] = useState(true);
  const [lesson, setLesson] = useState<any>(null);
  const [topic, setTopic] = useState('');
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizResults, setQuizResults] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [practiceMode, setPracticeMode] = useState<'audio' | 'visual'>('audio');

  const fetchLesson = async (customTopic?: string) => {
    setLoading(true);
    try {
      const result = await generateLesson(level, subject, customTopic || subject.name);
      setLesson(result);
      setTopic(result.title);
      
      // Auto-narrate for Primary 1-3
      if (level === 'Primary 1-3') {
        handleSpeak(`${result.characterGreeting}. ${result.content}. ${result.cartoonDescription}`);
      } else {
        handleSpeak(result.characterGreeting);
      }
    } catch (err) {
      console.error("Failed to fetch lesson:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSpeak = async (text: string) => {
    if (isSpeaking) {
      if (audio) {
        audio.pause();
        URL.revokeObjectURL(audio.src);
      }
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    const audioUrl = await generateSpeech(text);
    if (audioUrl) {
      const newAudio = new Audio(audioUrl);
      newAudio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };
      setAudio(newAudio);
      newAudio.play().catch(err => {
        console.error("Audio playback failed:", err);
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      });
    } else {
      setIsSpeaking(false);
    }
  };

  useEffect(() => {
    return () => {
      audio?.pause();
    };
  }, [audio]);

  useEffect(() => {
    fetchLesson();
  }, [level, subject]);

  useEffect(() => {
    if (engagementFeedback?.feedback && !loading) {
      // Only speak if it's a significant change or specific to Q&A
      const shouldSpeak = engagementFeedback.emotion === 'Confused' || engagementFeedback.confidence === 'Low';
      if (shouldSpeak) {
        handleSpeak(`I noticed you might be feeling a bit ${engagementFeedback.emotion.toLowerCase()}. ${engagementFeedback.feedback}`);
      }
    }
  }, [engagementFeedback?.feedback]);

  const handleQuizSubmit = () => {
    setSubmitted(true);
    const correctCount = lesson?.quiz?.filter((q: any, i: number) => quizResults[i] === q.answer).length || 0;
    if (correctCount > 0 && correctCount === (lesson?.quiz?.length || 0)) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 border-4 border-slate-200 border-t-indigo-500 rounded-full animate-spin mb-4" />
        <p className="text-slate-500 animate-pulse">Preparing your interactive lesson...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 space-y-4 md:space-y-0">
        <div className="flex items-center">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors mr-2 md:mr-4">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800">{lesson.title}</h2>
            <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-1">
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${subject.color}`}>
                  {subject.name}
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-400">{level} Level</span>
              </div>
              <button 
                onClick={() => handleSpeak(lesson.content)}
                className={`flex items-center space-x-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                  isSpeaking ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
                }`}
              >
                {isSpeaking ? <VolumeX size={12} /> : <Volume2 size={12} />}
                <span>{isSpeaking ? 'Stop' : 'Listen'}</span>
              </button>
            </div>
          </div>
        </div>
        
        {engagementFeedback && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="hidden md:flex items-center bg-white border border-slate-100 p-4 rounded-2xl shadow-sm max-w-sm"
          >
            <div className="mr-4 p-3 bg-indigo-50 rounded-xl text-indigo-600">
              <Brain size={24} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AI Tutor Feedback</p>
                <div className="flex space-x-2">
                  <span className="text-[9px] px-1.5 py-0.5 bg-green-50 text-green-600 rounded-md font-bold uppercase">
                    {engagementFeedback.emotion}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-md font-bold uppercase">
                    Conf: {engagementFeedback.confidence}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-tight">{engagementFeedback.feedback}</p>
            </div>
          </motion.div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Character Buddy Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white border border-slate-100 p-4 md:p-6 rounded-[2rem] shadow-sm flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6"
          >
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-md shrink-0">
              <img 
                src={lesson.characterImageUrl || `https://picsum.photos/seed/${lesson.characterPersona.replace(/\s/g, '')}/200/200`}
                alt={lesson.characterPersona}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex-1 text-center sm:text-left w-full">
              <div className="flex items-center justify-between">
                <h3 className="text-lg md:text-xl font-bold text-slate-800">{lesson.characterPersona}</h3>
                <button 
                  onClick={() => handleSpeak(lesson.characterGreeting)}
                  className="p-2 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 transition-colors"
                >
                  <Volume2 size={18} />
                </button>
              </div>
              <div className="mt-2 bg-slate-50 p-4 rounded-2xl relative">
                <div className="hidden sm:block absolute -left-2 top-4 w-4 h-4 bg-slate-50 rotate-45" />
                <p className="text-sm md:text-base text-slate-600 italic leading-relaxed">"{lesson.characterGreeting}"</p>
              </div>
            </div>
          </motion.div>

          {/* Cartoon Visualization Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900 rounded-[2rem] overflow-hidden aspect-video relative group shadow-2xl"
          >
            <img 
              src={lesson.cartoonImageUrl || `https://picsum.photos/seed/${lesson.title.replace(/\s/g, '')}/1200/675`}
              alt="Lesson Visualization"
              className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-black/20">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-3xl max-w-md">
                <p className="text-white text-lg font-medium italic leading-relaxed">
                  "{lesson.cartoonDescription}"
                </p>
                <div className="mt-4 flex items-center justify-center space-x-4 text-white/50 text-xs">
                  <div className="flex items-center space-x-2">
                    <Play size={12} />
                    <span>Interactive Cartoon Demonstration</span>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleSpeak(lesson.cartoonDescription); }}
                    className="flex items-center space-x-1 px-2 py-1 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <Volume2 size={12} />
                    <span>Listen</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Lesson Content */}
          <div className="prose prose-slate max-w-none bg-white p-6 md:p-10 rounded-[2rem] shadow-sm border border-slate-100 overflow-x-hidden">
            <ReactMarkdown>{lesson.content}</ReactMarkdown>
          </div>

          {/* Interactive Demo Section */}
          <div className="bg-indigo-600 rounded-[2rem] p-6 md:p-8 text-white shadow-xl">
            <div className="flex items-center mb-4">
              <Sparkles className="mr-3" />
              <h3 className="text-lg md:text-xl font-bold">Interactive Demo</h3>
            </div>
            <p className="text-sm md:text-base text-indigo-100 mb-6 leading-relaxed">
              {lesson.interactiveDemo}
            </p>
            <button className="w-full sm:w-auto bg-white text-indigo-600 px-6 py-3 rounded-2xl font-bold hover:bg-indigo-50 transition-colors shadow-lg">
              Start Activity
            </button>
          </div>

          {/* Practice Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
              <h3 className="font-bold text-slate-800">Choose Practice Mode</h3>
              <div className="flex bg-slate-100 p-1 rounded-2xl">
                <button 
                  onClick={() => setPracticeMode('audio')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${practiceMode === 'audio' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Audio Practice
                </button>
                <button 
                  onClick={() => setPracticeMode('visual')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${practiceMode === 'visual' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Visual Practice
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {practiceMode === 'audio' ? (
                <motion.div
                  key="audio-practice"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <VoicePractice context={lesson.content} characterName={lesson.characterPersona} />
                </motion.div>
              ) : (
                <motion.div
                  key="visual-practice"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <VisualPractice 
                    context={lesson.content} 
                    characterName={lesson.characterPersona} 
                    characterImageUrl={lesson.characterImageUrl}
                    level={level}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="space-y-6">
          {/* Quiz Section */}
          <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100">
            <h3 className="text-lg md:text-xl font-bold text-slate-800 mb-6 flex items-center">
              <CheckCircle2 className="mr-2 text-green-500" />
              Quick Check
            </h3>
            <div className="space-y-6 md:space-y-8">
              {lesson?.quiz?.map((q: any, i: number) => (
                <div key={i} className="space-y-3">
                  <p className="font-medium text-slate-700 text-sm">{i + 1}. {q.question}</p>
                  <div className="grid grid-cols-1 gap-2">
                    {q.options?.map((opt: string) => (
                      <button
                        key={opt}
                        disabled={submitted}
                        onClick={() => setQuizResults(prev => ({ ...prev, [i]: opt }))}
                        className={`p-3 md:p-4 rounded-xl text-left text-sm transition-all border-2 ${
                          quizResults[i] === opt 
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-700' 
                            : 'bg-slate-50 border-transparent hover:border-slate-200 text-slate-600'
                        } ${
                          submitted && opt === q.answer ? 'bg-green-50 border-green-500 text-green-700' : ''
                        } ${
                          submitted && quizResults[i] === opt && opt !== q.answer ? 'bg-red-50 border-red-500 text-red-700' : ''
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button 
              onClick={handleQuizSubmit}
              disabled={submitted || Object.keys(quizResults).length < (lesson?.quiz?.length || 0)}
              className="w-full mt-8 bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Check Answers
            </button>
          </div>

          {/* Cultural Context Note */}
          <div className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100">
            <div className="flex items-center mb-3 text-emerald-700">
              <AlertCircle size={18} className="mr-2" />
              <h4 className="font-bold text-sm uppercase tracking-wider">Naija Context</h4>
            </div>
            <p className="text-xs text-emerald-800 leading-relaxed opacity-80">
              This lesson is tailored to the Nigerian National Curriculum and includes local examples to help you understand better!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
