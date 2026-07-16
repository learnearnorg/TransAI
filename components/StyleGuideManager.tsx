
import React, { useState } from 'react';
import { StyleGuide, UploadedFile, TranslationHistoryItem } from '../types';
import { generateId } from '../utils/id';
import { trainStyleGuide } from '../services/geminiService';
import { X, Plus, Book, Zap, Loader2, Check, Trash2, FileText, Sparkles, ChevronRight, History, Edit3, Save, Info, Wand2 } from 'lucide-react';
import StyleGuideGenerator from './StyleGuideGenerator';

interface StyleGuideManagerProps {
  styleGuides: StyleGuide[];
  onUpdate: (guides: StyleGuide[]) => void;
  onClose: () => void;
  vaultFiles: UploadedFile[];
  history: TranslationHistoryItem[];
}

const StyleGuideManager: React.FC<StyleGuideManagerProps> = ({ styleGuides, onUpdate, onClose, vaultFiles, history }) => {
  const [isTraining, setIsTraining] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<string>('');
  const [trainingStatus, setTrainingStatus] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showNeuralGenerator, setShowNeuralGenerator] = useState(false);
  const [newGuideName, setNewGuideName] = useState('');
  const [trainingSource, setTrainingSource] = useState<'vault' | 'history'>('vault');
  
  // Preview State
  const [previewGuide, setPreviewGuide] = useState<Partial<StyleGuide> & { analysis?: any } | null>(null);
  const [isEditingPreview, setIsEditingPreview] = useState(false);

  const handleTrain = async () => {
    let content = '';
    if (trainingSource === 'vault') {
      const file = vaultFiles.find(f => f.id === selectedFileId);
      if (!file || !file.content) return;
      content = file.content;
    } else {
      if (history.length === 0) return;
      content = history.map(h => `Source: ${h.sourceText}\nTarget: ${h.translatedText}`).join('\n\n');
    }

    setIsTraining(true);
    setTrainingStatus('Analyzing linguistic patterns...');
    try {
      const result = await trainStyleGuide(content);
      setPreviewGuide({
        name: newGuideName || (trainingSource === 'vault' ? vaultFiles.find(f => f.id === selectedFileId)?.name.split('.')[0] : 'History Analysis'),
        instructions: result.instructions,
        examples: result.examples,
        analysis: result.analysis
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsTraining(false);
      setTrainingStatus('');
    }
  };

  const handleSavePreview = () => {
    if (!previewGuide) return;
    const newGuide: StyleGuide = {
      id: generateId(),
      name: previewGuide.name || 'New Style Node',
      instructions: previewGuide.instructions || '',
      examples: previewGuide.examples || [],
      lastUpdated: Date.now()
    };
    onUpdate([newGuide, ...styleGuides]);
    setPreviewGuide(null);
    setShowAddForm(false);
    setNewGuideName('');
    setSelectedFileId('');
  };

  const handleDelete = (id: string) => {
    onUpdate(styleGuides.filter(g => g.id !== id));
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
      <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-[3rem] shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200">
              <Sparkles size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Enterprise Style Matrix</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Neural Training & Style Enforcement</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all">
            <X size={24} strokeWidth={3} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
          {previewGuide ? (
            <div className="space-y-8 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
                    <Check size={20} />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Analysis Complete</h3>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setIsEditingPreview(!isEditingPreview)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    {isEditingPreview ? <Save size={14} /> : <Edit3 size={14} />}
                    {isEditingPreview ? 'Lock Edits' : 'Refine Rules'}
                  </button>
                  <button 
                    onClick={handleSavePreview}
                    className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all"
                  >
                    Deploy to Matrix
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* AI Analysis Panel */}
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-slate-900 rounded-[2rem] p-6 text-white space-y-6 shadow-xl">
                    <div className="flex items-center gap-2 text-indigo-400">
                      <Zap size={16} fill="currentColor" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Neural Insights</span>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1">
                        <span className="text-[8px] font-black text-slate-500 uppercase">Tone & Voice</span>
                        <p className="text-xs font-bold text-slate-200">{previewGuide.analysis?.tone}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[8px] font-black text-slate-500 uppercase">Formality Level</span>
                        <div className="inline-block px-2 py-1 bg-indigo-500/20 text-indigo-400 rounded-lg text-[10px] font-black uppercase">
                          {previewGuide.analysis?.formality}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[8px] font-black text-slate-500 uppercase">Key Terminology</span>
                        <div className="flex flex-wrap gap-2">
                          {previewGuide.analysis?.terminology.map((term: string, i: number) => (
                            <span key={i} className="px-2 py-1 bg-slate-800 border border-slate-700 rounded-md text-[9px] font-bold text-slate-300">
                              {term}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[8px] font-black text-slate-500 uppercase">Punctuation Logic</span>
                        <p className="text-[10px] font-medium text-slate-400 leading-relaxed">{previewGuide.analysis?.punctuation}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-[2rem] space-y-3">
                    <div className="flex items-center gap-2 text-indigo-600">
                      <Info size={16} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Style Enforcement</span>
                    </div>
                    <p className="text-[10px] font-bold text-indigo-900/60 leading-relaxed">
                      These rules will be injected into the LLM context for all future translations using this style node.
                    </p>
                  </div>
                </div>

                {/* Content Editor Panel */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Extracted Instructions</span>
                    </div>
                    {isEditingPreview ? (
                      <textarea 
                        value={previewGuide.instructions}
                        onChange={(e) => setPreviewGuide({...previewGuide, instructions: e.target.value})}
                        className="w-full h-64 bg-slate-50 border border-slate-200 rounded-3xl p-6 text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all resize-none"
                      />
                    ) : (
                      <div className="w-full h-64 bg-slate-50 border border-slate-200 rounded-3xl p-6 overflow-y-auto">
                        <p className="text-sm font-medium text-slate-600 leading-relaxed whitespace-pre-wrap">{previewGuide.instructions}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Reference Patterns</span>
                    <div className="grid grid-cols-1 gap-3">
                      {previewGuide.examples?.map((ex, i) => (
                        <div key={i} className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between gap-4">
                          <div className="flex-1 space-y-1">
                            <span className="text-[7px] font-black text-slate-400 uppercase">Source</span>
                            <p className="text-[11px] font-bold text-slate-700 italic">"{ex.source}"</p>
                          </div>
                          <div className="text-indigo-400">
                            <ChevronRight size={16} />
                          </div>
                          <div className="flex-1 space-y-1">
                            <span className="text-[7px] font-black text-indigo-400 uppercase">Target</span>
                            <p className="text-[11px] font-black text-indigo-900">"{ex.target}"</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : !showAddForm ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button 
                onClick={() => setShowAddForm(true)}
                className="py-12 border-2 border-dashed border-slate-200 rounded-[3rem] flex flex-col items-center justify-center gap-4 text-slate-400 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/30 transition-all group"
              >
                <div className="p-6 bg-slate-50 rounded-full group-hover:scale-110 transition-transform shadow-sm">
                  <Plus size={32} />
                </div>
                <div className="text-center">
                  <span className="text-[14px] font-black uppercase tracking-[0.2em] block mb-1">Train New Style Node</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Extract linguistic DNA from assets or history</span>
                </div>
              </button>

              <button 
                onClick={() => setShowNeuralGenerator(true)}
                className="py-12 border-2 border-dashed border-emerald-200 rounded-[3rem] flex flex-col items-center justify-center gap-4 text-emerald-400 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50/30 transition-all group"
              >
                <div className="p-6 bg-emerald-50 rounded-full group-hover:scale-110 transition-transform shadow-sm">
                  <Wand2 size={32} />
                </div>
                <div className="text-center">
                  <span className="text-[14px] font-black uppercase tracking-[0.2em] block mb-1">Neural Style Extractor</span>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Generate guide from reference text</span>
                </div>
              </button>
            </div>
          ) : (
            <div className="p-8 bg-indigo-50/50 border border-indigo-100 rounded-[3rem] space-y-8 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-600 text-white rounded-xl">
                    <Zap size={20} fill="currentColor" />
                  </div>
                  <h3 className="text-[14px] font-black text-indigo-900 uppercase tracking-widest">Neural Training Configuration</h3>
                </div>
                <button onClick={() => setShowAddForm(false)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors"><X size={24} /></button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Style Node Name</label>
                    <input 
                      type="text" 
                      value={newGuideName}
                      onChange={(e) => setNewGuideName(e.target.value)}
                      placeholder="e.g. Global Marketing 2026"
                      className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-[13px] font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Training Source</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => setTrainingSource('vault')}
                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${trainingSource === 'vault' ? 'border-indigo-600 bg-indigo-600 text-white shadow-lg' : 'border-slate-200 bg-white text-slate-400 hover:border-indigo-200'}`}
                      >
                        <FileText size={20} />
                        <span className="text-[9px] font-black uppercase tracking-widest">Vault Asset</span>
                      </button>
                      <button 
                        onClick={() => setTrainingSource('history')}
                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${trainingSource === 'history' ? 'border-indigo-600 bg-indigo-600 text-white shadow-lg' : 'border-slate-200 bg-white text-slate-400 hover:border-indigo-200'}`}
                      >
                        <History size={20} />
                        <span className="text-[9px] font-black uppercase tracking-widest">History Data</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {trainingSource === 'vault' ? (
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Source Asset (Vault)</label>
                      <select 
                        value={selectedFileId}
                        onChange={(e) => setSelectedFileId(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-[13px] font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all appearance-none"
                      >
                        <option value="">Select training data...</option>
                        {vaultFiles.filter(f => f.processed).map(f => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </select>
                      <p className="text-[8px] font-bold text-slate-400 uppercase mt-2 px-1">Select a processed document to extract style rules from.</p>
                    </div>
                  ) : (
                    <div className="p-6 bg-white border border-slate-200 rounded-2xl space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">History Sample</span>
                        <span className="text-[10px] font-bold text-indigo-600 uppercase">{history.length} Items</span>
                      </div>
                      <p className="text-[10px] font-medium text-slate-500 leading-relaxed">
                        The AI will analyze your translation history to identify consistent tone, terminology, and formatting patterns you've used.
                      </p>
                      {history.length < 5 && (
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-xl text-[9px] font-bold uppercase flex items-center gap-2">
                          <Info size={14} />
                          Low sample size for accurate analysis
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <button 
                onClick={handleTrain}
                disabled={isTraining || (trainingSource === 'vault' && !selectedFileId) || (trainingSource === 'history' && history.length === 0)}
                className="w-full py-5 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isTraining ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    {trainingStatus}
                  </>
                ) : (
                  <>
                    <Zap size={18} fill="currentColor" />
                    Initiate Neural Extraction
                  </>
                )}
              </button>
            </div>
          )}

          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-widest">Active Style Nodes</h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{styleGuides.length} Enforced</span>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {styleGuides.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-slate-100 rounded-[2.5rem] bg-slate-50/30">
                  <p className="text-[11px] font-bold text-slate-400 uppercase italic">No style nodes identified in the matrix.</p>
                </div>
              ) : styleGuides.map((guide) => (
                <div key={guide.id} className="p-6 bg-white border border-slate-200 rounded-[2.5rem] hover:border-indigo-300 transition-all group shadow-sm hover:shadow-md">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-slate-50 text-slate-400 rounded-2xl group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                        <Book size={20} />
                      </div>
                      <div>
                        <h4 className="text-[14px] font-black text-slate-900 tracking-tight">{guide.name}</h4>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Last Synced: {new Date(guide.lastUpdated).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <button onClick={() => handleDelete(guide.id)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {guide.tone && (
                      <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg w-fit text-[9px] font-black uppercase tracking-widest">
                        <Zap size={10} fill="currentColor" />
                        Tone: {guide.tone}
                      </div>
                    )}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-2">Enforcement Rules</span>
                      <p className="text-[11px] font-medium text-slate-600 leading-relaxed line-clamp-3">{guide.instructions}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {guide.examples.slice(0, 3).map((ex, i) => (
                        <div key={i} className="p-3 bg-indigo-50/30 border border-indigo-100 rounded-xl flex flex-col gap-1">
                          <span className="text-[7px] font-black text-indigo-400 uppercase">Pattern {i+1}</span>
                          <p className="text-[9px] font-bold text-slate-700 truncate italic">"{ex.source}"</p>
                          <div className="flex items-center gap-1 text-indigo-600">
                            <ChevronRight size={10} />
                            <p className="text-[9px] font-black truncate">"{ex.target}"</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {showNeuralGenerator && (
          <StyleGuideGenerator 
            onSave={(guide) => {
              onUpdate([guide, ...styleGuides]);
              setShowNeuralGenerator(false);
            }}
            onClose={() => setShowNeuralGenerator(false)}
          />
        )}
      </div>
    </div>
  );
};

export default StyleGuideManager;
