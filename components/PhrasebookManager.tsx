import React, { useState, useMemo, useEffect } from 'react';
import { generateId } from '../utils/id';
import { PhrasebookItem } from '../types';
import { SUPPORTED_LANGUAGES } from '../constants';
import { X, Save, Trash2, Download, Search, Plus, ChevronRight, Bookmark } from 'lucide-react';
import FlagIcon from './FlagIcon';

interface PhrasebookManagerProps {
  phrasebook: PhrasebookItem[];
  onUpdate: (phrasebook: PhrasebookItem[]) => void;
  onClose: () => void;
  onInject: (text: string) => void;
  currentSourceLang: string;
}

const PhrasebookManager: React.FC<PhrasebookManagerProps> = ({ 
  phrasebook, 
  onUpdate, 
  onClose, 
  onInject,
  currentSourceLang
}) => {
  const [sourceText, setSourceText] = useState('');
  const [targetText, setTargetText] = useState('');
  const [sourceLang, setSourceLang] = useState(currentSourceLang === 'Auto-detect' ? 'English' : currentSourceLang);
  const [targetLang, setTargetLang] = useState('English');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceText.trim() || !targetText.trim()) return;
    
    const newEntry: PhrasebookItem = {
      id: generateId(),
      source: sourceText.trim(),
      target: targetText.trim(),
      sourceLang,
      targetLang,
      timestamp: Date.now()
    };

    onUpdate([newEntry, ...phrasebook]);
    setSourceText('');
    setTargetText('');
  };

  const removeEntry = (id: string) => {
    onUpdate(phrasebook.filter(p => p.id !== id));
  };

  const exportPhrasebook = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(phrasebook, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "transai_phrasebook.json");
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const filteredPhrasebook = useMemo(() => {
    return phrasebook.filter(p => 
      p.source.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.target.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [phrasebook, searchTerm]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-fadeIn" onClick={onClose} />
      
      <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden relative z-10 animate-fadeIn border border-white/20">
        
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-indigo-50/50">
          <div className="flex flex-col">
            <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase">Synaptic Phrasebook</h3>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">Saved Linguistic Clusters</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={exportPhrasebook} title="Export repository" className="p-3 bg-white text-indigo-600 hover:bg-indigo-50 rounded-2xl shadow-sm border border-slate-100 transition-all active:scale-95">
              <Download className="w-5 h-5" />
            </button>
            <button onClick={onClose} className="p-3 bg-white text-slate-300 hover:text-red-500 rounded-2xl shadow-sm border border-slate-100 transition-all">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-8 bg-white border-b border-slate-50 space-y-6">
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-2">
                 <div className="flex items-center justify-between px-1">
                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Source Buffer</span>
                   <select 
                    value={sourceLang} 
                    onChange={(e) => setSourceLang(e.target.value)}
                    className="bg-transparent text-[9px] font-black uppercase tracking-[0.2em] text-indigo-600 focus:outline-none"
                   >
                     {SUPPORTED_LANGUAGES.filter(l => l.name !== 'Auto-detect').map(l => (
                       <option key={l.name} value={l.name}>{l.name}</option>
                     ))}
                   </select>
                 </div>
                 <textarea 
                   value={sourceText}
                   onChange={(e) => setSourceText(e.target.value)}
                   placeholder="Enter common phrase..."
                   className="w-full h-24 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-[13px] font-bold focus:ring-4 focus:ring-indigo-500/5 outline-none resize-none"
                 />
               </div>
               <div className="space-y-2">
                 <div className="flex items-center justify-between px-1">
                   <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Synthesis Output</span>
                   <select 
                    value={targetLang} 
                    onChange={(e) => setTargetLang(e.target.value)}
                    className="bg-transparent text-[9px] font-black uppercase tracking-[0.2em] text-indigo-600 focus:outline-none"
                   >
                     {SUPPORTED_LANGUAGES.filter(l => l.name !== 'Auto-detect').map(l => (
                       <option key={l.name} value={l.name}>{l.name}</option>
                     ))}
                   </select>
                 </div>
                 <textarea 
                   value={targetText}
                   onChange={(e) => setTargetText(e.target.value)}
                   placeholder="Enter official translation..."
                   className="w-full h-24 bg-indigo-50/20 border border-indigo-100 rounded-2xl p-4 text-[13px] font-bold focus:ring-4 focus:ring-indigo-500/5 outline-none resize-none"
                 />
               </div>
            </div>
            <button 
              type="submit"
              disabled={!sourceText.trim() || !targetText.trim()}
              className="w-full py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-700 shadow-xl transition-all active:scale-95 disabled:opacity-50"
            >
              Commit to Repository
            </button>
          </form>

          <div className="relative">
            <input 
              type="text"
              placeholder="Filter phrasebook segments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-6 py-3 bg-slate-100/50 border border-slate-100 rounded-2xl text-[12px] font-bold focus:outline-none transition-all"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-white grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-min">
          {filteredPhrasebook.length === 0 ? (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-center opacity-30 italic">
              <Bookmark className="w-16 h-16 mb-4" strokeWidth={1} />
              <p className="text-sm font-black uppercase tracking-widest">No phrases identified</p>
            </div>
          ) : (
            filteredPhrasebook.map((item) => (
              <div key={item.id} className="group relative flex flex-col gap-3 p-5 bg-slate-50 border border-slate-100 rounded-3xl hover:bg-white hover:border-indigo-200 hover:shadow-xl transition-all">
                <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={() => onInject(item.source)} className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm" title="Inject to Editor">
                     <Plus size={14} />
                   </button>
                   <button onClick={() => removeEntry(item.id)} className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm" title="Delete">
                     <Trash2 size={14} />
                   </button>
                </div>
                
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-100 rounded-lg shadow-inner">
                    <FlagIcon country={item.sourceLang} className="w-4 h-2.5" />
                    <span className="text-[8px] font-black text-slate-300">→</span>
                    <FlagIcon country={item.targetLang} className="w-4 h-2.5" />
                  </div>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{new Date(item.timestamp).toLocaleDateString()}</span>
                </div>

                <div className="space-y-3">
                  <p className="text-[13px] font-bold text-slate-800 leading-snug line-clamp-2">"{item.source}"</p>
                  <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-50">
                    <p className="text-[12px] font-black text-indigo-700 leading-snug italic">"{item.target}"</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{phrasebook.length} Segments Synced</span>
          <button onClick={onClose} className="px-12 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-slate-800 active:scale-95 transition-all">Exit Phrasebook</button>
        </div>
      </div>
    </div>
  );
};

export default PhrasebookManager;