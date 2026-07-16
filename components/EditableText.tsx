
import React from 'react';
import { useUITranslation } from './UITranslationContext';

interface EditableTextProps {
  id: string;
  children: string;
  className?: string;
  as?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'div';
}

const EditableText: React.FC<EditableTextProps> = ({ id, children, className = "", as = 'span' }) => {
  const { isEditingUI, uiLang, translations, updateTranslation } = useUITranslation();
  
  // Use custom translation if exists for current UI language, otherwise fallback to default
  const text = translations[uiLang]?.[id] || children;

  if (isEditingUI) {
    return (
      <input
        type="text"
        value={text}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => updateTranslation(id, e.target.value)}
        className={`bg-white/10 border border-dashed border-indigo-400 rounded px-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-w-[20px] transition-all ${className}`}
        style={{ width: `${Math.max(text.length, 4)}ch` }}
      />
    );
  }

  const Tag = as as any;
  return <Tag className={className}>{text}</Tag>;
};

export default EditableText;
