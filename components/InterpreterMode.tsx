
import React, { useState, useEffect, useRef } from 'react';
import { connectLiveTranslation } from '../services/geminiService';
import { encodeBase64, decodeBase64, decodeAudioData } from '../services/audioUtils';
import LanguageSelector from './LanguageSelector';
import { ProfessionalField } from '../types';
import { generateId } from '../utils/id';
import { Sparkles, Mic, CircleStop, Volume2, Radio, Users, Download, Trash2, ArrowRightLeft } from 'lucide-react';
import { saveAs } from 'file-saver';

interface TranscriptEntry {
  id: string;
  speaker: 'A' | 'B' | 'AI';
  text: string;
  timestamp: number;
}

const InterpreterMode: React.FC<{ field: ProfessionalField }> = ({ field }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'active'>('idle');
  const [langA, setLangA] = useState('English');
  const [langB, setLangB] = useState('Spanish');
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  const startSession = async () => {
    setStatus('connecting');
    nextStartTimeRef.current = 0;

    try {
      const outCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const inCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = outCtx;
      inputContextRef.current = inCtx;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const sessionPromise = connectLiveTranslation(
        {
          onopen: () => {
            setStatus('active');
            setIsRecording(true);
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
                  audio: { 
                    data: pcmData, 
                    mimeType: 'audio/pcm;rate=16000' 
                  } 
                });
              });
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(inCtx.destination);
          },
          onmessage: async (message: any) => {
            // Handle Transcriptions
            if (message.serverContent?.outputTranscription) {
              setTranscripts(prev => [...prev, { 
                id: generateId(), 
                speaker: 'AI', 
                text: message.serverContent.outputTranscription.text, 
                timestamp: Date.now() 
              }]);
            }
            if (message.serverContent?.inputTranscription) {
              setTranscripts(prev => [...prev, { 
                id: generateId(), 
                speaker: 'A', // For simplicity, we assume A is the primary speaker or we let AI decide
                text: message.serverContent.inputTranscription.text, 
                timestamp: Date.now() 
              }]);
            }

            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && audioContextRef.current) {
              const ctx = audioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const audioBuffer = await decodeAudioData(decodeBase64(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e: any) => {
            console.error("Interpreter Link Error:", e);
            stopSession();
          },
          onclose: () => stopSession()
        },
        {
          responseModalities: ['AUDIO'],
          outputAudioTranscription: {},
          inputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
          },
          systemInstruction: `You are a world-class bilingual ${field} interpreter between ${langA} and ${langB}.
          
          RULES:
          1. If you hear ${langA}, translate it to ${langB} and speak it.
          2. If you hear ${langB}, translate it to ${langA} and speak it.
          3. Maintain a professional, neutral, and accurate tone.
          4. Do NOT add any personal commentary. ONLY provide the translation.
          5. If the input is ambiguous, provide the most likely professional translation.
          
          Context: Professional ${field} dialogue.`
        }
      );

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error("Interpreter hardware link failed", err);
      setStatus('idle');
    }
  };

  const stopSession = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    inputContextRef.current?.close();
    audioContextRef.current?.close();
    setIsRecording(false);
    setStatus('idle');
  };

  const exportTranscript = () => {
    const content = transcripts.map(t => `[${new Date(t.timestamp).toLocaleTimeString()}] ${t.speaker}: ${t.text}`).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    saveAs(blob, `interpreter_transcript_${Date.now()}.txt`);
  };

  const clearTranscript = () => {
    setTranscripts([]);
  };

  return (
    <div className="flex flex-col gap-8 animate-fadeIn">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
          <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg">
            <Users size={24} />
          </div>
          Bilingual Interpreter Mode
        </h2>
        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Zero-Latency Voice-to-Voice Synthesis</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Person A Panel */}
        <div className="bg-white border-2 border-slate-100 rounded-[3rem] p-10 flex flex-col items-center gap-6 shadow-sm hover:shadow-xl transition-all group">
          <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
            <span className="text-2xl font-black">A</span>
          </div>
          <div className="w-full space-y-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block text-center">Speaker A Language</span>
            <LanguageSelector value={langA} onChange={setLangA} variant="light" className="w-full" />
          </div>
          <div className={`w-full p-6 rounded-3xl border-2 transition-all ${isRecording ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-50 border-slate-100'}`}>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Live Detection</p>
            <div className="h-12 flex items-center justify-center">
              {isRecording ? (
                <div className="flex items-center gap-1">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="w-1 bg-indigo-500 rounded-full animate-pulse" style={{ height: `${Math.random() * 100}%`, animationDelay: `${i * 0.1}s` }} />
                  ))}
                </div>
              ) : (
                <span className="text-xs font-bold text-slate-300 uppercase">Awaiting Input...</span>
              )}
            </div>
          </div>
        </div>

        {/* Person B Panel */}
        <div className="bg-white border-2 border-slate-100 rounded-[3rem] p-10 flex flex-col items-center gap-6 shadow-sm hover:shadow-xl transition-all group">
          <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-400 group-hover:bg-rose-50 group-hover:text-rose-600 transition-all">
            <span className="text-2xl font-black">B</span>
          </div>
          <div className="w-full space-y-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block text-center">Speaker B Language</span>
            <LanguageSelector value={langB} onChange={setLangB} variant="light" className="w-full" />
          </div>
          <div className={`w-full p-6 rounded-3xl border-2 transition-all ${isRecording ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'}`}>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Live Detection</p>
            <div className="h-12 flex items-center justify-center">
              {isRecording ? (
                <div className="flex items-center gap-1">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="w-1 bg-rose-500 rounded-full animate-pulse" style={{ height: `${Math.random() * 100}%`, animationDelay: `${i * 0.1}s` }} />
                  ))}
                </div>
              ) : (
                <span className="text-xs font-bold text-slate-300 uppercase">Awaiting Input...</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Global Controls */}
      <div className="flex flex-col items-center gap-6">
        <button 
          onClick={isRecording ? stopSession : startSession}
          disabled={status === 'connecting'}
          className={`w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-90 disabled:opacity-50 ${isRecording ? 'bg-rose-600 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
        >
          {status === 'connecting' ? (
            <Loader2 className="w-10 h-10 animate-spin" />
          ) : isRecording ? (
            <CircleStop size={40} strokeWidth={2.5} />
          ) : (
            <Mic size={40} strokeWidth={2.5} />
          )}
        </button>
        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">
          {isRecording ? 'Session Active' : 'Initialize Neural Link'}
        </span>
      </div>

      {/* Transcript Area */}
      <div className="bg-slate-900 rounded-[3rem] p-10 shadow-2xl space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-2xl text-indigo-400">
              <Radio size={20} className={isRecording ? "animate-pulse" : ""} />
            </div>
            <div>
              <h3 className="text-[12px] font-black text-white uppercase tracking-widest">Neural Transcript</h3>
              <p className="text-[9px] font-bold text-slate-500 uppercase">Real-time bilingual log</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={exportTranscript}
              disabled={transcripts.length === 0}
              className="px-6 py-2.5 bg-white/10 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-white/20 transition-all disabled:opacity-30 flex items-center gap-2"
            >
              <Download size={14} /> Export
            </button>
            <button 
              onClick={clearTranscript}
              disabled={transcripts.length === 0}
              className="px-6 py-2.5 bg-white/5 text-slate-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-500/20 hover:text-rose-400 transition-all disabled:opacity-30 flex items-center gap-2"
            >
              <Trash2 size={14} /> Clear
            </button>
          </div>
        </div>

        <div className="min-h-[400px] max-h-[600px] overflow-y-auto custom-scrollbar space-y-6 pr-4">
          {transcripts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center py-20 text-slate-600 italic gap-4">
              <Volume2 size={48} strokeWidth={1} />
              <p className="text-[10px] font-black uppercase tracking-[0.3em]">Awaiting Synaptic Exchange</p>
            </div>
          ) : (
            transcripts.map((t) => (
              <div key={t.id} className={`flex flex-col gap-2 animate-fadeIn ${t.speaker === 'A' ? 'items-start' : t.speaker === 'B' ? 'items-end' : 'items-center'}`}>
                <div className={`max-w-[80%] p-6 rounded-[2rem] shadow-xl border-2 ${
                  t.speaker === 'A' ? 'bg-indigo-600 border-indigo-500 text-white rounded-tl-none' :
                  t.speaker === 'B' ? 'bg-rose-600 border-rose-500 text-white rounded-tr-none' :
                  'bg-white border-slate-100 text-slate-900'
                }`}>
                  <div className="flex items-center gap-2 mb-2 opacity-60">
                    <span className="text-[8px] font-black uppercase tracking-widest">
                      {t.speaker === 'AI' ? 'Neural Synthesis' : `Speaker ${t.speaker}`}
                    </span>
                    <span className="text-[8px] font-bold">• {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  </div>
                  <p className="text-[14px] font-bold leading-relaxed tracking-tight">{t.text}</p>
                </div>
              </div>
            ))
          )}
          <div ref={transcriptEndRef} />
        </div>
      </div>
    </div>
  );
};

const Loader2 = ({ className, size = 24 }: { className?: string; size?: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

export default InterpreterMode;
