
import React, { useState, useEffect } from 'react';
import { KnowledgeBase, UploadedFile, SemanticChunk } from '../types';
import { Database, Plus, Trash2, FileText, Search, Info, CheckCircle2, AlertCircle, Sparkles, Loader2 } from 'lucide-react';
import { generateId } from '../utils/id';
import { embedText } from '../services/geminiService';
import { cosineSimilarity } from '../utils/similarity';

interface KnowledgeBaseManagerProps {
  knowledgeBases: KnowledgeBase[];
  vaultFiles: UploadedFile[];
  onUpdateKnowledgeBases: (kb: KnowledgeBase[]) => void;
}

const KnowledgeBaseManager: React.FC<KnowledgeBaseManagerProps> = ({ 
  knowledgeBases, 
  vaultFiles, 
  onUpdateKnowledgeBases 
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newKB, setNewKB] = useState({ name: '', description: '' });
  const [selectedKBId, setSelectedKBId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNeuralSearch, setIsNeuralSearch] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [semanticResults, setSemanticResults] = useState<{ fileId: string; score: number }[]>([]);

  const selectedKB = knowledgeBases.find(kb => kb.id === selectedKBId);

  useEffect(() => {
    if (!searchQuery.trim() || !isNeuralSearch) {
      setSemanticResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const queryEmbedding = await embedText(searchQuery);
        const queryKeywords = searchQuery.toLowerCase().split(/\W+/).filter(w => w.length > 3);
        const scores: { fileId: string; score: number }[] = [];

        vaultFiles.forEach(file => {
          let maxScore = 0;
          
          if (file.chunks && file.chunks.length > 0) {
            file.chunks.forEach(chunk => {
              let similarity = 0;
              if (chunk.embedding) {
                similarity = cosineSimilarity(queryEmbedding, chunk.embedding);
              }
              
              let keywordScore = 0;
              const chunkTextLower = chunk.text.toLowerCase();
              queryKeywords.forEach(kw => {
                if (chunkTextLower.includes(kw)) {
                  const count = (chunkTextLower.match(new RegExp(kw, 'g')) || []).length;
                  keywordScore += 0.05 * Math.min(count, 3);
                }
              });
              
              const combinedScore = similarity + keywordScore;
              if (combinedScore > maxScore) maxScore = combinedScore;
            });
          } else if (file.content) {
             // Fallback for files without chunks
             let keywordScore = 0;
             const fileContentLower = file.content.toLowerCase();
             queryKeywords.forEach(kw => {
               if (fileContentLower.includes(kw)) keywordScore += 0.1;
             });
             if (keywordScore > 0 || fileContentLower.includes(searchQuery.toLowerCase())) {
               maxScore = 0.5 + keywordScore;
             }
          }

          if (maxScore > 0.3) {
            scores.push({ fileId: file.id, score: maxScore });
          }
        });

        setSemanticResults(scores.sort((a, b) => b.score - a.score));
      } catch (err) {
        console.error("Neural search failed", err);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, isNeuralSearch, vaultFiles]);

  const handleCreate = () => {
    if (!newKB.name.trim()) return;
    const kb: KnowledgeBase = {
      id: generateId(),
      name: newKB.name,
      description: newKB.description,
      fileIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isActive: true
    };
    onUpdateKnowledgeBases([...knowledgeBases, kb]);
    setNewKB({ name: '', description: '' });
    setIsCreating(false);
    setSelectedKBId(kb.id);
  };

  const handleDelete = (id: string) => {
    onUpdateKnowledgeBases(knowledgeBases.filter(kb => kb.id !== id));
    if (selectedKBId === id) setSelectedKBId(null);
  };

  const toggleFile = (fileId: string) => {
    if (!selectedKBId) return;
    const updated = knowledgeBases.map(kb => {
      if (kb.id === selectedKBId) {
        const fileIds = kb.fileIds.includes(fileId)
          ? kb.fileIds.filter(id => id !== fileId)
          : [...kb.fileIds, fileId];
        return { ...kb, fileIds, updatedAt: Date.now() };
      }
      return kb;
    });
    onUpdateKnowledgeBases(updated);
  };

  const toggleActive = (id: string) => {
    const updated = knowledgeBases.map(kb => {
      if (kb.id === id) return { ...kb, isActive: !kb.isActive, updatedAt: Date.now() };
      return kb;
    });
    onUpdateKnowledgeBases(updated);
  };

  const filteredFiles = isNeuralSearch 
    ? vaultFiles.filter(f => semanticResults.some(res => res.fileId === f.id))
        .sort((a, b) => {
          const scoreA = semanticResults.find(r => r.fileId === a.id)?.score || 0;
          const scoreB = semanticResults.find(r => r.fileId === b.id)?.score || 0;
          return scoreB - scoreA;
        })
    : vaultFiles.filter(f => 
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (f.content && f.content.toLowerCase().includes(searchQuery.toLowerCase()))
      );

  return (
    <div className="flex flex-col h-full bg-white rounded-[2.5rem] overflow-hidden border border-slate-200 shadow-xl animate-fadeIn">
      <div className="p-8 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-200">
              <Database size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Neural Knowledge Base</h2>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">Retrieval-Augmented Generation (RAG)</p>
            </div>
          </div>
          <button 
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95"
          >
            <Plus size={14} />
            New Corpus
          </button>
        </div>

        {isCreating && (
          <div className="p-6 bg-white border border-slate-200 rounded-3xl mb-6 shadow-xl animate-slideDown">
            <div className="space-y-4">
              <input 
                type="text" 
                placeholder="Corpus Name (e.g., Legal Precedents 2024)" 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                value={newKB.name}
                onChange={(e) => setNewKB({ ...newKB, name: e.target.value })}
              />
              <textarea 
                placeholder="Description of the knowledge domain..." 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all h-24 resize-none"
                value={newKB.description}
                onChange={(e) => setNewKB({ ...newKB, description: e.target.value })}
              />
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setIsCreating(false)}
                  className="px-6 py-2.5 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreate}
                  className="px-6 py-2.5 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition-all shadow-lg"
                >
                  Create Corpus
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {knowledgeBases.map(kb => (
            <div 
              key={kb.id} 
              onClick={() => setSelectedKBId(kb.id)}
              className={`p-5 rounded-3xl border transition-all cursor-pointer relative group ${selectedKBId === kb.id ? 'bg-indigo-50 border-indigo-200 shadow-md ring-2 ring-indigo-500/10' : 'bg-white border-slate-200 hover:border-indigo-200 hover:shadow-lg'}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-xl ${kb.isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                  <Database size={18} />
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleActive(kb.id); }}
                    className={`p-1.5 rounded-lg transition-all ${kb.isActive ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-300 hover:bg-slate-50'}`}
                    title={kb.isActive ? "Active" : "Inactive"}
                  >
                    <CheckCircle2 size={16} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDelete(kb.id); }}
                    className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <h3 className="font-black text-slate-900 text-sm mb-1 truncate">{kb.name}</h3>
              <p className="text-[10px] text-slate-500 line-clamp-2 mb-4 h-8 leading-relaxed">{kb.description || 'No description provided.'}</p>
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{kb.fileIds.length} Assets Linked</span>
                <span className="text-[9px] font-mono text-slate-300">{new Date(kb.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
          {knowledgeBases.length === 0 && !isCreating && (
            <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-100 rounded-[2.5rem]">
              <Database size={48} strokeWidth={1} className="mb-4 opacity-20" />
              <p className="text-[10px] font-black uppercase tracking-widest">No Knowledge Corpora Defined</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {selectedKB ? (
          <div className="flex-1 flex flex-col overflow-hidden animate-fadeIn">
            <div className="p-6 border-b border-slate-100 bg-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Linking Assets to "{selectedKB.name}"</h3>
                  <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest">Select files from your vault to include in this RAG corpus</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setIsNeuralSearch(!isNeuralSearch)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase transition-all ${isNeuralSearch ? 'bg-indigo-600 text-white border-indigo-700 shadow-lg shadow-indigo-200' : 'bg-white text-slate-400 border-slate-200 hover:border-indigo-300'}`}
                >
                  <Sparkles size={12} className={isNeuralSearch ? 'animate-pulse' : ''} />
                  Neural Mode
                </button>
                <div className="relative w-64">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {isSearching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                  </div>
                  <input 
                    type="text" 
                    placeholder={isNeuralSearch ? "Semantic search in vault..." : "Search Vault..."}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredFiles.map(file => {
                  const isLinked = selectedKB.fileIds.includes(file.id);
                  return (
                    <div 
                      key={file.id} 
                      onClick={() => toggleFile(file.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer group relative ${isLinked ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-xl ${isLinked ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                          <FileText size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-xs font-black text-slate-900 truncate mb-0.5">{file.name}</h4>
                            {isNeuralSearch && semanticResults.find(r => r.fileId === file.id) && (
                              <span className="text-[7px] font-black text-indigo-500 uppercase">
                                {Math.round((semanticResults.find(r => r.fileId === file.id)?.score || 0) * 100)}% Match
                              </span>
                            )}
                          </div>
                          <p className="text-[9px] font-mono text-slate-400 uppercase">{file.type} • {file.size}</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${isLinked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-200 text-transparent group-hover:border-slate-300'}`}>
                          <CheckCircle2 size={12} />
                        </div>
                      </div>
                      {!file.processed && (
                        <div className="mt-3 flex items-center gap-1.5 text-[8px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 px-2 py-1 rounded-lg w-fit">
                          <AlertCircle size={10} />
                          Requires Indexing
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300 p-12 text-center">
            <div className="p-8 rounded-full bg-slate-50 border border-slate-100 mb-6">
              <Info size={48} strokeWidth={1} className="opacity-20" />
            </div>
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-2">Select a Corpus to Manage</h3>
            <p className="max-w-xs text-[10px] font-medium text-slate-400 leading-relaxed uppercase tracking-tight">
              Link your translated assets to a corpus to enable context-aware neural translation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default KnowledgeBaseManager;
