import React from 'react';
import { ProjectScope, ProfessionalField } from '../types';
import { Brain, Target, Zap, AlertTriangle, Users, BarChart2, CheckCircle2, ArrowRight, Download } from 'lucide-react';

interface ProjectScopingPanelProps {
  scope: ProjectScope;
  onApplySettings: (field: ProfessionalField, persona: string, tone: string) => void;
}

const ProjectScopingPanel: React.FC<ProjectScopingPanelProps> = ({ scope, onApplySettings }) => {
  const handleExportScope = () => {
    const dataStr = JSON.stringify(scope, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `project_scope_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white/80 backdrop-blur-xl border border-indigo-100 rounded-3xl p-6 shadow-2xl animate-fadeIn">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100">
            <Brain size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Project Intelligence</h2>
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Automated Scoping & Architecture</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportScope}
            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
            title="Export Scope JSON"
          >
            <Download size={16} />
          </button>
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl">
            <BarChart2 size={16} className="text-slate-400" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Complexity: {scope.complexityScore}%</span>
            <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden ml-2">
              <div 
                className={`h-full transition-all duration-1000 ${scope.complexityScore > 70 ? 'bg-rose-500' : scope.complexityScore > 40 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${scope.complexityScore}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Recommendations */}
        <div className="space-y-4">
          <div className="p-5 bg-indigo-50/50 border border-indigo-100 rounded-2xl">
            <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Target size={14} /> Recommended Configuration
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-indigo-50 shadow-sm">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Field</span>
                <span className="text-xs font-black text-indigo-900">{scope.recommendedField}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-indigo-50 shadow-sm">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Persona</span>
                <span className="text-xs font-black text-indigo-900">{scope.recommendedPersona}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-indigo-50 shadow-sm">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Tone</span>
                <span className="text-xs font-black text-indigo-900">{scope.suggestedTone}</span>
              </div>
            </div>
            <button 
              onClick={() => onApplySettings(scope.recommendedField, scope.recommendedPersona, scope.suggestedTone)}
              className="w-full mt-4 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 group"
            >
              Apply Neural Configuration <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="p-5 bg-emerald-50/50 border border-emerald-100 rounded-2xl">
            <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Users size={14} /> Audience Analysis
            </h3>
            <p className="text-xs font-medium text-emerald-900 leading-relaxed italic">
              "{scope.audienceAnalysis}"
            </p>
          </div>
        </div>

        {/* Challenges & Terminology */}
        <div className="space-y-4">
          <div className="p-5 bg-rose-50/50 border border-rose-100 rounded-2xl">
            <h3 className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-4 flex items-center gap-2">
              <AlertTriangle size={14} /> Potential Challenges
            </h3>
            <div className="space-y-3">
              {scope.potentialChallenges.map((challenge, idx) => (
                <div key={idx} className="p-3 bg-white rounded-xl border border-rose-50 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 text-[8px] font-black rounded uppercase">{challenge.category}</span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-700 mb-1">{challenge.description}</p>
                  <div className="flex items-start gap-1.5 text-[9px] text-emerald-600 font-medium">
                    <CheckCircle2 size={10} className="mt-0.5 flex-shrink-0" />
                    <span>Mitigation: {challenge.mitigation}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 bg-amber-50/50 border border-amber-100 rounded-2xl">
            <h3 className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Zap size={14} /> Critical Terminology
            </h3>
            <div className="flex flex-wrap gap-2">
              {scope.keyTerminology.map((term, idx) => (
                <span key={idx} className="px-2.5 py-1 bg-white border border-amber-200 text-amber-700 text-[10px] font-black rounded-lg shadow-sm">
                  {term}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectScopingPanel;
