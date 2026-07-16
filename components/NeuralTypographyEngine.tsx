import React, { useState, useEffect } from 'react';
import { Type, Sparkles, LayoutTemplate, AlertTriangle, CheckCircle2, Code2, Copy, Check, RefreshCw, Loader2, Globe } from 'lucide-react';
import { GoogleGenAI } from '../services/geminiService';
import { MODELS } from '../constants';
import { getApiKey } from '../services/geminiService';

interface TypographyEngineProps {
  targetLang: string;
}

interface TypographyConfig {
  fontFamily: string;
  googleFontsUrl: string;
  lineHeight: string;
  letterSpacing: string;
  fontWeight: string;
  textAlign: 'left' | 'right' | 'center' | 'justify';
  direction: 'ltr' | 'rtl';
  tailwindClasses: string;
  cssRules: string;
  risks: string[];
  rationale: string;
}

export default function NeuralTypographyEngine({ targetLang }: TypographyEngineProps) {
  const [previewText, setPreviewText] = useState('This is a sample text to preview the typographic adjustments. It should be long enough to demonstrate line height, word wrapping, and overall readability in the target language.');
  const [translatedText, setTranslatedText] = useState('');
  const [config, setConfig] = useState<TypographyConfig | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [copiedCss, setCopiedCss] = useState(false);
  const [copiedTailwind, setCopiedTailwind] = useState(false);

  const analyzeTypography = async () => {
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: getApiKey() });
      
      // First, translate the preview text to the target language
      const translationPrompt = `Translate the following text into ${targetLang}. Only return the translation, no extra text:\n\n"${previewText}"`;
      const transResponse = await ai.models.generateContent({
        model: MODELS.TEXT,
        contents: translationPrompt,
      });
      const translated = transResponse.text || previewText;
      setTranslatedText(translated);

      // Then, analyze the typographic requirements
      const analysisPrompt = `
        You are an expert in international typography and CSS/Tailwind.
        Analyze the typographic requirements for the language: ${targetLang}.
        
        Consider:
        - Script type (Latin, Cyrillic, Arabic, CJK, etc.)
        - Optimal font families (suggest a high-quality, free Google Font)
        - Line height (e.g., Arabic and Thai need more vertical space)
        - Letter spacing (e.g., CJK often needs different tracking)
        - Text direction (LTR vs RTL)
        - Common layout risks (e.g., German compound words causing overflow, Arabic baseline alignment)
        
        Return a JSON object with the following structure:
        {
          "fontFamily": "Name of the Google Font",
          "googleFontsUrl": "https://fonts.googleapis.com/css2?family=...",
          "lineHeight": "CSS line-height value (e.g., '1.8')",
          "letterSpacing": "CSS letter-spacing value (e.g., '0.05em')",
          "fontWeight": "Optimal base font weight (e.g., '400')",
          "textAlign": "left" | "right",
          "direction": "ltr" | "rtl",
          "tailwindClasses": "Equivalent Tailwind classes (e.g., 'leading-loose tracking-wide text-right')",
          "cssRules": "Raw CSS rules as a string",
          "risks": ["Risk 1", "Risk 2"],
          "rationale": "Brief explanation of why these settings are optimal for this language."
        }
      `;

      const analysisResponse = await ai.models.generateContent({
        model: MODELS.TEXT,
        contents: analysisPrompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      const configData = JSON.parse(analysisResponse.text || "{}");
      setConfig(configData);
      
      // Dynamically load the suggested Google Font
      if (configData.googleFontsUrl) {
        const link = document.createElement('link');
        link.href = configData.googleFontsUrl;
        link.rel = 'stylesheet';
        document.head.appendChild(link);
      }

    } catch (error) {
      console.error("Typography analysis failed:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    analyzeTypography();
  }, [targetLang]);

  const copyToClipboard = (text: string, type: 'css' | 'tailwind') => {
    navigator.clipboard.writeText(text);
    if (type === 'css') {
      setCopiedCss(true);
      setTimeout(() => setCopiedCss(false), 2000);
    } else {
      setCopiedTailwind(true);
      setTimeout(() => setCopiedTailwind(false), 2000);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-8 bg-white border-b border-slate-100 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg shadow-blue-200">
            <Type className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Neural Typography Engine</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
              DTP Enhancement & Layout Protection
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
          <Globe size={16} className="text-indigo-400" />
          <span className="text-xs font-black text-slate-600 uppercase tracking-widest">Target: {targetLang}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        {isAnalyzing ? (
          <div className="h-full flex flex-col items-center justify-center">
            <Loader2 size={48} className="text-indigo-500 animate-spin mb-6" />
            <p className="text-sm font-bold text-slate-600 uppercase tracking-widest animate-pulse">
              Analyzing script characteristics for {targetLang}...
            </p>
          </div>
        ) : config ? (
          <div className="max-w-6xl mx-auto space-y-8">
            
            {/* Top Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-black text-xl">
                  Aa
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Optimal Font</p>
                  <p className="text-lg font-black text-slate-800">{config.fontFamily}</p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                  <LayoutTemplate size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Direction</p>
                  <p className="text-lg font-black text-slate-800 uppercase">{config.direction}</p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Layout Risks</p>
                  <p className="text-lg font-black text-slate-800">{config.risks.length} Detected</p>
                </div>
              </div>
            </div>

            {/* Preview Comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Default Styling (Bad) */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Default Styling (Risk)</span>
                  <span className="px-2 py-1 bg-rose-100 text-rose-700 rounded text-[10px] font-bold uppercase">Unoptimized</span>
                </div>
                <div className="p-8 flex-1 bg-white">
                  <div 
                    className="p-6 bg-slate-100 rounded-xl border border-slate-200"
                    style={{
                      // Intentionally generic/bad styling for comparison
                      fontFamily: 'sans-serif',
                      lineHeight: '1.2',
                      letterSpacing: 'normal',
                      direction: 'ltr', // Force LTR to show breakage for RTL languages
                      textAlign: 'left'
                    }}
                  >
                    {translatedText}
                  </div>
                </div>
              </div>

              {/* Neural Optimized Styling (Good) */}
              <div className="bg-white rounded-2xl border border-indigo-200 shadow-md overflow-hidden flex flex-col relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
                <div className="p-4 bg-indigo-50/50 border-b border-indigo-100 flex items-center justify-between">
                  <span className="text-xs font-black text-indigo-700 uppercase tracking-widest flex items-center gap-2">
                    <Sparkles size={14} /> Neural Optimized
                  </span>
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold uppercase flex items-center gap-1">
                    <CheckCircle2 size={12} /> Perfect Fit
                  </span>
                </div>
                <div className="p-8 flex-1 bg-white">
                  <div 
                    className="p-6 bg-indigo-50/30 rounded-xl border border-indigo-100"
                    style={{
                      fontFamily: `"${config.fontFamily}", sans-serif`,
                      lineHeight: config.lineHeight,
                      letterSpacing: config.letterSpacing,
                      fontWeight: config.fontWeight,
                      direction: config.direction,
                      textAlign: config.textAlign
                    }}
                  >
                    {translatedText}
                  </div>
                </div>
              </div>
            </div>

            {/* Code Export & Rationale */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-xl">
                  <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Code2 size={14} /> Generated CSS
                    </span>
                    <button 
                      onClick={() => copyToClipboard(config.cssRules, 'css')}
                      className="text-slate-400 hover:text-white transition-colors"
                    >
                      {copiedCss ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                    </button>
                  </div>
                  <pre className="p-4 text-sm text-emerald-400 font-mono overflow-x-auto">
                    <code>{config.cssRules}</code>
                  </pre>
                </div>

                <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-xl">
                  <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Code2 size={14} /> Tailwind Classes
                    </span>
                    <button 
                      onClick={() => copyToClipboard(config.tailwindClasses, 'tailwind')}
                      className="text-slate-400 hover:text-white transition-colors"
                    >
                      {copiedTailwind ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                    </button>
                  </div>
                  <div className="p-4 text-sm text-sky-400 font-mono overflow-x-auto">
                    {config.tailwindClasses}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Sparkles size={16} className="text-indigo-500" /> Rationale
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed font-medium">
                    {config.rationale}
                  </p>
                </div>

                <div className="bg-rose-50 p-6 rounded-2xl border border-rose-100 shadow-sm">
                  <h3 className="text-xs font-black text-rose-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <AlertTriangle size={16} className="text-rose-500" /> Layout Risks
                  </h3>
                  <ul className="space-y-3">
                    {config.risks.map((risk, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-rose-700 font-medium">
                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                        {risk}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

          </div>
        ) : null}
      </div>
    </div>
  );
}
