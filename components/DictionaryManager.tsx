import React, { useState, useEffect, useMemo, useRef } from 'react';
import { generateId } from '../utils/id';
import { DictionaryEntry } from '../types';
import { SUPPORTED_LANGUAGES } from '../constants';
import FlagIcon from './FlagIcon';
import { getNeuralDictionaryMapping } from '../services/geminiService';
import { initGoogleApi, authenticateDrive, listTransFiles, downloadFileData, saveToDrive, DriveSyncFile } from '../services/googleDriveService';

interface DictionaryManagerProps {
  dictionary: DictionaryEntry[];
  onUpdate: (dictionary: DictionaryEntry[]) => void;
  onClose: () => void;
  defaultSourceLang: string;
  defaultTargetLang: string;
}

interface NeuralDiscovery {
  targetTerm: string;
  pos: string;
  notes: string;
}

const DictionaryManager: React.FC<DictionaryManagerProps> = ({ 
  dictionary, 
  onUpdate, 
  onClose,
  defaultSourceLang,
  defaultTargetLang
}) => {
  const [sourceLang, setSourceLang] = useState(defaultSourceLang === 'Auto-detect' ? 'English' : defaultSourceLang);
  const [targetLang, setTargetLang] = useState(defaultTargetLang);
  const [sourceTerm, setSourceTerm] = useState('');
  const [targetTerm, setTargetTerm] = useState('');
  const [notes, setNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDrive, setShowDrive] = useState(false);
  const [driveFiles, setDriveFiles] = useState<DriveSyncFile[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Neural Lookup States
  const [isSearchingNeural, setIsSearchingNeural] = useState(false);
  const [neuralResult, setNeuralResult] = useState<NeuralDiscovery | null>(null);
  const [neuralError, setNeuralError] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleExportTBX = () => {
    if (dictionary.length === 0) return;
    
    const header = `<?xml version="1.0" encoding="UTF-8"?>
<martif type="TBX" xml:lang="en">
  <martifHeader>
    <fileDesc>
      <sourceDesc>
        <p>TransAI Termbase Export</p>
      </sourceDesc>
    </fileDesc>
  </martifHeader>
  <text>
    <body>`;

    const body = dictionary.map(entry => `
      <termEntry id="${entry.id}">
        <langSet xml:lang="${entry.sourceLang}">
          <tig>
            <term>${entry.sourceTerm.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</term>
          </tig>
        </langSet>
        <langSet xml:lang="${entry.targetLang}">
          <tig>
            <term>${entry.targetTerm.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</term>
            ${entry.notes ? `<note>${entry.notes.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</note>` : ''}
          </tig>
        </langSet>
      </termEntry>`).join('');

    const footer = `
    </body>
  </text>
</martif>`;

    const tbxContent = header + body + footer;
    const blob = new Blob([tbxContent], { type: 'application/x-tbx+xml;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `transai_termbase_${new Date().toISOString().slice(0, 10)}.tbx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportTBX = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(content, "text/xml");
        const termEntries = xmlDoc.getElementsByTagName("termEntry");
        const newEntries: DictionaryEntry[] = [];
        
        for (let i = 0; i < termEntries.length; i++) {
          const entry = termEntries[i];
          const langSets = entry.getElementsByTagName("langSet");
          if (langSets.length >= 2) {
            const sourceLangSet = langSets[0];
            const targetLangSet = langSets[1];
            const sourceLang = sourceLangSet.getAttribute("xml:lang") || "Unknown";
            const targetLang = targetLangSet.getAttribute("xml:lang") || "Unknown";
            const sourceTerm = sourceLangSet.getElementsByTagName("term")[0]?.textContent || "";
            const targetTerm = targetLangSet.getElementsByTagName("term")[0]?.textContent || "";
            const notes = targetLangSet.getElementsByTagName("note")[0]?.textContent || "";
            
            if (sourceTerm && targetTerm) {
              newEntries.push({
                id: generateId(),
                sourceLang,
                targetLang,
                sourceTerm,
                targetTerm,
                notes
              });
            }
          }
        }
        
        const filteredEntries = newEntries.filter(imp => 
          !dictionary.some(d => d.sourceTerm === imp.sourceTerm && d.targetLang === imp.targetLang)
        );
        onUpdate([...dictionary, ...filteredEntries]);
      } catch (err) {
        console.error("Malformed TBX file", err);
      }
    };
    reader.readAsText(file);
  };

  const handleExportDictionary = () => {
    if (dictionary.length === 0) return;
    
    const headers = ['ID', 'Source Lang', 'Target Lang', 'Source Term', 'Target Term', 'Notes'];
    const csvContent = [
      headers.join(','),
      ...dictionary.map(entry => 
        [
          `"${entry.id}"`,
          `"${entry.sourceLang}"`,
          `"${entry.targetLang}"`,
          `"${entry.sourceTerm.replace(/"/g, '""')}"`,
          `"${entry.targetTerm.replace(/"/g, '""')}"`,
          `"${(entry.notes || '').replace(/"/g, '""')}"`
        ].join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `dictionary_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAdd = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!sourceTerm.trim()) return;
    
    if (!targetTerm.trim()) {
      handleNeuralDiscovery();
      return;
    }
    
    const exists = dictionary.some(d => 
      d.sourceLang === sourceLang && 
      d.targetLang === targetLang && 
      d.sourceTerm.toLowerCase() === sourceTerm.trim().toLowerCase()
    );

    if (exists) {
      console.warn("Entry already exists in mapping core.");
      return;
    }

    onUpdate([...dictionary, { 
      id: generateId(),
      sourceLang, 
      targetLang, 
      sourceTerm: sourceTerm.trim(), 
      targetTerm: targetTerm.trim(),
      notes: (notes ?? '').trim() || undefined
    }]);
    setSourceTerm('');
    setTargetTerm('');
    setNotes('');
    setNeuralResult(null);
    setNeuralError(null);
  };

  const handleNeuralDiscovery = async () => {
    if (!sourceTerm.trim()) return;
    setIsSearchingNeural(true);
    setNeuralResult(null);
    setNeuralError(null);
    try {
      const result = await getNeuralDictionaryMapping(sourceTerm, sourceLang, targetLang);
      setNeuralResult(result);
      // Auto-populate inputs for easy commit
      setTargetTerm(result.targetTerm);
      setNotes(`[${result.pos}] ${result.notes}`);
    } catch (err) {
      console.error("Neural discovery failed:", err);
      setNeuralError("Failed to discover mapping. Please try again.");
    } finally {
      setIsSearchingNeural(false);
    }
  };

  const handleDriveSync = async () => {
    setIsSyncing(true);
    try {
      await initGoogleApi();
      await authenticateDrive();
      const files = await listTransFiles('transai_dictionary');
      setDriveFiles(files);
      setShowDrive(true);
    } catch (err) {
      console.error("Cloud Drive Access Denied.");
    } finally {
      setIsSyncing(false);
    }
  };

  const pushToDrive = async () => {
    setIsSyncing(true);
    try {
      const existing = driveFiles.find(f => f.name === 'transai_dictionary.json');
      await saveToDrive('transai_dictionary.json', dictionary, existing?.id);
      const files = await listTransFiles('transai_dictionary');
      setDriveFiles(files);
    } catch (err) {
      console.error("Failed to save to Drive.");
    } finally {
      setIsSyncing(false);
    }
  };

  const pullFromDrive = async (fileId: string) => {
    setIsSyncing(true);
    try {
      const data = await downloadFileData(fileId);
      if (Array.isArray(data)) {
        // Automatically merges data without requesting confirmation
        const merged = [...dictionary];
        data.forEach((item: any) => {
          const exists = merged.find(m => 
            m.sourceLang === item.sourceLang && 
            m.targetLang === item.targetLang && 
            m.sourceTerm.toLowerCase() === item.sourceTerm.toLowerCase()
          );
          if (!exists) merged.push(item);
        });
        onUpdate(merged);
      }
    } catch (err) {
      console.error("Failed to load from Drive.");
    } finally {
      setIsSyncing(false);
    }
  };

  const removeEntry = (id: string) => {
    onUpdate(dictionary.filter(item => item.id !== id));
  };

  const filteredDictionary = useMemo(() => {
    return dictionary.filter(item => 
      item.sourceTerm.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.targetTerm.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sourceLang.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.targetLang.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [dictionary, searchTerm]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity animate-fadeIn" 
        onClick={onClose} 
      />
      
      <div className="bg-white w-full max-w-4xl rounded-[3.5rem] shadow-[0_32px_128px_-16px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh] overflow-hidden relative z-10 animate-fadeIn border border-white/20">
        
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-amber-50/50">
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase">Neural Mapping Core</h3>
              <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
            </div>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">High-Fidelity Pair Synthesis</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => document.getElementById('tbx-import')?.click()} 
              className="p-3 bg-white text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl shadow-sm transition-all border border-slate-100"
              title="Import TBX"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            </button>
            <input type="file" id="tbx-import" accept=".tbx" className="hidden" onChange={handleImportTBX} />
            <button 
              onClick={handleExportTBX} 
              disabled={dictionary.length === 0}
              className="p-3 bg-white text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl shadow-sm transition-all border border-slate-100 disabled:opacity-50"
              title="Export TBX"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            </button>
            <button 
              onClick={handleExportDictionary} 
              disabled={dictionary.length === 0}
              className="p-3 bg-white text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl shadow-sm transition-all border border-slate-100 disabled:opacity-50"
              title="Export Dictionary CSV"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            </button>
            <button 
              onClick={handleDriveSync} 
              disabled={isSyncing}
              className={`p-3 bg-white text-amber-600 hover:bg-amber-50 rounded-2xl shadow-sm transition-all border border-amber-100 ${isSyncing ? 'animate-pulse' : ''}`}
              title="Sync with Google Drive"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/></svg>
            </button>
            <button onClick={onClose} className="p-3 bg-white text-slate-300 hover:text-red-500 rounded-2xl shadow-sm transition-all border border-slate-100">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {showDrive && (
          <div className="p-6 bg-amber-50 border-b border-amber-100 animate-fadeIn">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Drive Sync Manager</h4>
              <button onClick={() => setShowDrive(false)} className="text-[10px] font-bold text-slate-400 hover:text-slate-600">Dismiss Sync</button>
            </div>
            <div className="flex flex-col gap-2">
              <button 
                onClick={pushToDrive}
                className="w-full py-3 bg-amber-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-700 shadow-xl transition-all active:scale-95"
              >
                Upload Current Repository to Cloud
              </button>
              {driveFiles.map(file => (
                <div key={file.id} className="flex items-center justify-between p-4 bg-white border border-amber-200 rounded-2xl shadow-sm">
                  <div className="flex flex-col">
                    <span className="text-[12px] font-bold text-slate-700">{file.name}</span>
                    <span className="text-[9px] text-slate-400">Sync: {new Date(file.modifiedTime).toLocaleString()}</span>
                  </div>
                  <button 
                    onClick={() => pullFromDrive(file.id)}
                    className="px-4 py-2 bg-amber-50 text-amber-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-100 transition-all"
                  >
                    Fetch
                  </button>
                </div>
              ))}
              {driveFiles.length === 0 && <p className="text-[10px] text-slate-400 italic text-center py-4">No repository packets identified on Drive</p>}
            </div>
          </div>
        )}

        <div className="p-8 bg-white border-b border-slate-50 space-y-8">
          <form onSubmit={handleAdd} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex flex-col gap-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Linguistic Vectors</label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 relative">
                    <select 
                        value={sourceLang} 
                        onChange={(e) => setSourceLang(e.target.value)}
                        className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-[1.25rem] px-5 py-3 text-[11px] font-black uppercase tracking-[0.2em] focus:ring-4 focus:ring-amber-500/10 outline-none cursor-pointer"
                    >
                        {SUPPORTED_LANGUAGES.filter(l => l.name !== 'Auto-detect').map(l => <option key={l.name} value={l.name}>{l.name}</option>)}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><path d="M19 9l-7 7-7-7"/></svg></div>
                  </div>
                  <div className="p-2 bg-amber-50 text-amber-500 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg></div>
                  <div className="flex-1 relative">
                    <select 
                        value={targetLang} 
                        onChange={(e) => setTargetLang(e.target.value)}
                        className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-[1.25rem] px-5 py-3 text-[11px] font-black uppercase tracking-[0.2em] focus:ring-4 focus:ring-amber-500/10 outline-none cursor-pointer"
                    >
                        {SUPPORTED_LANGUAGES.filter(l => l.name !== 'Auto-detect').map(l => <option key={l.name} value={l.name}>{l.name}</option>)}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><path d="M19 9l-7 7-7-7"/></svg></div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Input Sequence</label>
                <div className="relative group">
                  <input 
                    type="text" 
                    value={sourceTerm}
                    onChange={(e) => setSourceTerm(e.target.value)}
                    placeholder="Word or expression..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-[1.25rem] pl-6 pr-32 py-3 text-[14px] font-black outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 transition-all"
                  />
                  <button 
                    type="button"
                    onClick={handleNeuralDiscovery}
                    disabled={isSearchingNeural || !sourceTerm.trim()}
                    className="absolute right-2 top-1.5 bottom-1.5 px-4 bg-amber-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-amber-900/10 transition-all hover:bg-amber-700 active:scale-95 disabled:opacity-30"
                  >
                    {isSearchingNeural ? 'Discovering...' : 'Search Neural'}
                  </button>
                </div>
              </div>
            </div>

            {neuralError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm font-medium">
                {neuralError}
              </div>
            )}

            {neuralResult && (
              <div className="bg-gradient-to-br from-amber-50 to-white border border-amber-200 rounded-[2.5rem] p-6 animate-fadeIn shadow-2xl ring-8 ring-amber-50/50">
                 <div className="flex items-center justify-between mb-4 border-b border-amber-100 pb-4">
                    <div className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Neural Suggestion Engine</span>
                    </div>
                    <button onClick={() => setNeuralResult(null)} className="text-[10px] font-black text-slate-300 hover:text-red-400 uppercase">Discard</button>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1">
                        <span className="text-[8px] font-black text-amber-400 uppercase">Optimal Mapping</span>
                        <p className="text-lg font-black text-slate-900 leading-tight italic">"{neuralResult.targetTerm}"</p>
                    </div>
                    <div className="space-y-1">
                        <span className="text-[8px] font-black text-amber-400 uppercase">Syntactic Role</span>
                        <p className="text-sm font-bold text-amber-700">{neuralResult.pos}</p>
                    </div>
                    <div className="space-y-1">
                        <span className="text-[10px] font-black text-amber-400 uppercase">Linguistic Note</span>
                        <p className="text-[15px] font-medium text-slate-600 leading-relaxed italic">{neuralResult.notes}</p>
                    </div>
                 </div>
                 <button 
                    onClick={() => handleAdd()}
                    className="w-full mt-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                    Commit to Repository
                 </button>
              </div>
            )}

            {!neuralResult && (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="flex flex-col gap-1.5">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Manual Mapping</label>
                   <input 
                     type="text" 
                     value={targetTerm}
                     onChange={(e) => setTargetTerm(e.target.value)}
                     placeholder="Synthesized result..."
                     className="w-full bg-slate-50 border border-slate-200 rounded-[1.25rem] px-5 py-3 text-[13px] font-bold outline-none focus:border-amber-200 transition-all"
                   />
                 </div>
                 <div className="flex flex-col gap-1.5">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Context / Logic Notes</label>
                   <div className="flex gap-2">
                     <input 
                        type="text" 
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Usage rules or nuances..."
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-[1.25rem] px-5 py-3 text-[13px] font-bold outline-none"
                     />
                     <button 
                        type="button"
                        onClick={() => handleAdd()}
                        disabled={!sourceTerm.trim() || !targetTerm.trim()}
                        className="px-8 bg-amber-600 text-white rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-900/10 transition-all hover:bg-amber-700 active:scale-95 disabled:opacity-30"
                     >
                        Commit
                     </button>
                   </div>
                 </div>
               </div>
            )}

            <div className="relative">
              <input 
                type="text"
                placeholder="Filter repository by text or language pair..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-6 py-3 bg-slate-100/50 border border-slate-100 rounded-[1.5rem] text-[12px] font-bold outline-none focus:ring-4 focus:ring-slate-100 transition-all"
              />
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-white flex flex-col gap-4">
          {filteredDictionary.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-center opacity-40 italic">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
              <p className="text-[13px] font-black text-slate-300 uppercase tracking-[0.2em] mt-4">Repository Buffer Inactive</p>
            </div>
          ) : (
            filteredDictionary.map((entry) => (
              <div key={entry.id} className="flex flex-col gap-4 p-6 bg-slate-50 border border-slate-100 rounded-[2.5rem] hover:bg-white hover:border-amber-200 hover:shadow-2xl transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                        onClick={() => removeEntry(entry.id)}
                        className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl shadow-sm bg-white border border-slate-100 transition-all"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                </div>

                <div className="flex items-center gap-6 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-100 rounded-lg shadow-sm">
                      <div className="rounded-sm overflow-hidden"><FlagIcon country={entry.sourceLang} className="w-5 h-3 object-cover" /></div>
                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">→</span>
                      <div className="rounded-sm overflow-hidden"><FlagIcon country={entry.targetLang} className="w-5 h-3 object-cover" /></div>
                    </div>
                  </div>
                  
                  <div className="flex-1 flex items-center gap-8 min-w-0">
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Source Token</span>
                      <span className="text-[16px] font-black text-slate-900 truncate tracking-tight">{entry.sourceTerm}</span>
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest mb-1">Mapped Output</span>
                      <span className="text-[16px] font-black text-amber-700 truncate italic tracking-tight">"{entry.targetTerm}"</span>
                    </div>
                  </div>
                </div>

                {entry.notes && (
                    <div className="flex items-start gap-3">
                        <div className="mt-1 p-1 bg-amber-50 rounded-md text-amber-400"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                        <p className="text-[15px] font-bold text-slate-500 italic leading-relaxed">{entry.notes}</p>
                    </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{dictionary.length} Vectors Commited</span>
          <button 
            onClick={onClose}
            className="px-12 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-slate-800 transition-all shadow-xl active:scale-95"
          >
            Close Matrix
          </button>
        </div>
      </div>
    </div>
  );
};

export default DictionaryManager;