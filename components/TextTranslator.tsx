
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';
import mammoth from 'mammoth';
import { 
  translateText, 
  textToSpeech, 
  auditTranslationNPE, 
  verifyTranslationQuality, 
  fetchWordDefinition, 
  analyzeLinguisticComplexity, 
  fetchPronunciationGuide, 
  auditTranslationQuality, 
  embedText, 
  translatePowerhouse, 
  analyzeCulturalNuances, 
  refineTranslation, 
  SessionConsistencyMap, 
  extractGlossaryFromText, 
  improveTranslation, 
  analyzeSentimentAndTone,
  harvestTerminology
} from '../services/geminiService';
import { transcribeAudio } from '../services/transcriptionService';
import { initGoogleApi, authenticateDrive, saveToDrive } from '../services/googleDriveService';
import LanguageSelector from './LanguageSelector';
import PronunciationGuideTooltip from './PronunciationGuideTooltip';
import AuditMatrix from './AuditMatrix';
import TranslationQualityPanel from './TranslationQualityPanel';
import LinguisticAuditorPanel from './LinguisticAuditorPanel';
import SmartCompose from './SmartCompose';
import { getSimilarityScore, calculatePEMetrics } from '../utils/stringUtils';
import { cosineSimilarity } from '../utils/similarity';
import { TranslationHistoryItem, ProfessionalField, LinguisticPersona, PersonaDefinition, GlossaryItem, SavedLookup, DictionaryEntry, TranslationMemoryEntry, NeuralSegment, NPEReport, LinguisticTerm, VerificationReport, PhrasebookItem, TranslationQualityReport, StyleGuide, PEMetrics, SuggestedGlossaryItem, ImprovementType } from '../types';
import { generateId } from '../utils/id';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { useToast } from './ToastContext';
import { 
  Activity,
  Download, 
  Share2, 
  Printer, 
  FileText, 
  Check, 
  Copy, 
  Lock, 
  Unlock, 
  Sparkles, 
  Brain,
  X, 
  Mic, 
  ChevronLeft, 
  ChevronRight, 
  Zap, 
  Book, 
  SearchCode, 
  ShieldCheck, 
  Search, 
  Settings2, 
  Bookmark, 
  Volume2, 
  AlertCircle, 
  Plus, 
  Sliders,
  Cpu,
  Palette,
  Database,
  BarChart2,
  MousePointer2,
  RefreshCw,
  Library,
  Cloud,
  Globe,
  Trash2,
  HelpCircle,
  Info,
  Code,
  Quote,
  ArrowRight,
  Wand2,
  Feather,
  Minimize2,
  Maximize2,
  CheckCircle2,
  User,
  Briefcase,
  Languages,
  AlertTriangle
} from 'lucide-react';

interface TextTranslatorProps {
  onSave: (item: TranslationHistoryItem) => void;
  field: ProfessionalField;
  persona: LinguisticPersona;
  customStyleGuide?: string;
  targetLang: string;
  setTargetLang: (lang: string) => void;
  onArchiveLookup: (data: Partial<SavedLookup>) => void;
  savedLookups: SavedLookup[];
  glossary: GlossaryItem[];
  onUpdateGlossary: (glossary: GlossaryItem[]) => void;
  phrasebook: PhrasebookItem[];
  onUpdatePhrasebook: (phrasebook: PhrasebookItem[]) => void;
  dictionary: DictionaryEntry[];
  onUpdateDictionary: (dictionary: DictionaryEntry[]) => void;
  translationMemory: TranslationMemoryEntry[];
  onUpdateMemory: (memory: TranslationMemoryEntry[]) => void;
  onOpenGlossary: () => void;
  onOpenPhrasebook: () => void;
  onOpenDictionary: () => void;
  onOpenMemory: () => void;
  onOpenInsights: () => void;
  onOpenHistory: () => void;
  injectedText?: string;
  onClearInjected?: () => void;
  onSourceTextChange?: (text: string) => void;
  customPersonas?: any[];
  styleGuides?: StyleGuide[];
  knowledgeBases?: any[];
  vaultFiles?: any[];
  glossaryMatches?: string[];
  sessionConsistencyMap?: SessionConsistencyMap | null;
  isUpdatingConsistency?: boolean;
  isFocusMode?: boolean;
  userPreferences?: any;
}

