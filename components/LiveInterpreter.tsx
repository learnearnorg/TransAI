import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Globe, Activity, Volume2, StopCircle, Loader2, Fish } from 'lucide-react';
import { GoogleGenAI } from '../services/geminiService';
import { MODELS } from '../constants';
import { getApiKey } from '../services/geminiService';

interface LiveInterpreterProps {
  sourceLang: string;
  targetLang: string;
}

const LiveInterpreter: React.FC<LiveInterpreterProps> = ({ sourceLang, targetLang }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<{ text: string; isUser: boolean }[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Aoede'>('Aoede');
  
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const playbackQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);

  // Initialize AudioContext
  useEffect(() => {
    const initAudio = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: 16000,
        });
      }
    };
    
    // Need user interaction to start AudioContext, so we do it on connect
    return () => {
      if (audioContextRef.current?.state !== 'closed') {
        audioContextRef.current?.close();
      }
    };
  }, []);

  const playNextAudio = () => {
    if (!audioContextRef.current || playbackQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      return;
    }

    isPlayingRef.current = true;
    const audioData = playbackQueueRef.current.shift()!;
    
    const audioBuffer = audioContextRef.current.createBuffer(1, audioData.length, 24000);
    audioBuffer.getChannelData(0).set(audioData);

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);
    source.onended = () => {
      playNextAudio();
    };
    source.start();
  };

  const handleConnect = async () => {
    if (!getApiKey()) {
      setError('API Key is missing.');
      return;
    }

    try {
      setIsConnecting(true);
      setError(null);
      setTranscripts([]);

      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: 16000,
        });
      }

      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
        } 
      });
      mediaStreamRef.current = stream;

      const ai = new (GoogleGenAI as any)({ apiKey: getApiKey() });

      const sessionPromise = ai.live.connect({
        model: MODELS.LIVE,
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } },
          },
          systemInstruction: `You are a universal translator that lives in the user's ear. You provide instant, seamless, and highly accurate real-time voice translation between ${sourceLang} and ${targetLang}. Speak the translation clearly and naturally, conveying the original tone and emotion. Do not add any extra commentary, just provide the translation as if you are the speaker.`,
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            setIsConnecting(false);

            // Start recording
            sourceRef.current = audioContextRef.current!.createMediaStreamSource(stream);
            processorRef.current = audioContextRef.current!.createScriptProcessor(4096, 1, 1);

            processorRef.current.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              // Convert Float32Array to Int16Array
              const pcmData = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                pcmData[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
              }
              
              // Convert to base64
              const buffer = new ArrayBuffer(pcmData.length * 2);
              const view = new DataView(buffer);
              for (let i = 0; i < pcmData.length; i++) {
                view.setInt16(i * 2, pcmData[i], true);
              }
              
              let binary = '';
              const bytes = new Uint8Array(buffer);
              for (let i = 0; i < bytes.length; i++) {
                binary += String.fromCharCode(bytes[i]);
              }
              const base64Data = btoa(binary);

              sessionPromise.then((session) => {
                session.sendRealtimeInput({
                  audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
                });
              });
            };

            sourceRef.current.connect(processorRef.current);
            processorRef.current.connect(audioContextRef.current!.destination);
          },
          onmessage: async (message: any) => {
            // Handle audio output
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              const binaryString = atob(base64Audio);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              
              // Convert Int16 to Float32 for playback
              const int16Array = new Int16Array(bytes.buffer);
              const float32Array = new Float32Array(int16Array.length);
              for (let i = 0; i < int16Array.length; i++) {
                float32Array[i] = int16Array[i] / 32768.0;
              }

              playbackQueueRef.current.push(float32Array);
              if (!isPlayingRef.current) {
                playNextAudio();
              }
            }

            // Handle interruption
            if (message.serverContent?.interrupted) {
              playbackQueueRef.current = [];
              isPlayingRef.current = false;
            }

            // Handle transcription
            const modelTranscription = message.serverContent?.modelTurn?.parts[0]?.text;
            if (modelTranscription) {
              setTranscripts(prev => [...prev, { text: modelTranscription, isUser: false }]);
            }
          },
          onerror: (err) => {
            console.error("Live API Error:", err);
            setError("Connection error occurred.");
            handleDisconnect();
          },
          onclose: () => {
            handleDisconnect();
          }
        }
      });

      sessionRef.current = sessionPromise;

    } catch (err: any) {
      console.error("Failed to connect:", err);
      setError(err.message || "Failed to start live interpretation.");
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    if (processorRef.current && sourceRef.current) {
      sourceRef.current.disconnect();
      processorRef.current.disconnect();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (sessionRef.current) {
      sessionRef.current.then((session: any) => session.close()).catch(console.error);
    }
    setIsConnected(false);
    setIsConnecting(false);
    playbackQueueRef.current = [];
    isPlayingRef.current = false;
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-8 bg-white border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-teal-500 rounded-2xl shadow-lg shadow-teal-200">
            <Mic className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Live Interpreter</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
              Real-Time Voice Translation
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Voice:</span>
            <select
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value as any)}
              disabled={isConnected}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg px-3 py-1.5 outline-none focus:border-teal-400 disabled:opacity-50"
            >
              <option value="Aoede">Aoede</option>
              <option value="Charon">Charon</option>
              <option value="Fenrir">Fenrir</option>
              <option value="Kore">Kore</option>
              <option value="Puck">Puck</option>
            </select>
          </div>
          <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
            <span className="text-xs font-black text-slate-600 uppercase tracking-widest">{sourceLang}</span>
            <Globe size={14} className="text-teal-400" />
            <span className="text-xs font-black text-slate-600 uppercase tracking-widest">{targetLang}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 flex flex-col items-center justify-center gap-8 relative overflow-hidden">
        {/* Animated Background Rings when connected */}
        {isConnected && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
            <div className="w-64 h-64 border-2 border-teal-400 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
            <div className="w-96 h-96 border-2 border-emerald-400 rounded-full animate-ping absolute" style={{ animationDuration: '4s' }} />
          </div>
        )}

        <div className="text-center z-10 max-w-md">
          <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest mb-2">
            {isConnected ? 'Listening & Translating...' : 'Ready to Interpret'}
          </h3>
          <p className="text-sm font-medium text-slate-500 leading-relaxed">
            {isConnected 
              ? `Speak naturally in either ${sourceLang} or ${targetLang}. The AI will instantly translate and speak the result.`
              : 'Click the button below to start the real-time interpretation session.'}
          </p>
        </div>

        {/* Big Control Button */}
        <button
          onClick={isConnected ? handleDisconnect : handleConnect}
          disabled={isConnecting}
          className={`relative z-10 group flex items-center justify-center w-32 h-32 rounded-full transition-all duration-500 shadow-2xl ${
            isConnected 
              ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/30' 
              : 'bg-teal-500 hover:bg-teal-600 shadow-teal-500/30 hover:scale-105'
          } disabled:opacity-50 disabled:hover:scale-100`}
        >
          {isConnecting ? (
            <Loader2 size={40} className="text-white animate-spin" />
          ) : isConnected ? (
            <StopCircle size={48} className="text-white" />
          ) : (
            <Mic size={48} className="text-white" />
          )}
          
          {/* Pulse effect when listening */}
          {isConnected && (
            <div className="absolute inset-0 rounded-full border-4 border-rose-400 animate-ping opacity-50" />
          )}
        </button>

        {error && (
          <div className="z-10 bg-rose-50 text-rose-600 px-4 py-3 rounded-xl border border-rose-100 text-sm font-bold flex items-center gap-2 animate-fadeIn">
            <Activity size={16} />
            {error}
          </div>
        )}
      </div>

      {/* Transcripts Panel */}
      <div className="h-64 bg-white border-t border-slate-100 p-6 flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <Volume2 size={16} className="text-teal-500" />
          <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Live Transcription</h4>
        </div>
        <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-4">
          {transcripts.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">
              Transcriptions will appear here...
            </div>
          ) : (
            transcripts.map((t, i) => (
              <div key={i} className={`flex ${t.isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-4 rounded-2xl ${
                  t.isUser 
                    ? 'bg-teal-50 border border-teal-100 text-teal-900 rounded-br-sm' 
                    : 'bg-slate-50 border border-slate-100 text-slate-800 rounded-bl-sm'
                }`}>
                  <p className="text-sm font-medium leading-relaxed">{t.text}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveInterpreter;
