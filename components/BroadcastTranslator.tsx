
import React, { useState } from 'react';
import { translateText } from '../services/geminiService';
import { ProfessionalField, LinguisticPersona, GlossaryItem, TranslationHistoryItem, StyleGuide } from '../types';
import { uiLanguages, Language } from './languages';
import { Zap, Copy, Check, Loader2, Globe, Trash2, Plus, Send } from 'lucide-react';
import { generateId } from '../utils/id';

interface BroadcastResult {
  lang: Language;
  text: string;
  status: 'idle' | 'loading' | 'completed' | 'error';
  groundingSources?: any[];
}

interface BroadcastTranslatorProps {
  onSave: (item: TranslationHistoryItem) => void;
  field: ProfessionalField;
  persona: LinguisticPersona;
  customStyleGuide?: string;
  glossary: GlossaryItem[];
  styleGuides?: StyleGuide[];
}

const BroadcastTranslator: React.FC<BroadcastTranslatorProps> = ({ onSave, field, persona, customStyleGuide, glossary, styleGuides = [] }) => {
  const [sourceText, setSourceText] = useState('');
  const [selectedLangs, setSelectedLangs] = useState<Language[]>([]);
  const [results, setResults] = useState<BroadcastResult[]>([]);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [useGrounding, setUseGrounding] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const toggleLanguage = (lang: Language) => {
    if (selectedLangs.find(l => l.code === lang.code)) {
      setSelectedLangs(selectedLangs.filter(l => l.code !== lang.code));
    } else {
      setSelectedLangs([...selectedLangs, lang]);
    }
  };

  const handleBroadcast = async () => {
    if (!sourceText.trim() || selectedLangs.length === 0) return;

    setIsBroadcasting(true);
    const initialResults: BroadcastResult[] = selectedLangs.map(lang => ({
      lang,
      text: '',
      status: 'loading'
    }));
    setResults(initialResults);

    const broadcastPromises = selectedLangs.map(async (lang, index) => {
      try {
        const styleGuide = typeof persona === 'string' && persona.startsWith('Style: ') ? styleGuides.find(g => `Style: ${g.name}` === persona) : null;
        const finalPersona = styleGuide ? 'Custom Guide' : persona;
        const finalContext = styleGuide ? styleGuide.instructions : (customStyleGuide || '');

          const result = await translateText(
            sourceText,
            'Auto-Detect',
            lang.englishName,
            field,
            glossary,
            'Standard',
            finalContext,
            finalPersona,
            [],
            '',
            useGrounding
          );

        setResults(prev => prev.map((res, i) => 
          i === index ? { ...res, text: result.text, groundingSources: result.sources || [], status: 'completed' } : res
        ));

        onSave({
          id: generateId(),
          sourceText,
          translatedText: result.text,
          sourceLang: 'Auto-Detect',
          targetLang: lang.englishName,
          field,
          persona,
          timestamp: Date.now(),
          type: 'broadcast'
        });
      } catch (err) {
        setResults(prev => prev.map((res, i) => 
          i === index ? { ...res, status: 'error', text: 'Neural Sync Failed' } : res
        ));
      }
    });

    await Promise.all(broadcastPromises);
    setIsBroadcasting(false);
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const clearAll = () => {
    setSourceText('');
    setResults([]);
    setIsBroadcasting(false);
  };

  return (
    <div className="flex flex-col gap-8 animate-fadeIn">
      {/* Header Section */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-500/20">
            <Globe size={20} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase">Multi-Target Broadcast</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">One-to-Many Neural Synthesis Engine</p>
          </div>
        </div>
      </div>

      {/* Input Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-4">
          <div className="relative group">
            <textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="Inject source content for global broadcast..."
              className="w-full h-64 p-8 bg-white border border-slate-200 rounded-[2.5rem] resize-none focus:outline-none focus:ring-4 focus:ring-indigo-500/10 text-sm font-bold shadow-sm transition-all"
            />
            <div className="absolute bottom-6 right-6 flex gap-2 items-center">
              <button 
                onClick={() => setUseGrounding(!useGrounding)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${useGrounding ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg' : 'bg-white text-slate-400 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'}`}
                title="Neural Grounding"
              >
                <Globe size={14} />
                <span className="text-[9px] font-black uppercase tracking-widest">{useGrounding ? 'Grounded' : 'Search Off'}</span>
              </button>
              <button 
                onClick={clearAll}
                className="p-2 bg-slate-100 text-slate-400 rounded-xl hover:bg-rose-50 hover:text-rose-500 transition-all"
                title="Purge Buffer"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-6 shadow-sm flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Matrix</h4>
              <span className="text-[10px] font-black text-indigo-600">{selectedLangs.length} Selected</span>
            </div>
            
            <div className="grid grid-cols-3 gap-2 overflow-y-auto custom-scrollbar pr-2">
              {uiLanguages.map(lang => {
                const isSelected = selectedLangs.find(l => l.code === lang.code);
                return (
                  <button
                    key={lang.code}
                    onClick={() => toggleLanguage(lang)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-2xl border transition-all ${
                      isSelected 
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-md scale-[1.02]' 
                        : 'bg-slate-50 border-slate-100 text-slate-600 hover:border-indigo-200'
                    }`}
                  >
                    <span className="text-xl">{lang.flag}</span>
                    <span className="text-[9px] font-black uppercase tracking-tighter">{lang.name}</span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleBroadcast}
              disabled={isBroadcasting || !sourceText.trim() || selectedLangs.length === 0}
              className="mt-6 w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3"
            >
              {isBroadcasting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Broadcasting...
                </>
              ) : (
                <>
                  <Send size={14} />
                  Initiate Broadcast
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Results Matrix */}
      {results.length > 0 && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between px-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Neural Output Matrix</h4>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-black text-emerald-600 uppercase">Sync Verified</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {results.map((res, index) => (
              <div 
                key={res.lang.code}
                className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all flex flex-col gap-4 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{res.lang.flag}</span>
                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{res.lang.name}</span>
                  </div>
                  {res.status === 'completed' && (
                    <button 
                      onClick={() => handleCopy(res.text, index)}
                      className={`p-2 rounded-xl transition-all ${copiedIndex === index ? 'bg-emerald-500 text-white' : 'bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600'}`}
                    >
                      {copiedIndex === index ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  )}
                </div>

                <div className="flex-1 min-h-[120px] relative">
                  {res.status === 'loading' ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-300">
                      <Loader2 size={24} className="animate-spin text-indigo-400" />
                      <span className="text-[8px] font-black uppercase tracking-widest">Synthesizing...</span>
                    </div>
                  ) : res.status === 'error' ? (
                    <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-500 text-[10px] font-bold italic">
                      {res.text}
                    </div>
                  ) : (
                    <p className="text-[12px] font-bold text-slate-700 leading-normal italic">
                      {res.text}
                    </p>
                  )}
                </div>

                {res.groundingSources && res.groundingSources.length > 0 && (
                  <div className="mt-2 pt-3 border-t border-slate-50">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Globe size={10} className="text-indigo-500" />
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Neural Sources</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {res.groundingSources.slice(0, 2).map((src: any, si: number) => (
                        <a 
                          key={si} 
                          href={src.web?.uri} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[8px] font-bold text-indigo-600 hover:underline truncate"
                        >
                          {src.web?.title || 'Source'}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BroadcastTranslator;
