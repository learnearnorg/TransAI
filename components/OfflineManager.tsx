import React, { useState } from 'react';
import { SUPPORTED_LANGUAGES } from '../constants';
import { fetchOfflinePack } from '../services/geminiService';
import { OfflinePack } from '../types';
import FlagIcon from './FlagIcon';

interface OfflineManagerProps {
  onPacksUpdate: (packs: OfflinePack[]) => void;
  downloadedPacks: OfflinePack[];
}

const OfflineManager: React.FC<OfflineManagerProps> = ({ onPacksUpdate, downloadedPacks }) => {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [viewingPack, setViewingPack] = useState<OfflinePack | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleDownload = async (langName: string) => {
    setDownloading(langName);
    try {
      const phrases = await fetchOfflinePack(langName);
      const newPack: OfflinePack = {
        langName,
        downloadedAt: Date.now(),
        phrases
      };
      const updated = [...downloadedPacks.filter(p => p.langName !== langName), newPack];
      onPacksUpdate(updated);
    } catch (error) {
      console.error("Failed to download pack.");
    } finally {
      setDownloading(null);
    }
  };

  const removePack = (langName: string) => {
    const updated = downloadedPacks.filter(p => p.langName !== langName);
    onPacksUpdate(updated);
  };

  const filteredPhrases = viewingPack 
    ? Object.entries(viewingPack.phrases).filter(([key]) => 
        key.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-amber-800 text-sm flex items-start gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <p>Offline packs enable instant phrase translation without internet. Perfect for travel and saving data.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SUPPORTED_LANGUAGES.filter(l => l.name !== 'English').map((lang) => {
          const pack = downloadedPacks.find(p => p.langName === lang.name);
          const isDownloaded = !!pack;
          const isDownloading = downloading === lang.name;

          return (
            <div key={lang.name} className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-col gap-3 group hover:border-indigo-300 transition-all shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-bold text-slate-800 flex items-center gap-2">
                    <FlagIcon country={lang.name} className="w-5 h-3.5 rounded-sm" />
                    {lang.name}
                  </span>
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${isDownloaded ? 'text-green-500' : 'text-slate-400'}`}>
                    {isDownloaded ? 'Downloaded' : 'Available'}
                  </span>
                </div>
                {isDownloaded && (
                  <button 
                    onClick={() => removePack(lang.name)}
                    className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                )}
              </div>
              
              {isDownloaded ? (
                <button
                  onClick={() => setViewingPack(pack)}
                  className="w-full py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                  View Phrasebook
                </button>
              ) : (
                <button
                  disabled={!!downloading}
                  onClick={() => handleDownload(lang.name)}
                  className={`flex items-center justify-center gap-2 w-full py-2 rounded-xl text-xs font-bold transition-all ${isDownloading ? 'bg-indigo-100 text-indigo-400' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                >
                  {isDownloading ? (
                    <div className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  )}
                  {isDownloading ? 'Downloading...' : 'Download Pack'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Phrasebook Modal */}
      {viewingPack && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <FlagIcon country={viewingPack.langName} className="w-10 h-7 rounded-md shadow-sm" />
                <div>
                  <h2 className="text-xl font-bold text-slate-800">{viewingPack.langName} Phrasebook</h2>
                  <p className="text-xs text-slate-400 font-medium">50 essential phrases for travel and emergencies</p>
                </div>
              </div>
              <button onClick={() => setViewingPack(null)} className="p-2 text-slate-400 hover:text-slate-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-4 bg-slate-50 border-b border-slate-100">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Search phrases..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
                <svg className="absolute left-3 top-2.5 text-slate-400" xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
              {filteredPhrases.length > 0 ? filteredPhrases.map(([eng, trans], idx) => (
                <div key={idx} className="p-4 bg-white border border-slate-100 rounded-xl flex items-center justify-between group hover:border-indigo-200 transition-all">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">English</span>
                    <span className="text-slate-700 font-medium">{eng}</span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">{viewingPack.langName}</span>
                    <span className="text-indigo-600 font-bold text-lg">{trans}</span>
                  </div>
                </div>
              )) : (
                <div className="py-12 text-center text-slate-400">
                  <p>No matching phrases found.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfflineManager;