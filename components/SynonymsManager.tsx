import React, { useState } from 'react';
import { X, Search, Book, Loader2 } from 'lucide-react';
import EditableText from './EditableText';
import { fetchSynonyms } from '../services/geminiService';

interface SynonymsManagerProps {
  onClose: () => void;
}

interface SynonymsResult {
  synonyms: string[];
  antonyms: string[];
  relatedTerms: string[];
}

const SynonymsManager: React.FC<SynonymsManagerProps> = ({ onClose }) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<SynonymsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setError(null);
    try {
      const res = await fetchSynonyms(query);
      setResult(res);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch synonyms.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 text-indigo-600">
            <Book className="w-5 h-5" />
            <EditableText as="h2" id="synonyms.title" className="font-bold">Synonyms Explorer</EditableText>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        
        <div className="p-4 border-b border-slate-100">
          <form className="flex gap-2" onSubmit={handleSearch}>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for synonyms..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
            <button 
              type="submit" 
              disabled={isSearching || !query.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Search
            </button>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col">
          {isSearching ? (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center text-red-500">
              {error}
            </div>
          ) : result ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">Synonyms</h3>
                <div className="flex flex-wrap gap-2">
                  {result.synonyms.map((s, i) => (
                    <span key={i} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium border border-indigo-100">
                      {s}
                    </span>
                  ))}
                  {result.synonyms.length === 0 && <span className="text-slate-400 text-sm">No synonyms found.</span>}
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">Antonyms</h3>
                <div className="flex flex-wrap gap-2">
                  {result.antonyms.map((a, i) => (
                    <span key={i} className="px-3 py-1.5 bg-rose-50 text-rose-700 rounded-lg text-sm font-medium border border-rose-100">
                      {a}
                    </span>
                  ))}
                  {result.antonyms.length === 0 && <span className="text-slate-400 text-sm">No antonyms found.</span>}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">Related Terms</h3>
                <div className="flex flex-wrap gap-2">
                  {result.relatedTerms.map((r, i) => (
                    <span key={i} className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium border border-slate-200">
                      {r}
                    </span>
                  ))}
                  {result.relatedTerms.length === 0 && <span className="text-slate-400 text-sm">No related terms found.</span>}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              <div className="text-center">
                <Book className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <EditableText id="synonyms.empty">Search for a word to find its synonyms and related terms.</EditableText>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SynonymsManager;
