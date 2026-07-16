
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ProjectWorkflow, WorkflowStage, ProfessionalField, GlossaryItem, TranslationQualityReport, Collaborator } from '../types';
import { generateId } from '../utils/id';
import SmartCompose from './SmartCompose';
import { db, doc, setDoc, onSnapshot, updateDoc, deleteDoc, collection, query, where, getDocs, handleFirestoreError, OperationType } from '../firebase';
import { 
  Layers, 
  ChevronRight, 
  CheckCircle2, 
  Circle, 
  Clock, 
  FileUp, 
  BookOpen, 
  Zap, 
  ShieldCheck, 
  Edit3, 
  Download, 
  Plus, 
  Trash2, 
  ArrowRight,
  AlertCircle,
  Loader2,
  Search,
  Users,
  Share2,
  UserPlus,
  ChevronLeft,
  MessageSquare,
  Palette
} from 'lucide-react';
import { translateText, auditTranslationQuality, extractGlossaryFromText } from '../services/geminiService';
import LanguageSelector from './LanguageSelector';
import { saveAs } from 'file-saver';

const STAGE_CONFIG = [
  { type: 'ingestion', label: 'Source Ingestion', icon: <FileUp size={18} />, description: 'Upload or paste source content' },
  { type: 'glossary', label: 'Neural Glossary', icon: <BookOpen size={18} />, description: 'Define or generate terminology' },
  { type: 'synthesis', label: 'Neural Synthesis', icon: <Zap size={18} />, description: 'Perform AI-driven translation' },
  { type: 'audit', label: 'Neural Audit', icon: <ShieldCheck size={18} />, description: 'Automated quality verification' },
  { type: 'refinement', label: 'Refinement', icon: <Edit3 size={18} />, description: 'Manual review and polishing' },
  { type: 'export', label: 'Final Export', icon: <Download size={18} />, description: 'Download localized assets' },
];

