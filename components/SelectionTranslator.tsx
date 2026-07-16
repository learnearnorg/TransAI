
import React, { useState, useEffect, useRef } from 'react';
import { translateText, chatWithCopilot } from '../services/geminiService';
import { Languages, X, Copy, Check, Loader2, MessageSquare, Send } from 'lucide-react';

interface SelectionTranslatorProps {
  targetLang: string;
}

const SelectionTranslator: React.FC<SelectionTranslatorProps> = ({ targetLang }) => {
  const [selection, setSelection] = useState<string>('');
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [showButton, setShowButton] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [mode, setMode] = useState<'translate' | 'chat'>('translate');
  const [translatedText, setTranslatedText] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: 'user'|'copilot', text: string}[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      setTimeout(() => {
        const sel = window.getSelection();
        const text = sel?.toString().trim();

        if (text && text.length > 0 && text.length < 1000) {
          const range = sel?.getRangeAt(0);
          const rect = range?.getBoundingClientRect();
          
          if (rect && rect.width > 0) {
            setSelection(text);
            setPosition({
              x: rect.left + rect.width / 2,
              y: rect.top + window.scrollY - 10
            });
            setShowButton(true);
          }
        } else {
          if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
            setShowButton(false);
            if (!showResult) {
              setSelection('');
            }
          }
        }
      }, 50);
    };

    const handleMouseDown = (e: MouseEvent) => {
       if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setShowButton(false);
          setShowResult(false);
          setChatHistory([]);
          setChatInput('');
       }
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [showResult]);

  const handleTranslate = async () => {
    if (!selection) return;
    setMode('translate');
    setIsLoading(true);
    setShowResult(true);
    setShowButton(false);
    
    try {
      const result = await translateText(selection, 'Auto-Detect', targetLang);
      setTranslatedText(result.text);
    } catch (err: any) {
      console.error(err);
      setTranslatedText(err.message || 'Translation failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCopilot = () => {
    setMode('chat');
    setShowResult(true);
    setShowButton(false);
    setChatHistory([{ role: 'copilot', text: `I'm your Linguistic Copilot. How can I help you with the selected text?\n\n"${selection.substring(0, 50)}${selection.length > 50 ? '...' : ''}"` }]);
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() || !selection) return;
    
    const userMsg = chatInput;
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const response = await chatWithCopilot(selection, userMsg, 'Auto-Detect', targetLang);
      setChatHistory(prev => [...prev, { role: 'copilot', text: response }]);
    } catch (err) {
      console.error(err);
      setChatHistory(prev => [...prev, { role: 'copilot', text: 'Sorry, I encountered an error processing your request.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (!showButton && !showResult) return null;

  return (
    <div 
      ref={containerRef}
      className="fixed z-[9999] pointer-events-none"
      style={{ left: position.x, top: position.y, transform: 'translateX(-50%) translateY(-100%)' }}
    >
      <div className="pointer-events-auto">
        {showButton && (
          <div className="flex items-center gap-2 animate-bounceIn">
            <button 
              onClick={handleTranslate}
              className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-full shadow-2xl hover:bg-indigo-700 transition-all text-[10px] font-black uppercase tracking-widest border border-indigo-400"
            >
              <Languages size={12} />
              Translate
            </button>
            <button 
              onClick={handleOpenCopilot}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-white rounded-full shadow-2xl hover:bg-slate-700 transition-all text-[10px] font-black uppercase tracking-widest border border-slate-600"
            >
              <MessageSquare size={12} />
              Ask Copilot
            </button>
          </div>
        )}

        {showResult && (
          <div className="w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 animate-fadeIn flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                {mode === 'translate' ? `${targetLang} Synthesis` : 'Linguistic Copilot'}
              </span>
              <button onClick={() => { setShowResult(false); setChatHistory([]); }} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
            </div>
            
            {mode === 'translate' ? (
              <>
                <div className="max-h-40 overflow-y-auto custom-scrollbar text-[13px] font-medium text-slate-700 leading-relaxed italic">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-4 gap-2">
                      <Loader2 size={16} className="animate-spin text-indigo-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Neural Sync...</span>
                    </div>
                  ) : (
                    translatedText
                  )}
                </div>
                {!isLoading && (
                  <div className="flex justify-end pt-2 border-t border-slate-100">
                    <button 
                      onClick={() => handleCopy(translatedText)}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${isCopied ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                    >
                      {isCopied ? <Check size={10} /> : <Copy size={10} />}
                      {isCopied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="max-h-60 overflow-y-auto custom-scrollbar flex flex-col gap-3 pr-1">
                  {chatHistory.map((msg, idx) => (
                    <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={`px-3 py-2 rounded-xl text-[12px] leading-relaxed max-w-[90%] ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-slate-100 text-slate-700 rounded-bl-sm'}`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex items-center gap-2 text-slate-400 p-2">
                      <Loader2 size={14} className="animate-spin" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Copilot is thinking...</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <input 
                    type="text" 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                    placeholder="Ask about this text..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-indigo-400 transition-colors"
                  />
                  <button 
                    onClick={handleSendChat}
                    disabled={!chatInput.trim() || isLoading}
                    className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    <Send size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SelectionTranslator;
