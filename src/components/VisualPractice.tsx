import React, { useRef, useEffect, useState } from 'react';
import { Camera, Video, VideoOff, RefreshCw, CheckCircle, Sparkles, Star } from 'lucide-react';
import { analyzeVisualPractice, generateSpeech } from '../services/geminiService';
import { motion, AnimatePresence } from 'motion/react';
import { EducationLevel } from '../types';

interface VisualPracticeProps {
  context: string;
  characterName: string;
  characterImageUrl?: string;
  level: EducationLevel;
}

export const VisualPractice: React.FC<VisualPracticeProps> = ({ context, characterName, characterImageUrl, level }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [feedback, setFeedback] = useState<{
    actingScore: number;
    emotion: string;
    feedback: string;
    strengths: string;
    improvements: string;
    futureHints: string;
  } | null>(null);

  const isPrimary = level.includes('Primary');

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(mediaStream);
      setIsActive(true);
      setFeedback(null);
    } catch (err) {
      console.error("Error accessing camera:", err);
    }
  };

  const stopCameraAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current || isAnalyzing) {
      stream?.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsActive(false);
      return;
    }

    setIsAnalyzing(true);
    const canvasContext = canvasRef.current.getContext('2d');
    if (canvasContext) {
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      canvasContext.drawImage(videoRef.current, 0, 0);
      
      const imageData = canvasRef.current.toDataURL('image/jpeg');
      
      // Stop camera first
      stream?.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsActive(false);

      try {
        const result = await analyzeVisualPractice(imageData, characterName, context);
        setFeedback(result);
        
        // Speak the feedback
        const audioUrl = await generateSpeech(result.feedback);
        if (audioUrl) {
          const audio = new Audio(audioUrl);
          audio.play();
        }
      } catch (err) {
        console.error("Analysis failed:", err);
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = isActive ? stream : null;
    }
  }, [isActive, stream]);

  return (
    <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-100">
            <Video size={24} />
          </div>
          <div>
            <h3 className="font-black text-slate-900 uppercase tracking-tight">Visual Mission</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Act like {characterName.split(',')[0]}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 bg-indigo-50 px-3 py-1 rounded-full">
          <Sparkles size={14} className="text-indigo-600" />
          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">AI Vision</span>
        </div>
      </div>

      <div className="flex flex-col items-center space-y-8">
        <div className="w-full max-w-md aspect-video rounded-[2.5rem] overflow-hidden bg-slate-900 relative border-8 border-white shadow-2xl">
          {!isActive ? (
            <div className="flex flex-col items-center justify-center h-full text-white/50 space-y-6">
              <div className="p-6 bg-white/10 rounded-full">
                <VideoOff size={48} />
              </div>
              <button 
                onClick={startCamera}
                className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl hover:scale-105 active:scale-95"
              >
                Start Acting Session
              </button>
            </div>
          ) : (
            <>
              <video 
                ref={videoRef} 
                autoPlay 
                muted 
                playsInline 
                className="w-full h-full object-cover mirror"
              />
              
              {/* Mask Stickers for Primary Students */}
              {isPrimary && characterImageUrl && (
                <>
                  <motion.div 
                    initial={{ scale: 0, x: -20 }}
                    animate={{ scale: 1, x: 0 }}
                    className="absolute top-6 left-6 w-20 h-20 md:w-28 md:h-28 rounded-full border-4 border-white shadow-2xl overflow-hidden bg-white/20 backdrop-blur-sm z-10"
                  >
                    <img src={characterImageUrl} alt="Mask" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 border-2 border-indigo-500 rounded-full animate-pulse" />
                  </motion.div>
                  
                  <motion.div
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.5 }}
                    className="absolute bottom-24 left-6 bg-white/90 px-4 py-2 rounded-2xl shadow-xl border border-indigo-100 flex items-center space-x-2 z-10"
                  >
                    <Star size={16} className="text-amber-500 fill-amber-500" />
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Act like {characterName.split(',')[0]}!</span>
                  </motion.div>
                </>
              )}

              <div className="absolute top-6 right-6 bg-red-500 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse shadow-lg">
                Recording Mission
              </div>

              <div className="absolute bottom-8 left-0 right-0 flex justify-center">
                <button 
                  onClick={stopCameraAndAnalyze}
                  className="px-10 py-4 bg-white text-red-600 hover:bg-red-50 rounded-2xl font-black uppercase tracking-widest transition-all shadow-2xl flex items-center space-x-3 hover:scale-105 active:scale-95"
                >
                  <VideoOff size={20} />
                  <span>End Mission</span>
                </button>
              </div>
            </>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        <AnimatePresence mode="wait">
          {isAnalyzing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center space-y-3 text-indigo-600 py-8"
            >
              <RefreshCw size={32} className="animate-spin" />
              <span className="text-sm font-bold uppercase tracking-widest">AI is reviewing your performance...</span>
            </motion.div>
          )}

          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full space-y-6"
            >
              <div className="bg-indigo-50 p-6 rounded-[2rem] border border-indigo-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Star className="text-amber-500 fill-amber-500" size={20} />
                    <h4 className="font-bold text-slate-800">Performance Review</h4>
                  </div>
                  <div className="px-3 py-1 bg-white rounded-full text-xs font-bold text-indigo-600 shadow-sm">
                    Acting Score: {feedback.actingScore}%
                  </div>
                </div>
                
                <p className="text-slate-700 italic font-medium mb-4">"{feedback.feedback}"</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-green-100/50 p-4 rounded-2xl">
                    <p className="text-[10px] font-bold text-green-700 uppercase mb-1 tracking-wider">Visual Strengths</p>
                    <p className="text-xs text-green-800 leading-relaxed">{feedback.strengths}</p>
                  </div>
                  <div className="bg-amber-100/50 p-4 rounded-2xl">
                    <p className="text-[10px] font-bold text-amber-700 uppercase mb-1 tracking-wider">Visual Improvements</p>
                    <p className="text-xs text-amber-800 leading-relaxed">{feedback.improvements}</p>
                  </div>
                </div>

                <div className="mt-4 bg-white/50 p-4 rounded-2xl border border-white">
                  <p className="text-[10px] font-bold text-indigo-700 uppercase mb-1 tracking-wider">Future Acting Hint</p>
                  <p className="text-xs text-indigo-800 leading-relaxed">{feedback.futureHints}</p>
                </div>
              </div>

              <div className="flex justify-center">
                <button 
                  onClick={startCamera}
                  className="flex items-center space-x-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all"
                >
                  <RefreshCw size={18} />
                  <span>Try Again</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
