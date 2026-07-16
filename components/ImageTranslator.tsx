
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { translateImage, textToSpeech, fetchPronunciationGuide, auditTranslationNPE } from '../services/geminiService';
import { ProfessionalField, NPEReport } from '../types';
import { generateId } from '../utils/id';
import LanguageSelector from './LanguageSelector';
import PronunciationGuideTooltip from './PronunciationGuideTooltip';
import AuditMatrix from './AuditMatrix';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { enhanceImageForOCR } from '../services/imageUtils';
import { 
  Camera, 
  RefreshCw, 
  Zap, 
  X, 
  ShieldCheck, 
  Image as ImageIcon, 
  Sparkles, 
  Volume2, 
  FlipHorizontal, 
  AlertCircle,
  Check,
  Copy,
  Focus,
  Search,
  Layers,
  Download
} from 'lucide-react';

interface OCRBlock {
  text: string;
  translation: string;
  box_2d: [number, number, number, number];
}

interface ImageResult {
  original: string;
  translated: string;
  confidence: number;
  contextExplanation?: string;
  blocks?: OCRBlock[];
}

const ImageTranslator: React.FC<{ onSave: (item: any) => void, field: ProfessionalField, targetLang: string, setTargetLang: (lang: string) => void }> = ({ onSave, field, targetLang, setTargetLang }) => {
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string | null>(null);
  const [result, setResult] = useState<ImageResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [useCamera, setUseCamera] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isEnhancing, setIsEnhancing] = useState(true);
  const [brightness, setBrightness] = useState(1.0);
  const [contrast, setContrast] = useState(1.0);
  const [sharpen, setSharpen] = useState(0.0);
  const [isCopied, setIsCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isFlashVisible, setIsFlashVisible] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLeftExpanded, setIsLeftExpanded] = useState(true);
  
  // Audit states
  const [isAuditing, setIsAuditing] = useState(false);
  const [npeReport, setNpeReport] = useState<NPEReport | null>(null);
  const [showAudit, setShowAudit] = useState(false);
  const [showOverlays, setShowOverlays] = useState(true);
  const [overlayMode, setOverlayMode] = useState<'tooltip' | 'inplace'>('inplace');
  const [hoveredBlock, setHoveredBlock] = useState<OCRBlock | null>(null);

  // Pronunciation states
  const [pronunciationGuide, setPronunciationGuide] = useState<{ phonetic: string; guide: string; text: string } | null>(null);
  const [isFetchingPronunciation, setIsFetchingPronunciation] = useState(false);
  const [pronunciationPos, setPronunciationPos] = useState({ x: 0, y: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const outputContainerRef = useRef<HTMLDivElement>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: facingMode,
          width: { ideal: 2560 },
          height: { ideal: 1440 }
        } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(e => {
            console.error("Autoplay prevented:", e);
            setCameraError("Autoplay blocked. Tap to start video.");
          });
        };
      }
    } catch (err: any) {
      console.error("Camera access failed:", err);
      let msg = "Camera access denied.";
      if (err.name === 'NotAllowedError') msg = "Permission denied. Please allow camera access.";
      else if (err.name === 'NotFoundError') msg = "No camera found on this device.";
      setCameraError(msg);
      setUseCamera(false);
    }
  }, [facingMode]);

  useEffect(() => {
    if (useCamera) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [useCamera, startCamera, stopCamera]);

  // Selection detection for pronunciation guide
  useEffect(() => {
    const handleSelection = async () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        if (!isFetchingPronunciation) setPronunciationGuide(null);
        return;
      }

      const selectedText = selection.toString().trim();
      if (!selectedText || selectedText.length > 100) {
        setPronunciationGuide(null);
        return;
      }

      if (outputContainerRef.current && outputContainerRef.current.contains(selection.anchorNode)) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        setPronunciationPos({
          x: rect.left + rect.width / 2,
          y: rect.top - 10
        });

        setIsFetchingPronunciation(true);
        try {
          const guide = await fetchPronunciationGuide(selectedText, targetLang);
          setPronunciationGuide({ ...guide, text: selectedText });
        } catch (e) {
          console.error(e);
        } finally {
          setIsFetchingPronunciation(false);
        }
      }
    };

    document.addEventListener('mouseup', handleSelection);
    return () => document.removeEventListener('mouseup', handleSelection);
  }, [targetLang, isFetchingPronunciation]);

  const toggleCamera = () => {
    setUseCamera(prev => !prev);
  };

  const flipCamera = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const processImageSource = async (source: HTMLImageElement | HTMLVideoElement): Promise<string> => {
    const canvas = document.createElement('canvas');
    let width = source instanceof HTMLImageElement ? source.naturalWidth : source.videoWidth;
    let height = source instanceof HTMLImageElement ? source.naturalHeight : source.videoHeight;
    
    const maxDimension = 2560; 
    const scale = Math.min(1, maxDimension / Math.max(width, height));
    width = Math.floor(width * scale);
    height = Math.floor(height * scale);

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: true });
    if (!ctx) return '';

    ctx.drawImage(source, 0, 0, width, height);

    if (isEnhancing) {
      await enhanceImageForOCR(canvas, { brightness, contrast, sharpen });
    }

    return canvas.toDataURL('image/jpeg', 0.98).split(',')[1];
  };

  const handleTranslate = async (base64: string, type: string) => {
    setIsLoading(true);
    setResult(null);
    setShowAudit(false);
    try {
      const data = await translateImage(base64, type, targetLang, field);
      setResult(data);
      onSave({
        id: generateId(),
        sourceText: `Visual Sync (${type})`,
        translatedText: data.translated,
        sourceLang: "Optic Core",
        targetLang,
        field,
        timestamp: Date.now(),
        type: 'image'
      });
    } catch (err) {
      console.error("Translation error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAudit = async () => {
    if (!result || isAuditing) return;
    setIsAuditing(true);
    setNpeReport(null);
    setShowAudit(true);
    try {
      const report = await auditTranslationNPE(result.original, result.translated, "Source Language", targetLang);
      setNpeReport(report);
    } catch (err) {
      console.error(err);
      setShowAudit(false);
    } finally {
      setIsAuditing(false);
    }
  };

  const captureImage = async () => {
    if (videoRef.current && streamRef.current) {
      setIsFlashVisible(true);
      setTimeout(() => setIsFlashVisible(false), 150);

      const processedBase64 = await processImageSource(videoRef.current);
      
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
      
      setFilePreview(canvas.toDataURL('image/jpeg'));
      setFileType('image/jpeg');
      setUseCamera(false);
      
      await handleTranslate(processedBase64, 'image/jpeg');
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    setFileType(file.type);
    setResult(null);
    setNpeReport(null);
    setShowAudit(false);

    if (file.type === 'application/pdf') {
      reader.onload = async (event) => {
        const base64 = (event.target?.result as string).split(',')[1];
        setFilePreview(null); 
        await handleTranslate(base64, 'application/pdf');
      };
      reader.readAsDataURL(file);
    } else if (file.type.startsWith('image/')) {
      const img = new Image();
      reader.onload = (event) => {
        img.onload = async () => {
          const processedBase64 = await processImageSource(img);
          setFilePreview(img.src);
          await handleTranslate(processedBase64, 'image/jpeg');
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
      e.target.value = '';
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!useCamera) setIsDragging(true);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!useCamera && e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
  };

  const handleCopy = async () => {
    if (result?.translated) {
      try {
        const markdownBody = outputContainerRef.current?.querySelector('.markdown-body');
        if (markdownBody && window.ClipboardItem) {
          // Clone the node to modify it for clipboard without affecting UI
          const clone = markdownBody.cloneNode(true) as HTMLElement;
          
          // Inline some basic table styles for Word compatibility
          const tables = clone.querySelectorAll('table');
          tables.forEach(table => {
            (table as HTMLElement).style.borderCollapse = 'collapse';
            (table as HTMLElement).style.width = '100%';
            (table as HTMLElement).style.margin = '12pt 0';
            (table as HTMLElement).style.border = '1px solid #e2e8f0';
            
            const cells = table.querySelectorAll('th, td');
            cells.forEach(cell => {
              (cell as HTMLElement).style.border = '1px solid #e2e8f0';
              (cell as HTMLElement).style.padding = '6pt';
              (cell as HTMLElement).style.textAlign = 'left';
            });
            
            const headers = table.querySelectorAll('th');
            headers.forEach(header => {
              (header as HTMLElement).style.backgroundColor = '#f8fafc';
              (header as HTMLElement).style.fontWeight = 'bold';
            });
          });

          const html = clone.innerHTML;
          const blobHtml = new Blob([html], { type: 'text/html' });
          const blobText = new Blob([result.translated], { type: 'text/plain' });
          
          const data = [new ClipboardItem({
            'text/html': blobHtml,
            'text/plain': blobText,
          })];
          
          await navigator.clipboard.write(data);
        } else {
          await navigator.clipboard.writeText(result.translated);
        }
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      } catch (err) {
        console.error('Advanced copy failed, falling back to text-only', err);
        navigator.clipboard.writeText(result.translated);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      }
    }
  };

  const handleSpeak = () => {
    if (result?.translated) {
      textToSpeech(result.translated);
    }
  };

  const getHighlightedText = (text: string, highlightWord: string | undefined) => {
    if (!highlightWord || !text) return text;
    
    try {
      // Escape regex special characters
      const escapeRegExp = (string: string) => {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      };
      
      const escaped = escapeRegExp(highlightWord);
      // We use a custom markdown link syntax as a hack to style it later
      const regex = new RegExp(`(${escaped})`, 'gi');
      return text.replace(regex, '[$1](#highlight)');
    } catch (e) {
      return text;
    }
  };

  return (
    <div className="flex flex-col gap-4 animate-fadeIn">
      <div className="flex items-center gap-3 px-2">
        <button onClick={() => setIsLeftExpanded(!isLeftExpanded)} className="p-2 bg-white border border-slate-200 text-slate-500 rounded-lg shadow-sm">
          {isLeftExpanded ? <Camera size={16} /> : <Camera size={16} className="text-indigo-500" />}
        </button>
        <span className="text-[12px] font-black text-slate-700 uppercase tracking-widest">Neural Vision Sync</span>
      </div>
      {/* Header / Controls */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-200 rounded-[2.5rem] shadow-inner">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
            Neural Vision Sync 
            {isEnhancing && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] bg-indigo-100 text-indigo-700 animate-pulse">Precision: Ultra</span>}
          </h3>
          <div className="flex flex-col gap-3 mt-1">
             <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsEnhancing(!isEnhancing)}
                className={`flex items-center gap-2 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${isEnhancing ? 'bg-indigo-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-400'}`}
              >
                <Sparkles size={12} />
                Advanced Preprocessing
              </button>
              {useCamera && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-indigo-50 border border-indigo-100">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                  <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Environmental Link</span>
                </div>
              )}
             </div>

             {isEnhancing && (
               <div className="flex flex-wrap items-center gap-4 px-3 py-2 bg-white border border-slate-200 rounded-xl shadow-sm animate-fadeIn">
                 <div className="flex flex-col gap-1">
                   <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Brightness ({brightness.toFixed(1)})</label>
                   <input 
                    type="range" 
                    min="0.5" 
                    max="2.0" 
                    step="0.1" 
                    value={brightness} 
                    onChange={(e) => setBrightness(parseFloat(e.target.value))}
                    className="w-24 h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                   />
                 </div>
                 <div className="flex flex-col gap-1">
                   <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Contrast ({contrast.toFixed(1)})</label>
                   <input 
                    type="range" 
                    min="0.5" 
                    max="2.0" 
                    step="0.1" 
                    value={contrast} 
                    onChange={(e) => setContrast(parseFloat(e.target.value))}
                    className="w-24 h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                   />
                 </div>
                 <div className="flex flex-col gap-1">
                   <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Sharpen ({sharpen.toFixed(1)})</label>
                   <input 
                    type="range" 
                    min="0" 
                    max="1.0" 
                    step="0.1" 
                    value={sharpen} 
                    onChange={(e) => setSharpen(parseFloat(e.target.value))}
                    className="w-24 h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                   />
                 </div>
                 <button 
                  onClick={() => { setBrightness(1.0); setContrast(1.0); setSharpen(0.0); }}
                  className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                  title="Reset to Defaults"
                 >
                   <RefreshCw size={10} />
                 </button>
               </div>
             )}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <LanguageSelector value={targetLang} onChange={setTargetLang} className="w-[172px]" />
          <div className="flex gap-2">
            <button 
              onClick={toggleCamera}
              className={`p-2 rounded-2xl transition-all shadow-xl active:scale-95 ${useCamera ? 'bg-red-500 text-white' : 'bg-white text-indigo-600 border border-slate-200'}`}
              title={useCamera ? "Stop Camera" : "Start Camera Capture"}
            >
              <Camera size={18} />
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-2 bg-indigo-600 text-white rounded-2xl shadow-xl active:scale-95 transition-all"
              title="Upload Asset"
            >
              <ImageIcon size={18} />
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,application/pdf" />
          </div>
        </div>
      </div>

      <div 
        onDragOver={onDragOver}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className="flex gap-4 h-[420px]"
      >
        {/* Input Surface */}
        <div className={`relative bg-slate-900 rounded-2xl overflow-hidden border-2 transition-all duration-500 ${isDragging ? 'border-indigo-500' : 'border-slate-800'} ${isLeftExpanded ? 'flex-1' : 'w-16'}`}>
          {isLeftExpanded ? (
            useCamera ? (
              <div className="w-full h-full relative">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover" 
                />
                <div className="absolute inset-0 pointer-events-none border-[1.5rem] border-black/20" />
                <div className="absolute inset-0 pointer-events-none flex flex-col justify-center items-center">
                  <div className="w-[85%] h-[65%] border-2 border-dashed border-white/40 rounded-3xl relative overflow-hidden ring-1 ring-white/10">
                     <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500/60 shadow-[0_0_20px_rgba(79,70,229,1)] animate-[scan_2.5s_ease-in-out_infinite]" />
                     <div className="absolute inset-0 flex items-center justify-center opacity-10">
                        <Focus size={120} strokeWidth={0.5} className="text-white" />
                     </div>
                  </div>
                </div>

                {isFlashVisible && <div className="absolute inset-0 bg-white animate-fadeOut z-30" />}
                
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6 z-40">
                  <button 
                    onClick={flipCamera}
                    className="p-3 bg-black/40 backdrop-blur-md rounded-2xl text-white hover:bg-black/60 transition-all shadow-lg"
                    title="Flip Camera"
                  >
                    <FlipHorizontal size={20} />
                  </button>
                  <button 
                    onClick={captureImage}
                    className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-all border-4 border-slate-200 group"
                  >
                    <div className="w-16 h-16 bg-indigo-600 rounded-full group-hover:bg-indigo-500 transition-colors shadow-inner" />
                  </button>
                  <button 
                    onClick={() => setUseCamera(false)}
                    className="p-3 bg-black/40 backdrop-blur-md rounded-2xl text-white hover:bg-black/60 transition-all shadow-lg"
                    title="Cancel"
                  >
                    <X size={20} />
                  </button>
                </div>

                {cameraError && (
                  <div className="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center p-8 text-center gap-4 z-50">
                    <div className="p-4 bg-red-500/20 rounded-full text-red-500">
                      <AlertCircle size={32} />
                    </div>
                    <p className="text-white text-sm font-bold">{cameraError}</p>
                    <button onClick={startCamera} className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest">Retry Access</button>
                  </div>
                )}
              </div>
            ) : filePreview ? (
              <div className="w-full h-full relative group bg-slate-950">
                <img src={filePreview} alt="Preview" className="w-full h-full object-contain" />
                
                {/* Visual OCR Overlays */}
                {showOverlays && result?.blocks && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="relative w-full h-full">
                      {result.blocks.map((block, idx) => {
                        const [ymin, xmin, ymax, xmax] = block.box_2d;
                        const width = (xmax - xmin) / 10;
                        const height = (ymax - ymin) / 10;
                        
                        return (
                          <div 
                            key={idx}
                            className={`absolute border transition-all duration-300 pointer-events-auto cursor-help group/block ${overlayMode === 'inplace' ? 'border-transparent bg-white/90 backdrop-blur-[2px] shadow-sm flex items-center justify-center overflow-hidden p-0.5' : 'border-indigo-500/50 bg-indigo-500/10'}`}
                            style={{
                              top: `${ymin / 10}%`,
                              left: `${xmin / 10}%`,
                              width: `${width}%`,
                              height: `${height}%`
                            }}
                            onMouseEnter={() => setHoveredBlock(block)}
                            onMouseLeave={() => setHoveredBlock(null)}
                          >
                            {overlayMode === 'inplace' ? (
                              <div 
                                className="text-slate-900 font-bold leading-none text-center w-full"
                                style={{ 
                                  fontSize: `${Math.max(6, Math.min(14, height * 2.5))}px`,
                                  lineHeight: '1.1'
                                }}
                              >
                                {block.translation}
                              </div>
                            ) : (
                              <div className="absolute bottom-full left-0 mb-1 hidden group-hover/block:block z-50">
                                <div className="bg-slate-900 text-white text-[10px] p-2 rounded-lg shadow-xl whitespace-nowrap border border-slate-700">
                                  <p className="font-black text-indigo-400 uppercase tracking-widest mb-1">Synthesis Output</p>
                                  <p className="font-bold italic">"{block.translation}"</p>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                   <button 
                    onClick={() => { setFilePreview(null); setFileType(null); setResult(null); }}
                    className="p-4 bg-white/20 backdrop-blur-md text-white rounded-3xl hover:bg-white/30 transition-all flex flex-col items-center gap-2"
                   >
                     <RefreshCw size={24} />
                     <span className="text-[10px] font-black uppercase tracking-widest">Discard Buffer</span>
                   </button>
                </div>
              </div>
            ) : fileType === 'application/pdf' ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-4 bg-slate-800/50">
                 <div className="p-6 bg-slate-800 rounded-[1.5rem] border-2 border-slate-700 shadow-2xl">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                 </div>
                 <div className="text-center space-y-1">
                   <p className="text-[12px] font-black uppercase tracking-[0.2em] text-white">PDF Document Loaded</p>
                   <button onClick={() => {setFileType(null); setResult(null);}} className="text-[9px] font-black text-indigo-400 uppercase tracking-widest hover:text-indigo-300">Clear Packet</button>
                 </div>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-4 bg-slate-900/50">
                <div className="relative">
                  <div className="w-16 h-16 bg-slate-800 rounded-[1.5rem] flex items-center justify-center border-2 border-slate-700">
                    <ImageIcon size={32} strokeWidth={1.5} className="text-slate-600" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center text-white border-2 border-slate-900 shadow-xl">
                    <Zap size={12} fill="currentColor" />
                  </div>
                </div>
                <div className="text-center px-12 space-y-2">
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-white/80">
                    Matrix Vision Idle
                  </p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase leading-relaxed tracking-wider">
                    Select environmental capture or inject visual assets for high-fidelity OCR extraction.
                  </p>
                </div>
                <button onClick={toggleCamera} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg flex items-center gap-2">
                  <Camera size={14} /> Start Precision Scan
                </button>
              </div>
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center cursor-pointer hover:bg-slate-800/50 transition-colors" onClick={() => setIsLeftExpanded(true)}>
               <Camera size={20} className="text-slate-600" />
            </div>
          )}
        </div>

        {/* Output Surface */}
        <div 
          ref={outputContainerRef}
          className={`flex flex-col bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden p-5 relative transition-all duration-500 ${isLeftExpanded ? 'flex-1' : 'flex-[2]'}`}
        >

          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em]">Synthesized Reconstruction</span>
              {result && <span className="text-[6px] font-black text-indigo-500 uppercase tracking-widest">Adaptive Field Audit Complete</span>}
            </div>
            <div className="flex items-center gap-2">
              {isLoading && <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />}
              {result && (
                <div className="flex items-center bg-slate-50 p-0.5 rounded-lg border border-slate-100 gap-0.5">
                   <button 
                    onClick={() => setShowOverlays(!showOverlays)} 
                    className={`p-1 rounded-lg transition-all ${showOverlays ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:text-indigo-600 hover:bg-white'}`} 
                    title="Toggle Visual Overlays"
                   >
                    <Focus size={12}/>
                   </button>
                   {showOverlays && (
                     <button 
                      onClick={() => setOverlayMode(prev => prev === 'inplace' ? 'tooltip' : 'inplace')} 
                      className={`p-1 rounded-lg transition-all ${overlayMode === 'inplace' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-indigo-600 hover:bg-white'}`} 
                      title={overlayMode === 'inplace' ? "Switch to Tooltip Mode" : "Switch to In-Place Mode"}
                     >
                      <Layers size={12}/>
                     </button>
                   )}
                   <button onClick={handleAudit} disabled={isAuditing} className={`p-1 rounded-lg transition-all ${showAudit ? 'bg-amber-100 text-amber-600' : 'text-slate-400 hover:text-amber-600 hover:bg-white'}`} title="Neural Post-Edit Audit"><Search size={12}/></button>
                   <button onClick={handleSpeak} className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all"><Volume2 size={12}/></button>
                   <button onClick={handleCopy} className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[7px] font-black uppercase tracking-widest transition-all ${isCopied ? 'bg-green-500 text-white' : 'text-slate-500 hover:bg-white hover:text-indigo-600'}`}>
                      {isCopied ? <><Check size={8}/> Copied</> : <><Copy size={8}/> Copy Result</>}
                   </button>
                   {fileType === 'application/pdf' && (
                     <button onClick={async () => {
                       if (!result) return;
                       const { marked } = await import('marked');
                       // @ts-ignore
                       const html2pdf = (await import('html2pdf.js')).default || (await import('html2pdf.js'));
                       
                       const htmlContent = await marked.parse(result.translated);
                       const element = document.createElement('div');
                       element.innerHTML = `
                         <div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6;">
                           ${htmlContent}
                         </div>
                       `;
                       
                       const opt = {
                         margin:       10,
                         filename:     `translated_document.pdf`,
                         image:        { type: 'jpeg', quality: 0.98 },
                         html2canvas:  { scale: 2 },
                         jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
                       };
                       
                       // @ts-ignore
                       html2pdf().set(opt).from(element).save();
                     }} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[7px] font-black uppercase tracking-widest transition-all text-slate-500 hover:bg-white hover:text-indigo-600">
                        <Download size={8}/> Download PDF
                     </button>
                   )}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
            {isLoading ? (
              <div className="h-full flex flex-col items-center justify-center gap-8">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles size={20} className="text-indigo-400" />
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.5em] text-indigo-400 animate-pulse">Running Neural OCR</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Linguistic Preprocessing Cycle...</p>
                </div>
              </div>
            ) : showAudit ? (
              <AuditMatrix 
                report={npeReport}
                isLoading={isAuditing}
                onApply={(revised) => { setResult(prev => prev ? {...prev, translated: revised} : null); setShowAudit(false); }}
                onDiscard={() => setShowAudit(false)}
                targetLang={targetLang}
              />
            ) : result ? (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex items-center gap-2">
                   <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-100 rounded-full text-emerald-600">
                     <ShieldCheck size={12} />
                     <span className="text-[8px] font-black uppercase tracking-widest">Accuracy: {result.confidence}%</span>
                   </div>
                   <div className="px-2.5 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-600">
                     <span className="text-[8px] font-black uppercase tracking-widest">Enhanced Map</span>
                   </div>
                </div>
                
                {result.contextExplanation && (
                  <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl flex items-start gap-3">
                    <Sparkles size={16} className="text-blue-500 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest block mb-1">Visual Context</span>
                      <p className="text-xs text-slate-700 leading-relaxed">{result.contextExplanation}</p>
                    </div>
                  </div>
                )}
                
                <div className="space-y-3">
                   <span className="text-[7px] font-black text-slate-300 uppercase tracking-[0.3em] block">Target Synthesis</span>
                   <div className="markdown-body text-[14px] font-bold text-slate-900 leading-relaxed">
                     <Markdown 
                       remarkPlugins={[remarkGfm]}
                       rehypePlugins={[rehypeRaw]}
                       components={{
                         a: ({node, ...props}) => {
                           if (props.href === '#highlight') {
                             return <span className="bg-indigo-500/20 text-indigo-700 rounded px-1 transition-all duration-300 shadow-sm">{props.children}</span>;
                           }
                           return <a {...props} />;
                         }
                       }}
                     >
                       {getHighlightedText(result.translated, hoveredBlock?.translation)}
                     </Markdown>
                   </div>
                </div>

                <div className="pt-6 border-t border-slate-50">
                   <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                      <span className="text-[7px] font-black text-slate-300 uppercase tracking-[0.3em] block mb-2">Extracted Source Buffer</span>
                      <div className="markdown-body text-[11px] font-bold text-slate-500 italic leading-relaxed">
                        <Markdown 
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeRaw]}
                          components={{
                            a: ({node, ...props}) => {
                              if (props.href === '#highlight') {
                                return <span className="bg-slate-300/50 text-slate-700 rounded px-1 transition-all duration-300">{props.children}</span>;
                              }
                              return <a {...props} />;
                            }
                          }}
                        >
                          {getHighlightedText(result.original, hoveredBlock?.text)}
                        </Markdown>
                      </div>
                   </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-40 gap-6 text-center px-10">
                 <div className="relative">
                   <RefreshCw size={48} strokeWidth={1} className="animate-[spin_8s_linear_infinite]" />
                   <div className="absolute inset-0 flex items-center justify-center">
                     <ImageIcon size={16} />
                   </div>
                 </div>
                 <div className="space-y-2">
                   <p className="text-sm font-black uppercase tracking-[0.3em]">Awaiting Visual Input</p>
                   <p className="text-[11px] font-bold uppercase leading-relaxed max-w-[200px] mx-auto">Neural OCR engine fine-tuned for noisy environmental conditions and low-contrast documentation</p>
                 </div>
              </div>
            )}
          </div>
          
          {/* Pronunciation Tooltip */}
          <PronunciationGuideTooltip 
            guide={pronunciationGuide}
            isFetching={isFetchingPronunciation}
            position={pronunciationPos}
            onClose={() => setPronunciationGuide(null)}
          />

          <div className="mt-8 pt-8 border-t border-slate-100">
            <div className="flex items-center gap-4 text-slate-400">
              <div className="p-2 bg-slate-50 rounded-lg">
                <AlertCircle size={14} />
              </div>
              <p className="text-[9px] font-bold uppercase tracking-widest leading-relaxed">
                Precision mode uses adaptive local contrast and edge reinforcement to maximize OCR reliability in challenging environments. Select text for phonetic guide.
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(325px); }
        }
      `}</style>
    </div>
  );
};

export default ImageTranslator;
