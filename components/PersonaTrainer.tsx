
import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  Save, 
  Plus, 
  Trash2, 
  Sparkles, 
  Zap, 
  Check, 
  Loader2, 
  MessageSquare, 
  BookOpen, 
  Target,
  ChevronRight,
  Info,
  AlertCircle,
  BrainCircuit,
  Settings,
  RefreshCw,
  ArrowRight
} from 'lucide-react';
import { LinguisticPersona, PersonaExample, ProfessionalField, PersonaDefinition } from '../types';
import { generateId } from '../utils/id';
import { translateText } from '../services/geminiService';

interface PersonaTrainerProps {
  onSave: (persona: PersonaDefinition) => void;
  onClose: () => void;
  existingPersonas: PersonaDefinition[];
}

const PersonaTrainer: React.FC<PersonaTrainerProps> = ({ onSave, onClose, existingPersonas }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [baseInstruction, setBaseInstruction] = useState('');
  const [examples, setExamples] = useState<PersonaExample[]>([
    { source: '', target: '', context: '' }
  ]);
  const [isTraining, setIsTraining] = useState(false);
  const [testSource, setTestSource] = useState('');
  const [testResult, setTestResult] = useState('');
  const [isTesting, setIsTesting] = useState(false);

  const addExample = () => {
    setExamples([...examples, { source: '', target: '', context: '' }]);
  };

  const updateExample = (index: number, field: keyof PersonaExample, value: string) => {
    const newExamples = [...examples];
    newExamples[index][field] = value;
    setExamples(newExamples);
  };

  const removeExample = (index: number) => {
    setExamples(examples.filter((_, i) => i !== index));
  };

  const handleTrain = async () => {
    if (!name || !baseInstruction) return;
    setIsTraining(true);
    
    // Simulate "training" - in a real app, this might involve fine-tuning or prompt optimization
    setTimeout(() => {
      setIsTraining(false);
      // In this demo, we just save the persona
    }, 1500);
  };

  const handleTest = async () => {
    if (!testSource) return;
    setIsTesting(true);
    
    try {
      // Construct few-shot prompt from examples
      const fewShotContext = examples
        .filter(ex => ex.source && ex.target)
        .map(ex => `Source: ${ex.source}\nTarget: ${ex.target}${ex.context ? `\nContext: ${ex.context}` : ''}`)
        .join('\n\n');

      const result = await translateText(
        testSource,
        'Auto',
        'English', // Default test target
        'General',
        [],
        'Standard',
        `${baseInstruction}\n\nFew-shot examples:\n${fewShotContext}`,
        name,
        [],
        ''
      );
      setTestResult(result.text);
    } catch (err) {
      console.error("Persona test failed", err);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    const newPersona: PersonaDefinition = {
      id: generateId(),
      name,
      description,
      baseInstruction,
      examples: examples.filter(ex => ex.source && ex.target),
      isCustom: true
    };
    onSave(newPersona);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 animate-fadeIn">
      <div className="bg-white w-full max-w-5xl h-[90vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200">
              <BrainCircuit size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Neural Persona Architect</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">Few-Shot Learning • Style Synthesis • Linguistic Identity</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-all text-slate-400"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          <div className="grid grid-cols-12 gap-10">
            {/* Left: Configuration */}
            <div className="col-span-7 space-y-10">
              {/* Basic Info */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 px-2">
                  <Info size={16} className="text-indigo-500" />
                  <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Identity Definition</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Persona Name</label>
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Cyberpunk Noir"
                      className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold text-slate-900 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Core Description</label>
                    <input 
                      type="text" 
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="e.g., Gritty, futuristic, tech-heavy"
                      className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold text-slate-900 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Base Linguistic Directives</label>
                  <textarea 
                    value={baseInstruction}
                    onChange={(e) => setBaseInstruction(e.target.value)}
                    placeholder="Describe how this persona speaks. Use specific adjectives and rules..."
                    className="w-full h-32 px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold text-slate-900 focus:border-indigo-500 outline-none transition-all resize-none"
                  />
                </div>
              </section>

              {/* Few-Shot Examples */}
              <section className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3">
                    <BookOpen size={16} className="text-indigo-500" />
                    <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Few-Shot Training Set</h3>
                  </div>
                  <button 
                    onClick={addExample}
                    className="flex items-center gap-2 text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                  >
                    <Plus size={14} /> Add Pattern
                  </button>
                </div>

                <div className="space-y-4">
                  {examples.map((ex, idx) => (
                    <div key={idx} className="p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl space-y-4 relative group">
                      <button 
                        onClick={() => removeExample(idx)}
                        className="absolute top-4 right-4 p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Source Input</label>
                          <textarea 
                            value={ex.source}
                            onChange={(e) => updateExample(idx, 'source', e.target.value)}
                            className="w-full h-20 px-4 py-3 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 outline-none focus:border-indigo-400 resize-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Target Output</label>
                          <textarea 
                            value={ex.target}
                            onChange={(e) => updateExample(idx, 'target', e.target.value)}
                            className="w-full h-20 px-4 py-3 bg-white border border-indigo-100 rounded-xl text-[11px] font-bold text-slate-700 outline-none focus:border-indigo-400 resize-none"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Contextual Nuance (Optional)</label>
                        <input 
                          type="text" 
                          value={ex.context}
                          onChange={(e) => updateExample(idx, 'context', e.target.value)}
                          placeholder="e.g., Use this when the speaker is angry"
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 outline-none focus:border-indigo-400"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Right: Validation & Preview */}
            <div className="col-span-5 space-y-8">
              <div className="sticky top-0 space-y-8">
                {/* Training Status */}
                <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full -mr-16 -mt-16 blur-2xl" />
                  <div className="relative z-10 space-y-6">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Model Readiness</span>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${examples.length >= 3 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        <span className="text-[9px] font-bold uppercase">{examples.length >= 3 ? 'Optimal' : 'Insufficient Data'}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest opacity-60">
                        <span>Pattern Density</span>
                        <span>{Math.min(100, (examples.length / 5) * 100)}%</span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${Math.min(100, (examples.length / 5) * 100)}%` }} />
                      </div>
                    </div>
                    <button 
                      onClick={handleTrain}
                      disabled={isTraining || examples.length < 1}
                      className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 disabled:text-slate-600 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl shadow-indigo-900/40"
                    >
                      {isTraining ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} fill="currentColor" />}
                      Synthesize Persona
                    </button>
                  </div>
                </div>

                {/* Live Preview */}
                <div className="p-8 bg-white border-2 border-slate-100 rounded-[2.5rem] shadow-sm space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Target size={16} className="text-indigo-500" />
                      <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Neural Sandbox</h3>
                    </div>
                    <span className="text-[8px] font-bold text-slate-400 uppercase">Real-time Validation</span>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Test Input</label>
                      <textarea 
                        value={testSource}
                        onChange={(e) => setTestSource(e.target.value)}
                        placeholder="Type something to test the persona..."
                        className="w-full h-24 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold text-slate-700 outline-none focus:border-indigo-400 resize-none"
                      />
                    </div>
                    <button 
                      onClick={handleTest}
                      disabled={isTesting || !testSource}
                      className="w-full py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                    >
                      {isTesting ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                      Run Inference
                    </button>
                    {testResult && (
                      <div className="space-y-2 animate-fadeIn">
                        <label className="text-[8px] font-black text-indigo-500 uppercase tracking-widest ml-1">Persona Output</label>
                        <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                          <p className="text-[11px] font-bold text-slate-700 leading-relaxed italic">"{testResult}"</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-10 py-8 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Encrypted Storage</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-500" />
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Gemini 3.1 Optimized</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={onClose}
              className="px-8 py-4 bg-white text-slate-500 border-2 border-slate-100 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
            >
              Discard
            </button>
            <button 
              onClick={handleSave}
              disabled={!name || !baseInstruction}
              className="px-10 py-4 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 flex items-center gap-3 disabled:bg-slate-300 disabled:shadow-none"
            >
              <Save size={18} /> Commit Persona
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonaTrainer;
