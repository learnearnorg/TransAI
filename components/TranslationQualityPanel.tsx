
import React from 'react';
import { TranslationQualityReport, MQMCategoryScore } from '../types';

interface TranslationQualityPanelProps {
  report: TranslationQualityReport;
  onClose: () => void;
}

const TranslationQualityPanel: React.FC<TranslationQualityPanelProps> = ({ report, onClose }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'optimal': return 'bg-emerald-500';
      case 'warning': return 'bg-amber-500';
      case 'critical': return 'bg-rose-500';
      default: return 'bg-slate-300';
    }
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'bg-rose-600 text-white';
      case 'Major': return 'bg-amber-500 text-white';
      case 'Minor': return 'bg-indigo-50 text-indigo-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  // Standardize entries for mapping safely in JSX
  const evaluationEntries = Object.entries(report.evaluation) as [string, MQMCategoryScore][];

  return (
    <div className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-2xl animate-fadeIn space-y-10 relative overflow-hidden my-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Linguistic Quality Audit</h3>
          <div className="flex items-center gap-2 text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-widest">ID: {report.auditId.slice(0, 8)}</span>
          </div>
        </div>
        <button onClick={onClose} className="p-3 text-slate-300 hover:text-rose-500 transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        <div className="lg:col-span-4 flex flex-col items-center justify-center p-8 bg-slate-50 border border-slate-100 rounded-[2.5rem]">
          <div className="text-4xl font-black text-slate-900 mb-2">{report.overallScore}%</div>
          <div className="px-6 py-2 rounded-2xl bg-indigo-600 text-white text-[12px] font-black uppercase tracking-[0.2em]">
            {report.certification}
          </div>
        </div>

        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {evaluationEntries.map(([key, metric]) => (
            <div key={key} className="p-5 bg-white border border-slate-100 rounded-3xl shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">{key} Audit</span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${getStatusColor(metric.status)} text-white`}>{metric.score}%</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${getStatusColor(metric.status)} transition-all duration-1000`} style={{ width: `${metric.score}%` }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <h4 className="text-xs font-black text-slate-900 uppercase tracking-[0.3em]">Critical Deviations</h4>
        <div className="grid grid-cols-1 gap-4">
          {report.critiques.map((critique, idx) => (
            <div key={idx} className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm hover:shadow-xl transition-all duration-500 relative">
              <div className={`absolute top-0 right-0 px-4 py-1 text-center rounded-bl-xl ${getSeverityStyle(critique.severity)} text-[8px] font-black uppercase tracking-widest`}>
                {critique.severity}
              </div>
              <div className="flex flex-col sm:flex-row items-start gap-6">
                <div className="flex-1 space-y-2">
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-[9px] font-black uppercase tracking-widest rounded-lg">{critique.dimension}</span>
                  <p className="text-[14px] font-bold text-slate-800 leading-relaxed italic">"{critique.finding}"</p>
                </div>
                <div className="flex-1">
                   <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
                      <p className="text-[13px] font-black text-indigo-900 leading-snug">{critique.improvement}</p>
                   </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end pt-8 gap-4">
           <button onClick={() => window.print()} className="px-6 py-3 bg-white border border-slate-200 text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-2xl">Export</button>
           <button onClick={onClose} className="px-10 py-3 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl">Close</button>
      </div>
    </div>
  );
};

export default TranslationQualityPanel;
