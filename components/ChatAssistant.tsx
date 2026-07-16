import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "../services/geminiService";
import EditableText from './EditableText';
import { MODELS } from '../constants';
import { Image, Music, Trash2, X, Paperclip, Send } from 'lucide-react';
import { blobToBase64 } from '../services/audioUtils';
import { retrieveKnowledgeContext, getApiKey } from '../services/geminiService';
import { KnowledgeBase, UploadedFile } from '../types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  attachments?: {
    data: string;
    mimeType: string;
    type: 'image' | 'audio';
  }[];
}

interface ChatAssistantProps {
  knowledgeBases?: KnowledgeBase[];
  vaultFiles?: UploadedFile[];
}

const ChatAssistant: React.FC<ChatAssistantProps> = ({ knowledgeBases = [], vaultFiles = [] }) => {
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('transai_assistant_chat');
    return saved ? JSON.parse(saved) : [{
      role: 'assistant',
      content: "Neural link established. I am your linguistic consultant. How can I assist with your synthesis today?",
      timestamp: Date.now()
    }];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<{ file: File; preview: string; type: 'image' | 'audio' }[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem('transai_assistant_chat', JSON.stringify(messages));
    } catch(e) {}
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('audio/') ? 'audio' : null;
      if (type) {
        const preview = URL.createObjectURL(file);
        setAttachments(prev => [...prev, { file, preview, type }]);
      }
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && attachments.length === 0) || isLoading) return;

    setIsLoading(true);
    const currentAttachments = [...attachments];
    setAttachments([]);

    try {
      const processedAttachments = await Promise.all(
        currentAttachments.map(async (a) => ({
          data: await blobToBase64(a.file),
          mimeType: a.file.type,
          type: a.type
        }))
      );

      const userMessage: Message = { 
        role: 'user', 
        content: input, 
        timestamp: Date.now(),
        attachments: processedAttachments
      };
      setMessages(prev => [...prev, userMessage]);
      setInput('');

      // Advanced RAG: Retrieve context before answering
      let ragContext = "";
      if (knowledgeBases.length > 0 && vaultFiles.length > 0) {
        const { context, sources } = await retrieveKnowledgeContext(input, knowledgeBases, vaultFiles);
        if (context) {
          ragContext = `\n\n[System Note: Use the following retrieved knowledge base context to inform your answer. If the context is not relevant to the user's query, ignore it.]\n${context}`;
        }
      }

      const ai = new GoogleGenAI({ apiKey: getApiKey() });
      
      const contents = messages.slice(-10).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [
          { text: m.content },
          ...(m.attachments || []).map(a => ({
            inlineData: { data: a.data, mimeType: a.mimeType }
          }))
        ]
      }));

      // Add current message with RAG context
      contents.push({
        role: 'user',
        parts: [
          { text: input + ragContext },
          ...processedAttachments.map(a => ({
            inlineData: { data: a.data, mimeType: a.mimeType }
          }))
        ]
      });

      const response = await ai.models.generateContent({
        model: MODELS.TEXT,
        contents,
        config: {
          systemInstruction: "You are TransAI Neural Assistant, a world-class linguistic consultant and translation expert. You can process text, images, and audio. Help users with grammar, cultural nuances, alternative phrasing, and industry-specific terminology. If an image or audio is provided, analyze it to provide better context. Keep responses professional, insightful, and concise."
        }
      });

      const aiMessage: Message = {
        role: 'assistant',
        content: response.text || "Neural timeout. Please resynchronize.",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Error in neural link. Please verify your connection.",
        timestamp: Date.now()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    const initial: Message[] = [{
      role: 'assistant',
      content: "Neural link reset. Ready for new input.",
      timestamp: Date.now()
    }];
    setMessages(initial);
  };

  return (
    <div className="flex flex-col flex-1 bg-white rounded-2xl overflow-hidden animate-fadeIn shadow-xl border border-slate-100 min-h-0">
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${isLoading ? 'bg-indigo-500 animate-pulse shadow-[0_0_10px_rgba(79,70,229,0.8)]' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'}`} />
          <EditableText id="assistant.status" className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
            {isLoading ? 'Neural Processing...' : 'Active Link'}
          </EditableText>
        </div>
        <button 
          onClick={clearChat} 
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black text-slate-400 hover:text-rose-600 hover:bg-rose-50 uppercase tracking-widest transition-all active:scale-95 border border-transparent hover:border-rose-200 group"
          title="Clear neural history"
        >
          <Trash2 size={12} strokeWidth={3} className="group-hover:scale-110 transition-transform" />
          <span>Clear History</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/30 overscroll-contain touch-pan-y">
        {messages.map((m, i) => (
          <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[90%] p-4 rounded-[1.5rem] text-[13px] leading-relaxed shadow-sm border-2 ${
              m.role === 'user' 
                ? 'bg-indigo-600 text-white border-indigo-500 rounded-tr-none' 
                : 'bg-white text-slate-700 border-slate-100 rounded-tl-none'
            }`}>
              {m.attachments && m.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {m.attachments.map((a, idx) => (
                    <div key={idx} className="relative rounded-xl overflow-hidden border border-white/20">
                      {a.type === 'image' ? (
                        <img src={`data:${a.mimeType};base64,${a.data}`} alt="Attachment" className="w-32 h-32 object-cover" />
                      ) : (
                        <div className="w-32 h-32 bg-indigo-500/20 flex flex-col items-center justify-center gap-2">
                          <Music size={24} className="text-white/60" />
                          <span className="text-[8px] font-black uppercase">Audio Core</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {m.content}
            </div>
            <span className="text-[8px] text-slate-300 font-black uppercase mt-2 px-2 tracking-widest">
              {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
        {isLoading && (
          <div className="flex flex-col items-start animate-pulse">
            <div className="bg-white border-2 border-slate-50 p-4 rounded-[1.5rem] rounded-tl-none shadow-sm">
              <div className="flex gap-1.5">
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-slate-100 bg-white space-y-4 shrink-0">
        {attachments.length > 0 && (
          <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
            {attachments.map((a, i) => (
              <div key={i} className="relative flex-shrink-0 group">
                <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-slate-100 shadow-md">
                  {a.type === 'image' ? (
                    <img src={a.preview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-slate-50 flex items-center justify-center">
                      <Music size={20} className="text-slate-300" />
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => removeAttachment(i)}
                  className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSend} className="flex items-center gap-3">
          <input 
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*,audio/*"
            multiple
            className="hidden"
          />
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
          >
            <Paperclip size={20} />
          </button>
          
          <div className="flex-1 relative flex items-center gap-2">
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              placeholder="Query the neural assistant..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-5 pr-12 py-4 text-[13px] font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all disabled:opacity-50 shadow-inner"
            />
            <button 
              type="submit"
              disabled={(!input.trim() && attachments.length === 0) || isLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-300 transition-all shadow-lg active:scale-95"
            >
              <Send size={18} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatAssistant;
