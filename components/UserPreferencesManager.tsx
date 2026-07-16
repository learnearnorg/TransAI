import React, { useState, useEffect } from 'react';
import { UserPreferences } from '../types';
import { Settings2, Save, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { db, doc, setDoc, getDoc, handleFirestoreError, OperationType } from '../firebase';

interface UserPreferencesManagerProps {
  user: { id: string; name: string; role: string; color: string; email?: string } | null;
  onUpdatePreferences: (prefs: UserPreferences) => void;
}

const DEFAULT_PREFS: UserPreferences = {
  id: '',
  globalInstructions: '',
  preferredTone: 'Professional',
  formattingRules: '',
  autoApply: true
};

const UserPreferencesManager: React.FC<UserPreferencesManagerProps> = ({ user, onUpdatePreferences }) => {
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_PREFS);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      const fetchPrefs = async () => {
        try {
          const docRef = doc(db, 'users', user.id, 'settings', 'preferences');
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data() as UserPreferences;
            setPrefs(data);
            onUpdatePreferences(data);
          } else {
            setPrefs({ ...DEFAULT_PREFS, id: user.id });
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${user.id}/settings/preferences`);
        }
      };
      fetchPrefs();
    }
  }, [user, onUpdatePreferences]);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await setDoc(doc(db, 'users', user.id, 'settings', 'preferences'), prefs);
      onUpdatePreferences(prefs);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.id}/settings/preferences`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4 p-8 text-center">
        <Settings2 size={48} className="opacity-20" />
        <p className="text-sm font-bold uppercase tracking-widest">Authentication Required</p>
        <p className="text-xs">Please log in to manage persistent neural preferences.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full animate-fadeIn p-6 gap-6 overflow-y-auto custom-scrollbar">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
          <Settings2 size={24} />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Persistent Memory</h2>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Global AI Instructions & Preferences</p>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm flex flex-col gap-6">
        <div className="space-y-3">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Sparkles size={12} className="text-indigo-500" />
            Global Neural Instructions
          </label>
          <textarea
            value={prefs.globalInstructions}
            onChange={(e) => setPrefs({ ...prefs, globalInstructions: e.target.value })}
            placeholder="e.g., Always use metric units. Never use passive voice. Prefer British English spelling."
            className="w-full h-32 bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
          />
          <p className="text-[10px] text-slate-400">These instructions will be injected into every translation and AI interaction automatically.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Preferred Default Tone</label>
            <select
              value={prefs.preferredTone}
              onChange={(e) => setPrefs({ ...prefs, preferredTone: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all"
            >
              <option value="Professional">Professional & Formal</option>
              <option value="Conversational">Conversational & Friendly</option>
              <option value="Academic">Academic & Rigorous</option>
              <option value="Creative">Creative & Expressive</option>
              <option value="Direct">Direct & Concise</option>
            </select>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Auto-Apply Memory</label>
            <div className="flex items-center h-[46px] px-4 bg-slate-50 border border-slate-200 rounded-xl">
              <label className="flex items-center gap-3 cursor-pointer w-full">
                <input
                  type="checkbox"
                  checked={prefs.autoApply}
                  onChange={(e) => setPrefs({ ...prefs, autoApply: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <span className="text-sm font-bold text-slate-700">Inject into all AI prompts</span>
              </label>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Formatting Rules</label>
          <textarea
            value={prefs.formattingRules}
            onChange={(e) => setPrefs({ ...prefs, formattingRules: e.target.value })}
            placeholder="e.g., Keep markdown intact. Use bold for key terms. Preserve HTML tags."
            className="w-full h-24 bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
          />
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {saveSuccess && (
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1 animate-fadeIn">
                <CheckCircle2 size={12} /> Memory Updated
              </span>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? <span className="animate-pulse">Saving...</span> : <><Save size={14} /> Save Preferences</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserPreferencesManager;
