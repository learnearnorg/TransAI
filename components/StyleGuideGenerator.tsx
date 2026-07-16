
import React, { useState } from 'react';
import { Sparkles, Loader2, FileText, Check, Copy, Zap, BookOpen } from 'lucide-react';
import { GoogleGenAI } from "../services/geminiService";
import { MODELS } from "../constants";
import { SchemaType as Type } from "@google/generative-ai";
import { StyleGuide } from '../types';
import { generateId } from '../utils/id';
import { getApiKey } from '../services/geminiService';

interface StyleGuideGeneratorProps {
  onSave: (guide: StyleGuide) => void;
  onClose: () => void;
}

const StyleGuideGenerator: React.FC<StyleGuideGeneratorProps> = ({ onSave, onClose }) => {
  const [sourceText, setSourceText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedGuide, setGeneratedGuide] = useState<Partial<StyleGuide> | null>(null);
  const [guideName, setGuideName] = useState('');

  const handleGenerate = async () => {
    if (!sourceText.trim()) return;
    setIsGenerating(true);
    
    try {
      const ai = new GoogleGenAI({ apiKey: getApiKey() });
      const response = await ai.models.generateContent({
        model: MODELS.TEXT,
        contents: `Analyze the following text and extract a comprehensive translation style guide. 
        Focus on:
        1. Tone and Voice (e.g., formal, technical, friendly)
        2. Key Terminology (important words and their implied meanings)
        3. Formatting Rules (punctuation, capitalization, number formats)
        4. Target Audience (who is this written for?)
        
        Text to analyze:
        ${sourceText}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              tone: { type: Type.STRING },
              instructions: { type: Type.STRING },
              terminology: { 
                type: Type.ARRAY, 
                items: { 
                  type: Type.OBJECT,
                  properties: {
                    term: { type: Type.STRING },
                    definition: { type: Type.STRING }
                  }
                }
              }
            },
            required: ["tone", "instructions"]
          }
        }
      });

      const data = JSON.parse(response.text || '{}');
      setGeneratedGuide({
        name: guideName || 'New Style Guide',
        tone: data.tone,
        instructions: data.instructions,
        examples: []
      });
    } catch (err) {
      console.error("Style Guide Generation Failed", err);
      alert("Neural extraction failed. Please try a different sample.");
    } finally {
      setIsGenerating(true); // Wait, should be false
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    if (!generatedGuide) return;
    onSave({
      id: generateId(),
      name: guideName || 'Generated Style Guide',
      tone: generatedGuide.tone || 'Standard',
      instructions: generatedGuide.instructions || '',
      examples: [],
      lastUpdated: Date.now()
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl text-white">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">Neural Style Extractor</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Generate style guides from reference text</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
            <Zap size={20} className="text-slate-400 rotate-45" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
          {!generatedGuide ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Guide Name</label>
                <input 
                  type="text" 
                  value={guideName}
                  onChange={(e) => setGuideName(e.target.value)}
                  placeholder="e.g., Technical Documentation v1"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reference Text (Sample Content)</label>
                <textarea 
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                  placeholder="Paste a high-quality sample of your desired writing style here..."
                  className="w-full h-64 px-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2rem] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none custom-scrollbar"
                />
              </div>
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !sourceText.trim()}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 shadow-xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
                {isGenerating ? 'Analyzing Neural Patterns...' : 'Extract Style Guide'}
              </button>
            </div>
          ) : (
            <div className="space-y-6 animate-fadeIn">
              <div className="p-6 bg-indigo-50 dark:bg-indigo-900/10 rounded-[2rem] border border-indigo-100 dark:border-indigo-900/20">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen size={16} className="text-indigo-600" />
                  <h3 className="text-sm font-black text-indigo-900 dark:text-indigo-100 uppercase tracking-widest">Extracted Tone</h3>
                </div>
                <p className="text-sm font-bold text-indigo-800 dark:text-indigo-200">{generatedGuide.tone}</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-slate-400" />
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Neural Instructions</h3>
                </div>
                <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-[2rem] border border-slate-100 dark:border-slate-700">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {generatedGuide.instructions}
                  </p>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setGeneratedGuide(null)}
                  className="flex-1 py-4 border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95"
                >
                  Discard
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-700 shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Check size={18} />
                  Save to Library
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StyleGuideGenerator;
