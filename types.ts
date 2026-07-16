
export type ProfessionalField = 
  | 'General' 
  | 'Medical' 
  | 'Legal' 
  | 'Technical' 
  | 'Creative' 
  | 'Academic' 
  | 'Literature' 
  | 'Scientific' 
  | 'Religious' 
  | 'Financial' 
  | 'IT'
  | 'Engineering'
  | 'Marketing'
  | 'Automotive'
  | 'Aviation'
  | 'Energy'
  | 'Environmental'
  | 'Government'
  | 'Military'
  | 'Patent'
  | 'Pharmaceutical'
  | 'Tourism'
  | 'Geology'
  | 'History';
export type TranslationTone = 'Standard' | 'Formal' | 'Casual' | 'Professional' | 'Poetic';
export interface PersonaExample {
  source: string;
  target: string;
  context?: string;
}

export interface PersonaDefinition {
  id: string;
  name: string;
  description: string;
  baseInstruction: string;
  examples: PersonaExample[];
  isCustom?: boolean;
}

export type LinguisticPersona = string | PersonaDefinition;
export type MQMCertificationLevel = 'Clinical Grade' | 'Legal Grade' | 'Professional Grade' | 'Operational Grade' | 'Substandard';

export interface GlossaryItem {
  term: string;
  definition: string;
}

export interface SuggestedGlossaryItem extends GlossaryItem {
  id: string;
  reason: string;
  context: string;
  priority: 'High' | 'Medium' | 'Low';
}

export interface PhrasebookItem {
  id: string;
  source: string;
  target: string;
  sourceLang: string;
  targetLang: string;
  timestamp: number;
}

export interface LinguisticTerm {
  id: string;
  term: string;
  definition: string;
  context: string;
  alternative: string;
  type: 'technical' | 'idiomatic' | 'ambiguous' | 'important';
  isGlossaryMatch?: boolean;
}

export interface DictionaryEntry {
  id: string;
  sourceLang: string;
  targetLang: string;
  sourceTerm: string;
  targetTerm: string;
  notes?: string;
}

export interface TranslationMemoryEntry {
  id: string;
  sourceLang: string;
  targetLang: string;
  sourceSegment: string;
  targetSegment: string;
  usageCount: number;
  lastUsed: number;
  embedding?: number[];
  status?: 'active' | 'flagged' | 'healed' | 'deprecated';
  confidenceScore?: number;
  healingSuggestions?: string[];
  lastHealed?: number;
}

export interface NeuralSegment {
  id: string;
  text: string;
  isLocked: boolean;
}

export interface NPEChange {
  type: 'addition' | 'deletion' | 'stable';
  text: string;
}

export interface NPEReport {
  original: string;
  revised: string;
  diff: NPEChange[];
  explanation: string;
}

export interface VerificationReport {
  score: number;
  backTranslation: string;
  feedback: string;
  isConsistent: boolean;
}

export interface BatchJob {
  id: string;
  fileIds: string[];
  status: 'idle' | 'processing' | 'completed' | 'failed';
  progress: number;
  targetLang: string;
  startTime?: number;
}

export interface UserPreferences {
  id: string;
  globalInstructions: string;
  preferredTone: string;
  formattingRules: string;
  autoApply: boolean;
}

export interface Collaborator {
  id: string;
  name: string;
  role: 'Editor' | 'Reviewer' | 'AI Auditor' | 'Project Lead';
  status: 'active' | 'idle' | 'offline';
  avatar?: string;
  color?: string;
  cursor?: {
    field: 'source' | 'target';
    index: number;
  };
}

export interface CollaborationActivity {
  id: string;
  user: string;
  action: string;
  timestamp: number;
  snippet?: string;
}

export interface PEMetrics {
  editDistance: number;
  similarity: number;
  effort: number;
  addedChars: number;
  removedChars: number;
}

export interface TranslationVersion {
  id: string;
  text: string;
  timestamp: number;
  author: string;
  note?: string;
}

export interface TranslationHistoryItem {
  id: string;
  sourceText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  field: ProfessionalField;
  persona?: LinguisticPersona;
  timestamp: number;
  type: 'text' | 'image' | 'voice' | 'website' | 'code' | 'collab' | 'compare' | 'broadcast' | 'inpaint' | 'dubbing' | 'subtitles';
  qualityReport?: TranslationQualityReport;
  powerhouseAudit?: TranslationQualityReport;
  refinementExplanation?: string;
  contextUsed?: string[];
  peMetrics?: PEMetrics;
  originalMT?: string;
  priority?: 'Low' | 'Medium' | 'High' | 'Critical';
  versions?: TranslationVersion[];
}

export interface SavedLookup {
  id: string;
  word: string;
  lang: string;
  definition?: string;
  context?: string;
  examples?: string[];
  alternatives?: string[];
  pos?: string;
  nuance?: string;
  frequency?: string;
  isSource: boolean;
  timestamp: number;
}

