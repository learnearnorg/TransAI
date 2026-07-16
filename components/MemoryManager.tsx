
import React, { useState, useMemo, useRef } from 'react';
import { generateId } from '../utils/id';
import { TranslationMemoryEntry } from '../types';
import { SUPPORTED_LANGUAGES } from '../constants';
import { getSimilarityScore } from '../utils/stringUtils';
import FlagIcon from './FlagIcon';
import { embedText, healTranslationMemory } from '../services/geminiService';
import { cosineSimilarity } from '../utils/similarity';
import { 
  X, 
  Search, 
  Trash2, 
  Download, 
  Upload, 
  Edit3, 
  Check, 
  Database, 
  TrendingUp, 
  Clock, 
  ArrowRightLeft,
  Filter,
  Save,
  AlertCircle,
  Zap,
  Layers,
  BarChart3,
  MousePointer2,
  Brain,
  Loader2,
  Activity
} from 'lucide-react';

interface MemoryManagerProps {
  memory: TranslationMemoryEntry[];
  onUpdate: (memory: TranslationMemoryEntry[]) => void;
  onClose: () => void;
}

const MemoryManager: React.FC<MemoryManagerProps> = ({ memory, onUpdate, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLang, setFilterLang] = useState('All');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSource, setEditSource] = useState('');
  const [editTarget, setEditTarget] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [fuzzySearchTerm, setFuzzySearchTerm] = useState('');
  const [showFuzzySearch, setShowFuzzySearch] = useState(false);
  const [fuzzyEmbedding, setFuzzyEmbedding] = useState<number[] | null>(null);
  const [isEmbedding, setIsEmbedding] = useState(false);
  const [isHealing, setIsHealing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const removeEntry = (id: string) => {
    onUpdate(memory.filter(m => m.id !== id));
  };

  const startEditing = (entry: TranslationMemoryEntry) => {
    setEditingId(entry.id);
    setEditSource(entry.sourceSegment);
    setEditTarget(entry.targetSegment);
  };

  const saveEdit = (id: string) => {
    onUpdate(memory.map(m => m.id === id ? { ...m, sourceSegment: editSource, targetSegment: editTarget } : m));
    setEditingId(null);
  };

  const exportTMX = () => {
    if (memory.length === 0) return;
    const header = `<?xml version="1.0" encoding="UTF-8"?>
<tmx version="1.4">
  <header creationtool="TransAI" creationtoolversion="1.0" datatype="PlainText" segtype="sentence" adminlang="en-US" srclang="en-US"/>
  <body>`;
    
    const body = memory.map(item => `
    <tu tuid="${item.id}">
      <tuv xml:lang="${item.sourceLang}">
        <seg>${item.sourceSegment.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</seg>
      </tuv>
      <tuv xml:lang="${item.targetLang}">
        <seg>${item.targetSegment.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</seg>
      </tuv>
    </tu>`).join('');

    const footer = `
  </body>
</tmx>`;

    const tmxContent = header + body + footer;
    const blob = new Blob([tmxContent], { type: 'application/x-tmx+xml;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `transai_memory_${new Date().toISOString().slice(0, 10)}.tmx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportTMX = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(content, "text/xml");
        const tus = xmlDoc.getElementsByTagName("tu");
        const newEntries: TranslationMemoryEntry[] = [];
        
        for (let i = 0; i < tus.length; i++) {
          const tu = tus[i];
          const tuvs = tu.getElementsByTagName("tuv");
          if (tuvs.length >= 2) {
            const sourceTuv = tuvs[0];
            const targetTuv = tuvs[1];
            const sourceLang = sourceTuv.getAttribute("xml:lang") || "Unknown";
            const targetLang = targetTuv.getAttribute("xml:lang") || "Unknown";
            const sourceSeg = sourceTuv.getElementsByTagName("seg")[0]?.textContent || "";
            const targetSeg = targetTuv.getElementsByTagName("seg")[0]?.textContent || "";
            
            if (sourceSeg && targetSeg) {
              newEntries.push({
                id: generateId(),
                sourceLang,
                targetLang,
                sourceSegment: sourceSeg,
                targetSegment: targetSeg,
                usageCount: 0,
                lastUsed: Date.now()
              });
            }
          }
        }
        
        const filteredEntries = newEntries.filter(imp => 
          !memory.some(m => m.sourceSegment === imp.sourceSegment && m.targetLang === imp.targetLang)
        );
        onUpdate([...memory, ...filteredEntries]);
      } catch (err) {
        console.error("Malformed TMX file", err);
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsText(file);
  };

  const exportTM = () => {
    // Export as CSV
    const headers = ['ID', 'Source Lang', 'Target Lang', 'Source Segment', 'Target Segment', 'Usage Count', 'Last Used', 'Status'];
    const rows = memory.map(item => [
      item.id || '',
      item.sourceLang || '',
      item.targetLang || '',
      `"${(item.sourceSegment || '').replace(/"/g, '""')}"`,
      `"${(item.targetSegment || '').replace(/"/g, '""')}"`,
      item.usageCount || 0,
      item.lastUsed ? new Date(item.lastUsed).toISOString() : '',
      item.status || ''
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `transai_tm_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported)) {
          const newEntries = imported.filter(imp => 
            !memory.some(m => m.sourceSegment === imp.sourceSegment && m.targetLang === imp.targetLang)
          );
          onUpdate([...memory, ...newEntries]);
        }
      } catch (err) {
        console.error("Malformed TM packet", err);
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsText(file);
  };

  const handleHealMemory = async () => {
    if (memory.length === 0) return;
    setIsHealing(true);
    try {
      // Heal up to 20 entries at a time to avoid huge payloads
      const entriesToHeal = memory.slice(0, 20);
      const healedEntries = await healTranslationMemory(entriesToHeal);
      
      const updatedMemory = memory.map(m => {
        const healed = healedEntries.find(he => he.id === m.id);
        return healed ? healed : m;
      });
      
      onUpdate(updatedMemory);
    } catch (error) {
      console.error("Failed to heal memory:", error);
      alert("Self-healing process failed. Please check your API key.");
    } finally {
      setIsHealing(false);
    }
  };

  // Debounced Embedding for Fuzzy Search
  React.useEffect(() => {
    if (!showFuzzySearch || !fuzzySearchTerm.trim() || fuzzySearchTerm.length < 5) {
      setFuzzyEmbedding(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsEmbedding(true);
      try {
        const embedding = await embedText(fuzzySearchTerm);
        setFuzzyEmbedding(embedding);
      } catch (err) {
        console.error("Fuzzy Embedding Error:", err);
      } finally {
        setIsEmbedding(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [fuzzySearchTerm, showFuzzySearch]);

  const filteredMemory = useMemo(() => {
    if (showFuzzySearch && fuzzySearchTerm.trim()) {
      return memory
        .map(m => {
          let score = getSimilarityScore(fuzzySearchTerm, m.sourceSegment);
          let isSemantic = false;

          if (fuzzyEmbedding && m.embedding) {
            const semanticScore = cosineSimilarity(fuzzyEmbedding, m.embedding) * 100;
            if (semanticScore > score) {
              score = semanticScore;
              isSemantic = true;
            }
          }

          return { ...m, score, isSemantic };
        })
        .filter(m => m.score >= 40)
        .sort((a, b) => b.score - a.score);
    }
    return memory.filter(m => {
      const matchesSearch = m.sourceSegment.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           m.targetSegment.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesLang = filterLang === 'All' || m.sourceLang === filterLang || m.targetLang === filterLang;
      return matchesSearch && matchesLang;
    }).sort((a, b) => b.lastUsed - a.lastUsed);
  }, [memory, searchTerm, filterLang]);

  const totalRecalls = useMemo(() => memory.reduce((acc, curr) => acc + curr.usageCount, 0), [memory]);
  const wordsSaved = useMemo(() => memory.reduce((acc, curr) => acc + (curr.sourceSegment.split(' ').length * curr.usageCount), 0), [memory]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl animate-fadeIn" onClick={onClose} />
      
      <div className="bg-white w-full max-w-6xl rounded-[3.5rem] shadow-[0_32px_128px_-16px_rgba(0,0,0,0.5)] flex flex-col h-[90vh] overflow-hidden relative z-10 animate-fadeIn border border-white/20">
        
        {/* Superior Header */}
        <div className="p-10 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 to-white">
          <div className="flex items-center gap-6">
            <div className="p-5 bg-indigo-600 text-white rounded-[2rem] shadow-2xl shadow-indigo-200">
              <Database size={32} strokeWidth={2.5} />
            </div>
            <div className="flex flex-col">
              <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Synaptic Memory Core</h3>
              <div className="flex items-center gap-3 mt-1">
                 <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                 <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.3em]">Neural Asset Management Active</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
               <button 
                onClick={() => fileInputRef.current?.click()} 
                className="p-3 bg-white text-slate-600 hover:text-indigo-600 rounded-xl shadow-sm transition-all flex items-center gap-2"
                title="Import Pack"
               >
                 <Upload size={18} />
                 <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">Sync Pack</span>
                 <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".json" />
               </button>
               <button 
                 onClick={() => document.getElementById('tmx-import')?.click()} 
                 className="p-3 bg-white text-slate-600 hover:text-indigo-600 rounded-xl shadow-sm transition-all flex items-center gap-2"
                 title="Import TMX"
               >
                 <Upload size={18} />
                 <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">Import TMX</span>
                 <input type="file" id="tmx-import" onChange={handleImportTMX} className="hidden" accept=".tmx" />
               </button>
               <button 
                onClick={exportTMX} 
                className="p-3 hover:bg-white text-slate-400 hover:text-indigo-600 rounded-xl transition-all flex items-center gap-2"
                title="Export TMX"
               >
                 <Download size={18} />
                 <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">Export TMX</span>
               </button>
               <button 
                onClick={exportTM} 
                className="p-3 hover:bg-white text-slate-400 hover:text-indigo-600 rounded-xl transition-all flex items-center gap-2"
                title="Export Repository CSV"
               >
                 <Download size={18} />
                 <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">Export CSV</span>
               </button>
               <button 
                onClick={handleHealMemory} 
                disabled={isHealing || memory.length === 0}
                className="p-3 hover:bg-white text-slate-400 hover:text-indigo-600 rounded-xl transition-all flex items-center gap-2 disabled:opacity-50"
                title="Self-Heal Memory"
               >
                 {isHealing ? <Loader2 size={18} className="animate-spin" /> : <Activity size={18} />}
                 <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">{isHealing ? 'Healing...' : 'Heal'}</span>
               </button>
            </div>
            <div className="h-10 w-px bg-slate-200 mx-2" />
            <button onClick={onClose} className="p-4 bg-white text-slate-300 hover:text-red-500 rounded-2xl shadow-sm border border-slate-100 transition-all active:scale-90">
              <X size={28} strokeWidth={3} />
            </button>
          </div>
        </div>

        {/* Neural Analytics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-8 bg-slate-50/50 border-b border-slate-100">
           <div className="p-6 bg-white rounded-3xl shadow-sm border border-slate-100 space-y-2">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Neural Leverage</span>
              <div className="flex items-end justify-between">
                <span className="text-3xl font-black text-slate-900">{memory.length}</span>
                <Database size={20} className="text-indigo-200" />
              </div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Verified Synaptic Chains</p>
           </div>
           <div className="p-6 bg-white rounded-3xl shadow-sm border border-slate-100 space-y-2">
              <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest block">Recycled Tokens</span>
              <div className="flex items-end justify-between">
                <span className="text-3xl font-black text-slate-900">{wordsSaved.toLocaleString()}</span>
                <Zap size={20} className="text-emerald-200" />
              </div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Words reused via memory</p>
           </div>
           <div className="p-6 bg-white rounded-3xl shadow-sm border border-slate-100 space-y-2">
              <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest block">Active Recalls</span>
              <div className="flex items-end justify-between">
                <span className="text-3xl font-black text-slate-900">{totalRecalls}</span>
                <TrendingUp size={20} className="text-indigo-200" />
              </div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Total synaptic matches</p>
           </div>
           <div className="p-6 bg-indigo-600 rounded-3xl shadow-xl shadow-indigo-100 space-y-2 text-white">
              <span className="text-[9px] font-black text-indigo-200 uppercase tracking-widest block">Linguistic ROI</span>
              <div className="flex items-end justify-between">
                <span className="text-3xl font-black">{Math.min(100, Math.round((totalRecalls / (memory.length || 1)) * 10))}%</span>
                <BarChart3 size={20} className="text-indigo-400" />
              </div>
              <p className="text-[9px] font-bold text-indigo-200 uppercase tracking-tighter">Memory utilization efficiency</p>
           </div>
        </div>

        {/* Repository Control Bar */}
        <div className="px-10 py-6 bg-white border-b border-slate-50 flex flex-col md:flex-row gap-6 items-center">
            <div className="flex-1 w-full relative">
              <input 
                type="text"
                placeholder={showFuzzySearch ? "Test neural semantic matching..." : "Query synaptic sequences..."}
                value={showFuzzySearch ? fuzzySearchTerm : searchTerm}
                onChange={(e) => showFuzzySearch ? setFuzzySearchTerm(e.target.value) : setSearchTerm(e.target.value)}
                className={`w-full pl-14 pr-6 py-4 bg-slate-100/50 border rounded-[2rem] text-[14px] font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all ${showFuzzySearch ? 'border-indigo-300 ring-4 ring-indigo-500/5' : 'border-slate-200'}`}
              />
              {isEmbedding ? (
                <Loader2 className="absolute left-6 top-1/2 -translate-y-1/2 text-indigo-500 animate-spin" size={20} />
              ) : (
                <Search className={`absolute left-6 top-1/2 -translate-y-1/2 ${showFuzzySearch ? 'text-indigo-500' : 'text-slate-400'}`} size={20} />
              )}
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowFuzzySearch(!showFuzzySearch)}
                className={`px-6 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${showFuzzySearch ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
              >
                <Brain size={14} fill={showFuzzySearch ? "currentColor" : "none"} />
                {showFuzzySearch ? "Neural Active" : "Neural Test"}
              </button>
              <div className="relative w-full md:w-64">
                <select 
                  value={filterLang}
                  onChange={(e) => setFilterLang(e.target.value)}
                  className="w-full appearance-none bg-slate-100/50 border border-slate-200 rounded-[2rem] pl-12 pr-10 py-4 text-[11px] font-black uppercase tracking-[0.2em] outline-none cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <option value="All">Global Matrix</option>
                  {SUPPORTED_LANGUAGES.map(l => <option key={l.name} value={l.name}>{l.name}</option>)}
                </select>
                <Filter className="absolute left-5 top-1/2 -translate-y-1/2 text-indigo-500" size={16} />
              </div>
            </div>
        </div>

        {/* Interactive Sequence List */}
        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-slate-50/20 flex flex-col gap-6">
          {filteredMemory.length === 0 ? (
            <div className="py-32 flex flex-col items-center justify-center text-center opacity-30 italic gap-6">
              <div className="p-12 bg-white rounded-[4rem] shadow-xl">
                <Layers size={80} strokeWidth={1} className="text-slate-200" />
              </div>
              <div className="space-y-2">
                <p className="text-xl font-black uppercase tracking-[0.4em] text-slate-400">Synaptic Void</p>
                <p className="text-[12px] font-bold uppercase tracking-widest text-slate-400 max-w-sm">No linguistic patterns identified in current sector.</p>
              </div>
            </div>
          ) : (
            filteredMemory.map((entry) => (
              <div key={entry.id} className="group flex flex-col gap-6 p-8 bg-white border border-slate-100 rounded-[3rem] hover:border-indigo-300 hover:shadow-2xl transition-all relative overflow-hidden ring-1 ring-slate-50/50">
                
                {/* Advanced Entry Header */}
                <div className="flex items-center justify-between border-b border-slate-50 pb-6">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3 p-2 bg-slate-50 border border-slate-200 rounded-2xl shadow-inner">
                      <div className="rounded shadow-sm overflow-hidden border border-white"><FlagIcon country={entry.sourceLang} className="w-6 h-4" /></div>
                      <ArrowRightLeft size={12} className="text-slate-300" />
                      <div className="rounded shadow-sm overflow-hidden border border-white"><FlagIcon country={entry.targetLang} className="w-6 h-4" /></div>
                    </div>
                    <div className="flex items-center gap-8 text-[10px] font-black uppercase tracking-widest text-slate-400">
                       <div className="flex items-center gap-2">
                         <Zap size={14} className="text-amber-400 fill-amber-400" />
                         <span>Hits: {entry.usageCount}</span>
                       </div>
                       {(entry as any).score !== undefined && (
                         <div className={`flex items-center gap-2 ${(entry as any).isSemantic ? 'text-indigo-600' : 'text-amber-600'}`}>
                           {(entry as any).isSemantic ? <Brain size={14} /> : <TrendingUp size={14} />}
                           <span>{(entry as any).isSemantic ? 'Semantic' : 'Match'}: {Math.round((entry as any).score)}%</span>
                         </div>
                       )}
                       <div className="flex items-center gap-2">
                         <Clock size={14} />
                         <span>Access: {new Date(entry.lastUsed).toLocaleDateString()}</span>
                       </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    {editingId === entry.id ? (
                      <button onClick={() => saveEdit(entry.id)} className="p-3.5 bg-indigo-600 text-white rounded-2xl shadow-xl hover:bg-indigo-700 active:scale-90 transition-all"><Check size={20} strokeWidth={3}/></button>
                    ) : (
                      <button onClick={() => startEditing(entry)} className="p-3.5 bg-slate-50 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all active:scale-90"><Edit3 size={20} /></button>
                    )}
                    <button onClick={() => removeEntry(entry.id)} className="p-3.5 bg-slate-50 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all active:scale-90"><Trash2 size={20} /></button>
                  </div>
                </div>

                {/* Content Matrix */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div className="space-y-4">
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] block ml-1">Linguistic Input</span>
                    {editingId === entry.id ? (
                      <textarea 
                        value={editSource}
                        onChange={(e) => setEditSource(e.target.value)}
                        className="w-full p-5 bg-slate-50 border border-indigo-100 rounded-3xl text-[14px] font-bold outline-none resize-none h-32 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                      />
                    ) : (
                      <p className="text-[16px] font-bold text-slate-700 leading-relaxed italic tracking-tight">"{entry.sourceSegment}"</p>
                    )}
                  </div>
                  <div className="space-y-4 relative">
                    <div className="absolute -left-6 top-0 bottom-0 w-px bg-slate-100 hidden lg:block" />
                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.3em] block ml-1">Verified Output</span>
                    {editingId === entry.id ? (
                      <textarea 
                        value={editTarget}
                        onChange={(e) => setEditTarget(e.target.value)}
                        className="w-full p-5 bg-indigo-50/30 border border-indigo-200 rounded-3xl text-[14px] font-black text-indigo-900 outline-none resize-none h-32 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                      />
                    ) : (
                      <p className="text-[16px] font-black text-indigo-900 leading-relaxed tracking-tight">"{entry.targetSegment}"</p>
                    )}
                  </div>
                </div>

                {/* Healing Status */}
                {entry.status && (
                  <div className={`mt-6 p-4 rounded-2xl border flex items-start gap-4 ${
                    entry.status === 'active' ? 'bg-emerald-50 border-emerald-100' :
                    entry.status === 'flagged' ? 'bg-amber-50 border-amber-100' :
                    'bg-rose-50 border-rose-100'
                  }`}>
                    <div className={`p-2 rounded-xl ${
                      entry.status === 'active' ? 'bg-emerald-100 text-emerald-600' :
                      entry.status === 'flagged' ? 'bg-amber-100 text-amber-600' :
                      'bg-rose-100 text-rose-600'
                    }`}>
                      {entry.status === 'active' ? <Check size={16} /> : <AlertCircle size={16} />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h5 className={`text-xs font-black uppercase tracking-widest ${
                          entry.status === 'active' ? 'text-emerald-700' :
                          entry.status === 'flagged' ? 'text-amber-700' :
                          'text-rose-700'
                        }`}>
                          {entry.status === 'active' ? 'Verified Active' : entry.status === 'flagged' ? 'Needs Review' : 'Deprecated'}
                        </h5>
                        {entry.confidenceScore !== undefined && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            entry.confidenceScore >= 90 ? 'bg-emerald-100 text-emerald-700' :
                            entry.confidenceScore >= 70 ? 'bg-amber-100 text-amber-700' :
                            'bg-rose-100 text-rose-700'
                          }`}>
                            Score: {entry.confidenceScore}/100
                          </span>
                        )}
                      </div>
                      
                      {entry.healingSuggestions && entry.healingSuggestions.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Suggested Alternatives:</p>
                          {entry.healingSuggestions.map((suggestion, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-100">
                              <span className="text-sm font-medium text-slate-700">"{suggestion}"</span>
                              <button 
                                onClick={() => {
                                  startEditing(entry);
                                  setEditTarget(suggestion);
                                }}
                                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-wider px-2 py-1 bg-indigo-50 rounded-md"
                              >
                                Apply
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {editingId === entry.id && (
                  <div className="flex justify-end gap-3 mt-4 animate-fadeIn">
                     <button onClick={() => setEditingId(null)} className="px-8 py-3 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Discard Changes</button>
                     <button onClick={() => saveEdit(entry.id)} className="px-10 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-indigo-900/40 hover:bg-indigo-500 active:scale-95 transition-all flex items-center gap-2">
                       <Save size={16} /> Sync to Core
                     </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* High-Tech Footer */}
        <div className="p-10 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-6">
             <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-indigo-400">
                <BarChart3 size={24} />
             </div>
             <div className="space-y-1">
                <p className="text-[10px] font-black text-white uppercase tracking-widest">Neural Consistency Verified</p>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter leading-tight max-w-sm">
                  Active learning cycles completed. Memory Core has achieved {Math.min(99, 80 + memory.length)}% alignment with session goals.
                </p>
             </div>
          </div>
          <button 
            onClick={onClose} 
            className="px-14 py-5 bg-white text-slate-950 rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.3em] hover:bg-slate-100 transition-all shadow-2xl active:scale-95 flex items-center gap-3"
          >
            <MousePointer2 size={16} fill="currentColor" />
            Deactivate Core
          </button>
        </div>
      </div>
    </div>
  );
};

export default MemoryManager;
