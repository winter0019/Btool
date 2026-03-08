import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Video, VideoOff, RefreshCw, Star, Sparkles, Camera, CheckCircle2, X, Zap, AlertCircle } from 'lucide-react';
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
  topic: string;
  subjectName: string;
}

export const CartoonMaskPractice: React.FC<CartoonMaskPracticeProps> = ({ context, characterName, level, topic, subjectName }) => {
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
  const [showLowLightWarning, setShowLowLightWarning] = useState(false);
  const maskImagesRef = useRef<Record<string, HTMLImageElement>>({});
  const detectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const requestRef = useRef<number | undefined>(undefined);

  const [showAnswer, setShowAnswer] = useState(false);

  // Pre-load mask images
  useEffect(() => {
    MASK_OPTIONS.forEach(mask => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
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

  useEffect(() => {
    if (isFaceDetected && !showAnswer) {
      const timer = setTimeout(() => setShowAnswer(true), 3000);
      return () => clearTimeout(timer);
    }
    if (!isFaceDetected) {
      setShowAnswer(false);
    }
  }, [isFaceDetected, showAnswer]);

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

  const smoothedFaceRef = useRef({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    rotation: 0,
    initialized: false
  });

  const detectFace = useCallback(async () => {
    if (!detector || !videoRef.current || !overlayCanvasRef.current || !isActive) return;

    const video = videoRef.current;
    const canvas = overlayCanvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) {
      requestRef.current = requestAnimationFrame(detectFace);
      return;
    }

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
        setShowLowLightWarning(false);
        if (detectionTimeoutRef.current) {
          clearTimeout(detectionTimeoutRef.current);
          detectionTimeoutRef.current = null;
        }

        const face = faces[0];
        const { box, keypoints } = face;
        
        // Calculate rotation based on eyes
        let rotation = 0;
        if (keypoints && keypoints.length >= 2) {
          const leftEye = keypoints[0]; // MediaPipe indices: 0: left eye, 1: right eye
          const rightEye = keypoints[1];
          if (leftEye && rightEye) {
            rotation = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);
          }
        }

        // Smoothing factor (0.1 = very smooth, 1.0 = no smoothing)
        const alpha = 0.3;
        
        if (!smoothedFaceRef.current.initialized) {
          smoothedFaceRef.current = {
            x: box.xMin,
            y: box.yMin,
            width: box.width,
            height: box.height,
            rotation: rotation,
            initialized: true
          };
        } else {
          smoothedFaceRef.current = {
            x: smoothedFaceRef.current.x * (1 - alpha) + box.xMin * alpha,
            y: smoothedFaceRef.current.y * (1 - alpha) + box.yMin * alpha,
            width: smoothedFaceRef.current.width * (1 - alpha) + box.width * alpha,
            height: smoothedFaceRef.current.height * (1 - alpha) + box.height * alpha,
            rotation: smoothedFaceRef.current.rotation * (1 - alpha) + rotation * alpha,
            initialized: true
          };
        }

        const sFace = smoothedFaceRef.current;
        
        // Draw mask
        const maskImg = maskImagesRef.current[selectedMask.id];
        
        if (maskImg) {
          const padding = sFace.width * 0.45;
          const maskWidth = sFace.width + padding * 2;
          const maskHeight = maskWidth;
          
          // Center of the face box
          const centerX = sFace.x + sFace.width / 2;
          const centerY = sFace.y + sFace.height / 2 - padding * 0.2;

          ctx.save();
          ctx.translate(centerX, centerY);
          ctx.rotate(sFace.rotation);
          
          // Draw image centered at the translated origin
          ctx.drawImage(maskImg, -maskWidth / 2, -maskHeight / 2, maskWidth, maskHeight);
          
          ctx.restore();
        }
      } else {
        setIsFaceDetected(false);
        smoothedFaceRef.current.initialized = false;
        
        if (!detectionTimeoutRef.current && isActive) {
          detectionTimeoutRef.current = setTimeout(() => {
            setShowLowLightWarning(true);
          }, 5000);
        }
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

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setIsAnalyzing(false);
      return;
    }

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

      <div className="relative w-full aspect-[3/4] md:aspect-video rounded-[2.5rem] overflow-hidden bg-slate-900 border-4 border-white shadow-xl group">
        {/* Top Section: Floating Lesson Bubble */}
        <AnimatePresence>
          {isActive && isFaceDetected && (
            <motion.div 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="absolute top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-xs px-4 pointer-events-none"
            >
              <div className="bg-white/90 backdrop-blur-xl p-3 rounded-3xl shadow-2xl border-2 border-indigo-500 flex flex-col items-center text-center">
                <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-1">Current Lesson</p>
                
                {subjectName.toLowerCase().includes('math') ? (
                  <div className="flex flex-col items-center">
                    <div className="flex items-center space-x-3 mb-1">
                      <span className="text-2xl">🍎</span>
                      <span className="text-xl font-black text-slate-400">+</span>
                      <span className="text-2xl">🍎🍎</span>
                    </div>
                    <h4 className="text-3xl font-black text-indigo-600 tracking-tighter">
                      1 + 2 = {showAnswer ? '3' : '?'}
                    </h4>
                    {showAnswer && (
                      <motion.p 
                        initial={{ scale: 0 }} 
                        animate={{ scale: 1 }} 
                        className="text-[10px] font-bold text-indigo-400 mt-0.5 uppercase"
                      >
                        Three Apples!
                      </motion.p>
                    )}
                  </div>
                ) : subjectName.toLowerCase().includes('science') ? (
                  <div className="flex flex-col items-center">
                    <div className="text-3xl mb-1">🌱 ➔ 🌳</div>
                    <h4 className="text-lg font-black text-green-600 uppercase tracking-tight">Growth Cycle</h4>
                  </div>
                ) : (
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">{topic}</h4>
                )}
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
                  <VideoOff size={48} />
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
              className="w-full h-full object-cover mirror"
            />
            <canvas 
              ref={overlayCanvasRef} 
              className="absolute inset-0 w-full h-full object-cover mirror pointer-events-none"
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
          {/* Mask Selection - Below Camera */}
          <div className="bg-white p-4 rounded-[2rem] border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3 px-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pick a Mask</p>
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{selectedMask.name} Selected</p>
            </div>
            <div className="flex items-center space-x-3 overflow-x-auto pb-2 custom-scrollbar no-scrollbar">
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

      <canvas ref={canvasRef} className="hidden" />

      {/* Feedback Section */}
      <AnimatePresence mode="wait">
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-indigo-50 p-8 rounded-[2.5rem] border border-indigo-100 shadow-xl mt-8"
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
  );
};
