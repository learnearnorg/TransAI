
import React from 'react';
import { PROFESSIONAL_FIELDS } from '../constants';
import { ProfessionalField } from '../types';

interface FieldSelectorProps {
  value: ProfessionalField;
  onChange: (value: ProfessionalField) => void;
  className?: string;
  'aria-label'?: string;
}

const FieldSelector: React.FC<FieldSelectorProps> = ({ value, onChange, className, 'aria-label': ariaLabel }) => {
  return (
    <div className={`flex flex-col ${className}`}>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as ProfessionalField)}
          aria-label={ariaLabel || "Select professional field"}
          className="w-full appearance-none bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 text-indigo-700 font-black uppercase tracking-[0.2em] focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer text-[10px]"
        >
          {PROFESSIONAL_FIELDS.map((field) => (
            <option key={field.id} value={field.id}>
              {field.icon} {field.name}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default FieldSelector;
