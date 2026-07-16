import React, { useState, useRef } from 'react';
import { FileText, Download, Loader2, ArrowRight, File, RefreshCw, X } from 'lucide-react';
import mammoth from 'mammoth';
import { translateDocumentHtml, processHtmlImagesForOCR } from '../services/geminiService';
import { ProfessionalField } from '../types';
import { useToast } from './ToastContext';

interface DocumentTranslatorProps {
  targetLang: string;
  field: ProfessionalField;
  vaultFiles?: any[];
}

const DocumentTranslator: React.FC<DocumentTranslatorProps> = ({ targetLang, field, vaultFiles = [] }) => {
  const [sourceHtml, setSourceHtml] = useState<string>('');
  const [translatedHtml, setTranslatedHtml] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isBilingualExport, setIsBilingualExport] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const [showVaultSelect, setShowVaultSelect] = useState(false);
  const { showToast } = useToast();

  const handleSelectFromVault = async (id: string) => {
    const file = vaultFiles.find(f => f.id === id);
    if (!file) return;

    if (!file.name.endsWith('.docx') && !file.name.endsWith('.doc')) {
      showToast('Please select a .docx or .doc file from the vault.', 'error');
      return;
    }

    setFileName(file.name);
    setIsProcessing(true);
    setShowVaultSelect(false);
    setSourceHtml('');
    setTranslatedHtml('');

    try {
      // Fetch the file from server
      const res = await fetch(`/api/vault/download/${encodeURIComponent(file.id)}`);
      if (!res.ok) throw new Error("Failed to download file from vault");
      const blob = await res.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      const processedHtml = await processHtmlImagesForOCR(result.value);
      setSourceHtml(processedHtml);
      showToast(`Loaded ${file.name} from vault. Images OCR'd if any limit.`, 'success');
    } catch (error: any) {
      console.error('Error loading vault file:', error);
      showToast(error.message || 'Failed to load document from vault.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTranslate = async () => {
    if (!sourceHtml) return;
    
    setIsProcessing(true);
    try {
      // For very large documents, we might need to chunk the HTML, 
      // but for now we'll pass it directly to Gemini 1.5 Pro which has a huge context window.
      const result = await translateDocumentHtml(sourceHtml, 'Auto', targetLang, field);
      setTranslatedHtml(result);
      showToast('Document translated successfully!', 'success');
    } catch (error) {
      console.error('Translation error:', error);
      showToast('Failed to translate document.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = () => {
    if (!translatedHtml) return;
    
    try {
      let content = translatedHtml;
      
      if (isBilingualExport && sourceHtml) {
        content = `
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <th style="width: 50%; text-align: left; padding: 10px; border-bottom: 2px solid #ccc; border-right: 1px solid #ccc;">Source</th>
              <th style="width: 50%; text-align: left; padding: 10px; border-bottom: 2px solid #ccc;">Target (${targetLang})</th>
            </tr>
            <tr>
              <td style="width: 50%; vertical-align: top; padding: 10px; border-right: 1px solid #ccc;">
                ${sourceHtml}
              </td>
              <td style="width: 50%; vertical-align: top; padding: 10px;">
                ${translatedHtml}
              </td>
            </tr>
          </table>
        `;
      }

      const fullHtml = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
          <head>
            <meta charset="UTF-8">
            <title>Export</title>
            <style>
              body { font-family: Arial, sans-serif; }
              p { margin-bottom: 10px; }
              table { border-collapse: collapse; width: 100%; }
              td, th { border: 1px solid #ddd; padding: 8px; }
            </style>
          </head>
          <body>
            ${content}
          </body>
        </html>
      `;
      
      const blob = new Blob(['\ufeff', fullHtml], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Translated_${fileName.replace('.docx', '')}.doc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Document exported successfully!', 'success');
    } catch (error) {
      console.error('Export error:', error);
      showToast('Failed to export document.', 'error');
    }
  };

  return (
    <div className="flex flex-col h-full gap-6 animate-fadeIn">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
            <FileText size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Document Translator</h2>
            <p className="text-sm text-slate-400">Side-by-side preview & export for DOCX files</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          {sourceHtml && !translatedHtml && (
            <button 
              onClick={handleTranslate}
              disabled={isProcessing}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-medium text-xs whitespace-nowrap shadow-lg shadow-indigo-500/20 disabled:opacity-50"
            >
              {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Translate
            </button>
          )}
          
          {translatedHtml && (
            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-300 cursor-pointer bg-slate-800/50 px-3 py-2 rounded-xl border border-slate-700">
                <input 
                  type="checkbox" 
                  checked={isBilingualExport}
                  onChange={(e) => setIsBilingualExport(e.target.checked)}
                  className="rounded border-slate-600 bg-slate-700 text-indigo-500 focus:ring-indigo-500"
                />
                Bilingual Mode
              </label>
              <button 
                onClick={handleExport}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all font-medium text-xs whitespace-nowrap shadow-lg shadow-emerald-500/20"
              >
                <Download size={16} />
                Export
              </button>
            </div>
          )}
        </div>
      </div>

      {!sourceHtml && !isProcessing && (
        <div className="flex-1 border-2 border-dashed border-slate-700 rounded-2xl flex flex-col items-center justify-center text-slate-400 gap-4 bg-slate-800/30 overflow-auto p-8 relative">
          {!showVaultSelect ? (
            <>
              <File size={48} className="text-slate-500" />
              <p className="text-center max-w-md">No document loaded. Select a document from your Secret Vault to begin side-by-side translation.</p>
              <button 
                onClick={() => setShowVaultSelect(true)}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all font-medium shadow-lg shadow-indigo-500/20"
              >
                Choose from Vault
              </button>
            </>
          ) : (
            <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl animate-scaleIn">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-indigo-400">Select Document (DOCX/DOC Only)</h3>
                <button onClick={() => setShowVaultSelect(false)} className="p-1 hover:bg-slate-800 rounded-lg"><X size={16} /></button>
              </div>
              <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
                {vaultFiles.filter(f => f.name.endsWith('.docx') || f.name.endsWith('.doc')).length === 0 ? (
                  <div className="py-12 text-center text-slate-500 italic text-xs">No DOCX or DOC files found in your vault. Upload them to the Secret Vault first.</div>
                ) : (
                  vaultFiles.filter(f => f.name.endsWith('.docx') || f.name.endsWith('.doc')).map(file => (
                    <button
                      key={file.id}
                      onClick={() => handleSelectFromVault(file.id)}
                      className="w-full text-left p-4 rounded-2xl bg-slate-800/50 hover:bg-indigo-900/30 border border-slate-700 hover:border-indigo-500/50 transition-all flex items-center gap-4 group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center text-slate-400 group-hover:bg-indigo-500/20 group-hover:text-indigo-400 transition-colors">
                        <FileText size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-white truncate">{file.name}</div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-tighter">{(file.size / 1024).toFixed(1)} KB • Vault Asset</div>
                      </div>
                      <ArrowRight size={16} className="text-slate-600 group-hover:text-indigo-400 -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all" />
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {isProcessing && !sourceHtml && !translatedHtml && (
        <div className="flex-1 border-2 border-slate-700 rounded-2xl flex flex-col items-center justify-center text-indigo-400 gap-4 bg-slate-800/30">
          <Loader2 size={48} className="animate-spin" />
          <p className="font-medium animate-pulse">Processing Document...</p>
        </div>
      )}

      {sourceHtml && (
        <div className="flex-1 flex flex-col gap-6 min-h-0 overflow-auto">
          {/* Original Document */}
          <div className="flex flex-col bg-slate-800 rounded-2xl border border-slate-700 h-[60vh] shrink-0">
            <div className="p-3 border-b border-slate-700 bg-slate-800/80 flex items-center justify-between shadow-sm z-10">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Original</span>
              <span className="text-[10px] text-slate-500 truncate max-w-[150px]">{fileName}</span>
            </div>
            <div className="flex-1 overflow-auto p-4 lg:p-8 bg-white text-black document-preview rounded-b-2xl">
              <div dangerouslySetInnerHTML={{ __html: sourceHtml }} />
            </div>
          </div>

          {/* Translated Document */}
          <div className="flex flex-col bg-slate-800 rounded-2xl border border-slate-700 relative h-[60vh] shrink-0">
            <div className="p-3 border-b border-slate-700 bg-slate-800/80 flex items-center justify-between shadow-sm z-10">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Target ({targetLang})</span>
            </div>
            
            {isProcessing && sourceHtml && !translatedHtml ? (
              <div className="absolute inset-0 z-10 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-indigo-400 gap-4 rounded-b-2xl">
                <Loader2 size={32} className="animate-spin" />
                <p className="font-medium animate-pulse">Translating layout and text...</p>
              </div>
            ) : null}
            
            <div className="flex-1 overflow-auto p-4 lg:p-8 bg-white text-black document-preview rounded-b-2xl">
              {translatedHtml ? (
                <div 
                  contentEditable 
                  suppressContentEditableWarning
                  role="textbox"
                  aria-label="Translated document content"
                  onBlur={(e) => setTranslatedHtml(e.currentTarget.innerHTML)}
                  dangerouslySetInnerHTML={{ __html: translatedHtml }} 
                  className="outline-none focus:ring-2 focus:ring-indigo-500/50 rounded"
                />
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400">
                  <p>Click "Translate Document" to generate preview.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        .document-preview p { margin-bottom: 1em; line-height: 1.5; }
        .document-preview h1 { font-size: 2em; font-weight: bold; margin-bottom: 0.5em; }
        .document-preview h2 { font-size: 1.5em; font-weight: bold; margin-bottom: 0.5em; }
        .document-preview h3 { font-size: 1.17em; font-weight: bold; margin-bottom: 0.5em; }
        .document-preview table { border-collapse: collapse; width: 100%; margin-bottom: 1em; }
        .document-preview td, .document-preview th { border: 1px solid #ccc; padding: 8px; }
        .document-preview ul { list-style-type: disc; margin-left: 2em; margin-bottom: 1em; }
        .document-preview ol { list-style-type: decimal; margin-left: 2em; margin-bottom: 1em; }
      `}</style>
    </div>
  );
};

export default DocumentTranslator;
