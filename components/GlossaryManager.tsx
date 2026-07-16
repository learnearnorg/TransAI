
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { GlossaryItem, TranslationHistoryItem, SuggestedGlossaryItem, UploadedFile } from '../types';
import { inferGlossaryTerms, extractGlossaryFromText } from '../services/geminiService';
import { Sparkles, X, Save, Trash2, Download, Cloud, ChevronRight, Check, Plus, AlertCircle, Quote, Zap, Layers, FileText, Search, Loader2 } from 'lucide-react';

interface GlossaryManagerProps {
  glossary: GlossaryItem[];
  onUpdate: (glossary: GlossaryItem[]) => void;
  onClose: () => void;
  history: TranslationHistoryItem[];
  vaultFiles: UploadedFile[];
}

const GlossaryManager: React.FC<GlossaryManagerProps> = ({ glossary, onUpdate, onClose, history, vaultFiles }) => {
  const [newTerm, setNewTerm] = useState('');
  const [newDef, setNewDef] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isInferring, setIsInferring] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [inferredTerms, setInferredTerms] = useState<SuggestedGlossaryItem[]>([]);
  const [activeView, setActiveView] = useState<'current' | 'discovery' | 'scan'>('current');
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [scanText, setScanText] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleAdd = (term: string, def: string) => {
    if (!term.trim() || !def.trim()) return;
    if (glossary.some(g => g.term.toLowerCase() === term.trim().toLowerCase())) return;
    onUpdate([...glossary, { term: term.trim(), definition: def.trim() }]);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAdd(newTerm, newDef);
    setNewTerm('');
    setNewDef('');
  };

  const handleInfer = async () => {
    if (history.length === 0) return;
    setIsInferring(true);
    setInferredTerms([]);
    try {
      const suggestions = await inferGlossaryTerms(history, glossary);
      setInferredTerms(suggestions);
      setActiveView('discovery');
    } catch (err) {
      console.error("Auto-inference failed", err);
    } finally {
      setIsInferring(false);
    }
  };

  const handleScan = async () => {
    let textToScan = scanText;
    if (selectedFileId) {
      const file = vaultFiles.find(f => f.id === selectedFileId);
      if (file && file.content) {
        textToScan = file.content;
      }
    }

    if (!textToScan.trim()) return;

    setIsScanning(true);
    setInferredTerms([]);
    try {
      const suggestions = await extractGlossaryFromText(textToScan, 'Source Language');
      setInferredTerms(suggestions);
      setActiveView('discovery');
    } catch (err) {
      console.error("Scan failed", err);
    } finally {
      setIsScanning(false);
    }
  };

  const acceptInferred = (term: SuggestedGlossaryItem) => {
    handleAdd(term.term, term.definition);
    setInferredTerms(prev => prev.filter(t => t.id !== term.id));
  };

  const syncAllInferred = () => {
    const newItems = inferredTerms.map(t => ({ term: t.term, definition: t.definition }));
    onUpdate([...glossary, ...newItems]);
    setInferredTerms([]);
    setActiveView('current');
  };

  const removeTerm = (termToRemove: string) => {
    onUpdate(glossary.filter(item => item.term !== termToRemove));
  };

  const exportGlossary = () => {
    // Export as CSV
    const headers = ['Term', 'Definition'];
    const rows = glossary.map(item => [
      `"${(item.term || '').replace(/"/g, '""')}"`,
      `"${(item.definition || '').replace(/"/g, '""')}"`
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `transai_glossary_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredGlossary = useMemo(() => {
    return glossary.filter(item => 
      item.term.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.definition.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [glossary, searchTerm]);

  const getPriorityColor = (p: string) => {
    switch(p) {
      case 'High': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'Medium': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-fadeIn" onClick={onClose} />
      
      <div className="bg-white w-full max-w-4xl rounded-[3.5rem] shadow-[0_32px_128px_-16px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh] overflow-hidden relative z-10 animate-fadeIn border border-white/20">
        
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-5">
             <div className="p-4 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-100">
               <Layers size={24} strokeWidth={2.5} />
             </div>
             <div className="flex flex-col">
               <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase">Lexicon Repository</h3>
               <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Linguistic Consistency Core</p>
             </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setActiveView('scan')}
              className={`flex items-center gap-3 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 shadow-xl transition-all active:scale-95 ${activeView === 'scan' ? 'ring-4 ring-indigo-500/30' : ''}`}
            >
              <Search className="w-4 h-4" />
              Smart Scan
            </button>
            <div className="h-8 w-px bg-slate-200 mx-2" />
            <button onClick={exportGlossary} className="p-3 bg-white text-indigo-600 hover:bg-indigo-50 rounded-2xl shadow-sm border border-slate-100 transition-all active:scale-95">
              <Download className="w-6 h-6" />
            </button>
            <button onClick={onClose} className="p-3 bg-white text-slate-300 hover:text-red-500 rounded-2xl shadow-sm border border-slate-100 transition-all">
              <X className="w-8 h-8" />
            </button>
          </div>
        </div>

        {/* View Switcher */}
        <div className="px-8 pt-6 flex gap-4 bg-white">
           <button 
             onClick={() => setActiveView('current')}
             className={`pb-4 px-4 text-[10px] font-black uppercase tracking-[0.2em] border-b-4 transition-all ${activeView === 'current' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
           >
             Active Lexicon ({glossary.length})
           </button>
           <button 
             onClick={() => setActiveView('discovery')}
             className={`pb-4 px-4 text-[10px] font-black uppercase tracking-[0.2em] border-b-4 transition-all flex items-center gap-2 ${activeView === 'discovery' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
           >
             AI Discovery {inferredTerms.length > 0 && <span className="w-5 h-5 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-[8px] animate-pulse">{inferredTerms.length}</span>}
           </button>
           <button 
             onClick={() => setActiveView('scan')}
             className={`pb-4 px-4 text-[10px] font-black uppercase tracking-[0.2em] border-b-4 transition-all flex items-center gap-2 ${activeView === 'scan' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
           >
             Extract Terms
           </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          {activeView === 'current' ? (
            <>
              <div className="p-8 bg-white border-b border-slate-50 space-y-6">
                <form onSubmit={handleAddSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="md:col-span-2">
                    <input 
                      type="text" 
                      placeholder="Source Term (e.g. 'Matrix')"
                      value={newTerm}
                      onChange={(e) => setNewTerm(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-[13px] font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <input 
                      type="text" 
                      placeholder="Translation Override"
                      value={newDef}
                      onChange={(e) => setNewDef(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-[13px] font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                    />
                  </div>
                  <button type="submit" className="bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-800 shadow-xl active:scale-95">Commit</button>
                </form>

                <div className="relative">
                  <input 
                    type="text"
                    placeholder="Search active repository..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-6 py-3.5 bg-slate-100/50 border border-slate-100 rounded-2xl text-[12px] font-bold focus:outline-none focus:ring-4 focus:ring-indigo-100"
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><Zap size={18} /></div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/30 flex flex-col gap-4">
                {filteredGlossary.length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center opacity-30 italic text-center gap-4">
                    <Layers size={48} strokeWidth={1} />
                    <p className="text-[12px] font-black uppercase tracking-widest">Repository Buffer Idle</p>
                  </div>
                ) : (
                  filteredGlossary.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-6 bg-white border border-slate-100 rounded-3xl hover:border-indigo-300 hover:shadow-lg transition-all group ring-1 ring-slate-100/50">
                      <div className="flex-1 min-w-0">
                        <span className="text-[16px] font-black text-slate-900">{item.term}</span>
                        <div className="text-[12px] text-indigo-600 font-bold mt-2 flex items-center gap-2">
                           <ChevronRight size={14} />
                           <span className="italic">"{item.definition}"</span>
                        </div>
                      </div>
                      <button onClick={() => removeTerm(item.term)} className="p-3 text-slate-300 hover:text-red-500 rounded-2xl hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : activeView === 'discovery' ? (
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/30 flex flex-col gap-6">
               {inferredTerms.length > 0 && (
                 <div className="flex items-center justify-between px-4">
                    <div className="flex items-center gap-3">
                       <AlertCircle size={16} className="text-indigo-600" />
                       <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Potential Lexicon Matches Identified</span>
                    </div>
                    <button onClick={syncAllInferred} className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[9px] font-black uppercase tracking-widest border border-indigo-200 hover:bg-indigo-100 transition-all">Accept All</button>
                 </div>
               )}

               {inferredTerms.length === 0 ? (
                 <div className="py-32 flex flex-col items-center justify-center text-center opacity-30 italic gap-6">
                    <Sparkles size={64} strokeWidth={1} className="text-indigo-400" />
                    <div className="space-y-2">
                      <p className="text-sm font-black uppercase tracking-[0.3em]">No New Insights Detected</p>
                      <p className="text-[10px] font-bold uppercase max-w-xs mx-auto">Generate more translation history or scan a document to allow the neural engine to identify patterns.</p>
                    </div>
                    <div className="flex gap-4">
                      <button onClick={handleInfer} disabled={isInferring} className="px-8 py-3 bg-white border border-slate-200 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:border-indigo-400 transition-all">Scan History</button>
                      <button onClick={() => setActiveView('scan')} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all">Scan Document</button>
                    </div>
                 </div>
               ) : (
                 inferredTerms.map((term) => (
                   <div key={term.id} className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-xl transition-all group animate-fadeIn">
                      <div className="p-6 flex flex-col gap-5">
                         <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                               <div className="flex flex-col">
                                  <div className="flex items-center gap-3">
                                     <span className="text-lg font-black text-slate-900 tracking-tight uppercase">{term.term}</span>
                                     <span className={`px-2 py-0.5 rounded-lg border text-[8px] font-black uppercase ${getPriorityColor(term.priority)}`}>{term.priority} PRIORITY</span>
                                  </div>
                                  <p className="text-[11px] font-bold text-indigo-600 italic mt-1">Suggested Mapping: "{term.definition}"</p>
                               </div>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                               <button onClick={() => acceptInferred(term)} className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg hover:bg-emerald-700 active:scale-95 transition-all"><Check size={18} strokeWidth={3} /></button>
                               <button onClick={() => setInferredTerms(prev => prev.filter(t => t.id !== term.id))} className="p-3 bg-slate-100 text-slate-400 rounded-2xl hover:bg-rose-50 hover:text-rose-600 transition-all"><X size={18} /></button>
                            </div>
                         </div>

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-50 pt-5">
                            <div className="space-y-1.5">
                               <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Zap size={10} className="text-amber-500" /> Neural Insight</span>
                               <p className="text-[11px] font-medium text-slate-600 leading-relaxed">{term.reason}</p>
                            </div>
                            <div className="space-y-1.5">
                               <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Quote size={10} className="text-indigo-400" /> Contextual Usage</span>
                               <p className="text-[11px] font-bold text-slate-400 italic leading-relaxed truncate group-hover:whitespace-normal group-hover:line-clamp-none">...{term.context}...</p>
                            </div>
                         </div>
                      </div>
                   </div>
                 ))
               )}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/30 flex flex-col gap-8">
               <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Asset for Extraction</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {vaultFiles.filter(f => f.processed).length === 0 ? (
                       <div className="col-span-2 p-12 bg-white border-2 border-dashed border-slate-200 rounded-[2rem] text-center space-y-4">
                          <FileText size={32} className="mx-auto text-slate-300" />
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No Processed Assets in Vault</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">Process documents in the Vault sidebar to enable smart extraction.</p>
                       </div>
                     ) : (
                       vaultFiles.filter(f => f.processed).map(file => (
                         <button 
                           key={file.id}
                           onClick={() => { setSelectedFileId(file.id); setScanText(''); }}
                           className={`p-4 rounded-2xl border flex items-center gap-4 transition-all text-left ${selectedFileId === file.id ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-white border-slate-100 hover:border-indigo-200'}`}
                         >
                            <div className={`p-2 rounded-xl ${selectedFileId === file.id ? 'bg-white/20' : 'bg-slate-50 text-indigo-600'}`}>
                               <FileText size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                               <p className="text-[10px] font-black truncate uppercase">{file.name}</p>
                               <p className={`text-[8px] font-bold uppercase ${selectedFileId === file.id ? 'text-white/60' : 'text-slate-400'}`}>Processed Asset</p>
                            </div>
                         </button>
                       ))
                     )}
                  </div>
               </div>

               <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Manual Buffer Injection</h4>
                  <textarea 
                    value={scanText}
                    onChange={(e) => { setScanText(e.target.value); setSelectedFileId(null); }}
                    placeholder="Paste text directly for terminology analysis..."
                    className="w-full h-48 p-6 bg-white border border-slate-200 rounded-[2rem] text-[12px] font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all resize-none"
                  />
               </div>

               <button 
                 onClick={handleScan}
                 disabled={isScanning || (!scanText.trim() && !selectedFileId)}
                 className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] shadow-xl hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
               >
                 {isScanning ? (
                   <>
                     <Loader2 size={16} className="animate-spin" />
                     Extracting Neural Patterns...
                   </>
                 ) : (
                   <>
                     <Search size={16} />
                     Initiate Extraction
                   </>
                 )}
               </button>
            </div>
          )}
        </div>

        <div className="p-8 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-4 text-slate-500">
             <AlertCircle size={16} />
             <p className="text-[9px] font-bold uppercase tracking-widest leading-relaxed max-w-sm">
               Neural discovery scans your recent session history for recurring technical patterns and brand consistency anchors.
             </p>
          </div>
          <button onClick={onClose} className="px-12 py-4 bg-white text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-slate-100 transition-all shadow-xl active:scale-95">Deactivate Hub</button>
        </div>
      </div>
    </div>
  );
};

export default GlossaryManager;
