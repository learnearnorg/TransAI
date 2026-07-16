
import React from 'react';
import { Languages, Volume2, X } from 'lucide-react';
import { textToSpeech } from '../services/geminiService';

interface PronunciationGuideData {
  phonetic: string;
  guide: string;
  text: string;
}

interface PronunciationGuideTooltipProps {
  guide: PronunciationGuideData | null;
  isFetching: boolean;
  position: { x: number; y: number };
  onClose: () => void;
}

const PronunciationGuideTooltip: React.FC<PronunciationGuideTooltipProps> = ({ guide, isFetching, position, onClose }) => {
  if (!isFetching && !guide) return null;

  return (
    <div 
      role="tooltip"
      className="fixed z-[1001] -translate-x-1/2 bg-white dark:bg-slate-800 border-2 border-indigo-100 dark:border-slate-700 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.35)] p-6 animate-fadeIn min-w-[240px]"
      style={{ left: position.x, top: position.y, transform: 'translate(-50%, -100%)' }}
    >
      {isFetching ? (
        <div className="flex items-center gap-3 py-2 px-4" role="status">
          <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Fetching Phonetics...</span>
        </div>
      ) : guide && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
            <div className="flex items-center gap-2">
               <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                 <Languages size={14} />
               </div>
               <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-tight truncate max-w-[120px]">
                 {guide.text}
               </span>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => textToSpeech(guide.text)} 
                aria-label={`Play audio for ${guide.text}`}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-indigo-600 transition-all"
              >
                <Volume2 size={14} />
              </button>
              <button 
                onClick={onClose} 
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-300 hover:text-rose-500 transition-all"
              >
                <X size={14} />
              </button>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
               <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block mb-1">IPA Transcription</span>
               <p className="text-[14px] font-black text-indigo-600 dark:text-indigo-400 tracking-wide font-mono">{guide.phonetic}</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
               <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block mb-1">User Phonetics</span>
               <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 italic leading-relaxed">{guide.guide}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PronunciationGuideTooltip;
