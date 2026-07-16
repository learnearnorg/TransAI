
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { uiLanguages } from './languages';

interface LanguageSelectorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  variant?: 'light' | 'dark' | 'glass';
  size?: 'default' | 'sm';
  showFlag?: boolean;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  value,
  onChange,
  className = "",
  variant = 'light',
  size = 'default',
  showFlag = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentLang = uiLanguages.find(l => 
    l.englishName === value || l.name === value || l.code === value
  ) || uiLanguages[0]; // Default to English

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const variantStyles = {
    light: "bg-white/80 border-slate-200 text-slate-700 hover:bg-white shadow-sm",
    dark: "bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-800 shadow-sm",
    glass: "bg-white/10 hover:bg-white/20 border-white/20 text-white backdrop-blur-md"
  };

  const dropdownVariantStyles = {
    light: "bg-white border-slate-200",
    dark: "bg-slate-900 border-slate-800",
    glass: "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
  };

  // Show all languages and highlight the selected one
  const availableLanguages = uiLanguages;

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-full gap-2 rounded-xl transition-all border group ${variantStyles[variant]} ${size === 'sm' ? 'px-2 py-1.5' : 'px-3 py-2'}`}
      >
        <div className="flex items-center gap-2">
          {showFlag && (
            <img 
              src={`https://flagcdn.com/w40/${currentLang.countryCode}.png`} 
              alt="" 
              className="w-3.5 h-2 object-cover rounded-sm shadow-sm group-hover:scale-110 transition-transform" 
            />
          )}
          <span className={`font-black uppercase tracking-widest ${size === 'sm' ? 'text-[9px]' : 'text-[10px]'}`}>
            {currentLang.englishName}
          </span>
        </div>
        <ChevronDown size={size === 'sm' ? 10 : 12} className={`transition-transform duration-300 opacity-60 group-hover:opacity-100 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {/* Dropdown Menu */}
      {isOpen && (
        <div 
          className={`absolute top-[calc(100%+6px)] left-0 w-full min-w-[120px] border rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] z-[70] p-1 animate-fadeIn backdrop-blur-xl ${dropdownVariantStyles[variant]}`}
        >
          <div className="max-h-[280px] overflow-y-auto custom-scrollbar space-y-0">
            {availableLanguages.map((lang) => {
              const isSelected = lang.englishName === value || lang.name === value || lang.code === value;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => { onChange(lang.englishName); setIsOpen(false); }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg transition-all group ${isSelected ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'}`}
                >
                  <div className="flex items-center gap-2.5">
                    {showFlag && (
                      <img 
                        src={`https://flagcdn.com/w40/${lang.countryCode}.png`} 
                        alt="" 
                        className={`w-4 h-2.5 object-cover rounded-sm shadow-sm transition-opacity ${isSelected ? 'opacity-100' : 'opacity-90 group-hover:opacity-100'}`} 
                      />
                    )}
                    <span className="text-[10px] font-black tracking-widest uppercase">{lang.englishName}</span>
                  </div>
                  {isSelected && <Check size={12} className="text-white" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
