import React, { useState, useRef } from 'react';
import { Image as ImageIcon, FileJson, Sparkles, Loader2, RefreshCw, Upload, ArrowRight } from 'lucide-react';
import LanguageSelector from './LanguageSelector';
import { getApiKey, uiSyncTranslate } from '../services/geminiService';

interface UISyncTranslatorProps {
  sourceLang: string;
  targetLang: string;
  setTargetLang: (lang: string) => void;
}

export default function UISyncTranslator({ sourceLang, targetLang, setTargetLang }: UISyncTranslatorProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [jsonContent, setJsonContent] = useState<string>('{\n  "button_book": "Book",\n  "header_welcome": "Welcome back",\n  "status_live": "Live"\n}');
  
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedJson, setTranslatedJson] = useState<string | null>(null);
  const [contextExplanation, setContextExplanation] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setMimeType(file.type);
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setImagePreview(result);
        setImageBase64(result.split(',')[1]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTranslate = async () => {
    if (!imageBase64 || !jsonContent) return;
    
    setIsTranslating(true);
    setTranslatedJson(null);
    setContextExplanation(null);

    try {
      const data = await uiSyncTranslate(imageBase64, mimeType, jsonContent, sourceLang, targetLang);
      setTranslatedJson(data.translatedJson);
      setContextExplanation(data.contextExplanation);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Translation failed');
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-8 bg-white border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200">
            <ImageIcon className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Visual Context Sync</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
              Multimodal UI Translation
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
            <span className="text-xs font-black text-slate-600 uppercase tracking-widest">{sourceLang}</span>
            <ArrowRight size={14} className="text-slate-400" />
            <LanguageSelector value={targetLang} onChange={setTargetLang} className="w-[140px]" />
          </div>
          <button 
            onClick={handleTranslate}
            disabled={isTranslating || !imageBase64 || !jsonContent}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg disabled:opacity-50 disabled:hover:bg-indigo-600 flex items-center gap-2"
          >
            {isTranslating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {isTranslating ? 'Syncing...' : 'Sync & Translate'}
          </button>
        </div>
      </div>

      <div className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 overflow-hidden">
        
        {/* Left Column: Inputs */}
        <div className="flex flex-col gap-6 overflow-hidden">
          
          {/* Image Upload */}
          <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <ImageIcon size={14} className="text-indigo-500" /> UI Screenshot
              </h3>
              {imagePreview && (
                <button onClick={() => {setImagePreview(null); setImageBase64(null);}} className="text-[10px] font-bold text-slate-400 hover:text-rose-500 uppercase tracking-wider">
                  Clear
                </button>
              )}
            </div>
            <div className="flex-1 relative bg-slate-900 group">
              {imagePreview ? (
                <img src={imagePreview} alt="UI Preview" className="w-full h-full object-contain" />
              ) : (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-800 transition-colors"
                >
                  <Upload size={32} className="text-slate-500 mb-4" />
                  <p className="text-sm font-bold text-slate-400">Click to upload UI screenshot</p>
                  <p className="text-xs text-slate-500 mt-1">JPEG, PNG, WebP</p>
                </div>
              )}
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
            </div>
          </div>

          {/* JSON Input */}
          <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <FileJson size={14} className="text-indigo-500" /> Source JSON
              </h3>
            </div>
            <textarea 
              value={jsonContent}
              onChange={(e) => setJsonContent(e.target.value)}
              className="flex-1 w-full p-4 bg-slate-950 text-emerald-400 font-mono text-sm resize-none focus:outline-none custom-scrollbar"
              spellCheck={false}
            />
          </div>

        </div>

        {/* Right Column: Output */}
        <div className="flex flex-col gap-6 overflow-hidden">
          
          {/* Context Explanation */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden shrink-0">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <Sparkles size={14} className="text-amber-500" /> Visual Context Analysis
              </h3>
            </div>
            <div className="p-6 bg-amber-50/30 min-h-[120px]">
              {isTranslating ? (
                <div className="flex items-center gap-3 text-amber-600/60 animate-pulse">
                  <RefreshCw size={16} className="animate-spin" />
                  <span className="text-sm font-medium">Analyzing UI layout and visual hierarchy...</span>
                </div>
              ) : contextExplanation ? (
                <p className="text-sm text-slate-700 leading-relaxed">{contextExplanation}</p>
              ) : (
                <p className="text-sm text-slate-400 italic">Upload an image and JSON to see how visual context influences the translation.</p>
              )}
            </div>
          </div>

          {/* Translated JSON */}
          <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <FileJson size={14} className="text-indigo-500" /> Translated JSON ({targetLang})
              </h3>
            </div>
            <div className="flex-1 bg-slate-950 relative">
              {isTranslating ? (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm z-10">
                  <Loader2 size={32} className="text-indigo-500 animate-spin" />
                </div>
              ) : null}
              <textarea 
                value={translatedJson || ''}
                readOnly
                placeholder="Translated JSON will appear here..."
                className="w-full h-full p-4 bg-transparent text-indigo-300 font-mono text-sm resize-none focus:outline-none custom-scrollbar"
              />
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
