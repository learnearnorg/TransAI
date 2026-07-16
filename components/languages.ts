export type LanguageCode = 'en' | 'mn' | 'zh' | 'ja' | 'ko' | 'de' | 'es' | 'fr' | 'ru';

export interface Language {
  code: LanguageCode;
  name: string;
  flag: string;
  locale: string;
  countryCode: string;
  englishName: string;
}

export const uiLanguages: Language[] = [
  { code: 'en', name: 'English', flag: '🇺🇸', locale: 'en-US', countryCode: 'us', englishName: 'English' },
  { code: 'mn', name: 'Монгол', flag: '🇲🇳', locale: 'mn-MN', countryCode: 'mn', englishName: 'Mongolian' },
  { code: 'zh', name: '中文', flag: '🇨🇳', locale: 'zh-CN', countryCode: 'cn', englishName: 'Chinese' },
  { code: 'ja', name: '日本語', flag: '🇯🇵', locale: 'ja-JP', countryCode: 'jp', englishName: 'Japanese' },
  { code: 'ko', name: '한국어', flag: '🇰🇷', locale: 'ko-KR', countryCode: 'kr', englishName: 'Korean' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪', locale: 'de-DE', countryCode: 'de', englishName: 'German' },
  { code: 'es', name: 'Español', flag: '🇪🇸', locale: 'es-ES', countryCode: 'es', englishName: 'Spanish' },
  { code: 'fr', name: 'Français', flag: '🇫🇷', locale: 'fr-FR', countryCode: 'fr', englishName: 'French' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺', locale: 'ru-RU', countryCode: 'ru', englishName: 'Russian' },
];