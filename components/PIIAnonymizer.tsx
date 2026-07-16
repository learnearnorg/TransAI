import React, { useState } from 'react';
import { Shield, Lock, Unlock, ArrowRight, CheckCircle2, User, Mail, CreditCard, MapPin, Building, Phone, Loader2, FileText, Globe, EyeOff, ShieldCheck, Database } from 'lucide-react';
import { anonymizeText, unmaskText, translateText } from '../services/geminiService';
import LanguageSelector from './LanguageSelector';

const PII_TYPES = [
  { id: 'person', label: 'Person Names', icon: <User size={14} /> },
  { id: 'email', label: 'Email Addresses', icon: <Mail size={14} /> },
  { id: 'phone', label: 'Phone Numbers', icon: <Phone size={14} /> },
  { id: 'financial', label: 'Financial Data (CC/SSN)', icon: <CreditCard size={14} /> },
  { id: 'location', label: 'Locations', icon: <MapPin size={14} /> },
  { id: 'organization', label: 'Organizations', icon: <Building size={14} /> },
];

const PIIAnonymizer: React.FC = () => {
  const [sourceText, setSourceText] = useState('');
  const [targetLang, setTargetLang] = useState('Spanish');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['person', 'email', 'phone', 'financial']);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0); // 0: Idle, 1: Masking, 2: Translating, 3: Unmasking/Done
  
  const [maskedSource, setMaskedSource] = useState('');
  const [translatedMasked, setTranslatedMasked] = useState('');
  const [finalText, setFinalText] = useState('');
  const [piiMap, setPiiMap] = useState<Record<string, string>>({});
  const [detectedEntities, setDetectedEntities] = useState<{ type: string; value: string; placeholder: string }[]>([]);

  const toggleType = (id: string) => {
    setSelectedTypes(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  const handleProcess = async () => {
    if (!sourceText.trim() || selectedTypes.length === 0) return;
    
    setIsProcessing(true);
    setStep(1);
    setMaskedSource('');
    setTranslatedMasked('');
    setFinalText('');
    setPiiMap({});
    setDetectedEntities([]);

    try {
      // Step 1: Mask
      const typesToMask = PII_TYPES.filter(t => selectedTypes.includes(t.id)).map(t => t.label);
      const maskResult = await anonymizeText(sourceText, typesToMask);
      setMaskedSource(maskResult.maskedText);
      setPiiMap(maskResult.piiMap);
      setDetectedEntities(maskResult.detectedEntities);
      
      // Step 2: Translate
      setStep(2);
      const translateResult = await translateText(
        maskResult.maskedText,
        'Auto-detect',
        targetLang,
        'General',
        [],
        'Standard'
      );
      setTranslatedMasked(translateResult.text);

      // Step 3: Unmask
      setStep(3);
      const unmasked = unmaskText(translateResult.text, maskResult.piiMap);
      setFinalText(unmasked);

    } catch (error) {
      console.error(error);
      alert('An error occurred during the anonymization pipeline.');
      setStep(0);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderTextWithHighlights = (text: string, isMasked: boolean) => {
    if (!text) return null;
    
    if (isMasked) {
      // Highlight placeholders like [PERSON_1]
      const parts = text.split(/(\[[A-Z_]+_\d+\])/g);
      return parts.map((part, i) => {
        if (part.match(/^\[[A-Z_]+_\d+\]$/)) {
          return <span key={i} className="bg-indigo-100 text-indigo-800 px-1 rounded font-mono text-[10px] font-bold border border-indigo-200">{part}</span>;
        }
        return <span key={i}>{part}</span>;
      });
    } else {
      // Highlight original values
      let highlightedText: React.ReactNode[] = [text];
      
      // A very basic highlighting approach for unmasked text
      detectedEntities.forEach(entity => {
        const newHighlightedText: React.ReactNode[] = [];
        highlightedText.forEach(part => {
          if (typeof part === 'string') {
            const splitParts = part.split(new RegExp(`(${entity.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'g'));
            splitParts.forEach((sp, i) => {
              if (sp === entity.value) {
                newHighlightedText.push(<span key={`${entity.value}-${i}`} className="bg-emerald-100 text-emerald-800 px-1 rounded font-medium border border-emerald-200">{sp}</span>);
              } else if (sp) {
                newHighlightedText.push(sp);
              }
            });
          } else {
            newHighlightedText.push(part);
          }
        });
        highlightedText = newHighlightedText;
      });
      
      return highlightedText;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      <div className="bg-slate-900 text-white p-6 shrink-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black tracking-tight flex items-center gap-3">
              <EyeOff className="text-indigo-400" />
              PII Anonymization & Data Masking Engine
            </h2>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Enterprise-grade data protection. Automatically detect, mask, and securely translate sensitive information without exposing it to external LLMs.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-xl border border-slate-700">
            <ShieldCheck className="text-emerald-400" size={18} />
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Zero-Knowledge Pipeline</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Configuration & Input */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Database size={14} /> Data Types to Mask
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PII_TYPES.map(type => (
                  <button
                    key={type.id}
                    onClick={() => toggleType(type.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${selectedTypes.includes(type.id) ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-200'}`}
                  >
                    <div className={`p-1.5 rounded-lg ${selectedTypes.includes(type.id) ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                      {type.icon}
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider">{type.label}</span>
                    {selectedTypes.includes(type.id) && <CheckCircle2 size={12} className="ml-auto text-indigo-500" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col h-[400px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <FileText size={14} /> Source Document
                </h3>
                <LanguageSelector value={targetLang} onChange={setTargetLang} className="w-[140px]" />
              </div>
              <textarea
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                placeholder="Paste sensitive document here..."
                className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent custom-scrollbar"
              />
              <button
                onClick={handleProcess}
                disabled={isProcessing || !sourceText.trim() || selectedTypes.length === 0}
                className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
              >
                {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />}
                {isProcessing ? 'Processing Pipeline...' : 'Secure Translate'}
              </button>
            </div>
          </div>

          {/* Right Column: Pipeline Visualization */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 min-h-[600px] flex flex-col">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Shield size={14} /> Anonymization Pipeline
              </h3>

              {!isProcessing && step === 0 && !finalText ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 opacity-60">
                  <Lock size={48} className="mb-4 text-slate-300" />
                  <p className="text-sm font-medium">Enter text and click Secure Translate to begin.</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Step 1: Masked Source */}
                  <div className={`transition-all duration-500 ${step >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${step === 1 ? 'bg-indigo-600 text-white animate-pulse' : 'bg-slate-200 text-slate-500'}`}>1</div>
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2">
                        <Lock size={14} className="text-indigo-500" /> Masked Source
                      </h4>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-700 leading-relaxed min-h-[80px]">
                      {step === 1 && !maskedSource ? (
                        <div className="flex items-center gap-2 text-slate-400"><Loader2 size={14} className="animate-spin" /> Detecting and masking PII...</div>
                      ) : (
                        renderTextWithHighlights(maskedSource, true)
                      )}
                    </div>
                  </div>

                  {/* Step 2: Translated Masked */}
                  <div className={`transition-all duration-500 ${step >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${step === 2 ? 'bg-indigo-600 text-white animate-pulse' : 'bg-slate-200 text-slate-500'}`}>2</div>
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2">
                        <Globe size={14} className="text-indigo-500" /> Safe Translation
                      </h4>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-700 leading-relaxed min-h-[80px]">
                      {step === 2 && !translatedMasked ? (
                        <div className="flex items-center gap-2 text-slate-400"><Loader2 size={14} className="animate-spin" /> Translating masked content...</div>
                      ) : (
                        renderTextWithHighlights(translatedMasked, true)
                      )}
                    </div>
                  </div>

                  {/* Step 3: Final Unmasked */}
                  <div className={`transition-all duration-500 ${step >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${step === 3 && isProcessing ? 'bg-emerald-600 text-white animate-pulse' : step === 3 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>3</div>
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2">
                        <Unlock size={14} className="text-emerald-500" /> Final Unmasked Output
                      </h4>
                    </div>
                    <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-4 text-sm text-slate-800 leading-relaxed min-h-[80px]">
                      {step === 3 && !finalText ? (
                        <div className="flex items-center gap-2 text-slate-400"><Loader2 size={14} className="animate-spin" /> Re-injecting PII...</div>
                      ) : (
                        renderTextWithHighlights(finalText, false)
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Detected Entities Table */}
            {detectedEntities.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 animate-fadeIn">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <ShieldCheck size={14} /> Protected Entities Log
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="py-2 px-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                        <th className="py-2 px-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Original Value</th>
                        <th className="py-2 px-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Placeholder</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detectedEntities.map((entity, i) => (
                        <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                          <td className="py-2 px-3 text-xs font-bold text-slate-600">{entity.type}</td>
                          <td className="py-2 px-3 text-xs text-slate-500">{entity.value}</td>
                          <td className="py-2 px-3">
                            <span className="bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded font-mono text-[10px] font-bold border border-indigo-200">
                              {entity.placeholder}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default PIIAnonymizer;
