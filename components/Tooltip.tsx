
import React, { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  delay?: number;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

const Tooltip: React.FC<TooltipProps> = ({ 
  content, 
  children, 
  delay = 300, 
  position = 'top',
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [arrowOffset, setArrowOffset] = useState(0);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        let x = rect.left + rect.width / 2;
        let y = rect.top;

        if (position === 'bottom') {
          y = rect.bottom;
        } else if (position === 'left') {
          x = rect.left;
          y = rect.top + rect.height / 2;
        } else if (position === 'right') {
          x = rect.right;
          y = rect.top + rect.height / 2;
        }

        setCoords({ x, y });
        setArrowOffset(0);
        setIsVisible(true);
      }
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (isVisible && tooltipRef.current) {
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const padding = 8;
      
      let newX = coords.x;
      let newArrowOffset = 0;

      if (position === 'top' || position === 'bottom') {
        const leftEdge = coords.x - tooltipRect.width / 2;
        const rightEdge = coords.x + tooltipRect.width / 2;

        if (leftEdge < padding) {
          const shift = padding - leftEdge;
          newX += shift;
          newArrowOffset = -shift;
        } else if (rightEdge > window.innerWidth - padding) {
          const shift = rightEdge - (window.innerWidth - padding);
          newX -= shift;
          newArrowOffset = shift;
        }

        if (newX !== coords.x) {
          setCoords(prev => ({ ...prev, x: newX }));
          setArrowOffset(newArrowOffset);
        }
      }
    }
  }, [isVisible, coords.x, position]);

  const positionClasses = {
    top: '-translate-x-1/2 -translate-y-full mb-2',
    bottom: '-translate-x-1/2 mt-2',
    left: '-translate-x-full -translate-y-1/2 mr-2',
    right: 'ml-2 -translate-y-1/2',
  };

  return (
    <div 
      ref={triggerRef}
      className={`${className || 'inline-block'}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isVisible && (
        <div
          ref={tooltipRef}
          className={`fixed z-[9999] pointer-events-none px-3 py-1.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-2xl whitespace-nowrap opacity-100 transition-opacity duration-150 ${positionClasses[position]}`}
          style={{ 
            left: coords.x, 
            top: coords.y,
          }}
        >
          {content}
          {/* Arrow */}
          <div 
            className={`absolute w-2 h-2 bg-slate-900 rotate-45`}
            style={{
              ...(position === 'top' ? { bottom: -4, left: `calc(50% + ${arrowOffset}px)`, transform: 'translateX(-50%) rotate(45deg)' } : {}),
              ...(position === 'bottom' ? { top: -4, left: `calc(50% + ${arrowOffset}px)`, transform: 'translateX(-50%) rotate(45deg)' } : {}),
              ...(position === 'left' ? { right: -4, top: '50%', transform: 'translateY(-50%) rotate(45deg)' } : {}),
              ...(position === 'right' ? { left: -4, top: '50%', transform: 'translateY(-50%) rotate(45deg)' } : {}),
            }}
          />
        </div>
      )}
    </div>
  );
};

export default Tooltip;
