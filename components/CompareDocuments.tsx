
import React, { useState, useRef, useEffect } from 'react';
import { compareDocuments, fetchPronunciationGuide } from '../services/geminiService';
import { ProfessionalField, ComparisonReport } from '../types';
import { generateId } from '../utils/id';
import LanguageSelector from './LanguageSelector';
import PronunciationGuideTooltip from './PronunciationGuideTooltip';
import EditableText from './EditableText';
import * as diff from 'diff';

const CompareDocuments: React.FC<{ onSave: (item: any) => void, field: ProfessionalField, targetLang: string, setTargetLang: (lang: string) => void }> = ({ onSave, field, targetLang, setTargetLang }) => {
  const [textA, setTextA] = useState('');
  const [textB, setTextB] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<ComparisonReport | null>(null);
  const [activeTab, setActiveTab] = useState<'ai' | 'visual'>('ai');
  const [visualDiff, setVisualDiff] = useState<diff.Change[]>([]);
  
  const fileInputARef = useRef<HTMLInputElement>(null);
  const fileInputBRef = useRef<HTMLInputElement>(null);
  const outputContainerRef = useRef<HTMLDivElement>(null);

  // Pronunciation states
  const [pronunciationGuide, setPronunciationGuide] = useState<{ phonetic: string; guide: string; text: string } | null>(null);
  const [isFetchingPronunciation, setIsFetchingPronunciation] = useState(false);
  const [pronunciationPos, setPronunciationPos] = useState({ x: 0, y: 0 });

  // Selection detection for pronunciation guide
  useEffect(() => {
    const handleSelection = async () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        if (!isFetchingPronunciation) setPronunciationGuide(null);
        return;
      }

      const selectedText = selection.toString().trim();
      if (!selectedText || selectedText.length > 100) {
        setPronunciationGuide(null);
        return;
      }

      if (outputContainerRef.current && outputContainerRef.current.contains(selection.anchorNode)) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        setPronunciationPos({
          x: rect.left + rect.width / 2,
          y: rect.top - 10
        });

        setIsFetchingPronunciation(true);
        try {
          const guide = await fetchPronunciationGuide(selectedText, targetLang);
          setPronunciationGuide({ ...guide, text: selectedText });
        } catch (e) {
          console.error(e);
        } finally {
          setIsFetchingPronunciation(false);
        }
      }
    };

    document.addEventListener('mouseup', handleSelection);
    return () => document.removeEventListener('mouseup', handleSelection);
  }, [targetLang, isFetchingPronunciation]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'A' | 'B') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (target === 'A') setTextA(content);
      else setTextB(content);
    };
    reader.readAsText(file);
  };

  const handleCompare = async () => {
    if (!textA.trim() || !textB.trim()) return;
    setIsLoading(true);
    setReport(null);
    
    // Generate visual diff
    const diffResult = diff.diffWordsWithSpace(textA, textB);
    setVisualDiff(diffResult);

    try {
      const data = await compareDocuments(textA, textB, field);
      setReport(data);
      onSave({
        id: generateId(),
        sourceText: "Document Comparison Cycle",
        translatedText: `Comparison Delta: ${data.similarityScore}% similarity`,
        sourceLang: "Matrix A",
        targetLang: "Matrix B",
        field,
        timestamp: Date.now(),
        type: 'compare'
      });
    } catch (err) {
      alert("Neural comparison failed. Check your data packets.");
    } finally {
      setIsLoading(false);
    }
  };

  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case 'Critical': return 'text-rose-600 bg-rose-50 border-rose-100';
      case 'Moderate': return 'text-amber-600 bg-amber-50 border-amber-100';
      default: return 'text-indigo-600 bg-indigo-50 border-indigo-100';
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center px-4">
            <EditableText id="compare.doc_a" className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Base document (A)</EditableText>
            <button onClick={() => fileInputARef.current?.click()} className="text-[9px] font-bold text-indigo-500 hover:underline uppercase">Upload File</button>
            <input type="file" ref={fileInputARef} onChange={(e) => handleFileUpload(e, 'A')} className="hidden" accept=".txt,.md" />
          </div>
          <textarea 
            value={textA}
            onChange={(e) => setTextA(e.target.value)}
            placeholder="Paste source text or translation version A..."
            className="w-full h-64 p-4 bg-slate-50 border border-slate-200 rounded-[2rem] resize-none focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm font-medium shadow-inner"
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center px-4">
            <EditableText id="compare.doc_b" className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Revised document (B)</EditableText>
            <button onClick={() => fileInputBRef.current?.click()} className="text-[9px] font-bold text-indigo-500 hover:underline uppercase">Upload File</button>
            <input type="file" ref={fileInputBRef} onChange={(e) => handleFileUpload(e, 'B')} className="hidden" accept=".txt,.md" />
          </div>
          <textarea 
            value={textB}
            onChange={(e) => setTextB(e.target.value)}
            placeholder="Paste revised text or translation version B..."
            className="w-full h-64 p-4 bg-slate-50 border border-slate-200 rounded-[2rem] resize-none focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm font-medium shadow-inner"
          />
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-center gap-4">
        <LanguageSelector value={targetLang} onChange={setTargetLang} className="w-[172px]" />
        <button 
          onClick={handleCompare}
          disabled={isLoading || !textA.trim() || !textB.trim()}
          className="px-12 py-4 bg-indigo-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-xs shadow-2xl hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
        >
          {isLoading ? <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> <EditableText id="compare.btn_processing">Scanning Delta...</EditableText></span> : <EditableText id="compare.btn_action">Analyze Synaptic Delta</EditableText>}
        </button>
      </div>

      {report && (
        <div className="space-y-8 mt-4 animate-fadeIn relative" ref={outputContainerRef}>
          
          {/* Tabs */}
          <div className="flex items-center gap-4 border-b border-slate-200">
            <button 
              onClick={() => setActiveTab('ai')}
              className={`px-6 py-3 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'ai' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              AI Analysis
            </button>
            <button 
              onClick={() => setActiveTab('visual')}
              className={`px-6 py-3 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'visual' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Visual Diff
            </button>
          </div>

          {activeTab === 'ai' ? (
            <>
              <div className="p-8 bg-white border border-slate-200 rounded-[2.5rem] shadow-sm flex flex-col md:flex-row gap-8 items-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="relative w-24 h-24 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth={8} fill="transparent" className="text-slate-100" />
                      <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth={8} fill="transparent" strokeDasharray={251.2} strokeDashoffset={251.2 * (1 - report.similarityScore / 100)} className="text-indigo-500 transition-all duration-1000" />
                    </svg>
                    <span className="absolute text-lg font-black text-slate-900">{report.similarityScore}%</span>
                  </div>
                  <EditableText id="compare.similarity_label" className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Similarity</EditableText>
                </div>
                <div className="flex-1 space-y-4">
                  <div className="flex flex-col gap-1">
                    <EditableText as="h3" id="compare.summary_title" className="text-sm font-black text-indigo-600 uppercase tracking-widest">Neural Summary</EditableText>
                    <p className="text-slate-700 font-medium leading-normal italic">"{report.summary}"</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                 <EditableText as="h4" id="compare.delta_title" className="text-[12px] font-black text-slate-700 uppercase tracking-widest px-4">Identified Discrepancies</EditableText>
                 <div className="grid grid-cols-1 gap-4">
                    {report.differences.map((diff, idx) => (
                      <div key={idx} className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm flex flex-col gap-6 group hover:shadow-xl transition-all duration-500">
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-3">
                             <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getSeverityColor(diff.severity)}`}>{diff.severity}</span>
                             <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{diff.type} Change</span>
                           </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-y border-slate-50 py-6">
                           <div className="space-y-2">
                             <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Matrix A Fragment</span>
                             <p className="text-sm font-bold text-slate-400 line-through opacity-60 italic">"{diff.fragmentA}"</p>
                           </div>
                           <div className="space-y-2">
                             <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Matrix B Refinement</span>
                             <p className="text-sm font-black text-indigo-900">"{diff.fragmentB}"</p>
                           </div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                           <p className="text-[12px] font-bold text-slate-600 leading-normal"><span className="text-indigo-600">Linguistic Analysis:</span> {diff.analysis}</p>
                        </div>
                      </div>
                    ))}
                 </div>
              </div>

              <div className="p-10 bg-indigo-900 rounded-[3rem] shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl group-hover:scale-150 transition-transform duration-1000" />
                <div className="relative z-10 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500 rounded-xl text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9s2.015-9 4.5-9m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" /></svg>
                    </div>
                    <EditableText id="compare.synthesis_title" className="text-xs font-black text-indigo-300 uppercase tracking-[0.3em]">Consolidated Optimum Synthesis</EditableText>
                  </div>
                  <p className="text-lg md:text-xl font-bold text-white leading-normal tracking-tight italic">"{report.optimizedSynthesis}"</p>
                  <button onClick={() => navigator.clipboard.writeText(report.optimizedSynthesis)} className="px-6 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all backdrop-blur-md">Copy Synthesis</button>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm p-8">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">Inline Visual Diff</h3>
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                {visualDiff.map((part, index) => (
                  <span 
                    key={index} 
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
              <div className="flex items-center gap-6 mt-6 pt-6 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-rose-100 border border-rose-200" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Removed from A</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-emerald-100 border border-emerald-200" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Added in B</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Pronunciation Tooltip */}
          <PronunciationGuideTooltip 
            guide={pronunciationGuide}
            isFetching={isFetchingPronunciation}
            position={pronunciationPos}
            onClose={() => setPronunciationGuide(null)}
          />
        </div>
      )}
    </div>
  );
};

export default CompareDocuments;
