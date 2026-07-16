import React from 'react';
import { FileText, BookOpen, Camera, Mic, Globe } from 'lucide-react';
import { TranslationMode } from '../types';

interface BottomNavigationProps {
  activeMode: TranslationMode;
  setActiveMode: (mode: TranslationMode) => void;
  appTheme: string;
}

// Maps the global appTheme value to dynamic color configurations
const themeColorMap: Record<string, { text: string; bg: string; border: string; glow: string }> = {
  indigo: { text: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/40', border: 'border-indigo-200 dark:border-indigo-800/40', glow: 'shadow-indigo-500/20' },
  blue: { text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/40', border: 'border-blue-200 dark:border-blue-800/40', glow: 'shadow-blue-500/20' },
  emerald: { text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-200 dark:border-emerald-800/40', glow: 'shadow-emerald-500/20' },
  rose: { text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/40', border: 'border-rose-200 dark:border-rose-800/40', glow: 'shadow-rose-500/20' },
  orange: { text: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/40', border: 'border-orange-200 dark:border-orange-800/40', glow: 'shadow-orange-500/20' },
  violet: { text: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-950/40', border: 'border-violet-200 dark:border-violet-800/40', glow: 'shadow-violet-500/20' },
  teal: { text: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-950/40', border: 'border-teal-200 dark:border-teal-800/40', glow: 'shadow-teal-500/20' },
  cyan: { text: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-50 dark:bg-cyan-950/40', border: 'border-cyan-200 dark:border-cyan-800/40', glow: 'shadow-cyan-500/20' },
  lime: { text: 'text-lime-600 dark:text-lime-400', bg: 'bg-lime-50 dark:bg-lime-950/40', border: 'border-lime-200 dark:border-lime-800/40', glow: 'shadow-lime-500/20' },
  amber: { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40', border: 'border-amber-200 dark:border-amber-800/40', glow: 'shadow-amber-500/20' },
  dark: { text: 'text-slate-800 dark:text-slate-200', bg: 'bg-slate-100 dark:bg-slate-800', border: 'border-slate-300 dark:border-slate-700', glow: 'shadow-slate-500/20' },
  fuchsia: { text: 'text-fuchsia-600 dark:text-fuchsia-400', bg: 'bg-fuchsia-50 dark:bg-fuchsia-950/40', border: 'border-fuchsia-200 dark:border-fuchsia-800/40', glow: 'shadow-fuchsia-500/20' },
  pink: { text: 'text-pink-600 dark:text-pink-400', bg: 'bg-pink-50 dark:bg-pink-950/40', border: 'border-pink-200 dark:border-pink-800/40', glow: 'shadow-pink-500/20' },
  slate: { text: 'text-slate-700 dark:text-slate-300', bg: 'bg-slate-50 dark:bg-slate-800/50', border: 'border-slate-200 dark:border-slate-700/50', glow: 'shadow-slate-500/20' },
  sky: { text: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-950/40', border: 'border-sky-200 dark:border-sky-800/40', glow: 'shadow-sky-500/20' },
  green: { text: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/40', border: 'border-green-200 dark:border-green-800/40', glow: 'shadow-green-500/20' },
  yellow: { text: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-950/40', border: 'border-yellow-200 dark:border-yellow-800/40', glow: 'shadow-yellow-500/20' },
  red: { text: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/40', border: 'border-red-200 dark:border-red-800/40', glow: 'shadow-red-500/20' },
};

const navItems = [
  { id: 'text' as TranslationMode, label: 'Text', icon: FileText },
  { id: 'document' as TranslationMode, label: 'Docs', icon: BookOpen },
  { id: 'image' as TranslationMode, label: 'Camera', icon: Camera },
  { id: 'live' as TranslationMode, label: 'Voice', icon: Mic },
  { id: 'website' as TranslationMode, label: 'Website', icon: Globe },
];

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeMode,
  setActiveMode,
  appTheme,
}) => {
  const theme = themeColorMap[appTheme] || themeColorMap.violet;
  const activeIndex = navItems.findIndex((item) => item.id === activeMode);

  return (
    <div
      id="mobile-bottom-navigation-container"
      className="fixed bottom-0 left-0 right-0 z-[150] lg:hidden px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2 bg-gradient-to-t from-slate-50 via-slate-50/95 to-transparent dark:from-slate-950 dark:via-slate-950/95 dark:to-transparent pointer-events-none"
    >
      <nav
        id="mobile-bottom-nav-bar"
        className="relative w-full max-w-md mx-auto h-[64px] bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-2xl flex items-center justify-around px-3 shadow-[0_-8px_30px_rgba(0,0,0,0.06),0_10px_20px_rgba(0,0,0,0.04)] pointer-events-auto"
      >
        {/* Sliding active pill indicator - CSS cubic-bezier spring-like bounciness */}
        {activeIndex !== -1 && (
          <div
            id="bottom-nav-active-sliding-pill"
            className={`absolute h-12 rounded-xl border ${theme.border} ${theme.bg} transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] shadow-sm -z-10`}
            style={{
              width: 'calc((100% - 1.5rem) / 5)',
              left: `calc(0.75rem + (${activeIndex} * (100% - 1.5rem) / 5))`,
            }}
          />
        )}

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeMode === item.id;

          return (
            <button
              key={item.id}
              id={`bottom-nav-btn-${item.id}`}
              onClick={() => setActiveMode(item.id)}
              className="relative flex flex-col items-center justify-center w-14 h-12 rounded-xl transition-all duration-300 select-none outline-none focus:outline-none"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              {/* Dynamic Icon & Label scaling */}
              <div
                className={`flex flex-col items-center justify-center transition-all duration-300 ${
                  isActive 
                    ? `${theme.text} scale-110 font-bold` 
                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 scale-100'
                }`}
              >
                <Icon className={`w-5 h-5 mb-0.5 transition-transform duration-300 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                <span className="text-[9px] uppercase tracking-wider font-semibold">
                  {item.label}
                </span>
              </div>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default BottomNavigation;
