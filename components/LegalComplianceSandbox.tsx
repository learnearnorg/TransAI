import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, Loader2, FileText, Globe, CheckCircle2, Building2, MapPin, Scale } from 'lucide-react';
import { analyzeLegalCompliance } from '../services/geminiService';
import { ProfessionalField } from '../types';

interface LegalComplianceSandboxProps {
  sourceLang: string;
  targetLang: string;
  field: ProfessionalField;
}

interface ComplianceReport {
  status: 'compliant' | 'warning' | 'critical';
  issues: { severity: 'warning' | 'critical'; text: string; explanation: string; suggestion: string }[];
  summary: string;
}

export default function LegalComplianceSandbox({ sourceLang, targetLang, field }: LegalComplianceSandboxProps) {
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [region, setRegion] = useState('European Union (EU)');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [report, setReport] = useState<ComplianceReport | null>(null);

  const handleAnalyze = async () => {
    if (!sourceText.trim() || !translatedText.trim()) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeLegalCompliance(sourceText, translatedText, sourceLang, targetLang, region, field);
      setReport(result);
    } catch (error) {
      console.error("Failed to analyze compliance:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'compliant') return 'text-emerald-500 bg-emerald-50 border-emerald-200';
    if (status === 'warning') return 'text-amber-500 bg-amber-50 border-amber-200';
    return 'text-rose-500 bg-rose-50 border-rose-200';
  };

  const getStatusIcon = (status: string) => {
    if (status === 'compliant') return <ShieldCheck size={40} className="text-emerald-500" />;
    if (status === 'warning') return <AlertTriangle size={40} className="text-amber-500" />;
    return <ShieldAlert size={40} className="text-rose-500" />;
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-8 bg-white border-b border-slate-100 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl shadow-lg shadow-slate-200">
            <Scale className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Legal & Compliance Sandbox</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
              Cross-Border Regulatory Validation
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
            <Building2 size={16} className="text-slate-500" />
            <span className="text-xs font-black text-slate-700 uppercase tracking-widest">{field}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Input Panel */}
        <div className="w-full lg:w-1/2 bg-white border-r border-slate-100 p-8 flex flex-col gap-6 overflow-y-auto shadow-xl z-10">
          
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <MapPin size={16} className="text-slate-500" /> Target Jurisdiction / Region
            </label>
            <input
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20"
              placeholder="e.g., European Union (EU), California (USA), Japan"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <FileText size={16} className="text-slate-500" /> Source Text ({sourceLang})
              </h3>
            </div>
            <textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="Enter the original legal or marketing text..."
              className="w-full h-32 p-5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-base font-medium text-slate-800 focus:outline-none focus:border-slate-500 focus:ring-4 focus:ring-slate-500/10 resize-none transition-all"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <Globe size={16} className="text-slate-500" /> Translated Text ({targetLang})
              </h3>
            </div>
            <textarea
              value={translatedText}
              onChange={(e) => setTranslatedText(e.target.value)}
              placeholder="Enter the translated text to validate..."
              className="w-full h-32 p-5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-base font-medium text-slate-800 focus:outline-none focus:border-slate-500 focus:ring-4 focus:ring-slate-500/10 resize-none transition-all"
            />
          </div>

          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !sourceText.trim() || !translatedText.trim()}
            className="mt-auto py-4 bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-slate-950 text-white rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-lg shadow-slate-200 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
            {isAnalyzing ? 'Running Compliance Check...' : 'Run Compliance Audit'}
          </button>
        </div>

        {/* Analysis Panel */}
        <div className="flex-1 bg-slate-50 p-8 overflow-y-auto">
          {!report && !isAnalyzing ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto opacity-50">
              <div className="w-24 h-24 bg-slate-200 rounded-full flex items-center justify-center mb-6">
                <Scale size={40} className="text-slate-400" />
              </div>
              <h3 className="text-xl font-black text-slate-600 tracking-tight mb-2">Awaiting Audit</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                Enter your source and translated text, specify the target jurisdiction, and run the audit to detect potential legal and compliance risks.
              </p>
            </div>
          ) : isAnalyzing ? (
            <div className="h-full flex flex-col items-center justify-center">
              <Loader2 size={48} className="text-slate-700 animate-spin mb-6" />
              <p className="text-sm font-bold text-slate-600 uppercase tracking-widest animate-pulse">
                Reviewing against local regulations...
              </p>
            </div>
          ) : report ? (
            <div className="max-w-2xl mx-auto space-y-8 animate-fadeIn">
              
              {/* Status Header */}
              <div className={`p-8 rounded-3xl border-2 flex flex-col items-center justify-center text-center ${getStatusColor(report.status)}`}>
                <div className="mb-4 bg-white p-4 rounded-full shadow-sm">
                  {getStatusIcon(report.status)}
                </div>
                <h3 className="text-2xl font-black uppercase tracking-widest mb-2">
                  {report.status === 'compliant' ? 'Compliant' : report.status === 'warning' ? 'Proceed with Caution' : 'Critical Risks Detected'}
                </h3>
                <p className="text-sm font-bold opacity-90 max-w-md">{report.summary}</p>
              </div>

              {/* Issues List */}
              {report.issues.length > 0 ? (
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <AlertTriangle size={16} /> Identified Risks
                  </h4>
                  {report.issues.map((issue, idx) => (
                    <div key={idx} className={`p-5 rounded-2xl border ${issue.severity === 'critical' ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'}`}>
                      <div className="flex items-center gap-2 mb-3">
                        {issue.severity === 'critical' ? (
                          <ShieldAlert size={16} className="text-rose-600" />
                        ) : (
                          <AlertTriangle size={16} className="text-amber-600" />
                        )}
                        <span className={`text-[10px] font-black uppercase tracking-widest ${issue.severity === 'critical' ? 'text-rose-600' : 'text-amber-600'}`}>
                          {issue.severity} Risk
                        </span>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Problematic Phrase</span>
                          <p className="text-sm font-medium text-slate-800 bg-white p-2 rounded border border-slate-100">"{issue.text}"</p>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Legal Explanation</span>
                          <p className="text-sm text-slate-700 leading-relaxed">{issue.explanation}</p>
                        </div>
                        <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 mt-2">
                          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest block mb-1">Suggested Alternative</span>
                          <p className="text-sm font-medium text-emerald-800">{issue.suggestion}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-2xl border bg-emerald-50 border-emerald-200 text-emerald-700 flex items-center gap-4">
                  <CheckCircle2 size={32} className="shrink-0" />
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-widest mb-1">No Issues Detected</h4>
                    <p className="text-sm font-medium">The translation appears to comply with general regulations in the specified jurisdiction. Always consult with local legal counsel for final approval.</p>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
