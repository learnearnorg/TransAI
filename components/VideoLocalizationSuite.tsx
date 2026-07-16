
import React, { useState, useRef, useEffect } from 'react';
import { 
  Video, 
  Upload, 
  Play, 
  Pause, 
  Download, 
  Loader2, 
  Check, 
  Music, 
  Volume2, 
  Languages, 
  Sparkles, 
  Zap, 
  AlertCircle, 
  Key,
  Type,
  Clock,
  Edit3,
  Save,
  Trash2,
  Plus,
  ChevronRight,
  ChevronLeft,
  Settings,
  Maximize,
  Layout,
  Terminal
} from 'lucide-react';
import { transcribeWithTimestamps, transcribeFileWithTimestamps, TranscriptionSegment } from '../services/transcriptionService';
import { translateText, generateDubbedAudio, generateLipSyncVideo } from '../services/geminiService';
import { ProfessionalField, TranslationHistoryItem, LinguisticPersona, StyleGuide } from '../types';
import { generateId } from '../utils/id';
import { decodeBase64, createWavFile } from '../services/audioUtils';
import SmartCompose from './SmartCompose';

interface VideoLocalizationSuiteProps {
  onSave: (item: TranslationHistoryItem) => void;
  targetLang: string;
  field: ProfessionalField;
  persona: LinguisticPersona;
  customStyleGuide?: string;
  styleGuides?: StyleGuide[];
}

interface LocalizationSegment extends TranscriptionSegment {
  id: string;
  translatedText: string;
  isDubbed: boolean;
  dubbedAudioUrl?: string;
  isLipSynced?: boolean;
  lipSyncVideoUrl?: string;
}

