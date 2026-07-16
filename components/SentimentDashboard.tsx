import React, { useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Loader2, RefreshCw, Zap, Heart, ShieldAlert, TrendingUp, FileText, Globe } from 'lucide-react';
import { analyzeSentimentAndTone } from '../services/geminiService';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface SentimentDashboardProps {
  sourceLang: string;
  targetLang: string;
}

interface ToneAnalysis {
  metrics: { metric: string; sourceScore: number; targetScore: number }[];
  analysis: string;
  warnings: string[];
}

export default function SentimentDashboard({ sourceLang, targetLang }: SentimentDashboardProps) {
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<ToneAnalysis | null>(null);

  const handleAnalyze = async () => {
    if (!sourceText.trim() || !translatedText.trim()) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeSentimentAndTone(sourceText, translatedText, sourceLang, targetLang);
      setAnalysis(result);
    } catch (error) {
      console.error("Failed to analyze sentiment:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getWarningColor = (warningsCount: number) => {
    if (warningsCount === 0) return 'text-emerald-500 bg-emerald-50 border-emerald-200';
    if (warningsCount === 1) return 'text-amber-500 bg-amber-50 border-amber-200';
    return 'text-rose-500 bg-rose-50 border-rose-200';
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-8 bg-white border-b border-slate-100 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl shadow-lg shadow-pink-200">
            <Heart className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Sentiment & Tone Mapping</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
              Cross-Cultural Emotional Fidelity
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Input Panel */}
        <div className="w-full lg:w-1/2 bg-white border-r border-slate-100 p-8 flex flex-col gap-6 overflow-y-auto shadow-xl z-10">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <FileText size={16} className="text-pink-500" /> Source Text ({sourceLang})
              </h3>
            </div>
            <textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="Enter the original text here..."
              className="w-full h-40 p-5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-base font-medium text-slate-800 focus:outline-none focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 resize-none transition-all"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <Globe size={16} className="text-rose-500" /> Translated Text ({targetLang})
              </h3>
            </div>
            <textarea
              value={translatedText}
              onChange={(e) => setTranslatedText(e.target.value)}
              placeholder="Enter the translated text here..."
              className="w-full h-40 p-5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-base font-medium text-slate-800 focus:outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 resize-none transition-all"
            />
          </div>

          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !sourceText.trim() || !translatedText.trim()}
            className="mt-auto py-4 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-lg shadow-pink-200 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <Activity size={18} />}
            {isAnalyzing ? 'Analyzing Tone Fidelity...' : 'Analyze Sentiment & Tone'}
          </button>
        </div>

        {/* Analysis Panel */}
        <div className="flex-1 bg-slate-50 p-8 overflow-y-auto">
          {!analysis && !isAnalyzing ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto opacity-50">
              <div className="w-24 h-24 bg-slate-200 rounded-full flex items-center justify-center mb-6">
                <TrendingUp size={40} className="text-slate-400" />
              </div>
              <h3 className="text-xl font-black text-slate-600 tracking-tight mb-2">Awaiting Analysis</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                Enter both source and translated texts to visualize the emotional shift and detect potential tone mismatches across cultures.
              </p>
            </div>
          ) : isAnalyzing ? (
            <div className="h-full flex flex-col items-center justify-center">
              <Loader2 size={48} className="text-pink-500 animate-spin mb-6" />
              <p className="text-sm font-bold text-slate-600 uppercase tracking-widest animate-pulse">
                Mapping emotional resonance...
              </p>
            </div>
          ) : analysis ? (
            <div className="max-w-2xl mx-auto space-y-8 animate-fadeIn">
              
              {/* Radar Chart */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-80">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 text-center">Tone Fidelity Radar</h4>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={analysis.metrics}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="metric" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name={`Source (${sourceLang})`} dataKey="sourceScore" stroke="#94a3b8" fill="#cbd5e1" fillOpacity={0.4} />
                    <Radar name={`Target (${targetLang})`} dataKey="targetScore" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.4} />
                    <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 600, paddingTop: '20px' }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Warnings */}
              {analysis.warnings.length > 0 ? (
                <div className={`p-6 rounded-2xl border ${getWarningColor(analysis.warnings.length)}`}>
                  <h4 className="text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                    <ShieldAlert size={14} /> Tone Mismatch Warnings
                  </h4>
                  <ul className="space-y-2">
                    {analysis.warnings.map((warning, idx) => (
                      <li key={idx} className="text-sm font-medium flex items-start gap-2">
                        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                        <span>{warning}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="p-6 rounded-2xl border bg-emerald-50 border-emerald-200 text-emerald-700">
                  <h4 className="text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                    <CheckCircle2 size={14} /> Tone Fidelity Verified
                  </h4>
                  <p className="text-sm font-medium">No dangerous tone mismatches detected. The emotional resonance is consistent.</p>
                </div>
              )}

              {/* Analysis Text */}
              <div className="bg-slate-900 p-6 rounded-2xl shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-pink-400 to-rose-500" />
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Activity size={14} className="text-pink-400" /> Emotional Shift Analysis
                </h4>
                <p className="text-base text-white font-medium leading-relaxed">
                  {analysis.analysis}
                </p>
              </div>

            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
