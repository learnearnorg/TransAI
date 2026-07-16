
import React, { useState, useMemo } from 'react';
import { TranslationHistoryItem, TranslationQualityReport, ProfessionalField } from '../types';
import { auditTranslationQuality } from '../services/geminiService';
import { BarChart3, ShieldCheck, AlertCircle, TrendingUp, Award, Search, Loader2, ChevronRight, FileText, CheckCircle2, XCircle, Info, Zap, Sparkles, Download } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface LQADashboardProps {
  history: TranslationHistoryItem[];
  initialSelectedItem?: TranslationHistoryItem | null;
  onUpdateHistory: (item: TranslationHistoryItem) => void;
  onFixLQA?: (item: TranslationHistoryItem, critique: any) => void;
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1'];

const LQADashboard: React.FC<LQADashboardProps> = ({ history, initialSelectedItem, onUpdateHistory, onFixLQA }) => {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(initialSelectedItem?.id || null);
  const [isAuditing, setIsAuditing] = useState(false);

  const selectedItem = useMemo(() => 
    history.find(item => item.id === selectedItemId), 
    [history, selectedItemId]
  );

  React.useEffect(() => {
    if (initialSelectedItem) {
      setSelectedItemId(initialSelectedItem.id);
    }
  }, [initialSelectedItem]);

  const handleExportLQA = () => {
    const audited = history.filter(h => h.qualityReport || h.powerhouseAudit);
    if (audited.length === 0) return;

    const headers = ['ID', 'Source Lang', 'Target Lang', 'Source Text', 'Translated Text', 'Overall Score', 'Certification', 'Issues Found'];
    const csvContent = [
      headers.join(','),
      ...audited.map(item => {
        const report = item.powerhouseAudit || item.qualityReport;
        return [
          `"${item.id}"`,
          `"${item.sourceLang}"`,
          `"${item.targetLang}"`,
          `"${item.sourceText.replace(/"/g, '""')}"`,
          `"${item.translatedText.replace(/"/g, '""')}"`,
          `"${report?.overallScore || 'N/A'}"`,
          `"${report?.certification || 'N/A'}"`,
          `"${report?.critiques?.length || 0}"`
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `lqa_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const stats = useMemo(() => {
    const audited = history.filter(h => h.qualityReport || h.powerhouseAudit);
    if (audited.length === 0) return null;

    const avgScore = audited.reduce((acc, curr) => {
      const report = curr.powerhouseAudit || curr.qualityReport;
      return acc + (report?.overallScore || 0);
    }, 0) / audited.length;
    
    const certCounts: Record<string, number> = {};
    audited.forEach(h => {
      const report = h.powerhouseAudit || h.qualityReport;
      const cert = report?.certification || 'Unknown';
      certCounts[cert] = (certCounts[cert] || 0) + 1;
    });

    const certData = Object.entries(certCounts).map(([name, value]) => ({ name, value }));

    return { avgScore, certData, totalAudited: audited.length };
  }, [history]);

  const handleRunAudit = async (item: TranslationHistoryItem) => {
    setIsAuditing(true);
    try {
      const report = await auditTranslationQuality(
        item.sourceText,
        item.translatedText,
        item.sourceLang,
        item.targetLang,
        item.field
      );
      onUpdateHistory({ ...item, qualityReport: report });
    } catch (err) {
      console.error("LQA Audit Failed", err);
    } finally {
      setIsAuditing(false);
    }
  };
  
  const handleBatchAudit = async () => {
    const unaudited = history.filter(h => !h.qualityReport);
    if (unaudited.length === 0) return;
    
    setIsAuditing(true);
    try {
      for (const item of unaudited) {
        const report = await auditTranslationQuality(
          item.sourceText,
          item.translatedText,
          item.sourceLang,
          item.targetLang,
          item.field
        );
        onUpdateHistory({ ...item, qualityReport: report });
      }
    } catch (err) {
      console.error("Batch LQA Audit Failed", err);
    } finally {
      setIsAuditing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'optimal': return 'text-emerald-500';
      case 'warning': return 'text-amber-500';
      case 'critical': return 'text-rose-500';
      default: return 'text-slate-400';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch(severity) {
      case 'Critical': return <XCircle size={14} className="text-rose-500" />;
      case 'Major': return <AlertCircle size={14} className="text-amber-500" />;
      default: return <Info size={14} className="text-blue-500" />;
    }
  };

  return (
    <div className="flex flex-col gap-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600 rounded-xl text-white shadow-lg shadow-emerald-500/20">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase">Linguistic Quality Assurance</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Neural MQM Framework Auditor</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportLQA}
              disabled={!stats}
              className="px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:text-indigo-600 hover:border-indigo-200 shadow-sm transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              <Download size={14} /> Export Report
            </button>
            <button
              onClick={handleBatchAudit}
              disabled={isAuditing || history.filter(h => !h.qualityReport).length === 0}
              className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 shadow-xl transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              {isAuditing ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} className="text-amber-400" />}
              Batch Audit All
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aggregate Score</h4>
              <TrendingUp size={16} className="text-emerald-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-slate-900">{Math.round(stats.avgScore)}</span>
              <span className="text-sm font-bold text-slate-400">/ 100</span>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Based on {stats.totalAudited} audited sessions</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm flex flex-col gap-4 md:col-span-2">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Certification Distribution</h4>
              <Award size={16} className="text-indigo-500" />
            </div>
            <div className="h-24 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.certData}
                    innerRadius={30}
                    outerRadius={45}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.certData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-4">
              {stats.certData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-[9px] font-black text-slate-500 uppercase">{d.name}: {d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* History List */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between px-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Audit Queue</h4>
            <span className="text-[9px] font-black text-indigo-600 uppercase">{history.length} Sessions</span>
          </div>
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {history.map(item => (
              <button
                key={item.id}
                onClick={() => setSelectedItemId(item.id)}
                className={`w-full p-6 rounded-[2rem] border transition-all text-left group ${selectedItemId === item.id ? 'bg-indigo-600 border-indigo-500 text-white shadow-xl scale-[1.02]' : 'bg-white border-slate-100 hover:border-indigo-200 shadow-sm'}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-lg ${selectedItemId === item.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{item.field}</span>
                    <span className="text-[10px] font-bold opacity-60">{item.sourceLang} → {item.targetLang}</span>
                  </div>
                  {item.qualityReport || item.powerhouseAudit ? (
                    <div className={`flex items-center gap-1 text-[10px] font-black ${selectedItemId === item.id ? 'text-white' : 'text-emerald-600'}`}>
                      {item.powerhouseAudit ? <Award size={12} className="text-amber-400" /> : <CheckCircle2 size={12} />}
                      {(item.powerhouseAudit || item.qualityReport)?.overallScore}
                    </div>
                  ) : (
                    <div className="text-[10px] font-black text-slate-300">UNAUDITED</div>
                  )}
                </div>
                <p className={`text-[11px] font-bold line-clamp-2 italic ${selectedItemId === item.id ? 'text-white/80' : 'text-slate-600'}`}>
                  "{item.sourceText}"
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Detailed Audit View */}
        <div className="lg:col-span-7">
          {!selectedItem ? (
            <div className="h-full min-h-[400px] bg-slate-50 border-2 border-dashed border-slate-200 rounded-[3rem] flex flex-col items-center justify-center gap-4 text-slate-400">
              <Search size={48} className="opacity-20" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em]">Select Session to Audit</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-[3rem] p-8 shadow-sm space-y-8 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase">Session Audit</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedItem.id}</p>
                  {selectedItem.powerhouseAudit && (
                    <div className="flex items-center gap-1 mt-1">
                      <Zap size={10} className="text-amber-500" />
                      <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest">Powerhouse Synthesis</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {(selectedItem.qualityReport || selectedItem.powerhouseAudit) && onFixLQA && (
                    <button
                      onClick={() => onFixLQA(selectedItem, (selectedItem.powerhouseAudit || selectedItem.qualityReport)?.critiques[0])}
                      className="px-6 py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 shadow-xl transition-all active:scale-95 flex items-center gap-2"
                    >
                      <Sparkles size={14} />
                      Neural Fix
                    </button>
                  )}
                  {!selectedItem.qualityReport && !selectedItem.powerhouseAudit && (
                    <button
                      onClick={() => handleRunAudit(selectedItem)}
                      disabled={isAuditing}
                      className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 shadow-xl transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                    >
                      {isAuditing ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                      {isAuditing ? 'Auditing...' : 'Run Neural Audit'}
                    </button>
                  )}
                </div>
              </div>

              {selectedItem.qualityReport || selectedItem.powerhouseAudit ? (
                <div className="space-y-8 animate-fadeIn">
                  {/* Score & Certification */}
                  <div className="flex items-center gap-8 p-6 bg-slate-50 rounded-[2rem]">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-3xl font-black text-slate-900">{(selectedItem.powerhouseAudit || selectedItem.qualityReport)?.overallScore}</span>
                      <span className="text-[8px] font-black text-slate-400 uppercase">MQM Score</span>
                    </div>
                    <div className="h-10 w-px bg-slate-200" />
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-black text-indigo-600 uppercase tracking-tight">{(selectedItem.powerhouseAudit || selectedItem.qualityReport)?.certification}</span>
                      <span className="text-[8px] font-black text-slate-400 uppercase">Neural Certification</span>
                    </div>
                  </div>

                  {selectedItem.refinementExplanation && (
                    <div className="p-6 bg-amber-50 border border-amber-100 rounded-[2rem]">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles size={14} className="text-amber-600" />
                        <span className="text-[10px] font-black text-amber-900 uppercase tracking-widest">Synthesis Refinement Logic</span>
                      </div>
                      <p className="text-[11px] font-medium text-amber-800 leading-relaxed italic">
                        "{selectedItem.refinementExplanation}"
                      </p>
                    </div>
                  )}

                  {/* Evaluation Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {Object.entries((selectedItem.powerhouseAudit || selectedItem.qualityReport)?.evaluation || {}).map(([key, val]) => (
                      <div key={key} className="p-4 border border-slate-100 rounded-2xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{key}</span>
                          <span className={`text-[10px] font-black uppercase ${getStatusColor(val.status)}`}>{val.status}</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-1000 ${val.status === 'optimal' ? 'bg-emerald-500' : val.status === 'warning' ? 'bg-amber-500' : 'bg-rose-500'}`}
                            style={{ width: `${val.score}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Critiques */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Linguistic Critiques</h4>
                    <div className="space-y-3">
                      {((selectedItem.powerhouseAudit || selectedItem.qualityReport)?.critiques || []).map((c, i) => (
                        <div key={i} className="p-5 bg-slate-50 rounded-2xl space-y-3 group hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-slate-100">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getSeverityIcon(c.severity)}
                              <span className="text-[10px] font-black text-slate-900 uppercase">{c.dimension}</span>
                            </div>
                            <span className="text-[8px] font-black text-slate-400 uppercase">{c.severity}</span>
                          </div>
                          <p className="text-[11px] font-bold text-slate-600 italic">"{c.finding}"</p>
                          <div className="flex items-start justify-between gap-2 pt-2 border-t border-slate-200/50">
                            <div className="flex items-start gap-2">
                              <TrendingUp size={12} className="text-emerald-500 mt-0.5" />
                              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-tight">{c.improvement}</p>
                            </div>
                            {onFixLQA && (
                              <button 
                                onClick={() => onFixLQA(selectedItem, c)}
                                className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                                title="Apply this fix"
                              >
                                <Sparkles size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center space-y-4">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                    <FileText size={24} className="text-slate-300" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Awaiting Neural Audit</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase max-w-xs mx-auto">Run the auditor to perform a deep MQM framework analysis on this translation.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LQADashboard;
