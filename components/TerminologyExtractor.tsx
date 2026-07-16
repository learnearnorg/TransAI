
import React, { useState } from 'react';
import { 
  Search, 
  FileText, 
  History, 
  Plus, 
  Check, 
  X, 
  Brain, 
  Loader2, 
  Database, 
  AlertCircle,
  ArrowRight,
  Book,
  Globe,
  Languages,
  Network,
  List
} from 'lucide-react';
import { extractGlossaryFromText, extractGlossaryFromPair } from '../services/geminiService';
import { UploadedFile, TranslationHistoryItem, SuggestedGlossaryItem, GlossaryItem } from '../types';
import { uiLanguages } from './languages';
import SemanticWordGraph from './SemanticWordGraph';

interface TerminologyExtractorProps {
  vaultFiles: UploadedFile[];
  history: TranslationHistoryItem[];
  glossary: GlossaryItem[];
  onUpdateGlossary: (glossary: GlossaryItem[]) => void;
}

const TerminologyExtractor: React.FC<TerminologyExtractorProps> = ({ 
  vaultFiles, 
  history, 
  glossary, 
  onUpdateGlossary 
}) => {
  const [sourceType, setSourceType] = useState<'vault' | 'history' | 'manual' | 'bilingual'>('vault');
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [manualText, setManualText] = useState('');
  const [bilingualSource, setBilingualSource] = useState('');
  const [bilingualTarget, setBilingualTarget] = useState('');
  const [sourceLang, setSourceLang] = useState('English');
  const [targetLang, setTargetLang] = useState('Mongolian');
  const [isExtracting, setIsExtracting] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedGlossaryItem[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'graph'>('list');

  const handleExtract = async () => {
    setIsExtracting(true);
    setExtractionError(null);
    setSuggestions([]);
    setSelectedSuggestions(new Set());

    try {
      let results: SuggestedGlossaryItem[] = [];

      if (sourceType === 'vault') {
        const file = vaultFiles.find(f => f.id === selectedFileId);
        if (!file || !file.content) {
          throw new Error("Please select a processed file from the vault.");
        }
        results = await extractGlossaryFromText(file.content, sourceLang);
      } else if (sourceType === 'history') {
        if (history.length === 0) {
          throw new Error("No translation history available.");
        }
        // Take last 20 items for context
        const recentHistory = history.slice(-20);
        const sourceCombined = recentHistory.map(h => h.sourceText).join('\n---\n');
        const targetCombined = recentHistory.map(h => h.translatedText).join('\n---\n');
        results = await extractGlossaryFromPair(sourceCombined, targetCombined, sourceLang, targetLang);
      } else if (sourceType === 'manual') {
        if (!manualText.trim()) {
          throw new Error("Please enter some text to analyze.");
        }
        results = await extractGlossaryFromText(manualText, sourceLang);
      } else if (sourceType === 'bilingual') {
        if (!bilingualSource.trim() || !bilingualTarget.trim()) {
          throw new Error("Please provide both source and target text.");
        }
        results = await extractGlossaryFromPair(bilingualSource, bilingualTarget, sourceLang, targetLang);
      }

      setSuggestions(results);
      // Auto-select high priority ones
      const initialSelected = new Set<string>();
      results.forEach(s => {
        if (s.priority === 'High') initialSelected.add(s.id);
      });
      setSelectedSuggestions(initialSelected);
    } catch (err: any) {
      console.error(err);
      setExtractionError(err.message || "Neural extraction failed. Please try again.");
    } finally {
      setIsExtracting(false);
    }
  };

  const toggleSuggestion = (id: string) => {
    const next = new Set(selectedSuggestions);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedSuggestions(next);
  };

  const handleAddToGlossary = () => {
    const itemsToAdd = suggestions
      .filter(s => selectedSuggestions.has(s.id))
      .map(s => ({ term: s.term, definition: s.definition }));
    
    // Filter out duplicates
    const existingTerms = new Set(glossary.map(g => g.term.toLowerCase()));
    const uniqueItemsToAdd = itemsToAdd.filter(item => !existingTerms.has(item.term.toLowerCase()));
    
    onUpdateGlossary([...glossary, ...uniqueItemsToAdd]);
    setSuggestions([]);
    setSelectedSuggestions(new Set());
    alert(`Successfully added ${uniqueItemsToAdd.length} terms to the Lexicon Repository.`);
  };

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
            <Brain className="text-indigo-400" />
            Neural Terminology Extraction
          </h2>
          <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mt-1">
            Automated Lexicon Discovery & Domain Analysis
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Source Selection */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="glass-panel p-6 rounded-[2rem] border-2 border-white/10 flex flex-col gap-4">
            <h3 className="text-[11px] font-black text-white uppercase tracking-widest mb-2">Extraction Source</h3>
            
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => setSourceType('vault')}
                className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${sourceType === 'vault' ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}`}
              >
                <Database size={18} />
                <div className="flex flex-col items-start">
                  <span className="text-[11px] font-black uppercase">Neural Vault</span>
                  <span className="text-[9px] font-bold opacity-70">Extract from uploaded assets</span>
                </div>
              </button>

              <button 
                onClick={() => setSourceType('history')}
                className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${sourceType === 'history' ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}`}
              >
                <History size={18} />
                <div className="flex flex-col items-start">
                  <span className="text-[11px] font-black uppercase">Translation History</span>
                  <span className="text-[9px] font-bold opacity-70">Infer from past work</span>
                </div>
              </button>

              <button 
                onClick={() => setSourceType('bilingual')}
                className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${sourceType === 'bilingual' ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}`}
              >
                <Languages size={18} />
                <div className="flex flex-col items-start">
                  <span className="text-[11px] font-black uppercase">Bilingual Pair</span>
                  <span className="text-[9px] font-bold opacity-70">Extract from source/target pair</span>
                </div>
              </button>

              <button 
                onClick={() => setSourceType('manual')}
                className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${sourceType === 'manual' ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}`}
              >
                <FileText size={18} />
                <div className="flex flex-col items-start">
                  <span className="text-[11px] font-black uppercase">Manual Input</span>
                  <span className="text-[9px] font-bold opacity-70">Paste raw text for analysis</span>
                </div>
              </button>
            </div>

            <div className="mt-4 pt-4 border-t border-white/10 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black text-indigo-300 uppercase tracking-widest">Source Lang</label>
                  <select 
                    value={sourceLang} 
                    onChange={(e) => setSourceLang(e.target.value)}
                    className="w-full bg-white/5 border border-white/20 rounded-xl p-2.5 text-[10px] font-bold text-white focus:outline-none focus:border-indigo-400"
                  >
                    {uiLanguages.map(l => (
                      <option key={l.code} value={l.englishName} className="bg-slate-900">{l.flag} {l.englishName}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black text-indigo-300 uppercase tracking-widest">Target Lang</label>
                  <select 
                    value={targetLang} 
                    onChange={(e) => setTargetLang(e.target.value)}
                    className="w-full bg-white/5 border border-white/20 rounded-xl p-2.5 text-[10px] font-bold text-white focus:outline-none focus:border-indigo-400"
                  >
                    {uiLanguages.map(l => (
                      <option key={l.code} value={l.englishName} className="bg-slate-900">{l.flag} {l.englishName}</option>
                    ))}
                  </select>
                </div>
              </div>

              {sourceType === 'vault' && (
                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-black text-indigo-300 uppercase tracking-widest">Select Asset</label>
                  <select 
                    value={selectedFileId || ''} 
                    onChange={(e) => setSelectedFileId(e.target.value)}
                    className="w-full bg-white/5 border border-white/20 rounded-xl p-3 text-[11px] font-bold text-white focus:outline-none focus:border-indigo-400"
                  >
                    <option value="" className="bg-slate-900">Choose a file...</option>
                    {vaultFiles.filter(f => f.processed).map(f => (
                      <option key={f.id} value={f.id} className="bg-slate-900">{f.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {sourceType === 'manual' && (
                <textarea 
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder="Paste text here for terminology analysis..."
                  className="w-full h-40 bg-white/5 border border-white/20 rounded-2xl p-4 text-[11px] font-bold text-white focus:outline-none focus:border-indigo-400 resize-none custom-scrollbar"
                />
              )}

              {sourceType === 'bilingual' && (
                <div className="flex flex-col gap-3">
                  <textarea 
                    value={bilingualSource}
                    onChange={(e) => setBilingualSource(e.target.value)}
                    placeholder="Paste source text..."
                    className="w-full h-24 bg-white/5 border border-white/20 rounded-2xl p-4 text-[11px] font-bold text-white focus:outline-none focus:border-indigo-400 resize-none custom-scrollbar"
                  />
                  <textarea 
                    value={bilingualTarget}
                    onChange={(e) => setBilingualTarget(e.target.value)}
                    placeholder="Paste target translation..."
                    className="w-full h-24 bg-white/5 border border-white/20 rounded-2xl p-4 text-[11px] font-bold text-white focus:outline-none focus:border-indigo-400 resize-none custom-scrollbar"
                  />
                </div>
              )}

              {sourceType === 'history' && (
                <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
                  <p className="text-[10px] font-bold text-indigo-200 leading-relaxed italic">
                    The AI will analyze your last {Math.min(history.length, 20)} translation segments to identify recurring technical patterns and domain-specific terminology mappings.
                  </p>
                </div>
              )}
            </div>

            <button 
              onClick={handleExtract}
              disabled={isExtracting}
              className="w-full mt-4 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {isExtracting ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Analyzing Semantics...
                </>
              ) : (
                <>
                  <Search size={16} />
                  Run Extraction
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results Area */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="glass-panel p-6 rounded-[2rem] border-2 border-white/10 flex flex-col h-[32rem] overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[11px] font-black text-white uppercase tracking-widest">Extracted Suggestions</h3>
              {suggestions.length > 0 && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-white/10 rounded-lg p-1">
                    <button 
                      onClick={() => setViewMode('list')}
                      className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-indigo-500 text-white shadow-sm' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                      title="List View"
                    >
                      <List size={14} />
                    </button>
                    <button 
                      onClick={() => setViewMode('graph')}
                      className={`p-1.5 rounded-md transition-all ${viewMode === 'graph' ? 'bg-indigo-500 text-white shadow-sm' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                      title="Semantic Graph View"
                    >
                      <Network size={14} />
                    </button>
                  </div>
                  <div className="w-px h-4 bg-white/20" />
                  <span className="text-[10px] font-bold text-indigo-300 uppercase">{selectedSuggestions.size} Selected</span>
                  <button 
                    onClick={handleAddToGlossary}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                  >
                    <Plus size={14} /> Add to Lexicon
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
              {extractionError && (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <AlertCircle size={48} className="text-rose-500 mb-4 opacity-50" />
                  <p className="text-white font-black uppercase tracking-widest text-[12px]">{extractionError}</p>
                </div>
              )}

              {isExtracting && (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <div className="relative w-24 h-24 mb-6">
                    <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-[2rem] animate-pulse"></div>
                    <div className="absolute inset-0 border-4 border-t-indigo-500 rounded-[2rem] animate-spin"></div>
                    <Brain className="absolute inset-0 m-auto text-indigo-400 animate-pulse" size={32} />
                  </div>
                  <h4 className="text-white font-black uppercase tracking-widest text-[14px] mb-2">Neural Scan in Progress</h4>
                  <p className="text-indigo-300 text-[10px] font-bold uppercase tracking-widest max-w-xs">
                    Our multi-agent system is identifying semantic patterns and domain-specific terminology...
                  </p>
                </div>
              )}

              {!isExtracting && suggestions.length === 0 && !extractionError && (
                <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-50">
                  <Database size={48} className="text-white mb-4" />
                  <p className="text-white font-black uppercase tracking-widest text-[12px]">No suggestions yet</p>
                  <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mt-2">Select a source and run extraction to begin</p>
                </div>
              )}

              {!isExtracting && suggestions.length > 0 && viewMode === 'graph' && (
                <div className="h-full w-full">
                  <SemanticWordGraph terms={suggestions} />
                </div>
              )}

              {viewMode === 'list' && (
                <div className="grid grid-cols-1 gap-3">
                  {suggestions.map((item) => (
                    <div 
                      key={item.id}
                      onClick={() => toggleSuggestion(item.id)}
                      className={`p-5 rounded-2xl border-2 transition-all cursor-pointer group ${selectedSuggestions.has(item.id) ? 'bg-indigo-600/20 border-indigo-500 shadow-lg' : 'bg-white/5 border-white/10 hover:border-white/20'}`}
                    >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-[14px] font-black text-white tracking-tight">{item.term}</span>
                          <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${
                            item.priority === 'High' ? 'bg-rose-500 text-white' : 
                            item.priority === 'Medium' ? 'bg-amber-500 text-white' : 
                            'bg-slate-500 text-white'
                          }`}>
                            {item.priority} Priority
                          </span>
                        </div>
                        <p className="text-[11px] font-bold text-indigo-200 mb-3 leading-relaxed">{item.definition}</p>
                        <div className="flex flex-wrap gap-2">
                          <div className="flex items-center gap-1.5 px-2 py-1 bg-white/10 rounded-lg">
                            <Search size={10} className="text-indigo-400" />
                            <span className="text-[8px] font-black text-white/60 uppercase">{item.reason}</span>
                          </div>
                          <div className="flex items-center gap-1.5 px-2 py-1 bg-white/10 rounded-lg">
                            <FileText size={10} className="text-indigo-400" />
                            <span className="text-[8px] font-bold text-white/40 italic">"{item.context}"</span>
                          </div>
                        </div>
                      </div>
                      <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${selectedSuggestions.has(item.id) ? 'bg-indigo-500 border-indigo-400 text-white' : 'border-white/20 text-transparent group-hover:border-white/40'}`}>
                        <Check size={14} strokeWidth={3} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TerminologyExtractor;
