
import React, { useState, useEffect, useRef } from 'react';
import { ProfessionalField, Collaborator, CollaborationActivity, NPEReport } from '../types';
import { generateId } from '../utils/id';
import { fetchPronunciationGuide, auditTranslationNPE, translatePowerhouse } from '../services/geminiService';
import LanguageSelector from './LanguageSelector';
import PronunciationGuideTooltip from './PronunciationGuideTooltip';
import AuditMatrix from './AuditMatrix';
import EditableText from './EditableText';
import { Search, Link, Copy, CheckCircle2, Sparkles, Loader2, Trash2 } from 'lucide-react';
import { db, doc, setDoc, onSnapshot, updateDoc, arrayUnion, handleFirestoreError, OperationType } from '../firebase';

const CollaborationHub: React.FC<{ 
  onSave: (item: any) => void, 
  field: ProfessionalField, 
  targetLang: string, 
  setTargetLang: (lang: string) => void,
  user: { id: string; name: string; role: string; color: string } | null,
  vaultFiles?: any[],
  knowledgeBases?: any[],
  userPreferences?: any
}> = ({ onSave, field, targetLang, setTargetLang, user, vaultFiles = [], knowledgeBases = [], userPreferences = null }) => {
  const [sessionActive, setSessionActive] = useState(false);
  const [roomID, setRoomID] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [targetText, setTargetText] = useState('');
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [activities, setActivities] = useState<CollaborationActivity[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [autoAuditTimer, setAutoAuditTimer] = useState<NodeJS.Timeout | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [ownerId, setOwnerId] = useState<string | null>(null);

  // Audit states
  const [isAuditing, setIsAuditing] = useState(false);
  const [npeReport, setNpeReport] = useState<NPEReport | null>(null);
  const [showAudit, setShowAudit] = useState(false);

  // Pronunciation states
  const [pronunciationGuide, setPronunciationGuide] = useState<{ phonetic: string; guide: string; text: string } | null>(null);
  const [isFetchingPronunciation, setIsFetchingPronunciation] = useState(false);
  const [pronunciationPos, setPronunciationPos] = useState({ x: 0, y: 0 });
  const outputContainerRef = useRef<HTMLDivElement>(null);

  // Current user info
  const currentUser = user || { id: 'anon_' + generateId().slice(0, 4), name: 'Anonymous', role: 'Reviewer', color: '#4F46E5' };

  const socketRef = useRef<WebSocket | null>(null);

  // Selection detection for pronunciation guide
  useEffect(() => {
    const handleSelection = async () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        if (!isFetchingPronunciation) setPronunciationGuide(null);
        return;
      }

      const selectedText = selection.toString().trim();
      if (!selectedText || selectedText.length > 100) {
        setPronunciationGuide(null);
        return;
      }

      if (outputContainerRef.current && outputContainerRef.current.contains(selection.anchorNode)) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        setPronunciationPos({
          x: rect.left + rect.width / 2,
          y: rect.top - 10
        });

        setIsFetchingPronunciation(true);
        try {
          const guide = await fetchPronunciationGuide(selectedText, targetLang);
          setPronunciationGuide({ ...guide, text: selectedText });
        } catch (e) {
          console.error(e);
        } finally {
          setIsFetchingPronunciation(false);
        }
      }
    };

    document.addEventListener('mouseup', handleSelection);
    return () => document.removeEventListener('mouseup', handleSelection);
  }, [targetLang, isFetchingPronunciation]);

  useEffect(() => {
    if (sessionActive && roomID) {
      const roomRef = doc(db, 'rooms', roomID);
      
      // Join room
      const joinRoom = async () => {
        try {
          const me: Collaborator = { 
            ...currentUser, 
            role: currentUser.role as Collaborator['role'],
            status: 'active' 
          };
          await updateDoc(roomRef, {
            [`collaborators.${currentUser.id}`]: me
          });
          addActivity(currentUser.name, 'Joined the sync.', '');
        } catch (err) {
          console.error("Error joining room:", err);
        }
      };
      joinRoom();

      const unsubscribe = onSnapshot(roomRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.sourceText !== undefined && data.sourceText !== sourceText) setSourceText(data.sourceText);
          if (data.targetText !== undefined && data.targetText !== targetText) setTargetText(data.targetText);
          if (data.targetLang !== undefined && data.targetLang !== targetLang) setTargetLang(data.targetLang);
          if (data.ownerId) setOwnerId(data.ownerId);
          
          if (data.collaborators) {
            setCollaborators(Object.values(data.collaborators) as Collaborator[]);
          }
          
          if (data.activities) {
            setActivities(data.activities.slice(0, 20));
          }
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `rooms/${roomID}`);
      });

      // Cleanup on unmount or session end
      return () => {
        unsubscribe();
        const leaveRoom = async () => {
          try {
            await updateDoc(roomRef, {
              [`collaborators.${currentUser.id}`]: null // Or mark as inactive
            });
            addActivity(currentUser.name, 'Left the sync.', '');
          } catch (err) {
            console.error("Error leaving room:", err);
          }
        };
        leaveRoom();
      };
    }
  }, [sessionActive, roomID]);

  const startSession = async () => {
    const id = Math.random().toString(36).substring(2, 10).toUpperCase();
    setOwnerId(currentUser.id);
    setRoomID(id);
    setSessionActive(true);
  };

  const joinSession = async (id: string) => {
    if (!id.trim()) return;
    setRoomID(id.toUpperCase());
    setSessionActive(true);
  };

  const addActivity = async (userName: string, action: string, snippet: string) => {
    if (!roomID || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
    const newActivity: CollaborationActivity = {
      id: generateId(),
      user: userName,
      action,
      snippet,
      timestamp: Date.now()
    };
    
    setActivities(prev => [newActivity, ...prev].slice(0, 20));
    
    socketRef.current.send(JSON.stringify({
      type: 'activity',
      activity: {
        type: 'action',
        data: newActivity
      }
    }));
  };

  const [showManageAccess, setShowManageAccess] = useState(false);

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!roomID || ownerId !== currentUser.id || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
    
    setCollaborators(prev => prev.map(c => 
      c.id === userId ? { ...c, role: newRole as any } : c
    ));

    socketRef.current.send(JSON.stringify({
      type: 'activity',
      activity: {
        type: 'role_change',
        userId,
        role: newRole
      }
    }));
    addActivity('System', `Role updated for user`, '');
  };

  const handleKickUser = async (userId: string) => {
    if (!roomID || ownerId !== currentUser.id || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
    
    setCollaborators(prev => prev.filter(c => c.id !== userId));

    socketRef.current.send(JSON.stringify({
      type: 'activity',
      activity: {
        type: 'kick',
        userId
      }
    }));
    addActivity('System', `User removed from session`, '');
  };

  const broadcastCursor = async (cursorField: 'source' | 'target', index: number) => {
    if (!roomID || !sessionActive || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
    socketRef.current.send(JSON.stringify({
      type: 'activity',
      activity: {
        type: 'cursor',
        userId: currentUser.id,
        data: { field: cursorField, index }
      }
    }));
  };

  const handleTextChange = async (val: string, type: 'source' | 'target') => {
    if (type === 'source') setSourceText(val);
    else setTargetText(val);

    if (sessionActive && roomID && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      setIsSyncing(true);
      socketRef.current.send(JSON.stringify({
        type: 'update',
        state: {
          [type === 'source' ? 'sourceText' : 'targetText']: val
        }
      }));
      setTimeout(() => setIsSyncing(false), 800);
    }

    // Proactive AI Audit
    if (type === 'target' && val.trim().length > 20) {
      if (autoAuditTimer) clearTimeout(autoAuditTimer);
      const timer = setTimeout(() => {
        handleAuditRequest();
      }, 10000); // Audit after 10s of inactivity
      setAutoAuditTimer(timer);
    }
  };

  const [isCopilotActive, setIsCopilotActive] = useState(false);

  const handleCopilotRequest = async () => {
    if (!sourceText.trim() || isCopilotActive) return;
    setIsCopilotActive(true);
    addActivity('You', 'Requested RAG Copilot Synthesis', '');
    try {
      const prefsInstructions = userPreferences?.autoApply ? `\n\nGlobal Instructions: ${userPreferences.globalInstructions}\nFormatting Rules: ${userPreferences.formattingRules}` : '';
      
      const result = await translatePowerhouse(
        sourceText,
        'Auto',
        targetLang,
        field,
        [], // glossary
        userPreferences?.autoApply ? userPreferences.preferredTone : 'Standard',
        '', // context
        'Minimalist', // persona
        [], // translationMemory
        undefined, // styleGuide
        knowledgeBases,
        vaultFiles,
        undefined, // sessionConsistencyMap
        undefined, // visualContext
        prefsInstructions // customInstructions
      );
      
      handleTextChange(result.text, 'target');
      addActivity('RAG Copilot', 'Injected Context-Aware Synthesis', result.text.slice(0, 50) + '...');
    } catch (err) {
      console.error(err);
      addActivity('System', 'RAG Copilot Failed', '');
    } finally {
      setIsCopilotActive(false);
    }
  };

  const handleAuditRequest = async () => {
    if (!targetText.trim() || isAuditing) return;
    setIsAuditing(true);
    setNpeReport(null);
    setShowAudit(true);
    addActivity('You', 'Requested Neural Auditor Review', '');
    try {
      const report = await auditTranslationNPE(sourceText, targetText, "Collab Source", targetLang);
      setNpeReport(report);
      addActivity('Neural Auditor', 'Audit Cycle Complete', report.explanation);
    } catch (err) {
      console.error(err);
      setShowAudit(false);
    } finally {
      setIsAuditing(false);
    }
  };

  const copyRoomLink = () => {
    navigator.clipboard.writeText(roomID);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      {!sessionActive ? (
        <div className="flex flex-col items-center justify-center p-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[3rem] text-center gap-8">
           <div className="w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center text-indigo-600">
             <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
           </div>
           <div className="space-y-2">
             <h3 className="text-[14px] font-black text-slate-900 tracking-tighter uppercase">Initialize Global Collab Hub</h3>
             <p className="text-sm text-slate-400 font-bold max-w-sm mx-auto">Synchronize with native linguists and AI auditors in a unified neural workspace.</p>
           </div>
           <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
             <button 
               onClick={startSession}
               className="flex-1 px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-2xl hover:bg-indigo-700 active:scale-95 transition-all"
             >
               Establish Synthesis Link
             </button>
             <div className="relative flex-1">
               <input 
                 type="text" 
                 placeholder="Enter Room ID..."
                 className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl font-bold text-sm focus:outline-none focus:border-indigo-500 uppercase"
                 onKeyDown={(e) => {
                   if (e.key === 'Enter') joinSession(e.currentTarget.value);
                 }}
               />
               <button 
                 className="absolute right-2 top-2 bottom-2 px-4 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase hover:bg-slate-200"
                 onClick={(e) => {
                   const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                   joinSession(input.value);
                 }}
               >
                 Join
               </button>
             </div>
           </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative" ref={outputContainerRef}>
          {/* Main Editing Area */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-900 rounded-[2rem] text-white shadow-2xl shadow-slate-900/40">
               <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                     <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Active Session</span>
                     <div className="flex items-center gap-2">
                       <span className="text-lg font-black tracking-widest">{roomID}</span>
                       <button 
                         onClick={copyRoomLink}
                         className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
                         title="Copy Room ID"
                       >
                         {isCopied ? <CheckCircle2 size={14} className="text-emerald-400" /> : <Copy size={14} />}
                       </button>
                     </div>
                  </div>
                  <div className="h-8 w-px bg-slate-800" />
                  <div className="flex -space-x-2">
                     {collaborators.map(c => (
                       <div key={c.id} className="w-8 h-8 rounded-full bg-slate-700 border-2 border-slate-900 flex items-center justify-center text-[10px] font-black group relative cursor-help">
                         {c.name[0]}
                         <div className="absolute bottom-full mb-2 hidden group-hover:block bg-white text-slate-900 px-2 py-1 rounded text-[8px] font-black uppercase whitespace-nowrap">{c.name} ({c.role})</div>
                       </div>
                     ))}
                  </div>
               </div>
               <div className="flex items-center gap-3">
                  {isSyncing && <div className="text-[8px] font-black text-emerald-400 uppercase animate-pulse">Sync in Progress...</div>}
                  <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Neural Quality Shield Active</span>
                  </div>
                  {ownerId === currentUser.id && (
                    <button 
                      onClick={() => setShowManageAccess(!showManageAccess)}
                      className="px-4 py-2 bg-indigo-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-colors"
                    >
                      Manage Access
                    </button>
                  )}
                  <button onClick={() => setSessionActive(false)} className="px-4 py-2 bg-slate-800 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-500 transition-colors">Term Session</button>
               </div>
            </div>

            {showManageAccess && ownerId === currentUser.id && (
              <div className="bg-white rounded-2xl p-6 shadow-xl border border-slate-200 animate-fadeIn">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Manage Collaborators</h3>
                <div className="space-y-3">
                  {collaborators.map(c => (
                    <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                          {c.name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{c.name} {c.id === currentUser.id && '(You)'}</p>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{c.role}</p>
                        </div>
                      </div>
                      {c.id !== currentUser.id && (
                        <div className="flex items-center gap-2">
                          <select 
                            value={c.role}
                            onChange={(e) => handleRoleChange(c.id, e.target.value)}
                            className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="Editor">Editor</option>
                            <option value="Reviewer">Reviewer</option>
                            <option value="Viewer">Viewer</option>
                          </select>
                          <button 
                            onClick={() => handleKickUser(c.id)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Remove User"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showAudit ? (
              <AuditMatrix 
                report={npeReport}
                isLoading={isAuditing}
                onApply={(revised) => { setTargetText(revised); setShowAudit(false); addActivity('You', 'Accepted AI Audit Refinement', ''); }}
                onDiscard={() => setShowAudit(false)}
                targetLang={targetLang}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-2 relative">
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Shared Source</span>
                   <div className="relative">
                     <textarea 
                       value={sourceText}
                       onChange={(e) => handleTextChange(e.target.value, 'source')}
                       onKeyUp={(e: any) => broadcastCursor('source', e.target.selectionStart)}
                       onMouseUp={(e: any) => broadcastCursor('source', e.target.selectionStart)}
                       placeholder="Inject source text..."
                       className="w-full h-80 p-8 bg-white border border-slate-200 rounded-[2.5rem] resize-none focus:outline-none focus:ring-4 focus:ring-indigo-500/10 text-sm font-bold shadow-sm"
                     />
                     {/* Remote Cursors for Source */}
                     {collaborators.filter(c => c.id !== currentUser.id && c.cursor?.field === 'source').map(c => (
                       <div 
                         key={c.id}
                         className="absolute pointer-events-none flex flex-col items-center gap-1 transition-all duration-300"
                         style={{ 
                           left: `${Math.min(90, (c.cursor?.index || 0) % 40 * 2 + 8)}%`, 
                           top: `${Math.floor((c.cursor?.index || 0) / 40) * 1.5 + 2}rem`,
                           opacity: 0.8,
                           zIndex: 10
                         }}
                       >
                         <div className="w-0.5 h-5 animate-pulse" style={{ backgroundColor: c.color || '#4F46E5' }} />
                         <span className="px-1.5 py-0.5 rounded text-[7px] font-black text-white uppercase whitespace-nowrap" style={{ backgroundColor: c.color || '#4F46E5' }}>
                           {c.name}
                         </span>
                       </div>
                     ))}
                   </div>
                 </div>
                 <div className="space-y-2 relative">
                   <div className="flex items-center justify-between px-4">
                     <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Collaborative Target</span>
                     <div className="flex items-center gap-2">
                       <button 
                         onClick={handleCopilotRequest}
                         disabled={isCopilotActive || !sourceText.trim()}
                         className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-indigo-200 transition-colors disabled:opacity-50"
                       >
                         {isCopilotActive ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                         RAG Copilot
                       </button>
                       <LanguageSelector value={targetLang} onChange={setTargetLang} size="sm" className="w-[108px]" />
                     </div>
                   </div>
                   <div className="relative">
                     <textarea 
                       value={targetText}
                       onChange={(e) => handleTextChange(e.target.value, 'target')}
                       onKeyUp={(e: any) => broadcastCursor('target', e.target.selectionStart)}
                       onMouseUp={(e: any) => broadcastCursor('target', e.target.selectionStart)}
                       placeholder="Propose synthesis..."
                       className="w-full h-80 p-8 bg-indigo-50/10 border border-indigo-200/50 rounded-[2.5rem] resize-none focus:outline-none focus:ring-4 focus:ring-indigo-500/10 text-sm font-black text-indigo-900 shadow-inner"
                     />
                     {/* Remote Cursors for Target */}
                     {collaborators.filter(c => c.id !== currentUser.id && c.cursor?.field === 'target').map(c => (
                       <div 
                         key={c.id}
                         className="absolute pointer-events-none flex flex-col items-center gap-1 transition-all duration-300"
                         style={{ 
                           left: `${Math.min(90, (c.cursor?.index || 0) % 40 * 2 + 8)}%`, 
                           top: `${Math.floor((c.cursor?.index || 0) / 40) * 1.5 + 2}rem`,
                           opacity: 0.8,
                           zIndex: 10
                         }}
                       >
                         <div className="w-0.5 h-5 animate-pulse" style={{ backgroundColor: c.color || '#4F46E5' }} />
                         <span className="px-1.5 py-0.5 rounded text-[7px] font-black text-white uppercase whitespace-nowrap" style={{ backgroundColor: c.color || '#4F46E5' }}>
                           {c.name}
                         </span>
                       </div>
                     ))}
                   </div>
                 </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
               <button onClick={handleAuditRequest} disabled={isAuditing || !targetText.trim()} className={`px-6 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:border-indigo-500 transition-all flex items-center gap-2 ${isAuditing ? 'opacity-50' : ''}`}>
                 <Search size={14} /> Request AI Audit
               </button>
               <button 
                 onClick={() => {
                   onSave({
                     id: generateId(),
                     sourceText,
                     translatedText: targetText,
                     sourceLang: 'Auto',
                     targetLang,
                     field,
                     timestamp: Date.now()
                   });
                   addActivity('You', 'Committed Synthesis to History', '');
                 }}
                 disabled={!targetText.trim()}
                 className="px-8 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all disabled:opacity-50"
               >
                 Commit Synthesis
               </button>
            </div>
          </div>

          {/* Activity Stream */}
          <div className="lg:col-span-4 flex flex-col gap-6">
             <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm flex flex-col h-full max-h-[600px]">
                <div className="flex items-center justify-between mb-6">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sync Stream</h4>
                   <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6">
                   {activities.length === 0 ? (
                     <div className="h-full flex items-center justify-center text-slate-300 italic text-[10px] uppercase">Waiting for activity...</div>
                   ) : (
                     activities.map(act => (
                       <div key={act.id} className="space-y-2 group animate-fadeIn">
                          <div className="flex items-center justify-between">
                             <span className="text-[10px] font-black text-indigo-600">{act.user}</span>
                             <span className="text-[8px] text-slate-300 font-bold">{new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="text-[11px] font-bold text-slate-600 leading-relaxed">{act.action}</p>
                          {act.snippet && (
                            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] italic text-slate-400 font-medium">"{act.snippet}"</div>
                          )}
                       </div>
                     ))
                   )}
                </div>

                <div className="mt-6 pt-6 border-t border-slate-50">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                         <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18" /></svg>
                      </div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter leading-tight">Room integrity verified by Neural Ledger v4.2</p>
                   </div>
                </div>
             </div>
          </div>
          
          {/* Pronunciation Tooltip */}
          <PronunciationGuideTooltip 
            guide={pronunciationGuide}
            isFetching={isFetchingPronunciation}
            position={pronunciationPos}
            onClose={() => setPronunciationGuide(null)}
          />
        </div>
      )}
    </div>
  );
};

export default CollaborationHub;
