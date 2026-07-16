
import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, XCircle, Loader2, Download, Trash2, Layers, Zap, FileCode, FileType, Eye, Globe, Copy, Check } from 'lucide-react';
import { translateText, extractTextFromAsset, processHtmlImagesForOCR } from '../services/geminiService';
import { ProfessionalField, LinguisticPersona, StyleGuide } from '../types';
import mammoth from 'mammoth';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

interface BatchFile {
  id: string;
  file: File;
  status: 'idle' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: string;
  error?: string;
  extractedText?: string;
  groundingSources?: any[];
}

interface BatchProcessorProps {
  field: ProfessionalField;
  persona: LinguisticPersona;
  targetLang: string;
  customStyleGuide?: string;
  styleGuides?: StyleGuide[];
}

const BatchProcessor: React.FC<BatchProcessorProps> = ({ field, persona, targetLang, customStyleGuide, styleGuides = [] }) => {
  const [files, setFiles] = useState<BatchFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [useGrounding, setUseGrounding] = useState(false);
  const [previewFile, setPreviewFile] = useState<BatchFile | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  const [projectName, setProjectName] = useState('');

  const handleCopyPreview = async () => {
    if (!previewFile?.result && !previewFile?.extractedText) return;
    const text = previewFile.result || previewFile.extractedText || "";
    
    try {
      const markdownBody = previewContainerRef.current?.querySelector('.markdown-body');
      if (markdownBody && window.ClipboardItem) {
        const clone = markdownBody.cloneNode(true) as HTMLElement;
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
        const blobText = new Blob([text], { type: 'text/plain' });
        const data = [new ClipboardItem({ 'text/html': blobHtml, 'text/plain': blobText })];
        await navigator.clipboard.write(data);
      } else {
        await navigator.clipboard.writeText(text);
      }
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed', err);
      navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const newFiles: BatchFile[] = selectedFiles.map(f => ({
      id: Math.random().toString(36).substring(2, 9),
      file: f,
      status: 'idle',
      progress: 0
    }));
    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const processBatch = async () => {
    if (files.length === 0 || isProcessing) return;
    setIsProcessing(true);

    const updatedFiles = [...files];
    
    for (let i = 0; i < updatedFiles.length; i++) {
      if (updatedFiles[i].status === 'completed') continue;

      const currentFile = updatedFiles[i];
      currentFile.status = 'processing';
      currentFile.progress = 10;
      setFiles([...updatedFiles]);

      try {
        let textToTranslate = '';
        const fileType = currentFile.file.name.split('.').pop()?.toLowerCase();

        if (fileType === 'docx') {
          const arrayBuffer = await currentFile.file.arrayBuffer();
          try {
            const result = await mammoth.convertToHtml({ arrayBuffer });
            textToTranslate = await processHtmlImagesForOCR(result.value);
          } catch (mammothErr: any) {
            throw new Error(`Failed to parse DOCX file. It might be corrupted or not a valid Word document. (${mammothErr.message})`);
          }
        } else if (fileType === 'pdf' || fileType === 'ppt' || fileType === 'pptx' || fileType === 'png' || fileType === 'jpg' || fileType === 'jpeg' || fileType === 'webp') {
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve) => {
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.readAsDataURL(currentFile.file);
          });
          const base64 = await base64Promise;
          let mimeType = 'application/octet-stream';
          if (fileType === 'pdf') mimeType = 'application/pdf';
          else if (fileType === 'ppt') mimeType = 'application/vnd.ms-powerpoint';
          else if (fileType === 'pptx') mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
          else if (fileType === 'png') mimeType = 'image/png';
          else if (fileType === 'jpg' || fileType === 'jpeg') mimeType = 'image/jpeg';
          else if (fileType === 'webp') mimeType = 'image/webp';
          
          textToTranslate = await extractTextFromAsset(base64, mimeType);
        } else if (fileType === 'txt' || fileType === 'md' || fileType === 'html' || fileType === 'json') {
          textToTranslate = await currentFile.file.text();
        } else {
          throw new Error(`Unsupported file type: ${fileType}`);
        }

        currentFile.progress = 30;
        currentFile.extractedText = textToTranslate;
        setFiles([...updatedFiles]);

        const styleGuide = typeof persona === 'string' && persona.startsWith('Style: ') ? styleGuides.find(g => `Style: ${g.name}` === persona) : null;
        const finalPersona = styleGuide ? 'Custom Guide' : persona;
        const finalContext = styleGuide ? styleGuide.instructions : (customStyleGuide || '');
        const customInstructions = styleGuide ? styleGuide.instructions : '';

        const isJson = fileType === 'json';
        const formatInstructions = isJson 
          ? `PRESERVE EXACT JSON STRUCTURE AND KEYS. ONLY TRANSLATE THE STRING VALUES. ${finalContext}`
          : `PRESERVE ALL HTML TAGS AND ATTRIBUTES. ONLY TRANSLATE THE TEXT CONTENT WITHIN TAGS. ${finalContext}`;

        // Translate with layout preservation instruction
        const result = await translateText(
          textToTranslate, 
          'Auto', 
          targetLang, 
          field, 
          [], 
          'Standard', 
          formatInstructions, 
          finalPersona,
          [],
          customInstructions,
          useGrounding
        );

        currentFile.result = result.text;
        currentFile.groundingSources = result.sources || [];
        currentFile.status = 'completed';
        currentFile.progress = 100;
      } catch (err: any) {
        currentFile.status = 'failed';
        currentFile.error = err.message || 'Synthesis failed';
      }
      setFiles([...updatedFiles]);
    }

    setIsProcessing(false);
  };

  const downloadFile = async (batchFile: BatchFile) => {
    if (!batchFile.result) return;
    
    const isDocx = batchFile.file.name.endsWith('.docx') || batchFile.file.name.endsWith('.doc');
    const isHtml = batchFile.file.name.endsWith('.html');
    const isPdf = batchFile.file.name.endsWith('.pdf');
    
    if (isPdf) {
      const { marked } = await import('marked');
      // @ts-ignore
      const html2pdf = (await import('html2pdf.js')).default || (await import('html2pdf.js'));
      
      const htmlContent = await marked.parse(batchFile.result);
      const element = document.createElement('div');
      element.innerHTML = `
        <div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6;">
          ${htmlContent}
        </div>
      `;
      
      const opt = {
        margin:       10,
        filename:     `translated_${batchFile.file.name}`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      
      // @ts-ignore
      html2pdf().set(opt).from(element).output('blob').then((blob: Blob) => {
        saveAs(blob, `translated_${batchFile.file.name}`);
      });
      return;
    }
    
    if (isDocx) {
      let htmlContent = batchFile.result;
      if (!htmlContent.includes('<html')) {
        htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid black; padding: 8px; text-align: left; }</style></head><body>${htmlContent}</body></html>`;
      }
      const blob = new Blob([htmlContent], { type: 'application/vnd.ms-word' });
      saveAs(blob, `translated_${batchFile.file.name.replace(/\.docx?$/, '.doc')}`);
    } else {
      const isJson = batchFile.file.name.endsWith('.json');
      const type = isHtml ? 'text/html' : isJson ? 'application/json' : 'text/markdown';
      const ext = isHtml ? 'html' : isJson ? 'json' : 'md';
      const blob = new Blob([batchFile.result], { type });
      saveAs(blob, `translated_${batchFile.file.name.split('.')[0]}.${ext}`);
    }
  };

  const downloadAll = async () => {
    const zip = new JSZip();
    
    // We need to wait for all PDF conversions if any
    const promises = files.map(async (f) => {
      if (f.result) {
        const isDocx = f.file.name.endsWith('.docx') || f.file.name.endsWith('.doc');
        const isHtml = f.file.name.endsWith('.html');
        const isPdf = f.file.name.endsWith('.pdf');
        
        if (isPdf) {
          const { marked } = await import('marked');
          // @ts-ignore
          const html2pdf = (await import('html2pdf.js')).default || (await import('html2pdf.js'));
          
          const htmlContent = await marked.parse(f.result);
          const element = document.createElement('div');
          element.innerHTML = `
            <div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6;">
              ${htmlContent}
            </div>
          `;
          
          const opt = {
            margin:       10,
            filename:     `translated_${f.file.name}`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2 },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
          };
          
          // @ts-ignore
          const blob = await html2pdf().set(opt).from(element).output('blob');
          zip.file(`translated_${f.file.name}`, blob);
        } else if (isDocx) {
          let htmlContent = f.result;
          if (!htmlContent.includes('<html')) {
            htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid black; padding: 8px; text-align: left; }</style></head><body>${htmlContent}</body></html>`;
          }
          const blob = new Blob([htmlContent], { type: 'application/vnd.ms-word' });
          zip.file(`translated_${f.file.name.replace(/\.docx?$/, '.doc')}`, blob);
        } else {
          const isJson = f.file.name.endsWith('.json');
          const ext = isHtml ? 'html' : isJson ? 'json' : 'md';
          zip.file(`translated_${f.file.name.split('.')[0]}.${ext}`, f.result);
        }
      }
    });

    await Promise.all(promises);

    const content = await zip.generateAsync({ type: 'blob' });
    const zipName = projectName ? `${projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_translations.zip` : 'batch_translation_package.zip';
    saveAs(content, zipName);
  };

  return (
    <div className="flex flex-col gap-8 animate-fadeIn">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg">
              <Layers size={24} />
            </div>
            Batch Project Management
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Project Name:</span>
            <input 
              type="text" 
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g., Q3 Marketing Assets"
              className="bg-white border border-slate-200 text-slate-900 text-sm font-bold rounded-xl px-4 py-2 outline-none focus:border-indigo-500 w-64 shadow-sm"
            />
          </div>
        </div>
        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">High-Volume Synthesis & Layout Preservation</p>
      </div>

      <div className="flex flex-col gap-8">
        {/* Upload & Controls */}
        <div className="space-y-6">
          <div 
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            className="aspect-square border-2 border-dashed border-slate-200 rounded-[3rem] bg-white flex flex-col items-center justify-center gap-4 hover:border-indigo-500 hover:bg-indigo-50/30 transition-all cursor-pointer group shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/30"
            aria-label="Upload files for batch processing"
          >
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-indigo-500 group-hover:scale-110 transition-all">
              <Upload size={32} />
            </div>
            <div className="text-center px-6">
              <p className="text-sm font-black text-slate-900 uppercase tracking-widest">Inject Data Packets</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">DOC, DOCX, PDF, TXT, MD, HTML, JSON, IMAGES (Max 100 files)</p>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple accept=".doc,.docx,.pdf,.txt,.md,.html,.json,.ppt,.pptx,.png,.jpg,.jpeg,.webp" />
          </div>

          <div className="bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-2xl" />
            <div className="relative z-10 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Target Matrix</span>
                <span className="text-[10px] font-black text-white uppercase">{targetLang}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Field Domain</span>
                <span className="text-[10px] font-black text-white uppercase">{field}</span>
              </div>
              <button 
                onClick={() => setUseGrounding(!useGrounding)}
                className={`w-full py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2 ${useGrounding ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300' : 'bg-white/5 border-white/10 text-white/40 hover:border-white/30'}`}
              >
                <Globe size={14} />
                {useGrounding ? 'Neural Grounding Active' : 'Enable Web Grounding'}
              </button>
              <button 
                onClick={processBatch}
                disabled={files.length === 0 || isProcessing}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} fill="currentColor" />}
                {isProcessing ? 'Processing...' : 'Initialize Batch Synthesis'}
              </button>
              
              {isProcessing && (
                <div className="mt-4 space-y-2 animate-fadeIn">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-indigo-300">
                    <span>Translating file {files.filter(f => f.status === 'completed' || f.status === 'failed').length + 1} of {files.length}...</span>
                    <span>{Math.round((files.filter(f => f.status === 'completed' || f.status === 'failed').length / files.length) * 100)}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 transition-all duration-500" 
                      style={{ width: `${Math.round((files.filter(f => f.status === 'completed' || f.status === 'failed').length / files.length) * 100)}%` }} 
                    />
                  </div>
                </div>
              )}

              {files.some(f => f.status === 'completed') && (
                <button 
                  onClick={downloadAll}
                  className="w-full py-4 bg-white/10 border border-white/20 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/20 transition-all flex items-center justify-center gap-3"
                >
                  <Download size={16} /> Download All (.zip)
                </button>
              )}
            </div>
          </div>
        </div>

        {/* File List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-4">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Queue Status ({files.length} Files)</span>
            {files.length > 0 && (
              <button onClick={() => setFiles([])} className="text-[9px] font-black text-rose-500 uppercase hover:underline">Clear Queue</button>
            )}
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
            {files.length === 0 ? (
              <div className="h-40 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] flex items-center justify-center text-slate-300 italic text-xs uppercase tracking-widest">
                No files in synthesis queue
              </div>
            ) : (
              files.map(f => (
                <div key={f.id} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex items-center gap-6 group hover:shadow-md transition-all">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${f.status === 'completed' ? 'bg-emerald-50 text-emerald-500' : f.status === 'failed' ? 'bg-rose-50 text-rose-500' : 'bg-slate-50 text-slate-400'}`}>
                    {f.file.name.endsWith('.docx') ? <FileType size={24} /> : <FileText size={24} />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-black text-slate-900 truncate pr-4">{f.file.name}</p>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">{(f.file.size / 1024).toFixed(1)} KB</span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${f.status === 'failed' ? 'bg-rose-500' : 'bg-indigo-500'}`}
                          style={{ width: `${f.progress}%` }}
                        />
                      </div>
                      <span className={`text-[9px] font-black uppercase tracking-widest ${f.status === 'completed' ? 'text-emerald-600' : f.status === 'failed' ? 'text-rose-600' : 'text-indigo-600'}`}>
                        {f.status}
                      </span>
                    </div>

                    {f.groundingSources && f.groundingSources.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {f.groundingSources.slice(0, 3).map((src, i) => (
                          <a 
                            key={i} 
                            href={src.web?.uri} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[8px] font-bold text-indigo-500 hover:underline flex items-center gap-1"
                          >
                            <Globe size={8} />
                            {src.web?.title || 'Source'}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {f.extractedText && (
                      <button 
                        onClick={() => setPreviewFile(f)}
                        className="p-2 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        title="Preview Content"
                        aria-label={`Preview content of ${f.file.name}`}
                      >
                        <Eye size={18} />
                      </button>
                    )}
                    {f.status === 'completed' && (
                      <button 
                        onClick={() => downloadFile(f)}
                        className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        title="Download Result"
                        aria-label={`Download translated ${f.file.name}`}
                      >
                        <Download size={18} />
                      </button>
                    )}
                    <button 
                      onClick={() => removeFile(f.id)}
                      disabled={isProcessing && f.status === 'processing'}
                      className="p-2 text-slate-300 hover:text-rose-500 transition-all focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                      title="Remove File"
                      aria-label={`Remove ${f.file.name} from queue`}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="bg-indigo-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-500/30" />
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white/10 rounded-2xl">
                <FileCode size={24} className="text-indigo-300" />
              </div>
              <div>
                <h4 className="text-[11px] font-black uppercase tracking-widest mb-2 text-indigo-300">Layout Preservation Protocol</h4>
                <p className="text-xs font-bold opacity-80 leading-relaxed">
                  The Neural Batch Processor utilizes specialized parsing to isolate linguistic content from structural metadata. 
                  This ensures that tables, headers, and stylistic markers remain intact while the underlying text is localized.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-4xl max-h-[80vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-indigo-600 text-white rounded-2xl">
                  <Eye size={20} />
                </div>
                <div>
                  <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-widest">Content Preview</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest opacity-60">{previewFile.file.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleCopyPreview}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isCopied ? 'bg-green-500 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  {isCopied ? <Check size={14} /> : <Copy size={14} />}
                  {isCopied ? 'Copied' : 'Copy'}
                </button>
                <button 
                  onClick={() => setPreviewFile(null)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <Trash2 size={20} className="text-slate-400" />
                </button>
              </div>
            </div>
            <div ref={previewContainerRef} className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <div className="markdown-body prose prose-indigo max-w-none text-slate-700 leading-relaxed font-medium">
                <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                  {previewFile.result || previewFile.extractedText || "No content available."}
                </Markdown>
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setPreviewFile(null)}
                className="px-8 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-200"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchProcessor;
