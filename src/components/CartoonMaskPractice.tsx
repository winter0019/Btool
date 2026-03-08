import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import {
  RefreshCw,
  Star,
  Sparkles,
  Camera,
  CheckCircle2,
  X,
  Zap,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { analyzeVisualPractice, generateSpeech } from '../services/geminiService';
import { EducationLevel } from '../types';
import { useCartoonMaskTracking } from '../hooks/useCartoonMaskTracking';
import {
  ArithmeticMode,
  PracticeQuestion,
  PracticeResult,
  generateArithmeticQuestions,
  getImprovementSummary,
} from '../utils/practiceEngine';

interface MaskOption {
  id: string;
  name: string;
  emoji: string;
  url: string;
}

const MASK_OPTIONS: MaskOption[] = [
  { id: 'lion', name: 'Lion', emoji: '🦁', url: 'https://img.icons8.com/color/200/lion.png' },
  { id: 'rabbit', name: 'Rabbit', emoji: '🐰', url: 'https://img.icons8.com/color/200/rabbit.png' },
  { id: 'superhero', name: 'Hero', emoji: '🦸', url: 'https://img.icons8.com/color/200/superhero.png' },
  { id: 'princess', name: 'Princess', emoji: '👸', url: 'https://img.icons8.com/color/200/princess.png' },
  { id: 'robot', name: 'Robot', emoji: '🤖', url: 'https://img.icons8.com/color/200/robot.png' },
  { id: 'cat', name: 'Cat', emoji: '🐱', url: 'https://img.icons8.com/color/200/cat.png' },
  { id: 'owl', name: 'Owl', emoji: '🦉', url: 'https://img.icons8.com/color/200/owl.png' },
  { id: 'tiger', name: 'Tiger', emoji: '🐯', url: 'https://img.icons8.com/color/200/tiger.png' },
  { id: 'teacher', name: 'Teacher', emoji: '🧑‍🏫', url: 'https://img.icons8.com/color/200/teacher.png' },
  { id: 'scholar', name: 'Scholar', emoji: '👨‍🎓', url: 'https://img.icons8.com/color/200/graduate.png' },
];

interface CartoonMaskPracticeProps {
  context: string;
  characterName: string;
  level: EducationLevel;
  topic: string;
  subjectName: string;
}

export const CartoonMaskPractice: React.FC<CartoonMaskPracticeProps> = ({
  context,
  characterName,
  level,
  topic,
  subjectName,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const activeMaskImageRef = useRef<HTMLImageElement | null>(null);

  const [isActive, setIsActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [selectedMask, setSelectedMask] = useState<MaskOption>(MASK_OPTIONS[0]);
  const [feedback, setFeedback] = useState<any>(null);

  const [selectedMode, setSelectedMode] = useState<ArithmeticMode>('addition');
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [studentAnswer, setStudentAnswer] = useState('');
  const [results, setResults] = useState<PracticeResult[]>([]);
  const [score, setScore] = useState(0);
  const [sessionFinished, setSessionFinished] = useState(false);
  const [narratorMessage, setNarratorMessage] = useState('Choose a topic and start practicing.');

  const maskImagesRef = useRef<Record<string, HTMLImageElement>>({});

  useEffect(() => {
    MASK_OPTIONS.forEach(mask => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = mask.url;
      img.referrerPolicy = 'no-referrer';
      maskImagesRef.current[mask.id] = img;
    });
  }, []);

  useEffect(() => {
    activeMaskImageRef.current = maskImagesRef.current[selectedMask.id] ?? null;
  }, [selectedMask]);

  const { isModelLoading, isFaceDetected, showLowLightWarning } = useCartoonMaskTracking(
    videoRef,
    overlayCanvasRef,
    activeMaskImageRef,
    isActive
  );

  const currentQuestion = useMemo(
    () => questions[currentIndex] ?? null,
    [questions, currentIndex]
  );

  const speakText = useCallback(async (text: string) => {
    setNarratorMessage(text);
    try {
      const audioUrl = await generateSpeech(text);
      if (audioUrl) {
        const audio = new Audio(audioUrl);
        await audio.play();
      }
    } catch (error) {
      console.error('Speech failed:', error);
    }
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' },
        audio: false,
      });
      setStream(mediaStream);
      setIsActive(true);
      setFeedback(null);
    } catch (err) {
      console.error('Error accessing camera:', err);
    }
  };

  const stopCamera = useCallback(() => {
    stream?.getTracks().forEach(track => track.stop());
    setStream(null);
    setIsActive(false);
  }, [stream]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = isActive ? stream : null;
    }
  }, [isActive, stream]);

  const startPractice = async (mode: ArithmeticMode) => {
    const generated = generateArithmeticQuestions(mode, 5);
    setSelectedMode(mode);
    setQuestions(generated);
    setCurrentIndex(0);
    setStudentAnswer('');
    setResults([]);
    setScore(0);
    setSessionFinished(false);

    await speakText(`Great. Let us practice ${mode}. First question. ${generated[0].text}`);
  };

  const submitAnswer = async () => {
    if (!currentQuestion) return;

    const numeric = Number(studentAnswer);
    const isCorrect = numeric === currentQuestion.answer;

    const result: PracticeResult = {
      question: currentQuestion.text,
      studentAnswer: Number.isNaN(numeric) ? null : numeric,
      correctAnswer: currentQuestion.answer,
      isCorrect,
      mode: currentQuestion.mode,
    };

    setResults(prev => [...prev, result]);
    if (isCorrect) {
      setScore(prev => prev + 1);
      await speakText('Correct! Well done.');
    } else {
      await speakText(`Incorrect. The correct answer is ${currentQuestion.answer}.`);
    }

    setStudentAnswer('');

    const nextIndex = currentIndex + 1;
    if (nextIndex < questions.length) {
      setCurrentIndex(nextIndex);
      setTimeout(() => {
        void speakText(`Next question. ${questions[nextIndex].text}`);
      }, 500);
    } else {
      setSessionFinished(true);
      const allResults = [...results, result];
      const finalScore = isCorrect ? score + 1 : score;
      const summary = `You scored ${finalScore} out of ${questions.length}. ${getImprovementSummary(allResults)}`;
      await speakText(summary);
    }
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current || isAnalyzing) return;

    setIsAnalyzing(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const video = videoRef.current;
    const overlayCanvas = overlayCanvasRef.current;

    if (video.videoWidth === 0 || video.videoHeight === 0 || !ctx || !overlayCanvas) {
      setIsAnalyzing(false);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.drawImage(video, 0, 0);
    ctx.drawImage(overlayCanvas, 0, 0);

    const imageData = canvas.toDataURL('image/jpeg');
    stopCamera();

    try {
      const result = await analyzeVisualPractice(imageData, characterName, context);
      setFeedback(result);
      await speakText(result.feedback);
    } catch (err) {
      console.error('Analysis failed:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const subjectIsMath = subjectName.toLowerCase().includes('math');

  return (
    <div className="bg-slate-50 p-4 md:p-6 rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-slate-100 max-w-5xl mx-auto">
      {/* Compact Header */}
      <div className="flex items-center justify-between mb-4 px-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-100">
            <Camera size={20} />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight leading-none">Mask Mode</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Learn with your character!</p>
          </div>
        </div>
        
        {isActive && (
          <div className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
            <div className={`w-2 h-2 rounded-full ${isFaceDetected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
              {isFaceDetected ? 'Mask Active' : 'Looking for Face...'}
            </span>
          </div>
        )}
      </div>

      {/* Math Practice Controls - Only show when not in session or finished */}
      {subjectIsMath && !isActive && !sessionFinished && (
        <div className="mb-6 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Practice Topics</p>
          <div className="flex flex-wrap gap-2">
            {(['addition', 'subtraction', 'multiplication', 'division'] as ArithmeticMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => void startPractice(mode)}
                className={`px-4 py-3 rounded-2xl text-sm font-black uppercase tracking-wide transition ${
                  selectedMode === mode
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-50 text-slate-700 border border-slate-200'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="relative w-full aspect-[3/4] md:aspect-video rounded-[2.5rem] overflow-hidden bg-slate-900 border-4 border-white shadow-xl group">
        {/* Top Section: Floating Lesson Bubble */}
        <AnimatePresence>
          {isActive && currentQuestion && !sessionFinished && (
            <motion.div 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="absolute top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-xs px-4 pointer-events-none"
            >
              <div className="bg-white/90 backdrop-blur-xl p-3 rounded-3xl shadow-2xl border-2 border-indigo-500 flex flex-col items-center text-center">
                <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-1">Question {currentIndex + 1}</p>
                <h4 className="text-3xl font-black text-indigo-600 tracking-tighter mb-1">
                  {currentQuestion.text}
                </h4>
                <div className="flex flex-wrap justify-center gap-1 text-xl">
                  {currentQuestion.visual.map((item, idx) => (
                    <span key={idx}>{item}</span>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Full Screen Camera Background */}
        {!isActive ? (
          <div className="flex flex-col items-center justify-center h-full text-white/50 space-y-6 p-8 text-center bg-slate-900">
            {isModelLoading ? (
              <div className="flex flex-col items-center space-y-4">
                <RefreshCw size={40} className="animate-spin text-indigo-400" />
                <p className="text-xs font-bold uppercase tracking-widest">Waking up the AI...</p>
              </div>
            ) : (
              <>
                <div className="p-6 bg-white/5 rounded-full border border-white/10">
                  <Camera size={48} />
                </div>
                <div>
                  <h4 className="text-xl font-black text-white mb-1 uppercase tracking-tight">Ready for your mask?</h4>
                  <p className="text-slate-400 text-xs font-medium">Wear your {selectedMask.name} mask and start learning!</p>
                </div>
                <button 
                  onClick={startCamera}
                  className="px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl hover:scale-105 active:scale-95 flex items-center space-x-3"
                >
                  <Camera size={20} />
                  <span>Open Camera</span>
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            <video 
              ref={videoRef} 
              autoPlay 
              muted 
              playsInline 
              className="w-full h-full object-cover scale-x-[-1]"
            />
            <canvas 
              ref={overlayCanvasRef} 
              className="absolute inset-0 w-full h-full object-cover scale-x-[-1] pointer-events-none"
            />

            {/* Face Guide Overlay - Clean Circle */}
            {!isFaceDetected && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-64 border-4 border-dashed border-white/40 rounded-full flex flex-col items-center justify-center">
                  <div className="w-full h-full bg-white/5 rounded-full backdrop-blur-[1px]" />
                  <p className="absolute -bottom-10 text-white/80 text-[10px] font-black uppercase tracking-widest bg-black/40 px-4 py-1 rounded-full backdrop-blur-md">
                    Place face inside circle
                  </p>
                </div>
              </div>
            )}
            
            {/* Status Overlays - Minimal */}
            <div className="absolute top-6 left-6 flex flex-col space-y-2">
              <div className="bg-indigo-600/80 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-xl border border-indigo-400/30 flex items-center space-x-2">
                <Sparkles size={12} className="text-white" />
                <span className="text-[9px] font-black text-white uppercase tracking-widest">AI Tracking</span>
              </div>
            </div>

            {!isFaceDetected && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none w-full px-8"
              >
                {showLowLightWarning && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 bg-red-600/90 backdrop-blur-md border border-red-400 rounded-3xl flex items-center justify-center space-x-3 shadow-2xl"
                  >
                    <AlertCircle size={20} className="text-white" />
                    <span className="text-sm font-black text-white uppercase tracking-tight">Too dark! Move to a brighter spot</span>
                  </motion.div>
                )}
              </motion.div>
            )}
          </>
        )}
      </div>

      {/* Bottom Section: Mask Selector & Action Buttons */}
      {isActive && (
        <div className="mt-6 space-y-6">
          {/* Answer Input for Math */}
          {currentQuestion && !sessionFinished && (
            <div className="bg-white p-4 rounded-[2rem] border border-slate-200 shadow-sm flex items-center space-x-4">
              <div className="flex-1">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 px-2">
                  Your Answer
                </label>
                <input
                  value={studentAnswer}
                  onChange={e => setStudentAnswer(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && void submitAnswer()}
                  inputMode="numeric"
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-lg font-bold outline-none focus:border-indigo-500 bg-slate-50"
                  placeholder="Type here..."
                />
              </div>
              <button
                onClick={() => void submitAnswer()}
                className="px-8 py-4 rounded-2xl bg-indigo-600 text-white font-black uppercase tracking-wide shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
              >
                Check
              </button>
            </div>
          )}

          {/* Mask Selection - Below Camera */}
          <div className="bg-white p-4 rounded-[2rem] border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3 px-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pick a Mask</p>
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{selectedMask.name} Selected</p>
            </div>
            <div className="flex items-center space-x-3 overflow-x-auto pb-2 no-scrollbar">
              {MASK_OPTIONS.map((mask) => (
                <button
                  key={mask.id}
                  onClick={() => setSelectedMask(mask)}
                  className={`flex-shrink-0 flex flex-col items-center justify-center w-16 h-20 rounded-2xl transition-all border-2 ${
                    selectedMask.id === mask.id 
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-600 shadow-md scale-105' 
                      : 'bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-2xl mb-1">{mask.emoji}</span>
                  <span className="text-[8px] font-black uppercase tracking-tighter text-center leading-none px-1">{mask.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons - Bottom Row */}
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={stopCamera}
              className="p-4 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-2xl transition-all border border-slate-300 flex items-center space-x-2"
              title="Close Camera"
            >
              <X size={20} />
              <span className="text-xs font-black uppercase tracking-widest">Close</span>
            </button>
            
            <button
              onClick={captureAndAnalyze}
              disabled={isAnalyzing || !isFaceDetected}
              className={`flex-1 max-w-xs py-4 rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl flex items-center justify-center space-x-3 ${
                isAnalyzing || !isFaceDetected
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-[1.02] active:scale-95'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw size={20} className="animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <Zap size={20} />
                  <span>Finish Narration</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Session Summary */}
      {sessionFinished && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 bg-green-50 border border-green-100 rounded-[2.5rem] p-6 shadow-lg"
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-green-100 rounded-xl">
              <Star className="text-green-600 fill-green-600" size={24} />
            </div>
            <h5 className="text-xl font-black text-green-800 uppercase tracking-tight">Practice Summary</h5>
          </div>
          <div className="bg-white p-4 rounded-2xl mb-4 border border-green-100 shadow-sm">
            <p className="text-2xl font-black text-green-600">Score: {score} / {questions.length}</p>
            <p className="mt-2 text-slate-700 font-medium leading-relaxed">{getImprovementSummary(results)}</p>
          </div>
          <button 
            onClick={() => void startPractice(selectedMode)}
            className="w-full py-4 bg-green-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-green-700 transition-all shadow-xl"
          >
            Practice Again
          </button>
        </motion.div>
      )}

      <canvas ref={canvasRef} className="hidden" />

      {/* Feedback Section */}
      <AnimatePresence mode="wait">
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-indigo-100 shadow-xl mt-8"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-amber-100 rounded-xl">
                  <Star className="text-amber-500 fill-amber-500" size={24} />
                </div>
                <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">Mission Report</h4>
              </div>
              <div className="px-6 py-2 bg-indigo-50 rounded-2xl text-sm font-black text-indigo-600 shadow-sm border border-indigo-100">
                ACTING SCORE: {feedback.actingScore}%
              </div>
            </div>
            
            <div className="bg-slate-50 p-6 rounded-3xl mb-6 border border-slate-100">
              <p className="text-slate-700 italic font-bold text-lg leading-relaxed">"{feedback.feedback}"</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-green-50 p-5 rounded-3xl border border-green-100">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle2 size={16} className="text-green-600" />
                  <p className="text-[10px] font-black text-green-700 uppercase tracking-widest">Strengths</p>
                </div>
                <p className="text-sm text-green-800 leading-relaxed font-medium">{feedback.strengths}</p>
              </div>
              <div className="bg-amber-50 p-5 rounded-3xl border border-amber-100">
                <div className="flex items-center space-x-2 mb-2">
                  <Sparkles size={16} className="text-amber-600" />
                  <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Improvements</p>
                </div>
                <p className="text-sm text-amber-800 leading-relaxed font-medium">{feedback.improvements}</p>
              </div>
            </div>

            <div className="mt-8 flex justify-center">
              <button 
                onClick={startCamera}
                className="flex items-center space-x-3 px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl hover:scale-105 active:scale-95"
              >
                <RefreshCw size={20} />
                <span>Try Another Mask</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
