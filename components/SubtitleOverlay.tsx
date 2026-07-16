
import React, { useState, useEffect, useRef } from 'react';
import { connectLiveTranslation } from '../services/geminiService';
import { encodeBase64 } from '../services/audioUtils';
import LanguageSelector from './LanguageSelector';
import { ProfessionalField, LinguisticPersona, StyleGuide } from '../types';
import { Camera, Video, CircleStop, Settings, Maximize, Layout, Type } from 'lucide-react';

interface SubtitleOverlayProps {
  field: ProfessionalField;
  persona: LinguisticPersona;
  customStyleGuide?: string;
  styleGuides?: StyleGuide[];
}

const SubtitleOverlay: React.FC<SubtitleOverlayProps> = ({ field, persona, customStyleGuide, styleGuides = [] }) => {
  const [isLive, setIsLive] = useState(false);
  const [targetLang, setTargetLang] = useState('English');
  const [currentSubtitle, setCurrentSubtitle] = useState('');
  const [subtitleHistory, setSubtitleHistory] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [fontSize, setFontSize] = useState(24);
  const [opacity, setOpacity] = useState(0.8);
  const [position, setPosition] = useState<'bottom' | 'top'>('bottom');
  const [showLog, setShowLog] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sessionRef = useRef<any>(null);
  const inputContextRef = useRef<AudioContext | null>(null);

  const startSubtitleSession = async (file?: File) => {
    try {
      let stream: MediaStream;
      if (file) {
        // For files, we'd ideally want to play the video and capture audio
        // But for "Real-Time" with Gemini Live, we usually use the mic or a stream.
        // If it's a file, we'll just play it and use the mic to "hear" it, 
        // OR we can use captureStream() if supported.
        if (videoRef.current) {
          videoRef.current.src = URL.createObjectURL(file);
          videoRef.current.muted = false;
          stream = (videoRef.current as any).captureStream ? (videoRef.current as any).captureStream() : await navigator.mediaDevices.getUserMedia({ audio: true });
        } else {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }

      const inCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      inputContextRef.current = inCtx;

      const styleGuide = typeof persona === 'string' && persona.startsWith('Style: ') ? styleGuides.find(g => `Style: ${g.name}` === persona) : null;
      const finalPersona = styleGuide ? 'Custom Guide' : persona;
      const finalContext = styleGuide ? styleGuide.instructions : (customStyleGuide || '');

      const sessionPromise = connectLiveTranslation(
        {
          onopen: () => {
            setIsLive(true);
            const source = inCtx.createMediaStreamSource(stream);
            const scriptProcessor = inCtx.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const pcmData = encodeBase64(new Uint8Array(int16.buffer));
              
              sessionPromise.then((session: any) => {
                session.sendRealtimeInput({ 
                  audio: { data: pcmData, mimeType: 'audio/pcm;rate=16000' } 
                });
              });
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(inCtx.destination);
          },
          onmessage: (message: any) => {
            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              setCurrentSubtitle(text);
              setSubtitleHistory(prev => [...prev.slice(-5), text]);
            }
          },
          onerror: (e: any) => {
            console.error("Subtitle Link Error:", e);
            stopSubtitleSession();
          },
          onclose: () => stopSubtitleSession()
        },
        {
          responseModalities: ['AUDIO'],
          outputAudioTranscription: {},
          systemInstruction: `You are a real-time subtitle generator for ${field} content.
          Translate everything you hear into ${targetLang}.
          Persona: ${finalPersona}.
          ${finalContext ? `Style Guide: ${finalContext}` : ''}
          Output ONLY the translated text as transcription. No audio output is needed for this mode, but the API requires AUDIO modality.`
        }
      );

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error("Subtitle hardware link failed", err);
    }
  };

  const stopSubtitleSession = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    inputContextRef.current?.close();
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    if (videoRef.current?.src) {
      URL.revokeObjectURL(videoRef.current.src);
      videoRef.current.src = '';
    }
    setIsLive(false);
    setCurrentSubtitle('');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      startSubtitleSession(file);
    }
  };

  return (
    <div className="flex flex-col min-h-[600px] h-full bg-slate-950 rounded-[2.5rem] overflow-hidden relative group">
      {/* Video Feed */}
      <div className="flex-1 relative bg-black flex items-center justify-center">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          className="w-full h-full object-cover opacity-80"
        />
        
        {!isLive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 text-white/40">
            <div className="p-8 rounded-full bg-white/5 border border-white/10 animate-pulse">
              <Camera size={64} strokeWidth={1} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em]">Awaiting Visual Stream</p>
            <div className="flex gap-4">
              <button 
                onClick={() => startSubtitleSession()}
                className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all"
              >
                Use Camera
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 bg-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all border border-white/10"
              >
                Upload Video
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="video/*" />
            </div>
          </div>
        )}

        {/* Subtitle Overlay */}
        {isLive && currentSubtitle && (
          <div 
            className={`absolute left-0 right-0 px-12 py-8 flex justify-center transition-all duration-500 z-20 ${position === 'bottom' ? 'bottom-12' : 'top-12'}`}
          >
            <div 
              style={{ 
                fontSize: `${fontSize}px`, 
                backgroundColor: `rgba(0, 0, 0, ${opacity})` 
              }}
              className="max-w-4xl px-8 py-4 rounded-2xl border border-white/10 text-white font-bold text-center shadow-2xl backdrop-blur-md animate-slideUp"
            >
              {currentSubtitle}
            </div>
          </div>
        )}

        {/* Subtitle Log */}
        {showLog && (
          <div className="absolute right-8 top-24 bottom-24 w-64 bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-4 overflow-y-auto custom-scrollbar flex flex-col gap-3 z-10">
            <div className="flex items-center gap-2 mb-2 border-b border-white/10 pb-2">
              <Type size={12} className="text-indigo-400" />
              <span className="text-[9px] font-black uppercase tracking-widest text-white/60">Neural Log</span>
            </div>
            {subtitleHistory.map((s, i) => (
              <div key={i} className="p-3 bg-white/5 rounded-xl border border-white/5 text-[10px] text-white/80 font-medium leading-normal animate-fadeIn">
                {s}
              </div>
            ))}
          </div>
        )}

        {/* Status Indicators */}
        {isLive && (
          <div className="absolute top-8 left-8 flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-600 rounded-full animate-pulse">
              <div className="w-2 h-2 rounded-full bg-white" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white">Live Overlay</span>
            </div>
            <div className="px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/10">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/80">{targetLang}</span>
            </div>
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="p-4 bg-slate-900 border-t border-white/5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => isLive ? stopSubtitleSession() : startSubtitleSession()}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all ${isLive ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
          >
            {isLive ? <CircleStop size={14} /> : <Video size={14} />}
            {isLive ? 'Terminate' : 'Initialize Stream'}
          </button>

          <div className="w-px h-8 bg-white/10" />

          <div className="flex items-center gap-2">
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mr-1">Target</span>
            <LanguageSelector value={targetLang} onChange={setTargetLang} variant="dark" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowLog(!showLog)}
            className={`p-2.5 rounded-lg transition-all ${showLog ? 'bg-white/20 text-white' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}
            title="Toggle Neural Log"
          >
            <Type size={18} />
          </button>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2.5 rounded-lg transition-all ${showSettings ? 'bg-white/20 text-white' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}
          >
            <Settings size={18} />
          </button>
          <button className="p-2.5 rounded-lg bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all">
            <Maximize size={18} />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute bottom-24 right-6 w-72 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl animate-slideUp z-50">
          <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
            <Layout size={18} className="text-indigo-400" />
            <h4 className="text-[11px] font-black uppercase tracking-widest text-white">Overlay Config</h4>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Font Size</label>
                <span className="text-[10px] font-mono text-indigo-400">{fontSize}px</span>
              </div>
              <input 
                type="range" min="16" max="48" value={fontSize} 
                onChange={(e) => setFontSize(parseInt(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Background Opacity</label>
                <span className="text-[10px] font-mono text-indigo-400">{Math.round(opacity * 100)}%</span>
              </div>
              <input 
                type="range" min="0" max="1" step="0.1" value={opacity} 
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>

            <div className="space-y-3">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Position</label>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => setPosition('top')}
                  className={`py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${position === 'top' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                >
                  Top
                </button>
                <button 
                  onClick={() => setPosition('bottom')}
                  className={`py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${position === 'bottom' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                >
                  Bottom
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubtitleOverlay;
