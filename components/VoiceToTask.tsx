import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  StopCircle, 
  Loader2, 
  Play, 
  CheckCircle2, 
  Trash2, 
  Plus, 
  X, 
  Search, 
  Sparkles, 
  AlertCircle, 
  ArrowRight, 
  Edit3, 
  Check, 
  Clock, 
  Bookmark,
  ChevronDown,
  FileText,
  Activity
} from 'lucide-react';
import { TranslationTask, ProfessionalField } from '../types';
import { useToast } from './ToastContext';
import { getApiKey } from '../services/geminiService';

interface VoiceToTaskProps {
  tasks: TranslationTask[];
  onTasksChange: (tasks: TranslationTask[]) => void;
  activeMode: string;
  setActiveMode: (mode: any) => void;
  setTargetLang: (lang: string) => void;
  setField: (field: ProfessionalField) => void;
  setInjectedText: (text: string) => void;
  appTheme: string;
  isFocusMode: boolean;
}

// Map themes to Tailwind classes
const themeClasses: Record<string, { 
  primary: string; 
  bg: string; 
  border: string; 
  text: string;
  glow: string;
  hover: string;
}> = {
  indigo: { primary: 'bg-indigo-600', bg: 'bg-indigo-50/50 dark:bg-indigo-950/20', border: 'border-indigo-500/20', text: 'text-indigo-600 dark:text-indigo-400', glow: 'shadow-indigo-500/20', hover: 'hover:bg-indigo-500/10' },
  blue: { primary: 'bg-blue-600', bg: 'bg-blue-50/50 dark:bg-blue-950/20', border: 'border-blue-500/20', text: 'text-blue-600 dark:text-blue-400', glow: 'shadow-blue-500/20', hover: 'hover:bg-blue-500/10' },
  emerald: { primary: 'bg-emerald-600', bg: 'bg-emerald-50/50 dark:bg-emerald-950/20', border: 'border-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', glow: 'shadow-emerald-500/20', hover: 'hover:bg-emerald-500/10' },
  rose: { primary: 'bg-rose-600', bg: 'bg-rose-50/50 dark:bg-rose-950/20', border: 'border-rose-500/20', text: 'text-rose-600 dark:text-rose-400', glow: 'shadow-rose-500/20', hover: 'hover:bg-rose-500/10' },
  orange: { primary: 'bg-orange-600', bg: 'bg-orange-50/50 dark:bg-orange-950/20', border: 'border-orange-500/20', text: 'text-orange-600 dark:text-orange-400', glow: 'shadow-orange-500/20', hover: 'hover:bg-orange-500/10' },
  violet: { primary: 'bg-violet-600', bg: 'bg-violet-50/50 dark:bg-violet-950/20', border: 'border-violet-500/20', text: 'text-violet-600 dark:text-violet-400', glow: 'shadow-violet-500/20', hover: 'hover:bg-violet-500/10' },
  teal: { primary: 'bg-teal-600', bg: 'bg-teal-50/50 dark:bg-teal-950/20', border: 'border-teal-500/20', text: 'text-teal-600 dark:text-teal-400', glow: 'shadow-teal-500/20', hover: 'hover:bg-teal-500/10' },
  cyan: { primary: 'bg-cyan-600', bg: 'bg-cyan-50/50 dark:bg-cyan-950/20', border: 'border-cyan-500/20', text: 'text-cyan-600 dark:text-cyan-400', glow: 'shadow-cyan-500/20', hover: 'hover:bg-cyan-500/10' },
  lime: { primary: 'bg-lime-600', bg: 'bg-lime-50/50 dark:bg-lime-950/20', border: 'border-lime-500/20', text: 'text-lime-600 dark:text-lime-400', glow: 'shadow-lime-500/20', hover: 'hover:bg-lime-500/10' },
  amber: { primary: 'bg-amber-600', bg: 'bg-amber-50/50 dark:bg-amber-950/20', border: 'border-amber-500/20', text: 'text-amber-600 dark:text-amber-400', glow: 'shadow-amber-500/20', hover: 'hover:bg-amber-500/10' },
  fuchsia: { primary: 'bg-fuchsia-600', bg: 'bg-fuchsia-50/50 dark:bg-fuchsia-950/20', border: 'border-fuchsia-500/20', text: 'text-fuchsia-600 dark:text-fuchsia-400', glow: 'shadow-fuchsia-500/20', hover: 'hover:bg-fuchsia-500/10' },
  pink: { primary: 'bg-pink-600', bg: 'bg-pink-50/50 dark:bg-pink-950/20', border: 'border-pink-500/20', text: 'text-pink-600 dark:text-pink-400', glow: 'shadow-pink-500/20', hover: 'hover:bg-pink-500/10' },
};

