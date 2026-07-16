
import React from 'react';
import { NPEReport } from '../types';
import { Sparkles, X, Check, ArrowRight, AlertCircle, Zap } from 'lucide-react';

interface AuditMatrixProps {
  report: NPEReport | null;
  isLoading: boolean;
  onApply: (revised: string) => void;
  onDiscard: () => void;
  targetLang: string;
}

const AuditMatrix: React.FC<AuditMatrixProps> = ({ report, isLoading, onApply, onDiscard, targetLang }) => {
  if (isLoading) {
    return (
      <div className="p-8 bg-amber-50/50 border border-amber-100 rounded-[2rem] flex flex-col items-center justify-center gap-4 animate-pulse">
        <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-600">Syncing with Neural Auditor...</span>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      <div className="bg-white border-2 border-amber-100 rounded-[2.5rem] shadow-2xl overflow-hidden ring-8 ring-amber-50/30">
        {/* Header */}
        <div className="px-8 py-5 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500 text-white rounded-xl shadow-lg">
              <Sparkles size={16} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-800">Neural Post-Edit Matrix</span>
              <span className="text-[8px] font-bold text-amber-600 uppercase tracking-tighter">Delta Audit for {targetLang}</span>
            </div>
          </div>
          <button onClick={onDiscard} className="p-2 text-amber-400 hover:text-amber-600 transition-colors">
            <X size={20} strokeWidth={3} />
          </button>
        </div>

        {/* Diff View */}
        <div className="p-8 space-y-6">
          <div className="flex flex-col gap-2">
            <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] ml-1">Linguistic Delta View</span>
            <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl text-[15px] font-black leading-relaxed tracking-tight text-slate-800">
              {report.diff.map((part, i) => (
                <span 
                  key={i} 
                  className={`
                    px-0.5 rounded transition-all duration-300
                    ${part.type === 'addition' ? 'bg-emerald-100 text-emerald-800 border-b-2 border-emerald-400' : ''}
                    ${part.type === 'deletion' ? 'bg-rose-100 text-rose-800 line-through opacity-50 decoration-rose-400 decoration-2' : ''}
                  `}
                >
                  {part.text}
                </span>
              ))}
            </div>
          </div>

          {/* Explanation */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 ml-1">
              <AlertCircle size={12} className="text-indigo-500" />
              <span className="text-[8px] font-black text-indigo-400 uppercase tracking-[0.2em]">Auditor Insights</span>
            </div>
            <div className="p-5 bg-indigo-50/50 border border-indigo-100 rounded-[1.5rem] italic">
              <p className="text-[12px] font-bold text-indigo-900 leading-relaxed">
                "{report.explanation}"
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-8 py-5 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-amber-400">
                <Zap size={14} fill="currentColor" />
             </div>
             <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter leading-tight max-w-[200px]">
               Apply revised synaptic logic to the current synthesis buffer.
             </p>
          </div>
          <div className="flex gap-3">
             <button 
                onClick={onDiscard}
                className="px-6 py-2.5 bg-slate-800 text-slate-400 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all"
             >
                Discard
             </button>
             <button 
                onClick={() => onApply(report.revised)}
                className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-xl shadow-indigo-900/40 hover:bg-indigo-500 active:scale-95 transition-all flex items-center gap-2"
             >
                <Check size={14} strokeWidth={3} />
                Commit Revised
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditMatrix;
