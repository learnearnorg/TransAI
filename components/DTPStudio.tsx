
import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, 
  Layers, 
  Maximize2, 
  Minimize2, 
  Type, 
  Palette, 
  Download, 
  RefreshCw, 
  Loader2, 
  Eye, 
  EyeOff,
  Zap,
  Layout,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Settings2,
  CheckCircle2
} from 'lucide-react';
import { detectAndTranslateLayout } from '../services/geminiService';
import { ProfessionalField, TranslationHistoryItem, UploadedFile } from '../types';
import { generateId } from '../utils/id';

interface TextBlock {
  id: string;
  original: string;
  translated: string;
  box_2d: [number, number, number, number]; // [ymin, xmin, ymax, xmax]
  fontSize: number;
  backgroundColor: string;
  textColor: string;
  alignment: 'left' | 'center' | 'right';
  fontFamily: string;
}

interface DTPStudioProps {
  onSave: (item: TranslationHistoryItem) => void;
  targetLang: string;
  field: ProfessionalField;
  vaultFiles: UploadedFile[];
}

const DTPStudio: React.FC<DTPStudioProps> = ({ onSave, targetLang, field, vaultFiles }) => {
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [blocks, setBlocks] = useState<TextBlock[]>([]);
  const [showOriginal, setShowOriginal] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const handleFileSelect = (file: UploadedFile) => {
    setSelectedFile(file);
    setBlocks([]);
    if (file.content) {
      // If it's an image or PDF that was processed, we might have a URL
      // For this demo, we'll assume we can get a preview
      const img = new Image();
      // Use a placeholder if no real image URL is available in the metadata
      img.src = `https://picsum.photos/seed/${file.id}/1200/1600`;
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

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    ctx.drawImage(img, 0, 0);

    if (!showOriginal) {
      textBlocks.forEach(block => {
        const [ymin, xmin, ymax, xmax] = block.box_2d;
        const x = (xmin / 1000) * canvas.width;
        const y = (ymin / 1000) * canvas.height;
        const width = ((xmax - xmin) / 1000) * canvas.width;
        const height = ((ymax - ymin) / 1000) * canvas.height;

        // Neural Masking
        ctx.fillStyle = block.backgroundColor || '#FFFFFF';
        ctx.fillRect(x, y, width, height);

        // Neural Copy-Fitting & Typography
        ctx.fillStyle = block.textColor || '#000000';
        const fontSize = (block.fontSize / 1000) * canvas.height;
        ctx.font = `${fontSize}px ${block.fontFamily || 'sans-serif'}`;
        ctx.textBaseline = 'top';
        
        if (block.alignment === 'center') {
          ctx.textAlign = 'center';
          ctx.fillText(block.translated, x + width / 2, y + (height - fontSize) / 2, width);
        } else if (block.alignment === 'right') {
          ctx.textAlign = 'right';
          ctx.fillText(block.translated, x + width, y + (height - fontSize) / 2, width);
        } else {
          ctx.textAlign = 'left';
          ctx.fillText(block.translated, x, y + (height - fontSize) / 2, width);
        }

        // Highlight selected block
        if (selectedBlockId === block.id) {
          ctx.strokeStyle = '#6366f1';
          ctx.lineWidth = 4;
          ctx.strokeRect(x, y, width, height);
        }
      });
    }
  };

  useEffect(() => {
    if (imageRef.current) {
      renderCanvas(imageRef.current, blocks);
    }
  }, [blocks, showOriginal, selectedBlockId]);

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    try {
      // In a real app, we'd send the actual file bytes
      // For the demo, we'll simulate the layout detection
      const mockBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
      const result = await detectAndTranslateLayout(mockBase64, 'image/png', targetLang);
      
      const enrichedBlocks = result.blocks.map((b: any) => ({
        ...b,
        id: generateId(),
        alignment: 'left',
        fontFamily: 'Inter, sans-serif'
      }));

      setBlocks(enrichedBlocks);
      
      onSave({
        id: generateId(),
        sourceText: `DTP Project: ${selectedFile.name}`,
        translatedText: `Advanced Layout Preservation for ${targetLang}`,
        sourceLang: 'Auto',
        targetLang,
        field,
        timestamp: Date.now(),
        type: 'inpaint'
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const updateBlock = (id: string, updates: Partial<TextBlock>) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const selectedBlock = blocks.find(b => b.id === selectedBlockId);

  return (
    <div className="flex flex-col gap-8 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
            <Layout className="text-indigo-600" />
            Advanced DTP Studio
          </h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Neural Layout Preservation & Visual Copy-Fitting
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setZoom(prev => Math.max(0.5, prev - 0.1))}
            className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
          >
            <Minimize2 size={16} />
          </button>
          <span className="text-[10px] font-black text-slate-400 w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button 
            onClick={() => setZoom(prev => Math.min(2, prev + 0.1))}
            className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Workspace Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm space-y-6">
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Document Selection</h4>
              <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                {vaultFiles.filter(f => f.type === 'IMAGE' || f.type === 'PDF').map(file => (
                  <button
                    key={file.id}
                    onClick={() => handleFileSelect(file)}
                    className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all ${selectedFile?.id === file.id ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}`}
                  >
                    <div className={`p-2 rounded-xl ${selectedFile?.id === file.id ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400'}`}>
                      <FileText size={14} />
                    </div>
                    <div className="flex flex-col items-start min-w-0">
                      <span className="text-[10px] font-black text-slate-900 truncate w-full uppercase">{file.name}</span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase">{file.size}</span>
                    </div>
                    {selectedFile?.id === file.id && <CheckCircle2 size={14} className="text-indigo-600 ml-auto" />}
                  </button>
                ))}
                {vaultFiles.filter(f => f.type === 'IMAGE' || f.type === 'PDF').length === 0 && (
                  <p className="text-[10px] font-bold text-slate-400 italic text-center py-4">No compatible assets in vault.</p>
                )}
              </div>
            </div>

            {selectedFile && (
              <button
                onClick={handleAnalyze}
                disabled={isProcessing}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Neural Reconstruction...
                  </>
                ) : (
                  <>
                    <Zap size={14} />
                    Initiate Layout Audit
                  </>
                )}
              </button>
            )}

            {blocks.length > 0 && (
              <div className="pt-6 border-t border-slate-100 space-y-6 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Block Inspector</h4>
                  <button 
                    onClick={() => setShowOriginal(!showOriginal)}
                    className="text-[9px] font-black text-indigo-600 uppercase flex items-center gap-1"
                  >
                    {showOriginal ? <Eye size={12} /> : <EyeOff size={12} />}
                    {showOriginal ? 'Synthesis' : 'Original'}
                  </button>
                </div>

                {selectedBlock ? (
                  <div className="space-y-4 p-4 bg-slate-50 rounded-3xl border border-slate-100">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Translation Refinement</label>
                      <textarea 
                        value={selectedBlock.translated}
                        onChange={(e) => updateBlock(selectedBlock.id, { translated: e.target.value })}
                        className="w-full h-24 bg-white border border-slate-200 rounded-xl p-3 text-[11px] font-bold text-slate-900 focus:outline-none focus:border-indigo-400 resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Font Size</label>
                        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
                          <Type size={14} className="text-slate-400" />
                          <input 
                            type="number" 
                            value={selectedBlock.fontSize}
                            onChange={(e) => updateBlock(selectedBlock.id, { fontSize: Number(e.target.value) })}
                            className="w-full text-[11px] font-bold text-slate-900 focus:outline-none"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Alignment</label>
                        <div className="flex bg-white border border-slate-200 rounded-xl p-1">
                          <button 
                            onClick={() => updateBlock(selectedBlock.id, { alignment: 'left' })}
                            className={`flex-1 p-1.5 rounded-lg transition-all ${selectedBlock.alignment === 'left' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-50'}`}
                          >
                            <AlignLeft size={14} />
                          </button>
                          <button 
                            onClick={() => updateBlock(selectedBlock.id, { alignment: 'center' })}
                            className={`flex-1 p-1.5 rounded-lg transition-all ${selectedBlock.alignment === 'center' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-50'}`}
                          >
                            <AlignCenter size={14} />
                          </button>
                          <button 
                            onClick={() => updateBlock(selectedBlock.id, { alignment: 'right' })}
                            className={`flex-1 p-1.5 rounded-lg transition-all ${selectedBlock.alignment === 'right' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-50'}`}
                          >
                            <AlignRight size={14} />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Text Color</label>
                        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
                          <Palette size={14} className="text-slate-400" />
                          <input 
                            type="color" 
                            value={selectedBlock.textColor}
                            onChange={(e) => updateBlock(selectedBlock.id, { textColor: e.target.value })}
                            className="w-6 h-6 rounded-md cursor-pointer"
                          />
                          <span className="text-[10px] font-bold text-slate-900 uppercase">{selectedBlock.textColor}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Background</label>
                        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
                          <Settings2 size={14} className="text-slate-400" />
                          <input 
                            type="color" 
                            value={selectedBlock.backgroundColor}
                            onChange={(e) => updateBlock(selectedBlock.id, { backgroundColor: e.target.value })}
                            className="w-6 h-6 rounded-md cursor-pointer"
                          />
                          <span className="text-[10px] font-bold text-slate-900 uppercase">{selectedBlock.backgroundColor}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 border-2 border-dashed border-slate-100 rounded-3xl text-center">
                    <p className="text-[10px] font-bold text-slate-300 uppercase leading-relaxed">Select a text block on the canvas to refine its properties</p>
                  </div>
                )}

                <button className="w-full py-3 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all">
                  <Download size={14} />
                  Export DTP Asset
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Studio Canvas */}
        <div className="lg:col-span-8">
          <div className="bg-slate-900 rounded-[3rem] p-8 shadow-2xl min-h-[700px] flex items-center justify-center overflow-auto custom-scrollbar relative">
            {!selectedFile ? (
              <div className="flex flex-col items-center gap-4 text-slate-700">
                <Layout size={64} className="opacity-20" />
                <p className="text-[11px] font-black uppercase tracking-[0.4em]">Neural Studio Awaiting Asset</p>
              </div>
            ) : (
              <div 
                className="relative transition-transform duration-300 origin-center"
                style={{ transform: `scale(${zoom})` }}
              >
                <canvas 
                  ref={canvasRef} 
                  onClick={(e) => {
                    const rect = canvasRef.current?.getBoundingClientRect();
                    if (!rect) return;
                    const x = ((e.clientX - rect.left) / rect.width) * 1000;
                    const y = ((e.clientY - rect.top) / rect.height) * 1000;
                    
                    const clickedBlock = blocks.find(b => {
                      const [ymin, xmin, ymax, xmax] = b.box_2d;
                      return x >= xmin && x <= xmax && y >= ymin && y <= ymax;
                    });
                    setSelectedBlockId(clickedBlock?.id || null);
                  }}
                  className="max-w-none h-auto shadow-2xl rounded-lg bg-white cursor-crosshair"
                />
              </div>
            )}

            {isProcessing && (
              <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md flex flex-col items-center justify-center gap-6 z-30">
                <div className="relative">
                  <div className="w-24 h-24 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                  <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-500 animate-pulse" size={32} />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-[12px] font-black text-white uppercase tracking-[0.5em] animate-pulse">Reconstructing Neural Layout</p>
                  <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">Mapping Semantic Coordinates & Typography</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DTPStudio;
