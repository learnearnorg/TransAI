
import React, { useState, useRef, useEffect } from 'react';
import { PROFESSIONAL_FIELDS } from '../constants';
import { ProfessionalField, LinguisticPersona } from '../types';
import { 
  Globe, Stethoscope, Scale, Cpu, Palette, GraduationCap, BookOpen, Microscope, 
  ChevronDown, Check, MoreHorizontal, Landmark, Terminal, Church, Zap, User,
  HardHat, Megaphone, Car, Plane, Leaf, Building2, Shield, FileSignature, Pill, Users, Palmtree,
  Briefcase, Brain, Library
} from 'lucide-react';

interface FieldMenuBarProps {
  value: ProfessionalField;
  onChange: (value: ProfessionalField) => void;
  persona: LinguisticPersona;
  onPersonaChange: (persona: LinguisticPersona) => void;
  customStyleGuide?: string;
  onCustomStyleGuideChange?: (guide: string) => void;
  onOpenPersonaEditor?: () => void;
  onRunScoping?: () => void;
  isScoping?: boolean;
  customPersonas?: any[];
  styleGuides?: any[];
  className?: string;
}

const fieldIconMap: Record<string, React.ReactNode> = {
  General: <Globe size={14} />, Medical: <Stethoscope size={14} />, Legal: <Scale size={14} />,
  Technical: <Cpu size={14} />, IT: <Terminal size={14} />, Financial: <Landmark size={14} />,
  Creative: <Palette size={14} />, Academic: <GraduationCap size={14} />, Literature: <BookOpen size={14} />,
  Scientific: <Microscope size={14} />, Religious: <Church size={14} />,
  Engineering: <HardHat size={14} />, Marketing: <Megaphone size={14} />, Automotive: <Car size={14} />,
  Aviation: <Plane size={14} />, Energy: <Zap size={14} />, Environmental: <Leaf size={14} />,
  Government: <Building2 size={14} />, Military: <Shield size={14} />, Patent: <FileSignature size={14} />,
  Pharmaceutical: <Pill size={14} />, Tourism: <Palmtree size={14} />, Geology: <Microscope size={14} />,
  History: <Library size={14} />,
};

const personas: LinguisticPersona[] = [
  'Minimalist', 'Academic', 'Journalistic', 'Marketing', 'Creative', 'Legalistic',
  'AP Style', 'Chicago Style', 'Oxford Style', 'Technical Manual', 'Medical Journal', 'Legal Brief',
  'Custom Guide'
];

