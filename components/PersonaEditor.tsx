
import React, { useState } from 'react';
import { X, Save, Plus, Trash2, User, FileText, Zap, BrainCircuit, Loader2, RefreshCw, Target, Info, BookOpen } from 'lucide-react';
import { LinguisticPersona, PersonaExample, PersonaDefinition } from '../types';
import { translateText } from '../services/geminiService';
import { generateId } from '../utils/id';

interface PersonaEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (persona: PersonaDefinition) => void;
  onDelete: (id: string) => void;
  customPersonas: PersonaDefinition[];
}

const PersonaEditor: React.FC<PersonaEditorProps> = ({ isOpen, onClose, onSave, onDelete, customPersonas }) => {
  const [editingPersona, setEditingPersona] = useState<PersonaDefinition | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [testSource, setTestSource] = useState('');
  const [testResult, setTestResult] = useState('');
  const [isTesting, setIsTesting] = useState(false);

  if (!isOpen) return null;

  const handleStartAdd = () => {
    setEditingPersona({
      id: generateId(),
      name: '',
      description: '',
      baseInstruction: '',
      examples: [{ source: '', target: '', context: '' }],
      isCustom: true
    });
    setIsAdding(true);
  };

  const handleSave = () => {
    if (editingPersona && editingPersona.name && editingPersona.baseInstruction) {
      onSave({
        ...editingPersona,
        examples: editingPersona.examples.filter(ex => ex.source && ex.target)
      });
      setEditingPersona(null);
      setIsAdding(false);
    }
  };

  const addExample = () => {
    if (!editingPersona) return;
    setEditingPersona({
      ...editingPersona,
      examples: [...editingPersona.examples, { source: '', target: '', context: '' }]
    });
  };

  const updateExample = (index: number, field: keyof PersonaExample, value: string) => {
    if (!editingPersona) return;
    const newExamples = [...editingPersona.examples];
    newExamples[index][field] = value;
    setEditingPersona({ ...editingPersona, examples: newExamples });
  };

  const removeExample = (index: number) => {
    if (!editingPersona) return;
    setEditingPersona({
      ...editingPersona,
      examples: editingPersona.examples.filter((_, i) => i !== index)
    });
  };

  const handleTest = async () => {
    if (!testSource || !editingPersona) return;
    setIsTesting(true);
    
    try {
      const result = await translateText(
        testSource,
        'Auto',
        'English',
        'General',
        [],
        'Standard',
        editingPersona.baseInstruction,
        editingPersona,
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

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
      <div className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200">
              <BrainCircuit size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Neural Persona Architect</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Few-Shot Learning • Style Synthesis • Linguistic Identity</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X size={24} className="text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          {editingPersona ? (
            <div className="grid grid-cols-12 gap-10 animate-fadeIn">
              {/* Left: Configuration */}
              <div className="col-span-12 lg:col-span-7 space-y-10">
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
                        value={editingPersona.name}
                        onChange={(e) => setEditingPersona({...editingPersona, name: e.target.value})}
                        placeholder="e.g., Cyberpunk Noir"
                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold text-slate-900 focus:border-indigo-500 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Core Description</label>
                      <input 
                        type="text" 
                        value={editingPersona.description}
                        onChange={(e) => setEditingPersona({...editingPersona, description: e.target.value})}
                        placeholder="e.g., Gritty, futuristic, tech-heavy"
                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold text-slate-900 focus:border-indigo-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Base Linguistic Directives</label>
                    <textarea 
                      value={editingPersona.baseInstruction}
                      onChange={(e) => setEditingPersona({...editingPersona, baseInstruction: e.target.value})}
                      placeholder="Describe how this persona speaks. Use specific adjectives and rules..."
                      className="w-full h-32 px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold text-slate-900 focus:border-indigo-500 outline-none transition-all resize-none"
                    />
                  </div>
                </section>

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
                    {editingPersona.examples.map((ex, idx) => (
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
                      </div>
                    ))}
                  </div>
                </section>

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={handleSave}
                    className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Save size={16} /> Commit Identity
                  </button>
                  <button 
                    onClick={() => { setEditingPersona(null); setIsAdding(false); }}
                    className="px-8 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              {/* Right: Sandbox */}
              <div className="col-span-12 lg:col-span-5 space-y-8">
                <div className="sticky top-0 space-y-8">
                  <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full -mr-16 -mt-16 blur-2xl" />
                    <div className="relative z-10 space-y-6">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Model Readiness</span>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${editingPersona.examples.length >= 3 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                          <span className="text-[9px] font-bold uppercase">{editingPersona.examples.length >= 3 ? 'Optimal' : 'Insufficient Data'}</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed uppercase tracking-widest font-bold">Few-shot patterns provide the AI with concrete examples of your desired style.</p>
                    </div>
                  </div>

                  <div className="p-8 bg-white border-2 border-slate-100 rounded-[2.5rem] shadow-sm space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Target size={16} className="text-indigo-500" />
                        <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Neural Sandbox</h3>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <textarea 
                        value={testSource}
                        onChange={(e) => setTestSource(e.target.value)}
                        placeholder="Type something to test the persona..."
                        className="w-full h-24 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold text-slate-700 outline-none focus:border-indigo-400 resize-none"
                      />
                      <button 
                        onClick={handleTest}
                        disabled={isTesting || !testSource}
                        className="w-full py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                      >
                        {isTesting ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                        Run Inference
                      </button>
                      {testResult && (
                        <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl animate-fadeIn">
                          <p className="text-[11px] font-bold text-slate-700 leading-relaxed italic">"{testResult}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-6">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Identity Profiles</span>
                <button 
                  onClick={handleStartAdd}
                  className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                >
                  <Plus size={14} /> New Persona
                </button>
              </div>

              {customPersonas.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-center gap-4 opacity-30">
                  <Zap size={48} />
                  <p className="text-sm font-bold max-w-xs uppercase tracking-widest">No custom identities detected. Create one to specialize your translation matrix.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customPersonas.map(p => (
                    <div key={p.id} className="p-6 bg-slate-50 border border-slate-200 rounded-[2rem] flex items-center justify-between group hover:border-indigo-300 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-white border border-slate-200 rounded-2xl text-indigo-600">
                          <FileText size={20} />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">{p.name}</h4>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{p.description || 'No description provided'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => setEditingPersona(p)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all"
                        >
                          <FileText size={18} />
                        </button>
                        <button 
                          onClick={() => onDelete(p.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PersonaEditor;