export const VoiceToTask: React.FC<VoiceToTaskProps> = ({
  tasks,
  onTasksChange,
  activeMode,
  setActiveMode,
  setTargetLang,
  setField,
  setInjectedText,
  appTheme,
  isFocusMode,
}) => {
  const { showToast } = useToast();
  const theme = themeClasses[appTheme] || themeClasses.violet;

  // Drawer / UI States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTaskFilter, setActiveTaskFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  
  // Audio Recording Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);

  // Soundwave animation elements
  const [waveHeights, setWaveHeights] = useState<number[]>([15, 15, 15, 15, 15, 15, 15, 15]);

  // Voice command log / parsed results preview
  const [lastProcessedCommand, setLastProcessedCommand] = useState<{
    transcription: string;
    action: string;
    taskId?: string | null;
    createdTask?: TranslationTask;
  } | null>(null);

  // Update soundwave simulation when recording
  useEffect(() => {
    let animId: number;
    if (isRecording) {
      const updateWave = () => {
        setWaveHeights(prev => prev.map(() => Math.floor(Math.random() * 35) + 8));
        animId = requestAnimationFrame(updateWave);
      };
      updateWave();
    } else {
      setWaveHeights([15, 15, 15, 15, 15, 15, 15, 15]);
    }
    return () => cancelAnimationFrame(animId);
  }, [isRecording]);

  // Update elapsed timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingSeconds(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  // Start Audio Recording
  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleUploadAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      showToast('Recording started. Speak your translation command...', 'success');
    } catch (err: any) {
      console.error('Error opening microphone:', err);
      showToast('Microphone access denied or error occurred.', 'error');
    }
  };

  // Stop Audio Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  };

  // Upload and Parse with Gemini AI
  const handleUploadAudio = async (audioBlob: Blob) => {
    setIsAnalyzing(true);
    const formData = new FormData();
    formData.append('file', audioBlob, 'command.webm');

    try {
      const apiKey = getApiKey();
      const response = await fetch('/api/neural/voice-to-task', {
        method: 'POST',
        headers: {
          ...(apiKey ? { 'x-api-key': apiKey } : {}),
        },
        body: formData
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to analyze voice command');
      }

      const result = await response.json();
      console.log('Voice to Task Analyzed:', result);

      if (result.action === 'none' || !result.action) {
        showToast(`Could not understand command: "${result.rawTranscription || 'Unknown'}"`, 'info');
        return;
      }

      const transcription = result.rawTranscription || "Command received";
      const action = result.action;
      const details = result.taskDetails || {};

      if (action === 'create') {
        // Create new Translation Task
        const newTask: TranslationTask = {
          id: `task-${Date.now()}`,
          title: details.title || 'Spoken Translation Task',
          sourceLang: details.sourceLang || 'Auto',
          targetLang: details.targetLang || 'English',
          priority: (details.priority as any) || 'Medium',
          field: (details.field as any) || 'General',
          instructions: details.instructions || '',
          status: 'pending',
          createdAt: Date.now()
        };

        const updated = [newTask, ...tasks];
        onTasksChange(updated);
        setLastProcessedCommand({
          transcription,
          action: 'create',
          createdTask: newTask
        });

        showToast(`Successfully created task: "${newTask.title}" via voice!`, 'success');
        setIsDrawerOpen(true); // Show task list right away to give instant feedback!
      } else if (action === 'complete' || action === 'delete' || action === 'edit') {
        // Find existing task
        const searchRef = (result.taskId || '').toLowerCase();
        const matchedTask = tasks.find(t => 
          t.id === result.taskId || 
          t.title.toLowerCase().includes(searchRef) || 
          t.targetLang.toLowerCase().includes(searchRef)
        );

        if (matchedTask) {
          let updatedTasks = [...tasks];
          if (action === 'complete') {
            updatedTasks = tasks.map(t => t.id === matchedTask.id ? { ...t, status: 'completed' } : t);
            showToast(`Task marked as complete: "${matchedTask.title}"`, 'success');
          } else if (action === 'delete') {
            updatedTasks = tasks.filter(t => t.id !== matchedTask.id);
            showToast(`Task deleted: "${matchedTask.title}"`, 'success');
          } else if (action === 'edit') {
            updatedTasks = tasks.map(t => t.id === matchedTask.id ? { 
              ...t, 
              title: details.title || t.title,
              targetLang: details.targetLang || t.targetLang,
              sourceLang: details.sourceLang || t.sourceLang,
              priority: details.priority || t.priority,
              field: details.field || t.field,
              instructions: details.instructions || t.instructions
            } : t);
            showToast(`Task updated: "${matchedTask.title}"`, 'success');
          }
          onTasksChange(updatedTasks);
          setLastProcessedCommand({
            transcription,
            action,
            taskId: matchedTask.id
          });
          setIsDrawerOpen(true);
        } else {
          showToast(`Command recognized (${action}), but no matching task was found for "${result.taskId || 'reference'}"`, 'info');
        }
      }
    } catch (err: any) {
      console.error('Error parsing voice command:', err);
      showToast(err.message || 'Error processing voice task. Check Gemini key.', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Launch a task (pre-populates current translator workspace!)
  const launchTask = (task: TranslationTask) => {
    setTargetLang(task.targetLang);
    setField(task.field);
    setInjectedText(task.instructions ? `[Task Instructions: ${task.instructions}]\n` : '');
    
    // Update task status to in_progress
    const updated = tasks.map(t => t.id === task.id ? { ...t, status: 'in_progress' as const } : t);
    onTasksChange(updated);

    // Switch to primary text translator mode
    setActiveMode('text');
    setIsDrawerOpen(false);
    showToast(`Translation environment loaded for: "${task.title}"`, 'success');
  };

  // Complete a task manually
  const toggleCompleteTask = (id: string) => {
    const updated = tasks.map(t => {
      if (t.id === id) {
        const nextStatus = t.status === 'completed' ? 'pending' : 'completed';
        return { ...t, status: nextStatus as any };
      }
      return t;
    });
    onTasksChange(updated);
    showToast('Task status updated.', 'success');
  };

  // Delete a task manually
  const deleteTask = (id: string) => {
    const updated = tasks.filter(t => t.id !== id);
    onTasksChange(updated);
    showToast('Task removed.', 'success');
  };

  // Manual Task Addition Form (in case of fallback/manual edit)
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualTargetLang, setManualTargetLang] = useState('English');
  const [manualField, setManualField] = useState<ProfessionalField>('General');
  const [manualPriority, setManualPriority] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');
  const [manualInstructions, setManualInstructions] = useState('');

  const handleCreateManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim()) return;

    const newTask: TranslationTask = {
      id: `task-${Date.now()}`,
      title: manualTitle,
      sourceLang: 'Auto',
      targetLang: manualTargetLang,
      priority: manualPriority,
      field: manualField,
      instructions: manualInstructions,
      status: 'pending',
      createdAt: Date.now()
    };

    onTasksChange([newTask, ...tasks]);
    setShowManualForm(false);
    setManualTitle('');
    setManualInstructions('');
    showToast('Manual task created successfully.', 'success');
  };

  // Filter tasks
  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.targetLang.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.instructions.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeTaskFilter === 'all' || t.status === activeTaskFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <>
      {/* 1. Micro-Trigger Button in Navigation Bar / Header */}
      <div className="flex items-center gap-1">
        <button
          id="header-voice-task-recorder-btn"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isAnalyzing}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all text-[10px] font-black uppercase tracking-wider select-none ${
            isRecording 
              ? 'bg-rose-500 border-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/30' 
              : 'bg-white/20 border-white/30 text-white hover:bg-white/30 hover:scale-105 active:scale-95'
          }`}
          title="Voice-to-Task Quick Command"
        >
          {isAnalyzing ? (
            <Loader2 size={11} className="animate-spin text-white" />
          ) : isRecording ? (
            <StopCircle size={11} className="text-white fill-white" />
          ) : (
            <Mic size={11} className="text-white" />
          )}
          <span>{isRecording ? `${recordingSeconds}s` : 'Voice Command'}</span>
        </button>

        {/* Floating Tasks Counter Button */}
        <button
          id="header-tasks-board-toggle-btn"
          onClick={() => setIsDrawerOpen(true)}
          className={`relative p-1.5 rounded-lg border text-white transition-all ${
            isDrawerOpen 
              ? 'bg-white text-indigo-900 border-white' 
              : 'bg-white/20 border-white/30 hover:bg-white/30 hover:scale-105 active:scale-95'
          }`}
          title="Open Tasks Board"
        >
          <Bookmark className="w-4 h-4" />
          {tasks.filter(t => t.status !== 'completed').length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[8px] font-extrabold text-white animate-bounce shadow-sm">
              {tasks.filter(t => t.status !== 'completed').length}
            </span>
          )}
        </button>
      </div>

      {/* 2. Recording & Analysis Floating Panel right on top of page */}
      {(isRecording || isAnalyzing) && (
        <div id="voice-recording-overlay-hud" className="fixed top-14 left-1/2 -translate-x-1/2 z-[200] w-full max-w-sm px-4 animate-slideDown">
          <div className="bg-slate-900/90 dark:bg-slate-950/95 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-4 shadow-2xl flex flex-col items-center gap-3">
            
            {/* Pulsating Micro status */}
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${isRecording ? 'bg-rose-500 animate-ping' : 'bg-indigo-400 animate-pulse'}`} />
              <span className="text-[10px] font-black uppercase text-slate-300 tracking-widest">
                {isRecording ? 'Capturing Neural Audio Command' : 'Synthesizing Task Command'}
              </span>
            </div>

            {/* Soundwave Simulation visualizer */}
            <div className="h-10 flex items-end justify-center gap-1 w-full max-w-[200px]">
              {waveHeights.map((h, i) => (
                <div 
                  key={i} 
                  className={`w-1 rounded-full transition-all duration-75 ${isRecording ? 'bg-rose-500' : 'bg-indigo-400'}`} 
                  style={{ height: `${h}px` }} 
                />
              ))}
            </div>

            {/* Visual description */}
            <p className="text-[11px] text-slate-400 font-medium text-center italic">
              {isRecording 
                ? '"Create task: Translate medical dossier from Spanish to English with high priority"' 
                : 'Deconstructing semantic command structures...'}
            </p>

            {/* Actions inside HUD */}
            <div className="flex items-center gap-3 mt-1">
              {isRecording ? (
                <button
                  onClick={stopRecording}
                  className="px-5 py-2 rounded-full bg-rose-600 text-white font-black text-[10px] uppercase tracking-wider hover:bg-rose-700 transition-colors flex items-center gap-1.5 shadow-lg shadow-rose-500/20"
                >
                  <StopCircle size={12} className="fill-white" /> Finish Command
                </button>
              ) : (
                <div className="flex items-center gap-2 text-indigo-400 text-[10px] font-bold uppercase">
                  <Loader2 size={12} className="animate-spin" /> Analyzing voice vectors
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Sliding Tasks Board Drawer (Right Side Drawer) */}
      {isDrawerOpen && (
        <div id="tasks-board-drawer-container" className="fixed inset-0 z-[180] flex justify-end">
          
          {/* Backdrop */}
          <div 
            id="tasks-board-backdrop"
            onClick={() => setIsDrawerOpen(false)}
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity duration-300"
          />

          {/* Slider content */}
          <div 
            id="tasks-board-slider-panel"
            className="relative w-full max-w-md h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col z-10 animate-slideLeft"
          >
            {/* Header */}
            <div className={`p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-white ${theme.primary}`}>
              <div className="flex items-center gap-2">
                <Bookmark className="w-5 h-5" />
                <div>
                  <h3 className="font-black text-sm uppercase tracking-wider">Translation Tasks Board</h3>
                  <p className="text-[10px] text-white/70 uppercase font-bold tracking-widest mt-0.5">Voice Command Automated Suite</p>
                </div>
              </div>
              <button 
                onClick={() => setIsDrawerOpen(false)}
                className="p-1 rounded-full hover:bg-white/15 transition-all text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Voice Log of Last Parsed Command */}
            {lastProcessedCommand && (
              <div className="bg-slate-50 dark:bg-slate-950 px-5 py-3 border-b border-slate-200/50 dark:border-slate-800/50">
                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-indigo-500 dark:text-indigo-400 tracking-widest mb-1">
                  <Sparkles size={11} className="animate-pulse" /> Spoken Action Succeeded
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 italic font-semibold leading-relaxed">
                  "{lastProcessedCommand.transcription}"
                </p>
                <div className="mt-1.5 flex gap-2 items-center text-[9px] text-slate-500">
                  <span className="font-bold uppercase bg-slate-200/60 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400">
                    {lastProcessedCommand.action}
                  </span>
                  <span>Neural Parser Engine</span>
                </div>
              </div>
            )}

            {/* Interactive Filters and Search */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search tasks, fields or targets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-indigo-500/20 rounded-xl text-xs font-semibold outline-none transition-all dark:text-white"
                />
              </div>

              {/* Status Pills */}
              <div className="flex gap-1 overflow-x-auto no-scrollbar">
                {(['all', 'pending', 'in_progress', 'completed'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveTaskFilter(filter)}
                    className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border transition-all ${
                      activeTaskFilter === filter 
                        ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-900' 
                        : 'bg-transparent border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    {filter === 'all' ? 'All Tasks' : filter.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Task list workspace scroll area */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar">
              
              {/* Manual Creation Toggle / Trigger */}
              {showManualForm ? (
                <form onSubmit={handleCreateManual} className="bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-indigo-500 dark:text-indigo-400">Add Manual Task</span>
                    <button type="button" onClick={() => setShowManualForm(false)} className="text-slate-400 hover:text-slate-600">
                      <X size={14} />
                    </button>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Task Objective</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Translate Financial Quarterly Report"
                      value={manualTitle}
                      onChange={(e) => setManualTitle(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Target Language</label>
                      <input
                        type="text"
                        placeholder="English"
                        value={manualTargetLang}
                        onChange={(e) => setManualTargetLang(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold dark:text-white"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Field</label>
                      <select
                        value={manualField}
                        onChange={(e) => setManualField(e.target.value as any)}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold dark:text-white"
                      >
                        <option value="General">General</option>
                        <option value="Medical">Medical</option>
                        <option value="Legal">Legal</option>
                        <option value="Technical">Technical</option>
                        <option value="Creative">Creative</option>
                        <option value="Marketing">Marketing</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Task Priority</label>
                    <div className="flex gap-1.5">
                      {(['Low', 'Medium', 'High', 'Critical'] as const).map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setManualPriority(p)}
                          className={`flex-1 py-1 rounded-lg text-[9px] font-black uppercase border transition-all ${
                            manualPriority === p 
                              ? 'bg-indigo-500 border-indigo-500 text-white' 
                              : 'bg-transparent border-slate-200 text-slate-500'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Direct Instructions / Snippet</label>
                    <textarea
                      placeholder="e.g. Keep tone formal and preserve markdown styling."
                      value={manualInstructions}
                      onChange={(e) => setManualInstructions(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold dark:text-white resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className={`w-full py-2 rounded-xl text-white font-black text-[10px] uppercase tracking-widest shadow-md ${theme.primary}`}
                  >
                    Create Task Card
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setShowManualForm(true)}
                  className="w-full py-2.5 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl flex items-center justify-center gap-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-950 transition-all text-xs font-bold"
                >
                  <Plus size={14} /> Add Task Manually
                </button>
              )}

              {/* Tasks mapping */}
              {filteredTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400 dark:text-slate-500 gap-2">
                  <Bookmark className="w-8 h-8 opacity-30" />
                  <p className="text-xs font-bold">No translation tasks found</p>
                  <p className="text-[10px] max-w-[200px]">Use the voice button above in the header to dictate translation tasks.</p>
                </div>
              ) : (
                filteredTasks.map((task) => {
                  const isCompleted = task.status === 'completed';
                  const isPending = task.status === 'pending';
                  const isProgress = task.status === 'in_progress';
                  
                  // Color codes for priority
                  const priorityColors = {
                    Low: 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400',
                    Medium: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
                    High: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400',
                    Critical: 'bg-red-500 text-white animate-pulse'
                  };

                  return (
                    <div 
                      key={task.id}
                      id={`task-card-${task.id}`}
                      className={`border rounded-2xl p-4 flex flex-col gap-3 transition-all ${
                        isCompleted 
                          ? 'bg-slate-50/50 border-slate-200/50 opacity-60 dark:bg-slate-950/20 dark:border-slate-800/40' 
                          : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800 shadow-sm hover:border-indigo-500/30'
                      }`}
                    >
                      {/* Top Header Row */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <button 
                            onClick={() => toggleCompleteTask(task.id)}
                            className={`p-0.5 rounded-full border transition-all ${
                              isCompleted 
                                ? 'bg-indigo-500 border-indigo-500 text-white' 
                                : 'border-slate-300 dark:border-slate-700 text-transparent hover:border-indigo-500'
                            }`}
                            title={isCompleted ? "Mark Unfinished" : "Mark Completed"}
                          >
                            <Check size={10} className="stroke-[3.5px]" />
                          </button>
                          
                          <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${priorityColors[task.priority]}`}>
                            {task.priority}
                          </span>
                        </div>

                        <button 
                          onClick={() => deleteTask(task.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all"
                          title="Delete Task"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>

                      {/* Main Title / languages */}
                      <div>
                        <h4 className={`text-xs font-black dark:text-white ${isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : ''}`}>
                          {task.title}
                        </h4>
                        
                        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                          <span>{task.sourceLang}</span>
                          <ArrowRight size={10} />
                          <span className="text-indigo-600 dark:text-indigo-400">{task.targetLang}</span>
                          <span className="h-1 w-1 bg-slate-300 rounded-full" />
                          <span>{task.field}</span>
                        </div>
                      </div>

                      {/* Instructions panel */}
                      {task.instructions && (
                        <div className="bg-slate-50 dark:bg-slate-950 rounded-xl p-2 text-[11px] text-slate-600 dark:text-slate-400 font-medium leading-relaxed italic border border-slate-100 dark:border-slate-800/40">
                          {task.instructions}
                        </div>
                      )}

                      {/* Launch/Complete Actions */}
                      {!isCompleted && (
                        <div className="flex items-center gap-2 justify-end pt-1 border-t border-slate-100 dark:border-slate-800/50 mt-1">
                          <button
                            onClick={() => launchTask(task)}
                            className={`px-3 py-1.5 rounded-lg text-white font-black text-[9px] uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 ${theme.primary}`}
                          >
                            <Play size={9} className="fill-white" />
                            {isProgress ? 'Resume translation' : 'Execute Workspace'}
                          </button>
                        </div>
                      )}

                      {/* Timestamp Footer */}
                      <div className="flex items-center gap-1 text-[8px] text-slate-400 font-bold uppercase tracking-wider justify-between">
                        <div className="flex items-center gap-1">
                          <Clock size={8} />
                          <span>{new Date(task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className={`h-1.5 w-1.5 rounded-full ${isProgress ? 'bg-indigo-500 animate-pulse' : isCompleted ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-700'}`} />
                          <span>{isProgress ? 'Active' : isCompleted ? 'Completed' : 'Queued'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-b-3xl">
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-black uppercase tracking-wider">
                <span>Total Tasks: {tasks.length}</span>
                <span>Active: {tasks.filter(t => t.status !== 'completed').length}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default VoiceToTask;
