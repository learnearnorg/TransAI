import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText, Video, Mic, Brain, Library, Book, Settings, X, Command, ArrowRight, Activity, Clock } from 'lucide-react';
import { TranslationMode } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (mode: TranslationMode | 'history' | 'activity' | 'terminology-extraction') => void;
  onAction: (action: string) => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onNavigate, onAction }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = [
    { id: 'nav-text', title: 'Text Translation', icon: <FileText size={16} />, category: 'Navigation', action: () => onNavigate('text') },
    { id: 'nav-video', title: 'Video Translation Suite', icon: <Video size={16} />, category: 'Navigation', action: () => onNavigate('video-suite') },
    { id: 'nav-audio', title: 'Audio Dubbing', icon: <Mic size={16} />, category: 'Navigation', action: () => onNavigate('dubbing') },
    { id: 'nav-lqa', title: 'LQA Audit', icon: <Brain size={16} />, category: 'Navigation', action: () => onNavigate('lqa') },
    { id: 'nav-extraction', title: 'Terminology Extraction', icon: <Library size={16} />, category: 'Navigation', action: () => onNavigate('terminology-extraction') },
    { id: 'nav-history', title: 'Translation History', icon: <Clock size={16} />, category: 'Navigation', action: () => onNavigate('history') },
    { id: 'nav-activity', title: 'Activity Dashboard', icon: <Activity size={16} />, category: 'Navigation', action: () => onNavigate('activity') },
    
    { id: 'action-focus', title: 'Toggle Focus Mode', icon: <Command size={16} />, category: 'Actions', action: () => onAction('toggle-focus') },
    { id: 'action-glossary', title: 'Open Lexicon Repository', icon: <Book size={16} />, category: 'Actions', action: () => onAction('open-glossary') },
    { id: 'action-dictionary', title: 'Open Dictionary', icon: <Book size={16} />, category: 'Actions', action: () => onAction('open-dictionary') },
    { id: 'action-theme', title: 'Change Theme', icon: <Settings size={16} />, category: 'Actions', action: () => onAction('open-theme') },
  ];

  const filteredCommands = commands.filter(cmd => 
    cmd.title.toLowerCase().includes(query.toLowerCase()) || 
    cmd.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          onClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-slate-900/50 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
      <div 
        className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-slideDown"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-3 border-b border-slate-800">
          <Search size={20} className="text-slate-400 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent border-none outline-none text-white text-lg placeholder-slate-500"
          />
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar p-2">
          {filteredCommands.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No commands found for "{query}"
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {filteredCommands.map((cmd, idx) => (
                <button
                  key={cmd.id}
                  onClick={() => {
                    cmd.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between w-full px-4 py-3 rounded-xl transition-all ${
                    idx === selectedIndex 
                      ? 'bg-indigo-600 text-white shadow-md' 
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg ${idx === selectedIndex ? 'bg-white/20' : 'bg-slate-800'}`}>
                      {cmd.icon}
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-bold">{cmd.title}</span>
                      <span className={`text-[10px] uppercase tracking-widest ${idx === selectedIndex ? 'text-indigo-200' : 'text-slate-500'}`}>
                        {cmd.category}
                      </span>
                    </div>
                  </div>
                  {idx === selectedIndex && <ArrowRight size={16} className="opacity-70" />}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div className="px-4 py-2 border-t border-slate-800 bg-slate-900/50 flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-widest">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700">↑</kbd> <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700">↓</kbd> to navigate</span>
            <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700">↵</kbd> to select</span>
            <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700">esc</kbd> to close</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
