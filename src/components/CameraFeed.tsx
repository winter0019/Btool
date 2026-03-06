import React, { useRef, useEffect, useState } from 'react';
import { Camera, Video, VideoOff, RefreshCw } from 'lucide-react';
import { analyzeVisualPractice } from '../services/geminiService';

interface CameraFeedProps {
  onAnalysis: (analysis: { engagementScore: number; emotion: string; confidence: string; feedback: string }) => void;
}

export const CameraFeed: React.FC<CameraFeedProps> = ({ onAnalysis }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [stream, setStream] = useState<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(mediaStream);
      setIsActive(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
    }
  };

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = isActive ? stream : null;
    }
  }, [isActive, stream]);

  const stopCamera = () => {
    stream?.getTracks().forEach(track => track.stop());
    setStream(null);
    setIsActive(false);
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current || isAnalyzing) return;

    setIsAnalyzing(true);
    const context = canvasRef.current.getContext('2d');
    if (context) {
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);
      
      const imageData = canvasRef.current.toDataURL('image/jpeg');
      try {
        const result = await analyzeVisualPractice(imageData, "Tutor", "Engagement Monitoring");
        onAnalysis({
          engagementScore: result.actingScore,
          emotion: result.emotion,
          confidence: "Medium",
          feedback: result.feedback
        });
      } catch (err) {
        console.error("Analysis failed:", err);
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  useEffect(() => {
    if (isActive) {
      const interval = setInterval(captureAndAnalyze, 15000); // Analyze every 15 seconds
      return () => clearInterval(interval);
    }
  }, [isActive]);

  return (
    <div className="relative group">
      <div className="w-48 h-48 rounded-2xl overflow-hidden border-4 border-white shadow-xl bg-slate-900 relative">
        {!isActive ? (
          <div className="flex flex-col items-center justify-center h-full text-white/50 space-y-2">
            <VideoOff size={32} />
            <button 
              onClick={startCamera}
              className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-full text-xs transition-colors"
            >
              Start Camera
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
            <div className="absolute top-2 right-2 flex space-x-1">
              <div className={`w-2 h-2 rounded-full ${isAnalyzing ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`} />
            </div>
            <button 
              onClick={stopCamera}
              className="absolute bottom-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <VideoOff size={14} />
            </button>
          </>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />
      
      <div className="mt-2 text-center">
        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
          Engagement Monitor
        </span>
      </div>
    </div>
  );
};
