import React, { useState, useEffect, useCallback } from 'react';
import { Mic, MicOff, Volume2, RefreshCw, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';
import { analyzeVoiceInput, generateSpeech } from '../services/geminiService';
import { motion, AnimatePresence } from 'motion/react';

interface VoicePracticeProps {
  context: string;
  characterName: string;
}

export const VoicePractice: React.FC<VoicePracticeProps> = ({ context, characterName }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState<{ 
    isCorrect: boolean; 
    feedback: string; 
    hint: string;
    pronunciationFeedback: string;
    clarityScore: number;
    strengths: string;
    improvements: string;
    futureHints: string;
  } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-NG'; // Nigerian English

      rec.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      setRecognition(rec);
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognition?.stop();
      if (transcript) {
        handleAnalyze(transcript);
      }
    } else {
      setTranscript('');
      setFeedback(null);
      recognition?.start();
      setIsListening(true);
    }
  };

  const handleAnalyze = async (text: string) => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeVoiceInput(text, context, characterName);
      setFeedback(result);
      
      // Speak the feedback
      const audioUrl = await generateSpeech(result.feedback);
      if (audioUrl) {
        const audio = new Audio(audioUrl);
        audio.play();
      }
    } catch (err) {
      console.error('Analysis failed:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-100">
            <Mic size={24} />
          </div>
          <div>
            <h3 className="font-black text-slate-900 uppercase tracking-tight">Voice Mission</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Speak to your tutor</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 bg-indigo-50 px-3 py-1 rounded-full">
          <Sparkles size={14} className="text-indigo-600" />
          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">AI Analysis</span>
        </div>
      </div>

      <div className="flex flex-col items-center space-y-8">
        <motion.button
          whileHover={{ scale: 1.1, rotate: 5 }}
          whileTap={{ scale: 0.9 }}
          onClick={toggleListening}
          className={`w-24 h-24 rounded-[2rem] flex items-center justify-center transition-all shadow-2xl ${
            isListening 
              ? 'bg-red-500 text-white shadow-red-200 animate-pulse' 
              : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
          }`}
        >
          {isListening ? <MicOff size={40} /> : <Mic size={40} />}
        </motion.button>

        <div className="w-full">
          <AnimatePresence mode="wait">
            {transcript && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-4"
              >
                <p className="text-xs text-slate-400 uppercase font-bold mb-1">You said:</p>
                <p className="text-slate-700 font-medium italic">"{transcript}"</p>
              </motion.div>
            )}

            {isAnalyzing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center space-x-2 text-indigo-600 py-4"
              >
                <RefreshCw size={16} className="animate-spin" />
                <span className="text-sm font-medium">AI is evaluating...</span>
              </motion.div>
            )}

            {feedback && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`p-4 rounded-2xl border-2 space-y-4 ${
                  feedback.isCorrect 
                    ? 'bg-green-50 border-green-100 text-green-800' 
                    : 'bg-amber-50 border-amber-100 text-amber-800'
                }`}
              >
                <div className="flex items-start space-x-3">
                  {feedback.isCorrect ? (
                    <CheckCircle className="text-green-500 mt-1 shrink-0" size={20} />
                  ) : (
                    <AlertCircle className="text-amber-500 mt-1 shrink-0" size={20} />
                  )}
                  <div>
                    <p className="font-bold text-sm mb-1">{feedback.feedback}</p>
                    <p className="text-xs opacity-80 leading-relaxed">
                      <span className="font-bold">Hint:</span> {feedback.hint}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-black/5 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Speech Clarity</span>
                      <span className="text-xs font-bold">{feedback.clarityScore}%</span>
                    </div>
                    <div className="w-full bg-black/5 h-1.5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${feedback.clarityScore}%` }}
                        className={`h-full ${feedback.clarityScore > 70 ? 'bg-green-500' : feedback.clarityScore > 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-green-100/50 p-3 rounded-xl">
                      <p className="text-[10px] font-bold text-green-700 uppercase mb-1">What went well</p>
                      <p className="text-xs text-green-800">{feedback.strengths}</p>
                    </div>
                    <div className="bg-amber-100/50 p-3 rounded-xl">
                      <p className="text-[10px] font-bold text-amber-700 uppercase mb-1">To improve</p>
                      <p className="text-xs text-amber-800">{feedback.improvements}</p>
                    </div>
                  </div>

                  <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                    <p className="text-[10px] font-bold text-indigo-700 uppercase mb-1">Future Hint</p>
                    <p className="text-xs text-indigo-800">{feedback.futureHints}</p>
                  </div>

                  <p className="text-xs italic opacity-80">
                    <span className="font-bold not-italic">Pronunciation Tip:</span> {feedback.pronunciationFeedback}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
