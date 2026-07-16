
import React, { useState, useEffect } from 'react';
import { Shield, Key, X, Eye, EyeOff, Save, Trash2, AlertCircle, Check, Info, Zap, Lock, Plus, ShieldCheck } from 'lucide-react';

export interface SecretKey {
  id: string;
  name: string;
  key: string;
  service: string;
  lastUpdated: number;
}

interface SecretVaultProps {
  onClose: () => void;
}

const SecretVault: React.FC<SecretVaultProps> = ({ onClose }) => {
  const [secrets, setSecrets] = useState<SecretKey[]>(() => {
    const saved = localStorage.getItem('transai_secrets');
    return saved ? JSON.parse(saved) : [];
  });
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [newSecret, setNewSecret] = useState({ name: '', key: '', service: 'Gemini' });
  const [isAdding, setIsAdding] = useState(false);
  const [hasPlatformKey, setHasPlatformKey] = useState(false);

  useEffect(() => {
    const checkPlatformKey = async () => {
      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasPlatformKey(hasKey);
      }
    };
    checkPlatformKey();
  }, []);

  const saveSecrets = (newSecrets: SecretKey[]) => {
    setSecrets(newSecrets);
    try { localStorage.setItem('transai_secrets', JSON.stringify(newSecrets)); } catch(e) {}
  };

  const handleAddSecret = () => {
    if (!newSecret.name || !newSecret.key) return;
    const secret: SecretKey = {
      id: Math.random().toString(36).substr(2, 9),
      name: newSecret.name,
      key: newSecret.key,
      service: newSecret.service,
      lastUpdated: Date.now()
    };
    saveSecrets([secret, ...secrets]);
    setNewSecret({ name: '', key: '', service: 'Gemini' }); // Keep Gemini as default for next time
    setIsAdding(false);
  };

  const handleDeleteSecret = (id: string) => {
    saveSecrets(secrets.filter(s => s.id !== id));
  };

  const toggleShowKey = (id: string) => {
    setShowKey(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenPlatformKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasPlatformKey(true);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
      <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-[3rem] shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200">
              <Shield size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Neural Secret Vault</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Secure API Key Management</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all">
            <X size={24} strokeWidth={3} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
          {/* Platform Key Section */}
          <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-[2rem] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600 text-white rounded-xl">
                  <Zap size={18} fill="currentColor" />
                </div>
                <div>
                  <h3 className="text-[12px] font-black text-indigo-900 uppercase tracking-widest">Platform Key (Veo/Gemini)</h3>
                  <p className="text-[9px] font-bold text-indigo-400 uppercase">Native AI Studio Integration</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${hasPlatformKey ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{hasPlatformKey ? 'Active' : 'Missing'}</span>
              </div>
            </div>
            <p className="text-[10px] font-medium text-indigo-900/60 leading-relaxed">
              For high-quality video generation (Veo) and advanced multimodal tasks, use the platform's secure key selector. This key is managed by AI Studio and is the most secure way to provide credentials.
            </p>
            <button 
              onClick={handleOpenPlatformKey}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Key size={14} />
              {hasPlatformKey ? 'Update Platform Key' : 'Select Platform Key'}
            </button>
          </div>

          {/* Custom Secrets Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-widest">Third-Party Credentials</h3>
              <button 
                onClick={() => setIsAdding(true)}
                className="flex items-center gap-1.5 text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-700 transition-colors"
              >
                <Plus size={14} strokeWidth={3} /> Add Secret
              </button>
            </div>

            {isAdding && (
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-[2rem] space-y-4 animate-fadeIn">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Friendly Name</label>
                    <input 
                      type="text"
                      value={newSecret.name}
                      onChange={(e) => setNewSecret({ ...newSecret, name: e.target.value })}
                      placeholder="e.g. My ElevenLabs Key"
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-[12px] font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Service Provider</label>
                    <select 
                      value={newSecret.service}
                      onChange={(e) => setNewSecret({ ...newSecret, service: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-[12px] font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none"
                    >
                      <option value="Gemini">Gemini API</option>
                      <option value="ElevenLabs">ElevenLabs</option>
                      <option value="OpenAI">OpenAI</option>
                      <option value="Anthropic">Anthropic</option>
                      <option value="Other">Other Service</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">API Key / Secret</label>
                  <div className="relative">
                    <input 
                      type="password"
                      value={newSecret.key}
                      onChange={(e) => setNewSecret({ ...newSecret, key: e.target.value })}
                      placeholder="sk-..."
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-[12px] font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all pr-10"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300">
                      <Lock size={14} />
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={handleAddSecret}
                    disabled={!newSecret.name || !newSecret.key}
                    className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
                  >
                    Store Secret
                  </button>
                  <button 
                    onClick={() => setIsAdding(false)}
                    className="px-6 py-3 bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-300 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {secrets.length === 0 && !isAdding ? (
                <div className="py-12 text-center border-2 border-dashed border-slate-100 rounded-[2.5rem] bg-slate-50/30">
                  <p className="text-[11px] font-bold text-slate-400 uppercase italic">No custom secrets stored in the vault.</p>
                </div>
              ) : (
                secrets.map((secret) => (
                  <div key={secret.id} className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between group hover:border-indigo-300 transition-all shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-slate-50 text-slate-400 rounded-xl group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                        <Key size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-[12px] font-black text-slate-900 tracking-tight">{secret.name}</h4>
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[7px] font-black uppercase">{secret.service}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-[10px] font-mono text-slate-400">
                            {showKey[secret.id] ? secret.key : '••••••••••••••••'}
                          </p>
                          <button 
                            onClick={() => toggleShowKey(secret.id)}
                            className="text-slate-300 hover:text-indigo-500 transition-colors"
                          >
                            {showKey[secret.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                          </button>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDeleteSecret(secret.id)}
                      className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="p-6 bg-amber-50 border border-amber-100 rounded-[2rem] flex items-start gap-4">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-xl shrink-0">
              <AlertCircle size={20} />
            </div>
            <div className="space-y-1">
              <h4 className="text-[11px] font-black text-amber-900 uppercase tracking-widest">Security Advisory</h4>
              <p className="text-[10px] font-medium text-amber-900/60 leading-relaxed">
                Custom secrets are stored in your browser's local storage. While convenient for development, never store production keys here. For maximum security, use environment variables in the platform settings.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecretVault;
