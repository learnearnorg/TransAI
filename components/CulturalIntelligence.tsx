
import React, { useState } from 'react';
import { 
  Globe, 
  AlertTriangle, 
  MessageSquare, 
  Lightbulb, 
  ShieldAlert, 
  ArrowRight, 
  Loader2, 
  Search,
  CheckCircle2,
  Info
} from 'lucide-react';
import { analyzeCulturalNuances } from '../services/geminiService';
import { ProfessionalField } from '../types';

interface CulturalIntelligenceProps {
  field: ProfessionalField;
}

const CulturalIntelligence: React.FC<CulturalIntelligenceProps> = ({ field }) => {
  const [sourceText, setSourceText] = useState('');
  const [sourceLang, setSourceLang] = useState('English');
  const [targetLang, setTargetLang] = useState('Mongolian');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [report, setReport] = useState<{
    nuances: { term: string; explanation: string; suggestion: string }[];
    idioms: { original: string; meaning: string; equivalent: string }[];
    sensitivity: { issue: string; severity: 'Low' | 'Medium' | 'High'; advice: string }[];
  } | null>(null);

  const handleAnalyze = async () => {
    if (!sourceText.trim()) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeCulturalNuances(sourceText, sourceLang, targetLang);
      setReport(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
            <Globe className="text-emerald-400" />
            Cultural Intelligence (CQ) Analysis
          </h2>
          <p className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest mt-1">
            Linguistic Sensitivity & Cross-Cultural Adaptation Audit
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="flex flex-col gap-4">
          <div className="glass-panel p-6 rounded-[2rem] border-2 border-white/10 flex flex-col gap-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[11px] font-black text-white uppercase tracking-widest">Source Material</h3>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-white/10 rounded-lg text-[9px] font-black text-white/60 uppercase">{sourceLang}</span>
                <ArrowRight size={12} className="text-white/30" />
                <span className="px-2 py-1 bg-emerald-500/20 rounded-lg text-[9px] font-black text-emerald-400 uppercase">{targetLang}</span>
              </div>
            </div>

            <textarea 
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="Paste text for cultural audit (idioms, metaphors, sensitive topics)..."
              className="w-full h-64 bg-white/5 border border-white/20 rounded-2xl p-4 text-[11px] font-bold text-white focus:outline-none focus:border-emerald-400 resize-none custom-scrollbar"
            />

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black text-emerald-300 uppercase tracking-widest">Source Lang</label>
                <input 
                  type="text" 
                  value={sourceLang}
                  onChange={(e) => setSourceLang(e.target.value)}
                  className="bg-white/5 border border-white/20 rounded-xl p-3 text-[11px] font-bold text-white focus:outline-none focus:border-emerald-400"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black text-emerald-300 uppercase tracking-widest">Target Lang</label>
                <input 
                  type="text" 
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  className="bg-white/5 border border-white/20 rounded-xl p-3 text-[11px] font-bold text-white focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            <button 
              onClick={handleAnalyze}
              disabled={isAnalyzing || !sourceText.trim()}
              className="w-full mt-2 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Running CQ Audit...
                </>
              ) : (
                <>
                  <Search size={16} />
                  Analyze Cultural Nuance
                </>
              )}
            </button>
          </div>
        </div>

        {/* Report Section */}
        <div className="flex flex-col gap-4">
          <div className="glass-panel p-6 rounded-[2rem] border-2 border-white/10 flex flex-col h-[36rem] overflow-hidden">
            <h3 className="text-[11px] font-black text-white uppercase tracking-widest mb-6">CQ Audit Report</h3>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6">
              {!report && !isAnalyzing && (
                <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-50">
                  <Globe size={48} className="text-white mb-4" />
                  <p className="text-white font-black uppercase tracking-widest text-[12px]">Ready for Audit</p>
                  <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mt-2">Input source text to generate cultural intelligence insights</p>
                </div>
              )}

              {isAnalyzing && (
                <div className="space-y-6">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse space-y-3">
                      <div className="h-4 bg-white/10 rounded-full w-1/3"></div>
                      <div className="h-20 bg-white/5 rounded-2xl w-full"></div>
                    </div>
                  ))}
                </div>
              )}

              {report && (
                <>
                  {/* Nuances */}
                  <section className="space-y-3">
                    <div className="flex items-center gap-2 text-emerald-400">
                      <Lightbulb size={16} />
                      <h4 className="text-[10px] font-black uppercase tracking-widest">Linguistic Nuances</h4>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {report.nuances.map((n, i) => (
                        <div key={i} className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:border-emerald-500/30 transition-all">
                          <div className="text-[12px] font-black text-white mb-1">{n.term}</div>
                          <p className="text-[10px] font-bold text-white/60 mb-2 leading-relaxed">{n.explanation}</p>
                          <div className="flex items-center gap-2 text-[9px] font-black text-emerald-400 uppercase">
                            <CheckCircle2 size={10} />
                            Suggestion: {n.suggestion}
                          </div>
                        </div>
                      ))}
                      {report.nuances.length === 0 && <p className="text-[10px] font-bold text-white/30 italic">No specific nuances detected.</p>}
                    </div>
                  </section>

                  {/* Idioms */}
                  <section className="space-y-3">
                    <div className="flex items-center gap-2 text-indigo-400">
                      <MessageSquare size={16} />
                      <h4 className="text-[10px] font-black uppercase tracking-widest">Idiomatic Expressions</h4>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {report.idioms.map((id, i) => (
                        <div key={i} className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:border-indigo-500/30 transition-all">
                          <div className="text-[12px] font-black text-white mb-1 italic">"{id.original}"</div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-black text-white/40 uppercase">Meaning</span>
                            <p className="text-[10px] font-bold text-white/60 leading-relaxed">{id.meaning}</p>
                          </div>
                          <div className="mt-2 pt-2 border-t border-white/5 flex items-center gap-2 text-[10px] font-black text-indigo-400 uppercase">
                            <Globe size={10} />
                            Equivalent: {id.equivalent}
                          </div>
                        </div>
                      ))}
                      {report.idioms.length === 0 && <p className="text-[10px] font-bold text-white/30 italic">No idioms detected.</p>}
                    </div>
                  </section>

                  {/* Sensitivity */}
                  <section className="space-y-3">
                    <div className="flex items-center gap-2 text-rose-400">
                      <ShieldAlert size={16} />
                      <h4 className="text-[10px] font-black uppercase tracking-widest">Sensitivity Audit</h4>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {report.sensitivity.map((s, i) => (
                        <div key={i} className={`p-4 border rounded-2xl transition-all ${
                          s.severity === 'High' ? 'bg-rose-500/10 border-rose-500/30' : 
                          s.severity === 'Medium' ? 'bg-amber-500/10 border-amber-500/30' : 
                          'bg-white/5 border-white/10'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-[11px] font-black text-white">{s.issue}</div>
                            <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${
                              s.severity === 'High' ? 'bg-rose-500 text-white' : 
                              s.severity === 'Medium' ? 'bg-amber-500 text-white' : 
                              'bg-emerald-500 text-white'
                            }`}>
                              {s.severity} Risk
                            </span>
                          </div>
                          <p className="text-[10px] font-bold text-white/60 leading-relaxed mb-2">{s.advice}</p>
                        </div>
                      ))}
                      {report.sensitivity.length === 0 && (
                        <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex items-center gap-3">
                          <CheckCircle2 size={16} className="text-emerald-500" />
                          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">No sensitivity risks detected</span>
                        </div>
                      )}
                    </div>
                  </section>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CulturalIntelligence;
