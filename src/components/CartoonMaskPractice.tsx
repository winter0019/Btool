import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Video, VideoOff, RefreshCw, Star, Sparkles, Camera, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as faceDetection from '@tensorflow-models/face-detection';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-core';
import { analyzeVisualPractice, generateSpeech } from '../services/geminiService';
import { EducationLevel } from '../types';

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
}

export const CartoonMaskPractice: React.FC<CartoonMaskPracticeProps> = ({ context, characterName, level }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [selectedMask, setSelectedMask] = useState<MaskOption>(MASK_OPTIONS[0]);
  const [detector, setDetector] = useState<faceDetection.FaceDetector | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [feedback, setFeedback] = useState<any>(null);
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const maskImagesRef = useRef<Record<string, HTMLImageElement>>({});

  const requestRef = useRef<number | undefined>(undefined);

  // Pre-load mask images
  useEffect(() => {
    MASK_OPTIONS.forEach(mask => {
      const img = new Image();
      img.src = mask.url;
      img.referrerPolicy = 'no-referrer';
      maskImagesRef.current[mask.id] = img;
    });
  }, []);

  // Load face detection model
  useEffect(() => {
    const loadModel = async () => {
      try {
        const model = faceDetection.SupportedModels.MediaPipeFaceDetector;
        const detectorConfig: faceDetection.MediaPipeFaceDetectorTfjsModelConfig = {
          runtime: 'tfjs',
          maxFaces: 1,
        };
        const newDetector = await faceDetection.createDetector(model, detectorConfig);
        setDetector(newDetector);
        setIsModelLoading(false);
      } catch (err) {
        console.error("Error loading face detection model:", err);
        setIsModelLoading(false);
      }
    };
    loadModel();
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 1280, height: 720, facingMode: 'user' } 
      });
      setStream(mediaStream);
      setIsActive(true);
      setFeedback(null);
    } catch (err) {
      console.error("Error accessing camera:", err);
    }
  };

  const stopCamera = useCallback(() => {
    stream?.getTracks().forEach(track => track.stop());
    setStream(null);
    setIsActive(false);
    if (requestRef.current !== undefined) {
      cancelAnimationFrame(requestRef.current);
    }
  }, [stream]);

  const detectFace = useCallback(async () => {
    if (!detector || !videoRef.current || !overlayCanvasRef.current || !isActive) return;

    const video = videoRef.current;
    const canvas = overlayCanvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Set canvas dimensions to match video
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    try {
      const faces = await detector.estimateFaces(video, { flipHorizontal: false });
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (faces.length > 0) {
        setIsFaceDetected(true);
        const face = faces[0];
        const { box } = face;
        
        // Draw mask
        const maskImg = maskImagesRef.current[selectedMask.id];
        
        if (maskImg) {
          // Calculate mask position and size
          // We want the mask to be slightly larger than the face box
          const padding = box.width * 0.4;
          const maskWidth = box.width + padding * 2;
          const maskHeight = maskWidth; // Keep it square for masks
          const maskX = box.xMin - padding;
          const maskY = box.yMin - padding * 1.2;

          ctx.drawImage(maskImg, maskX, maskY, maskWidth, maskHeight);
        }
      } else {
        setIsFaceDetected(false);
      }
    } catch (err) {
      console.error("Face detection error:", err);
    }

    requestRef.current = requestAnimationFrame(detectFace);
  }, [detector, isActive, selectedMask]);

  useEffect(() => {
    if (isActive) {
      requestRef.current = requestAnimationFrame(detectFace);
    }
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isActive, detectFace]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = isActive ? stream : null;
    }
  }, [isActive, stream]);

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current || isAnalyzing) return;

    setIsAnalyzing(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const video = videoRef.current;
    const overlayCanvas = overlayCanvasRef.current;

    if (ctx && overlayCanvas) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw video frame
      ctx.drawImage(video, 0, 0);
      // Draw mask overlay
      ctx.drawImage(overlayCanvas, 0, 0);
      
      const imageData = canvas.toDataURL('image/jpeg');
      
      stopCamera();

      try {
        const result = await analyzeVisualPractice(imageData, characterName, context);
        setFeedback(result);
        
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

  return (
    <div className="bg-white p-6 md:p-10 rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-slate-100">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 space-y-4 md:space-y-0">
        <div className="flex items-center space-x-5">
          <div className="p-4 bg-indigo-600 rounded-3xl text-white shadow-xl shadow-indigo-100">
            <Camera size={28} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Cartoon Mask Mode</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Wear a mask & narrate your story!</p>
          </div>
        </div>
        <div className="flex items-center space-x-3 bg-indigo-50 px-4 py-2 rounded-full border border-indigo-100">
          <Sparkles size={16} className="text-indigo-600" />
          <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">AI Face Tracking</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Mask Selection Panel */}
        <div className="lg:col-span-1 space-y-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Choose Your Mask</p>
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {MASK_OPTIONS.map((mask) => (
              <button
                key={mask.id}
                onClick={() => setSelectedMask(mask)}
                className={`flex items-center space-x-3 p-3 rounded-2xl transition-all border-2 ${
                  selectedMask.id === mask.id 
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100 scale-105' 
                    : 'bg-slate-50 border-transparent text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="text-2xl">{mask.emoji}</span>
                <span className="text-xs font-black uppercase tracking-widest">{mask.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Camera Preview Area */}
        <div className="lg:col-span-3 space-y-6">
          <div className="w-full aspect-video rounded-[3rem] overflow-hidden bg-slate-900 relative border-8 border-white shadow-2xl group">
            {!isActive ? (
              <div className="flex flex-col items-center justify-center h-full text-white/50 space-y-8 p-12 text-center">
                {isModelLoading ? (
                  <div className="flex flex-col items-center space-y-4">
                    <RefreshCw size={48} className="animate-spin text-indigo-400" />
                    <p className="text-sm font-bold uppercase tracking-widest">Waking up the AI...</p>
                  </div>
                ) : (
                  <>
                    <div className="p-8 bg-white/5 rounded-full border border-white/10">
                      <VideoOff size={64} />
                    </div>
                    <div>
                      <h4 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Ready for your mask?</h4>
                      <p className="text-slate-400 text-sm font-medium">Face the camera to wear your {selectedMask.name} mask!</p>
                    </div>
                    <button 
                      onClick={startCamera}
                      className="px-12 py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-3xl font-black uppercase tracking-widest transition-all shadow-2xl hover:scale-105 active:scale-95 flex items-center space-x-3"
                    >
                      <Camera size={24} />
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
                  className="w-full h-full object-cover mirror"
                />
                <canvas 
                  ref={overlayCanvasRef} 
                  className="absolute inset-0 w-full h-full object-cover mirror pointer-events-none"
                />
                
                <div className="absolute top-8 left-8 flex items-center space-x-4">
                  <div className="bg-white/90 backdrop-blur-md px-6 py-3 rounded-2xl shadow-2xl border border-white flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${isFaceDetected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                    <span className="text-xs font-black text-slate-800 uppercase tracking-widest">
                      {isFaceDetected ? 'Mask Active' : 'Looking for Face...'}
                    </span>
                  </div>
                </div>

                <div className="absolute bottom-10 left-0 right-0 flex justify-center space-x-4">
                  <button 
                    onClick={captureAndAnalyze}
                    disabled={isAnalyzing}
                    className="px-12 py-5 bg-white text-indigo-600 hover:bg-indigo-50 rounded-3xl font-black uppercase tracking-widest transition-all shadow-2xl flex items-center space-x-3 hover:scale-105 active:scale-95 border-b-4 border-indigo-200"
                  >
                    {isAnalyzing ? <RefreshCw size={24} className="animate-spin" /> : <Video size={24} />}
                    <span>Finish Narration</span>
                  </button>
                  <button 
                    onClick={stopCamera}
                    className="p-5 bg-red-500 text-white hover:bg-red-600 rounded-3xl transition-all shadow-2xl hover:scale-105 active:scale-95"
                  >
                    <VideoOff size={24} />
                  </button>
                </div>

                {!isFaceDetected && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none"
                  >
                    <div className="bg-indigo-600/90 backdrop-blur-md text-white px-8 py-4 rounded-3xl shadow-2xl border border-white/20">
                      <p className="text-lg font-black uppercase tracking-tighter">Face the camera to wear your mask!</p>
                    </div>
                  </motion.div>
                )}
              </>
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />

          {/* Feedback Section */}
          <AnimatePresence mode="wait">
            {feedback && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-indigo-50 p-8 rounded-[2.5rem] border border-indigo-100 shadow-xl"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-amber-100 rounded-xl">
                      <Star className="text-amber-500 fill-amber-500" size={24} />
                    </div>
                    <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">Mission Report</h4>
                  </div>
                  <div className="px-6 py-2 bg-white rounded-2xl text-sm font-black text-indigo-600 shadow-md border border-indigo-50">
                    ACTING SCORE: {feedback.actingScore}%
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-3xl shadow-sm mb-6 border border-indigo-50">
                  <p className="text-slate-700 italic font-bold text-lg leading-relaxed">"{feedback.feedback}"</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-green-100/50 p-6 rounded-3xl border border-green-100">
                    <div className="flex items-center space-x-2 mb-2">
                      <CheckCircle2 size={18} className="text-green-600" />
                      <p className="text-xs font-black text-green-700 uppercase tracking-widest">What you did well</p>
                    </div>
                    <p className="text-sm text-green-800 leading-relaxed font-medium">{feedback.strengths}</p>
                  </div>
                  <div className="bg-amber-100/50 p-6 rounded-3xl border border-amber-100">
                    <div className="flex items-center space-x-2 mb-2">
                      <Sparkles size={18} className="text-amber-600" />
                      <p className="text-xs font-black text-amber-700 uppercase tracking-widest">How to be even better</p>
                    </div>
                    <p className="text-sm text-amber-800 leading-relaxed font-medium">{feedback.improvements}</p>
                  </div>
                </div>

                <div className="mt-8 flex justify-center">
                  <button 
                    onClick={startCamera}
                    className="flex items-center space-x-3 px-10 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl hover:scale-105 active:scale-95"
                  >
                    <RefreshCw size={20} />
                    <span>Try Another Mask</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
