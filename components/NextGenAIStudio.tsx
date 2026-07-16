import React, { useState } from 'react';
import { 
  Search, 
  TrendingUp, 
  Database, 
  Cpu, 
  Settings, 
  Activity,
  Globe,
  CheckCircle2,
  Loader2,
  AlertCircle,
  FileText,
  Zap
} from 'lucide-react';
import LanguageSelector from './LanguageSelector';
import { optimizeForSEO } from '../services/geminiService';

type Tab = 'seo' | 'brand-voice';

const NextGenAIStudio: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('seo');

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900 text-white p-6 shrink-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black tracking-tight flex items-center gap-3">
              <Cpu className="text-indigo-400" />
              Next-Gen AI Capabilities
            </h2>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Multilingual SEO Optimization and Custom Brand Voice Fine-Tuning.
            </p>
          </div>
          <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setActiveTab('seo')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'seo' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
            >
              <Search size={14} /> Multilingual SEO
            </button>
            <button
              onClick={() => setActiveTab('brand-voice')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'brand-voice' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
            >
              <Database size={14} /> Brand Voice Studio
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'seo' ? <SEOOptimizer /> : <BrandVoiceStudio />}
        </div>
      </div>
    </div>
  );
};

const SEOOptimizer = () => {
  const [sourceText, setSourceText] = useState('');
  const [targetLang, setTargetLang] = useState('Spanish');
  const [targetMarket, setTargetMarket] = useState('Spain');
  const [keywords, setKeywords] = useState('sneakers, running shoes, buy online');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ optimizedText: string; adaptations: { original: string; adapted: string; reason: string; volume: number }[] } | null>(null);

  const handleOptimize = async () => {
    if (!sourceText.trim() || !keywords.trim()) return;
    setIsProcessing(true);
    setResult(null);
    try {
      const keywordList = keywords.split(',').map(k => k.trim()).filter(k => k);
      const res = await optimizeForSEO(sourceText, targetLang, targetMarket, keywordList);
      setResult(res);
    } catch (error) {
      console.error(error);
      alert('Failed to optimize text.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column: Input */}
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
            <Globe size={18} className="text-indigo-600" /> Target Market & Keywords
          </h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Language</label>
                <LanguageSelector value={targetLang} onChange={setTargetLang} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Market / Region</label>
                <input 
                  type="text" 
                  value={targetMarket}
                  onChange={(e) => setTargetMarket(e.target.value)}
                  placeholder="e.g., UK, Mexico, Japan"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Primary Keywords (comma-separated)</label>
              <input 
                type="text" 
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="e.g., sneakers, running shoes"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col h-[300px]">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <FileText size={14} /> Source Copy
          </h3>
          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder="Paste marketing copy here..."
            className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent custom-scrollbar"
          />
          <button
            onClick={handleOptimize}
            disabled={isProcessing || !sourceText.trim() || !keywords.trim()}
            className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
          >
            {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
            {isProcessing ? 'Optimizing...' : 'Optimize & Localize'}
          </button>
        </div>
      </div>

      {/* Right Column: Output & Analytics */}
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 min-h-[300px] flex flex-col">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-500" /> SEO-Optimized Localization
          </h3>
          
          {isProcessing ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <Loader2 size={32} className="animate-spin mb-4 text-indigo-500" />
              <p className="text-sm font-medium">Cross-referencing search trends...</p>
            </div>
          ) : result ? (
            <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-800 leading-relaxed overflow-y-auto">
              {result.optimizedText}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 opacity-60">
              <Search size={48} className="mb-4 text-slate-300" />
              <p className="text-sm font-medium">Run optimization to see localized copy.</p>
            </div>
          )}
        </div>

        {/* Keyword Adaptations Table */}
        {result && result.adaptations && result.adaptations.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 animate-fadeIn">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <TrendingUp size={14} className="text-indigo-500" /> Keyword Adaptations & Search Volume
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="py-2 px-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Original</th>
                    <th className="py-2 px-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Adapted ({targetMarket})</th>
                    <th className="py-2 px-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Est. Vol/Mo</th>
                    <th className="py-2 px-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Reasoning</th>
                  </tr>
                </thead>
                <tbody>
                  {result.adaptations.map((adapt, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="py-3 px-3 text-xs text-slate-500 line-through">{adapt.original}</td>
                      <td className="py-3 px-3 text-xs font-bold text-indigo-700">{adapt.adapted}</td>
                      <td className="py-3 px-3 text-xs font-medium text-emerald-600">
                        {adapt.volume.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-600">{adapt.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const BrandVoiceStudio = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black text-slate-800">Brand Voice Fine-Tuning Studio</h3>
          <p className="text-sm text-slate-500">Fine-tune custom Gemini models.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Models */}
        <div className="lg:col-span-2 space-y-4">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Deployed Custom Models</h4>
          
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <Database size={24} />
              </div>
              <div>
                <h4 className="font-bold text-slate-800">AcmeCorp_Marketing_v2</h4>
                <p className="text-xs text-slate-500 flex items-center gap-2">
                  <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 size={12} /> Active</span>
                  • Trained on 1.2M segments • Last updated 2 days ago
                </p>
              </div>
            </div>
            <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
              <Settings size={18} />
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
                <Database size={24} />
              </div>
              <div>
                <h4 className="font-bold text-slate-800">TechDocs_Strict_v1</h4>
                <p className="text-xs text-slate-500 flex items-center gap-2">
                  <span className="flex items-center gap-1 text-slate-500"><CheckCircle2 size={12} /> Active</span>
                  • Trained on 850K segments • Last updated 1 month ago
                </p>
              </div>
            </div>
            <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
              <Settings size={18} />
            </button>
          </div>

          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mt-8 mb-4">Training Jobs</h4>
          
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Activity className="text-indigo-500 animate-pulse" size={18} />
                <h4 className="font-bold text-slate-800 text-sm">AcmeCorp_Legal_v1</h4>
              </div>
              <span className="text-xs font-bold text-indigo-600">68%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 mb-2">
              <div className="bg-indigo-500 h-2 rounded-full transition-all duration-1000" style={{ width: '68%' }}></div>
            </div>
            <p className="text-xs text-slate-500">Processing epoch 14/20... Estimated time remaining: 45m</p>
          </div>
        </div>

        {/* Info Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 h-fit">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <AlertCircle size={14} /> Fine-Tuning Guidelines
          </h4>
          <div className="space-y-4 text-sm text-slate-600">
            <p>
              Fine-tuning creates a dedicated, private version of the Gemini model that deeply understands your brand's specific terminology, tone, and style.
            </p>
            <ul className="space-y-2 list-disc pl-4">
              <li><strong>Format:</strong> Upload standard TMX 1.4b files or aligned CSVs.</li>
              <li><strong>Minimum Data:</strong> We recommend at least 10,000 high-quality translation pairs for noticeable style adaptation.</li>
              <li><strong>Privacy:</strong> Your fine-tuned models are strictly isolated and never used to train base models.</li>
            </ul>
            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-800 text-xs mt-4">
              <strong>Tip:</strong> Ensure your TMX files are cleaned of any PII before uploading to the training pipeline.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NextGenAIStudio;