const FieldMenuBar: React.FC<FieldMenuBarProps> = ({ 
  value, onChange, persona, onPersonaChange, customStyleGuide, onCustomStyleGuideChange, onOpenPersonaEditor, onRunScoping, isScoping, customPersonas = [], styleGuides = [], className 
}) => {
  const [isProfessionalOpen, setIsProfessionalOpen] = useState(false);
  const [isScientificOpen, setIsScientificOpen] = useState(false);
  const [isSocialOpen, setIsSocialOpen] = useState(false);
  const [isPersonaOpen, setIsPersonaOpen] = useState(false);
  const professionalRef = useRef<HTMLDivElement>(null);
  const scientificRef = useRef<HTMLDivElement>(null);
  const socialRef = useRef<HTMLDivElement>(null);
  const personaRef = useRef<HTMLDivElement>(null);

  const scientificIds = ['Medical', 'Scientific', 'Engineering', 'Energy', 'Environmental', 'Pharmaceutical', 'Geology'];
  const socialIds = ['Tourism', 'Patent', 'Religious', 'Military', 'Government', 'Marketing', 'Creative', 'Literature', 'History'];
  
  const scientificFields = PROFESSIONAL_FIELDS.filter(f => scientificIds.includes(f.id));
  const socialFields = PROFESSIONAL_FIELDS.filter(f => socialIds.includes(f.id));
  const professionalFields = PROFESSIONAL_FIELDS.filter(f => f.id !== 'General' && !scientificIds.includes(f.id) && !socialIds.includes(f.id));
  
  const isScientificActive = scientificIds.includes(value);
  const isSocialActive = socialIds.includes(value);
  const isProfessionalActive = !isScientificActive && !isSocialActive && value !== 'General';
  const allPersonas = [...personas, ...customPersonas.map(p => p.name), ...(styleGuides || []).map(g => `Style: ${g.name}`)];

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (professionalRef.current && !professionalRef.current.contains(e.target as Node)) setIsProfessionalOpen(false);
      if (scientificRef.current && !scientificRef.current.contains(e.target as Node)) setIsScientificOpen(false);
      if (socialRef.current && !socialRef.current.contains(e.target as Node)) setIsSocialOpen(false);
      if (personaRef.current && !personaRef.current.contains(e.target as Node)) setIsPersonaOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-3 relative z-[50] ${className}`}>
      <div className="flex-1 bg-slate-200 bg-grid-subtle-slate border border-slate-300 rounded-2xl p-1 shadow-xl flex items-center flex-wrap">
        <div className="flex items-center gap-1 py-0.5 px-0.5 shrink-0" role="tablist">
          <button 
            onClick={() => onChange('General')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl whitespace-nowrap transition-all duration-300 ${value === 'General' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-300' : 'text-slate-700 hover:bg-white/60'}`}
          >
            <Globe size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">General</span>
          </button>
        </div>
        
        <div className="h-6 w-px bg-slate-300 mx-1 shrink-0" />
        
        <div className="relative shrink-0 pr-1 min-w-[120px] sm:min-w-[180px]" ref={professionalRef}>
          <button 
            type="button"
            onClick={() => setIsProfessionalOpen(!isProfessionalOpen)}
            className={`w-full flex items-center justify-between gap-2 px-3 sm:px-4 py-1.5 rounded-xl transition-all duration-300 ${isProfessionalActive ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-700 hover:bg-white/60 shadow-sm ring-1 ring-slate-300'}`}
          >
            <div className="flex items-center gap-2 truncate">
              <Briefcase size={14} className="shrink-0" />
              <span className="text-[10px] font-black uppercase tracking-widest truncate">{isProfessionalActive ? value : 'Professional'}</span>
            </div>
            <ChevronDown size={12} className={`shrink-0 transition-transform duration-300 ${isProfessionalOpen ? 'rotate-180' : ''}`} />
          </button>
          {isProfessionalOpen && (
            <div className="absolute top-full left-0 mt-2 w-48 sm:w-full min-w-[180px] bg-white bg-grid-subtle-slate border border-slate-200 rounded-2xl shadow-2xl z-[200] p-1.5 animate-fadeIn max-h-[400px] overflow-y-auto custom-scrollbar">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-2 py-1">Professional Domains</span>
              <div className="grid grid-cols-1 gap-0.5">
                {professionalFields.map((field) => (
                  <button key={field.id} onClick={() => { onChange(field.id); setIsProfessionalOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all ${value === field.id ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      {fieldIconMap[field.id]} 
                      <span className="text-[10px] font-black tracking-widest uppercase truncate">{field.name}</span>
                    </div>
                    {value === field.id && <Check size={12} className="shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-slate-300 mx-1 shrink-0" />

        <div className="relative shrink-0 pr-1 min-w-[120px] sm:min-w-[180px]" ref={scientificRef}>
          <button 
            type="button"
            onClick={() => setIsScientificOpen(!isScientificOpen)}
            className={`w-full flex items-center justify-between gap-2 px-3 sm:px-4 py-1.5 rounded-xl transition-all duration-300 ${isScientificActive ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-700 hover:bg-white/60 shadow-sm ring-1 ring-slate-300'}`}
          >
            <div className="flex items-center gap-2 truncate">
              <Microscope size={14} className="shrink-0" />
              <span className="text-[10px] font-black uppercase tracking-widest truncate">{isScientificActive ? value : 'Scientific'}</span>
            </div>
            <ChevronDown size={12} className={`shrink-0 transition-transform duration-300 ${isScientificOpen ? 'rotate-180' : ''}`} />
          </button>
          {isScientificOpen && (
            <div className="absolute top-full left-0 mt-2 w-48 sm:w-full min-w-[180px] bg-white bg-grid-subtle-slate border border-slate-200 rounded-2xl shadow-2xl z-[200] p-1.5 animate-fadeIn max-h-[400px] overflow-y-auto custom-scrollbar">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-2 py-1">Scientific Domains</span>
              <div className="grid grid-cols-1 gap-0.5">
                {scientificFields.map((field) => (
                  <button key={field.id} onClick={() => { onChange(field.id); setIsScientificOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all ${value === field.id ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      {fieldIconMap[field.id]} 
                      <span className="text-[10px] font-black tracking-widest uppercase truncate">{field.name}</span>
                    </div>
                    {value === field.id && <Check size={12} className="shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-slate-300 mx-1 shrink-0" />

        <div className="relative shrink-0 pr-1 min-w-[120px] sm:min-w-[180px]" ref={socialRef}>
          <button 
            type="button"
            onClick={() => setIsSocialOpen(!isSocialOpen)}
            className={`w-full flex items-center justify-between gap-2 px-3 sm:px-4 py-1.5 rounded-xl transition-all duration-300 ${isSocialActive ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-700 hover:bg-white/60 shadow-sm ring-1 ring-slate-300'}`}
          >
            <div className="flex items-center gap-2 truncate">
              <Users size={14} className="shrink-0" />
              <span className="text-[10px] font-black uppercase tracking-widest truncate">{isSocialActive ? value : 'Social'}</span>
            </div>
            <ChevronDown size={12} className={`shrink-0 transition-transform duration-300 ${isSocialOpen ? 'rotate-180' : ''}`} />
          </button>
          {isSocialOpen && (
            <div className="absolute top-full left-0 mt-2 w-48 sm:w-full min-w-[180px] bg-white bg-grid-subtle-slate border border-slate-200 rounded-2xl shadow-2xl z-[200] p-1.5 animate-fadeIn max-h-[400px] overflow-y-auto custom-scrollbar">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-2 py-1">Social Domains</span>
              <div className="grid grid-cols-1 gap-0.5">
                {socialFields.map((field) => (
                  <button key={field.id} onClick={() => { onChange(field.id); setIsSocialOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all ${value === field.id ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      {fieldIconMap[field.id]} 
                      <span className="text-[10px] font-black tracking-widest uppercase truncate">{field.name}</span>
                    </div>
                    {value === field.id && <Check size={12} className="shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="relative flex-1 sm:flex-initial" ref={personaRef}>
          <button onClick={() => setIsPersonaOpen(!isPersonaOpen)}
            className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 text-white rounded-2xl shadow-lg flex items-center justify-between sm:justify-start gap-3 transition-all hover:bg-indigo-700 active:scale-95">
            <div className="flex items-center gap-3">
              <Zap size={16} fill="currentColor" />
              <div className="flex flex-col items-start gap-1">
                 <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-70 leading-none">Identity</span>
                 <span className="text-[10px] font-black uppercase tracking-widest leading-none truncate max-w-[80px]">{typeof persona === 'string' ? persona : persona.name}</span>
              </div>
            </div>
            <ChevronDown size={14} className={`transition-transform ${isPersonaOpen ? 'rotate-180' : ''}`} />
          </button>
          {isPersonaOpen && (
            <div className="absolute top-full right-0 mt-2 w-[180px] bg-white bg-grid-subtle-slate border border-slate-200 rounded-[2rem] shadow-2xl z-[100] p-2 animate-fadeIn max-h-[400px] overflow-y-auto custom-scrollbar">
               <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-3 px-2">Adaptive Identity Matrix</span>
               <div className="grid grid-cols-1 gap-1">
                  {allPersonas.map(p => (
                    <button key={p} onClick={() => { 
                      const customP = customPersonas.find(cp => cp.name === p);
                      onPersonaChange(customP || p); 
                      setIsPersonaOpen(false); 
                    }}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${(typeof persona === 'string' ? persona : persona.name) === p ? 'bg-indigo-50 text-indigo-600 shadow-inner' : 'text-slate-500 hover:bg-slate-50'}`}>
                      <div className="flex items-center gap-2">
                         {(p === 'Custom Guide' || customPersonas.some(cp => cp.name === p)) && <FileSignature size={12} />}
                         {p}
                      </div>
                      {persona === p && <Check size={12} />}
                    </button>
                  ))}
               </div>
               {persona === 'Custom Guide' && onCustomStyleGuideChange && (
                 <div className="mt-3 pt-3 border-t border-slate-100 px-2">
                   <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Inject Custom Style Context</label>
                   <textarea
                     value={customStyleGuide}
                     onChange={(e) => onCustomStyleGuideChange(e.target.value)}
                     placeholder="Paste style rules, brand voice guidelines, or specific terminology constraints..."
                     className="w-full h-24 bg-slate-50 border border-slate-200 rounded-xl p-2 text-[9px] font-medium focus:ring-1 focus:ring-indigo-500 outline-none resize-none custom-scrollbar"
                   />
                 </div>
               )}
               {onOpenPersonaEditor && (
                  <button 
                    onClick={() => { onOpenPersonaEditor(); setIsPersonaOpen(false); }}
                    className="w-full mt-3 pt-3 border-t border-slate-100 flex items-center justify-center gap-2 text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-700 transition-colors"
                  >
                    <FileSignature size={12} /> Manage Identities
                  </button>
                )}
            </div>
          )}
        </div>

        {onRunScoping && (
          <button 
            onClick={onRunScoping}
            disabled={isScoping}
            className={`flex items-center justify-center sm:justify-start gap-2 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 flex-1 sm:flex-initial ${isScoping ? 'bg-amber-100 text-amber-400 animate-pulse' : 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-100'}`}
            title="Neural Project Scoping: Auto-detect field, persona, and complexity"
          >
            <Brain size={16} className={isScoping ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{isScoping ? 'Scoping...' : 'Neural Scoping'}</span>
            <span className="sm:hidden">{isScoping ? '...' : 'Scope'}</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default FieldMenuBar;
