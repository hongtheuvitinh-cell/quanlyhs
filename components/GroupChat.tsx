
import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, User, ShieldCheck, Clock, Bell, Link as LinkIcon, ExternalLink, Image as ImageIcon, X } from 'lucide-react';
import { AppState, ChatMessage, Role, Teacher, Student } from '../types';

interface Props {
  state: AppState;
  messages: ChatMessage[];
  onSendMessage: (content: string, attachment?: string) => Promise<void>;
}

const GroupChat: React.FC<Props> = ({ state, messages, onSendMessage }) => {
  const [inputValue, setInputValue] = useState('');
  const [attachmentValue, setAttachmentValue] = useState('');
  const [showAttachInput, setShowAttachInput] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const canPost = state.currentRole === Role.CHU_NHIEM;

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
      await onSendMessage(inputValue.trim(), attachmentValue.trim() || undefined);
      setInputValue('');
      setAttachmentValue('');
      setShowAttachInput(false);
    } finally {
      setIsSending(false);
    }
  };

  const getInitials = (name: string) => name.charAt(0).toUpperCase();

  const isImage = (url: string) => {
    return /\.(jpg|jpeg|png|webp|avif|gif)$/.test(url.toLowerCase());
  };

  return (
    <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm flex flex-col h-[550px] overflow-hidden relative group">
      <div className="p-5 border-b border-slate-50 flex items-center justify-between bg-indigo-600 text-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md shadow-inner">
            <Bell size={20} />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest">Thông báo nhanh từ GVCN</h3>
            <p className="text-[9px] text-white/70 font-bold uppercase tracking-widest mt-0.5">Lớp {state.selectedClass} • Trực tuyến</p>
          </div>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-5 space-y-6 bg-slate-50/30 custom-scrollbar"
      >
        {messages.length > 0 ? messages.map((msg) => {
          const isMe = msg.senderId === ((state.currentUser as Teacher)?.MaGV || (state.currentUser as Student)?.MaHS);
          const isTeacher = msg.senderRole === Role.CHU_NHIEM || msg.senderRole === Role.GIANG_DAY;
          
          return (
            <div key={msg.id} className="flex flex-col items-start animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-start gap-3 w-full">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border-2 ${isTeacher ? 'bg-indigo-600 text-white border-indigo-100 shadow-lg shadow-indigo-100' : 'bg-white text-slate-400 border-slate-100'}`}>
                  {isTeacher ? <ShieldCheck size={18} /> : <span className="text-[11px] font-black">{getInitials(msg.senderName)}</span>}
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-black uppercase tracking-tight text-slate-800">{msg.senderName}</p>
                    <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">
                       {new Date(msg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} • {new Date(msg.created_at).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  
                  <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm space-y-3">
                    <p className="text-[12px] text-slate-700 font-medium leading-relaxed whitespace-pre-line">{msg.content}</p>
                    
                    {msg.attachment && (
                      <div className="pt-2 border-t border-slate-50">
                        {isImage(msg.attachment) ? (
                          <div className="relative rounded-xl overflow-hidden border border-slate-100 group/img">
                            <img src={msg.attachment} alt="Đính kèm" className="max-h-60 w-full object-cover transition-transform group-hover/img:scale-105" />
                            <a href={msg.attachment} target="_blank" rel="noreferrer" className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-lg opacity-0 group-hover/img:opacity-100 transition-opacity">
                              <ExternalLink size={14} />
                            </a>
                          </div>
                        ) : (
                          <a 
                            href={msg.attachment} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-100 rounded-xl text-indigo-600 hover:bg-indigo-50 transition-all shadow-inner"
                          >
                            <LinkIcon size={14} />
                            <span className="text-[10px] font-black uppercase truncate flex-1">Mở tài liệu đính kèm</span>
                            <ExternalLink size={14} />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        }) : (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-30 px-6">
            <Bell size={48} className="text-slate-200 mb-3" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">Chưa có thông báo nhanh nào<br/>từ Giáo viên chủ nhiệm</p>
          </div>
        )}
      </div>

      {canPost ? (
        <div className="p-4 border-t border-slate-50 bg-white shrink-0 space-y-3">
          {showAttachInput && (
            <div className="flex items-center gap-2 animate-in slide-in-from-bottom-2">
               <div className="flex-1 relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                  <input 
                    type="text"
                    value={attachmentValue}
                    onChange={(e) => setAttachmentValue(e.target.value)}
                    placeholder="Dán link ảnh hoặc tài liệu đính kèm..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-indigo-100 rounded-xl text-[10px] font-bold outline-none focus:bg-white transition-all shadow-inner"
                  />
               </div>
               <button onClick={() => { setAttachmentValue(''); setShowAttachInput(false); }} className="p-2 text-rose-400 hover:bg-rose-50 rounded-xl transition-all">
                  <X size={16} />
               </button>
            </div>
          )}
          
          <form onSubmit={handleSend} className="relative flex items-center gap-2">
            <button 
              type="button"
              onClick={() => setShowAttachInput(!showAttachInput)}
              className={`p-2.5 rounded-xl transition-all ${showAttachInput || attachmentValue ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-slate-50 text-slate-400 border border-transparent hover:border-slate-200'}`}
              title="Thêm đính kèm"
            >
              <ImageIcon size={20} />
            </button>
            <div className="flex-1 relative">
              <input 
                type="text" 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Gửi thông báo nhanh đến cả lớp..."
                className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] font-bold outline-none focus:bg-white focus:border-indigo-400 transition-all shadow-inner"
              />
              <button 
                type="submit"
                disabled={!inputValue.trim() || isSending}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all ${
                  inputValue.trim() 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700' 
                    : 'text-slate-300'
                }`}
              >
                <Send size={16} />
              </button>
            </div>
          </form>
          <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest text-center">Chỉ giáo viên chủ nhiệm mới có quyền đăng thông báo nhanh</p>
        </div>
      ) : (
        <div className="p-4 bg-slate-50 border-t border-slate-100 shrink-0 flex items-center justify-center gap-2">
           <ShieldCheck size={14} className="text-slate-300" />
           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Bạn đang ở chế độ chỉ xem thông báo</p>
        </div>
      )}
    </div>
  );
};

export default GroupChat;
