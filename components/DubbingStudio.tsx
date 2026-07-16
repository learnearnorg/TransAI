
import React, { useState, useRef, useEffect } from 'react';
import { Mic, Upload, Play, Download, Loader2, Check, Music, Volume2, Languages, Sparkles, Zap, Video, AlertCircle, Key } from 'lucide-react';
import { transcribeAudio } from '../services/transcriptionService';
import { translateText, generateDubbedAudio, generateLipSyncVideo, analyzeVoiceCharacteristics } from '../services/geminiService';
import { ProfessionalField, TranslationHistoryItem, LinguisticPersona, StyleGuide } from '../types';
import { generateId } from '../utils/id';
import { decodeBase64, createWavFile } from '../services/audioUtils';

// Extend window for AI Studio API
declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

interface DubbingStudioProps {
  onSave: (item: TranslationHistoryItem) => void;
  targetLang: string;
  field: ProfessionalField;
  persona: LinguisticPersona;
  customStyleGuide?: string;
  styleGuides?: StyleGuide[];
}

const DubbingStudio: React.FC<DubbingStudioProps> = ({ onSave, targetLang, field, persona, customStyleGuide, styleGuides = [] }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'upload' | 'transcribing' | 'cloning' | 'translating' | 'dubbing' | 'lipsync' | 'complete'>('upload');
  const [voiceProfile, setVoiceProfile] = useState<{ pitch: string; tone: string; gender: string; emotion: string; accent: string; technicalSpecs: string } | null>(null);
  const [transcription, setTranscription] = useState('');
  const [translation, setTranslation] = useState('');
  const [dubbedAudioUrl, setDubbedAudioUrl] = useState<string | null>(null);
  const [dubbedVideoUrl, setDubbedVideoUrl] = useState<string | null>(null);
  const [sourceAudioBase64, setSourceAudioBase64] = useState<string | null>(null);
  const [sourceFrameBase64, setSourceFrameBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState('');
  const [fileType, setFileType] = useState<'audio' | 'video'>('audio');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isLipsyncEnabled, setIsLipsyncEnabled] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      }
    };
    checkKey();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setMimeType(selectedFile.type);
      const isVideo = selectedFile.type.startsWith('video/');
      setFileType(isVideo ? 'video' : 'audio');
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = (event.target?.result as string).split(',')[1];
        if (!isVideo) {
          setSourceAudioBase64(base64);
        }
      };
      reader.readAsDataURL(selectedFile);

      if (isVideo) {
        const videoUrl = URL.createObjectURL(selectedFile);
        const video = document.createElement('video');
        video.src = videoUrl;
        video.onloadeddata = () => {
          video.currentTime = 1; // Capture frame at 1s
        };
        video.onseeked = () => {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(video, 0, 0);
          const frameBase64 = canvas.toDataURL('image/jpeg').split(',')[1];
          setSourceFrameBase64(frameBase64);
          URL.revokeObjectURL(videoUrl);
        };
      }
    }
  };

  const handleOpenKeyDialog = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  const runDubbingCycle = async () => {
    if (!file) return;

    setIsProcessing(true);
    try {
      // Step 1: Transcribe
      setStep('transcribing');
      let audioBase64 = sourceAudioBase64;
      
      // If video, we need to extract audio or just send the video file if the service supports it
      // For simplicity, we assume the transcription service can handle the video file's audio track
      if (fileType === 'video' && !audioBase64) {
        const reader = new FileReader();
        audioBase64 = await new Promise((resolve) => {
          reader.onload = (e) => resolve((e.target?.result as string).split(',')[1]);
          reader.readAsDataURL(file);
        });
      }

      if (!audioBase64) throw new Error("Could not extract audio source");

      const text = await transcribeAudio(audioBase64, mimeType, 'Auto');
      setTranscription(text);

      // Step 2: Voice Cloning (Analysis)
      setStep('cloning');
      const profile = await analyzeVoiceCharacteristics(audioBase64, mimeType);
      setVoiceProfile(profile);

      // Step 3: Translate
      setStep('translating');
      const styleGuide = typeof persona === 'string' && persona.startsWith('Style: ') ? styleGuides.find(g => `Style: ${g.name}` === persona) : null;
      const finalPersona = styleGuide ? 'Custom Guide' : persona;
      const finalContext = styleGuide ? styleGuide.instructions : (customStyleGuide || '');
      const customInstructions = styleGuide ? styleGuide.instructions : '';

      const result = await translateText(text, 'Auto', targetLang, field, [], 'Standard', finalContext, finalPersona, [], customInstructions);
      setTranslation(result.text);

      // Step 3: Dub
      setStep('dubbing');
      const dubbedBase64 = await generateDubbedAudio(result.text, audioBase64, mimeType, targetLang);
      
      if (dubbedBase64) {
        const pcmData = decodeBase64(dubbedBase64);
        const blob = createWavFile(pcmData, 24000, 1);
        const url = URL.createObjectURL(blob);
        setDubbedAudioUrl(url);
      }

      // Step 4: Lip-Sync (if video and enabled)
      if (fileType === 'video' && isLipsyncEnabled && sourceFrameBase64) {
        setStep('lipsync');
        if (!hasApiKey) {
          throw new Error("API Key required for Neural Lip-Sync. Please select a key in the settings.");
        }
        const videoBase64 = await generateLipSyncVideo(result.text, sourceFrameBase64, 'image/jpeg');
        if (videoBase64) {
          const videoBlob = new Blob([decodeBase64(videoBase64)], { type: 'video/mp4' });
          const videoUrl = URL.createObjectURL(videoBlob);
          setDubbedVideoUrl(videoUrl);
        }
      }

      onSave({
        id: generateId(),
        sourceText: text,
        translatedText: result.text,
        sourceLang: 'Auto',
        targetLang,
        field,
        persona,
        timestamp: Date.now(),
        type: 'dubbing'
      });

      setStep('complete');
    } catch (err: any) {
      console.error("Dubbing cycle failed", err);
      alert(err.message || "Neural dubbing cycle failed. Please check your connection.");
      setStep('upload');
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setTranscription('');
    setTranslation('');
    setDubbedAudioUrl(null);
    setDubbedVideoUrl(null);
    setSourceAudioBase64(null);
    setSourceFrameBase64(null);
    setVoiceProfile(null);
    setStep('upload');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
          <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg">
            <Music size={24} />
          </div>
          Neural Dubbing Studio
        </h2>
        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Voice-Cloned Synthesis & Lip-Sync Localization</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Control Panel */}
        <div className="bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl border border-slate-800 space-y-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
          
          <div className="space-y-6 relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">Hardware Status</span>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{isProcessing ? 'Processing' : 'Ready'}</span>
              </div>
            </div>

            {step === 'upload' ? (
              <div className="space-y-4">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-video border-2 border-dashed border-slate-700 rounded-3xl flex flex-col items-center justify-center gap-4 hover:border-indigo-500 hover:bg-slate-800/50 transition-all cursor-pointer group"
                >
                  <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-500 group-hover:text-indigo-400 group-hover:scale-110 transition-all">
                    <Upload size={32} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-black text-white uppercase tracking-widest">Upload Media Source</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">MP4, MP3, WAV (Max 20MB)</p>
                  </div>
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="audio/*,video/*" />
                </div>

                {fileType === 'video' && (
                  <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-500/20 text-amber-500 rounded-lg">
                        <Video size={16} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-white uppercase tracking-widest">Neural Lip-Sync</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase">Generate matching video frames</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsLipsyncEnabled(!isLipsyncEnabled)}
                      className={`w-10 h-5 rounded-full transition-all relative ${isLipsyncEnabled ? 'bg-indigo-600' : 'bg-slate-700'}`}
                    >
                      <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${isLipsyncEnabled ? 'left-6' : 'left-1'}`} />
                    </button>
                  </div>
                )}

                {isLipsyncEnabled && !hasApiKey && (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3">
                    <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-1">API Key Required</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase leading-relaxed mb-2">Veo video generation requires a paid Google Cloud project API key.</p>
                      <button 
                        onClick={handleOpenKeyDialog}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all"
                      >
                        <Key size={10} />
                        Select API Key
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="aspect-video bg-slate-800/50 rounded-3xl p-6 flex flex-col justify-center gap-6 border border-slate-700">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                    {fileType === 'video' ? <Video size={24} /> : <Music size={24} />}
                  </div>
                  <div>
                    <p className="text-xs font-black text-white uppercase truncate max-w-[200px]">{file?.name}</p>
                    <p className="text-[9px] font-bold text-slate-500 uppercase">{(file!.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Neural Progress</span>
                    <span className="text-[9px] font-black text-white uppercase">{step === 'complete' ? '100%' : 'Syncing...'}</span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 transition-all duration-1000" 
                      style={{ width: 
                        step === 'transcribing' ? '15%' : 
                        step === 'cloning' ? '30%' :
                        step === 'translating' ? '45%' : 
                        step === 'dubbing' ? '60%' : 
                        step === 'lipsync' ? '80%' :
                        step === 'complete' ? '100%' : '0%' 
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[7px] font-black text-slate-500 uppercase tracking-tighter">
                    <span className={step === 'transcribing' ? 'text-indigo-400' : ''}>Transcribe</span>
                    <span className={step === 'cloning' ? 'text-indigo-400' : ''}>Clone</span>
                    <span className={step === 'translating' ? 'text-indigo-400' : ''}>Translate</span>
                    <span className={step === 'dubbing' ? 'text-indigo-400' : ''}>Dub</span>
                    {isLipsyncEnabled && <span className={step === 'lipsync' ? 'text-indigo-400' : ''}>Lip-Sync</span>}
                    <span className={step === 'complete' ? 'text-indigo-400' : ''}>Complete</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-4">
              {step === 'upload' ? (
                <button 
                  onClick={runDubbingCycle}
                  disabled={!file || isProcessing || (isLipsyncEnabled && !hasApiKey)}
                  className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} fill="currentColor" />}
                  Initialize {isLipsyncEnabled ? 'Lip-Sync' : 'Dubbing'}
                </button>
              ) : (
                <button 
                  onClick={reset}
                  className="flex-1 py-4 bg-slate-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-slate-700 transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                  Reset Studio
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Output Panel */}
        <div className="space-y-6">
          <div className="bg-white border-2 border-slate-200 rounded-[2.5rem] p-8 shadow-xl space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Synthesis Output</span>
              {step === 'complete' && (
                <div className="flex items-center gap-2 text-emerald-600">
                  <Check size={14} strokeWidth={3} />
                  <span className="text-[9px] font-black uppercase tracking-widest">Cloned Successfully</span>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-1">Voice Profile (Cloned)</span>
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                  {voiceProfile ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col">
                        <span className="text-[7px] font-black text-slate-400 uppercase">Pitch / Tone</span>
                        <span className="text-[9px] font-bold text-slate-700 uppercase">{voiceProfile.pitch} / {voiceProfile.tone}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[7px] font-black text-slate-400 uppercase">Gender / Emotion</span>
                        <span className="text-[9px] font-bold text-slate-700 uppercase">{voiceProfile.gender} / {voiceProfile.emotion}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[7px] font-black text-slate-400 uppercase">Accent</span>
                        <span className="text-[9px] font-bold text-slate-700 uppercase">{voiceProfile.accent}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[7px] font-black text-slate-400 uppercase">Technical Specs</span>
                        <span className="text-[9px] font-bold text-slate-700 uppercase">{voiceProfile.technicalSpecs}</span>
                      </div>
                    </div>
                  ) : step === 'cloning' ? (
                    <div className="h-12 flex items-center justify-center gap-2 text-indigo-500 animate-pulse">
                      <Zap size={16} />
                      <span className="text-[9px] font-black uppercase tracking-widest">Extracting Signatures...</span>
                    </div>
                  ) : (
                    <div className="h-12 flex items-center justify-center opacity-20">
                      <Zap size={20} />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-1">Transcription</span>
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl min-h-[60px]">
                  {transcription ? (
                    <p className="text-xs font-bold text-slate-600 leading-normal italic">"{transcription}"</p>
                  ) : step === 'transcribing' ? (
                    <div className="h-full flex items-center justify-center gap-2 text-indigo-500 animate-pulse">
                      <Mic size={16} />
                      <span className="text-[9px] font-black uppercase tracking-widest">Transcribing Audio...</span>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center opacity-20">
                      <Mic size={24} />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest ml-1">Translation ({targetLang})</span>
                <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl min-h-[60px]">
                  {translation ? (
                    <p className="text-xs font-black text-indigo-900 leading-normal">"{translation}"</p>
                  ) : step === 'translating' ? (
                    <div className="h-full flex items-center justify-center gap-2 text-indigo-500 animate-pulse">
                      <Languages size={16} />
                      <span className="text-[9px] font-black uppercase tracking-widest">Translating Text...</span>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center opacity-20">
                      <Languages size={24} />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest ml-1 flex items-center gap-2">
                  {dubbedVideoUrl ? <Video size={14} className="text-indigo-600" /> : <Volume2 size={14} className="text-indigo-600" />}
                  {dubbedVideoUrl ? 'Lip-Synced Master' : 'Dubbed Master'}
                </span>
                
                {dubbedVideoUrl ? (
                  <div className="bg-slate-900 rounded-3xl overflow-hidden shadow-2xl animate-fadeIn group relative">
                    <video 
                      ref={videoRef} 
                      src={dubbedVideoUrl} 
                      className="w-full aspect-video object-cover"
                      controls
                    />
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a 
                        href={dubbedVideoUrl} 
                        download={`dubbed_${targetLang.toLowerCase()}.mp4`}
                        className="p-3 bg-white/10 backdrop-blur-md text-white rounded-2xl hover:bg-white/20 transition-all"
                      >
                        <Download size={20} />
                      </a>
                    </div>
                  </div>
                ) : dubbedAudioUrl ? (
                  <div className="bg-slate-900 rounded-2xl p-4 flex items-center gap-4 animate-fadeIn">
                    <button 
                      onClick={() => audioRef.current?.play()}
                      className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-indigo-700 transition-all active:scale-90"
                    >
                      <Play size={20} fill="currentColor" />
                    </button>
                    <div className="flex-1">
                      <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 w-1/3 animate-pulse" />
                      </div>
                      <div className="flex justify-between mt-2">
                        <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Neural Waveform</span>
                        <span className="text-[8px] font-black text-slate-500 uppercase">24kHz / Mono</span>
                      </div>
                    </div>
                    <a 
                      href={dubbedAudioUrl} 
                      download={`dubbed_${targetLang.toLowerCase()}.wav`}
                      className="p-2 text-slate-400 hover:text-white transition-colors"
                    >
                      <Download size={20} />
                    </a>
                    <audio ref={audioRef} src={dubbedAudioUrl} className="hidden" />
                  </div>
                ) : step === 'dubbing' ? (
                  <div className="h-20 border-2 border-dashed border-indigo-200 bg-indigo-50 rounded-2xl flex items-center justify-center gap-3 text-indigo-500 animate-pulse">
                    <Volume2 size={20} className="animate-bounce" />
                    <p className="text-[9px] font-black uppercase tracking-widest">Synthesizing Dubbed Audio...</p>
                  </div>
                ) : step === 'lipsync' ? (
                  <div className="h-20 border-2 border-dashed border-indigo-200 bg-indigo-50 rounded-2xl flex items-center justify-center gap-3 text-indigo-500 animate-pulse">
                    <Video size={20} className="animate-bounce" />
                    <p className="text-[9px] font-black uppercase tracking-widest">Generating Lip-Sync Video...</p>
                  </div>
                ) : (
                  <div className="h-20 border-2 border-dashed border-slate-100 rounded-2xl flex items-center justify-center text-slate-300">
                    <p className="text-[9px] font-black uppercase tracking-widest">Waiting for synthesis...</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-xl shadow-indigo-200 flex items-center gap-4 group cursor-help">
            <div className="p-3 bg-white/20 rounded-2xl group-hover:scale-110 transition-transform">
              <Sparkles size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest mb-1">Neural Lip-Sync & Cloning</p>
              <p className="text-[11px] font-bold opacity-80 leading-snug">The synthesis engine analyzes the source audio's pitch and timbre to clone the voice, while Veo generates matching video frames for perfect visual synchronization.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DubbingStudio;
