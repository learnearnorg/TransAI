
import React, { useState, useEffect, useRef } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { translateWebsite, fetchPronunciationGuide, auditTranslationNPE } from '../services/geminiService';
import LanguageSelector from './LanguageSelector';
import PronunciationGuideTooltip from './PronunciationGuideTooltip';
import AuditMatrix from './AuditMatrix';
import { NPEReport } from '../types';
import { generateId } from '../utils/id';
import { Search, Share2, Printer, Copy, Check } from 'lucide-react';

const WebsiteTranslator: React.FC<{ onSave: (item: any) => void, targetLang: string, setTargetLang: (lang: string) => void }> = ({ onSave, targetLang, setTargetLang }) => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ content: string, title: string, sources: any[] } | null>(null);

  // Audit states
  const [isCopied, setIsCopied] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [npeReport, setNpeReport] = useState<NPEReport | null>(null);
  const [showAudit, setShowAudit] = useState(false);

  // Pronunciation states
  const [pronunciationGuide, setPronunciationGuide] = useState<{ phonetic: string; guide: string; text: string } | null>(null);
  const [isFetchingPronunciation, setIsFetchingPronunciation] = useState(false);
  const [pronunciationPos, setPronunciationPos] = useState({ x: 0, y: 0 });
  const outputContainerRef = useRef<HTMLDivElement>(null);

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

  const handleVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setIsLoading(true);
    setResult(null);
    setShowAudit(false);
    try {
      const data = await translateWebsite(url, targetLang);
      setResult(data);
      onSave({
        id: generateId(),
        sourceText: `Website: ${url}`,
        translatedText: data.title,
        sourceLang: 'WWW',
        targetLang,
        field: 'General',
        timestamp: Date.now(),
        type: 'website'
      });
    } catch (err: any) {
      alert(err.message || "Neural network failed to reach the requested URL.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAudit = async () => {
    if (!result || isAuditing) return;
    setIsAuditing(true);
    setNpeReport(null);
    setShowAudit(true);
    try {
      // For websites, we audit the content based on the title as a pseudo-source context
      const report = await auditTranslationNPE(result.title, result.content, "Web Source", targetLang);
      setNpeReport(report);
    } catch (err) {
      console.error(err);
      setShowAudit(false);
    } finally {
      setIsAuditing(false);
    }
  };

  const handleCopy = async () => {
    if (result?.content) {
      try {
        const markdownBody = outputContainerRef.current?.querySelector('.markdown-body');
        if (markdownBody && window.ClipboardItem) {
          // Clone the node to modify it for clipboard without affecting UI
          const clone = markdownBody.cloneNode(true) as HTMLElement;
          
          // Inline some basic table styles for Word compatibility
          const tables = clone.querySelectorAll('table');
          tables.forEach(table => {
            (table as HTMLElement).style.borderCollapse = 'collapse';
            (table as HTMLElement).style.width = '100%';
            (table as HTMLElement).style.margin = '12pt 0';
            (table as HTMLElement).style.border = '1px solid #e2e8f0';
            
            const cells = table.querySelectorAll('th, td');
            cells.forEach(cell => {
              (cell as HTMLElement).style.border = '1px solid #e2e8f0';
              (cell as HTMLElement).style.padding = '6pt';
              (cell as HTMLElement).style.textAlign = 'left';
            });
            
            const headers = table.querySelectorAll('th');
            headers.forEach(header => {
              (header as HTMLElement).style.backgroundColor = '#f8fafc';
              (header as HTMLElement).style.fontWeight = 'bold';
            });
          });

          const html = clone.innerHTML;
          const blobHtml = new Blob([html], { type: 'text/html' });
          const blobText = new Blob([result.content], { type: 'text/plain' });
          
          const data = [new ClipboardItem({
            'text/html': blobHtml,
            'text/plain': blobText,
          })];
          
          await navigator.clipboard.write(data);
        } else {
          await navigator.clipboard.writeText(result.content);
        }
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      } catch (err) {
        console.error('Advanced copy failed, falling back to text-only', err);
        navigator.clipboard.writeText(result.content);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      }
    }
  };

  const handlePrint = () => {
    if (!result) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>TransAI Web Synthesis: ${result.title}</title>
            <style>
              body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
              h1 { font-size: 24px; font-weight: 900; color: #0f172a; margin-bottom: 8px; }
              .url { font-size: 12px; color: #64748b; margin-bottom: 24px; font-family: monospace; }
              .content { font-size: 16px; }
              hr { border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0; }
            </style>
          </head>
          <body>
            <h1>${result.title}</h1>
            <div class="url">Source: ${url}</div>
            <div class="content">${result.content}</div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleShare = async () => {
    if (!result) return;
    const shareText = `Check out this translation of ${url}: ${result.title}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'TransAI Web Synthesis', text: shareText, url: url });
      } catch (err) { console.error(err); }
    } else {
      await navigator.clipboard.writeText(`${shareText}\n\n${result.content}`);
      alert('Neural context copied to clipboard.');
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      <form onSubmit={handleVisit} className="flex flex-col sm:flex-row gap-2 p-2 bg-slate-50 border border-slate-200 rounded-2xl shadow-inner items-center">
        <div className="flex-1 relative w-full">
          <input 
            type="text" 
            placeholder="Enter URL (e.g., https://news.google.com)" 
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-10 py-1.5 text-[12px] font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
          </div>
        </div>
        <LanguageSelector value={targetLang} onChange={setTargetLang} className="sm:w-[140px]" size="sm" />
        <button 
          type="submit" 
          disabled={isLoading}
          className="px-4 py-1.5 bg-indigo-600 text-white font-black uppercase tracking-widest text-[10px] rounded-lg shadow-lg hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 whitespace-nowrap"
        >
          {isLoading ? 'Crawling...' : 'Visit & Translate'}
        </button>
      </form>

      <div 
        ref={outputContainerRef}
        className="min-h-[400px] w-full bg-white border border-slate-200 rounded-[2.5rem] shadow-sm p-8 relative overflow-hidden flex flex-col"
      >
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400 animate-pulse">Neural Crawling & Rendering</p>
          </div>
        ) : showAudit ? (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <AuditMatrix 
              report={npeReport}
              isLoading={isAuditing}
              onApply={(revised) => { setResult(prev => prev ? {...prev, content: revised} : null); setShowAudit(false); }}
              onDiscard={() => setShowAudit(false)}
              targetLang={targetLang}
            />
          </div>
        ) : result ? (
          <div className="flex-1 flex flex-col gap-8 overflow-y-auto custom-scrollbar pr-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-2xl font-black text-slate-900 tracking-tighter italic">{result.title}</h2>
              <div className="flex gap-2">
                <button onClick={handlePrint} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-all" title="Print Synthesis">
                  <Printer size={18} />
                </button>
                <button onClick={handleCopy} className={`p-2 rounded-xl transition-all ${isCopied ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-50'}`} title="Copy to Buffer">
                  {isCopied ? <Check size={18}/> : <Copy size={18} />}
                </button>
                <button onClick={handleShare} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-all" title="Share Synthesis">
                  <Share2 size={18} />
                </button>
                <button onClick={handleAudit} disabled={isAuditing} className="px-4 py-2 bg-amber-50 text-amber-600 border border-amber-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-100 flex items-center gap-2 transition-all">
                   <Search size={14} /> Audit Content
                </button>
                <span className="px-3 py-1 bg-green-50 text-green-600 border border-green-100 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center">Grounding Active</span>
              </div>
            </div>
            
            <div className="markdown-body prose prose-indigo max-w-none text-slate-700 leading-relaxed font-medium">
               <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{result.content}</Markdown>
            </div>

            {result.sources && result.sources.length > 0 && (
              <div className="mt-8 pt-6 border-t border-slate-100">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-4">Neural Source Verification</span>
                <div className="flex flex-wrap gap-2">
                  {result.sources.map((src, i) => (
                    <a key={i} href={src.web?.uri} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-all flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      {src.web?.title || 'Source Link'}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center opacity-20 italic px-20 text-center gap-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
            <p className="text-sm font-bold">Neural web injection ready. Enter a URL to synthesize a translated representation of any global domain.</p>
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
    </div>
  );
};

export default WebsiteTranslator;
