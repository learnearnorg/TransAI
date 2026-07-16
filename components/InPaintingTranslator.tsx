
import React, { useState, useRef, useEffect } from 'react';
import { detectAndTranslateLayout } from '../services/geminiService';
import { ProfessionalField, TranslationHistoryItem } from '../types';
import { generateId } from '../utils/id';
import { Loader2, Upload, Download, RefreshCw, Layers, Eye, EyeOff, FileText, Image as ImageIcon, Zap } from 'lucide-react';

interface TextBlock {
  original: string;
  translated: string;
  box_2d: [number, number, number, number]; // [ymin, xmin, ymax, xmax]
  fontSize: number;
  backgroundColor: string;
  textColor: string;
}

interface InPaintingTranslatorProps {
  onSave: (item: TranslationHistoryItem) => void;
  targetLang: string;
  field: ProfessionalField;
}

const InPaintingTranslator: React.FC<InPaintingTranslatorProps> = ({ onSave, targetLang, field }) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [blocks, setBlocks] = useState<TextBlock[]>([]);
  const [showOriginal, setShowOriginal] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      setBlocks([]);
      
      const img = new Image();
      img.src = url;
      img.onload = () => {
        imageRef.current = img;
        renderCanvas(img, []);
      };
    }
  };

  const renderCanvas = (img: HTMLImageElement, textBlocks: TextBlock[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions to match image
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    // Draw original image
    ctx.drawImage(img, 0, 0);

    if (!showOriginal) {
      // Draw in-painting
      textBlocks.forEach(block => {
        const [ymin, xmin, ymax, xmax] = block.box_2d;
        const x = (xmin / 1000) * canvas.width;
        const y = (ymin / 1000) * canvas.height;
        const width = ((xmax - xmin) / 1000) * canvas.width;
        const height = ((ymax - ymin) / 1000) * canvas.height;

        // Draw background box to "mask" original text
        ctx.fillStyle = block.backgroundColor || '#FFFFFF';
        ctx.fillRect(x, y, width, height);

        // Draw translated text
        ctx.fillStyle = block.textColor || '#000000';
        const fontSize = (block.fontSize / 1000) * canvas.height;
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textBaseline = 'top';
        
        // Simple word wrap or fit
        const text = block.translated;
        ctx.fillText(text, x + 2, y + 2, width - 4);
      });
    }
  };

  useEffect(() => {
    if (imageRef.current) {
      renderCanvas(imageRef.current, blocks);
    }
  }, [blocks, showOriginal]);

  const handleInPaint = async () => {
    if (!file || !previewUrl) return;

    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const result = await detectAndTranslateLayout(base64, file.type, targetLang);
        setBlocks(result.blocks);
        
        onSave({
          id: generateId(),
          sourceText: `Image In-Painting: ${file.name}`,
          translatedText: `Translated to ${targetLang} with layout preservation.`,
          sourceLang: 'Auto-Detect',
          targetLang,
          field,
          timestamp: Date.now(),
          type: 'image'
        });
      };
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadResult = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    if (file?.type === 'application/pdf') {
      // @ts-ignore
      const html2pdf = (await import('html2pdf.js')).default || (await import('html2pdf.js'));
      
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const element = document.createElement('div');
      element.innerHTML = `<img src="${imgData}" style="width: 100%; height: auto;" />`;
      
      const opt = {
        margin:       0,
        filename:     `translated_${file.name}`,
        image:        { type: 'jpeg', quality: 1.0 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'px', format: [canvas.width, canvas.height], orientation: canvas.width > canvas.height ? 'landscape' : 'portrait' }
      };
      
      // @ts-ignore
      html2pdf().set(opt).from(element).save();
    } else {
      const link = document.createElement('a');
      link.download = `translated_${file?.name || 'document.png'}`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  return (
    <div className="flex flex-col gap-8 animate-fadeIn">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-500/20">
            <Layers size={20} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase">Neural In-Painting</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Layout-Preserving Document Synthesis</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Controls Panel */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm space-y-6">
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Asset Injection</h4>
              <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-200 rounded-[2rem] cursor-pointer hover:bg-slate-50 transition-all group">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-10 h-10 text-slate-300 group-hover:text-indigo-500 transition-colors mb-4" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Drop Image or PDF</p>
                </div>
                <input type="file" className="hidden" onChange={handleFileChange} accept="image/*,application/pdf" />
              </label>
            </div>

            {file && (
              <div className="space-y-4 animate-fadeIn">
                <div className="p-4 bg-slate-50 rounded-2xl flex items-center gap-3">
                  <div className="p-2 bg-white rounded-xl shadow-sm">
                    {file.type.includes('pdf') ? <FileText size={16} className="text-rose-500" /> : <ImageIcon size={16} className="text-indigo-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-slate-900 truncate uppercase">{file.name}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>

                <button
                  onClick={handleInPaint}
                  disabled={isProcessing}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Synthesizing Layout...
                    </>
                  ) : (
                    <>
                      <RefreshCw size={14} />
                      Initiate In-Painting
                    </>
                  )}
                </button>
              </div>
            )}

            {blocks.length > 0 && (
              <div className="pt-6 border-t border-slate-100 space-y-4 animate-fadeIn">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Output Controls</h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowOriginal(!showOriginal)}
                    className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${showOriginal ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    {showOriginal ? <Eye size={14} /> : <EyeOff size={14} />}
                    {showOriginal ? 'Show Synthesis' : 'Show Original'}
                  </button>
                  <button
                    onClick={downloadResult}
                    className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all"
                  >
                    <Download size={14} />
                    Export Asset
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-8">
          <div className="bg-slate-900 rounded-[3rem] p-4 shadow-2xl min-h-[600px] flex items-center justify-center overflow-hidden relative group">
            {!previewUrl ? (
              <div className="flex flex-col items-center gap-4 text-slate-700">
                <Layers size={48} className="opacity-20" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em]">Neural Canvas Awaiting Input</p>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center overflow-auto custom-scrollbar p-8">
                <canvas 
                  ref={canvasRef} 
                  className="max-w-full h-auto shadow-2xl rounded-lg bg-white"
                />
              </div>
            )}
            
            {isProcessing && (
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-20">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                  <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-500 animate-pulse" size={24} />
                </div>
                <p className="text-[10px] font-black text-white uppercase tracking-[0.4em] animate-pulse">Reconstructing Neural Matrix</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InPaintingTranslator;
