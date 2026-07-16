
import React from 'react';
import { SourceQualityReport, SourceQualityMetric } from '../types';

interface SourceQualityPanelProps {
  report: SourceQualityReport;
  onClose: () => void;
}

const SourceQualityPanel: React.FC<SourceQualityPanelProps> = ({ report, onClose }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'optimal': return 'bg-green-500';
      case 'warning': return 'bg-amber-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-slate-300';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-green-100 text-green-700';
      case 'medium': return 'bg-amber-100 text-amber-700';
      case 'high': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  // Move metric entries logic outside of JSX to ensure safe mapping
  const metricEntries = Object.entries(report.metrics) as [string, SourceQualityMetric][];

  return (
    <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-2xl animate-fadeIn space-y-8 relative overflow-hidden ring-8 ring-slate-100/50 my-4 max-w-4xl mx-auto">
      <div className="absolute top-0 right-0 p-6">
        <button onClick={onClose} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-black text-indigo-600 uppercase tracking-[0.4em]">Source Audit</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 flex flex-col items-center justify-center p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
          <div className="text-2xl font-black text-slate-900">{report.overallScore}%</div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Readiness</span>
        </div>

        <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {metricEntries.map(([key, metric]) => (
            <div key={key} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{metric.label}</span>
                <div className={`w-2 h-2 rounded-full ${getStatusColor(metric.status)}`}></div>
              </div>
              <div className="flex items-end justify-between gap-4">
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${getStatusColor(metric.status)} transition-all`} style={{ width: `${metric.score}%` }}></div>
                </div>
                <span className="text-xs font-black text-slate-800">{metric.score}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Adjustments Required</h4>
        <div className="grid grid-cols-1 gap-3">
          {report.issues.map((issue, idx) => (
            <div key={idx} className="p-5 bg-slate-50 border border-slate-100 rounded-3xl">
              <div className="flex items-center gap-3 mb-2">
                <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase ${getSeverityBadge(issue.severity)}`}>
                  {issue.severity}
                </span>
                <span className="text-[11px] font-black text-slate-800 uppercase">{issue.category}</span>
              </div>
              <p className="text-[13px] font-bold text-slate-600 mb-2 leading-relaxed">{issue.description}</p>
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                <p className="text-[12px] font-black text-indigo-800 leading-snug">{issue.suggestion}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SourceQualityPanel;
