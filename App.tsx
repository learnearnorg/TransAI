
import React, { useState, useEffect, useRef } from 'react';
import TextTranslator from './components/TextTranslator';
import ImageTranslator from './components/ImageTranslator';
import CollaborationHub from './components/CollaborationHub';
import LiveVoiceTranslator from './components/LiveVoiceTranslator';
import OfflineManager from './components/OfflineManager';
import WebsiteTranslator from './components/WebsiteTranslator';
import CodeTranslator from './components/CodeTranslator';
import CompareDocuments from './components/CompareDocuments';
import BroadcastTranslator from './components/BroadcastTranslator';
import InPaintingTranslator from './components/InPaintingTranslator';
import LQADashboard from './components/LQADashboard';
import DubbingStudio from './components/DubbingStudio';
import SubtitleOverlay from './components/SubtitleOverlay';
import VideoLocalizationSuite from './components/VideoLocalizationSuite';
import BatchProcessor from './components/BatchProcessor';
import LiveInterpreter from './components/LiveInterpreter';
import WorkflowManager from './components/WorkflowManager';
import Sidebar from './components/Sidebar';
import FieldMenuBar from './components/FieldMenuBar';
import GlossaryManager from './components/GlossaryManager';
import DictionaryManager from './components/DictionaryManager';
import MemoryManager from './components/MemoryManager';
import PhrasebookManager from './components/PhrasebookManager';
import SynonymsManager from './components/SynonymsManager';
import SelectionTranslator from './components/SelectionTranslator';
import PersonaEditor from './components/PersonaEditor';
import StyleGuideManager from './components/StyleGuideManager';
import KnowledgeBaseManager from './components/KnowledgeBaseManager';
import TerminologyExtractor from './components/TerminologyExtractor';
import CulturalIntelligence from './components/CulturalIntelligence';
import DTPStudio from './components/DTPStudio';
import CollaborativeCanvas from './components/CollaborativeCanvas';
import ContinuousLocalization from './components/ContinuousLocalization';
import UISyncTranslator from './components/UISyncTranslator';
import AgenticWorkflowBuilder from './components/AgenticWorkflowBuilder';
import ARVRPreview from './components/ARVRPreview';
import TranscreationStudio from './components/TranscreationStudio';
import NeuralTypographyEngine from './components/NeuralTypographyEngine';
import TranslatorDojo from './components/TranslatorDojo';
import SentimentDashboard from './components/SentimentDashboard';
import LegalComplianceSandbox from './components/LegalComplianceSandbox';
import SignLanguageAvatar from './components/SignLanguageAvatar';
import PIIAnonymizer from './components/PIIAnonymizer';
import EnterpriseOperations from './components/EnterpriseOperations';
import NextGenAIStudio from './components/NextGenAIStudio';
import EcosystemIntegrations from './components/EcosystemIntegrations';
import AdminDashboard from './components/AdminDashboard';
import SecretVault from './components/SecretVault';
import DocumentTranslator from './components/DocumentTranslator';
import Tooltip from './components/Tooltip';
import CommandPalette from './components/CommandPalette';
import { UIEditor } from './components/UIEditor';
import BottomNavigation from './components/BottomNavigation';
import VoiceToTask from './components/VoiceToTask';
import { useToast } from './components/ToastContext';
import { get as getIDB, set as setIDB } from 'idb-keyval';
import { UITranslationProvider, useUITranslation } from './components/UITranslationContext';
import UserProfileModal from './components/UserProfileModal';
import ErrorBoundary from './components/ErrorBoundary';
import ProjectScopingPanel from './components/ProjectScopingPanel';
import { auth, db, googleProvider, signInWithPopup, onAuthStateChanged, doc, setDoc, deleteDoc, getDoc, collection, onSnapshot, query, where, User, handleFirestoreError, OperationType } from './firebase';
import { TranslationMode, TranslationHistoryItem, OfflinePack, ProfessionalField, LinguisticPersona, PersonaDefinition, SavedLookup, GlossaryItem, DictionaryEntry, TranslationMemoryEntry, UploadedFile, PhrasebookItem, Collaborator, StyleGuide, KnowledgeBase, ProjectScope, TranslationTask } from './types';
import { generateId } from './utils/id';
import LanguageSelector from './components/LanguageSelector';
import { uiLanguages } from './components/languages';

import mammoth from 'mammoth';
import { extractTextFromAsset, extractTextFromVaultFile, auditTranslationQuality, embedText, translatePowerhouse, extractSessionConsistencyMap, SessionConsistencyMap, analyzeProjectScope } from './services/geminiService';
import { chunkText } from './utils/semantic';
import { Activity, PenTool, Users, Languages, CreditCard, ChevronDown, ChevronUp, Copy, FileText, Globe, Download, Bookmark, Check, AlertTriangle, RefreshCw, X, Zap, Terminal, Mic, Palette, Send, Layers, ShieldCheck, Music, Type, BookOpen, Brain, Library, Sparkles, Loader2, Video, Database, Search, Layout, GitBranch, Cuboid, Swords, Heart, Scale, Accessibility, EyeOff, HandMetal, Shield, Cpu, Network, Book, Maximize, Minimize, Camera, Settings2, Image as ImageIcon, Fish } from 'lucide-react';
import EditableText from './components/EditableText';
import FlagIcon from './components/FlagIcon';

const menuStyles: Record<string, string> = {
  indigo: 'bg-gradient-to-r from-indigo-600/90 to-violet-600/90 backdrop-blur-xl border border-white/10 text-white shadow-lg shadow-indigo-500/20',
  blue: 'bg-gradient-to-r from-blue-600/90 to-cyan-600/90 backdrop-blur-xl border border-white/10 text-white shadow-lg shadow-blue-500/20',
  emerald: 'bg-gradient-to-r from-emerald-600/90 to-teal-600/90 backdrop-blur-xl border border-white/10 text-white shadow-lg shadow-emerald-500/20',
  rose: 'bg-gradient-to-r from-rose-600/90 to-pink-600/90 backdrop-blur-xl border border-white/10 text-white shadow-lg shadow-rose-500/20',
  orange: 'bg-gradient-to-r from-orange-600/90 to-amber-600/90 backdrop-blur-xl border border-white/10 text-white shadow-lg shadow-orange-500/20',
  violet: 'bg-gradient-to-r from-violet-600/90 to-fuchsia-600/90 backdrop-blur-xl border border-white/10 text-white shadow-lg shadow-violet-500/20',
  teal: 'bg-gradient-to-r from-teal-600/90 to-emerald-600/90 backdrop-blur-xl border border-white/10 text-white shadow-lg shadow-teal-500/20',
  cyan: 'bg-gradient-to-r from-cyan-600/90 to-blue-600/90 backdrop-blur-xl border border-white/10 text-white shadow-lg shadow-cyan-500/20',
  lime: 'bg-gradient-to-r from-lime-600/90 to-green-600/90 backdrop-blur-xl border border-white/10 text-white shadow-lg shadow-lime-500/20',
  amber: 'bg-gradient-to-r from-amber-600/90 to-orange-600/90 backdrop-blur-xl border border-white/10 text-white shadow-lg shadow-amber-500/20',
  dark: 'bg-gradient-to-r from-gray-900/90 to-black/90 backdrop-blur-xl border border-white/10 text-white shadow-lg shadow-black/20',
  fuchsia: 'bg-gradient-to-r from-fuchsia-600/90 to-pink-600/90 backdrop-blur-xl border border-white/10 text-white shadow-lg shadow-fuchsia-500/20',
  pink: 'bg-gradient-to-r from-pink-600/90 to-rose-600/90 backdrop-blur-xl border border-white/10 text-white shadow-lg shadow-pink-500/20',
  slate: 'bg-gradient-to-r from-slate-700/90 to-zinc-700/90 backdrop-blur-xl border border-white/10 text-white shadow-lg shadow-slate-500/20',
  sky: 'bg-gradient-to-r from-sky-600/90 to-blue-600/90 backdrop-blur-xl border border-white/10 text-white shadow-lg shadow-sky-500/20',
  green: 'bg-gradient-to-r from-green-600/90 to-emerald-600/90 backdrop-blur-xl border border-white/10 text-white shadow-lg shadow-green-500/20',
  yellow: 'bg-gradient-to-r from-yellow-500/90 to-orange-500/90 backdrop-blur-xl border border-white/10 text-white shadow-lg shadow-yellow-500/20',
  red: 'bg-gradient-to-r from-red-700/90 to-rose-700/90 backdrop-blur-xl border border-white/10 text-white shadow-lg shadow-red-500/20',
};

const ServiceHealthMatrix: React.FC<{ error: string | null; onClear: () => void }> = ({ error, onClear }) => {
  if (!error) return null;
  const isQuota = error.includes('QUOTA') || error.includes('429');
  const isDisruption = error.includes('Google API Key Disruption') || error.includes('unrestricted') || error.includes('disruption');
  
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-2rem)] max-w-lg animate-fadeIn">
      <div className={`p-6 rounded-[2.5rem] shadow-2xl border-2 flex flex-col gap-4 backdrop-blur-xl ${
        isDisruption 
          ? 'bg-slate-900/95 border-rose-500/40 text-rose-100' 
          : isQuota 
            ? 'bg-amber-500/90 border-amber-400 text-white' 
            : 'bg-rose-600/90 border-rose-500 text-white'
      }`}>
        <div className="flex items-start gap-4">
           <div className={`p-3 rounded-2xl ${isDisruption ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-white/20'}`}><AlertTriangle size={24} /></div>
           <div className="flex-1">
             <h4 className="text-[12px] font-black uppercase tracking-widest mb-1 text-white">
               {isDisruption ? "Google API Key Disruption" : "Neural Grid Alert"}
             </h4>
             {isDisruption ? (
               <div className="text-[11px] font-medium opacity-95 leading-relaxed flex flex-col gap-2">
                 <p className="font-bold text-rose-300">
                   You are using an unrestricted Gemini API Key. Google is temporarily disrupting access as a preview of restriction enforcement.
                 </p>
                 <div className="bg-black/40 p-4 rounded-xl border border-rose-950 text-[11px] space-y-2 text-rose-200">
                   <p className="font-bold uppercase text-rose-400">To restore functionality immediately:</p>
                   <ol className="list-decimal list-inside space-y-1">
                     <li>Open <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="underline text-sky-400 hover:text-sky-300 font-bold">Google Cloud Credentials</a> in your browser.</li>
                     <li>Select your active Gemini API Key from the list.</li>
                     <li>Under &quot;API restrictions&quot;, choose &quot;Restrict key&quot;.</li>
                     <li>Select &quot;Generative Language API&quot; from the dropdown.</li>
                     <li>Save changes and wait 5-10 minutes.</li>
                   </ol>
                 </div>
                 <p className="text-[9.5px] opacity-80 text-rose-300/80">
                   Alternatively, generate a new restricted key inside Google AI Studio.
                 </p>
               </div>
             ) : (
               <p className="text-[10px] font-bold opacity-90 leading-relaxed uppercase">{error}</p>
             )}
           </div>
           <button onClick={onClear} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/75 hover:text-white"><X size={20}/></button>
        </div>
        {!isDisruption && (
          <button onClick={() => window.location.reload()} className="w-full py-3 bg-white/20 hover:bg-white/30 rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
            <RefreshCw size={12} /> Resynchronize Matrix
          </button>
        )}
      </div>
    </div>
  );
};

