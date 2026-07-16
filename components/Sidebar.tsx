
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { generateId } from '../utils/id';
import NeuralInsights from './NeuralInsights';
import { UploadedFile, TranslationHistoryItem, SavedLookup, TranslationMemoryEntry, ProfessionalField, BatchJob, GlossaryItem, KnowledgeBase } from '../types';
import History from './History';
import ChatAssistant from './ChatAssistant';
import VaultSearch from './VaultSearch';
import ActivityFeed from './ActivityFeed';
import Tooltip from './Tooltip';
import FlagIcon from './FlagIcon';
import EditableText from './EditableText';
import LanguageSelector from './LanguageSelector';
import { initGoogleApi, authenticateDrive, listTransFiles, downloadFileData, DriveSyncFile } from '../services/googleDriveService';
import { translateWebsite, extractTextFromAsset, translateText, detectAndMaskPII, extractGlossaryFromPair, getApiKey } from '../services/geminiService';
import { processExcelTranslation } from '../services/spreadsheetService';
import { transcribeAudio } from '../services/transcriptionService';
import { Mic, Video, CircleStop, Zap, X, Settings2, Radio, Camera, Plus, FileText, Globe, Check, Table, Download, Languages, Sparkles, Shield, Play, Loader2, Book, Activity, Search } from 'lucide-react';

import UserPreferencesManager from './UserPreferencesManager';
import { useToast } from './ToastContext';

