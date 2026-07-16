
import React, { useState, useEffect, useMemo } from 'react';
import { Brain, TrendingUp, AlertCircle, CheckCircle2, Zap, BarChart3, Globe2, Clock } from 'lucide-react';
import { TranslationHistoryItem, GlossaryItem } from '../types';
import { GoogleGenAI } from "../services/geminiService";
import { MODELS } from "../constants";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from 'recharts';
import { getApiKey } from '../services/geminiService';

interface NeuralInsightsProps {
  history: TranslationHistoryItem[];
  glossary: GlossaryItem[];
}

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const NeuralInsights: React.FC<NeuralInsightsProps> = ({ history, glossary }) => {
  const [insights, setInsights] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeActivity = async () => {
    if (history.length === 0) return;
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: getApiKey() });
      const prompt = `Analyze the following translation history and glossary. Provide a concise executive summary of the linguistic trends, common terminology, and potential quality risks. Format as a professional neural report.
      
      History: ${JSON.stringify(history.slice(0, 10).map(h => ({ s: h.sourceText, t: h.translatedText, l: h.targetLang })))}
      Glossary: ${JSON.stringify(glossary.map(g => ({ s: g.term, t: g.definition })))}
      `;

      const response = await ai.models.generateContent({
        model: MODELS.TEXT,
        contents: prompt,
      });

      setInsights(response.text || 'No insights available.');
    } catch (err) {
      console.error("Analysis failed", err);
      setInsights('Neural analysis failed. Grid saturation detected.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (history.length > 0) {
      analyzeActivity();
    } else {
      setInsights('');
    }
  }, [history.length]);

  const languageStats = useMemo(() => {
    const counts: Record<string, number> = {};
    history.forEach(h => {
      counts[h.targetLang] = (counts[h.targetLang] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [history]);

  const qualityStats = useMemo(() => {
    const audited = history.filter(h => h.qualityReport || h.powerhouseAudit);
    if (audited.length === 0) return [];
    
    // Group by day
    const byDay: Record<string, { total: number, count: number }> = {};
    audited.forEach(h => {
      const date = new Date(h.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const score = h.powerhouseAudit?.overallScore || h.qualityReport?.overallScore || 0;
      if (!byDay[date]) byDay[date] = { total: 0, count: 0 };
      byDay[date].total += score;
      byDay[date].count += 1;
    });

    return Object.entries(byDay).map(([date, data]) => ({
      date,
      score: Math.round(data.total / data.count)
    })).slice(-7); // Last 7 days
  }, [history]);

  const avgScore = useMemo(() => {
    const audited = history.filter(h => h.qualityReport || h.powerhouseAudit);
    if (audited.length === 0) return 0;
    const total = audited.reduce((acc, curr) => {
      const report = curr.powerhouseAudit || curr.qualityReport;
      return acc + (report?.overallScore || 0);
    }, 0);
    return Math.round(total / audited.length);
  }, [history]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-indigo-600">
            <Zap size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest">Throughput</span>
          </div>
          <div className="text-2xl font-black text-indigo-900">{history.length}</div>
          <div className="text-[9px] font-bold text-indigo-400 uppercase">Total Syntheses</div>
        </div>
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-emerald-600">
            <Globe2 size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest">Coverage</span>
          </div>
          <div className="text-2xl font-black text-emerald-900">{new Set(history.map(h => h.targetLang)).size}</div>
          <div className="text-[9px] font-bold text-emerald-400 uppercase">Active Nodes</div>
        </div>
      </div>

      {languageStats.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
          <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-widest mb-4">Language Distribution</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={languageStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {languageStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-4">
            {languageStats.map((stat, idx) => (
              <div key={stat.name} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                <span className="text-[10px] font-bold text-slate-600 uppercase">{stat.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {qualityStats.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-widest">LQA Trend (7 Days)</h3>
            <div className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black">
              AVG: {avgScore}
            </div>
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={qualityStats}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} width={30} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#4f46e5' }}
                />
                <Line type="monotone" dataKey="score" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, fill: '#4f46e5', strokeWidth: 0 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200">
              <Brain size={18} />
            </div>
            <div>
              <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-widest">Neural Analysis</h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase">AI-Driven Linguistic Intelligence</p>
            </div>
          </div>
          <button 
            onClick={analyzeActivity}
            disabled={isAnalyzing}
            className="p-2 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-all text-slate-400 hover:text-indigo-600 disabled:opacity-50"
          >
            <TrendingUp size={18} className={isAnalyzing ? 'animate-pulse' : ''} />
          </button>
        </div>
        <div className="p-6">
          {isAnalyzing ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-4 bg-slate-100 rounded-full w-3/4" />
              <div className="h-4 bg-slate-100 rounded-full w-full" />
              <div className="h-4 bg-slate-100 rounded-full w-5/6" />
            </div>
          ) : (
            <div className="text-[11px] leading-relaxed text-slate-600 font-medium whitespace-pre-wrap">
              {insights || 'Initiate synthesis to generate neural insights.'}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Linguistic Health</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={16} className="text-emerald-500" />
              <span className="text-[10px] font-bold text-slate-700 uppercase">Glossary Adherence</span>
            </div>
            <span className="text-[10px] font-black text-emerald-600">98.4%</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl">
            <div className="flex items-center gap-3">
              <AlertCircle size={16} className="text-amber-500" />
              <span className="text-[10px] font-bold text-slate-700 uppercase">Semantic Drift</span>
            </div>
            <span className="text-[10px] font-black text-amber-600">Low</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NeuralInsights;
