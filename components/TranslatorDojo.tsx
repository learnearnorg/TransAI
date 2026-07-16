import React, { useState, useEffect } from 'react';
import { Swords, Target, Award, MessageSquare, ChevronRight, Star, Loader2, RefreshCw, CheckCircle2, AlertTriangle, Zap } from 'lucide-react';
import { generateDojoChallenge, evaluateDojoTranslation } from '../services/geminiService';
import { ProfessionalField } from '../types';

interface TranslatorDojoProps {
  sourceLang: string;
  targetLang: string;
  field: ProfessionalField;
}

interface Challenge {
  sourceText: string;
  context: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Master';
  hints: string[];
}

interface Evaluation {
  score: number;
  feedback: string;
  mqm: {
    accuracy: string;
    fluency: string;
    style: string;
    terminology: string;
  };
  betterAlternative: string;
}

export default function TranslatorDojo({ sourceLang, targetLang, field }: TranslatorDojoProps) {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [userTranslation, setUserTranslation] = useState('');
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [difficulty, setDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced' | 'Master'>('Intermediate');
  const [xp, setXp] = useState(0);

  const fetchChallenge = async () => {
    setIsGenerating(true);
    setUserTranslation('');
    setEvaluation(null);
    try {
      const newChallenge = await generateDojoChallenge(sourceLang, targetLang, field, difficulty);
      setChallenge(newChallenge as Challenge);
    } catch (error) {
      console.error("Failed to fetch challenge:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const submitTranslation = async () => {
    if (!challenge || !userTranslation.trim()) return;
    setIsEvaluating(true);
    try {
      const result = await evaluateDojoTranslation(
        challenge.sourceText,
        userTranslation,
        sourceLang,
        targetLang,
        challenge.context
      );
      setEvaluation(result);
      if (result.score >= 80) {
        setXp(prev => prev + Math.floor(result.score * (difficulty === 'Master' ? 2 : difficulty === 'Advanced' ? 1.5 : 1)));
      }
    } catch (error) {
      console.error("Evaluation failed:", error);
    } finally {
      setIsEvaluating(false);
    }
  };

  useEffect(() => {
    fetchChallenge();
  }, [sourceLang, targetLang, field, difficulty]);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-500 bg-emerald-50 border-emerald-200';
    if (score >= 70) return 'text-amber-500 bg-amber-50 border-amber-200';
    return 'text-rose-500 bg-rose-50 border-rose-200';
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-8 bg-white border-b border-slate-100 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-lg shadow-orange-200">
            <Swords className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Translator Dojo</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
              Gamified Linguistic Training
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 bg-orange-50 px-4 py-2 rounded-xl border border-orange-100">
            <Star size={16} className="text-orange-500 fill-orange-500" />
            <span className="text-sm font-black text-orange-700">{xp} XP</span>
          </div>
          <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
            <span className="text-xs font-black text-slate-600 uppercase tracking-widest">{sourceLang}</span>
            <ChevronRight size={14} className="text-orange-400" />
            <span className="text-xs font-black text-slate-600 uppercase tracking-widest">{targetLang}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Challenge Panel */}
        <div className="w-full lg:w-1/2 bg-white border-r border-slate-100 p-8 flex flex-col gap-6 overflow-y-auto shadow-xl z-10">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <Target size={16} className="text-orange-500" /> Current Challenge
            </h3>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as any)}
              className="text-xs font-bold uppercase tracking-widest bg-slate-50 border border-slate-200 text-slate-600 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            >
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
              <option value="Master">Master</option>
            </select>
          </div>

          {isGenerating ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <Loader2 size={48} className="text-orange-500 animate-spin mb-6" />
              <p className="text-sm font-bold text-slate-600 uppercase tracking-widest animate-pulse">
                Forging a new challenge...
              </p>
            </div>
          ) : challenge ? (
            <div className="space-y-6 flex-1 flex flex-col">
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Source Text</span>
                  <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${
                    difficulty === 'Master' ? 'bg-purple-100 text-purple-700' :
                    difficulty === 'Advanced' ? 'bg-rose-100 text-rose-700' :
                    difficulty === 'Intermediate' ? 'bg-amber-100 text-amber-700' :
                    'bg-emerald-100 text-emerald-700'
                  }`}>
                    {difficulty}
                  </span>
                </div>
                <p className="text-xl font-medium text-slate-800 leading-relaxed">{challenge.sourceText}</p>
              </div>

              <div className="p-5 bg-indigo-50 rounded-2xl border border-indigo-100">
                <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <MessageSquare size={14} /> Context & Brief
                </h4>
                <p className="text-sm text-indigo-900 font-medium leading-relaxed">{challenge.context}</p>
              </div>

              <div className="mt-auto space-y-3">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Your Translation</h4>
                <textarea
                  value={userTranslation}
                  onChange={(e) => setUserTranslation(e.target.value)}
                  placeholder={`Translate to ${targetLang}...`}
                  className="w-full h-40 p-5 bg-white border-2 border-slate-200 rounded-2xl text-base font-medium text-slate-800 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 resize-none transition-all"
                />
                <div className="flex gap-3">
                  <button
                    onClick={submitTranslation}
                    disabled={isEvaluating || !userTranslation.trim() || !!evaluation}
                    className="flex-1 py-4 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-lg shadow-orange-200 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isEvaluating ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
                    {isEvaluating ? 'Evaluating...' : 'Submit for Review'}
                  </button>
                  <button
                    onClick={fetchChallenge}
                    disabled={isGenerating || isEvaluating}
                    className="px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-black uppercase tracking-widest transition-all flex items-center justify-center disabled:opacity-50"
                  >
                    <RefreshCw size={18} />
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Evaluation Panel */}
        <div className="flex-1 bg-slate-50 p-8 overflow-y-auto">
          {!evaluation && !isEvaluating ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto opacity-50">
              <div className="w-24 h-24 bg-slate-200 rounded-full flex items-center justify-center mb-6">
                <Award size={40} className="text-slate-400" />
              </div>
              <h3 className="text-xl font-black text-slate-600 tracking-tight mb-2">Awaiting Submission</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                Translate the challenge on the left and submit it to receive a detailed MQM (Multidimensional Quality Metrics) review from the AI Sensei.
              </p>
            </div>
          ) : isEvaluating ? (
            <div className="h-full flex flex-col items-center justify-center">
              <Loader2 size={48} className="text-orange-500 animate-spin mb-6" />
              <p className="text-sm font-bold text-slate-600 uppercase tracking-widest animate-pulse">
                Sensei is reviewing your work...
              </p>
            </div>
          ) : evaluation ? (
            <div className="max-w-2xl mx-auto space-y-8 animate-fadeIn">
              {/* Score Card */}
              <div className={`p-8 rounded-3xl border-2 flex flex-col items-center justify-center text-center ${getScoreColor(evaluation.score)}`}>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 opacity-80">MQM Quality Score</span>
                <div className="text-7xl font-black tracking-tighter mb-4">{evaluation.score}</div>
                <p className="text-sm font-bold opacity-90 max-w-md">{evaluation.feedback}</p>
              </div>

              {/* MQM Categories */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-500" /> Accuracy
                  </h4>
                  <p className="text-sm text-slate-700 font-medium">{evaluation.mqm.accuracy}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Zap size={14} className="text-blue-500" /> Fluency
                  </h4>
                  <p className="text-sm text-slate-700 font-medium">{evaluation.mqm.fluency}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Target size={14} className="text-purple-500" /> Style & Tone
                  </h4>
                  <p className="text-sm text-slate-700 font-medium">{evaluation.mqm.style}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <AlertTriangle size={14} className="text-amber-500" /> Terminology
                  </h4>
                  <p className="text-sm text-slate-700 font-medium">{evaluation.mqm.terminology}</p>
                </div>
              </div>

              {/* Better Alternative */}
              <div className="bg-slate-900 p-6 rounded-2xl shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-orange-400 to-red-500" />
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Star size={14} className="text-orange-400" /> Sensei's Alternative
                </h4>
                <p className="text-lg text-white font-medium leading-relaxed">
                  {evaluation.betterAlternative}
                </p>
              </div>

              <button
                onClick={fetchChallenge}
                className="w-full py-4 bg-white border-2 border-slate-200 hover:border-orange-300 hover:bg-orange-50 text-slate-700 hover:text-orange-700 rounded-xl text-sm font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
              >
                Next Challenge <ChevronRight size={18} />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