interface SidebarProps {
  history: TranslationHistoryItem[];
  onClear: () => void;
  onSaveHistory: (item: TranslationHistoryItem) => void;
  onUpdateHistoryItem?: (item: TranslationHistoryItem) => void;
  lookups: SavedLookup[];
  onRemoveLookup: (id: string) => void;
  onClearLookups: () => void;
  translationMemory: TranslationMemoryEntry[];
  onUpdateMemory: (memory: TranslationMemoryEntry[]) => void;
  activeTab?: 'vault' | 'cloud' | 'web' | 'chat' | 'insights' | 'history' | 'activity' | 'preferences';
  onTabChange?: (tab: 'vault' | 'cloud' | 'web' | 'chat' | 'insights' | 'history' | 'activity' | 'preferences') => void;
  vaultFiles: UploadedFile[];
  knowledgeBases?: KnowledgeBase[];
  onUpdateVault: (files: UploadedFile[]) => void;
  onRemoveVaultFile: (id: string) => Promise<void>;
  onProcessAsset: (id: string) => Promise<void>;
  onInjectAsset: (id: string) => void;
  onInjectText?: (text: string) => void;
  field?: ProfessionalField;
  targetLang: string;
  setTargetLang: (lang: string) => void;
  glossary: any[];
  onUpdateGlossary: (glossary: any[]) => void;
  onRunLQA?: (item: TranslationHistoryItem) => void;
  isLoggedIn?: boolean;
  onLogin?: () => void;
  onLogout?: () => void;
  onRestore?: (data: any) => void;
  user?: { id: string; name: string; role: string; color: string; email?: string } | null;
  onUpdatePreferences?: (prefs: any) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  history, 
  onClear, 
  lookups, 
  onRemoveLookup, 
  onClearLookups, 
  translationMemory, 
  onUpdateMemory,
  activeTab: controlledTab,
  onTabChange,
  vaultFiles,
  knowledgeBases = [],
  onUpdateVault,
  onRemoveVaultFile,
  onProcessAsset,
  onSaveHistory,
  onUpdateHistoryItem,
  onInjectAsset,
  onInjectText,
  field = 'General',
  targetLang,
  setTargetLang,
  glossary,
  onUpdateGlossary,
  onRunLQA,
  isLoggedIn,
  onLogin,
  onLogout,
  onRestore,
  user,
  onUpdatePreferences
}) => {
  const { showToast } = useToast();
  const [localTab, setLocalTab] = useState<'vault' | 'cloud' | 'web' | 'chat' | 'insights' | 'history' | 'activity' | 'preferences'>('vault');
  const [isDragging, setIsDragging] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [translatingExcelId, setTranslatingExcelId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Privacy Shield State
  const [isPrivacyShieldActive, setIsPrivacyShieldActive] = useState(false);

  // Batch State
  const [activeJob, setActiveJob] = useState<BatchJob | null>(null);

  // Live Recording States
  const [isAudioRecording, setIsAudioRecording] = useState(false);
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Web Sync State
  const [webUrl, setWebUrl] = useState('');
  const [isWebLoading, setIsWebLoading] = useState(false);
  const [isExtractingGlossary, setIsExtractingGlossary] = useState(false);

  // Google Drive State
  const [driveFiles, setDriveFiles] = useState<DriveSyncFile[]>([]);
  const [isDriveInited, setIsDriveInited] = useState(false);
  const [isDriveLoading, setIsDriveLoading] = useState(false);
  const [isDriveAuthenticated, setIsDriveAuthenticated] = useState(false);

  const activeTab = controlledTab || localTab;
  const setActiveTab = (tab: 'vault' | 'cloud' | 'web' | 'chat' | 'insights' | 'history' | 'activity' | 'preferences') => {
    if (onTabChange) onTabChange(tab);
    else setLocalTab(tab);
  };

  const selectedFileCount = useMemo(() => vaultFiles.filter(f => f.batchSelected).length, [vaultFiles]);

  const toggleFileSelection = (id: string) => {
    onUpdateVault(vaultFiles.map(f => f.id === id ? { ...f, batchSelected: !f.batchSelected } : f));
  };

  const startBatchProcess = async () => {
    const selectedFiles = vaultFiles.filter(f => f.batchSelected);
    if (selectedFiles.length === 0) return;

    const jobId = generateId();
    setActiveJob({
      id: jobId,
      fileIds: selectedFiles.map(f => f.id),
      status: 'processing',
      progress: 0,
      targetLang,
      startTime: Date.now()
    });

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        
        // Respect Tier 1 rate limits by adding a mandatory neural cooldown between cycles
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 800));
        }

        // 1. Process/OCR if needed
        if (!file.processed) {
            await onProcessAsset(file.id);
        }
        
        // Fetch updated file content from current state
        const currentFiles = vaultFiles; // Reference current state
        const updatedFile = currentFiles.find(f => f.id === file.id);
        let content = updatedFile?.content || file.content || "";

        // 2. Privacy Shield Pass
        if (isPrivacyShieldActive && content) {
            const shieldResult = await detectAndMaskPII(content);
            content = shieldResult.maskedText;
        }

        // 3. Translation Cycle
        if (content) {
            const result = await translateText(content, "Auto", targetLang, field as ProfessionalField);
            
            // Save to history
            onSaveHistory({
              id: generateId(),
              sourceText: content.slice(0, 1000), // Store first 1000 chars
              translatedText: result.text,
              sourceLang: "Auto",
              targetLang,
              field: field as ProfessionalField,
              persona: "Minimalist", // Default for batch
              timestamp: Date.now(),
              type: 'text'
            });

            // Update vault file with translation if applicable
            onUpdateVault(vaultFiles.map(f => f.id === file.id ? { ...f, content: content, processed: true } : f));
        }

        setActiveJob(prev => prev ? { ...prev, progress: Math.round(((i + 1) / selectedFiles.length) * 100) } : null);
      }
      setActiveJob(prev => prev ? { ...prev, status: 'completed' } : null);
      onUpdateVault(vaultFiles.map(f => ({ ...f, batchSelected: false })));
    } catch (err: any) {
      console.error("Batch Job Failed", err);
      showToast(err.message || "Batch process interrupted by neural latency.", "error");
      setActiveJob(prev => prev ? { ...prev, status: 'failed' } : null);
    }
  };

  const handleExtractGlossary = async () => {
    const selectedFiles = vaultFiles.filter(f => f.batchSelected);
    if (selectedFiles.length !== 2) return;

    setIsExtractingGlossary(true);
    try {
      // Ensure both files are processed
      for (const file of selectedFiles) {
        if (!file.processed) {
          await onProcessAsset(file.id);
        }
      }

      // Re-fetch content after processing
      const fileA = vaultFiles.find(f => f.id === selectedFiles[0].id);
      const fileB = vaultFiles.find(f => f.id === selectedFiles[1].id);

      if (!fileA?.content || !fileB?.content) {
        throw new Error("Neural synchronization failed: Content not available.");
      }

      const extractedTerms = await extractGlossaryFromPair(fileA.content, fileB.content, "Auto", targetLang);
      
      if (extractedTerms.length > 0) {
        const newGlossary = [...glossary];
        extractedTerms.forEach(term => {
          if (!newGlossary.find(g => g.term.toLowerCase() === term.term.toLowerCase())) {
            newGlossary.push(term);
          }
        });
        onUpdateGlossary(newGlossary);
        alert(`Successfully extracted ${extractedTerms.length} terms to Lexicon Repository.`);
        onUpdateVault(vaultFiles.map(f => ({ ...f, batchSelected: false })));
      } else {
        alert("No distinct terminology pairs identified in the provided packets.");
      }
    } catch (err: any) {
      console.error("Glossary extraction failed", err);
      showToast(err.message || "Neural extraction cycle failed.", "error");
    } finally {
      setIsExtractingGlossary(false);
    }
  };

  const toggleAudioRecord = async () => {
    if (isAudioRecording) {
      mediaRecorderRef.current?.stop();
      setIsAudioRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        audioChunksRef.current = [];
        recorder.onstop = async () => {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          stream.getTracks().forEach(t => t.stop());
          handleAudioTranscription(blob);
        };
        recorder.start();
        setIsAudioRecording(true);
      } catch (err) { console.error(err); }
    }
  };

  const handleAudioTranscription = async (blob: Blob) => {
    setIsIngesting(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const transcription = await transcribeAudio(base64, 'audio/webm', 'English');
        if (transcription && onInjectText) onInjectText(transcription);
      };
    } finally { setIsIngesting(false); }
  };

  const toggleVideoRecord = async () => {
    if (isVideoActive) {
      stopCamera();
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setIsVideoActive(true);
      } catch (err) { console.error(err); }
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setIsVideoActive(false);
  };

  const syncFrame = async () => {
    if (!videoRef.current) return;
    setIsIngesting(true);
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    const base64 = canvas.toDataURL('image/jpeg').split(',')[1];
    try {
      const text = await extractTextFromAsset(base64, 'image/jpeg');
      if (text && onInjectText) onInjectText(text);
      stopCamera();
    } finally { setIsIngesting(false); }
  };

  const handleDriveConnect = async () => {
    setIsDriveLoading(true);
    try {
      await initGoogleApi();
      await authenticateDrive();
      setIsDriveAuthenticated(true);
      const files = await listTransFiles('transai');
      setDriveFiles(files);
      setIsDriveInited(true);
    } catch (err) {
      console.error("Drive connection failed", err);
    } finally {
      setIsDriveLoading(false);
    }
  };

  const handleWebIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webUrl.trim() || isWebLoading) return;
    setIsWebLoading(true);
    try {
      const data = await translateWebsite(webUrl, targetLang);
      if (onInjectText) {
        onInjectText(data.content);
        setWebUrl('');
      }
    } catch (err) {
      console.error("Web ingest failed", err);
    } finally {
      setIsWebLoading(false);
    }
  };

  const handleFetchDriveFile = async (fileId: string) => {
    setIsDriveLoading(true);
    try {
      const data = await downloadFileData(fileId);
      if (typeof data === 'string' && onInjectText) {
        onInjectText(data);
      } else if (typeof data === 'object' && onInjectText) {
        onInjectText(JSON.stringify(data, null, 2));
      }
    } catch (err) {
      console.error("Fetch failed", err);
    } finally {
      setIsDriveLoading(false);
    }
  };

  const getFileTypeCategory = (fileName: string): UploadedFile['type'] => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['mp3', 'wav', 'm4a', 'ogg', 'aac'].includes(ext || '')) return 'AUDIO';
    if (['json'].includes(ext || '')) return 'GLOSSARY';
    if (['xlsx', 'xls', 'csv'].includes(ext || '')) return 'EXCEL';
    if (['pdf'].includes(ext || '')) return 'PDF';
    if (['jpg', 'jpeg', 'png', 'webp', 'svg', 'gif'].includes(ext || '')) return 'IMAGE';
    return 'DOC';
  };

  const addFiles = async (newFiles: File[]) => {
    const MAX_FILE_SIZE = 25 * 1024 * 1024; // Lower limit to prevent Cloud Run 32MB payload drops
    const validFiles = Array.from(newFiles).filter(f => {
      if (f.size > MAX_FILE_SIZE) {
        alert(`File ${f.name} exceeds the 25MB infrastructure limit.`);
        return false;
      }
      return true;
    });

    const newlyUploaded: any[] = [];

    for (const file of validFiles) {
      const formData = new FormData();
      formData.append('file', file);
      
      try {
        const res = await fetch('/api/vault/upload', {
          method: 'POST',
          body: formData
        });
        
        if (!res.ok) {
          let errorMsg = `Upload failed with status ${res.status}`;
          try {
            const errorData = await res.json();
            errorMsg = errorData.error || errorMsg;
          } catch (e) {}
          throw new Error(errorMsg);
        }

        const contentType = res.headers.get("content-type");
        const pathDebug = res.headers.get("X-TransAI-Path");
        const traceId = res.headers.get("X-TransAI-Trace-ID");
        const appState = res.headers.get("X-TransAI-App-State");
        
        console.log(`[UPLOAD-RESPONSE] Status: ${res.status} Trace: ${traceId} Path: ${pathDebug}`);

        let uploadedFile;
        if (contentType && contentType.includes("application/json")) {
          uploadedFile = await res.json();
        } else {
          const textResponse = await res.text();
          const preview = textResponse.substring(0, 100).replace(/</g, "&lt;").replace(/>/g, "&gt;");
          throw new Error(`Server returned HTML instead of JSON. Path: ${pathDebug || 'Unknown'}. Trace: ${traceId || 'None'}. State: ${appState || 'Unknown'}. Status: ${res.status}. Preview: ${preview}...`);
        }

        newlyUploaded.push(uploadedFile);
      } catch (err: any) {
        console.error("Upload failed", err);
        alert(`Upload failed for ${file.name}: ${err.message}`);
      }
    }

    if (newlyUploaded.length > 0) {
      onUpdateVault([...newlyUploaded, ...vaultFiles]);
    }
  };

  const handleWipeVault = async () => {
    try {
      const res = await fetch('/api/vault/wipe', { method: 'POST' });
      if (!res.ok) {
        throw new Error(`Failed to wipe vault: ${res.statusText}`);
      }
      onUpdateVault([]);
    } catch (err: any) {
      console.error("Failed to wipe vault", err);
      alert(`Failed to wipe vault. Please try again. ${err.message}`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) addFiles(Array.from(e.dataTransfer.files));
  };

  const handleProcessFile = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (processingId) return;
    
    setProcessingId(id);
    try {
      await onProcessAsset(id);
    } catch (err: any) {
      console.error("Asset sync failure:", err);
      alert(err.message || "Neural processing error.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleTranslateExcel = async (file: UploadedFile) => {
    setTranslatingExcelId(file.id);
    try {
      // Fetch from server
      const res = await fetch(`/api/vault/download/${encodeURIComponent(file.id)}`);
      if (!res.ok) {
        if (res.status === 404) {
          onRemoveVaultFile(file.id);
          throw new Error(`File no longer exists on the server. It has been removed from your vault.`);
        }
        throw new Error(`Failed to fetch file: ${res.statusText || res.status}`);
      }
      const blob = await res.blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.includes(',') ? result.split(',')[1] : result);
        };
        reader.readAsDataURL(blob);
      });

      await processExcelTranslation(base64, targetLang, field as ProfessionalField);
    } catch (err: any) {
      console.error("Excel translation failed", err);
      alert(err.message || "Excel translation failed");
    } finally {
      setTranslatingExcelId(null);
    }
  };

  const getIconForType = (type: UploadedFile['type']) => {
    switch (type) {
      case 'AUDIO': return <Mic size={16} />;
      case 'GLOSSARY': return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>;
      case 'EXCEL': return <Table size={16} />;
      case 'PDF': return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>;
      case 'IMAGE': return <Camera size={16} />;
      default: return <FileText size={16} />;
    }
  };

  const getBadgeStyle = (type: UploadedFile['type']) => {
    switch (type) {
      case 'AUDIO': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'GLOSSARY': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'EXCEL': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'PDF': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'IMAGE': return 'bg-violet-50 text-violet-700 border-violet-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  return (
    <aside className="w-full lg:w-[300px] shrink-0 h-full z-40 relative flex flex-col overflow-hidden transition-transform duration-500 pt-0 min-h-0">
      <div className="flex-1 flex flex-col overflow-hidden animate-fadeIn min-h-0">
        {activeTab === 'vault' && (
          <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pt-0 pb-6 flex flex-col gap-6 min-h-0">
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Neural Search</span>
                  <div className="flex items-center gap-2">
                    <Tooltip content={isPrivacyShieldActive ? "Deactivate Neural PII Masking" : "Activate Neural PII Masking"}>
                      <button 
                        onClick={() => setIsPrivacyShieldActive(!isPrivacyShieldActive)}
                        className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[8px] font-black uppercase transition-all ${isPrivacyShieldActive ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-slate-400 border-slate-200 hover:border-indigo-300'}`}
                      >
                        <Shield size={10} className={isPrivacyShieldActive ? 'animate-pulse' : ''} />
                        Guard
                      </button>
                    </Tooltip>
                  </div>
                </div>
                <VaultSearch vaultFiles={vaultFiles} onInjectText={onInjectText || (() => {})} />
              </div>

              <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`cursor-pointer w-full border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center gap-2 transition-all duration-300 bg-[#ffd200]/90 bg-grid-subtle-slate relative overflow-hidden group ${isDragging ? 'border-[#ff30fc] scale-[1.03] shadow-2xl ring-4 ring-[#ff30fc]/20 bg-white' : 'border-slate-900/10 hover:border-slate-900/30 shadow-md hover:scale-[1.01] active:scale-95'}`}
              >
                <div className={`w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg transition-transform duration-300 ${isDragging ? 'rotate-12 scale-110' : 'group-hover:rotate-6'}`}>
                  <Plus className={`transition-colors duration-300 ${isDragging ? 'text-indigo-700' : 'text-[#ff30fc]'}`} size={16} strokeWidth={3} />
                </div>
                <div className="text-center relative z-10 pointer-events-none w-full">
                  <p className={`text-[12px] font-black uppercase tracking-widest text-center transition-colors duration-300 ${isDragging ? 'text-[#ff30fc]' : 'text-slate-950'}`}>
                    <EditableText id="sidebar.vault_upload">{isDragging ? 'Drop to Sync' : 'Upload Assets'}</EditableText>
                  </p>
                  <p className={`text-[10px] font-bold mt-1 uppercase text-center transition-colors duration-300 ${isDragging ? 'text-slate-600' : 'text-slate-900/70'}`}>
                    <EditableText id="sidebar.vault_types">DOCS, IMAGES, PDF, AUDIO, EXCEL, PPT, DATA</EditableText>
                  </p>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" multiple accept=".pdf,.doc,.docx,.txt,.md,.mp3,.wav,.m4a,.json,.csv,.png,.jpg,.jpeg,.webp,.svg,.xlsx,.xls,.ppt,.pptx" />
              </div>
            </div>

            {/* Batch Processing Panel */}
            {selectedFileCount > 0 && (
              <div className="bg-slate-900 rounded-[2rem] p-5 shadow-2xl border border-slate-800 animate-fadeIn space-y-4">
                 <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                       <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Batch Matrix</span>
                       <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{selectedFileCount} targets identified</span>
                    </div>
                    {activeJob?.status === 'processing' ? (
                       <div className="flex items-center gap-2 px-3 py-1 bg-indigo-500/20 text-indigo-400 rounded-full text-[8px] font-black uppercase animate-pulse">
                         <Loader2 size={10} className="animate-spin" />
                         Processing
                       </div>
                    ) : (
                       <div className="flex flex-wrap gap-2">
                         {selectedFileCount === 2 && (
                           <Tooltip content="Automatically identify and extract key terminology from selected documents">
                             <button 
                              onClick={handleExtractGlossary}
                              disabled={isExtractingGlossary}
                              className={`flex-1 sm:flex-initial px-4 py-2 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg hover:bg-emerald-500 transition-all flex items-center justify-center gap-2 ${isExtractingGlossary ? 'opacity-50 animate-pulse' : ''}`}
                             >
                               {isExtractingGlossary ? <Loader2 size={10} className="animate-spin" /> : <Book size={10} />}
                               Extract Glossary
                             </button>
                           </Tooltip>
                         )}
                         <Tooltip content="Process all selected files in a single high-speed neural batch">
                           <button 
                            onClick={startBatchProcess}
                            className="flex-1 sm:flex-initial px-5 py-2 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-500 transition-all flex items-center justify-center gap-2"
                           >
                             <Play size={10} fill="currentColor" />
                             Run Batch
                           </button>
                         </Tooltip>
                       </div>
                    )}
                 </div>

                 {activeJob && (
                    <div className="space-y-2">
                       <div className="flex justify-between items-center px-1">
                          <span className="text-[8px] font-black text-slate-500 uppercase">Progress</span>
                          <span className="text-[8px] font-black text-white">{activeJob.progress}%</span>
                       </div>
                       <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${activeJob.progress}%` }} />
                       </div>
                       {activeJob.status === 'completed' && (
                          <div className="flex items-center gap-2 text-emerald-400 text-[8px] font-black uppercase animate-fadeIn mt-1 px-1">
                             <Check size={10} strokeWidth={4} />
                             Job Complete: Synthesis Archive Ready
                          </div>
                       )}
                    </div>
                 )}
              </div>
            )}

            <div>
              <div className="flex items-center justify-end mb-4">
                <div className="flex items-center gap-2">
                  {vaultFiles.length > 0 && (
                    <Tooltip content="Permanently delete all vault assets">
                      <button onClick={handleWipeVault} className="text-[10px] font-bold text-red-600 hover:text-red-800 transition-all hover:scale-105 active:scale-95 px-2 py-1 rounded-md hover:bg-red-50">Wipe</button>
                    </Tooltip>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2 mb-8">
                {vaultFiles.length === 0 ? (
                  <div className="py-6 text-center border-2 border-dashed border-slate-300 rounded-2xl bg-white/50">
                    <p className="text-[10px] font-bold text-slate-600 uppercase italic">No active assets</p>
                  </div>
                ) : vaultFiles.map((file) => (
                  <div 
                    key={file.id} 
                    onClick={() => toggleFileSelection(file.id)}
                    className={`p-2 bg-white border rounded-xl hover:border-indigo-400 transition-all group shadow-sm hover:shadow-md relative overflow-hidden cursor-pointer ${file.batchSelected ? 'ring-2 ring-indigo-500 border-indigo-500' : 'border-slate-200'}`}
                  >
                    <Tooltip content="Remove asset from vault">
                      <button 
                        onClick={(e) => { e.stopPropagation(); onRemoveVaultFile(file.id); }}
                        className="absolute top-1 right-1 p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all z-30"
                      >
                        <X size={12} />
                      </button>
                    </Tooltip>
                    {file.batchSelected && <div className="absolute top-1 right-1 w-3 h-3 bg-indigo-600 rounded-full flex items-center justify-center text-white"><Check size={8} strokeWidth={4} /></div>}
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${getBadgeStyle(file.type)} group-hover:scale-110`}>{getIconForType(file.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <p className="text-[11px] font-black text-slate-900 truncate group-hover:text-indigo-800 transition-colors pr-2">{file.name}</p>
                          {file.processed ? (
                             <span className="flex items-center gap-1 text-[6px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-1 py-0.5 rounded border border-emerald-100 animate-fadeIn">
                               <Check size={6} strokeWidth={4} />
                               Synced
                             </span>
                          ) : (
                             <span className={`text-[7px] font-black px-1 py-0.5 rounded border uppercase flex-shrink-0 ${getBadgeStyle(file.type)}`}>{file.type}</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-0.5 gap-2">
                           <p className="text-[9px] font-bold text-slate-700 uppercase">{file.size}</p>
                           <div className="flex gap-1">
                            {file.type === 'EXCEL' && (
                                <Tooltip content="Translate and download localized spreadsheet">
                                  <button 
                                      onClick={(e) => { e.stopPropagation(); handleTranslateExcel(file); }} 
                                      disabled={translatingExcelId === file.id}
                                      className={`px-2 py-1 rounded-lg text-[7px] font-black bg-emerald-600 text-white uppercase tracking-widest hover:bg-emerald-700 active:scale-95 transition-all shadow-md flex items-center gap-1 ${translatingExcelId === file.id ? 'opacity-50 animate-pulse' : ''}`}
                                  >
                                      {translatingExcelId === file.id ? `Syncing...` : <><Download size={7} /> Localize</>}
                                  </button>
                                </Tooltip>
                            )}
                            {file.processed ? (
                                <Tooltip content="Inject content into active editor">
                                  <button onClick={(e) => { e.stopPropagation(); onInjectAsset(file.id); }} className="px-2 py-1 rounded-lg text-[7px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-widest hover:bg-indigo-100 active:scale-95 transition-all">Inject</button>
                                </Tooltip>
                            ) : (
                                <Tooltip content="Synchronize and OCR asset content">
                                  <button 
                                    onClick={(e) => handleProcessFile(e, file.id)} 
                                    disabled={processingId === file.id} 
                                    className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all z-20 ${processingId === file.id ? 'bg-indigo-100 text-indigo-600 cursor-not-allowed' : 'bg-indigo-700 text-white hover:bg-indigo-800 shadow-lg active:scale-95'}`}
                                  >
                                    {processingId === file.id ? 'Syncing...' : 'Sync'}
                                  </button>
                                </Tooltip>
                            )}
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2 p-3 bg-[#b428f3] bg-grid-subtle-white rounded-2xl border border-white/20 shadow-xl overflow-hidden relative">
                <div className="flex items-center justify-center mb-1 px-1 relative">
                  <span className="text-[12px] font-black text-white/90 uppercase tracking-[0.2em] text-center w-full">Neural Capture</span>
                  {isIngesting && <div className="absolute right-1 flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /><span className="text-[7px] font-black text-emerald-100 uppercase hidden sm:inline-block">Ingesting...</span></div>}
                </div>

                {isVideoActive && (
                  <div className="w-full aspect-video bg-black rounded-xl overflow-hidden relative mb-1 animate-fadeIn border border-white/10">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover opacity-80" />
                    <div className="absolute inset-0 pointer-events-none border-2 border-white/20 border-dashed rounded-xl" />
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2">
                      <Tooltip content="Capture and sync current frame">
                        <button onClick={syncFrame} className="p-2 bg-white text-[#b428f3] rounded-lg shadow-lg hover:scale-105 active:scale-95 transition-all"><Zap size={12} /></button>
                      </Tooltip>
                      <Tooltip content="Close camera feed">
                        <button onClick={stopCamera} className="p-2 bg-black/40 backdrop-blur-md text-white rounded-lg hover:bg-black/60 transition-all"><X size={12} /></button>
                      </Tooltip>
                    </div>
                  </div>
                )}

                 <div className="flex gap-1.5 w-full justify-center">
                  <Tooltip content={isAudioRecording ? "Stop recording and transcribe" : "Start live audio transcription"} position="top" className="flex-1 w-full">
                    <button 
                      onClick={toggleAudioRecord}
                      className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${isAudioRecording ? 'bg-white text-[#b428f3] animate-pulse' : 'bg-white/10 text-white hover:bg-white/20'}`}
                    >
                      {isAudioRecording ? <CircleStop size={12} /> : <Mic size={12} />}
                      {isAudioRecording ? 'Stop Audio' : 'Live Audio'}
                    </button>
                  </Tooltip>
                  <Tooltip content={isVideoActive ? "Capture visual text" : "Start live video OCR"} position="top" className="flex-1 w-full">
                    <button 
                      onClick={toggleVideoRecord}
                      className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${isVideoActive ? 'bg-white text-[#b428f3] shadow-lg' : 'bg-white/10 text-white hover:bg-white/20'}`}
                    >
                      {isVideoActive ? <Zap size={12} className="animate-pulse" /> : <Video size={12} />}
                      {isVideoActive ? 'Capture' : 'Live Video'}
                    </button>
                  </Tooltip>
                </div>
              </div>

              {/* Firebase Auth Section */}
              <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-[2rem] flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
                      <Shield size={20} />
                    </div>
                    <div>
                      <h3 className="text-[11px] font-black text-indigo-900 uppercase tracking-widest">Sync</h3>
                      <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">{isLoggedIn ? 'Active' : 'Local Only'}</p>
                    </div>
                  </div>
                  {isLoggedIn ? (
                    <Tooltip content="Sign out of your neural account">
                      <button onClick={onLogout} className="px-4 py-2 bg-white text-indigo-600 border border-indigo-100 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all">Logout</button>
                    </Tooltip>
                  ) : (
                    <Tooltip content="Sign in to synchronize data across nodes">
                      <button onClick={onLogin} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-md">Login</button>
                    </Tooltip>
                  )}
                </div>
                {!isLoggedIn && (
                  <p className="text-[10px] font-bold text-indigo-600/70 uppercase leading-relaxed">Login to synchronize your glossary, dictionary, and memory across neural nodes.</p>
                )}
              </div>

              {/* Restore Section */}
               <div className="p-4 bg-amber-50 border border-amber-100 rounded-[2rem] flex flex-col">
                <Tooltip content="Restore data from a neural backup packet (.json)">
                  <button 
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = '.json';
                      input.onchange = (e: any) => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event: any) => {
                            try {
                              const data = JSON.parse(event.target.result);
                              onRestore?.(data);
                            } catch (err) {
                              alert("Invalid neural packet format.");
                            }
                          };
                          reader.readAsText(file);
                        }
                      };
                      input.click();
                    }}
                    className="w-full py-3 bg-white text-amber-600 border border-amber-100 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-amber-100 transition-all flex items-center justify-center gap-2"
                  >
                    <Download size={14} />
                    Restore
                  </button>
                </Tooltip>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'activity' && <div className="flex-1 flex flex-col overflow-hidden p-4 min-h-0"><ActivityFeed history={history} /></div>}
        {activeTab === 'cloud' && (
          <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-6 flex flex-col gap-6 min-h-0">
            <div className="flex flex-col gap-1">
              <h2 className="text-[12px] font-black text-slate-700 uppercase tracking-widest">Neural Cloud Link</h2>
              <div className="flex items-center gap-2 mt-1">
                 <div className={`w-2 h-2 rounded-full ${isDriveAuthenticated ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`} />
                 <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{isDriveAuthenticated ? 'Link Active' : 'Offline'}</span>
              </div>
            </div>
            {!isDriveAuthenticated ? (
              <div className="p-8 border border-slate-200 bg-white/50 rounded-[2.5rem] flex flex-col items-center justify-center gap-6 text-center">
                 <div className="w-16 h-16 bg-white border border-slate-100 rounded-3xl flex items-center justify-center text-indigo-600 shadow-md"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95C8.08 7.14 9.94 6 12 6c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11c1.56.1 2.78 1.41 2.78 2.96 0 1.65-1.35 3-3 3z"/></svg></div>
                 <p className="text-[13px] font-black text-slate-900 leading-snug">Sync with Google Drive to ingest cloud assets directly into the synthesis matrix.</p>
                 <button onClick={handleDriveConnect} disabled={isDriveLoading} className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50">{isDriveLoading ? <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4}/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg> : 'Initialize Sync'}</button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Remote Nodes</span><button onClick={handleDriveConnect} className="text-[9px] font-black text-indigo-600 uppercase hover:underline">Refresh</button></div>
                <div className="flex flex-col gap-3">
                  {driveFiles.length === 0 ? <div className="py-10 text-center border-2 border-dashed border-slate-200 rounded-[2rem] bg-white/50"><p className="text-[10px] font-bold text-slate-400 uppercase italic">No packets identified</p></div> : driveFiles.map((file) => (
                    <div key={file.id} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-amber-400 transition-all group">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center border border-amber-100 group-hover:scale-110 transition-transform"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18" /></svg></div>
                          <div className="flex-1 min-w-0"><p className="text-[12px] font-black text-slate-900 truncate tracking-tight">{file.name}</p><p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Modified: {new Date(file.modifiedTime).toLocaleDateString()}</p></div>
                       </div>
                       <button onClick={() => handleFetchDriveFile(file.id)} disabled={isDriveLoading} className="w-full mt-3 py-2 bg-amber-50 text-amber-700 border border-amber-100 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-amber-100 transition-all disabled:opacity-50">Sync to Editor</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-6 min-h-0">
            <NeuralInsights history={history} glossary={glossary} />
          </div>
        )}

        {activeTab === 'chat' && <div className="flex-1 flex flex-col overflow-hidden p-4 min-h-0"><ChatAssistant knowledgeBases={knowledgeBases} vaultFiles={vaultFiles} /></div>}

        {activeTab === 'history' && <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-6 min-h-0"><History history={history} onClear={onClear} translationMemory={translationMemory} onUpdateMemory={onUpdateMemory} onRunLQA={onRunLQA} onUpdateHistoryItem={onUpdateHistoryItem} /></div>}
        
        {activeTab === 'web' && (
          <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-6 flex flex-col gap-6 min-h-0">
            <div className="flex flex-col gap-1">
              <h2 className="text-[12px] font-black text-slate-700 uppercase tracking-widest">Neural Web Ingestion</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Crawl global domains for direct editor injection.</p>
            </div>
            <div className="p-8 border border-slate-200 bg-white/50 rounded-[2.5rem] flex flex-col gap-6">
              <form onSubmit={handleWebIngest} className="space-y-4">
                <div className="relative">
                  <input type="url" value={webUrl} onChange={(e) => setWebUrl(e.target.value)} placeholder="https://example.com" required className="w-full bg-slate-100 border border-slate-200 rounded-2xl px-5 py-3 text-[13px] font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-400"><Globe size={20} /></div>
                </div>
                <button type="submit" disabled={isWebLoading || !webUrl.trim()} className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50">{isWebLoading ? <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg> : 'Crawl & Ingest'}</button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'preferences' && (
          <div className="flex-1 overflow-hidden min-h-0">
            <UserPreferencesManager user={user || null} onUpdatePreferences={onUpdatePreferences || (() => {})} />
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
