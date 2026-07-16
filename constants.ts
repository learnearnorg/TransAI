
import { Language, ProfessionalField } from './types';

export const SUPPORTED_LANGUAGES: Language[] = [
  { name: 'English', flag: '🇺🇸' },
  { name: 'Spanish', flag: '🇪🇸' },
  { name: 'French', flag: '🇫🇷' },
  { name: 'German', flag: '🇩🇪' },
  { name: 'Japanese', flag: '🇯🇵' },
  { name: 'Korean', flag: '🇰🇷' },
  { name: 'Chinese', flag: '🇨🇳' },
  { name: 'Russian', flag: '🇷🇺' },
  { name: 'Mongolian', flag: '🇲🇳' },
];

export const PROGRAMMING_LANGUAGES = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'Go', 'Rust', 'PHP', 'HTML/CSS', 'SQL',
  'C#', 'Ruby', 'Swift', 'Kotlin'
];

export interface FieldConfig {
  id: ProfessionalField;
  name: string;
  icon: string;
}

export const PROFESSIONAL_FIELDS: FieldConfig[] = [
  { id: 'General', name: 'General', icon: '🌍' },
  { id: 'Medical', name: 'Medical', icon: '🩺' },
  { id: 'Legal', name: 'Legal', icon: '⚖️' },
  { id: 'IT', name: 'IT', icon: '📟' },
  { id: 'Financial', name: 'Financial', icon: '🏦' },
  { id: 'Scientific', name: 'Scientific', icon: '🔬' },
  { id: 'Religious', name: 'Religious', icon: '🛐' },
  { id: 'Technical', name: 'Technical', icon: '💻' },
  { id: 'Creative', name: 'Creative', icon: '🎨' },
  { id: 'Academic', name: 'Academic', icon: '🎓' },
  { id: 'Literature', name: 'Literature', icon: '📚' },
  { id: 'Engineering', name: 'Engineering', icon: '🏗️' },
  { id: 'Marketing', name: 'Marketing', icon: '📢' },
  { id: 'Automotive', name: 'Automotive', icon: '🚗' },
  { id: 'Aviation', name: 'Aviation', icon: '✈️' },
  { id: 'Energy', name: 'Energy', icon: '⚡' },
  { id: 'Environmental', name: 'Environmental', icon: '🌱' },
  { id: 'Government', name: 'Government', icon: '🏛️' },
  { id: 'Military', name: 'Military', icon: '🎖️' },
  { id: 'Patent', name: 'Patent', icon: '📜' },
  { id: 'Pharmaceutical', name: 'Pharmaceutical', icon: '💊' },
  { id: 'Tourism', name: 'Tourism', icon: '🏖️' },
  { id: 'Geology', name: 'Geology', icon: '🏔️' },
  { id: 'History', name: 'History', icon: '🏛️' },
];

export const getFlag = (langName: string): string => {
  return SUPPORTED_LANGUAGES.find(l => l.name === langName)?.flag || '🌐';
};

export const MODELS = {
  TEXT: 'gemini-3-flash-preview',
  COMPLEX: 'gemini-3.1-pro-preview',
  IMAGE: 'gemini-2.5-flash-image',
  LIVE: 'gemini-3.1-flash-live-preview',
  TTS: 'gemini-3.1-flash-tts-preview',
  EMBEDDING: 'gemini-embedding-2-preview',
  VIDEO: 'veo-3.1-lite-generate-preview'
};