const TextTranslator: React.FC<TextTranslatorProps> = ({ 
  onSave, field, persona, customStyleGuide, targetLang, setTargetLang, glossary, onUpdateGlossary,
  phrasebook, dictionary, translationMemory, onUpdateMemory, onOpenGlossary, onOpenPhrasebook,
  onOpenDictionary, onOpenMemory, injectedText, onClearInjected, onSourceTextChange, customPersonas = [], styleGuides = [],
  knowledgeBases = [], vaultFiles = [], glossaryMatches = [], sessionConsistencyMap = null, isUpdatingConsistency = false,
  isFocusMode = false, userPreferences = null
}) => {
  const { showToast } = useToast();
  const [sourceText, setSourceText] = useState<string>('');

  useEffect(() => {
    if (onSourceTextChange) {
      onSourceTextChange(sourceText);
    }
  }, [sourceText, onSourceTextChange]);
  const [translatedText, setTranslatedText] = useState<string>('');
  const [originalMT, setOriginalMT] = useState<string>('');
  const [peMetrics, setPEMetrics] = useState<PEMetrics | null>(null);
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);
  const [sourceLang, setSourceLang] = useState<string>('Auto-detect');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLeftExpanded, setIsLeftExpanded] = useState<boolean>(true);
  const [isPowerhouseEnabled, setIsPowerhouseEnabled] = useState<boolean>(false);
  const [isCulturalAgentEnabled, setIsCulturalAgentEnabled] = useState<boolean>(false);
  const [powerhouseAudit, setPowerhouseAudit] = useState<TranslationQualityReport | null>(null);
  const [refinementExplanation, setRefinementExplanation] = useState<string>('');
  const [contextUsed, setContextUsed] = useState<string[]>([]);
  
  const [isCopied, setIsCopied] = useState(false);
  const [isSavingToCloud, setIsSavingToCloud] = useState(false);
  const [sourceEmbedding, setSourceEmbedding] = useState<number[] | null>(null);
  const [isEmbedding, setIsEmbedding] = useState(false);

  // Tone Radar State
  const [showToneRadar, setShowToneRadar] = useState(false);
  const [isAnalyzingTone, setIsAnalyzingTone] = useState(false);
  const [toneAnalysis, setToneAnalysis] = useState<{
    metrics: { metric: string; sourceScore: number; targetScore: number }[];
    analysis: string;
    warnings: string[];
  } | null>(null);

  // Collaboration State
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const sourceTextRef = useRef(sourceText);
  const translatedTextRef = useRef(translatedText);

  useEffect(() => { sourceTextRef.current = sourceText; }, [sourceText]);
  useEffect(() => { translatedTextRef.current = translatedText; }, [translatedText]);

  const joinRoom = useCallback((room: string) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}`);
    
    socket.onopen = () => {
      const user = { id: generateId(), name: 'Linguist ' + Math.floor(Math.random() * 1000), color: '#' + Math.floor(Math.random()*16777215).toString(16) };
      socket.send(JSON.stringify({ type: 'join', roomId: room, user }));
      setRoomId(room);
      setWs(socket);
    };

    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'sync' || msg.type === 'update') {
        if (msg.state.sourceText !== undefined && msg.state.sourceText !== sourceTextRef.current) {
          setSourceText(msg.state.sourceText);
        }
        if (msg.state.translatedText !== undefined && msg.state.translatedText !== translatedTextRef.current) {
          setTranslatedText(msg.state.translatedText);
        }
        if (msg.state.targetLang !== undefined) {
          setTargetLang(msg.state.targetLang);
        }
        if (msg.type === 'sync' && msg.users) {
          setCollaborators(msg.users);
        }
      } else if (msg.type === 'user_joined') {
        setCollaborators(prev => {
          if (prev.find(u => u.id === msg.user.id)) return prev;
          return [...prev, msg.user];
        });
      } else if (msg.type === 'user_left') {
        setCollaborators(prev => prev.filter(u => u.id !== msg.user.id));
      }
    };

    return socket;
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const room = urlParams.get('room');
    let socket: WebSocket | null = null;
    if (room) {
      socket = joinRoom(room);
    }
    return () => {
      if (socket) socket.close();
      if (ws) ws.close();
    };
  }, [joinRoom]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'c') {
        if (translatedText) {
          e.preventDefault();
          navigator.clipboard.writeText(translatedText);
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [translatedText]);

  const handleCreateRoom = () => {
    const newRoom = generateId();
    const url = new URL(window.location.href);
    url.searchParams.set('room', newRoom);
    window.history.pushState({}, '', url);
    joinRoom(newRoom);
    navigator.clipboard.writeText(url.toString());
    alert('Collaboration link copied to clipboard! Share it with your team.');
  };

  // Expanded heuristics for content type detection
  const isLikelyCode = useMemo(() => {
    const codeKeywords = [
      'const', 'let', 'var', 'function', 'class', 'import', 'export', 'return', 
      'await', 'async', 'if', 'else', 'try', 'catch', 'finally', 'from', 'default', 
      'extends', 'new', 'this', 'type', 'interface', 'enum', 'def', 'elif', 'print',
      'public', 'private', 'protected', 'static', 'void', 'int', 'bool', 'fn', 'pub', 'use', 'crate'
    ];
    const punctuation = ['=>', '{', '}', ';', '(', ')', '[', ']', ':', '->'];
    const keywordMatches = codeKeywords.filter(k => new RegExp(`\\b${k}\\b`).test(sourceText)).length;
    const punctuationMatches = punctuation.filter(p => sourceText.includes(p)).length;
    return keywordMatches >= 2 || punctuationMatches >= 5;
  }, [sourceText]);

  const isLikelyMarkdown = useMemo(() => {
    const mdPatterns = [/^# /m, /^## /m, /^### /m, /\*\*/, /\[.*\]\(.*\)/, /^- /m, /^> /m, /^`{3}/m, /\|.*\|/];
    return mdPatterns.some(p => p.test(sourceText));
  }, [sourceText]);

  // Advanced Neural Memory Logic
  const memorySuggestions = useMemo(() => {
    if (!sourceText.trim() || sourceText.length < 5) return [];
    
    const candidates = translationMemory
      .filter(m => m.sourceLang === sourceLang && m.targetLang === targetLang)
      .map(m => {
        let similarity = getSimilarityScore(sourceText, m.sourceSegment) / 100;
        
        if (sourceEmbedding && m.embedding) {
          const semanticSimilarity = cosineSimilarity(sourceEmbedding, m.embedding);
          if (semanticSimilarity > similarity) {
            similarity = semanticSimilarity;
          }
        }
        
        return { 
          ...m, 
          similarity 
        };
      });

    return candidates
      .filter(c => c.similarity >= 0.6)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3);
  }, [sourceText, sourceLang, targetLang, translationMemory, sourceEmbedding]);

  // Debounced Embedding Generation
  useEffect(() => {
    if (!sourceText.trim() || sourceText.length < 10) {
      setSourceEmbedding(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsEmbedding(true);
      try {
        const embedding = await embedText(sourceText);
        setSourceEmbedding(embedding);
      } catch (err: any) {
        console.error("Semantic Search Error:", err);
        showToast(`Failed to generate semantic embedding: ${err.message}`, "error");
      } finally {
        setIsEmbedding(false);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [sourceText]);

  const [isSegmentMode, setIsSegmentMode] = useState(false);
  const [segments, setSegments] = useState<NeuralSegment[]>([]);
  const [isAuditing, setIsAuditing] = useState(false);
  const [npeReport, setNpeReport] = useState<NPEReport | null>(null);
  const [showAudit, setShowAudit] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyReport, setVerifyReport] = useState<TranslationQualityReport | null>(null);
  const [showVerifyPanel, setShowVerifyPanel] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [improvementType, setImprovementType] = useState<ImprovementType | null>(null);
  const [showComplexityAudit, setShowComplexityAudit] = useState(false);
  const [isTTSEnabled, setIsTTSEnabled] = useState(false);
  const [useGrounding, setUseGrounding] = useState(false);
  const [groundingSources, setGroundingSources] = useState<{ uri: string; title: string }[]>([]);
  const [complexTerms, setComplexTerms] = useState<LinguisticTerm[]>([]);
  const [isAnalyzingComplexity, setIsAnalyzingComplexity] = useState(false);
  const [hoveredTerm, setHoveredTerm] = useState<LinguisticTerm | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [selectionInfo, setSelectionInfo] = useState<LinguisticTerm & { isGlossaryMatch?: boolean } | null>(null);
  const [isFetchingSelection, setIsFetchingSelection] = useState(false);
  const [isEditingSource, setIsEditingSource] = useState(false);
  const [isEditingOutput, setIsEditingOutput] = useState(false);
  const [visualContext, setVisualContext] = useState<string | null>(null);
  const [isUploadingVisual, setIsUploadingVisual] = useState(false);
  const [referenceContext, setReferenceContext] = useState<{ name: string; text: string } | null>(null);
  const [isUploadingReference, setIsUploadingReference] = useState(false);
  const visualInputRef = useRef<HTMLInputElement>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);
  const [suggestedTerms, setSuggestedTerms] = useState<SuggestedGlossaryItem[]>([]);
  const [isHarvestingTerms, setIsHarvestingTerms] = useState(false);
  const [isAutoGlossaryEnabled, setIsAutoGlossaryEnabled] = useState(false);
  const [cachedDefinitions, setCachedDefinitions] = useState<Record<string, LinguisticTerm>>({});
  const [culturalAnalysis, setCulturalAnalysis] = useState<{
    nuances: { term: string; explanation: string; suggestion: string }[];
    idioms: { original: string; meaning: string; equivalent: string }[];
    sensitivity: { issue: string; severity: 'Low' | 'Medium' | 'High'; advice: string }[];
  } | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sourceContainerRef = useRef<HTMLDivElement>(null);
  const outputContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { 
    if (injectedText) { 
      setSourceText(injectedText); 
      setTranslatedText('');
      if (ws && roomId) {
        ws.send(JSON.stringify({ type: 'update', state: { sourceText: injectedText, translatedText: '' } }));
      }
      setNpeReport(null);
      setVerifyReport(null);
      setShowAudit(false);
      setShowVerifyPanel(false);
      if (onClearInjected) onClearInjected(); 
    } 
  }, [injectedText, onClearInjected, ws, roomId]);

  const closeTooltips = useCallback(() => { 
    setHoveredTerm(null); 
    setSelectionInfo(null); 
  }, []);

  const handleExportText = () => {
    if (!translatedText) return;
    const blob = new Blob([translatedText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `transai_synthesis_${new Date().toISOString().slice(0, 10)}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    if (!translatedText) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>TransAI Neural Synthesis Export</title>
            <style>
              body { font-family: 'Merriweather', serif; padding: 40px; color: #1e293b; line-height: 1.6; }
              h1 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.2em; color: #4f46e5; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
              .meta { font-size: 10px; text-transform: uppercase; color: #94a3b8; margin-bottom: 30px; }
              .content { font-size: 16px; white-space: pre-wrap; font-weight: 500; }
            </style>
          </head>
          <body>
            <h1>Neural Synthesis Archive</h1>
            <div class="meta">Target: ${targetLang} | Persona: ${persona} | Field: ${field}</div>
            <div class="content">${translatedText}</div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleVisualUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploadingVisual(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setVisualContext(reader.result as string);
      setIsUploadingVisual(false);
    };
    reader.readAsDataURL(file);
  };



  const handleReferenceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingReference(true);
    try {
      if (file.type.startsWith('text/') || file.type === 'application/json') {
        const reader = new FileReader();
        reader.onload = (event) => {
          setReferenceContext({ name: file.name, text: event.target?.result as string });
          setIsUploadingReference(false);
        };
        reader.readAsText(file);
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/vault/transcribe', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errText = await response.text();
        let errMsg = 'Failed to extract text from document';
        try {
          const errObj = JSON.parse(errText);
          errMsg = errObj.error || errMsg;
        } catch (e) {
          errMsg += ` (Status ${response.status}): ${errText.substring(0, 100)}`;
        }
        throw new Error(errMsg);
      }
      
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const textResponse = await response.text();
        throw new Error(`Server returned HTML instead of JSON. Res Status: ${response.status}. Preview: ${textResponse.substring(0, 50)}...`);
      }

      const data = await response.json();
      setReferenceContext({ name: file.name, text: data.text });
    } catch (err: any) {
      console.error("Reference upload failed:", err);
      showToast(`Failed to process reference document: ${err.message}`, "error");
    } finally {
      setIsUploadingReference(false);
    }
  };

  const handleShare = async () => {
    if (!translatedText) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'TransAI Synthesis', text: translatedText });
      } catch (err: any) { 
        console.error(err);
        showToast(`Failed to share translation: ${err.message}`, "error");
      }
    } else {
      await navigator.clipboard.writeText(translatedText);
      alert('Sharing context copied to clipboard buffer.');
    }
  };

  useEffect(() => {
    if (sourceText.length < 50) {
      setSuggestedTerms([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsHarvestingTerms(true);
      try {
        const suggestions = await extractGlossaryFromText(sourceText, 'Auto');
        // Filter out terms already in glossary
        const filtered = suggestions.filter(s => 
          !glossary.some(g => g.term.toLowerCase() === s.term.toLowerCase())
        );
        
        if (isAutoGlossaryEnabled && filtered.length > 0) {
          const newItems: GlossaryItem[] = filtered.map(s => ({
            term: s.term,
            definition: s.definition
          }));
          onUpdateGlossary([...glossary, ...newItems]);
        } else {
          setSuggestedTerms(filtered);
        }
      } catch (err: any) {
        console.error("Harvesting failed", err);
        showToast(`Failed to harvest glossary terms: ${err.message}`, "error");
      } finally {
        setIsHarvestingTerms(false);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [sourceText, glossary, isAutoGlossaryEnabled]);

  const handleAddSuggestedTerm = (suggestion: SuggestedGlossaryItem) => {
    const newItem: GlossaryItem = {
      term: suggestion.term,
      definition: suggestion.definition
    };
    onUpdateGlossary([...glossary, newItem]);
    setSuggestedTerms(prev => prev.filter(s => s.id !== suggestion.id));
  };

  const handleSaveToCloud = async () => {
    if (!translatedText) return;
    setIsSavingToCloud(true);
    try {
      await initGoogleApi();
      await authenticateDrive();
      const fileName = `synthesis_${targetLang.toLowerCase()}_${Date.now()}.txt`;
      await saveToDrive(fileName, translatedText);
      alert('Synaptic sequence synced to Cloud Matrix.');
    } catch (err) {
      console.error(err);
      showToast("Cloud resynchronization failed.", "error");
    } finally {
      setIsSavingToCloud(false);
    }
  };

  const [isCommittingToMemory, setIsCommittingToMemory] = useState(false);
  const handleCommitToMemory = async () => {
    if (!sourceText.trim() || !translatedText.trim() || isCommittingToMemory) return;
    setIsCommittingToMemory(true);
    try {
      const newEntry: TranslationMemoryEntry = {
        id: generateId(),
        sourceLang,
        targetLang,
        sourceSegment: sourceText,
        targetSegment: translatedText,
        usageCount: 1,
        lastUsed: Date.now(),
        status: 'active'
      };
      onUpdateMemory([newEntry, ...translationMemory]);
      setTimeout(() => setIsCommittingToMemory(false), 1500);
    } catch (err: any) {
      console.error(err);
      showToast(`Failed to commit to memory: ${err.message}`, "error");
      setIsCommittingToMemory(false);
    }
  };

  const handleCopyOutput = async () => {
    if (!translatedText) return;
    
    try {
      const markdownBody = outputContainerRef.current?.querySelector('.markdown-body');
      if (markdownBody && window.ClipboardItem) {
        // Clone the node to modify it for clipboard without affecting UI
        const clone = markdownBody.cloneNode(true) as HTMLElement;
        
        // Inline some basic table styles for Word compatibility
        const tables = clone.querySelectorAll('table');
        tables.forEach(table => {
          (table as HTMLElement).style.borderCollapse = 'collapse';
          (table as HTMLElement).style.width = '100%';
          (table as HTMLElement).style.margin = '12pt 0';
          (table as HTMLElement).style.border = '1px solid #e2e8f0';
          
          const cells = table.querySelectorAll('th, td');
          cells.forEach(cell => {
            (cell as HTMLElement).style.border = '1px solid #e2e8f0';
            (cell as HTMLElement).style.padding = '6pt';
            (cell as HTMLElement).style.textAlign = 'left';
          });
          
          const headers = table.querySelectorAll('th');
          headers.forEach(header => {
            (header as HTMLElement).style.backgroundColor = '#f8fafc';
            (header as HTMLElement).style.fontWeight = 'bold';
          });
        });

        const html = clone.innerHTML;
        const blobHtml = new Blob([html], { type: 'text/html' });
        const blobText = new Blob([translatedText], { type: 'text/plain' });
        
        const data = [new ClipboardItem({
          'text/html': blobHtml,
          'text/plain': blobText,
        })];
        
        await navigator.clipboard.write(data);
      } else {
        await navigator.clipboard.writeText(translatedText);
      }
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Advanced copy failed, falling back to text-only', err);
      showToast("Advanced copy failed, falling back to text-only.", "error");
      navigator.clipboard.writeText(translatedText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  useEffect(() => {
    const handleSelection = async () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        if (!isFetchingSelection) setSelectionInfo(null);
        return;
      }
      const selectedText = selection.toString().trim();
      if (!selectedText || selectedText.length < 2 || selectedText.length > 50) return;

      if (outputContainerRef.current && outputContainerRef.current.contains(selection.anchorNode)) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top - 10 });

        const glossaryMatch = glossary.find(g => g.term.toLowerCase() === selectedText.toLowerCase());
        if (glossaryMatch) {
          setSelectionInfo({
            id: 'glossary-' + selectedText,
            term: glossaryMatch.term,
            definition: glossaryMatch.definition,
            context: 'Stored in Lexicon Repository',
            alternative: 'Official Mapping',
            type: 'important',
            isGlossaryMatch: true
          });
          return;
        }

        setIsFetchingSelection(true);
        try {
          const data = await fetchWordDefinition(selectedText, targetLang, translatedText);
          setSelectionInfo({
            id: generateId(),
            term: selectedText,
            definition: data.definition,
            context: data.context,
            alternative: data.alternative,
            type: data.type as any,
            isGlossaryMatch: false
          });
        } catch (err: any) { 
          console.error(err);
          showToast(`Failed to fetch selection definition: ${err.message}`, "error");
        } finally { setIsFetchingSelection(false); }
      }
    };

    document.addEventListener('mouseup', handleSelection);
    return () => document.removeEventListener('mouseup', handleSelection);
  }, [translatedText, targetLang, glossary, isFetchingSelection]);

  useEffect(() => {
    if (originalMT && translatedText && originalMT !== translatedText) {
      const metrics = calculatePEMetrics(originalMT, translatedText);
      setPEMetrics(metrics);
    } else {
      setPEMetrics(null);
    }
  }, [originalMT, translatedText]);

  const handleAnalyzeTone = async () => {
    if (!sourceText.trim() || !translatedText.trim()) return;
    setIsAnalyzingTone(true);
    setShowToneRadar(true);
    setShowAudit(false);
    setShowVerifyPanel(false);
    setIsEditingOutput(false);
    try {
      const result = await analyzeSentimentAndTone(sourceText, translatedText, sourceLang, targetLang);
      setToneAnalysis(result);
    } catch (err: any) {
      console.error(err);
      showToast(`Failed to analyze tone: ${err.message}`, "error");
    } finally {
      setIsAnalyzingTone(false);
    }
  };

  const handleTranslate = async () => {
    if (!sourceText.trim()) return;

    // Translation Memory Auto-Lookup
    const exactMatch = translationMemory.find(
      entry => entry.sourceSegment.trim() === sourceText.trim() && entry.targetLang === targetLang
    );

    if (exactMatch) {
      setTranslatedText(exactMatch.targetSegment);
      setOriginalMT(exactMatch.targetSegment);
      setIsLoading(false);
      showToast("Loaded from Translation Memory", "success");
      
      // Update usage count
      const updatedMemory = translationMemory.map(m => 
        m.id === exactMatch.id ? { ...m, usageCount: (m.usageCount || 1) + 1, lastUsed: Date.now() } : m
      );
      onUpdateMemory(updatedMemory);
      return;
    }

    setIsLoading(true);
    setNpeReport(null);
    setVerifyReport(null);
    setPowerhouseAudit(null);
    setCulturalAnalysis(null);
    setRefinementExplanation('');
    setContextUsed([]);
    setShowAudit(false);
    setShowVerifyPanel(false);
    setShowToneRadar(false);
    closeTooltips();
    try {
      const lockedTexts = segments.filter(s => s.isLocked).map(s => s.text);
      const customPersona = typeof persona !== 'string' ? persona : customPersonas.find(p => p.name === persona);
      const styleGuide = typeof persona === 'string' && persona.startsWith('Style: ') ? styleGuides.find(g => `Style: ${g.name}` === persona) : null;
      
      const customInstructions = styleGuide ? styleGuide.instructions : (customPersona ? customPersona.instructions : '');
      const finalPersona = styleGuide ? 'Custom Guide' : persona;
      const finalContext = styleGuide ? styleGuide.instructions : (customStyleGuide || '');
      
      let combinedContext = finalContext;
      if (referenceContext) {
        combinedContext += `\n\n--- REFERENCE DOCUMENT (${referenceContext.name}) ---\n${referenceContext.text}\n--- END REFERENCE DOCUMENT ---\nUse the above reference document to inform terminology, style, and tone.`;
      }
      
      let result;
      let culturalAnalysisPromise = null;

      if (isCulturalAgentEnabled) {
        culturalAnalysisPromise = analyzeCulturalNuances(sourceText, sourceLang, targetLang);
      }

      const prefsInstructions = userPreferences?.autoApply ? `\n\nGlobal Instructions: ${userPreferences.globalInstructions}\nFormatting Rules: ${userPreferences.formattingRules}` : '';

      if (isPowerhouseEnabled) {
        result = await translatePowerhouse(
          sourceText,
          sourceLang,
          targetLang,
          field,
          glossary,
          userPreferences?.autoApply ? userPreferences.preferredTone : 'Standard',
          combinedContext,
          finalPersona,
          translationMemory,
          customInstructions + prefsInstructions,
          knowledgeBases,
          vaultFiles,
          sessionConsistencyMap || undefined,
          visualContext || undefined
        );
        setPowerhouseAudit(result.audit || null);
        setRefinementExplanation(result.refinementExplanation || '');
        setContextUsed(result.contextUsed || []);
      } else {
        const prefsInstructions = userPreferences?.autoApply ? `\n\nGlobal Instructions: ${userPreferences.globalInstructions}\nFormatting Rules: ${userPreferences.formattingRules}` : '';

        result = await translateText(
          sourceText, 
          sourceLang, 
          targetLang, 
          field, 
          glossary, 
          userPreferences?.autoApply ? userPreferences.preferredTone : 'Standard', 
          combinedContext, 
          finalPersona, 
          lockedTexts,
          customInstructions + prefsInstructions,
          useGrounding
        );
      }

      if (culturalAnalysisPromise) {
        try {
          const analysis = await culturalAnalysisPromise;
          setCulturalAnalysis(analysis);
        } catch (e) {
          console.error("Cultural Agent failed", e);
          showToast("Cultural analysis failed.", "error");
        }
      }

      setTranslatedText(result.text);
      if (ws && roomId) {
        ws.send(JSON.stringify({ type: 'update', state: { translatedText: result.text } }));
      }
      setOriginalMT(result.text);
      setPEMetrics(null);
      const newId = generateId();
      setCurrentHistoryId(newId);
      if (result.sources) setGroundingSources(result.sources);
      
      // Auto-save to Translation Memory
      if (!translationMemory.some(entry => entry.sourceSegment.trim() === sourceText.trim() && entry.targetLang === targetLang)) {
        const newEntry: TranslationMemoryEntry = {
          id: generateId(),
          sourceLang,
          targetLang,
          sourceSegment: sourceText.trim(),
          targetSegment: result.text.trim(),
          lastUsed: Date.now(),
          usageCount: 1
        };
        onUpdateMemory([...translationMemory, newEntry]);
      }

      onSave({ 
        id: newId, 
        sourceText, 
        translatedText: result.text, 
        sourceLang, 
        targetLang, 
        field, 
        persona, 
        timestamp: Date.now(), 
        type: 'text',
        powerhouseAudit: result.audit,
        refinementExplanation: result.refinementExplanation,
        contextUsed: result.contextUsed
      });
      if (isTTSEnabled && result.text) textToSpeech(result.text);

      // Auto-harvest terms if enabled
      if (isAutoGlossaryEnabled) {
        setIsHarvestingTerms(true);
        harvestTerminology(sourceText, result.text, sourceLang, targetLang, field)
          .then(terms => setSuggestedTerms(terms))
          .catch(e => console.error(e))
          .finally(() => setIsHarvestingTerms(false));
      }
    } catch (error: any) { 
      console.error(error);
      showToast(error.message || "Translation failed. Please try again.", "error");
    } finally { setIsLoading(false); }
  };

  useEffect(() => {
    if (!isEditingOutput && currentHistoryId && translatedText) {
      onSave({
        id: currentHistoryId,
        sourceText,
        translatedText,
        sourceLang,
        targetLang,
        field,
        persona,
        timestamp: Date.now(),
        type: 'text',
        peMetrics: peMetrics || undefined,
        originalMT: originalMT || undefined
      });
    }
  }, [isEditingOutput]);

  const handleRefine = async () => {
    if (!translatedText) return;
    setIsLoading(true);
    try {
      let auditFindings = '';
      if (powerhouseAudit) {
        auditFindings += `Powerhouse Audit Critiques: ${JSON.stringify(powerhouseAudit.critiques)}\n`;
      }
      if (npeReport) {
        auditFindings += `NPE Audit Explanation: ${npeReport.explanation}\n`;
      }
      
      const result = await refineTranslation(sourceText, translatedText, targetLang, field, persona, auditFindings || undefined);
      setTranslatedText(result.refinedText);
      if (ws && roomId) {
        ws.send(JSON.stringify({ type: 'update', state: { translatedText: result.refinedText } }));
      }
      setOriginalMT(result.refinedText);
      setPEMetrics(null);
      setRefinementExplanation(result.explanation);
      
      if (currentHistoryId) {
        onSave({
          id: currentHistoryId,
          sourceText,
          translatedText: result.refinedText,
          sourceLang,
          targetLang,
          field,
          persona,
          timestamp: Date.now(),
          type: 'text',
          refinementExplanation: result.explanation
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAudit = async () => {
    if (!translatedText || isAuditing) return;
    setIsAuditing(true);
    setNpeReport(null);
    setShowAudit(true);
    setShowVerifyPanel(false);
    setShowToneRadar(false);
    try {
      const report = await auditTranslationNPE(sourceText, translatedText, sourceLang, targetLang);
      setNpeReport(report);
    } catch (err: any) {
      console.error(err);
      showToast(`Failed to run NPE audit: ${err.message}`, "error");
      setShowAudit(false);
    } finally {
      setIsAuditing(false);
    }
  };

  const handleVerify = async () => {
    if (!translatedText || isVerifying) return;
    setIsVerifying(true);
    setVerifyReport(null);
    setShowVerifyPanel(true);
    setShowAudit(false);
    setShowToneRadar(false);
    try {
      const report = await auditTranslationQuality(sourceText, translatedText, sourceLang, targetLang, field);
      setVerifyReport(report);
    } catch (err: any) {
      console.error(err);
      showToast(`Failed to verify translation quality: ${err.message}`, "error");
      setShowVerifyPanel(false);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleImprove = async (type: ImprovementType) => {
    if (!translatedText || isImproving) return;
    setIsImproving(true);
    setImprovementType(type);
    try {
      const result = await improveTranslation(sourceText, translatedText, targetLang, type);
      setTranslatedText(result.improvedText);
      if (ws && roomId) {
        ws.send(JSON.stringify({ type: 'update', state: { translatedText: result.improvedText } }));
      }
      setOriginalMT(result.improvedText);
      setPEMetrics(null);
      setRefinementExplanation(result.explanation);
      
      if (currentHistoryId) {
        onSave({
          id: currentHistoryId,
          sourceText,
          translatedText: result.improvedText,
          sourceLang,
          targetLang,
          field,
          persona,
          timestamp: Date.now(),
          type: 'text',
        });
      }
    } catch (err: any) {
      console.error(err);
      showToast(`Failed to apply improvement: ${err.message}`, "error");
    } finally {
      setIsImproving(false);
      setImprovementType(null);
    }
  };

  const applyMemoryMatch = (entry: TranslationMemoryEntry) => {
    setTranslatedText(entry.targetSegment);
    if (ws && roomId) {
      ws.send(JSON.stringify({ type: 'update', state: { translatedText: entry.targetSegment } }));
    }
    const updatedTM = translationMemory.map(m => m.id === entry.id ? { ...m, usageCount: m.usageCount + 1, lastUsed: Date.now() } : m);
    onUpdateMemory(updatedTM);
  };

  const handleAnalyzeComplexityTrigger = async () => {
    if (!sourceText.trim() || isAnalyzingComplexity) return;
    setIsAnalyzingComplexity(true);
    setShowComplexityAudit(true);
    try {
      const terms = await analyzeLinguisticComplexity(sourceText, sourceLang);
      setComplexTerms(terms);
    } catch (err: any) {
      console.error(err);
      showToast(`Failed to analyze linguistic complexity: ${err.message}`, "error");
      setShowComplexityAudit(false);
    } finally {
      setIsAnalyzingComplexity(false);
    }
  };

  const handleWordLookup = async (word: string, rect: DOMRect) => {
    const cleanWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim();
    if (!cleanWord || cleanWord.length < 2) return;
    const x = rect.left + rect.width / 2;
    const y = rect.top - 10;
    
    const audited = complexTerms.find(t => t.term.toLowerCase() === cleanWord.toLowerCase());
    if (audited) { setHoveredTerm(audited); setTooltipPos({ x, y }); return; }
    if (cachedDefinitions[cleanWord]) { setHoveredTerm(cachedDefinitions[cleanWord]); setTooltipPos({ x, y }); return; }

    try {
      const data = await fetchWordDefinition(cleanWord, sourceLang, sourceText);
      const newTerm: LinguisticTerm = { id: generateId(), term: cleanWord, definition: data.definition, context: data.context, alternative: data.alternative, type: data.type as any };
      setCachedDefinitions(prev => ({ ...prev, [cleanWord]: newTerm }));
      setHoveredTerm(newTerm); setTooltipPos({ x, y });
    } catch (err) { 
      console.error(err);
      showToast("Failed to fetch word definition.", "error");
    }
  };

  const handleWordHover = async (word: string, e: React.MouseEvent) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    const rect = e.currentTarget.getBoundingClientRect();
    const cleanPart = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").toLowerCase();
    const matchedAuditTerm = complexTerms.find(t => t.term.toLowerCase() === cleanPart);
    if (matchedAuditTerm) {
      setHoveredTerm(matchedAuditTerm);
      setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top - 10 });
      return;
    }
    hoverTimeoutRef.current = setTimeout(() => handleWordLookup(word, rect), 750);
  };

  const renderSourceWithHighlights = () => {
    if (isEditingSource && !isSegmentMode) {
      return (
        <textarea 
          autoFocus value={sourceText} onBlur={() => setIsEditingSource(false)}
          onChange={(e) => { 
            const val = e.target.value;
            setSourceText(val); 
            if (complexTerms.length > 0) setComplexTerms([]); 
            if (ws && roomId) ws.send(JSON.stringify({ type: 'update', state: { sourceText: val } }));
          }} 
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault();
              setIsEditingSource(false);
              handleTranslate();
            }
          }}
          placeholder="Inject documents..." 
          className={`h-full w-full p-5 lg:p-8 resize-none focus:outline-none text-[15px] font-bold text-slate-900 bg-transparent custom-scrollbar`} 
        />
      );
    }
    if (isSegmentMode) {
        return (
          <div className="h-full p-5 overflow-y-auto custom-scrollbar space-y-2.5">
              {segments.map(s => (
                <div key={s.id} className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${s.isLocked ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/10' : 'bg-slate-50 border-slate-100 dark:bg-slate-800/50'}`}>
                  <button onClick={() => setSegments(prev => prev.map(x => x.id === s.id ? {...x, isLocked: !x.isLocked} : x))} className={`p-1.5 rounded-lg ${s.isLocked ? 'bg-amber-600 text-white' : 'text-slate-300 hover:text-indigo-600'}`}>
                    {s.isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                  </button>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{s.text}</p>
                </div>
              ))}
          </div>
        );
    }

    const lines = sourceText.split('\n');
    const codeKeywords = [
      'const', 'let', 'var', 'function', 'return', 'if', 'else', 'import', 'export', 
      'class', 'await', 'async', 'try', 'catch', 'finally', 'from', 'default', 
      'extends', 'new', 'this', 'type', 'interface', 'enum', 'def', 'elif', 'print',
      'public', 'private', 'protected', 'static', 'void', 'int', 'bool', 'fn', 'pub', 'use', 'crate'
    ];

    return (
        <div 
          onClick={() => setIsEditingSource(true)} 
          className={`h-full w-full p-5 lg:p-8 overflow-y-auto custom-scrollbar text-[15px] font-bold text-slate-900 relative group cursor-text rounded-[2rem] transition-colors duration-500 ${isLikelyCode ? 'bg-slate-50' : 'bg-white'}`}
        >
            {lines.map((line, lineIdx) => {
                const words = line.split(/(\s+)/);
                let currentInComment = false;

                // Line-level Markdown detection
                const isH1 = isLikelyMarkdown && line.startsWith('# ');
                const isH2 = isLikelyMarkdown && line.startsWith('## ');
                const isH3 = isLikelyMarkdown && line.startsWith('### ');
                const isList = isLikelyMarkdown && (line.trim().startsWith('- ') || line.trim().startsWith('* '));
                const isQuote = isLikelyMarkdown && line.trim().startsWith('> ');
                const isTable = isLikelyMarkdown && line.trim().startsWith('|');
                const isCodeBlock = isLikelyMarkdown && line.startsWith('```');

                let lineClasses = 'min-h-[1.5em] transition-all duration-300 ';
                if (isH1) lineClasses += 'text-3xl font-black text-indigo-800 mt-6 mb-3 tracking-tighter';
                else if (isH2) lineClasses += 'text-2xl font-black text-indigo-700 mt-5 mb-2 tracking-tight';
                else if (isH3) lineClasses += 'text-xl font-black text-indigo-600 mt-4 mb-1';
                else if (isQuote) lineClasses += 'border-l-4 border-indigo-200 pl-4 py-1 italic text-slate-500 bg-indigo-50/20 rounded-r-xl';
                else if (isCodeBlock) lineClasses += 'bg-slate-800 text-indigo-300 p-2 rounded-lg font-mono text-xs my-2';
                else if (isTable) lineClasses += 'font-mono text-xs text-indigo-600 bg-indigo-50/30 py-0.5 px-2 rounded border-x border-indigo-100 whitespace-pre';
                else if (isList) lineClasses += 'pl-4 flex items-start gap-2';

                return (
                  <div key={lineIdx} className={lineClasses}>
                    {isList && <span className="text-indigo-400 font-black mt-0.5">•</span>}
                    {words.map((part, wordIdx) => {
                        if (part.trim() === "") return <span key={wordIdx}>{part}</span>;

                        const cleanPart = part.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").toLowerCase();
                        const matchedAuditTerm = complexTerms.find(t => t.term.toLowerCase() === cleanPart);
                        const matchedGlossaryTerm = glossary.find(g => g.term.toLowerCase() === cleanPart);
                        
                        let classNames = 'rounded px-0.5 transition-all inline-block cursor-help relative ';
                        
                        if (matchedAuditTerm) classNames += 'bg-amber-100 text-amber-900 border-b-2 border-amber-400 hover:bg-amber-200 ';
                        else if (matchedGlossaryTerm) classNames += 'bg-emerald-100 text-emerald-900 border-b-2 border-emerald-400 hover:bg-emerald-200 ';
                        else if (codeKeywords.includes(part.toLowerCase())) classNames += 'text-indigo-600 font-mono ';
                        else classNames += 'hover:bg-slate-100 ';

                        return (
                          <span 
                            key={wordIdx} 
                            className={classNames}
                            onMouseEnter={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              if (matchedAuditTerm) {
                                setHoveredTerm(matchedAuditTerm);
                                setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top - 10 });
                              } else if (matchedGlossaryTerm) {
                                setHoveredTerm({ 
                                  id: 'glossary-' + matchedGlossaryTerm.term,
                                  term: matchedGlossaryTerm.term, 
                                  definition: matchedGlossaryTerm.definition,
                                  context: 'Glossary Match',
                                  alternative: '',
                                  type: 'important',
                                  isGlossaryMatch: true 
                                });
                                setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top - 10 });
                              }
                            }}
                            onMouseLeave={() => {
                              setHoveredTerm(null);
                            }}
                          >
                            {part}
                          </span>
                        );
                        if (isLikelyMarkdown && !isH1 && !isH2 && !isH3 && !isCodeBlock) {
                            if (part.startsWith('**') && part.endsWith('**')) classNames += 'font-black text-indigo-900 bg-indigo-50 ';
                            else if (part.startsWith('*') && part.endsWith('*')) classNames += 'italic text-slate-700 ';
                        }

                        // Code syntax highlighting
                        if (isLikelyCode || isCodeBlock) {
                            if (part.startsWith('//') || part.startsWith('/*') || (part.startsWith('#') && !isLikelyMarkdown)) currentInComment = true;
                            if (currentInComment) classNames += 'text-slate-400 font-normal italic opacity-70 ';
                            else if (codeKeywords.includes(cleanPart)) {
                                classNames += 'text-indigo-600 font-black ';
                            } else if (part.includes('"') || part.includes("'") || part.includes('`')) {
                                classNames += 'text-emerald-600 font-bold ';
                            } else if (/^\d+$/.test(cleanPart)) {
                                classNames += 'text-amber-600 ';
                            } else {
                                classNames += 'text-slate-800 ';
                            }
                        } else {
                            classNames += 'hover:bg-indigo-50 ';
                        }

                        // Linguistic Audit Highlights (Top priority)
                        if (matchedAuditTerm) {
                          switch (matchedAuditTerm.type) {
                            case 'technical': classNames += 'bg-blue-100/80 border-b-2 border-blue-400 text-blue-900 '; break;
                            case 'idiomatic': classNames += 'bg-purple-100/80 border-b-2 border-purple-400 text-purple-900 '; break;
                            case 'ambiguous': classNames += 'bg-amber-100/80 border-b-2 border-amber-400 text-amber-900 '; break;
                            case 'important': classNames += 'bg-indigo-100/80 border-b-2 border-indigo-400 text-indigo-900 '; break;
                          }
                        }

                        return (
                            <button 
                              key={wordIdx} 
                              type="button" 
                              onMouseEnter={(e) => handleWordHover(part, e)} 
                              onMouseLeave={() => { if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current); }} 
                              className={classNames}
                            >
                                {part}
                            </button>
                        );
                    })}
                  </div>
                );
            })}
        </div>
    );
  };

  const getTermTypeStyles = (type: string, isGlossaryMatch?: boolean) => {
    if (isGlossaryMatch) return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    switch (type) {
      case 'technical': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'idiomatic': return 'bg-purple-50 text-purple-600 border-purple-100';
      case 'ambiguous': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'important': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  const getTermTypeLabel = (type: string, isGlossaryMatch?: boolean) => {
    if (isGlossaryMatch) return 'Lexicon Match';
    return type.toUpperCase();
  };

  const getTermTypeIcon = (type: string) => {
    switch (type) {
      case 'technical': return <Zap size={14} />;
      case 'idiomatic': return <Book size={14} />;
      case 'ambiguous': return <HelpCircle size={14} />;
      case 'important': return <Info size={14} />;
      default: return <Sparkles size={14} />;
    }
  };

  return (
    <div className={`flex flex-col gap-4 animate-fadeIn ${isFocusMode ? 'h-[100dvh] w-[100vw] fixed inset-0 z-[200] bg-slate-950 p-8' : ''}`}>
      {!isFocusMode && (
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 px-2">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-[12px] font-black text-slate-900 uppercase tracking-widest">Synthesis Core</span>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                   <span className="text-[10px] font-bold text-indigo-600 uppercase">
                     {persona ? (typeof persona === 'string' ? persona : (persona as any).name || 'Linguistic') : 'Default'} Mode: {field}
                   </span>
                 </div>
                <div className={`w-1.5 h-1.5 rounded-full ${isLoading || isAnalyzingComplexity ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                <button onClick={handleTranslate} disabled={isLoading} className="ml-2 px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-indigo-700 shadow-lg active:scale-95 transition-all whitespace-nowrap">Run Synthesis</button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            <button onClick={onOpenPhrasebook} className="shrink-0 flex items-center gap-1 px-2 py-1.5 rounded-lg text-[9px] font-black uppercase bg-white text-slate-700 border border-slate-200 shadow-sm transition-all hover:border-indigo-300 hover:text-indigo-600 shadow-sm active:scale-95"><Bookmark size={14} /> Phrasebook</button>
            <button onClick={onOpenGlossary} className="shrink-0 flex items-center gap-1 px-2 py-1.5 rounded-lg text-[9px] font-black uppercase bg-white text-slate-700 border border-slate-200 shadow-sm transition-all hover:border-indigo-300 hover:text-indigo-600 shadow-sm active:scale-95"><Book size={14} /> Glossary</button>
            <button onClick={onOpenDictionary} className="shrink-0 flex items-center gap-1 px-2 py-1.5 rounded-lg text-[9px] font-black uppercase bg-white text-slate-700 border border-slate-200 shadow-sm transition-all hover:border-amber-300 hover:text-amber-600 shadow-sm active:scale-95"><Library size={14} /> Dictionary</button>
            <button onClick={handleCreateRoom} className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase shadow-xl transition-all active:scale-95 ${roomId ? 'bg-emerald-600 text-white shadow-emerald-100 hover:bg-emerald-700' : 'bg-indigo-600 text-white shadow-indigo-100 hover:bg-indigo-700'}`}>
              <Share2 size={14} /> {roomId ? 'Collab Active' : 'Collaborate'}
            </button>
            {collaborators.length > 0 && (
              <div className="flex items-center -space-x-2 ml-1 mr-1 shrink-0">
                {collaborators.map(c => (
                  <div key={c.id} title={c.name} className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-bold text-white shadow-sm" style={{ backgroundColor: c.color }}>
                    {c.name.charAt(0)}
                  </div>
                ))}
              </div>
            )}
            <button onClick={onOpenMemory} className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase bg-indigo-600 text-white shadow-xl shadow-indigo-100 transition-all hover:bg-indigo-700 active:scale-95">
              <Database size={14} /> Memory
            </button>
          </div>
        </div>
      )}

      <div className={`flex flex-col ${isFocusMode ? 'flex-1 h-full' : 'min-h-[32rem] lg:h-[50rem]'} border-2 ${isFocusMode ? 'border-indigo-500/30 shadow-[0_0_100px_rgba(99,102,241,0.1)]' : 'border-white/10 shadow-2xl'} rounded-[1.5rem] glass-panel overflow-visible relative transition-all duration-500`}>
        <div className={`transition-all duration-500 flex flex-col ${isFocusMode ? 'bg-slate-900/50' : 'bg-white/5'} border-b border-white/10 overflow-hidden relative ${isLeftExpanded ? 'w-full min-h-[300px]' : 'w-full h-12'}`}>
          {isLeftExpanded && (
            <div className="flex-1 flex flex-col p-3 overflow-hidden">
               {!isFocusMode && (
                 <div className="flex flex-col gap-2 mb-3">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <button 
                        onClick={() => setIsPowerhouseEnabled(!isPowerhouseEnabled)}
                        className={`flex-1 sm:flex-none flex justify-center items-center gap-1.5 px-3 py-2 rounded-xl text-[8px] sm:text-[9px] font-black uppercase tracking-widest transition-all ${isPowerhouseEnabled ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                        title="Powerhouse Mode: RAG + Multi-Agent Refinement"
                      >
                        <Cpu size={14} className={isPowerhouseEnabled ? 'animate-pulse' : ''} />
                        <span className="hidden sm:inline">Powerhouse</span>
                        <span className="inline sm:hidden">AI+</span>
                      </button>
                      <button 
                        onClick={() => setIsCulturalAgentEnabled(!isCulturalAgentEnabled)}
                        className={`flex-1 sm:flex-none flex justify-center items-center gap-1.5 px-3 py-2 rounded-xl text-[8px] sm:text-[9px] font-black uppercase tracking-widest transition-all ${isCulturalAgentEnabled ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                        title="Automated Cultural Adaptation Agent"
                      >
                        <Globe size={14} className={isCulturalAgentEnabled ? 'animate-pulse' : ''} />
                        <span className="hidden sm:inline">Cultural Agent</span>
                        <span className="inline sm:hidden">Culture</span>
                      </button>
                      <button 
                        onClick={() => {
                          if (visualContext) {
                            setVisualContext(null);
                          } else {
                            visualInputRef.current?.click();
                          }
                        }}
                        className={`flex-1 sm:flex-none flex justify-center items-center gap-1.5 px-3 py-2 rounded-xl text-[8px] sm:text-[9px] font-black uppercase tracking-widest transition-all ${visualContext ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                        title={visualContext ? "Click to remove visual context" : "Visual Context Integration: Upload an image to analyze"}
                      >
                        <Palette size={14} className={isUploadingVisual ? 'animate-spin' : ''} />
                        <span className="hidden sm:inline">{visualContext ? 'Visual Active' : 'Visual Context'}</span>
                        <span className="inline sm:hidden">{visualContext ? 'Visual' : 'Photo'}</span>
                      </button>

                      <button 
                        onClick={() => {
                          if (referenceContext) {
                            setReferenceContext(null);
                          } else {
                            referenceInputRef.current?.click();
                          }
                        }}
                        className={`flex-1 sm:flex-none flex justify-center items-center gap-1.5 px-3 py-2 rounded-xl text-[8px] sm:text-[9px] font-black uppercase tracking-widest transition-all ${referenceContext ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                        title={referenceContext ? "Click to remove reference document" : "Reference Document: Upload a template or previously translated file"}
                      >
                        <FileText size={14} className={isUploadingReference ? 'animate-spin' : ''} />
                        <span className="hidden sm:inline">{referenceContext ? 'Ref Doc Active' : 'Ref Doc'}</span>
                        <span className="inline sm:hidden">{referenceContext ? 'Ref' : 'Doc'}</span>
                      </button>

                      <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-default">
                        <Sparkles size={11} className="text-indigo-500" />
                        <span className="text-[8px] font-black uppercase tracking-[0.2em]">Auto-Detect</span>
                      </div>
                      <button 
                        onClick={() => setIsAutoGlossaryEnabled(!isAutoGlossaryEnabled)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${isAutoGlossaryEnabled ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                        title="Auto-Glossary Extraction"
                      >
                        <Library size={10} className={isAutoGlossaryEnabled ? 'animate-pulse' : ''} />
                        Auto-Glossary
                      </button>
                      <button 
                        onClick={handleAnalyzeComplexityTrigger}
                        disabled={isAnalyzingComplexity || !sourceText.trim()}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${isAnalyzingComplexity ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'} disabled:opacity-50`}
                        title="Neural Complexity Audit"
                      >
                        <BarChart2 size={10} className={isAnalyzingComplexity ? 'animate-pulse' : ''} />
                        Complexity Audit
                      </button>
                      {sessionConsistencyMap && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-600 animate-fadeIn shadow-sm">
                          <ShieldCheck size={10} className={isUpdatingConsistency ? 'animate-spin' : ''} />
                          <span className="text-[8px] font-black uppercase tracking-widest">Consistency Agent</span>
                        </div>
                      )}
                    {knowledgeBases.some(kb => kb.isActive) && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-600 animate-fadeIn shadow-sm">
                        <Database size={10} className="animate-pulse" />
                        <span className="text-[8px] font-black uppercase tracking-widest">Neural KB Active</span>
                      </div>
                    )}
                    {isLikelyCode && (
                       <div className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-600 animate-fadeIn shadow-sm">
                         <Code size={10} />
                         <span className="text-[7px] font-black uppercase tracking-widest">Logic Detected</span>
                       </div>
                    )}
                    {isLikelyMarkdown && !isLikelyCode && (
                       <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-100 rounded-lg text-amber-600 animate-fadeIn shadow-sm">
                         <FileText size={10} />
                         <span className="text-[7px] font-black uppercase tracking-widest">Rich Text Mode</span>
                       </div>
                    )}
                  </div>
               </div>
               )}
               <div ref={sourceContainerRef} className={`flex-1 relative ${isFocusMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border rounded-[1.5rem] shadow-inner overflow-hidden flex flex-col group`}>
                 <button 
                   onClick={() => setIsLeftExpanded(false)}
                   className="absolute top-4 right-4 z-30 p-2 bg-slate-100/80 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-lg transition-all shadow-sm opacity-50 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                   title="Fold Input Area"
                   aria-label="Fold Input Area"
                 >
                   <ChevronLeft size={16} />
                 </button>
                 <div className="flex-1 overflow-hidden relative">
                    {glossaryMatches.length > 0 && (
                      <div className="absolute top-0 left-0 right-0 z-20 px-4 py-2 bg-emerald-50/80 backdrop-blur-sm border-b border-emerald-100 flex items-center gap-3 animate-fadeIn">
                        <div className="flex items-center gap-1.5 text-[9px] font-black text-emerald-600 uppercase tracking-widest">
                          <Book size={10} />
                          Glossary Matches:
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {glossaryMatches.map(term => (
                            <span key={term} className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[8px] font-bold rounded-full border border-emerald-200">
                              {term}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {visualContext && (
                      <div className="absolute bottom-4 right-4 z-30 group">
                        <div className="relative w-24 h-24 rounded-xl border-2 border-white shadow-2xl overflow-hidden transition-all group-hover:w-48 group-hover:h-48">
                          <img src={visualContext} alt="Visual Context" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          <button 
                            onClick={() => setVisualContext(null)}
                            className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                            aria-label="Remove Visual Context"
                          >
                            <X size={10} />
                          </button>
                        </div>
                        <div className="absolute -top-8 right-0 bg-amber-600 text-white text-[7px] font-black uppercase tracking-widest px-2 py-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                          Visual Context Analysis Active
                        </div>
                      </div>
                    )}
                    {renderSourceWithHighlights()}
                 </div>
                 
                 {/* Neural Terminology Harvesting Suggestions */}
                 {suggestedTerms.length > 0 && (
                   <div className="bg-indigo-50/80 backdrop-blur-md border-t border-indigo-200 p-3 animate-slideUp">
                     <div className="flex items-center justify-between mb-2 px-1">
                       <div className="flex items-center gap-2">
                         <Library size={10} className="text-indigo-600" />
                         <span className="text-[8px] font-black text-indigo-600 uppercase tracking-widest">Neural Terminology Harvesting</span>
                       </div>
                       <div className="flex items-center gap-2">
                         {isHarvestingTerms && (
                           <div className="flex items-center gap-1.5">
                             <RefreshCw size={8} className="text-indigo-400 animate-spin" />
                             <span className="text-[7px] font-bold text-indigo-400 uppercase">Scanning Matrix...</span>
                           </div>
                         )}
                         <button
                           onClick={() => {
                             const newItems: GlossaryItem[] = suggestedTerms.map(s => ({
                               term: s.term,
                               definition: s.definition
                             }));
                             onUpdateGlossary([...glossary, ...newItems]);
                             setSuggestedTerms([]);
                           }}
                           className="px-2 py-1 bg-indigo-600 text-white rounded text-[7px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors"
                         >
                           Accept All
                         </button>
                         <button
                           onClick={() => setSuggestedTerms([])}
                           className="px-2 py-1 bg-slate-200 text-slate-600 rounded text-[7px] font-black uppercase tracking-widest hover:bg-slate-300 transition-colors"
                         >
                           Reject All
                         </button>
                       </div>
                     </div>
                     <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
                       {suggestedTerms.map((suggestion) => (
                         <div 
                           key={suggestion.id}
                           className="flex-shrink-0 w-[200px] p-3 bg-white border border-indigo-100 rounded-2xl transition-all hover:border-indigo-300 hover:shadow-md group relative"
                         >
                           <div className="flex items-center justify-between mb-1.5">
                             <span className="text-[10px] font-black text-indigo-900 uppercase tracking-widest truncate max-w-[120px]" title={suggestion.term}>
                               {suggestion.term}
                             </span>
                             <span className={`text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full ${
                               suggestion.priority === 'High' ? 'bg-rose-100 text-rose-600' :
                               suggestion.priority === 'Medium' ? 'bg-amber-100 text-amber-600' :
                               'bg-emerald-100 text-emerald-600'
                             }`}>
                               {suggestion.priority}
                             </span>
                           </div>
                           <p className="text-[9px] font-medium text-slate-500 leading-relaxed line-clamp-2 mb-2 italic" title={suggestion.definition}>
                             "{suggestion.definition}"
                           </p>
                           <div className="flex items-center justify-between">
                             <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter truncate max-w-[100px]" title={suggestion.reason}>
                               {suggestion.reason}
                             </span>
                             <div className="flex items-center gap-1">
                               <button 
                                 onClick={() => setSuggestedTerms(prev => prev.filter(s => s.id !== suggestion.id))}
                                 className="p-1.5 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition-all active:scale-90"
                                 title="Reject Term"
                                 aria-label="Reject Term"
                               >
                                 <X size={10} />
                               </button>
                               <button 
                                 onClick={() => handleAddSuggestedTerm(suggestion)}
                                 className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all active:scale-90"
                                 title="Add to Glossary"
                                 aria-label="Add to Glossary"
                               >
                                 <Plus size={10} />
                               </button>
                             </div>
                           </div>
                         </div>
                       ))}
                     </div>
                   </div>
                 )}

                 {/* Quick Insertion Memory Suggestions */}
                 {memorySuggestions.length > 0 && !isLoading && (
                   <div className="bg-amber-50/80 backdrop-blur-md border-t border-amber-200 p-3 animate-slideUp">
                     <div className="flex items-center justify-between mb-2 px-1">
                       <div className="flex items-center gap-2">
                         <Database size={10} className="text-amber-600" />
                         <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest">Neural Memory Suggestions</span>
                       </div>
                       <span className="text-[7px] font-bold text-amber-400 uppercase">{memorySuggestions.length} Matches Found</span>
                     </div>
                     <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
                      {memorySuggestions.map((match) => (
                        <div 
                          key={match.id}
                          className="flex-shrink-0 w-[240px] p-3 bg-white border border-indigo-200 rounded-2xl transition-all text-left group relative hover:border-indigo-400 hover:shadow-md"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                               <Brain size={10} className="text-indigo-500" />
                               <span className="text-[8px] font-black uppercase tracking-widest text-indigo-600">
                                 {Math.round(match.similarity * 100)}% Semantic Match
                               </span>
                             </div>
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(match.targetSegment);
                                }}
                                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-indigo-600"
                                title="Copy Target"
                                aria-label="Copy Target"
                              >
                                <Copy size={10} />
                              </button>
                              <button 
                                onClick={() => applyMemoryMatch(match)}
                                className="p-1.5 hover:bg-indigo-600 hover:text-white rounded-lg transition-all text-indigo-600 bg-indigo-50"
                                title="Apply Suggestion"
                                aria-label="Apply Suggestion"
                              >
                                <Zap size={10} fill="currentColor" />
                              </button>
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex flex-col">
                              <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Source Pattern</span>
                              <p className="text-[10px] font-bold text-slate-700 line-clamp-2 italic leading-tight">"{match.sourceSegment}"</p>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[7px] font-black text-indigo-400 uppercase tracking-widest">Neural Proposal</span>
                              <p className="text-[10px] font-black text-indigo-900 line-clamp-2 leading-tight">"{match.targetSegment}"</p>
                            </div>
                          </div>
                        </div>
                      ))}
                     </div>
                   </div>
                 )}

                 {showComplexityAudit && (
                    <LinguisticAuditorPanel 
                      terms={complexTerms} 
                      isLoading={isAnalyzingComplexity} 
                      onClose={() => setShowComplexityAudit(false)} 
                    />
                 )}
               </div>
            </div>
          )}
          {!isLeftExpanded && (
            <div className="flex-1 flex flex-col items-center py-4 relative group">
              <button 
                onClick={() => setIsLeftExpanded(true)}
                className="absolute top-4 right-4 z-30 p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg shadow-sm transition-all"
                title="Expand Input Area"
              >
                <ChevronRight size={16} />
              </button>
              <div className="mt-12 flex-1 flex items-center justify-center">
                <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em]" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                  Source Text
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Translation Output Side */}
        <div className={`transition-all duration-500 flex flex-col relative overflow-hidden ${isFocusMode ? 'bg-slate-900/60' : ''} ${isLeftExpanded ? 'w-full min-h-[300px]' : 'flex-1'}`}>
           <div className="flex-1 flex flex-col p-3 overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <LanguageSelector value={targetLang} onChange={(lang) => {
                  setTargetLang(lang);
                  if (ws && roomId) ws.send(JSON.stringify({ type: 'update', state: { targetLang: lang } }));
                }} className="w-[150px]" />
                {!isFocusMode && (
                  <div className="flex gap-1 items-center bg-white/5 p-1 rounded-lg border border-white/10 shadow-glass-inset">
                     <button 
                       onClick={() => setUseGrounding(!useGrounding)} 
                       className={`p-1.5 rounded-md transition-all flex items-center gap-2 ${useGrounding ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-indigo-600 hover:bg-white'}`}
                       title="Fact-Checked Grounding"
                     >
                       <Globe size={14} />
                       {useGrounding && <span className="text-[8px] font-black uppercase tracking-widest">Grounded</span>}
                     </button>
                     <button onClick={handlePrint} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-md transition-all" title="Print Output"><Printer size={14} /></button>
                     <button onClick={handleExportText} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-md transition-all" title="Download as TXT"><Download size={14} /></button>
                     <button onClick={handleShare} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-md transition-all" title="Share Synthesis"><Share2 size={14} /></button>
                     <button onClick={handleSaveToCloud} disabled={isSavingToCloud} className={`p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-white rounded-md transition-all ${isSavingToCloud ? 'animate-pulse' : ''}`} title="Cloud Sync"><Cloud size={14} /></button>
                     <button onClick={handleCommitToMemory} disabled={isCommittingToMemory} className={`p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-md transition-all ${isCommittingToMemory ? 'animate-pulse' : ''}`} title="Commit to Translation Memory"><Database size={14} /></button>
                     <button onClick={handleCopyOutput} className={`p-1.5 rounded-md transition-all ${isCopied ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-indigo-600 hover:bg-white'}`} title="Copy to Buffer">{isCopied ? <Check size={14}/> : <Copy size={14} />}</button>
                     <button 
                       onClick={() => setIsTTSEnabled(!isTTSEnabled)} 
                       className={`p-1.5 rounded-md transition-all ${isTTSEnabled ? 'bg-amber-500 text-white shadow-md' : 'text-slate-400 hover:text-amber-500 hover:bg-white'}`} 
                       title={isTTSEnabled ? "Auto-Read Enabled" : "Auto-Read Disabled"}
                     >
                       <Volume2 size={14} />
                     </button>
                     <div className="w-px h-3 bg-slate-200 self-center mx-1" />
                     <button onClick={handleVerify} disabled={isVerifying} className={`p-1.5 rounded-md transition-all ${showVerifyPanel ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-emerald-600 hover:bg-white'}`} title="AI Accuracy Audit">
                       {isVerifying ? <RefreshCw size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                     </button>
                     <button onClick={handleAudit} disabled={isAuditing} className={`p-1.5 border-none rounded-md transition-all ${showAudit ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-400 hover:text-amber-600 hover:bg-white'}`} title="Post-Edit Audit">
                       {isAuditing ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
                     </button>
                     <button onClick={handleAnalyzeTone} disabled={isAnalyzingTone} className={`p-1.5 border-none rounded-md transition-all ${showToneRadar ? 'bg-pink-600 text-white shadow-lg' : 'text-slate-400 hover:text-pink-600 hover:bg-white'}`} title="Tone & Nuance Radar">
                       {isAnalyzingTone ? <RefreshCw size={14} className="animate-spin" /> : <Activity size={14} />}
                     </button>
                  </div>
                )}
              </div>

              {translatedText && !isEditingOutput && !showAudit && !showVerifyPanel && !showToneRadar && (
                <div className="mx-3 mb-3 p-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between animate-fadeIn overflow-x-auto custom-scrollbar">
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-2 shrink-0 flex items-center gap-1">
                      <Sparkles size={10} /> Enhance
                    </span>
                    <div className="h-4 w-px bg-slate-200 shrink-0" />
                    <div className="flex gap-1 shrink-0">
                      <button 
                        onClick={() => handleImprove('humanize')} 
                        disabled={isImproving}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-600 hover:bg-white hover:text-indigo-600 hover:shadow-sm transition-all disabled:opacity-50"
                        title="Make it sound more natural and native"
                      >
                        {isImproving && improvementType === 'humanize' ? <RefreshCw size={12} className="animate-spin" /> : <User size={12} />}
                        <span className="text-[9px] font-black uppercase tracking-wider">Humanize</span>
                      </button>
                      <button 
                        onClick={() => handleImprove('grammar')} 
                        disabled={isImproving}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-600 hover:bg-white hover:text-indigo-600 hover:shadow-sm transition-all disabled:opacity-50"
                        title="Fix grammar and styling"
                      >
                        {isImproving && improvementType === 'grammar' ? <RefreshCw size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                        <span className="text-[9px] font-black uppercase tracking-wider">Grammar</span>
                      </button>
                      <button 
                        onClick={() => handleImprove('simplify')} 
                        disabled={isImproving}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-600 hover:bg-white hover:text-indigo-600 hover:shadow-sm transition-all disabled:opacity-50"
                        title="Make it easier to read"
                      >
                        {isImproving && improvementType === 'simplify' ? <RefreshCw size={12} className="animate-spin" /> : <Minimize2 size={12} />}
                        <span className="text-[9px] font-black uppercase tracking-wider">Simplify</span>
                      </button>
                      <button 
                        onClick={() => handleImprove('formalize')} 
                        disabled={isImproving}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-600 hover:bg-white hover:text-indigo-600 hover:shadow-sm transition-all disabled:opacity-50"
                        title="Make it more professional"
                      >
                        {isImproving && improvementType === 'formalize' ? <RefreshCw size={12} className="animate-spin" /> : <Briefcase size={12} />}
                        <span className="text-[9px] font-black uppercase tracking-wider">Formalize</span>
                      </button>
                      <button 
                        onClick={() => handleImprove('creative')} 
                        disabled={isImproving}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-600 hover:bg-white hover:text-indigo-600 hover:shadow-sm transition-all disabled:opacity-50"
                        title="Add creative flair"
                      >
                        {isImproving && improvementType === 'creative' ? <RefreshCw size={12} className="animate-spin" /> : <Palette size={12} />}
                        <span className="text-[9px] font-black uppercase tracking-wider">Creative</span>
                      </button>
                      <button 
                        onClick={() => handleImprove('shorten')} 
                        disabled={isImproving}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-600 hover:bg-white hover:text-indigo-600 hover:shadow-sm transition-all disabled:opacity-50"
                        title="Make it more concise"
                      >
                        {isImproving && improvementType === 'shorten' ? <RefreshCw size={12} className="animate-spin" /> : <Zap size={12} />}
                        <span className="text-[9px] font-black uppercase tracking-wider">Shorten</span>
                      </button>
                      <button 
                        onClick={() => handleImprove('expand')} 
                        disabled={isImproving}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-600 hover:bg-white hover:text-indigo-600 hover:shadow-sm transition-all disabled:opacity-50"
                        title="Elaborate and add detail"
                      >
                        {isImproving && improvementType === 'expand' ? <RefreshCw size={12} className="animate-spin" /> : <Maximize2 size={12} />}
                        <span className="text-[9px] font-black uppercase tracking-wider">Expand</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {peMetrics && (
                <div className="mx-3 mb-3 p-3 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex items-center justify-between animate-fadeIn">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Edit Distance</span>
                      <span className="text-xs font-black text-indigo-900">{peMetrics.editDistance}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Similarity</span>
                      <span className="text-xs font-black text-indigo-900">{peMetrics.similarity}%</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">PE Effort</span>
                      <span className={`text-xs font-black ${peMetrics.effort > 50 ? 'text-rose-600' : peMetrics.effort > 20 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {peMetrics.effort}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[8px] font-black uppercase">
                      <Plus size={10} /> {peMetrics.addedChars}
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 bg-rose-100 text-rose-700 rounded-lg text-[8px] font-black uppercase">
                      <X size={10} /> {peMetrics.removedChars}
                    </div>
                  </div>
                </div>
              )}

               <div 
                 ref={outputContainerRef} 
                 onClick={() => !isLoading && !showAudit && !showVerifyPanel && !showToneRadar && setIsEditingOutput(true)}
                 className="flex-1 bg-white border border-slate-200 rounded-[1.5rem] overflow-hidden relative shadow-inner"
               >
                {isLoading ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-40">
                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.4em] mt-4">Neural Recalibration...</p>
                  </div>
                ) : showToneRadar ? (
                 <div className="h-full overflow-y-auto p-5 custom-scrollbar relative">
                   <button onClick={() => setShowToneRadar(false)} className="absolute top-4 right-4 p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg transition-all z-10">
                     <X size={14} />
                   </button>
                   <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                     <Activity className="text-pink-500" size={16} /> Tone & Nuance Radar
                   </h3>
                   {isAnalyzingTone ? (
                     <div className="h-48 flex flex-col items-center justify-center opacity-40">
                       <div className="w-12 h-12 border-4 border-pink-600 border-t-transparent rounded-full animate-spin" />
                       <p className="text-[10px] font-black text-pink-600 uppercase tracking-[0.4em] mt-4">Analyzing Emotional Shift...</p>
                     </div>
                   ) : toneAnalysis ? (
                     <div className="flex flex-col gap-6 animate-fadeIn">
                       <div className="h-64 w-full">
                         <ResponsiveContainer width="100%" height="100%">
                           <RadarChart cx="50%" cy="50%" outerRadius="80%" data={toneAnalysis.metrics}>
                             <PolarGrid stroke="#e2e8f0" />
                             <PolarAngleAxis dataKey="metric" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
                             <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 9 }} />
                             <Radar name="Source" dataKey="sourceScore" stroke="#94a3b8" fill="#cbd5e1" fillOpacity={0.4} />
                             <Radar name="Target" dataKey="targetScore" stroke="#ec4899" fill="#f472b6" fillOpacity={0.5} />
                           </RadarChart>
                         </ResponsiveContainer>
                       </div>
                       <div className="flex items-center justify-center gap-6 text-[10px] font-black uppercase tracking-widest">
                         <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-slate-300" /> Source ({sourceLang})</div>
                         <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-pink-400" /> Target ({targetLang})</div>
                       </div>
                       <div className="bg-pink-50 border border-pink-100 rounded-xl p-4">
                         <h4 className="text-[10px] font-black text-pink-800 uppercase tracking-widest mb-2">Nuance Analysis</h4>
                         <p className="text-[12px] text-pink-900 leading-relaxed font-medium">{toneAnalysis.analysis}</p>
                       </div>
                       {toneAnalysis.warnings.length > 0 && (
                         <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex flex-col gap-2">
                           <h4 className="text-[10px] font-black text-red-800 uppercase tracking-widest flex items-center gap-1.5">
                             <AlertTriangle size={12} /> Tone Mismatch Warnings
                           </h4>
                           <ul className="list-disc list-inside text-[11px] text-red-700 font-medium space-y-1">
                             {toneAnalysis.warnings.map((w, i) => <li key={i}>{w}</li>)}
                           </ul>
                         </div>
                       )}
                     </div>
                   ) : (
                     <div className="h-48 flex items-center justify-center text-[11px] font-bold text-slate-400">
                       Click the radar icon to analyze tone shift.
                     </div>
                   )}
                 </div>
               ) : showAudit ? (
                   <div className="h-full overflow-y-auto p-5 custom-scrollbar">
                     <AuditMatrix report={npeReport} isLoading={isAuditing} onApply={(r) => { setTranslatedText(r); if (ws && roomId) ws.send(JSON.stringify({ type: 'update', state: { translatedText: r } })); setOriginalMT(r); setPEMetrics(null); setShowAudit(false); }} onDiscard={() => setShowAudit(false)} targetLang={targetLang} />
                   </div>
                ) : showVerifyPanel ? (
                   <div className="h-full overflow-y-auto p-5 custom-scrollbar">
                     {isVerifying ? (
                      <div className="h-full flex flex-col items-center justify-center opacity-40">
                        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.4em] mt-4">Performing Neural Audit...</p>
                      </div>
                     ) : verifyReport ? (
                      <TranslationQualityPanel report={verifyReport} onClose={() => setShowVerifyPanel(false)} />
                     ) : null}
                   </div>
                ) : isEditingOutput ? (
                  <SmartCompose 
                    value={translatedText}
                    onChange={(val) => {
                      setTranslatedText(val);
                      if (ws && roomId) ws.send(JSON.stringify({ type: 'update', state: { translatedText: val } }));
                    }}
                    targetLang={targetLang}
                    field={field}
                    glossary={glossary}
                    memory={translationMemory}
                    placeholder="Refine synthesis..."
                    className="h-full w-full p-8 text-[15px] font-bold text-slate-900"
                    onKeyDown={(e) => { if (e.key === 'Escape' || ((e.ctrlKey || e.metaKey) && e.key === 'Enter')) setIsEditingOutput(false); }}
                  />
                ) : (
                  <div className="h-full overflow-y-auto p-8 custom-scrollbar space-y-6">
                    <div className="markdown-body text-[10px] font-bold text-slate-900 leading-normal">
                      {translatedText ? (
                        <Markdown 
                          remarkPlugins={[remarkGfm, remarkMath]} 
                          rehypePlugins={[rehypeKatex, rehypeRaw]}
                        >
                          {translatedText}
                        </Markdown>
                      ) : (
                        <p className="whitespace-pre-wrap text-[12px]">Awaiting synaptic cycle...</p>
                      )}
                    </div>

                    {groundingSources.length > 0 && (
                      <div className="mt-8 pt-6 border-t border-slate-100 animate-fadeIn">
                        <div className="flex items-center gap-2 mb-4">
                          <Globe size={14} className="text-indigo-600" />
                          <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Neural Grounding Sources</h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {groundingSources.map((source, i) => (
                            <a 
                              key={i} 
                              href={source.uri} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="p-3 bg-slate-50 border border-slate-100 rounded-xl hover:border-indigo-300 hover:bg-indigo-50/30 transition-all group flex flex-col gap-1"
                            >
                              <span className="text-[10px] font-bold text-slate-700 truncate group-hover:text-indigo-600">{source.title}</span>
                              <span className="text-[8px] font-medium text-slate-400 truncate">{source.uri}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {(powerhouseAudit || refinementExplanation || contextUsed.length > 0) && (
                      <div className="mt-8 pt-6 border-t border-slate-100 animate-fadeIn space-y-6">
                        <div className="flex items-center gap-2 mb-2">
                          <Cpu size={14} className="text-indigo-600" />
                          <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Synthesis Insights</h4>
                        </div>

                        {powerhouseAudit && (
                          <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <ShieldCheck size={14} className="text-indigo-600" />
                                <span className="text-[9px] font-black text-indigo-900 uppercase tracking-widest">Neural Quality Audit</span>
                              </div>
                              <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${powerhouseAudit.overallScore >= 90 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                Score: {powerhouseAudit.overallScore}%
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {Object.entries(powerhouseAudit.evaluation).map(([category, data]) => (
                                <div key={category} className="flex items-center justify-between p-2 bg-white/50 rounded-lg border border-indigo-50">
                                  <span className="text-[8px] font-bold text-slate-500 uppercase">{category}</span>
                                  <span className={`text-[8px] font-black ${data.status === 'optimal' ? 'text-emerald-600' : 'text-amber-600'}`}>{data.score}%</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {refinementExplanation && (
                          <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Sparkles size={14} className="text-amber-600" />
                              <span className="text-[9px] font-black text-amber-900 uppercase tracking-widest">Refinement Logic</span>
                            </div>
                            <p className="text-[11px] font-medium text-amber-800 leading-relaxed italic">
                              "{refinementExplanation}"
                            </p>
                          </div>
                        )}

                        {contextUsed.length > 0 && (
                          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <Database size={14} className="text-slate-600" />
                              <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest">RAG Context Injected</span>
                            </div>
                            <div className="space-y-2">
                              {contextUsed.map((ctx, i) => (
                                <div key={i} className="text-[10px] font-medium text-slate-600 bg-white p-2 rounded-lg border border-slate-100 line-clamp-2">
                                  {ctx}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {isCulturalAgentEnabled && culturalAnalysis && (
                      <div className="mt-8 pt-6 border-t border-slate-100 animate-fadeIn space-y-6">
                        <div className="flex items-center gap-2 mb-2">
                          <Globe size={14} className="text-emerald-600" />
                          <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Cultural Adaptation Insights</h4>
                        </div>

                        {culturalAnalysis.nuances.length > 0 && (
                          <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4">
                            <h4 className="text-[9px] font-black text-emerald-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                              <Sparkles size={12} className="text-emerald-600" />
                              Cultural Nuances Detected
                            </h4>
                            <div className="space-y-3">
                              {culturalAnalysis.nuances.map((n, i) => (
                                <div key={i} className="bg-white/60 p-3 rounded-xl border border-emerald-50">
                                  <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-1">{n.term}</p>
                                  <p className="text-[11px] font-medium text-emerald-900 leading-relaxed mb-2">{n.explanation}</p>
                                  <div className="flex items-start gap-2 p-2 bg-emerald-100/50 rounded-lg">
                                    <Check size={12} className="text-emerald-600 mt-0.5 shrink-0" />
                                    <p className="text-[10px] font-bold text-emerald-800 italic">Adaptation: {n.suggestion}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {culturalAnalysis.idioms.length > 0 && (
                          <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4">
                            <h4 className="text-[9px] font-black text-indigo-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                              <Languages size={12} className="text-indigo-600" />
                              Idiomatic Equivalents
                            </h4>
                            <div className="space-y-3">
                              {culturalAnalysis.idioms.map((idiom, i) => (
                                <div key={i} className="bg-white/60 p-3 rounded-xl border border-indigo-50">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest line-through decoration-slate-300">{idiom.original}</span>
                                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{idiom.equivalent}</span>
                                  </div>
                                  <p className="text-[10px] font-medium text-indigo-900 italic">Meaning: {idiom.meaning}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {culturalAnalysis.sensitivity.length > 0 && (
                          <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-4">
                            <h4 className="text-[9px] font-black text-rose-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                              <AlertTriangle size={12} className="text-rose-600" />
                              Sensitivity Warnings
                            </h4>
                            <div className="space-y-3">
                              {culturalAnalysis.sensitivity.map((s, i) => (
                                <div key={i} className="bg-white/60 p-3 rounded-xl border border-rose-50 flex items-start gap-3">
                                  <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest shrink-0 mt-0.5 ${
                                    s.severity === 'High' ? 'bg-rose-600 text-white' : 
                                    s.severity === 'Medium' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600'
                                  }`}>
                                    {s.severity}
                                  </div>
                                  <div>
                                    <p className="text-[11px] font-bold text-rose-900 mb-1">{s.issue}</p>
                                    <p className="text-[10px] font-medium text-rose-800 italic">{s.advice}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                {isEditingOutput && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsEditingOutput(false); }}
                    className="absolute top-4 right-4 p-2 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-all z-20"
                    title="Exit Refinement Mode"
                  >
                    <Check size={16} />
                  </button>
                )}
              </div>
           </div>
        </div>
      </div>

      {/* Global Lookup Tooltip */}
      {(isFetchingSelection || selectionInfo || hoveredTerm) && (
        <div 
          className="fixed z-[1001] -translate-x-1/2 bg-white border-2 border-indigo-100 rounded-[2.5rem] shadow-[0_30px_90px_-15px_rgba(0,0,0,0.4)] p-0 min-w-[340px] max-w-[400px] animate-fadeIn overflow-hidden"
          style={{ left: tooltipPos.x, top: tooltipPos.y, transform: 'translate(-50%, -100%)' }}
        >
          {isFetchingSelection ? (
            <div className="flex flex-col items-center justify-center py-8 gap-4 bg-white">
               <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
               <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Querying Neural Core...</p>
            </div>
          ) : (selectionInfo || hoveredTerm) && (
            <div className="flex flex-col">
              <div className={`h-1.5 w-full ${getTermTypeStyles((selectionInfo || hoveredTerm)!.type, (selectionInfo || hoveredTerm)!.isGlossaryMatch).split(' ')[0]}`} />
              <div className="p-8 space-y-5 bg-white">
                <div className="flex items-start justify-between border-b border-slate-50 pb-4">
                  <div className="flex flex-col gap-1.5">
                     <div className="flex items-center gap-3">
                        <span className="text-xl font-black text-slate-900 tracking-tight">{(selectionInfo || hoveredTerm)!.term}</span>
                        <span className={`flex items-center gap-1.5 text-[8px] font-black uppercase px-2 py-1 rounded-lg border ${getTermTypeStyles((selectionInfo || hoveredTerm)!.type, (selectionInfo || hoveredTerm)!.isGlossaryMatch)}`}>
                          {getTermTypeIcon((selectionInfo || hoveredTerm)!.type)}
                          {getTermTypeLabel((selectionInfo || hoveredTerm)!.type, (selectionInfo || hoveredTerm)!.isGlossaryMatch)}
                        </span>
                     </div>
                  </div>
                  <button onClick={closeTooltips} className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors"><X size={20} strokeWidth={3} /></button>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest ml-1">Linguistic Definition</span>
                    <p className="text-[13px] font-bold text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100 italic">"{(selectionInfo || hoveredTerm)!.definition}"</p>
                  </div>
                  <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl">
                     <span className="text-[8px] font-black text-indigo-400 uppercase block mb-1.5">Contextual Usage</span>
                     <p className="text-[11px] font-medium text-slate-500 leading-relaxed">{(selectionInfo || hoveredTerm)!.context}</p>
                  </div>
                </div>
                {!selectionInfo?.isGlossaryMatch && (
                  <button 
                    onClick={() => {
                      const term = (selectionInfo || hoveredTerm)!;
                      onUpdateGlossary([...glossary, { term: term.term, definition: term.definition }]);
                      closeTooltips();
                    }}
                    className="w-full py-3.5 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-900/20 hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Plus size={14} strokeWidth={3} />
                    Add to Repository
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hidden inputs for uploading files directly */}
      <input 
        type="file" 
        ref={visualInputRef} 
        onChange={handleVisualUpload} 
        className="hidden" 
        accept="image/*"
      />
      <input 
        type="file" 
        ref={referenceInputRef} 
        onChange={handleReferenceUpload} 
        className="hidden" 
        accept=".txt,.pdf,.md,.doc,.docx,.csv,.json,.ppt,.pptx,.png,.jpg,.jpeg,.webp"
      />
    </div>
  );
};

export default TextTranslator;
