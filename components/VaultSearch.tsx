
import React, { useState, useEffect } from 'react';
import { UploadedFile, SemanticChunk } from '../types';
import { embedText } from '../services/geminiService';
import { cosineSimilarity } from '../utils/similarity';
import { Search, Loader2, FileText, ArrowRight, Sparkles } from 'lucide-react';

interface VaultSearchProps {
  vaultFiles: UploadedFile[];
  onInjectText: (text: string) => void;
}

const VaultSearch: React.FC<VaultSearchProps> = ({ vaultFiles, onInjectText }) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<{ chunk: SemanticChunk; fileName: string; score: number }[]>([]);

  // Automatically clear or filter results when vault files are removed
  useEffect(() => {
    if (vaultFiles.length === 0) {
      setResults([]);
      setQuery('');
    } else {
      // Filter out results from files that no longer exist
      setResults(prev => prev.filter(res => vaultFiles.some(f => f.name === res.fileName)));
    }
  }, [vaultFiles]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isSearching) return;

    setIsSearching(true);
    try {
      const queryEmbedding = await embedText(query);
      const queryKeywords = query.toLowerCase().split(/\W+/).filter(w => w.length > 3);
      const allResults: { chunk: SemanticChunk; fileName: string; score: number }[] = [];

      vaultFiles.forEach(file => {
        if (file.chunks) {
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
            
            if (combinedScore > 0.5) { // Threshold for relevance
              allResults.push({ chunk, fileName: file.name, score: combinedScore });
            }
          });
        }
      });

      setResults(allResults.sort((a, b) => b.score - a.score).slice(0, 5));
    } catch (err) {
      console.error("Semantic search failed", err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 animate-fadeIn">
      <form onSubmit={handleSearch} className="relative">
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Semantic search in vault..."
          className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl px-5 py-3 text-[12px] font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all pr-12"
        />
        <button 
          type="submit"
          disabled={isSearching || !query.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-indigo-400 hover:text-indigo-300 disabled:opacity-50 transition-all"
        >
          {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
        </button>
      </form>

      {results.length > 0 && (
        <div className="flex flex-col gap-2 animate-fadeIn">
          <div className="flex items-center gap-2 px-1">
            <Sparkles size={12} className="text-amber-400" />
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Neural Matches</span>
          </div>
          {results.map((result, idx) => (
            <div 
              key={idx}
              className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col gap-2 group hover:border-indigo-500/50 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-500">
                  <FileText size={12} />
                  <span className="text-[8px] font-black uppercase truncate max-w-[150px]">{result.fileName}</span>
                </div>
                <span className="text-[8px] font-black text-indigo-400 uppercase">{Math.round(result.score * 100)}% Match</span>
              </div>
              <p className="text-[10px] font-medium text-slate-300 line-clamp-3 leading-relaxed italic">
                "{result.chunk.text}"
              </p>
              <button 
                onClick={() => onInjectText(result.chunk.text)}
                className="self-end flex items-center gap-1 text-[8px] font-black text-indigo-400 uppercase hover:text-indigo-300 transition-all"
              >
                Inject Fragment <ArrowRight size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {query && !isSearching && results.length === 0 && (
        <div className="py-4 text-center border border-dashed border-slate-800 rounded-2xl">
          <p className="text-[9px] font-bold text-slate-500 uppercase italic">No semantic matches found</p>
        </div>
      )}
    </div>
  );
};

export default VaultSearch;
