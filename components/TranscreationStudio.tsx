import React, { useState } from 'react';
import { Sparkles, ArrowRight, Target, Heart, MessageCircle, RefreshCw, Loader2, Copy, Check } from 'lucide-react';
import { generateTranscreations } from '../services/geminiService';
import { ProfessionalField, LinguisticPersona, StyleGuide } from '../types';

interface TranscreationStudioProps {
  sourceLang: string;
  targetLang: string;
  field: ProfessionalField;
  persona?: LinguisticPersona;
  customStyleGuide?: StyleGuide;
}

export interface TranscreationOption {
  id: string;
  headline: string;
  body: string;
  backTranslation: string;
  culturalRationale: string;
  emotionalResonance: number; // 0-100
  tone: string;
}

export default function TranscreationStudio({ sourceLang, targetLang, field, persona, customStyleGuide }: TranscreationStudioProps) {
  const [sourceHeadline, setSourceHeadline] = useState('Unleash your inner potential.');
  const [sourceBody, setSourceBody] = useState('Our new fitness app helps you track, train, and transform. Join millions of users worldwide and start your journey today.');
  const [targetAudience, setTargetAudience] = useState('Young professionals, health-conscious, urban');
  const [brandVoice, setBrandVoice] = useState('Empowering, energetic, modern');
  
  const [options, setOptions] = useState<TranscreationOption[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!sourceHeadline.trim() && !sourceBody.trim()) return;
    
    setIsGenerating(true);
    try {
      const results = await generateTranscreations({
        headline: sourceHeadline,
        body: sourceBody,
        audience: targetAudience,
        voice: brandVoice,
        sourceLang,
        targetLang,
        field,
        persona,
        customStyleGuide
      });
      setOptions(results);
    } catch (error) {
      console.error("Transcreation failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-8 bg-white border-b border-slate-100 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-gradient-to-br from-fuchsia-500 to-purple-600 rounded-2xl shadow-lg shadow-fuchsia-200">
            <Sparkles className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Transcreation Studio</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
              Creative Marketing Adaptation
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
          <span className="text-xs font-black text-slate-600 uppercase tracking-widest">{sourceLang}</span>
          <ArrowRight size={14} className="text-fuchsia-400" />
          <span className="text-xs font-black text-slate-600 uppercase tracking-widest">{targetLang}</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Input Panel */}
        <div className="w-full lg:w-1/3 bg-white border-r border-slate-100 p-6 flex flex-col gap-6 overflow-y-auto shadow-xl z-10">
          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <MessageCircle size={16} className="text-fuchsia-500" /> Source Copy
            </h3>
            <div className="space-y-3">
              <input
                type="text"
                value={sourceHeadline}
                onChange={(e) => setSourceHeadline(e.target.value)}
                placeholder="Headline (e.g., Just Do It)"
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
              />
              <textarea
                value={sourceBody}
                onChange={(e) => setSourceBody(e.target.value)}
                placeholder="Body copy..."
                className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20 resize-none"
              />
            </div>
          </div>

          <div className="h-px bg-slate-100" />

          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <Target size={16} className="text-emerald-500" /> Creative Brief
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Target Audience</label>
                <input
                  type="text"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Brand Voice</label>
                <input
                  type="text"
                  value={brandVoice}
                  onChange={(e) => setBrandVoice(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || (!sourceHeadline.trim() && !sourceBody.trim())}
            className="w-full mt-auto py-4 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-700 hover:to-purple-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-fuchsia-200 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {isGenerating ? 'Adapting...' : 'Generate Transcreations'}
          </button>
        </div>

        {/* Results Panel */}
        <div className="flex-1 bg-slate-50 p-8 overflow-y-auto">
          {options.length === 0 && !isGenerating ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <div className="w-24 h-24 bg-fuchsia-100 rounded-full flex items-center justify-center mb-6">
                <Sparkles size={40} className="text-fuchsia-500" />
              </div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight mb-2">Transcreation vs. Translation</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                Direct translation often fails in marketing. Transcreation adapts the emotion, intent, and cultural nuances of your message for the target market.
              </p>
            </div>
          ) : isGenerating ? (
            <div className="h-full flex flex-col items-center justify-center">
              <Loader2 size={48} className="text-fuchsia-500 animate-spin mb-6" />
              <p className="text-sm font-bold text-slate-600 uppercase tracking-widest animate-pulse">
                Crafting cultural adaptations...
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {options.map((option, index) => (
                <div key={option.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                  {/* Card Header */}
                  <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-fuchsia-100 text-fuchsia-700 flex items-center justify-center text-xs font-black">
                        {index + 1}
                      </span>
                      <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Option {index + 1}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                        <Heart size={12} />
                        Resonance: {option.emotionalResonance}%
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                        {option.tone}
                      </span>
                    </div>
                  </div>

                  {/* Adapted Copy */}
                  <div className="p-6 space-y-4 flex-1">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-[10px] font-bold text-fuchsia-500 uppercase tracking-widest">Adapted Headline</h4>
                        <button onClick={() => handleCopy(option.headline, `${option.id}-h`)} className="text-slate-400 hover:text-fuchsia-600 transition-colors">
                          {copiedId === `${option.id}-h` ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                      <p className="text-xl font-black text-slate-900 leading-tight">{option.headline}</p>
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-[10px] font-bold text-fuchsia-500 uppercase tracking-widest">Adapted Body</h4>
                        <button onClick={() => handleCopy(option.body, `${option.id}-b`)} className="text-slate-400 hover:text-fuchsia-600 transition-colors">
                          {copiedId === `${option.id}-b` ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                      <p className="text-sm font-medium text-slate-700 leading-relaxed">{option.body}</p>
                    </div>
                  </div>

                  {/* Analysis Footer */}
                  <div className="p-5 bg-slate-900 text-slate-300 space-y-4">
                    <div>
                      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Literal Back-Translation</h4>
                      <p className="text-xs font-medium text-slate-200 italic">"{option.backTranslation}"</p>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Cultural Rationale</h4>
                      <p className="text-xs font-medium leading-relaxed">{option.culturalRationale}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
