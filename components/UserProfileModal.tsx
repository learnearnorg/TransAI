
import React, { useState } from 'react';
import { X, User, Briefcase, Check } from 'lucide-react';

interface UserProfileModalProps {
  onSave: (user: { name: string; role: string; color: string }) => void;
  onClose: () => void;
  initialUser?: { name: string; role: string; color: string };
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ onSave, onClose, initialUser }) => {
  const [name, setName] = useState(initialUser?.name || '');
  const [role, setRole] = useState(initialUser?.role || 'Linguist');
  const [color, setColor] = useState(initialUser?.color || '#4F46E5');

  const roles = ['Project Lead', 'Linguist', 'Reviewer', 'AI Auditor', 'Client'];
  const colors = ['#4F46E5', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#000000'];

  const handleSave = () => {
    if (name.trim()) {
      onSave({ name, role, color });
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
        <div className="p-8 space-y-8">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-[14px] font-black text-slate-900 uppercase tracking-widest">Neural Identity</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Define your presence in the synthesis grid.</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <X size={20} className="text-slate-400" />
            </button>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Linguist Name</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="Enter your name..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-12 py-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                />
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={18} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Neural Role</label>
              <div className="grid grid-cols-2 gap-2">
                {roles.map(r => (
                  <button 
                    key={r}
                    onClick={() => setRole(r)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-[10px] font-black uppercase transition-all ${role === r ? 'bg-indigo-600 text-white border-indigo-700 shadow-lg' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'}`}
                  >
                    {role === r ? <Check size={12} strokeWidth={4} /> : <Briefcase size={12} />}
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Neural Signature Color</label>
              <div className="flex flex-wrap gap-3">
                {colors.map(c => (
                  <button 
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${color === c ? 'border-indigo-600 scale-110 shadow-md' : 'border-transparent hover:scale-105'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          <button 
            onClick={handleSave}
            disabled={!name.trim()}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50"
          >
            Synchronize Identity
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;
