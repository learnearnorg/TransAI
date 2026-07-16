
import React, { useState, useEffect, useRef } from 'react';
import { connectLiveTranslation } from '../services/geminiService';
import { encodeBase64, decodeBase64, decodeAudioData } from '../services/audioUtils';
import LanguageSelector from './LanguageSelector';
import { ProfessionalField } from '../types';
import { generateId } from '../utils/id';
import { Sparkles, Mic, CircleStop, Volume2, Radio, Video, VideoOff, Eye, Trash2 } from 'lucide-react';

const LiveVoiceTranslator: React.FC<{ field: ProfessionalField }> = ({ field }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'active'>('idle');
  const [transcriptions, setTranscriptions] = useState<{ role: 'user' | 'ai', text: string, id: string }[]>([]);
  const [targetLang, setTargetLang] = useState('English');
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRequestRef = useRef<number | null>(null);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcriptions]);

  const captureAndSendFrame = () => {
    if (!isCameraOn || !videoRef.current || !canvasRef.current || !sessionRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');

    if (context && video.readyState === video.HAVE_ENOUGH_DATA) {
      // Scale down for performance
      const scale = 0.5;
      canvas.width = video.videoWidth * scale;
      canvas.height = video.videoHeight * scale;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const base64Data = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
      
      if (sessionRef.current) {
        sessionRef.current.sendRealtimeInput({
          video: { data: base64Data, mimeType: 'image/jpeg' }
        });
      }
    }

    frameRequestRef.current = requestAnimationFrame(captureAndSendFrame);
  };

  const startSession = async () => {
    setStatus('connecting');
    setTranscriptions([]);
    nextStartTimeRef.current = 0;

    try {
      // Input at 16k, Output at 24k as per Gemini Live API standards
      const outCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const inCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = outCtx;
      inputContextRef.current = inCtx;

      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      let videoStream: MediaStream | null = null;
      if (isCameraOn) {
        videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = videoStream;
        }
      }

      const sessionPromise = connectLiveTranslation(
        {
          onopen: () => {
            setStatus('active');
            setIsRecording(true);
            const source = inCtx.createMediaStreamSource(audioStream);
            const scriptProcessor = inCtx.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              // PCM Conversion
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

            if (isCameraOn) {
              frameRequestRef.current = requestAnimationFrame(captureAndSendFrame);
            }
          },
          onmessage: async (message: any) => {
            // Handle Transcriptions
            if (message.serverContent?.outputAudioTranscription) {
              setTranscriptions(prev => [...prev.slice(-10), { role: 'ai', text: message.serverContent.outputAudioTranscription.text, id: generateId() }]);
            }
            if (message.serverContent?.inputAudioTranscription) {
              setTranscriptions(prev => [...prev.slice(-10), { role: 'user', text: message.serverContent.inputAudioTranscription.text, id: generateId() }]);
            }

            // Handle Gapless Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && audioContextRef.current) {
              const ctx = audioContextRef.current;
              
              // Tracking cursor for gapless scheduling
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

            // Handle Interruption
            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => {
                try { s.stop(); } catch(e) {}
              });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e: any) => {
            console.error("Neural Voice Link Error:", e);
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
          systemInstruction: `You are a world-class ${field} simultaneous interpreter with multimodal vision capabilities. 
          Context: Professional ${field} environment. 
          Task: Listen to input audio and watch the video feed (if available). Respond IMMEDIATELY in ${targetLang}. 
          Style: Maintain the persona of a highly accurate, professional human interpreter. 
          Visual Context: Use the visual information from the camera feed to improve translation accuracy, identify objects, or understand non-verbal cues.
          Output: ONLY provide the translation audio response.`
        }
      );

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error("Voice synthesis hardware link failed", err);
      setStatus('idle');
    }
  };

  const stopSession = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    if (frameRequestRef.current) {
      cancelAnimationFrame(frameRequestRef.current);
      frameRequestRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    inputContextRef.current?.close();
    audioContextRef.current?.close();
    setIsRecording(false);
    setStatus('idle');
  };

  useEffect(() => {
    return () => stopSession();
  }, []);

  const toggleCamera = () => {
    if (isRecording) {
      // If already recording, we can't easily toggle camera without restarting session in this simple implementation
      // But we can stop/start the frame capture
      if (isCameraOn) {
        if (frameRequestRef.current) cancelAnimationFrame(frameRequestRef.current);
        if (videoRef.current && videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
          videoRef.current.srcObject = null;
        }
      } else {
        navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            frameRequestRef.current = requestAnimationFrame(captureAndSendFrame);
          }
        });
      }
    }
    setIsCameraOn(!isCameraOn);
  };

  return (
    <div className="flex flex-col items-center gap-8 py-4">
      {/* Session Metadata Controls */}
      <div className="w-full max-w-2xl flex flex-col gap-4 bg-slate-50 p-6 rounded-[3rem] border border-slate-200 shadow-inner">
        <div className="flex items-center justify-between gap-6">
          <div className="flex-1 flex flex-col gap-2">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Input Sources</span>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-2xl text-slate-500 cursor-default shadow-sm group">
                <Radio size={14} className={isRecording ? "text-rose-500 animate-pulse" : "text-indigo-500"} />
                <span className="text-[10px] font-black uppercase tracking-widest">Audio Link</span>
              </div>
              <button 
                onClick={toggleCamera}
                className={`flex items-center gap-3 px-4 py-3 border rounded-2xl transition-all shadow-sm ${isCameraOn ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300'}`}
              >
                {isCameraOn ? <Video size={14} /> : <VideoOff size={14} />}
                <span className="text-[10px] font-black uppercase tracking-widest">{isCameraOn ? 'Vision Active' : 'Vision Off'}</span>
              </button>
            </div>
          </div>
          
          <div className="flex-1 flex flex-col gap-2">
            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] ml-1">Target Persona</span>
            <LanguageSelector value={targetLang} onChange={setTargetLang} variant="light" className="w-full" />
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row items-center gap-12 w-full max-w-6xl px-4">
        {/* Primary Interaction Node */}
        <div className="flex flex-col items-center gap-8">
          <div className="relative group">
            <div className={`w-56 h-56 rounded-full flex items-center justify-center transition-all duration-700 shadow-[0_40px_100px_-20px_rgba(79,70,229,0.4)] ${isRecording ? 'bg-indigo-600' : 'bg-white border-2 border-slate-100 hover:border-indigo-200'}`}>
              {isRecording && (
                <>
                  <div className="absolute inset-0 rounded-full border-2 border-indigo-400 animate-ping opacity-40"></div>
                  <div className="absolute inset-[-12px] rounded-full border border-indigo-500/20 animate-pulse"></div>
                </>
              )}
              <button 
                onClick={isRecording ? stopSession : startSession} 
                disabled={status === 'connecting'} 
                className={`w-48 h-48 rounded-full flex flex-col items-center justify-center transition-all active:scale-90 disabled:opacity-50 shadow-inner ${isRecording ? 'text-white' : 'text-slate-300 hover:text-indigo-500'}`}
              >
                {status === 'connecting' ? (
                  <div className="w-14 h-14 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <div className={`p-5 rounded-3xl transition-colors ${isRecording ? 'bg-white/20' : 'bg-slate-50 group-hover:bg-indigo-50'}`}>
                      {isRecording ? <CircleStop size={48} strokeWidth={2.5} /> : <Mic size={48} strokeWidth={1.5} />}
                    </div>
                    <span className={`mt-4 font-black uppercase tracking-[0.3em] text-[11px] ${isRecording ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600'}`}>
                      {isRecording ? 'Terminate' : 'Initialize'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          {isCameraOn && (
            <div className="relative w-64 h-48 bg-black rounded-3xl overflow-hidden border-4 border-white shadow-2xl group">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute top-3 left-3 flex items-center gap-2 px-2 py-1 bg-black/50 rounded-lg backdrop-blur-md">
                <Eye size={10} className="text-indigo-400" />
                <span className="text-[8px] font-black text-white uppercase tracking-widest">Neural Vision</span>
              </div>
            </div>
          )}
        </div>

        {/* Neural Transcripts */}
        <div className="flex-1 w-full flex flex-col gap-4 min-h-[400px] max-h-[500px] bg-white/50 rounded-[3rem] border border-slate-100/50 shadow-xl overflow-hidden">
          <div className="px-8 py-4 border-b border-slate-100/50 flex items-center justify-between bg-white/30 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <Volume2 size={14} className="text-indigo-500" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Neural Transcripts</span>
            </div>
            {transcriptions.length > 0 && (
              <button 
                onClick={() => setTranscriptions([])}
                className="p-2 hover:bg-rose-50 rounded-xl text-rose-500 transition-all active:scale-90 group"
                title="Clear Transcripts"
              >
                <Trash2 size={14} className="group-hover:scale-110 transition-transform" />
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar flex flex-col gap-4">
            {transcriptions.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-slate-300 italic opacity-40">
              <Volume2 size={32} strokeWidth={1} />
              <p className="mt-2 text-[10px] font-black uppercase tracking-widest">{isRecording ? 'Listening for Neural Waves...' : 'Awaiting Audio Cycle'}</p>
            </div>
          )}
          {transcriptions.map((t) => {
            const isAI = t.role === 'ai';
            return (
              <div 
                key={t.id} 
                className={`p-5 rounded-[2rem] text-[13px] font-bold shadow-xl transition-all animate-fadeIn border-2 ${
                  isAI 
                    ? 'bg-indigo-600 self-start text-white border-indigo-500 shadow-indigo-900/10 max-w-[85%] rounded-tl-none' 
                    : 'bg-white self-end text-slate-700 border-slate-100 shadow-slate-900/5 max-w-[85%] rounded-tr-none'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5 opacity-60">
                  {isAI ? <Sparkles size={10} /> : <Mic size={10} />}
                  <span className="text-[8px] font-black uppercase tracking-widest">{isAI ? 'Neural Synthesis' : 'Voice Input'}</span>
                </div>
                <p className="leading-relaxed tracking-tight">{t.text}</p>
              </div>
            );
          })}
          <div ref={transcriptEndRef} />
        </div>
      </div>
    </div>

      <div className="mt-6 flex items-center gap-3 text-slate-400">
         <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
         <p className="text-[9px] font-black uppercase tracking-widest leading-relaxed">
           End-to-End Latency: Ultra-Low | Multimodal Vision Core v3.1 Active
         </p>
      </div>
    </div>
  );
};

export default LiveVoiceTranslator;
