import React, { useState, useEffect, useRef } from 'react';
import { X, Edit3, Type, Paintbrush, MousePointer2 } from 'lucide-react';

export const UIEditor: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(null);
  const [editorPos, setEditorPos] = useState({ x: 0, y: 0 });
  
  const highlightRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const toggleBtnRef = useRef<HTMLButtonElement>(null);

  const [className, setClassName] = useState('');
  const [textContent, setTextContent] = useState('');

  useEffect(() => {
    if (!isActive) {
      if (highlightRef.current) {
        highlightRef.current.style.display = 'none';
      }
      setSelectedElement(null);
      return;
    }

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        editorRef.current?.contains(target) || 
        toggleBtnRef.current?.contains(target) ||
        target === highlightRef.current
      ) {
        if (highlightRef.current) highlightRef.current.style.display = 'none';
        return;
      }
      
      if (target === document.body || target === document.documentElement) return;
      
      const rect = target.getBoundingClientRect();
      if (highlightRef.current) {
        highlightRef.current.style.display = 'block';
        highlightRef.current.style.top = `${rect.top}px`;
        highlightRef.current.style.left = `${rect.left}px`;
        highlightRef.current.style.width = `${rect.width}px`;
        highlightRef.current.style.height = `${rect.height}px`;
      }
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      if (
        editorRef.current?.contains(target) || 
        toggleBtnRef.current?.contains(target)
      ) {
        return;
      }
      
      e.preventDefault();
      e.stopPropagation();
      
      setSelectedElement(target);
      
      // Position the editor near the click, but keep it on screen
      const editX = Math.min(e.clientX + 20, window.innerWidth - 340);
      const editY = Math.min(e.clientY + 20, window.innerHeight - 340);
      setEditorPos({ x: editX, y: editY });
    };

    document.addEventListener('mouseover', handleMouseOver, { capture: true });
    document.addEventListener('click', handleClick, { capture: true });

    return () => {
      document.removeEventListener('mouseover', handleMouseOver, { capture: true });
      document.removeEventListener('click', handleClick, { capture: true });
    };
  }, [isActive]);

  useEffect(() => {
    if (selectedElement) {
      setClassName(typeof selectedElement.className === 'string' ? selectedElement.className : '');
      if (selectedElement.children.length === 0) {
        setTextContent(selectedElement.innerText || '');
      } else {
        setTextContent('');
      }
    }
  }, [selectedElement]);

  const handleClassChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newClass = e.target.value;
    setClassName(newClass);
    if (selectedElement) {
      selectedElement.className = newClass;
      // Update highlight position in case size changed
      setTimeout(() => {
        if (highlightRef.current) {
          const rect = selectedElement.getBoundingClientRect();
          highlightRef.current.style.top = `${rect.top}px`;
          highlightRef.current.style.left = `${rect.left}px`;
          highlightRef.current.style.width = `${rect.width}px`;
          highlightRef.current.style.height = `${rect.height}px`;
        }
      }, 50);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newText = e.target.value;
    setTextContent(newText);
    if (selectedElement && selectedElement.children.length === 0) {
      selectedElement.innerText = newText;
      // Update highlight position
      setTimeout(() => {
        if (highlightRef.current) {
          const rect = selectedElement.getBoundingClientRect();
          highlightRef.current.style.top = `${rect.top}px`;
          highlightRef.current.style.left = `${rect.left}px`;
          highlightRef.current.style.width = `${rect.width}px`;
          highlightRef.current.style.height = `${rect.height}px`;
        }
      }, 50);
    }
  };

  return (
    <>
      <button 
        ref={toggleBtnRef}
        onClick={() => setIsActive(!isActive)}
        title={isActive ? "Exit UI Edit Mode" : "Enter UI Edit Mode (Direct DOM Edit)"}
        className={`fixed bottom-6 right-6 z-[9999] p-4 rounded-full shadow-2xl transition-all flex items-center justify-center border ${isActive ? 'bg-indigo-600 text-white border-indigo-500 scale-110 shadow-indigo-500/50' : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white hover:border-slate-500'}`}
      >
        <Edit3 size={24} className={isActive ? "animate-pulse" : ""} />
        {isActive && (
          <span className="absolute -top-10 right-0 whitespace-nowrap bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest py-1 px-3 rounded-full">
            UI Mode Active
          </span>
        )}
      </button>

      <div 
        ref={highlightRef}
        className="fixed pointer-events-none z-[9998] border-2 border-indigo-500 bg-indigo-500/20 transition-all duration-75 rounded"
        style={{ display: 'none' }}
      />

      {isActive && selectedElement && (
        <div 
          ref={editorRef}
          className="fixed z-[10000] bg-slate-900 border border-indigo-500 rounded-2xl shadow-2xl p-5 w-[320px] text-white backdrop-blur-xl animate-scaleIn"
          style={{ 
            top: `${editorPos.y}px`, 
            left: `${editorPos.x}px`
          }}
        >
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400 flex items-center gap-2">
              <MousePointer2 size={12} /> Live Element Editor
            </h3>
            <button onClick={() => setSelectedElement(null)} className="text-slate-500 hover:text-white transition-colors bg-slate-800 hover:bg-slate-700 p-1 rounded-md">
              <X size={14} />
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-2 mb-2">
                <Paintbrush size={10} /> CSS Classes (Tailwind)
              </label>
              <textarea 
                value={className}
                onChange={handleClassChange}
                placeholder="text-white bg-blue-500 p-4..."
                className="w-full bg-slate-800 border border-slate-700 focus:border-indigo-500 rounded-xl p-3 text-xs font-mono h-28 resize-none focus:outline-none transition-colors"
                spellCheck={false}
              />
            </div>
            
            {selectedElement.children.length === 0 ? (
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-2 mb-2">
                  <Type size={10} /> Text Content
                </label>
                <input 
                  type="text"
                  value={textContent}
                  onChange={handleTextChange}
                  placeholder="Element text..."
                  className="w-full bg-slate-800 border border-slate-700 focus:border-indigo-500 rounded-xl p-3 text-xs focus:outline-none transition-colors"
                />
              </div>
            ) : (
              <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-800">
                <p className="text-[10px] text-slate-500 font-bold uppercase text-center">
                  Text editing disabled (contains child elements)
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
