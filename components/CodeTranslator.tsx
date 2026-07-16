
import React, { useState } from 'react';
import { translateCode } from '../services/geminiService';
import { PROGRAMMING_LANGUAGES } from '../constants';
import { generateId } from '../utils/id';
import { Code, MessageSquare, Copy, Check, Terminal, Zap, Shield, Globe } from 'lucide-react';

const CodeTranslator: React.FC<{ onSave: (item: any) => void }> = ({ onSave }) => {
  const [code, setCode] = useState('');
  const [translatedCode, setTranslatedCode] = useState('');
  const [groundingSources, setGroundingSources] = useState<{ uri: string; title: string }[]>([]);
  const [sourceProgLang, setSourceProgLang] = useState('JavaScript');
  const [targetProgLang, setTargetProgLang] = useState('TypeScript');
  const [naturalLang, setNaturalLang] = useState('Spanish');
  const [mode, setMode] = useState<'comments' | 'logic'>('comments');
  const [isLoading, setIsLoading] = useState(false);
  const [useGrounding, setUseGrounding] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isLeftExpanded, setIsLeftExpanded] = useState(true);

  const handleTranslate = async () => {
    if (!code.trim()) return;
    setIsLoading(true);
    setTranslatedCode('');
    try {
      const result = await translateCode(code, sourceProgLang, mode === 'comments' ? naturalLang : targetProgLang, mode, useGrounding);
      setTranslatedCode(result.text);
      setGroundingSources(result.sources || []);
      onSave({
        id: generateId(),
        sourceText: "Code Block",
        translatedText: `Code Synced (${mode})`,
        sourceLang: sourceProgLang,
        targetLang: mode === 'comments' ? naturalLang : targetProgLang,
        field: 'Technical',
        timestamp: Date.now(),
        type: 'code'
      });
    } catch (err) {
      alert("Neural synthesis failed for this logic block.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(translatedCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      <div className="flex items-center gap-3 px-2">
        <button onClick={() => setIsLeftExpanded(!isLeftExpanded)} className="p-2 bg-slate-900 border border-slate-800 text-slate-400 rounded-lg shadow-sm hover:text-white transition-colors">
          {isLeftExpanded ? <Terminal size={16} /> : <Terminal size={16} className="text-indigo-500" />}
        </button>
        <span className="text-[12px] font-black text-slate-700 uppercase tracking-widest">Logic Synthesis Core</span>
      </div>
      {/* Precision Controls */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 p-4 bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-800">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex flex-col gap-2">
             <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Refinement Mode</span>
             <div className="flex p-1 bg-slate-800 rounded-xl border border-slate-700">
               <button 
                onClick={() => setMode('comments')} 
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${mode === 'comments' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
               >
                 <MessageSquare size={12} />
                 Comments Only
               </button>
               <button 
                onClick={() => setMode('logic')} 
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${mode === 'logic' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
               >
                 <Code size={12} />
                 Full Logic Sync
               </button>
             </div>
          </div>
          
          <div className="flex flex-col gap-2">
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Source stack</span>
            <div className="relative">
              <select 
                value={sourceProgLang} 
                onChange={(e) => setSourceProgLang(e.target.value)} 
                className="appearance-none bg-slate-800 text-white border border-slate-700 rounded-xl pl-4 pr-10 py-1.5 text-[11px] font-bold focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
              >
                {PROGRAMMING_LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
              </select>
              <Terminal size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
          </div>

          <div className="p-2 bg-slate-800 rounded-full text-indigo-400 border border-slate-700"><Zap size={14} fill="currentColor" /></div>

          <div className="flex flex-col gap-2">
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
              {mode === 'comments' ? 'Target Glossary' : 'Target Stack'}
            </span>
            <div className="relative">
              {mode === 'comments' ? (
                <select 
                  value={naturalLang} 
                  onChange={(e) => setNaturalLang(e.target.value)} 
                  className="appearance-none bg-slate-800 text-white border border-slate-700 rounded-xl pl-4 pr-10 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                >
                  <option value="English">English</option>
                  <option value="Spanish">Spanish</option>
                  <option value="French">French</option>
                  <option value="Japanese">Japanese</option>
                  <option value="Chinese">Chinese</option>
                  <option value="German">German</option>
                </select>
              ) : (
                <select 
                  value={targetProgLang} 
                  onChange={(e) => setTargetProgLang(e.target.value)} 
                  className="appearance-none bg-slate-800 text-white border border-slate-700 rounded-xl pl-4 pr-10 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                >
                  {PROGRAMMING_LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                </select>
              )}
              <Shield size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
          </div>

          <button 
            onClick={() => setUseGrounding(!useGrounding)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${useGrounding ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg' : 'bg-slate-800 text-slate-500 border-slate-700 hover:border-indigo-500 hover:text-indigo-400'}`}
            title="Neural Grounding"
          >
            <Zap size={14} className={useGrounding ? 'text-yellow-400' : ''} />
            <span className="text-[9px] font-black uppercase tracking-widest">{useGrounding ? 'Grounded' : 'Search Off'}</span>
          </button>
        </div>
        <button 
          onClick={handleTranslate} 
          disabled={isLoading || !code.trim()}
          className="px-6 py-2 bg-indigo-600 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl shadow-xl shadow-indigo-900/50 hover:bg-indigo-500 active:scale-95 transition-all disabled:opacity-30 flex items-center gap-3"
        >
          {isLoading ? (
            <><div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> Syncing...</>
          ) : (
            <><Zap size={16} /> Run Neural Sync</>
          )}
        </button>
      </div>

      <div className="flex h-[420px] gap-4">
        {/* Input Matrix */}
        <div className={`flex flex-col h-full bg-[#1e293b] rounded-[1.5rem] overflow-hidden border border-slate-800 relative group shadow-inner transition-all duration-500 ${isLeftExpanded ? 'flex-1' : 'w-16'}`}>
          <div className="px-6 py-2 border-b border-slate-800 flex items-center justify-between min-w-[300px]">
             <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em]">Source Logic Ingestion</span>
             <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                <span className="text-[7px] font-black text-indigo-400 uppercase">Input Node</span>
             </div>
          </div>
          {isLeftExpanded ? (
            <textarea 
              value={code}
              onChange={(e) => { setCode(e.target.value); setTranslatedCode(''); }}
              placeholder="// Paste your logic block here...
// The AI will focus exclusively on comment strings 
// if 'Comments Only' mode is active."
              className="flex-1 w-full bg-transparent text-indigo-300 font-mono text-[13px] p-6 focus:outline-none resize-none custom-scrollbar leading-relaxed"
            />
          ) : (
            <div className="flex-1 flex items-center justify-center cursor-pointer hover:bg-slate-800/50 transition-colors" onClick={() => setIsLeftExpanded(true)}>
               <Terminal size={20} className="text-slate-600" />
            </div>
          )}
        </div>

        {/* Output Synthesis */}
        <div className={`flex flex-col h-full bg-[#0f172a] rounded-[1.5rem] overflow-hidden border border-slate-800 relative shadow-2xl transition-all duration-500 ${isLeftExpanded ? 'flex-1' : 'flex-[2]'}`}>
          <div className="px-6 py-2 border-b border-slate-800 flex items-center justify-between min-w-[300px]">
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em]">Synthesized Logic Output</span>
            {translatedCode && (
              <button 
                onClick={handleCopy}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${isCopied ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'}`}
              >
                {isCopied ? <><Check size={10}/> Copied</> : <><Copy size={10}/> Copy Buffer</>}
              </button>
            )}
          </div>
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-8 px-20 text-center">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-indigo-600/20 border-t-indigo-500 rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Zap size={20} className="text-indigo-400 animate-pulse" />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[11px] font-black uppercase tracking-[0.5em] text-indigo-400">Compiling Matrix</p>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Applying professional {mode} synthesis...</p>
              </div>
            </div>
          ) : translatedCode ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <pre className="flex-1 w-full text-emerald-400 font-mono text-[8px] p-6 overflow-y-auto custom-scrollbar whitespace-pre-wrap select-text leading-relaxed">
                {translatedCode}
              </pre>
              {groundingSources.length > 0 && (
                <div className="px-6 py-3 bg-slate-800/50 border-t border-slate-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe size={10} className="text-indigo-400" />
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Neural Grounding Sources</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {groundingSources.map((src, i) => (
                      <a 
                        key={i} 
                        href={src.uri} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[8px] font-bold text-indigo-400 hover:text-indigo-300 truncate max-w-[200px]"
                      >
                        {src.title}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center opacity-10 px-20 text-center gap-6 text-white">
              <Code size={80} strokeWidth={0.5} />
              <div className="space-y-2">
                <p className="text-base font-black uppercase tracking-[0.2em]">Matrix Buffer Empty</p>
                <p className="text-[12px] font-bold uppercase leading-relaxed max-w-xs mx-auto">Neural Sync requires a valid code packet to initiate structural translation.</p>
              </div>
            </div>
          )}
          
          <div className="px-10 py-5 bg-slate-900/50 border-t border-slate-800 flex items-center gap-4 min-w-[300px]">
             <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400"><Shield size={14} /></div>
             <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-tight">
               Integrity Check Active: Logic structures and variable references are preserved 1:1 during {mode} synthesis cycles.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeTranslator;
