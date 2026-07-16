import React, { useState } from 'react';
import { generateId } from '../utils/id';
import { TranslationHistoryItem, TranslationMemoryEntry, TranslationVersion } from '../types';
import FlagIcon from './FlagIcon';
import { ShieldCheck, Database, Check, Search, Clock, Download, AlertCircle, History as HistoryIcon, X } from 'lucide-react';
import * as diff from 'diff';

interface HistoryProps {
  history: TranslationHistoryItem[];
  onClear: () => void;
  translationMemory: TranslationMemoryEntry[];
  onUpdateMemory: (memory: TranslationMemoryEntry[]) => void;
  onRunLQA?: (item: TranslationHistoryItem) => void;
  onUpdateHistoryItem?: (item: TranslationHistoryItem) => void;
}

const History: React.FC<HistoryProps> = ({ history, onClear, translationMemory, onUpdateMemory, onRunLQA, onUpdateHistoryItem }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVersionItem, setSelectedVersionItem] = useState<TranslationHistoryItem | null>(null);

  const filteredHistory = history.filter(item => 
    item.sourceText.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.translatedText.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSaveToMemory = (item: TranslationHistoryItem) => {
    // Check for duplicates
    const isDuplicate = translationMemory.some(m => 
      m.sourceLang === item.sourceLang &&
      m.targetLang === item.targetLang &&
      m.sourceSegment.toLowerCase() === (item.sourceText?.trim() ?? '').toLowerCase()
    );

    if (isDuplicate) return;

    const newEntry: TranslationMemoryEntry = {
      id: generateId(),
      sourceLang: item.sourceLang,
      targetLang: item.targetLang,
      sourceSegment: item.sourceText?.trim() ?? '',
      targetSegment: item.translatedText?.trim() ?? '',
      usageCount: 1,
      lastUsed: Date.now()
    };

    onUpdateMemory([...translationMemory, newEntry]);
  };

  const isSavedToMemory = (item: TranslationHistoryItem) => {
    return translationMemory.some(m => 
      m.sourceLang === item.sourceLang &&
      m.targetLang === item.targetLang &&
      m.sourceSegment.toLowerCase() === (item.sourceText?.trim() ?? '').toLowerCase()
    );
  };

  const handleExportCSV = () => {
    if (history.length === 0) return;
    
    const headers = ['ID', 'Type', 'Source Lang', 'Target Lang', 'Source Text', 'Translated Text', 'Timestamp', 'LQA Score'];
    const rows = history.map(item => [
      item.id,
      item.type,
      item.sourceLang,
      item.targetLang,
      `"${(item.sourceText || '').replace(/"/g, '""')}"`,
      `"${(item.translatedText || '').replace(/"/g, '""')}"`,
      new Date(item.timestamp).toISOString(),
      item.qualityReport?.overallScore || ''
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `transai_history_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-4 opacity-70">
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <p className="text-[11px] font-bold uppercase tracking-widest text-center">No synaptic records found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 animate-fadeIn">
      <div className="flex justify-between items-center mb-1">
        <h3 className="text-[11px] font-black text-slate-600 uppercase tracking-widest">History Log</h3>
        <div className="flex items-center gap-3">
          <button onClick={handleExportCSV} className="flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-700 font-black uppercase tracking-widest active:scale-95 transition-all">
            <Download size={12} /> Export
          </button>
          <button onClick={onClear} className="text-[11px] text-red-600 hover:text-red-700 font-black uppercase tracking-widest underline underline-offset-4 active:scale-95 transition-all">Wipe</button>
        </div>
      </div>

      <div className="relative mb-2">
        <input 
          type="text" 
          placeholder="Filter history..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-2xl text-[12px] font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm"
        />
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
      </div>

      <div className="flex flex-col gap-3">
        {filteredHistory.length > 0 ? (
          filteredHistory.map((item) => {
            const saved = isSavedToMemory(item);
            return (
              <div key={item.id} className="p-4 bg-white border border-slate-200 rounded-[1.25rem] hover:border-indigo-300 hover:shadow-md transition-all group relative">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${item.type === 'text' ? 'bg-blue-50 text-blue-700' : item.type === 'image' ? 'bg-purple-50 text-purple-700' : 'bg-green-50 text-green-700'}`}>
                      {item.type}
                    </span>
                    {item.qualityReport && (
                      <span className="flex items-center gap-1 text-[8px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                        <ShieldCheck size={10} />
                        LQA: {item.qualityReport.overallScore}/100
                      </span>
                    )}
                    {saved && (
                      <span className="flex items-center gap-1 text-[8px] font-black text-emerald-600 uppercase tracking-widest">
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        Archived
                      </span>
                    )}
                    {item.priority && (
                      <span className={`flex items-center gap-1 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${
                        item.priority === 'Critical' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                        item.priority === 'High' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                        item.priority === 'Medium' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                        'bg-slate-50 text-slate-600 border-slate-200'
                      }`}>
                        <AlertCircle size={10} />
                        {item.priority}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {onUpdateHistoryItem && (
                      <select 
                        value={item.priority || ''}
                        onChange={(e) => onUpdateHistoryItem({ ...item, priority: e.target.value as any || undefined })}
                        className="text-[8px] font-black uppercase tracking-widest bg-slate-50 border border-slate-200 text-slate-500 rounded px-1 py-0.5 outline-none focus:border-indigo-300"
                      >
                        <option value="">Set Priority</option>
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Critical">Critical</option>
                      </select>
                    )}
                    <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest">
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] font-bold text-slate-500 mb-1 line-clamp-1 italic tracking-tight opacity-80">"{item.sourceText}"</p>
                <p className="text-slate-950 font-black text-[14px] line-clamp-2 leading-tight tracking-tight">{item.translatedText}</p>
                
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] font-black text-indigo-700 uppercase tracking-widest">
                    <div className="flex items-center gap-1.5">
                      <div className="rounded-[2px] overflow-hidden shadow-sm">
                        <FlagIcon country={item.sourceLang} className="w-5 h-3 object-cover" />
                      </div>
                      <span>{item.sourceLang}</span>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                    <div className="flex items-center gap-1.5">
                      <div className="rounded-[2px] overflow-hidden shadow-sm">
                        <FlagIcon country={item.targetLang} className="w-5 h-3 object-cover" />
                      </div>
                      <span>{item.targetLang}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {item.versions && item.versions.length > 0 && (
                      <button 
                        onClick={() => setSelectedVersionItem(item)}
                        className="p-2 rounded-xl border bg-slate-50 border-slate-200 text-slate-500 hover:text-indigo-700 hover:border-indigo-200 hover:bg-indigo-50 active:scale-90 transition-all"
                        title="View Version History & Visual Diff"
                      >
                        <HistoryIcon size={18} strokeWidth={2.5} />
                      </button>
                    )}
                    <button 
                      onClick={() => onRunLQA?.(item)}
                      className={`p-2 rounded-xl border transition-all ${item.qualityReport ? 'bg-indigo-600 text-white border-indigo-700 shadow-lg' : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-indigo-700 hover:border-indigo-200 hover:bg-indigo-50 active:scale-90'}`}
                      title={item.qualityReport ? "View LQA Report" : "Run LQA Audit"}
                    >
                      <ShieldCheck size={18} strokeWidth={2.5} />
                    </button>
                    <button 
                      onClick={() => handleSaveToMemory(item)}
                      disabled={saved}
                      aria-label="Save this pair to Translation Memory"
                      className={`p-2 rounded-xl border transition-all ${saved ? 'bg-emerald-50 border-emerald-200 text-emerald-600 opacity-50' : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-indigo-700 hover:border-indigo-200 hover:bg-indigo-50 active:scale-90'}`}
                    >
                      <Database size={18} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-8 text-center text-slate-500 opacity-60">
            <p className="text-[11px] font-black uppercase tracking-[0.2em]">No matches found</p>
          </div>
        )}
      </div>

      {/* Version History Modal */}
      {selectedVersionItem && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                  <HistoryIcon size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Version History</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Visual Diff & Revisions</p>
                </div>
              </div>
              <button onClick={() => setSelectedVersionItem(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar flex flex-col gap-8">
              <div className="space-y-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Source Text</span>
                <p className="text-sm font-medium text-slate-700 p-4 bg-slate-50 rounded-2xl border border-slate-100">{selectedVersionItem.sourceText}</p>
              </div>

              <div className="space-y-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Revision Timeline</span>
                
                <div className="flex flex-col gap-4">
                  {selectedVersionItem.versions?.map((version, idx) => {
                    const isLast = idx === (selectedVersionItem.versions?.length || 0) - 1;
                    const nextVersionText = isLast ? selectedVersionItem.translatedText : selectedVersionItem.versions![idx + 1].text;
                    const diffResult = diff.diffWordsWithSpace(version.text, nextVersionText);
                    
                    return (
                      <div key={version.id} className="border border-slate-200 rounded-2xl overflow-hidden">
                        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-black text-slate-700 uppercase tracking-widest">Version {idx + 1}</span>
                            <span className="text-[10px] font-bold text-slate-500">{new Date(version.timestamp).toLocaleString()}</span>
                          </div>
                          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg uppercase tracking-widest">
                            Compared to {isLast ? 'Current' : `Version ${idx + 2}`}
                          </span>
                        </div>
                        <div className="p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap bg-white">
                          {diffResult.map((part, i) => (
                            <span 
                              key={i} 
                              className={
                                part.added ? 'bg-emerald-100 text-emerald-800 font-bold px-1 rounded' : 
                                part.removed ? 'bg-rose-100 text-rose-800 line-through px-1 rounded opacity-70' : 
                                'text-slate-700'
                              }
                            >
                              {part.value}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Current Version Display */}
                  <div className="border-2 border-indigo-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="bg-indigo-50 px-4 py-3 border-b border-indigo-100 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-indigo-700 uppercase tracking-widest">Current Version</span>
                        <span className="text-[10px] font-bold text-indigo-500">{new Date(selectedVersionItem.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="p-4 text-sm font-medium text-slate-900 bg-white">
                      {selectedVersionItem.translatedText}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default History;