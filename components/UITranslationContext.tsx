
import React, { createContext, useContext, useState, useEffect } from 'react';
import { UITranslationMap } from '../types';

interface UITranslationContextType {
  isEditingUI: boolean;
  setIsEditingUI: (val: boolean) => void;
  uiLang: string;
  translations: UITranslationMap;
  updateTranslation: (id: string, text: string) => void;
}

const UITranslationContext = createContext<UITranslationContextType | undefined>(undefined);

export const UITranslationProvider: React.FC<{ children: React.ReactNode, activeLang: string, appTheme?: string }> = ({ children, activeLang, appTheme }) => {
  const [isEditingUIManual, setIsEditingUIManual] = useState(false);
  const [translations, setTranslations] = useState<UITranslationMap>(() => {
    const saved = localStorage.getItem('transai_ui_overrides');
    return saved ? JSON.parse(saved) : {};
  });

  const isEditingUI = appTheme === 'dark' || isEditingUIManual;
  const setIsEditingUI = setIsEditingUIManual;

  useEffect(() => {
    try { localStorage.setItem('transai_ui_overrides', JSON.stringify(translations)); } catch (e) {}
  }, [translations]);

  const updateTranslation = (id: string, text: string) => {
    setTranslations(prev => ({
      ...prev,
      [activeLang]: {
        ...(prev[activeLang] || {}),
        [id]: text
      }
    }));
  };

  return (
    <UITranslationContext.Provider value={{ isEditingUI, setIsEditingUI, uiLang: activeLang, translations, updateTranslation }}>
      {children}
    </UITranslationContext.Provider>
  );
};

export const useUITranslation = () => {
  const context = useContext(UITranslationContext);
  if (!context) throw new Error('useUITranslation must be used within UITranslationProvider');
  return context;
};