const DEFAULT_PERSONA: LinguisticPersona = {
  id: 'default',
  name: 'Minimalist',
  description: 'Concise and direct translations',
  baseInstruction: 'Translate the text concisely and directly, avoiding unnecessary flourishes.',
  examples: []
};

const App: React.FC = () => {
  const [uiLang, setUiLang] = useState(() => localStorage.getItem('transai_ui_lang') || 'en');
  const [appTheme, setAppTheme] = useState(() => localStorage.getItem('transai_app_theme') || 'violet');

  useEffect(() => {
    try { localStorage.setItem('transai_ui_lang', uiLang); } catch (e) {}
  }, [uiLang]);

  useEffect(() => {
    try { localStorage.setItem('transai_app_theme', appTheme); } catch (e) {}
  }, [appTheme]);

  return (
    <ErrorBoundary>
      <UITranslationProvider activeLang={uiLang} appTheme={appTheme}>
        <AppContent uiLang={uiLang} setUiLang={setUiLang} appTheme={appTheme} setAppTheme={setAppTheme} />
      </UITranslationProvider>
    </ErrorBoundary>
  );
};

const AppContent: React.FC<{ uiLang: string; setUiLang: (l: string) => void; appTheme: string; setAppTheme: (theme: string) => void }> = ({ uiLang, setUiLang, appTheme, setAppTheme }) => {
  const { showToast } = useToast();
  const { isEditingUI, setIsEditingUI } = useUITranslation();
  const [activeMode, setActiveMode] = useState<TranslationMode>(() => (localStorage.getItem('transai_active_mode') as TranslationMode) || 'text');
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<TranslationHistoryItem | null>(null);
  const [field, setField] = useState<ProfessionalField>('General');
  const [persona, setPersona] = useState<LinguisticPersona>(DEFAULT_PERSONA);
  const [customStyleGuide, setCustomStyleGuide] = useState<string>('');
  const [targetLang, setTargetLang] = useState<string>(() => localStorage.getItem('transai_target_lang') || 'English');
  const [history, setHistory] = useState<TranslationHistoryItem[]>([]);
  const [offlinePacks, setOfflinePacks] = useState<OfflinePack[]>([]);
  const [savedLookups, setSavedLookups] = useState<SavedLookup[]>([]);
  const [glossary, setGlossary] = useState<GlossaryItem[]>([]);
  const [phrasebook, setPhrasebook] = useState<PhrasebookItem[]>([]);
  const [dictionary, setDictionary] = useState<DictionaryEntry[]>([]);
  const [translationMemory, setTranslationMemory] = useState<TranslationMemoryEntry[]>([]);
  const [vaultFiles, setVaultFiles] = useState<UploadedFile[]>([]);
  const [sourceText, setSourceText] = useState<string>('');
  const [injectedText, setInjectedText] = useState<string>('');
  const [uiLangName, setUiLangName] = useState('English');
  const [sidebarTab, setSidebarTab] = useState<'vault' | 'cloud' | 'web' | 'chat' | 'insights' | 'history' | 'activity' | 'preferences'>('vault');
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [showGlossary, setShowGlossary] = useState(false);
  const [showPhrasebook, setShowPhrasebook] = useState(false);
  const [showSynonyms, setShowSynonyms] = useState(false);

  const [showDictionary, setShowDictionary] = useState(false);
  const [showMemory, setShowMemory] = useState(false);
  const [showStyleGuides, setShowStyleGuides] = useState(false);
  const [isSecretVaultOpen, setIsSecretVaultOpen] = useState(false);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [styleGuides, setStyleGuides] = useState<StyleGuide[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [user, setUser] = useState<{ id: string; name: string; role: string; color: string; email?: string } | null>(null);
  const [userPreferences, setUserPreferences] = useState<any>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [sessionConsistencyMap, setSessionConsistencyMap] = useState<SessionConsistencyMap | null>(null);
  const [isUpdatingConsistency, setIsUpdatingConsistency] = useState(false);
  const [projectScope, setProjectScope] = useState<ProjectScope | null>(null);
  const [isScoping, setIsScoping] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPersonaEditor, setShowPersonaEditor] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(320);
  const [isDraggingResizer, setIsDraggingResizer] = useState(false);
  const [customPersonas, setCustomPersonas] = useState<PersonaDefinition[]>([]);
  const [isRibbonExpanded, setIsRibbonExpanded] = useState(() => {
    return typeof window !== 'undefined' ? window.innerWidth >= 1024 : true;
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [hasNeuralKey, setHasNeuralKey] = useState<boolean>(true);

  // Translation tasks state
  const [tasks, setTasks] = useState<TranslationTask[]>(() => {
    try {
      const saved = localStorage.getItem('transai_translation_tasks');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Sync tasks to local storage
  useEffect(() => {
    localStorage.setItem('transai_translation_tasks', JSON.stringify(tasks));
  }, [tasks]);
  
  const themeRef = useRef<HTMLDivElement>(null);
  const resizerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if an API key is available (either platform-selected or in local secret vault)
    const checkKeyStatus = async () => {
      // 1. Check AI Studio Platform Key
      let systemKeySelected = false;
      if (typeof window !== 'undefined' && (window as any).aistudio?.hasSelectedApiKey) {
        try {
          systemKeySelected = await (window as any).aistudio.hasSelectedApiKey();
        } catch (e) {
          console.warn("Failed to check platform API key status", e);
        }
      }

      // 2. Check Local Secret Vault
      let localKeySet = false;
      const secretsRaw = localStorage.getItem('transai_secrets');
      if (secretsRaw) {
        try {
          const secrets = JSON.parse(secretsRaw);
          if (Array.isArray(secrets)) {
            localKeySet = secrets.some((s: any) => 
              (s.service?.toLowerCase() === 'gemini' || s.name?.toLowerCase().includes('gemini')) && 
              s.key && s.key.length > 10 && !s.key.includes('...')
            );
          }
        } catch (e) {}
      }

      // 3. Check Server Environment Key Status
      let serverKeySet = false;
      try {
        const response = await fetch('/api/auth/status');
        if (response.ok) {
          const data = await response.json();
          serverKeySet = !!data.hasKey;
        }
      } catch (e) {
        console.warn("Failed to check server-side API key status", e);
      }

      setHasNeuralKey(systemKeySelected || localKeySet || serverKeySet);
    };

    checkKeyStatus();
    // Check again on focus to catch if they selected a key in another tab/settings
    window.addEventListener('focus', checkKeyStatus);
    return () => window.removeEventListener('focus', checkKeyStatus);
  }, []);

  const handleOpenKeySelector = async () => {
    if (typeof window !== 'undefined' && (window as any).aistudio?.openSelectKey) {
      try {
        await (window as any).aistudio.openSelectKey();
      } catch (e) {
        showToast("Open Settings (top-right) to select an API key.", "info");
      }
    } else {
      setIsSecretVaultOpen(true);
    }
  };

  useEffect(() => {
    try { localStorage.setItem('transai_active_mode', activeMode); } catch(e) {}
  }, [activeMode]);

  useEffect(() => {
    try { localStorage.setItem('transai_target_lang', targetLang); } catch (e) {}
  }, [targetLang]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingResizer) return;
      const newWidth = Math.max(240, Math.min(e.clientX, window.innerWidth - 400));
      setLeftPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDraggingResizer(false);
      document.body.style.cursor = 'default';
    };

    if (isDraggingResizer) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
    };
  }, [isDraggingResizer]);

  const handleCommandAction = (action: string) => {
    switch (action) {
      case 'toggle-focus':
        setIsFocusMode(!isFocusMode);
        break;
      case 'open-glossary':
        setShowGlossary(true);
        break;
      case 'open-dictionary':
        setShowDictionary(true);
        break;
      case 'open-theme':
        setIsThemeOpen(true);
        break;
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to open command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
      }
      
      // Alt + 1-5 to switch modes
      if (e.altKey) {
        switch (e.key) {
          case '1': e.preventDefault(); setActiveMode('text'); break;
          case '2': e.preventDefault(); setActiveMode('document'); break;
          case '3': e.preventDefault(); setActiveMode('image'); break;
          case '4': e.preventDefault(); setActiveMode('batch'); break;
          case '5': e.preventDefault(); setActiveMode('live'); break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (!e.dataTransfer?.items) return;
      
      // Only switch mode if we are dragging files
      const hasFiles = Array.from(e.dataTransfer.items).some(item => item.kind === 'file');
      if (!hasFiles) return;

      const items = Array.from(e.dataTransfer.items);
      
      if (items.length > 1) {
        setActiveMode('batch');
        return;
      }

      const file = items[0];
      if (file.type.startsWith('image/')) {
        setActiveMode('image');
      } else if (
        file.type === 'application/pdf' || 
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.type === 'text/plain'
      ) {
        setActiveMode('document');
      }
    };

    window.addEventListener('dragover', handleDragOver);
    return () => window.removeEventListener('dragover', handleDragOver);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fUser) => {
      setFirebaseUser(fUser);
      if (fUser) {
        // Sync from Firestore
        const syncCollection = (collName: string, setter: any) => {
          return onSnapshot(collection(db, 'users', fUser.uid, collName), (snapshot) => {
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setter(items);
          }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${fUser.uid}/${collName}`));
        };

        const unsubGlossary = syncCollection('glossary', setGlossary);
        const unsubDictionary = syncCollection('dictionary', setDictionary);
        const unsubPhrasebook = syncCollection('phrasebook', setPhrasebook);
        const unsubMemory = syncCollection('memory', setTranslationMemory);
        const unsubKB = syncCollection('knowledgeBases', setKnowledgeBases);
        const unsubPersonas = syncCollection('personas', setCustomPersonas);
        const unsubStyleGuides = syncCollection('styleGuides', setStyleGuides);
        const unsubHistory = syncCollection('history', (items: any[]) => {
          // Sort history by timestamp descending
          const sorted = items.sort((a, b) => b.timestamp - a.timestamp);
          setHistory(sorted);
        });
        
        // Sync user profile
        const unsubUser = onSnapshot(doc(db, 'users', fUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUser({ id: fUser.uid, name: data.name, role: data.role, color: data.color, email: data.email });
          }
        });

        // Store unsubs globally so we can call them when auth state changes
        (window as any)._firebaseUnsubs = [
          unsubGlossary, unsubDictionary, unsubPhrasebook, unsubMemory, 
          unsubKB, unsubPersonas, unsubStyleGuides, unsubHistory, unsubUser
        ];
      } else {
        // Clear previous listeners if any
        if ((window as any)._firebaseUnsubs) {
          (window as any)._firebaseUnsubs.forEach((unsub: any) => unsub());
          (window as any)._firebaseUnsubs = [];
        }

        // Load from local storage if not logged in
        const load = (key: string, setter: any) => { const s = localStorage.getItem(key); if (s) { try { setter(JSON.parse(s)); } catch(e) {} } };
        load('transai_glossary', setGlossary);
        load('transai_phrasebook', setPhrasebook);
        load('transai_dictionary', setDictionary);
        load('transai_memory', setTranslationMemory);
        load('transai_knowledge_bases', setKnowledgeBases);
      }
    });

    // Load other local-only data
    const loadLocal = (key: string, setter: any) => { const s = localStorage.getItem(key); if (s) { try { setter(JSON.parse(s)); } catch(e) {} } };
    
    // Migrate to IndexedDB for large data
    const loadIDB = async (key: string, setter: any) => {
      try {
        const val = await getIDB(key);
        if (val) setter(val);
      } catch (e) {
        console.error(`Failed to load ${key} from IndexedDB`, e);
        showToast(`Failed to load ${key} from storage.`, "error");
      }
    };

    loadIDB('translation_history', setHistory).then(() => {
      // Fallback to localStorage if IDB is empty (migration)
      if (history.length === 0) loadLocal('translation_history', setHistory);
    });
    
    loadIDB('transai_glossary', setGlossary).then(() => {
      if (glossary.length === 0) loadLocal('transai_glossary', setGlossary);
    });

    loadLocal('semantic_archive', setSavedLookups);
    loadLocal('offline_packs', setOfflinePacks);
    loadLocal('transai_custom_personas', setCustomPersonas);
    loadLocal('transai_style_guides', setStyleGuides);

    // Load vault from server
    fetch('/api/vault')
      .then(async res => {
        const contentType = res.headers.get("content-type");
        const traceId = res.headers.get("X-TransAI-Trace-ID");
        const pathDebug = res.headers.get("X-TransAI-Path");
        
        if (res.ok && contentType && contentType.includes("application/json")) {
           return res.json();
        }
        const text = await res.text();
        throw new Error(`Failed to load vault. Status: ${res.status}. Trace: ${traceId || 'None'}. Path: ${pathDebug || 'Unknown'}. Type: ${contentType}. Preview: ${text.substring(0, 100).replace(/</g, '&lt;').replace(/>/g, '&gt;')}`);
      })
      .then(async files => {
        try {
          let metadata = await getIDB('transai_vault_metadata');
          if (!metadata) {
            const savedMetadata = localStorage.getItem('transai_vault_metadata');
            if (savedMetadata) metadata = JSON.parse(savedMetadata);
          }
          
          if (metadata) {
            const merged = files.map((f: any) => {
              const m = metadata.find((meta: any) => meta.id === f.id);
              return m ? { ...f, ...m } : f;
            });
            setVaultFiles(merged);
          } else {
            setVaultFiles(files);
          }
        } catch (e) {
          console.error("Failed to load vault metadata from IDB", e);
          showToast("Failed to load vault metadata.", "error");
          setVaultFiles(files);
        }
      })
      .catch(err => {
        console.error("Failed to load vault", err);
        if (err.message !== 'Failed to fetch' && !err.message.includes('fetch')) {
          showToast("Failed to load vault.", "error");
        }
      });

    const tl = localStorage.getItem('transai_target_lang'); if (tl) setTargetLang(tl);
    const theme = localStorage.getItem('transai_theme'); if (theme) setAppTheme(theme);

    const handleDisruptionAlert = (e: any) => {
      if (e.detail) {
        setGlobalError(e.detail);
      }
    };
    window.addEventListener('neural-disruption-alert' as any, handleDisruptionAlert);

    return () => {
      unsubscribe();
      window.removeEventListener('neural-disruption-alert' as any, handleDisruptionAlert);
      if ((window as any)._firebaseUnsubs) {
        (window as any)._firebaseUnsubs.forEach((unsub: any) => unsub());
        (window as any)._firebaseUnsubs = [];
      }
    };
  }, []);

  useEffect(() => {
    if (history.length < 2) return;
    
    const timer = setTimeout(async () => {
      setIsUpdatingConsistency(true);
      try {
        const map = await extractSessionConsistencyMap(history);
        setSessionConsistencyMap(map);
      } catch (err: any) {
        const msg = err.message || '';
        const isDisruption = msg.includes('Disruption') || msg.includes('unrestricted') || msg.includes('403') || msg.includes('PERMISSION_DENIED') || msg.includes('disruption');
        if (isDisruption) {
          setGlobalError(msg);
        } else if (!msg.includes('API Key')) {
          console.error("Consistency sync failed", err);
          showToast("Consistency sync failed.", "error");
        }
      } finally {
        setIsUpdatingConsistency(false);
      }
    }, 2000); // Debounce consistency analysis

    return () => clearTimeout(timer);
  }, [history]);

  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fUser = result.user;
      
      // Check if profile exists, if not create it
      const userDoc = await getDoc(doc(db, 'users', fUser.uid));
      if (!userDoc.exists()) {
        const newUser = {
          name: fUser.displayName || 'Neural Entity',
          email: fUser.email || '',
          role: fUser.email === 'pboldgerel@gmail.com' ? 'Admin' : 'Viewer',
          color: '#' + Math.floor(Math.random()*16777215).toString(16)
        };
        await setDoc(doc(db, 'users', fUser.uid), newUser);
        setUser({ id: fUser.uid, ...newUser });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'users/login');
    }
  };

  const handleLogout = () => {
    if ((window as any)._firebaseUnsubs) {
      (window as any)._firebaseUnsubs.forEach((unsub: any) => unsub());
      (window as any)._firebaseUnsubs = [];
    }
    auth.signOut();
    setUser(null);
    setFirebaseUser(null);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (themeRef.current && !themeRef.current.contains(event.target as Node)) {
        setIsThemeOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleUpdateTheme = (newTheme: string) => {
    setAppTheme(newTheme);
    try { localStorage.setItem('transai_theme', newTheme); } catch(e) {}
    setIsThemeOpen(false);
  };

  const saveHistory = (item: TranslationHistoryItem) => {
    setHistory(prev => {
      const exists = prev.find(h => h.id === item.id);
      let newHistory;
      let finalItem = { ...item };
      
      if (exists) {
        // Track versions if translatedText changed
        if (exists.translatedText !== item.translatedText) {
          const newVersion = {
            id: generateId(),
            text: exists.translatedText,
            timestamp: exists.timestamp,
            author: 'System/User'
          };
          finalItem.versions = [...(exists.versions || []), newVersion];
        } else {
          finalItem.versions = exists.versions;
        }
        newHistory = prev.map(h => h.id === item.id ? finalItem : h);
      } else {
        newHistory = [finalItem, ...prev].slice(0, 50);
      }
      
      persistentSet('translation_history', newHistory);
      
      if (firebaseUser) {
        // Sanitize item to remove undefined values deeply before saving to Firestore
        const sanitizedItem = JSON.parse(JSON.stringify(finalItem));
        
        setDoc(doc(db, 'users', firebaseUser.uid, 'history', item.id), sanitizedItem).catch(err => {
          handleFirestoreError(err, OperationType.WRITE, `users/${firebaseUser.uid}/history`);
        });
      }

      // Automated LQA (MQM Standard) - Background Audit
      if (!finalItem.qualityReport && !finalItem.powerhouseAudit && finalItem.sourceText && finalItem.translatedText) {
        auditTranslationQuality(
          finalItem.sourceText,
          finalItem.translatedText,
          finalItem.sourceLang,
          finalItem.targetLang,
          finalItem.field
        ).then(report => {
          setHistory(currentHistory => {
            const updated = currentHistory.map(h => h.id === finalItem.id ? { ...h, qualityReport: report } : h);
            persistentSet('translation_history', updated);
            return updated;
          });
        }).catch(err => {
          console.error("Neural LQA background audit failed", err);
          showToast("Neural LQA background audit failed.", "error");
        });
      }

      return newHistory;
    });
  };

  const persistentSet = (key: string, data: any) => {
    setIDB(key, data).catch(e => console.warn(`IDB set failed for ${key}`, e));
    try {
      const stringified = JSON.stringify(data);
      if (stringified.length < 50000) {
        localStorage.setItem(key, stringified);
      } else {
        localStorage.removeItem(key);
      }
    } catch (e) {}
  };

  const handleUpdateVault = (files: UploadedFile[]) => {
    setVaultFiles(files);
    // Persist metadata (chunks, processed status, content) to IDB
    const metadata = files.filter(f => f.processed).map(f => ({
      id: f.id,
      processed: f.processed,
      content: f.content,
      chunks: f.chunks
    }));
    persistentSet('transai_vault_metadata', metadata);
  };

  const handleSavePersona = (persona: PersonaDefinition) => {
    const exists = customPersonas.find(p => p.id === persona.id);
    let newPersonas;
    if (exists) {
      newPersonas = customPersonas.map(p => p.id === persona.id ? persona : p);
    } else {
      newPersonas = [...customPersonas, persona];
    }
    setCustomPersonas(newPersonas);
    persistentSet('transai_custom_personas', newPersonas);
    if (firebaseUser) {
      const sanitizedPersona = JSON.parse(JSON.stringify(persona));
      setDoc(doc(db, 'users', firebaseUser.uid, 'personas', persona.id), sanitizedPersona).catch(err => {
        handleFirestoreError(err, OperationType.WRITE, `users/${firebaseUser.uid}/personas`);
      });
    }
  };

  const handleDeletePersona = (id: string) => {
    const newPersonas = customPersonas.filter(p => p.id !== id);
    setCustomPersonas(newPersonas);
    persistentSet('transai_custom_personas', newPersonas);
    if (firebaseUser) {
      deleteDoc(doc(db, 'users', firebaseUser.uid, 'personas', id)).catch(err => {
        handleFirestoreError(err, OperationType.DELETE, `users/${firebaseUser.uid}/personas`);
      });
    }
  };

  const handleRemoveVaultFile = async (id: string) => {
    try {
      const res = await fetch(`/api/vault/delete/${encodeURIComponent(id)}`, { method: 'POST' });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to delete file. Status: ${res.status}. ${text.substring(0, 50)}`);
      }
      setVaultFiles(prev => prev.filter(f => f.id !== id));
    } catch (err: any) {
      console.error("Failed to delete file", err);
      showToast(err.message || "Failed to delete file.", "error");
    }
  };

  const handleUpdateGlossary = async (newGlossary: GlossaryItem[]) => {
    const oldGlossary = glossary;
    setGlossary(newGlossary);
    persistentSet('transai_glossary', newGlossary);
    if (firebaseUser) {
      try {
        const newIds = newGlossary.map(item => (item as any).id || item.term.replace(/\s+/g, '_').toLowerCase());
        const deletedItems = oldGlossary.filter(item => {
          const id = (item as any).id || item.term.replace(/\s+/g, '_').toLowerCase();
          return !newIds.includes(id);
        });

        for (const item of deletedItems) {
          const id = (item as any).id || item.term.replace(/\s+/g, '_').toLowerCase();
          await deleteDoc(doc(db, 'users', firebaseUser.uid, 'glossary', id));
        }

        for (const item of newGlossary) {
          const id = (item as any).id || item.term.replace(/\s+/g, '_').toLowerCase();
          const sanitizedItem = JSON.parse(JSON.stringify(item));
          await setDoc(doc(db, 'users', firebaseUser.uid, 'glossary', id), sanitizedItem);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${firebaseUser.uid}/glossary`);
      }
    }
  };

  const handleUpdatePhrasebook = async (newPhrasebook: PhrasebookItem[]) => {
    const oldPhrasebook = phrasebook;
    setPhrasebook(newPhrasebook);
    persistentSet('transai_phrasebook', newPhrasebook);
    if (firebaseUser) {
      try {
        const newIds = newPhrasebook.map(item => item.id);
        const deletedItems = oldPhrasebook.filter(item => !newIds.includes(item.id));

        for (const item of deletedItems) {
          await deleteDoc(doc(db, 'users', firebaseUser.uid, 'phrasebook', item.id));
        }

        for (const item of newPhrasebook) {
          const sanitizedItem = JSON.parse(JSON.stringify(item));
          await setDoc(doc(db, 'users', firebaseUser.uid, 'phrasebook', item.id), sanitizedItem);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${firebaseUser.uid}/phrasebook`);
      }
    }
  };

  const handleUpdateDictionary = async (newDict: DictionaryEntry[]) => {
    const oldDict = dictionary;
    setDictionary(newDict);
    persistentSet('transai_dictionary', newDict);
    if (firebaseUser) {
      try {
        const newIds = newDict.map(item => item.id);
        const deletedItems = oldDict.filter(item => !newIds.includes(item.id));

        for (const item of deletedItems) {
          await deleteDoc(doc(db, 'users', firebaseUser.uid, 'dictionary', item.id));
        }

        for (const item of newDict) {
          const sanitizedItem = JSON.parse(JSON.stringify(item));
          await setDoc(doc(db, 'users', firebaseUser.uid, 'dictionary', item.id), sanitizedItem);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${firebaseUser.uid}/dictionary`);
      }
    }
  };

  const handleUpdateMemory = async (newMemory: TranslationMemoryEntry[]) => {
    const oldMemory = translationMemory;
    setTranslationMemory(newMemory);
    persistentSet('transai_memory', newMemory);
    
    if (firebaseUser) {
      try {
        const newIds = newMemory.map(item => item.id);
        const deletedItems = oldMemory.filter(item => !newIds.includes(item.id));

        for (const item of deletedItems) {
          await deleteDoc(doc(db, 'users', firebaseUser.uid, 'memory', item.id));
        }

        for (const item of newMemory) {
          const sanitizedItem = JSON.parse(JSON.stringify(item));
          await setDoc(doc(db, 'users', firebaseUser.uid, 'memory', item.id), sanitizedItem);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${firebaseUser.uid}/memory`);
      }
    }

    // Check if any new entries need embeddings
    const needsEmbedding = newMemory.filter(m => !m.embedding);
    if (needsEmbedding.length > 0) {
      const updatedMemory = [...newMemory];
      for (const entry of needsEmbedding) {
        try {
          const embedding = await embedText(entry.sourceSegment);
          const index = updatedMemory.findIndex(m => m.id === entry.id);
          if (index !== -1) {
            updatedMemory[index] = { ...updatedMemory[index], embedding };
          }
        } catch (err) {
          console.error("Failed to generate embedding for memory entry:", err);
          showToast("Failed to generate embedding for memory entry.", "error");
        }
      }
      setTranslationMemory(updatedMemory);
      persistentSet('transai_memory', updatedMemory);
      if (firebaseUser) {
        for (const item of updatedMemory) {
          const sanitizedItem = JSON.parse(JSON.stringify(item));
          await setDoc(doc(db, 'users', firebaseUser.uid, 'memory', item.id), sanitizedItem);
        }
      }
    }
  };

  const handleUpdateKnowledgeBases = async (newKBs: KnowledgeBase[]) => {
    const oldKBs = knowledgeBases;
    setKnowledgeBases(newKBs);
    persistentSet('transai_knowledge_bases', newKBs);
    if (firebaseUser) {
      try {
        const newIds = newKBs.map(kb => kb.id);
        const deletedItems = oldKBs.filter(kb => !newIds.includes(kb.id));

        for (const kb of deletedItems) {
          await deleteDoc(doc(db, 'users', firebaseUser.uid, 'knowledgeBases', kb.id));
        }

        for (const kb of newKBs) {
          const sanitizedKb = JSON.parse(JSON.stringify(kb));
          await setDoc(doc(db, 'users', firebaseUser.uid, 'knowledgeBases', kb.id), sanitizedKb);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${firebaseUser.uid}/knowledgeBases`);
      }
    }
  };

  const handleRestoreFromBackup = (data: any) => {
    if (data.glossary) handleUpdateGlossary(data.glossary);
    if (data.dictionary) handleUpdateDictionary(data.dictionary);
    if (data.phrasebook) handleUpdatePhrasebook(data.phrasebook);
    if (data.memory) handleUpdateMemory(data.memory);
    if (data.history) {
      setHistory(data.history);
      persistentSet('translation_history', data.history);
    }
    alert("Restoration complete. All references synchronized.");
  };

  const [glossaryMatches, setGlossaryMatches] = useState<string[]>([]);

  useEffect(() => {
    if (!sourceText.trim() || glossary.length === 0) {
      setGlossaryMatches([]);
      return;
    }
    const matches = glossary
      .filter(item => sourceText.toLowerCase().includes(item.term.toLowerCase()))
      .map(item => item.term);
    setGlossaryMatches(matches);
  }, [sourceText, glossary]);

  const handleFixLQA = async (item: TranslationHistoryItem, critique: any) => {
    setGlobalError(null);
    try {
      const prompt = `Fix the following translation error:
Error: ${critique.finding}
Suggested Improvement: ${critique.improvement}
Source: ${item.sourceText}
Current Translation: ${item.translatedText}

Provide only the corrected translation.`;
      
      const res = await translatePowerhouse(
        item.sourceText,
        item.sourceLang || 'Auto',
        item.targetLang,
        item.field,
        glossary,
        'Standard',
        `Apply this specific fix: ${critique.improvement}`,
        persona,
        translationMemory,
        styleGuides[0]?.instructions || '',
        knowledgeBases,
        vaultFiles
      );
      
      const updatedItem = { ...item, translatedText: res.text, powerhouseAudit: res.audit || null };
      setHistory(prev => prev.map(h => h.id === item.id ? updatedItem : h));
      if (firebaseUser) {
        const sanitizedUpdatedItem = JSON.parse(JSON.stringify(updatedItem));
        await setDoc(doc(db, 'users', firebaseUser.uid, 'history', item.id), sanitizedUpdatedItem);
      }
    } catch (err: any) {
      setGlobalError(err.message || "Failed to apply neural fix.");
    }
  };

  const handleUpdateStyleGuides = (newGuides: StyleGuide[]) => {
    setStyleGuides(newGuides);
    persistentSet('transai_style_guides', newGuides);
    if (firebaseUser) {
      try {
        for (const guide of newGuides) {
          const sanitizedGuide = JSON.parse(JSON.stringify(guide));
          setDoc(doc(db, 'users', firebaseUser.uid, 'styleGuides', guide.id), sanitizedGuide).catch(err => {
            handleFirestoreError(err, OperationType.WRITE, `users/${firebaseUser.uid}/styleGuides`);
          });
        }
      } catch (err) {
        console.error("Failed to save style guides to Firestore", err);
      }
    }
  };

  const handleRunScoping = async () => {
    if (!sourceText.trim()) {
      alert("Please provide source text for scoping analysis.");
      return;
    }
    setIsScoping(true);
    try {
      const scope = await analyzeProjectScope(sourceText, 'Auto', targetLang);
      setProjectScope(scope);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Neural Scoping failed. Please check your connection.", "error");
      setGlobalError(err.message || "Neural Scoping failed. Please check your connection.");
    } finally {
      setIsScoping(false);
    }
  };

  const applyScopingSettings = (field: ProfessionalField, persona: string, tone: string) => {
    setField(field as ProfessionalField);
    setPersona(persona);
    setProjectScope(null);
  };

  const handleSaveUser = (userData: { name: string; role: string; color: string }) => {
    const newUser = { ...userData, id: user?.id || Math.random().toString(36).substring(2, 9) };
    setUser(newUser);
    persistentSet('transai_user', newUser);
    setShowProfileModal(false);
  };

  const handleProcessVaultAsset = async (id: string) => {
    const file = vaultFiles.find(f => f.id === id);
    if (!file) return;
    
    try {
      let result = '';
      const isImage = file.mimeType.startsWith('image/');
      const isText = file.mimeType.startsWith('text/') || file.mimeType === 'application/json';
      const isDocx = file.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      const isHeavyMedia = !isImage && !isText && !isDocx;

      if (isHeavyMedia) {
        try {
          result = await extractTextFromVaultFile(file.id);
        } catch (err: any) {
          if (err.message?.includes('API Key')) throw err;
          throw new Error(`Failed to parse document via Gemini File API. (${err.message})`);
        }
      } else {
        // Always fetch from server to get the original file
        const res = await fetch(`/api/vault/download/${encodeURIComponent(id)}`);
        if (!res.ok) {
          if (res.status === 404) {
            handleRemoveVaultFile(id);
            throw new Error(`File no longer exists on the server. It has been removed from your vault.`);
          }
          throw new Error(`Failed to fetch file: ${res.statusText || res.status}`);
        }
        const blob = await res.blob();
        
        if (isText) {
          result = await blob.text();
        } else if (isDocx) {
          const arrayBuffer = await blob.arrayBuffer();
          try {
            const mammothResult = await mammoth.extractRawText({ arrayBuffer });
            result = mammothResult.value;
          } catch (mammothErr: any) {
            throw new Error(`Failed to parse DOCX file. It might be corrupted or not a valid Word document. (${mammothErr.message})`);
          }
        } else if (isImage) {
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const result = reader.result as string;
              resolve(result.includes(',') ? result.split(',')[1] : result);
            };
            reader.readAsDataURL(blob);
          });
          result = await extractTextFromAsset(base64, file.mimeType);
        }
      }

      // Semantic Indexing
      const chunks = chunkText(result).slice(0, 30); // Limit to 30 chunks to prevent UI blocking for minutes on large files
      const chunksWithEmbeddings = [];
      for (const chunk of chunks) {
        try {
          const embedding = await embedText(chunk.text);
          chunksWithEmbeddings.push({ ...chunk, embedding });
        } catch (err: any) {
          console.error("Failed to embed chunk", err);
          showToast(err.message || "Failed to embed chunk.", "error");
          break; // Stop trying to embed if the AI API is failing (prevents endless loop)
        }
      }

      handleUpdateVault(vaultFiles.map(f => f.id === id ? { ...f, processed: true, content: result, chunks: chunksWithEmbeddings } : f));
    } catch (err: any) { 
      if (!err.message?.includes('API Key')) {
        console.error("Extraction error:", err);
      }
      showToast(err.message || "Neural extraction failed.", "error");
      setGlobalError(err.message || "Neural extraction failed."); 
    }
  };

  const navigationItems: { id: TranslationMode; label: string; icon: React.ReactNode }[] = [
    { id: 'text', label: 'Text', icon: <FileText className="w-4 h-4" /> },
    { id: 'document', label: 'Document', icon: <FileText className="w-4 h-4" /> },
    { id: 'broadcast', label: 'Broadcast', icon: <Send className="w-4 h-4" /> },
    { id: 'inpaint', label: 'In-Paint', icon: <Layers className="w-4 h-4" /> },
    { id: 'lqa', label: 'LQA', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'dubbing', label: 'Dubbing', icon: <Music className="w-4 h-4" /> },
    { id: 'video-suite', label: 'Video Suite', icon: <Video className="w-4 h-4" /> },
    { id: 'subtitles', label: 'Subtitles', icon: <Type className="w-4 h-4" /> },
    { id: 'batch', label: 'Batch', icon: <Layers className="w-4 h-4" /> },
  ];

  const tertiaryNavItems: { id: TranslationMode; label: string; icon: React.ReactNode }[] = [
    { id: 'ecosystem', label: 'Ecosystem', icon: <Network className="w-4 h-4" /> },
    { id: 'next-gen-ai', label: 'Next-Gen AI', icon: <Cpu className="w-4 h-4" /> },
    { id: 'operations', label: 'Enterprise Ops', icon: <Layers className="w-4 h-4" /> },
    { id: 'anonymization', label: 'PII Anonymization', icon: <EyeOff className="w-4 h-4" /> },
    { id: 'dtp', label: 'DTP Studio', icon: <Layout className="w-4 h-4" /> },
    { id: 'ci-cd', label: 'CI/CD Pipeline', icon: <GitBranch className="w-4 h-4" /> },
    { id: 'ar-vr', label: 'AR/VR Preview', icon: <Cuboid className="w-4 h-4" /> },
  ];

  const quaternaryNavItems: { id: TranslationMode; label: string; icon: React.ReactNode }[] = [
    { id: 'transcreation', label: 'Transcreation', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'typography', label: 'Neural Typography', icon: <Type className="w-4 h-4" /> },
    { id: 'dojo', label: 'Translator Dojo', icon: <Swords className="w-4 h-4" /> },
    { id: 'sentiment', label: 'Sentiment & Tone', icon: <Heart className="w-4 h-4" /> },
    { id: 'sign-language', label: 'Sign Language', icon: <Accessibility className="w-4 h-4" /> },
    { id: 'ui-sync', label: 'UI Sync', icon: <ImageIcon className="w-4 h-4" /> },
    { id: 'cultural-intelligence', label: 'CQ Audit', icon: <Globe className="w-4 h-4" /> },
    ...(user?.role === 'Admin' ? [{ id: 'admin' as TranslationMode, label: 'Admin', icon: <Shield className="w-4 h-4" /> }] : [])
  ];

  const secondaryNavigationItems = [
    { id: 'interpreter', label: 'Live Interpreter', icon: <Mic className="w-4 h-4" />, action: () => setActiveMode('interpreter') },
    { id: 'lexicon', label: 'Lexicon', icon: <Search className="w-4 h-4" />, action: () => setActiveMode('terminology-extraction') },
    { id: 'memory', label: 'Memory', icon: <Brain className="w-4 h-4" />, action: () => setShowMemory(true) },
    { id: 'styleguide', label: 'Style Matrix', icon: <Sparkles className="w-4 h-4" />, action: () => setShowStyleGuides(true) },
    { id: 'synonyms', label: 'Synonyms', icon: <Book className="w-4 h-4" />, action: () => setShowSynonyms(true) },
    { id: 'compare', label: 'Compare', icon: <RefreshCw className="w-4 h-4" />, action: () => setActiveMode('compare') },
    { id: 'compliance', label: 'Legal & Compliance', icon: <Scale className="w-4 h-4" />, action: () => setActiveMode('compliance') },
    { id: 'focus', label: 'Focus Mode', icon: <Zap className="w-4 h-4" />, action: () => setIsFocusMode(true), hideLabel: true },
  ];

  const primaryNavItems = navigationItems;

  return (
    <div className={`h-[100dvh] transition-colors duration-500 flex flex-col bg-slate-50 text-slate-900 ${isFocusMode ? 'focus-mode' : ''} overflow-x-hidden`}>
      <CommandPalette 
        isOpen={showCommandPalette} 
        onClose={() => setShowCommandPalette(false)} 
        onNavigate={(mode) => {
          if (mode === 'history' || mode === 'activity') {
            setSidebarTab(mode);
          } else {
            setActiveMode(mode);
          }
        }}
        onAction={handleCommandAction}
      />
      <div className="bg-grid-wrapper" />
      <ServiceHealthMatrix error={globalError} onClear={() => setGlobalError(null)} />

      {!hasNeuralKey && !isFocusMode && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-[110] w-full max-w-[1580px] px-4 animate-fadeIn">
          <div className="bg-rose-600/90 backdrop-blur-xl border border-rose-500/50 rounded-[1.2rem] p-2 pl-4 pr-3 flex items-center justify-between shadow-2xl shadow-rose-600/20">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white animate-pulse">
                <Shield size={16} />
              </div>
              <div className="flex flex-col">
                <h4 className="text-[10px] font-black uppercase text-white tracking-[0.2em] leading-none mb-1">Neural Core Disconnected</h4>
                <p className="text-[9px] text-white/70 font-bold uppercase leading-none">Authentication required for AI synchronization</p>
              </div>
            </div>
            <button 
              onClick={handleOpenKeySelector}
              className="px-4 py-2 bg-white text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-rose-50 active:scale-95 shadow-lg"
            >
              Connect Matrix
            </button>
          </div>
        </div>
      )}

      {!isFocusMode && (
        <header className="sticky top-1 z-[100] mx-auto w-full max-w-[1600px] flex flex-col gap-1 px-2">
          <div className={`rounded-2xl px-4 lg:px-6 flex justify-between items-center h-[40px] transition-all duration-700 relative ${menuStyles[appTheme]}`}>
            {/* Contain background pattern in its own layer to allow overflow of components like the LanguageSelector */}
            <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
              <div 
                className="absolute inset-0 opacity-[0.12]" 
                style={{ 
                  backgroundImage: 'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
                  backgroundSize: '12px 12px' 
                }} 
              />
            </div>
            
            <div className="flex items-center gap-3 lg:gap-4 relative z-10 group">
              <button 
                onClick={() => setIsMobileSidebarOpen(true)} 
                className="lg:hidden p-1.5 hover:bg-white/10 rounded-lg transition-colors border border-white/20"
                title="Open Vault"
              >
                <Layout className="w-4 h-4 text-white" />
              </button>

              <Tooltip content="Return to primary text translation engine" position="bottom">
                <button onClick={() => setActiveMode('text')} className="flex items-center gap-2 lg:gap-3 group">
                  <PenTool className="w-4 h-4 text-white group-hover:rotate-12 transition-transform duration-300" />
                  <h1 className="text-[14px] lg:text-[16px] font-black text-white tracking-tighter drop-shadow-sm transition-all duration-300 group-hover:scale-105">TransAI</h1>
                </button>
              </Tooltip>
            </div>
            
            <div className="flex items-center gap-2 lg:gap-4 relative z-10">
               <div className="hidden xl:flex items-center gap-4">
                 <Tooltip content="Manage multi-stage translation and synthesis pipelines" position="bottom">
                   <button 
                      onClick={() => setActiveMode('workflow')} 
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all text-[10px] font-black uppercase ${activeMode === 'workflow' ? 'bg-white text-indigo-600 border-white' : 'bg-white/20 border-white/30 text-white hover:bg-white/30'}`}
                   >
                      <Layers size={10} /> Workflows
                   </button>
                 </Tooltip>

                 <Tooltip content="Access and manage your RAG-powered knowledge corpora" position="bottom">
                   <button 
                      onClick={() => setActiveMode('knowledge-base')} 
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all text-[10px] font-black uppercase ${activeMode === 'knowledge-base' ? 'bg-white text-indigo-600 border-white' : 'bg-white/20 border-white/30 text-white hover:bg-white/30'}`}
                   >
                      <Database size={10} /> Knowledgebase
                   </button>
                 </Tooltip>

                 <Tooltip content="Collaborative whiteboard for visual localization and design" position="bottom">
                   <button 
                      onClick={() => setActiveMode('canvas')} 
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all text-[10px] font-black uppercase ${activeMode === 'canvas' ? 'bg-white text-indigo-600 border-white' : 'bg-white/20 border-white/30 text-white hover:bg-white/30'}`}
                   >
                      <PenTool size={10} /> Canvas
                   </button>
                 </Tooltip>

                 <Tooltip content="Real-time collaborative translation workspace" position="bottom">
                   <button 
                      onClick={() => setActiveMode('collab')} 
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all text-[10px] font-black uppercase ${activeMode === 'collab' ? 'bg-white text-indigo-600 border-white' : 'bg-white/20 border-white/30 text-white hover:bg-white/30'}`}
                   >
                      <Users size={10} /> Collab
                   </button>
                 </Tooltip>
               </div>

               <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-white/20 rounded-full border border-white/30 text-white text-[10px] font-black uppercase">
                 <Zap size={10} className="animate-pulse" /> <span className="hidden md:inline">Grid Online</span>
               </div>

                <div className="hidden sm:flex items-center gap-2 lg:gap-4">
                  <Tooltip content="Real-time voice translation and interpretation" position="bottom">
                    <button 
                      onClick={() => setActiveMode('live')} 
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all text-[10px] font-black uppercase ${activeMode === 'live' ? 'bg-white text-indigo-600 border-white' : 'bg-white/20 border-white/30 text-white hover:bg-white/30'}`}
                    >
                      <Mic size={10} /> <span className="hidden lg:inline">Live</span>
                    </button>
                  </Tooltip>

                  <Tooltip content="Manage offline language packs and local translation engines" position="bottom">
                    <button 
                      onClick={() => setActiveMode('offline')} 
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all text-[10px] font-black uppercase ${activeMode === 'offline' ? 'bg-white text-indigo-600 border-white' : 'bg-white/20 border-white/30 text-white hover:bg-white/30'}`}
                    >
                      <Download size={10} /> <span className="hidden lg:inline">Offline</span>
                    </button>
                  </Tooltip>
                </div>
               
               <LanguageSelector 
                  value={targetLang} 
                  onChange={setTargetLang} 
                  variant="glass" 
                  size="sm"
                  className="w-[100px] lg:w-[124px]"
               />

               <VoiceToTask 
                  tasks={tasks}
                  onTasksChange={setTasks}
                  activeMode={activeMode}
                  setActiveMode={setActiveMode}
                  setTargetLang={setTargetLang}
                  setField={setField}
                  setInjectedText={setInjectedText}
                  appTheme={appTheme}
                  isFocusMode={isFocusMode}
               />

               <div className="relative" ref={themeRef}>
                  <button 
                    onClick={() => setIsThemeOpen(!isThemeOpen)} 
                    className="p-1.5 rounded-lg bg-white/20 border border-white/30 text-white hover:bg-white/30 transition-all"
                    title="Neural Grid Theme"
                  >
                    <Palette className="w-4 h-4" />
                  </button>
                  {isThemeOpen && (
                    <div className="absolute top-[calc(100%+10px)] right-0 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] shadow-2xl p-4 grid grid-cols-4 gap-2 z-[110] animate-fadeIn">
                       <span className="col-span-4 text-[9px] font-black text-slate-400 uppercase tracking-widest px-2 mb-2">Neural Color Matrix</span>
                       {Object.keys(menuStyles).map((theme) => (
                          <button 
                            key={theme}
                            onClick={() => handleUpdateTheme(theme)}
                            className={`w-full aspect-square rounded-full border-2 transition-all hover:scale-110 active:scale-95 ${appTheme === theme ? 'border-indigo-500 scale-110 shadow-lg' : 'border-transparent'}`}
                            style={{ background: theme === 'slate' ? '#3f3f46' : theme === 'dark' ? '#111827' : theme === 'red' ? '#ef4444' : theme === 'yellow' ? '#f59e0b' : theme === 'green' ? '#10b981' : theme }}
                          />
                       ))}
                    </div>
                  )}
               </div>

               <button 
                  onClick={() => setIsSecretVaultOpen(true)}
                  className="p-1.5 rounded-lg bg-white/20 border border-white/30 text-white hover:bg-white/30 transition-all"
                  title="Neural Secret Vault"
               >
                  <ShieldCheck className="w-4 h-4" />
               </button>

               <button 
                  onClick={() => setIsRibbonExpanded(!isRibbonExpanded)}
                  className="p-1.5 rounded-lg bg-white/20 border border-white/30 text-white hover:bg-white/30 transition-all ml-2"
                  title={isRibbonExpanded ? "Collapse Ribbon" : "Expand Ribbon"}
               >
                  {isRibbonExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
               </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-1 items-start">
            <div className="flex flex-col gap-1 shrink-0 lg:w-[280px]">
              <nav className="border border-indigo-400/30 rounded-2xl p-1 shadow-lg flex justify-center relative overflow-hidden" style={{ backgroundColor: '#00a2e8' }}>
                <div className="absolute inset-0 opacity-[0.2] pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '12px 12px' }}></div>
                <div className="flex bg-white/20 backdrop-blur-[2px] p-0.5 rounded-xl border border-white/20 w-full overflow-x-auto no-scrollbar relative z-10">
                  {[
                    { id: 'vault', label: 'File', icon: <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m16.5 0v-1.5a2.25 2.25 0 00-2.25-2.25h-12a2.25 2.25 0 00-2.25 2.25v1.5m16.5 0H3.75m16.5 0h-16.5" /></svg>, tooltip: 'Manage Vault Files' },
                    { id: 'insights', label: 'Intel', icon: <Sparkles size={14} />, tooltip: 'Neural Insights' },
                    { id: 'chat', label: 'Chat', icon: <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>, tooltip: 'AI Assistant Chat' },
                    { id: 'agent-workflow', label: 'Agents', icon: <Network size={14} />, tooltip: 'Agent Workflows', isMode: true },
                    { id: 'preferences', label: 'Prefs', icon: <Settings2 size={14} />, tooltip: 'User Preferences' }
                  ].map(tab => (
                    <Tooltip key={tab.id} content={tab.tooltip} position="bottom">
                      <button 
                        onClick={() => tab.isMode ? setActiveMode(tab.id as any) : setSidebarTab(tab.id as any)} 
                        className={`flex-1 flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 whitespace-nowrap ${(tab.isMode ? activeMode === tab.id : sidebarTab === tab.id) ? 'bg-white text-[#00a2e8] shadow-sm' : 'text-white/80 hover:bg-white/10'}`}
                      >
                        <span className={`transition-transform ${(tab.isMode ? activeMode === tab.id : sidebarTab === tab.id) ? 'scale-110 text-[#00a2e8]' : 'text-white/60'}`}>{tab.icon}</span>
                        {tab.label}
                      </button>
                    </Tooltip>
                  ))}
                </div>
              </nav>

              <nav className="border border-[#b428f3]/30 rounded-2xl p-1 shadow-lg flex justify-center relative overflow-hidden" style={{ backgroundColor: '#b428f3' }}>
                <div className="absolute inset-0 opacity-[0.2] pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '12px 12px' }}></div>
                <div className="flex bg-white/20 backdrop-blur-[2px] p-0.5 rounded-xl border border-white/20 w-full overflow-x-auto no-scrollbar relative z-10">
                  <Tooltip content="View Activity Stream" position="bottom">
                    <button 
                      onClick={() => setSidebarTab('activity')} 
                      className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 whitespace-nowrap ${sidebarTab === 'activity' ? 'bg-white text-[#b428f3] shadow-sm' : 'text-white/80 hover:bg-white/10'}`}
                    >
                      <span className={`transition-transform ${sidebarTab === 'activity' ? 'scale-110 text-[#b428f3]' : 'text-white/60'}`}><Activity size={14} /></span>
                      Feed
                    </button>
                  </Tooltip>
                  <Tooltip content="Switch to Website mode" position="bottom">
                    <button 
                      onClick={() => setActiveMode('website')} 
                      className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 whitespace-nowrap ${activeMode === 'website' ? 'bg-white text-[#b428f3] shadow-sm' : 'text-white/80 hover:bg-white/10'}`}
                    >
                      <span className={`transition-transform ${activeMode === 'website' ? 'scale-110 text-[#b428f3]' : 'text-white/60'}`}><Globe className="w-4 h-4" /></span>
                      Website
                    </button>
                  </Tooltip>
                  <Tooltip content="Switch to Code mode" position="bottom">
                    <button 
                      onClick={() => setActiveMode('code')} 
                      className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 whitespace-nowrap ${activeMode === 'code' ? 'bg-white text-[#b428f3] shadow-sm' : 'text-white/80 hover:bg-white/10'}`}
                    >
                      <span className={`transition-transform ${activeMode === 'code' ? 'scale-110 text-[#b428f3]' : 'text-white/60'}`}><Terminal className="w-4 h-4" /></span>
                      Code
                    </button>
                  </Tooltip>
                  <Tooltip content="Switch to Image mode" position="bottom">
                    <button 
                      onClick={() => setActiveMode('image')} 
                      className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 whitespace-nowrap ${activeMode === 'image' ? 'bg-white text-[#b428f3] shadow-sm' : 'text-white/80 hover:bg-white/10'}`}
                    >
                      <span className={`transition-transform ${activeMode === 'image' ? 'scale-110 text-[#b428f3]' : 'text-white/60'}`}><Camera className="w-4 h-4" /></span>
                      Image
                    </button>
                  </Tooltip>
                </div>
              </nav>
            </div>

            <div className="flex-1 flex flex-col gap-0.5">
              <nav className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-2xl p-1 shadow-lg flex justify-center">
                <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 w-full overflow-x-auto no-scrollbar">
                  {primaryNavItems.map(item => (
                    <Tooltip key={item.id} content={`Switch to ${item.label} mode`} position="bottom">
                      <button 
                        onClick={() => setActiveMode(item.id)} 
                        className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 whitespace-nowrap ${activeMode === item.id ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-white/50'}`}
                      >
                        <span className={`transition-transform ${activeMode === item.id ? 'scale-110 text-indigo-600' : 'text-slate-400'}`}>{item.icon}</span>
                        {item.label}
                      </button>
                    </Tooltip>
                  ))}
                </div>
              </nav>

              <div className={`flex flex-col gap-0.5 overflow-hidden transition-all duration-300 ease-in-out ${isRibbonExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <nav className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-2xl p-1 shadow-lg flex justify-center">
                  <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 w-full overflow-x-auto no-scrollbar">
                    {tertiaryNavItems.map(item => (
                      <Tooltip key={item.id} content={`Switch to ${item.label} mode`} position="bottom">
                        <button 
                          onClick={() => setActiveMode(item.id)} 
                          className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 whitespace-nowrap ${activeMode === item.id ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-white/50'}`}
                        >
                          <span className={`transition-transform ${activeMode === item.id ? 'scale-110 text-indigo-600' : 'text-slate-400'}`}>{item.icon}</span>
                          {item.label}
                        </button>
                      </Tooltip>
                    ))}
                  </div>
                </nav>

                <nav className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-2xl p-1 shadow-lg flex justify-center">
                  <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 w-full overflow-x-auto no-scrollbar">
                    {quaternaryNavItems.map(item => (
                      <Tooltip key={item.id} content={`Switch to ${item.label} mode`} position="bottom">
                        <button 
                          onClick={() => setActiveMode(item.id)} 
                          className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 whitespace-nowrap ${activeMode === item.id ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-white/50'}`}
                        >
                          <span className={`transition-transform ${activeMode === item.id ? 'scale-110 text-indigo-600' : 'text-slate-400'}`}>{item.icon}</span>
                          {item.label}
                        </button>
                      </Tooltip>
                    ))}
                  </div>
                </nav>

                <nav className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-2xl p-1 shadow-lg flex justify-center">
                  <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 w-full">
                    {secondaryNavigationItems.map(item => (
                      <Tooltip key={item.id} content={item.label} className="flex-1 flex" position="bottom">
                        <button 
                          onClick={item.action} 
                          className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 whitespace-nowrap ${activeMode === item.id ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-white/50'}`}
                        >
                          <span className={`transition-transform ${activeMode === item.id ? 'scale-110 text-indigo-600' : 'text-slate-400'}`}>{item.icon}</span>
                          {!item.hideLabel && item.label}
                        </button>
                      </Tooltip>
                    ))}
                  </div>
                </nav>
              </div>
            </div>
          </div>
        </header>
      )}

      {isFocusMode && (
        <button 
          onClick={() => setIsFocusMode(false)}
          className="fixed top-8 right-8 z-[100] p-4 bg-indigo-600 text-white rounded-[2rem] shadow-2xl hover:bg-indigo-700 transition-all active:scale-95 group"
          title="Exit Focus Mode"
        >
          <X size={24} strokeWidth={3} />
          <span className="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Exit Focus Mode</span>
        </button>
      )}

      <div className={`flex-1 flex flex-col lg:flex-row ${isFocusMode ? 'pt-0' : 'pt-0'} overflow-hidden relative z-10 min-h-0`}>
        {!isFocusMode && (
          <>
            {/* Desktop Sidebar */}
            <div className="hidden lg:block relative flex-shrink-0 border-r border-slate-200 bg-white" style={{ width: leftPanelWidth }}>
              <Sidebar 
                history={history} 
                onClear={async () => { 
                  const oldHistory = history;
                  setHistory([]); 
                  localStorage.removeItem('translation_history'); 
                  if (firebaseUser) {
                    try {
                      for (const item of oldHistory) {
                        await deleteDoc(doc(db, 'users', firebaseUser.uid, 'history', item.id));
                      }
                    } catch (err) {
                      console.error("Failed to clear history from Firestore", err);
                    }
                  }
                }}
                onSaveHistory={saveHistory}
                onUpdateHistoryItem={(updatedItem) => {
                  setHistory(prev => prev.map(h => h.id === updatedItem.id ? updatedItem : h));
                  if (firebaseUser) {
                    const sanitizedUpdated = JSON.parse(JSON.stringify(updatedItem));
                    setDoc(doc(db, 'users', firebaseUser.uid, 'history', updatedItem.id), sanitizedUpdated).catch(err => {
                      handleFirestoreError(err, OperationType.WRITE, `users/${firebaseUser.uid}/history`);
                    });
                  }
                }}
                lookups={savedLookups} 
                onRemoveLookup={(id) => setSavedLookups(prev => prev.filter(l => l.id !== id))} 
                onClearLookups={() => setSavedLookups([])} 
                translationMemory={translationMemory} 
                onUpdateMemory={handleUpdateMemory} 
                activeTab={sidebarTab} 
                onTabChange={setSidebarTab} 
                vaultFiles={vaultFiles} 
                knowledgeBases={knowledgeBases}
                onUpdateVault={handleUpdateVault} 
                onRemoveVaultFile={handleRemoveVaultFile}
                onProcessAsset={handleProcessVaultAsset} 
                onInjectAsset={(id) => { const f = vaultFiles.find(x => x.id === id); if (f) { setInjectedText(f.content || ""); setActiveMode('text'); } }} 
                onInjectText={(t) => { setInjectedText(t); setActiveMode('text'); }} 
                targetLang={targetLang} 
                setTargetLang={setTargetLang} 
                field={field} 
                glossary={glossary} 
                onUpdateGlossary={handleUpdateGlossary} 
                onRunLQA={(item) => {
                  setSelectedHistoryItem(item);
                  setActiveMode('lqa');
                }}
                isLoggedIn={!!firebaseUser}
                onLogin={handleLogin}
                onLogout={handleLogout}
                onRestore={handleRestoreFromBackup}
                user={user}
                onUpdatePreferences={setUserPreferences}
              />
              <div 
                ref={resizerRef}
                className={`absolute top-0 right-0 w-1.5 h-full cursor-col-resize z-50 transition-colors ${isDraggingResizer ? 'bg-indigo-500' : 'hover:bg-indigo-300 bg-transparent'}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsDraggingResizer(true);
                }}
              />
            </div>

            {/* Mobile Sidebar Overlay */}
            {isMobileSidebarOpen && (
              <div className="fixed inset-0 z-[200] lg:hidden">
                <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsMobileSidebarOpen(false)} />
                <div className="absolute top-0 left-0 bottom-0 w-full max-w-[300px] bg-white shadow-2xl animate-slideInLeft overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Neural Vault</span>
                    <button onClick={() => setIsMobileSidebarOpen(false)} className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors">
                      <X className="w-5 h-5 text-slate-600" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <Sidebar 
                      history={history} 
                      onClear={async () => { 
                        const oldHistory = history;
                        setHistory([]); 
                        localStorage.removeItem('translation_history'); 
                        if (firebaseUser) {
                          try {
                            for (const item of oldHistory) {
                              await deleteDoc(doc(db, 'users', firebaseUser.uid, 'history', item.id));
                            }
                          } catch (err) {
                            console.error("Failed to clear history from Firestore", err);
                          }
                        }
                      }}
                      onSaveHistory={(item) => { saveHistory(item); setIsMobileSidebarOpen(false); }}
                      onUpdateHistoryItem={(updatedItem) => {
                        setHistory(prev => prev.map(h => h.id === updatedItem.id ? updatedItem : h));
                        if (firebaseUser) {
                          const sanitizedUpdated = JSON.parse(JSON.stringify(updatedItem));
                          setDoc(doc(db, 'users', firebaseUser.uid, 'history', updatedItem.id), sanitizedUpdated).catch(err => {
                            handleFirestoreError(err, OperationType.WRITE, `users/${firebaseUser.uid}/history`);
                          });
                        }
                      }}
                      lookups={savedLookups} 
                      onRemoveLookup={(id) => setSavedLookups(prev => prev.filter(l => l.id !== id))} 
                      onClearLookups={() => setSavedLookups([])} 
                      translationMemory={translationMemory} 
                      onUpdateMemory={handleUpdateMemory} 
                      activeTab={sidebarTab} 
                      onTabChange={(tab) => { setSidebarTab(tab); }} 
                      vaultFiles={vaultFiles} 
                      knowledgeBases={knowledgeBases}
                      onUpdateVault={handleUpdateVault} 
                      onRemoveVaultFile={handleRemoveVaultFile}
                      onProcessAsset={handleProcessVaultAsset} 
                      onInjectAsset={(id) => { const f = vaultFiles.find(x => x.id === id); if (f) { setInjectedText(f.content || ""); setActiveMode('text'); setIsMobileSidebarOpen(false); } }} 
                      onInjectText={(t) => { setInjectedText(t); setActiveMode('text'); setIsMobileSidebarOpen(false); }} 
                      targetLang={targetLang} 
                      setTargetLang={setTargetLang} 
                      field={field} 
                      glossary={glossary} 
                      onUpdateGlossary={handleUpdateGlossary} 
                      onRunLQA={(item) => {
                        setSelectedHistoryItem(item);
                        setActiveMode('lqa');
                        setIsMobileSidebarOpen(false);
                      }}
                      isLoggedIn={!!firebaseUser}
                      onLogin={handleLogin}
                      onLogout={handleLogout}
                      onRestore={handleRestoreFromBackup}
                      user={user}
                      onUpdatePreferences={setUserPreferences}
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        
        <main className="flex-1 overflow-y-auto custom-scrollbar p-4 pb-24 pt-2 lg:px-8 lg:pb-8 lg:pt-2">
          <div className={`${activeMode === 'subtitles' || activeMode === 'video-suite' || activeMode === 'dubbing' ? 'max-w-7xl' : 'max-w-6xl'} mx-auto w-full flex flex-col min-h-full gap-4 lg:gap-6`}>
            <FieldMenuBar 
              value={field} 
              onChange={setField} 
              persona={persona} 
              onPersonaChange={setPersona} 
              customStyleGuide={customStyleGuide}
              onCustomStyleGuideChange={setCustomStyleGuide}
              onOpenPersonaEditor={() => setShowPersonaEditor(true)}
              onRunScoping={handleRunScoping}
              isScoping={isScoping}
              customPersonas={customPersonas}
              styleGuides={styleGuides}
            />
            
            {projectScope && (
              <ProjectScopingPanel 
                scope={projectScope} 
                onApplySettings={applyScopingSettings} 
              />
            )}
            <div className="flex-1 animate-fadeIn">
              {activeMode === 'text' && <TextTranslator onSave={saveHistory} field={field} persona={persona} customStyleGuide={customStyleGuide} targetLang={targetLang} setTargetLang={setTargetLang} glossary={glossary} onUpdateGlossary={handleUpdateGlossary} phrasebook={phrasebook} dictionary={dictionary} translationMemory={translationMemory} onOpenGlossary={() => setShowGlossary(true)} onOpenPhrasebook={() => setShowPhrasebook(true)} onOpenDictionary={() => setShowDictionary(true)} onOpenMemory={() => setShowMemory(true)} onOpenInsights={() => setSidebarTab('insights')} onOpenHistory={() => setSidebarTab('history')} onSourceTextChange={setSourceText} injectedText={injectedText} onClearInjected={() => setInjectedText('')} onArchiveLookup={() => {}} savedLookups={savedLookups} onUpdateDictionary={handleUpdateDictionary} onUpdateMemory={handleUpdateMemory} onUpdatePhrasebook={handleUpdatePhrasebook} customPersonas={customPersonas} styleGuides={styleGuides} knowledgeBases={knowledgeBases} vaultFiles={vaultFiles} glossaryMatches={glossaryMatches} sessionConsistencyMap={sessionConsistencyMap} isUpdatingConsistency={isUpdatingConsistency} isFocusMode={isFocusMode} userPreferences={userPreferences} />}
              {activeMode === 'document' && <DocumentTranslator targetLang={targetLang} field={field} vaultFiles={vaultFiles} />}
              {activeMode === 'knowledge-base' && <KnowledgeBaseManager knowledgeBases={knowledgeBases} onUpdateKnowledgeBases={handleUpdateKnowledgeBases} vaultFiles={vaultFiles} />}
              {activeMode === 'terminology-extraction' && <TerminologyExtractor vaultFiles={vaultFiles} history={history} glossary={glossary} onUpdateGlossary={handleUpdateGlossary} />}
              {activeMode === 'dtp' && <DTPStudio onSave={saveHistory} targetLang={targetLang} field={field} vaultFiles={vaultFiles} />}
              {activeMode === 'cultural-intelligence' && <CulturalIntelligence field={field} />}
              {activeMode === 'image' && <ImageTranslator onSave={saveHistory} field={field} targetLang={targetLang} setTargetLang={setTargetLang} />}
              {activeMode === 'collab' && <CollaborationHub onSave={saveHistory} field={field} targetLang={targetLang} setTargetLang={setTargetLang} user={user} vaultFiles={vaultFiles} knowledgeBases={knowledgeBases} userPreferences={userPreferences} />}
              {activeMode === 'website' && <WebsiteTranslator onSave={saveHistory} targetLang={targetLang} setTargetLang={setTargetLang} />}
              {activeMode === 'live' && <LiveVoiceTranslator field={field} />}
              {activeMode === 'code' && <CodeTranslator onSave={saveHistory} />}
              {activeMode === 'compare' && <CompareDocuments onSave={saveHistory} field={field} targetLang={targetLang} setTargetLang={setTargetLang} />}
              {activeMode === 'broadcast' && <BroadcastTranslator onSave={saveHistory} field={field} persona={persona} customStyleGuide={customStyleGuide} glossary={glossary} styleGuides={styleGuides} />}
              {activeMode === 'inpaint' && <InPaintingTranslator onSave={saveHistory} targetLang={targetLang} field={field} />}
              {activeMode === 'lqa' && <LQADashboard 
                history={history} 
                initialSelectedItem={selectedHistoryItem}
                onUpdateHistory={(updated) => {
                  const newHistory = history.map(h => h.id === updated.id ? updated : h);
                  setHistory(newHistory);
                  persistentSet('translation_history', newHistory);
                  if (firebaseUser) {
                    const sanitizedUpdated = JSON.parse(JSON.stringify(updated));
                    setDoc(doc(db, 'users', firebaseUser.uid, 'history', updated.id), sanitizedUpdated).catch(err => {
                      handleFirestoreError(err, OperationType.WRITE, `users/${firebaseUser.uid}/history`);
                    });
                  }
                }} 
                onFixLQA={handleFixLQA}
              />}
              {activeMode === 'dubbing' && <DubbingStudio onSave={saveHistory} targetLang={targetLang} field={field} persona={persona} customStyleGuide={customStyleGuide} styleGuides={styleGuides} />}
              {activeMode === 'video-suite' && <VideoLocalizationSuite onSave={saveHistory} targetLang={targetLang} field={field} persona={persona} customStyleGuide={customStyleGuide} styleGuides={styleGuides} />}
              {activeMode === 'subtitles' && <SubtitleOverlay field={field} persona={persona} customStyleGuide={customStyleGuide} styleGuides={styleGuides} />}
              {activeMode === 'batch' && <BatchProcessor field={field} persona={persona} targetLang={targetLang} customStyleGuide={customStyleGuide} styleGuides={styleGuides} />}
              {activeMode === 'workflow' && <WorkflowManager field={field} targetLang={targetLang} user={user} onOpenCanvas={() => setActiveMode('canvas')} />}
              {activeMode === 'interpreter' && <LiveInterpreter sourceLang={uiLangName} targetLang={targetLang} />}
              {activeMode === 'ci-cd' && <ContinuousLocalization sourceLang={uiLangName} targetLang={targetLang} />}
              {activeMode === 'ar-vr' && <ARVRPreview sourceLang={uiLangName} targetLang={targetLang} field={field} persona={persona} customStyleGuide={styleGuides.find(sg => sg.id === customStyleGuide)} />}
              {activeMode === 'transcreation' && <TranscreationStudio sourceLang={uiLangName} targetLang={targetLang} field={field} persona={persona} customStyleGuide={styleGuides.find(sg => sg.id === customStyleGuide)} />}
              {activeMode === 'typography' && <NeuralTypographyEngine targetLang={targetLang} />}
              {activeMode === 'dojo' && <TranslatorDojo sourceLang={uiLangName} targetLang={targetLang} field={field} />}
              {activeMode === 'sentiment' && <SentimentDashboard sourceLang={uiLangName} targetLang={targetLang} />}
              {activeMode === 'compliance' && <LegalComplianceSandbox sourceLang={uiLangName} targetLang={targetLang} field={field} />}
              {activeMode === 'sign-language' && <SignLanguageAvatar sourceLang={uiLangName} />}
              {activeMode === 'anonymization' && <PIIAnonymizer />}
              {activeMode === 'operations' && <EnterpriseOperations />}
              {activeMode === 'next-gen-ai' && <NextGenAIStudio />}
              {activeMode === 'ecosystem' && <EcosystemIntegrations />}
              {activeMode === 'ui-sync' && <UISyncTranslator sourceLang={uiLangName} targetLang={targetLang} setTargetLang={setTargetLang} />}
              {activeMode === 'admin' && <AdminDashboard user={user} />}
              {activeMode === 'offline' && <OfflineManager onPacksUpdate={setOfflinePacks} downloadedPacks={offlinePacks} />}
              {activeMode === 'agent-workflow' && <AgenticWorkflowBuilder />}
            </div>
          </div>
        </main>
      </div>

      {showGlossary && <GlossaryManager glossary={glossary} onUpdate={handleUpdateGlossary} onClose={() => setShowGlossary(false)} history={history} vaultFiles={vaultFiles} />}
      {showPhrasebook && <PhrasebookManager phrasebook={phrasebook} onUpdate={handleUpdatePhrasebook} onClose={() => setShowPhrasebook(false)} onInject={(t) => { setInjectedText(t); setShowPhrasebook(false); }} currentSourceLang={uiLangName} />}
      {showSynonyms && <SynonymsManager onClose={() => setShowSynonyms(false)} />}
      {showDictionary && <DictionaryManager dictionary={dictionary} onUpdate={handleUpdateDictionary} onClose={() => setShowDictionary(false)} defaultSourceLang={uiLangName} defaultTargetLang={targetLang} />}
      {showMemory && <MemoryManager memory={translationMemory} onUpdate={handleUpdateMemory} onClose={() => setShowMemory(false)} />}
      {showStyleGuides && <StyleGuideManager styleGuides={styleGuides} onUpdate={handleUpdateStyleGuides} onClose={() => setShowStyleGuides(false)} vaultFiles={vaultFiles} history={history} />}
      {showProfileModal && <UserProfileModal onSave={handleSaveUser} onClose={() => setShowProfileModal(false)} initialUser={user || undefined} />}
      {isSecretVaultOpen && <SecretVault onClose={() => setIsSecretVaultOpen(false)} />}
      
      {activeMode === 'canvas' && user && (
        <CollaborativeCanvas 
          onClose={() => setActiveMode('text')} 
          user={user} 
          roomId="global-grid-canvas" 
        />
      )}
      
      <PersonaEditor 
        isOpen={showPersonaEditor}
        onClose={() => setShowPersonaEditor(false)}
        onSave={handleSavePersona}
        onDelete={handleDeletePersona}
        customPersonas={customPersonas}
      />
      
      <UIEditor />
      <SelectionTranslator targetLang={targetLang} />

      {!isFocusMode && (
        <BottomNavigation 
          activeMode={activeMode} 
          setActiveMode={setActiveMode} 
          appTheme={appTheme} 
        />
      )}
    </div>
  );
};

export default App;
