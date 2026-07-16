
import React, { useState, useEffect, useRef } from 'react';
import { predictNextWords } from '../services/geminiService';
import { Loader2, Sparkles } from 'lucide-react';

interface SmartComposeProps {
  value: string;
  onChange: (value: string) => void;
  targetLang: string;
  field: string;
  glossary: any[];
  memory: any[];
  placeholder?: string;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

const SmartCompose: React.FC<SmartComposeProps> = ({
  value,
  onChange,
  targetLang,
  field,
  glossary,
  memory,
  placeholder,
  className,
  onKeyDown
}) => {
  const [suggestion, setSuggestion] = useState('');
  const [isPredicting, setIsPredicting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // Only predict if the user stops typing and the last character isn't a space
    // or if it's a space and we want to predict the next word.
    if (!value.trim()) {
      setSuggestion('');
      return;
    }

    timeoutRef.current = setTimeout(async () => {
      setIsPredicting(true);
      try {
        const nextWords = await predictNextWords(value, targetLang, field, glossary, memory);
        setSuggestion(nextWords);
      } catch (err) {
        console.error("Prediction failed", err);
      } finally {
        setIsPredicting(false);
      }
    }, 1000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [value, targetLang, field, glossary, memory]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && suggestion) {
      e.preventDefault();
      onChange(value + (value.endsWith(' ') ? '' : ' ') + suggestion);
      setSuggestion('');
    }
    if (onKeyDown) onKeyDown(e);
  };

  return (
    <div className="relative w-full h-full group">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`${className} relative z-10 bg-transparent resize-none focus:outline-none custom-scrollbar`}
      />
      {suggestion && (
        <div 
          className={`${className} absolute top-0 left-0 pointer-events-none text-slate-400 opacity-40 z-0 whitespace-pre-wrap overflow-hidden border-transparent`}
          style={{ 
            padding: textareaRef.current ? window.getComputedStyle(textareaRef.current).padding : '2rem',
            font: textareaRef.current ? window.getComputedStyle(textareaRef.current).font : 'inherit',
            lineHeight: textareaRef.current ? window.getComputedStyle(textareaRef.current).lineHeight : 'inherit',
            width: textareaRef.current ? textareaRef.current.clientWidth : '100%',
            height: textareaRef.current ? textareaRef.current.clientHeight : '100%'
          }}
        >
          <span className="invisible">{value}{!value.endsWith(' ') && ' '}</span>
          <span>{suggestion}</span>
        </div>
      )}
      
      <div className="absolute bottom-4 right-6 flex items-center gap-2 pointer-events-none transition-opacity duration-300">
        {isPredicting && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-900/50 rounded-md border border-slate-800">
            <Loader2 size={10} className="animate-spin text-indigo-400" />
            <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Predicting...</span>
          </div>
        )}
        {suggestion && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-indigo-600 text-white rounded-md shadow-lg shadow-indigo-500/20 animate-bounce">
            <Sparkles size={10} />
            <span className="text-[7px] font-black uppercase tracking-widest">Tab to Complete</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartCompose;