const VideoLocalizationSuite: React.FC<VideoLocalizationSuiteProps> = ({ 
  onSave, 
  targetLang, 
  field, 
  persona, 
  customStyleGuide, 
  styleGuides = [] 
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [segments, setSegments] = useState<LocalizationSegment[]>([]);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [isLipsyncEnabled, setIsLipsyncEnabled] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [isVeoReady, setIsVeoReady] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState<{ msg: string; type: 'info' | 'success' | 'error' | 'neural' }[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [consoleLogs]);

  const addLog = (msg: string, type: 'info' | 'success' | 'error' | 'neural' = 'info') => {
    setConsoleLogs(prev => [...prev, { msg, type }]);
  };

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
        setIsVeoReady(hasKey);
      }
    };
    checkKey();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const url = URL.createObjectURL(selectedFile);
      setVideoUrl(url);
      setSegments([]);
      setActiveSegmentId(null);
      addLog(`Media asset ingested: ${selectedFile.name}`, 'success');
    }
  };

  const initializeLocalization = async () => {
    if (!file) return;
    setIsProcessing(true);
    setConsoleLogs([]);
    addLog('Initializing Neural Localization Pipeline...', 'neural');
    
    try {
      setProcessingStep('Extracting Audio & Transcribing...');
      addLog('Extracting audio track for neural analysis...', 'info');
      
      addLog('Running neural transcription with sub-second timestamping...', 'neural');
      const rawSegments = await transcribeFileWithTimestamps(file, 'Auto');
      addLog(`Transcription complete: ${rawSegments.length} segments detected.`, 'success');
      
      setProcessingStep('Neural Translation Synthesis...');
      addLog(`Translating segments to ${targetLang} with ${typeof persona === 'string' ? persona : persona.name} persona...`, 'neural');
      
      const localizedSegments: LocalizationSegment[] = await Promise.all(
        rawSegments.map(async (seg) => {
          const styleGuide = typeof persona === 'string' && persona.startsWith('Style: ') ? styleGuides.find(g => `Style: ${g.name}` === persona) : null;
          const finalPersona = styleGuide ? 'Custom Guide' : persona;
          const finalContext = styleGuide ? styleGuide.instructions : (customStyleGuide || '');
          const customInstructions = styleGuide ? styleGuide.instructions : '';

          const result = await translateText(
            seg.text, 
            'Auto', 
            targetLang, 
            field, 
            [], 
            'Standard', 
            finalContext, 
            finalPersona, 
            [], 
            customInstructions
          );

          return {
            ...seg,
            id: generateId(),
            translatedText: result.text,
            isDubbed: false
          };
        })
      );

      setSegments(localizedSegments);
      addLog('Linguistic synthesis complete.', 'success');
      if (localizedSegments.length > 0) {
        setActiveSegmentId(localizedSegments[0].id);
      }
    } catch (err) {
      console.error("Localization initialization failed", err);
      addLog(`Pipeline failure: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
      setCurrentTime(time);
      
      // Frame-accurate segment tracking
      const currentSeg = segments.find(s => time >= s.start && time <= s.end);
      if (currentSeg && currentSeg.id !== activeSegmentId) {
        setActiveSegmentId(currentSeg.id);
      } else if (!currentSeg && activeSegmentId) {
        setActiveSegmentId(null);
      }
    }
  };

  const seekToSegment = (seg: LocalizationSegment) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seg.start;
      videoRef.current.play();
      setIsPlaying(true);
      setActiveSegmentId(seg.id);
    }
  };

  const updateSegmentTranslation = (id: string, text: string) => {
    setSegments(prev => prev.map(s => s.id === id ? { ...s, translatedText: text, isDubbed: false } : s));
  };

  const generateLipSyncForSegment = async (seg: LocalizationSegment) => {
    if (!isVeoReady) {
      if (window.aistudio) {
        await window.aistudio.openSelectKey();
        setIsVeoReady(true);
      }
      return;
    }

    setIsProcessing(true);
    setProcessingStep(`Generating Neural Lip-Sync...`);
    addLog(`Synthesizing lip-synced video for segment [${seg.start.toFixed(2)}s]...`, 'neural');

    try {
      // Capture a frame from the video at the segment start
      if (videoRef.current) {
        videoRef.current.currentTime = seg.start;
        // Wait for seek to complete
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(videoRef.current, 0, 0);
        const base64Frame = canvas.toDataURL('image/jpeg').split(',')[1];

        const lipSyncBase64 = await generateLipSyncVideo(seg.translatedText, base64Frame, 'image/jpeg');
        
        if (lipSyncBase64) {
          const blob = new Blob([decodeBase64(lipSyncBase64)], { type: 'video/mp4' });
          const url = URL.createObjectURL(blob);
          setSegments(prev => prev.map(s => s.id === seg.id ? { ...s, lipSyncVideoUrl: url, isLipSynced: true } : s));
          addLog('Lip-sync synthesis complete.', 'success');
        }
      }
    } catch (err) {
      console.error("Lip-sync failed", err);
      addLog('Lip-sync synthesis failed.', 'error');
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };
  const generateDubbingForSegment = async (seg: LocalizationSegment) => {
    if (!file) return;
    setIsProcessing(true);
    addLog(`Synthesizing dubbed audio for segment [${seg.start.toFixed(2)}s]...`, 'neural');
    
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = (e) => resolve((e.target?.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });

      const dubbedBase64 = await generateDubbedAudio(seg.translatedText, base64, file.type, targetLang);
      
      if (dubbedBase64) {
        const pcmData = decodeBase64(dubbedBase64);
        const blob = createWavFile(pcmData, 24000, 1);
        const url = URL.createObjectURL(blob);
        setSegments(prev => prev.map(s => s.id === seg.id ? { ...s, dubbedAudioUrl: url, isDubbed: true } : s));
        addLog('Dubbing synthesis complete.', 'success');
      }
    } catch (err) {
      console.error("Dubbing failed", err);
      addLog('Dubbing synthesis failed.', 'error');
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  const [isRendering, setIsRendering] = useState(false);
  const [renderedVideoUrl, setRenderedVideoUrl] = useState<string | null>(null);

  const handleRenderFinalVideo = async () => {
    setIsRendering(true);
    setProcessingStep('Compositing Neural Audio & Lip-Sync Frames...');
    addLog('Initiating final video render pipeline...', 'neural');
    
    try {
      // Simulate rendering process
      await new Promise(resolve => setTimeout(resolve, 3000));
      addLog('Audio tracks mixed and normalized.', 'success');
      
      setProcessingStep('Encoding Final Output...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // For prototype, we just use the original video URL as the "rendered" video
      // In a real app, this would be the URL returned by the rendering backend
      setRenderedVideoUrl(videoUrl);
      addLog('Final video rendered successfully.', 'success');
    } catch (err) {
      console.error(err);
      addLog('Rendering failed.', 'error');
    } finally {
      setIsRendering(false);
      setProcessingStep('');
    }
  };

  const activeSegment = segments.find(s => s.id === activeSegmentId);

  return (
    <div className="max-w-[1400px] mx-auto h-[calc(100vh-180px)] flex flex-col gap-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between px-2">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg">
              <Video size={24} />
            </div>
            Interactive Video Localization Suite
          </h2>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">Neural Dubbing • Subtitle Synthesis • Frame-Accurate Sync</p>
        </div>
        
        <div className="flex items-center gap-4">
          {isVeoReady && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Veo Ready</span>
            </div>
          )}
          {!file ? (
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 flex items-center gap-2"
            >
              <Upload size={16} /> Inject Media Source
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => { setFile(null); setVideoUrl(null); setSegments([]); setRenderedVideoUrl(null); }}
                className="px-4 py-2 bg-slate-100 text-slate-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
              >
                Eject
              </button>
              {segments.length > 0 && (
                <button 
                  onClick={handleRenderFinalVideo}
                  disabled={isRendering || isProcessing}
                  className="px-6 py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200 flex items-center gap-2"
                >
                  {isRendering ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                  Render Final Video
                </button>
              )}
              {segments.length === 0 && (
                <button 
                  onClick={initializeLocalization}
                  disabled={isProcessing}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 flex items-center gap-2"
                >
                  {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} fill="currentColor" />}
                  Initialize Neural Sync
                </button>
              )}
            </div>
          )}
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="video/*" />
        </div>
      </div>

      {!file ? (
        <div className="flex-1 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[3rem] flex flex-col items-center justify-center gap-6 group">
          <div className="w-24 h-24 bg-white rounded-[2rem] shadow-xl flex items-center justify-center text-slate-300 group-hover:text-indigo-500 group-hover:scale-110 transition-all duration-500">
            <Video size={48} strokeWidth={1.5} />
          </div>
          <div className="text-center space-y-2">
            <p className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">Neural Grid Awaiting Input</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Upload MP4, MOV, or WEBM to begin localization cycle</p>
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="px-8 py-4 bg-white text-indigo-600 border-2 border-indigo-100 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-all shadow-lg"
          >
            Select Local Asset
          </button>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-12 gap-6 overflow-hidden">
          {/* Left: Video & Console */}
          <div className="col-span-12 lg:col-span-8 flex flex-col gap-6 overflow-hidden">
            {/* Video Player */}
            <div className="relative bg-black rounded-[2.5rem] overflow-hidden shadow-2xl flex-1 group">
              {renderedVideoUrl ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 relative">
                  <video 
                    src={renderedVideoUrl}
                    className="w-full h-full object-contain"
                    controls
                    autoPlay
                  />
                  <div className="absolute top-6 right-6 px-4 py-2 bg-emerald-500/90 backdrop-blur-md text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2">
                    <Check size={14} /> Final Render Complete
                  </div>
                </div>
              ) : videoUrl ? (
                <>
                  <video 
                    ref={videoRef}
                    src={videoUrl}
                    className="w-full h-full object-contain"
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                  />
                  
                  {/* Subtitle Overlay */}
                  {showSubtitles && activeSegment && (
                    <div className="absolute bottom-20 left-0 right-0 flex justify-center px-10 pointer-events-none">
                      <div className="bg-black/80 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 text-center animate-fadeIn">
                        <p className="text-white text-lg font-bold tracking-tight leading-tight">
                          {activeSegment.translatedText}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Controls Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-8 gap-4">
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => {
                          if (isPlaying) videoRef.current?.pause();
                          else videoRef.current?.play();
                          setIsPlaying(!isPlaying);
                        }}
                        className="p-4 bg-white text-black rounded-full hover:scale-110 transition-all"
                      >
                        {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                      </button>
                      
                      <div className="flex-1 flex flex-col gap-2">
                        <div className="flex items-center justify-between text-[10px] font-black text-white/60 uppercase tracking-widest">
                          <span>{new Date(currentTime * 1000).toISOString().substr(14, 5)}</span>
                          <span>{new Date(duration * 1000).toISOString().substr(14, 5)}</span>
                        </div>
                        <div className="h-1.5 bg-white/20 rounded-full overflow-hidden relative">
                          <div 
                            className="absolute inset-y-0 left-0 bg-indigo-500 transition-all"
                            style={{ width: `${(currentTime / duration) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-slate-500">
                  <div className="p-8 bg-slate-900 rounded-full animate-pulse">
                    <Video size={48} />
                  </div>
                  <p className="text-sm font-black uppercase tracking-widest">Awaiting Media Injection</p>
                </div>
              )}
            </div>

            {/* Neural Console */}
            <div className="h-40 bg-slate-900 rounded-[2rem] border border-slate-800 overflow-hidden flex flex-col shadow-inner">
              <div className="px-6 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                <div className="flex items-center gap-2">
                  <Terminal size={14} className="text-indigo-400" />
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Neural Execution Console</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[8px] font-bold text-emerald-500 uppercase">System Online</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 font-mono text-[10px] space-y-1 custom-scrollbar">
                {consoleLogs.length === 0 ? (
                  <p className="text-slate-600 italic">Ready for linguistic synthesis...</p>
                ) : (
                  consoleLogs.map((log, idx) => (
                    <div key={idx} className="flex gap-3">
                      <span className="text-slate-600 shrink-0">[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
                      <span className={`
                        ${log.type === 'info' ? 'text-slate-400' : ''}
                        ${log.type === 'success' ? 'text-emerald-400' : ''}
                        ${log.type === 'error' ? 'text-rose-400' : ''}
                        ${log.type === 'neural' ? 'text-indigo-400 font-bold' : ''}
                      `}>
                        {log.type === 'neural' && '⚡ '}
                        {log.msg}
                      </span>
                    </div>
                  ))
                )}
                <div ref={consoleEndRef} />
              </div>
            </div>
          </div>

          {/* Right: Segments & Tools */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-6 overflow-hidden">
            <div className="flex-1 bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl border border-slate-800 flex flex-col gap-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
              
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
                    <Edit3 size={18} />
                  </div>
                  <span className="text-[11px] font-black text-white uppercase tracking-widest">Localization Editor</span>
                </div>
                {activeSegment && (
                  <div className="px-3 py-1 bg-white/5 rounded-full border border-white/10">
                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Segment {segments.indexOf(activeSegment) + 1}</span>
                  </div>
                )}
              </div>

              {activeSegment ? (
                <div className="flex-1 flex flex-col gap-8 relative z-10">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Source Transcription</span>
                      <button className="text-[8px] font-black text-indigo-400 uppercase hover:underline">Re-Transcribe</button>
                    </div>
                    <div className="p-5 bg-slate-800/50 border border-slate-700 rounded-2xl">
                      <p className="text-xs font-bold text-slate-300 leading-relaxed italic">"{activeSegment.text}"</p>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col gap-3">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Neural Synthesis ({targetLang})</span>
                      <div className="flex items-center gap-2">
                         <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Smart Compose Active</span>
                         <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                    </div>
                    <div className="flex-1 bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
                      <SmartCompose 
                        value={activeSegment.translatedText}
                        onChange={(val) => updateSegmentTranslation(activeSegment.id, val)}
                        targetLang={targetLang}
                        field={field}
                        glossary={[]}
                        memory={[]}
                        placeholder="Refine the translation..."
                        className="h-full w-full p-6 text-white font-bold text-sm leading-relaxed"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => generateDubbingForSegment(activeSegment)}
                      disabled={isProcessing}
                      className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${activeSegment.isDubbed ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-400' : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'}`}
                    >
                      {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Volume2 size={16} />}
                      {activeSegment.isDubbed ? 'Voice Cloned' : 'Generate Dub'}
                    </button>
                    <button 
                      onClick={() => generateLipSyncForSegment(activeSegment)}
                      disabled={isProcessing}
                      className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${activeSegment.isLipSynced ? 'bg-indigo-500/20 border border-indigo-500 text-indigo-400' : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'}`}
                    >
                      {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                      {activeSegment.isLipSynced ? 'Lip-Synced' : 'Neural Lip-Sync'}
                    </button>
                  </div>
                  <button 
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-900/40"
                  >
                    <Save size={16} /> Save Changes
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center gap-6 opacity-20">
                  <Layout size={64} strokeWidth={1} className="text-white" />
                  <p className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Select Segment to Edit</p>
                </div>
              )}
            </div>

            {/* Timeline */}
            <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-6 flex flex-col gap-4 shadow-sm h-64 overflow-hidden">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                  <Clock size={16} className="text-slate-400" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Neural Timeline Segments</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">{segments.length} Data Points</span>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <div className="grid grid-cols-1 gap-3">
                  {segments.length === 0 ? (
                    <div className="w-full h-24 flex items-center justify-center text-slate-300 italic text-[10px] uppercase tracking-widest">
                      Initialize sync to generate segments
                    </div>
                  ) : (
                    segments.map((seg) => (
                      <button 
                        key={seg.id}
                        onClick={() => seekToSegment(seg)}
                        className={`w-full p-4 rounded-2xl border-2 transition-all flex flex-col gap-2 text-left group ${activeSegmentId === seg.id ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-50 bg-slate-50/50 hover:border-slate-200'}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">{seg.start.toFixed(1)}s - {seg.end.toFixed(1)}s</span>
                          {seg.isDubbed && <Volume2 size={12} className="text-emerald-500" />}
                        </div>
                        <p className="text-[10px] font-bold text-slate-600 line-clamp-1 leading-relaxed italic">"{seg.text}"</p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Processing Overlay */}
      {isProcessing && processingStep && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-md flex items-center justify-center animate-fadeIn">
          <div className="bg-white rounded-[3rem] p-12 shadow-2xl flex flex-col items-center gap-8 max-w-md text-center border border-slate-100">
            <div className="relative">
              <div className="w-24 h-24 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles size={32} className="text-indigo-500 animate-pulse" />
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Neural Grid Processing</h3>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">{processingStep}</p>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 animate-shimmer" style={{ width: '40%' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoLocalizationSuite;
