import React, { useState, useEffect, useRef } from 'react';
import { Activity, User, Clock, MessageSquare, FileText, Zap, Shield, CheckCircle2, Trash2, TrendingUp, BarChart3 } from 'lucide-react';
import { CollaborationActivity, TranslationHistoryItem } from '../types';

interface ActivityFeedProps {
  roomId?: string;
  history?: TranslationHistoryItem[];
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ roomId = 'global-activity', history = [] }) => {
  const [activities, setActivities] = useState<CollaborationActivity[]>([]);
  const socketRef = useRef<WebSocket | null>(null);

  const totalWords = history.reduce((acc, item) => acc + (item.sourceText?.split(/\s+/).length || 0), 0);
  const avgLQA = history.filter(h => h.qualityReport).length > 0 
    ? Math.round(history.reduce((acc, item) => acc + (item.qualityReport?.overallScore || 0), 0) / history.filter(h => h.qualityReport).length)
    : 0;

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}`);
    socketRef.current = socket;

    socket.onopen = () => {
      socket.send(JSON.stringify({
        type: 'join',
        roomId,
        user: { id: 'system', name: 'System Observer', color: '#6366f1' }
      }));
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'activity') {
        setActivities(prev => [message.activity, ...prev].slice(0, 50));
      } else if (message.type === 'sync' && message.state?.activities) {
        setActivities(message.state.activities);
      }
    };

    return () => socket.close();
  }, [roomId]);

  const getIcon = (action: string) => {
    const lowerAction = action.toLowerCase();
    if (lowerAction.includes('edit')) return <FileText size={12} className="text-indigo-500" />;
    if (lowerAction.includes('audit')) return <Shield size={12} className="text-amber-500" />;
    if (lowerAction.includes('comment')) return <MessageSquare size={12} className="text-emerald-500" />;
    if (lowerAction.includes('sync')) return <Zap size={12} className="text-violet-500" />;
    if (lowerAction.includes('complete')) return <CheckCircle2 size={12} className="text-emerald-600" />;
    return <Activity size={12} className="text-slate-400" />;
  };

  return (
    <div className="flex flex-col flex-1 gap-4 min-h-0">
      <div className="grid grid-cols-2 gap-3 shrink-0">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-1">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <FileText size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">Words Processed</span>
          </div>
          <span className="text-2xl font-black text-slate-800">{totalWords.toLocaleString()}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-1">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Shield size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">Avg LQA Score</span>
          </div>
          <span className="text-2xl font-black text-indigo-600">{avgLQA > 0 ? `${avgLQA}/100` : 'N/A'}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-1">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <TrendingUp size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">Total Jobs</span>
          </div>
          <span className="text-2xl font-black text-slate-800">{history.length}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-1">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <BarChart3 size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">Active Sessions</span>
          </div>
          <span className="text-2xl font-black text-emerald-600">1</span>
        </div>
      </div>

      <div className="flex flex-col flex-1 bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm animate-fadeIn min-h-0">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-indigo-600" />
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Neural Activity Feed</span>
        </div>
        <div className="flex items-center gap-3">
          {activities.length > 0 && (
            <button 
              onClick={() => setActivities([])}
              className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-500 transition-all active:scale-90 group"
              title="Clear Feed"
            >
              <Trash2 size={12} className="group-hover:scale-110 transition-transform" />
            </button>
          )}
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Live Sync</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar overscroll-contain touch-pan-y">
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-300 italic opacity-40">
            <Zap size={24} strokeWidth={1} />
            <p className="mt-2 text-[9px] font-black uppercase tracking-widest">Awaiting Neural Pulses</p>
          </div>
        ) : (
          activities.map((activity, idx) => (
            <div key={activity.id || idx} className="flex gap-3 group animate-fadeIn">
              <div className="flex flex-col items-center gap-1">
                <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                  {getIcon(activity.action)}
                </div>
                <div className="w-px flex-1 bg-slate-100 group-last:hidden" />
              </div>
              <div className="flex-1 pb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{activity.user}</span>
                  <div className="flex items-center gap-1 text-slate-400">
                    <Clock size={10} />
                    <span className="text-[8px] font-bold">{new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
                <p className="text-[11px] font-bold text-slate-600 leading-relaxed bg-slate-50/50 p-2 rounded-xl border border-slate-100/50">
                  {activity.action} {activity.snippet && <span className="text-indigo-500 italic">"{activity.snippet}"</span>}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
    </div>
  );
};

export default ActivityFeed;