const WorkflowManager: React.FC<{ 
  field: ProfessionalField; 
  targetLang: string;
  user: { id: string; name: string; role: string; color: string } | null;
  onOpenCanvas?: () => void;
}> = ({ field: initialField, targetLang: initialTargetLang, user, onOpenCanvas }) => {
  const [projects, setProjects] = useState<ProjectWorkflow[]>([]);
  const [activeProject, setActiveProject] = useState<ProjectWorkflow | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const isRemoteUpdate = useRef(false);

  // Fetch workflows from Firestore
  useEffect(() => {
    if (!user) return;
    const fetchWorkflows = async () => {
      try {
        const q = query(collection(db, 'workflows'), where('ownerId', '==', user.id));
        const querySnapshot = await getDocs(q);
        const fetchedProjects: ProjectWorkflow[] = [];
        querySnapshot.forEach((doc) => {
          fetchedProjects.push(doc.data() as ProjectWorkflow);
        });
        setProjects(fetchedProjects.sort((a, b) => b.updatedAt - a.updatedAt));
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'workflows');
      }
    };
    fetchWorkflows();
  }, [user]);

  // Firestore Collaboration Setup
  useEffect(() => {
    if (activeProject?.isCollaborative && activeProject.id) {
      const unsubscribe = onSnapshot(doc(db, 'workflows', activeProject.id), (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data() as ProjectWorkflow;
          isRemoteUpdate.current = true;
          setActiveProject(data);
          setProjects(prev => prev.map(p => p.id === data.id ? data : p));
          setTimeout(() => { isRemoteUpdate.current = false; }, 50);
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `workflows/${activeProject.id}`);
      });

      return () => unsubscribe();
    }
  }, [activeProject?.id, activeProject?.isCollaborative]);

  // Sync local changes to Firestore
  useEffect(() => {
    if (activeProject && !isRemoteUpdate.current) {
      const saveToFirestore = async () => {
        try {
          await updateDoc(doc(db, 'workflows', activeProject.id), {
            ...activeProject,
            updatedAt: Date.now()
          });
        } catch (error) {
          console.error("Error updating workflow:", error);
        }
      };
      saveToFirestore();
    }
  }, [activeProject]);

  const createProject = async () => {
    if (!newProjectName.trim() || !user) return;
    
    const newProject: ProjectWorkflow = {
      id: generateId(),
      name: newProjectName,
      description: `Neural workflow for ${newProjectName}`,
      field: initialField,
      targetLang: initialTargetLang,
      stages: STAGE_CONFIG.map(s => ({
        id: generateId(),
        type: s.type as any,
        label: s.label,
        status: 'pending'
      })),
      currentStageIndex: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ownerId: user.id
    };

    try {
      await setDoc(doc(db, 'workflows', newProject.id), newProject);
      const updated = [newProject, ...projects];
      setProjects(updated);
      setActiveProject(newProject);
      setIsCreating(false);
      setNewProjectName('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `workflows/${newProject.id}`);
    }
  };

  const deleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, 'workflows', id));
      const updated = projects.filter(p => p.id !== id);
      setProjects(updated);
      if (activeProject?.id === id) setActiveProject(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `workflows/${id}`);
    }
  };

  const updateProject = (updated: ProjectWorkflow) => {
    const newProjects = projects.map(p => p.id === updated.id ? { ...updated, updatedAt: Date.now() } : p);
    setProjects(newProjects);
    setActiveProject(updated);
  };

  const enableCollaboration = () => {
    if (!activeProject) return;
    const updated: ProjectWorkflow = {
      ...activeProject,
      isCollaborative: true,
      roomId: activeProject.roomId || `room-${generateId()}`
    };
    updateProject(updated);
  };

  const advanceStage = () => {
    if (!activeProject) return;
    const nextIndex = activeProject.currentStageIndex + 1;
    if (nextIndex >= activeProject.stages.length) return;

    const updatedStages = [...activeProject.stages];
    updatedStages[activeProject.currentStageIndex].status = 'completed';
    updatedStages[nextIndex].status = 'active';

    updateProject({
      ...activeProject,
      currentStageIndex: nextIndex,
      stages: updatedStages
    });
  };

  const renderStageContent = () => {
    if (!activeProject) return null;
    const currentStage = activeProject.stages[activeProject.currentStageIndex];
    const assignedUser = collaborators.find(c => c.id === currentStage.assignedTo);

    return (
      <div className="flex flex-col gap-6">
        {activeProject.isCollaborative && (
          <div className="bg-white border border-slate-100 rounded-[2rem] p-4 flex items-center justify-between shadow-sm animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <UserPlus size={16} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Stage Assignment</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase">Assign this task to a neural node</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select 
                value={currentStage.assignedTo || ''}
                onChange={(e) => {
                  const updatedStages = [...activeProject.stages];
                  updatedStages[activeProject.currentStageIndex].assignedTo = e.target.value;
                  updateProject({ ...activeProject, stages: updatedStages });
                }}
                className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest outline-none focus:border-indigo-300 transition-all"
              >
                <option value="">Unassigned</option>
                {collaborators.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.role})</option>
                ))}
              </select>
              {assignedUser && (
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-sm border-2 border-white"
                  style={{ backgroundColor: assignedUser.color }}
                  title={assignedUser.name}
                >
                  {assignedUser.name.charAt(0)}
                </div>
              )}
            </div>
          </div>
        )}

        {(() => {
          switch (currentStage) {
            case currentStage.type === 'ingestion' ? currentStage : null: // This is just to satisfy the switch structure if I were to use it, but I'll use a cleaner way
              break;
          }
          
          switch (currentStage.type) {
            case 'ingestion':
              return <IngestionStage project={activeProject} onUpdate={updateProject} onNext={advanceStage} />;
            case 'glossary':
              return <GlossaryStage project={activeProject} onUpdate={updateProject} onNext={advanceStage} />;
            case 'synthesis':
              return <SynthesisStage project={activeProject} onUpdate={updateProject} onNext={advanceStage} />;
            case 'audit':
              return <AuditStage project={activeProject} onUpdate={updateProject} onNext={advanceStage} />;
            case 'refinement':
              return <RefinementStage project={activeProject} onUpdate={updateProject} onNext={advanceStage} />;
            case 'export':
              return <ExportStage project={activeProject} onUpdate={updateProject} />;
            default:
              return null;
          }
        })()}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-8 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg">
              <Layers size={24} />
            </div>
            Project Workflows
          </h2>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Multi-Stage Neural Localization Pipelines</p>
        </div>
        
        {!activeProject && !isCreating && (
          <button 
            onClick={() => setIsCreating(true)}
            className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-indigo-900/20 hover:bg-indigo-700 transition-all active:scale-95 flex items-center gap-2"
          >
            <Plus size={16} /> New Workflow
          </button>
        )}
      </div>

      {!activeProject ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isCreating && (
            <div className="bg-white border-2 border-indigo-200 rounded-[2.5rem] p-8 shadow-xl animate-scaleIn flex flex-col gap-6">
              <div className="space-y-2">
                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Initialization</span>
                <input 
                  autoFocus
                  type="text" 
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Project Name..."
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-lg font-black text-slate-900 focus:border-indigo-500 outline-none transition-all"
                />
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={createProject}
                  className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all"
                >
                  Create Matrix
                </button>
                <button 
                  onClick={() => setIsCreating(false)}
                  className="px-6 py-4 bg-slate-100 text-slate-500 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {projects.map(p => (
            <div 
              key={p.id} 
              onClick={() => setActiveProject(p)}
              className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 shadow-sm hover:shadow-2xl hover:border-indigo-100 transition-all cursor-pointer group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => deleteProject(p.id, e)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors">
                  <Trash2 size={18} />
                </button>
              </div>
              
              <div className="flex flex-col gap-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 text-[8px] font-black uppercase rounded tracking-widest">{p.field}</span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{new Date(p.createdAt).toLocaleDateString()}</span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">{p.name}</h3>
                </div>

                <div className="flex items-center gap-4">
                   <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500 transition-all duration-500" 
                        style={{ width: `${(p.currentStageIndex / (p.stages.length - 1)) * 100}%` }} 
                      />
                   </div>
                   <span className="text-[10px] font-black text-indigo-600 uppercase">{Math.round((p.currentStageIndex / (p.stages.length - 1)) * 100)}%</span>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                   <div className="flex items-center gap-2">
                      <div className="p-2 bg-slate-100 rounded-lg text-slate-400">
                        {STAGE_CONFIG[p.currentStageIndex].icon}
                      </div>
                      <div className="flex flex-col">
                         <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Active Stage</span>
                         <span className="text-[10px] font-bold text-slate-700 uppercase">{p.stages[p.currentStageIndex].label}</span>
                      </div>
                   </div>
                   <ChevronRight className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {/* Workflow Header */}
          <div className="bg-white border-2 border-slate-100 rounded-[3rem] p-10 shadow-xl flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <button 
                onClick={() => setActiveProject(null)}
                className="p-4 bg-slate-100 text-slate-500 rounded-3xl hover:bg-slate-200 transition-all"
              >
                <ArrowRight className="rotate-180" size={24} />
              </button>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{activeProject.name}</h3>
                  <span className="px-3 py-1 bg-indigo-600 text-white text-[10px] font-black uppercase rounded-full tracking-widest">{activeProject.field}</span>
                </div>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{activeProject.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {activeProject.isCollaborative ? (
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {collaborators.map(c => (
                      <div 
                        key={c.id} 
                        className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-black text-white shadow-sm"
                        style={{ backgroundColor: c.color }}
                        title={`${c.name} (${c.role})`}
                      >
                        {c.name.charAt(0)}
                      </div>
                    ))}
                  </div>
                  <button 
                    onClick={() => {
                      const url = `${window.location.origin}?room=${activeProject.roomId}`;
                      navigator.clipboard.writeText(url);
                    }}
                    className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-100 transition-all"
                    title="Copy Invite Link"
                  >
                    <UserPlus size={18} />
                  </button>
                  {onOpenCanvas && (
                    <button 
                      onClick={onOpenCanvas}
                      className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-100 transition-all"
                      title="Open Shared Whiteboard"
                    >
                      <Palette size={18} />
                    </button>
                  )}
                </div>
              ) : (
                <button 
                  onClick={enableCollaboration}
                  className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2"
                >
                  <Share2 size={14} /> Enable Collaboration
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-[2rem] border border-slate-100">
              {activeProject.stages.map((stage, idx) => (
                <div key={stage.id} className="flex items-center">
                  <div 
                    className={`flex items-center gap-3 px-5 py-3 rounded-2xl transition-all ${
                      idx === activeProject.currentStageIndex 
                        ? 'bg-indigo-600 text-white shadow-lg' 
                        : stage.status === 'completed' 
                          ? 'text-emerald-500' 
                          : 'text-slate-400'
                    }`}
                  >
                    <div className="relative">
                      {stage.status === 'completed' ? <CheckCircle2 size={18} /> : idx === activeProject.currentStageIndex ? <Clock size={18} className="animate-pulse" /> : <Circle size={18} />}
                      <span className="absolute -top-1 -right-1 text-[8px] font-black">{idx + 1}</span>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest hidden xl:block">{stage.label}</span>
                  </div>
                  {idx < activeProject.stages.length - 1 && (
                    <div className="mx-2 text-slate-200">
                      <ChevronRight size={16} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Stage Content */}
          <div className="min-h-[500px]">
            {renderStageContent()}
          </div>
        </div>
      )}
    </div>
  );
};

// --- STAGE COMPONENTS ---

const IngestionStage: React.FC<{ project: ProjectWorkflow; onUpdate: (p: ProjectWorkflow) => void; onNext: () => void }> = ({ project, onUpdate, onNext }) => {
  const [text, setText] = useState(project.stages[0].data?.text || '');

  const handleSave = () => {
    const updatedStages = [...project.stages];
    updatedStages[0].data = { text };
    updatedStages[0].status = 'completed';
    onUpdate({ ...project, stages: updatedStages });
    onNext();
  };

  return (
    <div className="bg-white border-2 border-slate-100 rounded-[3rem] p-12 shadow-2xl flex flex-col gap-8 animate-fadeIn">
      <div className="flex flex-col gap-2">
        <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">Source Content Ingestion</h4>
        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Input the primary matrix for localization</p>
      </div>

      <textarea 
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste your source text here..."
        className="w-full h-[300px] bg-slate-50 border-2 border-slate-100 rounded-[2rem] p-8 text-slate-700 font-medium focus:border-indigo-500 outline-none transition-all resize-none custom-scrollbar"
      />

      <div className="flex justify-end">
        <button 
          onClick={handleSave}
          disabled={!text.trim()}
          className="px-10 py-4 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-indigo-900/20 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-30 flex items-center gap-3"
        >
          Commit to Matrix <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};

const GlossaryStage: React.FC<{ project: ProjectWorkflow; onUpdate: (p: ProjectWorkflow) => void; onNext: () => void }> = ({ project, onUpdate, onNext }) => {
  const [glossary, setGlossary] = useState<GlossaryItem[]>(project.stages[1].data?.glossary || []);
  const [isGenerating, setIsGenerating] = useState(false);
  const sourceText = project.stages[0].data?.text || '';

  const handleGenerate = async () => {
    if (!sourceText) return;
    setIsGenerating(true);
    try {
      const suggestions = await extractGlossaryFromText(sourceText, 'Source');
      const newTerms = suggestions.map(s => ({ term: s.term, definition: s.definition }));
      setGlossary([...glossary, ...newTerms]);
    } catch (e) {
      alert("Neural glossary extraction failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    const updatedStages = [...project.stages];
    updatedStages[1].data = { glossary };
    updatedStages[1].status = 'completed';
    onUpdate({ ...project, stages: updatedStages });
    onNext();
  };

  return (
    <div className="bg-white border-2 border-slate-100 rounded-[3rem] p-12 shadow-2xl flex flex-col gap-8 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">Neural Glossary Definition</h4>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Establish terminology consistency</p>
        </div>
        <button 
          onClick={handleGenerate}
          disabled={isGenerating || !sourceText}
          className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center gap-2"
        >
          {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          Extract Suggestions
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-4">
        {glossary.length === 0 ? (
          <div className="col-span-2 h-40 flex flex-col items-center justify-center text-slate-300 italic border-2 border-dashed border-slate-100 rounded-[2rem]">
            No terms defined in this workflow
          </div>
        ) : (
          glossary.map((item, idx) => (
            <div key={idx} className="p-6 bg-slate-50 border border-slate-100 rounded-2xl flex items-start justify-between group">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-black text-slate-900">{item.term}</span>
                <span className="text-xs font-bold text-slate-500">{item.definition}</span>
              </div>
              <button 
                onClick={() => setGlossary(glossary.filter((_, i) => i !== idx))}
                className="p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="flex justify-end gap-4">
        <button 
          onClick={() => onUpdate({ ...project, currentStageIndex: 0 })}
          className="px-8 py-4 bg-slate-100 text-slate-500 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
        >
          Back
        </button>
        <button 
          onClick={handleSave}
          className="px-10 py-4 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-indigo-900/20 hover:bg-indigo-700 transition-all active:scale-95 flex items-center gap-3"
        >
          Finalize Glossary <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};

const SynthesisStage: React.FC<{ project: ProjectWorkflow; onUpdate: (p: ProjectWorkflow) => void; onNext: () => void }> = ({ project, onUpdate, onNext }) => {
  const [isTranslating, setIsTranslating] = useState(false);
  const [result, setResult] = useState(project.stages[2].data?.result || '');
  const sourceText = project.stages[0].data?.text || '';
  const glossary = project.stages[1].data?.glossary || [];

  const handleTranslate = async () => {
    setIsTranslating(true);
    try {
      const translation = await translateText(
        sourceText,
        'Auto',
        project.targetLang,
        project.field,
        glossary,
        'Professional'
      );
      setResult(translation.text);
    } catch (e) {
      alert("Neural synthesis failed.");
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSave = () => {
    const updatedStages = [...project.stages];
    updatedStages[2].data = { result };
    updatedStages[2].status = 'completed';
    onUpdate({ ...project, stages: updatedStages });
    onNext();
  };

  return (
    <div className="bg-white border-2 border-slate-100 rounded-[3rem] p-12 shadow-2xl flex flex-col gap-8 animate-fadeIn">
      <div className="flex flex-col gap-2">
        <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">Neural Synthesis Cycle</h4>
        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">AI-driven translation with glossary enforcement</p>
      </div>

      {!result && !isTranslating ? (
        <div className="h-[300px] flex flex-col items-center justify-center gap-6 bg-slate-50 border-2 border-dashed border-slate-100 rounded-[2rem]">
          <Zap size={48} className="text-slate-200" />
          <button 
            onClick={handleTranslate}
            className="px-10 py-4 bg-indigo-600 text-white rounded-2xl text-[12px] font-black uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-all"
          >
            Initiate Synthesis
          </button>
        </div>
      ) : isTranslating ? (
        <div className="h-[300px] flex flex-col items-center justify-center gap-6 bg-slate-900 rounded-[2rem] text-white">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
            <Zap size={24} className="absolute inset-0 m-auto text-indigo-400 animate-pulse" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-[12px] font-black uppercase tracking-[0.5em] text-indigo-400">Processing Matrix</p>
            <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest italic">Applying {project.field} linguistic models...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-4">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Synthesized Output</span>
            <button onClick={() => setResult('')} className="text-[9px] font-black text-rose-500 uppercase hover:underline">Reset</button>
          </div>
          <div className="w-full h-[300px] bg-slate-900 border-2 border-slate-800 rounded-[2rem] p-8 text-emerald-400 font-mono text-sm overflow-y-auto custom-scrollbar leading-relaxed">
            {result}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-4">
        <button 
          onClick={() => onUpdate({ ...project, currentStageIndex: 1 })}
          className="px-8 py-4 bg-slate-100 text-slate-500 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
        >
          Back
        </button>
        <button 
          onClick={handleSave}
          disabled={!result}
          className="px-10 py-4 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-indigo-900/20 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-30 flex items-center gap-3"
        >
          Commit Synthesis <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};

const AuditStage: React.FC<{ project: ProjectWorkflow; onUpdate: (p: ProjectWorkflow) => void; onNext: () => void }> = ({ project, onUpdate, onNext }) => {
  const [isAuditing, setIsAuditing] = useState(false);
  const [report, setReport] = useState<TranslationQualityReport | null>(project.stages[3].data?.report || null);
  const sourceText = project.stages[0].data?.text || '';
  const translatedText = project.stages[2].data?.result || '';

  const handleAudit = async () => {
    setIsAuditing(true);
    try {
      const auditReport = await auditTranslationQuality(
        sourceText,
        translatedText,
        'Auto',
        project.targetLang,
        project.field
      );
      setReport(auditReport);
    } catch (e) {
      alert("Neural audit failed.");
    } finally {
      setIsAuditing(false);
    }
  };

  const handleSave = () => {
    const updatedStages = [...project.stages];
    updatedStages[3].data = { report };
    updatedStages[3].status = 'completed';
    onUpdate({ ...project, stages: updatedStages });
    onNext();
  };

  return (
    <div className="bg-white border-2 border-slate-100 rounded-[3rem] p-12 shadow-2xl flex flex-col gap-8 animate-fadeIn">
      <div className="flex flex-col gap-2">
        <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">Neural Quality Audit</h4>
        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Automated LQA using MQM standards</p>
      </div>

      {!report && !isAuditing ? (
        <div className="h-[300px] flex flex-col items-center justify-center gap-6 bg-slate-50 border-2 border-dashed border-slate-100 rounded-[2rem]">
          <ShieldCheck size={48} className="text-slate-200" />
          <button 
            onClick={handleAudit}
            className="px-10 py-4 bg-indigo-600 text-white rounded-2xl text-[12px] font-black uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-all"
          >
            Run Neural Audit
          </button>
        </div>
      ) : isAuditing ? (
        <div className="h-[300px] flex flex-col items-center justify-center gap-6 bg-emerald-900 rounded-[2rem] text-white">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
            <ShieldCheck size={24} className="absolute inset-0 m-auto text-emerald-400 animate-pulse" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-[12px] font-black uppercase tracking-[0.5em] text-emerald-400">Auditing Matrix</p>
            <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest italic">Scanning for linguistic anomalies...</p>
          </div>
        </div>
      ) : report && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 bg-slate-50 rounded-[2rem] p-8 flex flex-col items-center justify-center gap-4 text-center">
            <div className="relative">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-200" />
                <circle 
                  cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" 
                  strokeDasharray={364.4} 
                  strokeDashoffset={364.4 - (364.4 * report.overallScore) / 100} 
                  className="text-indigo-600 transition-all duration-1000" 
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-slate-900">{report.overallScore}</span>
                <span className="text-[8px] font-black text-slate-400 uppercase">MQM Score</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Certification</p>
              <p className="text-sm font-black text-indigo-600 uppercase">{report.certification}</p>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-4">
            {report.critiques.map((c, i) => (
              <div key={i} className="p-6 bg-white border border-slate-100 rounded-2xl flex flex-col gap-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{c.dimension}</span>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                    c.severity === 'Critical' ? 'bg-rose-100 text-rose-600' : 
                    c.severity === 'Major' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
                  }`}>
                    {c.severity}
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-800 italic">"{c.finding}"</p>
                <div className="flex items-start gap-2 p-3 bg-indigo-50 rounded-xl">
                  <AlertCircle size={14} className="text-indigo-500 mt-0.5" />
                  <p className="text-[11px] font-bold text-indigo-700">{c.improvement}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-4">
        <button 
          onClick={() => onUpdate({ ...project, currentStageIndex: 2 })}
          className="px-8 py-4 bg-slate-100 text-slate-500 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
        >
          Back
        </button>
        <button 
          onClick={handleSave}
          disabled={!report}
          className="px-10 py-4 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-indigo-900/20 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-30 flex items-center gap-3"
        >
          Acknowledge Audit <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};

const RefinementStage: React.FC<{ project: ProjectWorkflow; onUpdate: (p: ProjectWorkflow) => void; onNext: () => void }> = ({ project, onUpdate, onNext }) => {
  const [refinedText, setRefinedText] = useState(project.stages[4].data?.refinedText || project.stages[2].data?.result || '');

  const handleSave = () => {
    const updatedStages = [...project.stages];
    updatedStages[4].data = { refinedText };
    updatedStages[4].status = 'completed';
    onUpdate({ ...project, stages: updatedStages });
    onNext();
  };

  return (
    <div className="bg-white border-2 border-slate-100 rounded-[3rem] p-12 shadow-2xl flex flex-col gap-8 animate-fadeIn">
      <div className="flex flex-col gap-2">
        <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">Manual Refinement & Polishing</h4>
        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Human-in-the-loop final review</p>
      </div>

      <div className="h-[300px] bg-slate-50 border-2 border-slate-100 rounded-[2rem] overflow-hidden">
        <SmartCompose 
          value={refinedText}
          onChange={setRefinedText}
          targetLang={project.targetLang}
          field={project.field}
          glossary={project.stages[1].data?.glossary || []}
          memory={[]}
          placeholder="Refine the synthesis..."
          className="h-full w-full p-8 text-slate-700 font-medium leading-relaxed"
        />
      </div>

      <div className="flex justify-end gap-4">
        <button 
          onClick={() => onUpdate({ ...project, currentStageIndex: 3 })}
          className="px-8 py-4 bg-slate-100 text-slate-500 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
        >
          Back
        </button>
        <button 
          onClick={handleSave}
          className="px-10 py-4 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-indigo-900/20 hover:bg-indigo-700 transition-all active:scale-95 flex items-center gap-3"
        >
          Seal Refinement <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};

const ExportStage: React.FC<{ project: ProjectWorkflow; onUpdate: (p: ProjectWorkflow) => void }> = ({ project, onUpdate }) => {
  const finalResult = project.stages[4].data?.refinedText || project.stages[2].data?.result || '';

  const handleDownload = () => {
    const blob = new Blob([finalResult], { type: 'text/plain' });
    saveAs(blob, `${project.name}_localized_${project.targetLang}.txt`);
  };

  return (
    <div className="bg-white border-2 border-slate-100 rounded-[3rem] p-12 shadow-2xl flex flex-col items-center text-center gap-10 animate-fadeIn">
      <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-[2rem] flex items-center justify-center shadow-lg">
        <CheckCircle2 size={48} />
      </div>

      <div className="space-y-2">
        <h4 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Workflow Synchronized</h4>
        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest max-w-md mx-auto">
          The neural localization pipeline for "{project.name}" has been successfully completed and verified.
        </p>
      </div>

      <div className="w-full max-w-2xl p-8 bg-slate-50 border border-slate-100 rounded-[2rem] text-left">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Final Matrix Preview</span>
          <span className="text-[9px] font-bold text-emerald-600 uppercase">Verified Output</span>
        </div>
        <p className="text-sm font-bold text-slate-700 line-clamp-4 italic">"{finalResult}"</p>
      </div>

      <div className="flex gap-4">
        <button 
          onClick={handleDownload}
          className="px-10 py-4 bg-indigo-600 text-white rounded-2xl text-[12px] font-black uppercase tracking-widest shadow-xl shadow-indigo-900/20 hover:bg-indigo-700 transition-all active:scale-95 flex items-center gap-3"
        >
          <Download size={18} /> Download Localized Asset
        </button>
        <button 
          onClick={() => onUpdate({ ...project, currentStageIndex: 0, stages: project.stages.map(s => ({ ...s, status: 'pending' })) })}
          className="px-8 py-4 bg-slate-100 text-slate-500 rounded-2xl text-[12px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
        >
          Restart Pipeline
        </button>
      </div>
    </div>
  );
};

export default WorkflowManager;
