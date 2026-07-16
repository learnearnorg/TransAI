
import React from 'react';
import { LinguisticTerm } from '../types';
import { X, AlertCircle, Book, Zap, Info, HelpCircle, ArrowRight, Download } from 'lucide-react';

interface LinguisticAuditorPanelProps {
  terms: LinguisticTerm[];
  onClose: () => void;
  isLoading: boolean;
}

const LinguisticAuditorPanel: React.FC<LinguisticAuditorPanelProps> = ({ terms, onClose, isLoading }) => {
  const handleExportAudit = () => {
    if (terms.length === 0) return;
    
    const headers = ['Term', 'Type', 'Definition', 'Context', 'Alternative'];
    const csvContent = [
      headers.join(','),
      ...terms.map(term => 
        [
          `"${term.term.replace(/"/g, '""')}"`,
          `"${term.type}"`,
          `"${term.definition.replace(/"/g, '""')}"`,
          `"${term.context.replace(/"/g, '""')}"`,
          `"${term.alternative.replace(/"/g, '""')}"`
        ].join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `linguistic_audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'technical': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'idiomatic': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'ambiguous': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'important': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'technical': return <Zap size={12} />;
      case 'idiomatic': return <Book size={12} />;
      case 'ambiguous': return <HelpCircle size={12} />;
      case 'important': return <Info size={12} />;
      default: return <AlertCircle size={12} />;
    }
  };

  return (
    <div className="absolute inset-0 z-[100] bg-white flex flex-col animate-fadeIn">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 text-white rounded-xl">
            <AlertCircle size={18} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Source Complexity Audit</span>
            <span className="text-[12px] font-bold text-slate-900">Neural Linguistic Analysis</span>
          </div>
        </div>
        <button onClick={onClose} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center gap-4 opacity-40">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-widest">Identifying Challenging Tokens...</p>
          </div>
        ) : terms.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-10 gap-4 opacity-30">
            <Book size={48} strokeWidth={1} />
            <p className="text-sm font-bold uppercase tracking-widest">No complex terms identified in current buffer.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {terms.map((term) => (
              <div key={term.id} className="p-5 bg-white border border-slate-100 rounded-[2rem] hover:border-indigo-200 hover:shadow-xl transition-all group ring-1 ring-slate-50">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black text-slate-900 tracking-tight uppercase">{term.term}</span>
                      <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[8px] font-black uppercase ${getTypeStyles(term.type)}`}>
                        {getTypeIcon(term.type)}
                        {term.type}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block mb-1">Definition & Context</span>
                    <p className="text-[12px] font-bold text-slate-700 leading-relaxed italic">"{term.definition}"</p>
                    <p className="text-[10px] font-medium text-slate-400 mt-2 leading-relaxed">{term.context}</p>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                    <span className="text-[7px] font-black text-indigo-400 uppercase tracking-widest">Recommended Alternative</span>
                    <ArrowRight size={10} className="text-indigo-400" />
                    <p className="text-[12px] font-black text-indigo-900">{term.alternative}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
          {terms.length} Challenges Identified
        </p>
        <div className="flex items-center gap-3">
          {terms.length > 0 && (
            <button 
              onClick={handleExportAudit} 
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-200 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm active:scale-95 transition-all"
            >
              <Download size={14} /> Export CSV
            </button>
          )}
          <button onClick={onClose} className="px-6 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">
            Close Audit
          </button>
        </div>
      </div>
    </div>
  );
};

export default LinguisticAuditorPanel;
