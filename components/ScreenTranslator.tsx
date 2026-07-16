
import React, { useState, useRef, useEffect } from 'react';
import { translateImage } from '../services/geminiService';
import { ProfessionalField } from '../types';
import { generateId } from '../utils/id';
import LanguageSelector from './LanguageSelector';
import EditableText from './EditableText';

const ScreenTranslator: React.FC<{ onSave: (item: any) => void, field: ProfessionalField }> = ({ onSave, field }) => {
  const [isActive, setIsActive] = useState(false);
  const [targetLang, setTargetLang] = useState('English');
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<{ original: string, translated: string, confidence: number } | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [syncInterval, setSyncInterval] = useState(5000);
  const [isLeftExpanded, setIsLeftExpanded] = useState(true);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);

  const stopSharing = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsActive(false);
    setIsSyncing(false);
  };

  const captureAndTranslate = async () => {
    if (!videoRef.current || !isActive || isLoading) return;
    
    setIsSyncing(true);
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(videoRef.current, 0, 0);
    const base64Data = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];

    try {
      const result = await translateImage(base64Data, 'image/jpeg', targetLang, field);
      setLastResult(result);
      if (result?.translated?.trim()) {
        onSave({
          id: generateId(),
          sourceText: "Screen Stream Capture",
          translatedText: result.translated,
          sourceLang: "Screen",
          targetLang,
          field,
          timestamp: Date.now(),
          type: 'screen'
        });
      }
    } catch (err) {
      console.error("Screen translation cycle failed", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const startSharing = async () => {
    try {
      const stream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: { cursor: "always" },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setIsActive(true);

      stream.getTracks()[0].onended = () => {
        stopSharing();
      };

      intervalRef.current = window.setInterval(captureAndTranslate, syncInterval);
    } catch (err) {
      console.error("Error accessing display media", err);
    }
  };

  useEffect(() => {
    if (isActive && intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = window.setInterval(captureAndTranslate, syncInterval);
    }
  }, [syncInterval, isActive, targetLang]);

  useEffect(() => {
    return () => stopSharing();
  }, []);

  const handleCopy = () => {
    if (!lastResult) return;
    navigator.clipboard.writeText(lastResult.translated);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      <div className="flex items-center gap-3 px-2">
        <button onClick={() => setIsLeftExpanded(!isLeftExpanded)} className="p-2 bg-white border border-slate-200 text-slate-500 rounded-lg shadow-sm">
          {isLeftExpanded ? <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className="text-indigo-500"><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
        </button>
        <span className="text-[12px] font-black text-slate-700 uppercase tracking-widest">Neural Stream Sync</span>
      </div>
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 bg-slate-50 border border-slate-200 rounded-[2.5rem] shadow-inner">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Neural Screen Sync</h3>
          <div className="flex items-center gap-3 mt-1">
             <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Refresh Rate</span>
                <select 
                   value={syncInterval} 
                   onChange={(e) => setSyncInterval(Number(e.target.value))}
                   className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-100"
                >
                   <option value={2000}>2s (Real-time)</option>
                   <option value={5000}>5s (Standard)</option>
                   <option value={10000}>10s (Eco)</option>
                </select>
             </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <LanguageSelector value={targetLang} onChange={setTargetLang} className="w-[172px]" />
          <button 
            onClick={isActive ? stopSharing : startSharing}
            className={`px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-xl active:scale-95 flex items-center gap-2 ${isActive ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
          >
            {isActive ? (
              <><span className="w-2 h-2 rounded-full bg-white animate-pulse" /> Stop Sharing</>
            ) : (
              <><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> Start Sync</>
            )}
          </button>
        </div>
      </div>

      <div className="flex h-[500px] gap-6">
        <div className={`relative bg-slate-900 rounded-[2.5rem] overflow-hidden border-4 transition-all duration-500 ${isActive ? 'border-indigo-500 shadow-2xl' : 'border-slate-800 shadow-inner'} ${isLeftExpanded ? 'flex-1' : 'w-16'}`}>
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className={`w-full h-full object-contain ${isActive ? 'opacity-100' : 'opacity-20 grayscale'}`} 
          />
          {!isActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 gap-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              <p className="text-xs font-black uppercase tracking-widest text-center px-12 leading-relaxed">Neural stream offline. Select a window to initiate synaptic translation.</p>
            </div>
          )}
          {isActive && (
            <div className="absolute top-6 left-6 flex items-center gap-2">
               <div className="px-3 py-1 bg-indigo-600 text-white rounded-full text-[9px] font-black uppercase tracking-widest animate-pulse flex items-center gap-2 shadow-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  Live Feedback
               </div>
               {isSyncing && (
                  <div className="px-3 py-1 bg-emerald-500 text-white rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg animate-fadeIn">
                    <svg className="animate-spin w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={4}><circle cx="12" cy="12" r="10" opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
                    Capturing Frame
                  </div>
               )}
            </div>
          )}
        </div>

        <div className="flex flex-col bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden p-10 relative">
          <div className="flex items-center justify-between mb-8">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Synaptic Reconstruction</span>
            <div className="flex items-center gap-2">
              {isSyncing && <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />}
              {lastResult && (
                <button 
                  onClick={handleCopy}
                  className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${isCopied ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                  {isCopied ? 'Copied' : 'Copy'}
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
            {lastResult ? (
              <div className="space-y-6 animate-fadeIn">
                <p className="text-[19px] font-black text-slate-900 leading-tight italic tracking-tighter">"{lastResult.translated}"</p>
                <div className="flex flex-col gap-2 p-5 bg-slate-50 rounded-3xl border border-slate-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Neural Confidence</span>
                    <span className="text-[10px] font-black text-slate-900">{lastResult.confidence}%</span>
                  </div>
                  <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${lastResult.confidence}%` }} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-50 gap-4 text-center px-10">
                 <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                 <p className="text-sm font-bold uppercase tracking-widest">Waiting for visual data packets...</p>
              </div>
            )}
          </div>
          
          <div className="mt-8 pt-8 border-t border-slate-100">
            <div className="flex items-center gap-3 text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="text-[9px] font-bold uppercase tracking-widest leading-relaxed">Neural Screen Sync processes your visible workspace to ensure minimal latency while maximizing accuracy. Refresh rate can be adjusted for efficiency.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScreenTranslator;