export interface Language {
  name: string;
  flag: string;
}

export interface SynthesisCheckpoint {
  id: string;
  content: string;
  timestamp: number;
  label: string;
}

export interface SemanticChunk {
  id: string;
  text: string;
  embedding?: number[];
  startIndex: number;
  endIndex: number;
}

export interface UploadedFile {
  id: string;
  name: string;
  size: string;
  type: 'DOC' | 'AUDIO' | 'GLOSSARY' | 'EXCEL' | 'PDF' | 'IMAGE';
  mimeType: string;
  timestamp: number;
  processed?: boolean;
  content?: string;
  batchSelected?: boolean;
  checkpoints?: SynthesisCheckpoint[];
  chunks?: SemanticChunk[];
}

export interface OfflinePack {
  langName: string;
  downloadedAt: number;
  phrases: Record<string, string>;
}

export interface StyleGuide {
  id: string;
  name: string;
  tone?: string;
  instructions: string;
  examples: { source: string; target: string }[];
  lastUpdated: number;
}

export interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  fileIds: string[];
  createdAt: number;
  updatedAt: number;
  isActive: boolean;
}

export type TranslationMode = 'text' | 'document' | 'image' | 'collab' | 'live' | 'offline' | 'website' | 'code' | 'compare' | 'broadcast' | 'inpaint' | 'lqa' | 'dubbing' | 'subtitles' | 'batch' | 'interpreter' | 'styleguide' | 'canvas' | 'workflow' | 'video-suite' | 'knowledge-base' | 'terminology-extraction' | 'cultural-intelligence' | 'dtp' | 'ci-cd' | 'ar-vr' | 'transcreation' | 'typography' | 'dojo' | 'sentiment' | 'compliance' | 'sign-language' | 'anonymization' | 'operations' | 'next-gen-ai' | 'ecosystem' | 'admin' | 'ui-sync' | 'agent-workflow';

export type ImprovementType = 'humanize' | 'grammar' | 'simplify' | 'formalize' | 'creative' | 'shorten' | 'expand';

export type UITranslationMap = Record<string, Record<string, string>>;

export interface SourceQualityMetric {
  label: string;
  score: number;
  status: 'optimal' | 'warning' | 'critical';
}

export interface SourceQualityReport {
  overallScore: number;
  metrics: Record<string, SourceQualityMetric>;
  issues: {
    category: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    suggestion: string;
  }[];
}

export interface MQMCategoryScore {
  score: number;
  status: 'optimal' | 'warning' | 'critical';
}

export interface TranslationQualityReport {
  auditId: string;
  overallScore: number;
  certification: MQMCertificationLevel;
  evaluation: Record<string, MQMCategoryScore>;
  critiques: {
    dimension: string;
    severity: 'Minor' | 'Major' | 'Critical';
    finding: string;
    improvement: string;
  }[];
}

export interface ComparisonReport {
  summary: string;
  similarityScore: number;
  optimizedSynthesis: string;
  differences: {
    type: 'Structural' | 'Linguistic' | 'Semantic';
    severity: 'Minor' | 'Moderate' | 'Critical';
    fragmentA: string;
    fragmentB: string;
    analysis: string;
  }[];
}

export type WorkflowStageStatus = 'pending' | 'active' | 'completed' | 'failed';

export interface WorkflowStage {
  id: string;
  type: 'ingestion' | 'glossary' | 'synthesis' | 'audit' | 'refinement' | 'export';
  label: string;
  status: WorkflowStageStatus;
  data?: any;
  timestamp?: number;
  assignedTo?: string; // User ID
}

export interface ProjectWorkflow {
  id: string;
  name: string;
  description: string;
  field: ProfessionalField;
  targetLang: string;
  stages: WorkflowStage[];
  currentStageIndex: number;
  createdAt: number;
  updatedAt: number;
  isCollaborative?: boolean;
  roomId?: string;
  ownerId: string;
}

export interface BatchProject {
  id: string;
  name: string;
  createdAt: number;
  status: 'draft' | 'processing' | 'completed' | 'failed';
  totalFiles: number;
  completedFiles: number;
  targetLang: string;
  field: ProfessionalField;
  files: any[]; // We'll store the files here
}

export interface ProjectScope {
  recommendedField: ProfessionalField;
  recommendedPersona: string;
  complexityScore: number; // 0-100
  estimatedEffort: 'Low' | 'Medium' | 'High';
  keyTerminology: string[];
  potentialChallenges: {
    category: string;
    description: string;
    mitigation: string;
  }[];
  suggestedTone: TranslationTone;
  audienceAnalysis: string;
}

export interface TranslationTask {
  id: string;
  title: string;
  sourceLang: string;
  targetLang: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  field: ProfessionalField;
  instructions: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  createdAt: number;
}

