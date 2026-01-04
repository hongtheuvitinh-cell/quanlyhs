
import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, User, ShieldCheck, Clock } from 'lucide-react';
import { AppState, ChatMessage, Role, Teacher, Student } from '../types';

interface Props {
  state: AppState;
  messages: ChatMessage[];
  onSendMessage: (content: string) => Promise<void>;
}

const GroupChat: React.FC<Props> = ({ state, messages, onSendMessage }) => {
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isSending) return;
    
    setIsSending(true);
    try {
      await onSendMessage(inputValue.trim());
      setInputValue('');
    } finally {
      setIsSending(false);
    }
  };

  const getInitials = (name: string) => name.charAt(0).toUpperCase();

  return (
    <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm flex flex-col h-[500px] overflow-hidden">
      <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl shadow-inner">
            <MessageSquare size={18} />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight">Thảo luận lớp {state.selectedClass}</h3>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Trực tuyến</p>
          </div>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30 custom-scrollbar"
      >
        {messages.length > 0 ? messages.map((msg) => {
          const isMe = msg.senderId === ((state.currentUser as Teacher)?.MaGV || (state.currentUser as Student)?.MaHS);
          const isTeacher = msg.senderRole === Role.CHU_NHIEM || msg.senderRole === Role.GIANG_DAY;
          
          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2`}>
              <div className={`flex items-end gap-2 max-w-[85%] ${isMe ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${isTeacher ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-slate-400 border-slate-200'}`}>
                  {isTeacher ? <ShieldCheck size={14} /> : <span className="text-[10px] font-black">{getInitials(msg.senderName)}</span>}
                </div>
                <div className={`p-3 rounded-2xl shadow-sm border ${
                  isMe 
                    ? 'bg-indigo-600 text-white border-indigo-500 rounded-br-none' 
                    : 'bg-white text-slate-700 border-slate-100 rounded-bl-none'
                }`}>
                  {!isMe && <p className="text-[9px] font-black uppercase tracking-tighter mb-1 opacity-70">{msg.senderName}</p>}
                  <p className="text-[11px] font-medium leading-relaxed whitespace-pre-line">{msg.content}</p>
                </div>
              </div>
              <div className="mt-1 px-1 flex items-center gap-1 text-slate-400">
                <Clock size={8} />
                <span className="text-[8px] font-bold uppercase tracking-widest">
                   {new Date(msg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          );
        }) : (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-30 px-6">
            <MessageSquare size={40} className="text-slate-200 mb-2" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hãy bắt đầu cuộc thảo luận đầu tiên với lớp của bạn</p>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-slate-50 bg-white shrink-0">
        <form onSubmit={handleSend} className="relative flex items-center">
          <input 
            type="text" 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Nhập nội dung tin nhắn..."
            className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] font-medium outline-none focus:bg-white focus:border-indigo-400 transition-all shadow-inner"
          />
          <button 
            type="submit"
            disabled={!inputValue.trim() || isSending}
            className={`absolute right-2 p-2 rounded-xl transition-all ${
              inputValue.trim() 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
                : 'text-slate-300'
            }`}
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default GroupChat;

