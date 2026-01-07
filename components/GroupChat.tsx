
import React, { useState, useRef } from 'react';
import { Send, MessageSquare, User, ShieldCheck, Clock, Bell, Link as LinkIcon, ExternalLink, Image as ImageIcon, X, Loader2, Paperclip, CheckCircle, AlertTriangle, Sparkles } from 'lucide-react';
import { AppState, ChatMessage, Role, Teacher, Student } from '../types';
import { supabase } from '../services/supabaseClient';

interface Props {
  state: AppState;
  messages: ChatMessage[];
  onSendMessage: (content: string, attachment?: string) => Promise<void>;
}

const GroupChat: React.FC<Props> = ({ state, messages, onSendMessage }) => {
  const [inputValue, setInputValue] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isTeacher = state.currentRole !== Role.STUDENT;

  // Đảo ngược danh sách tin nhắn để tin mới nhất lên đầu (Đảm bảo messages là mảng)
  const reversedMessages = [...(messages || [])].reverse();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("File quá lớn! Vui lòng chọn file dưới 10MB.");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${state.selectedClass}/${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { data, error } = await supabase.storage
        .from('attachments')
        .upload(filePath, file);

      if (error) {
        if (error.message.includes('bucket not found')) {
          throw new Error("Chưa tạo Bucket 'attachments' trong Supabase Storage.");
        }
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('attachments')
        .getPublicUrl(filePath);

      setAttachmentUrl(publicUrl);
    } catch (error: any) {
      console.error('Lỗi upload:', error);
      alert("Lỗi: " + error.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputValue.trim() && !attachmentUrl) || isSending || isUploading) return;
    
    setIsSending(true);
    try {
      await onSendMessage(inputValue.trim() || "Thông báo mới", attachmentUrl || undefined);
      setInputValue('');
      setAttachmentUrl('');
    } catch (err: any) {
      alert("Lỗi gửi tin: " + err.message);
    } finally {
      setIsSending(false);
    }
  };

  const getInitials = (name: string) => (name || 'U').charAt(0).toUpperCase();

  const isImage = (url: string) => {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    return lowerUrl.match(/\.(jpg|jpeg|png|webp|avif|gif)$/) || lowerUrl.includes('image');
  };

  const canSubmit = (inputValue.trim() || attachmentUrl) && !isUploading && !isSending;

  return (
    <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm flex flex-col h-[600px] overflow-hidden relative group">
      <div className="p-5 border-b border-slate-50 flex items-center justify-between bg-indigo-600 text-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md shadow-inner">
            <Bell size={20} />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest">
              {isTeacher ? "Thông báo của tôi" : "Thông báo từ GVCN"}
            </h3>
            <p className="text-[9px] text-white/70 font-bold uppercase tracking-widest mt-0.5">Lớp {state.selectedClass} • Tin mới nhất ở trên đầu</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-slate-50/30 custom-scrollbar">
        {reversedMessages.length > 0 ? reversedMessages.map((msg, index) => {
          const isMsgTeacher = msg.senderRole === Role.CHU_NHIEM || msg.senderRole === Role.GIANG_DAY;
          const isLatest = index === 0;
          
          return (
            <div key={msg.id} className={`flex flex-col items-start animate-in fade-in slide-in-from-top-2 duration-500`}>
              <div className="flex items-start gap-3 w-full">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border-2 ${isMsgTeacher ? 'bg-indigo-600 text-white border-indigo-100 shadow-lg' : 'bg-white text-slate-400 border-slate-100'}`}>
                  {isMsgTeacher ? <ShieldCheck size={18} /> : <span className="text-[11px] font-black">{getInitials(msg.senderName)}</span>}
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-black uppercase tracking-tight text-slate-800">{msg.senderName}</p>
                      <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">
                        {new Date(msg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {isLatest && (
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-lg border border-amber-200 animate-pulse">
                        <Sparkles size={8} />
                        <span className="text-[8px] font-black uppercase tracking-widest">Mới nhất</span>
                      </div>
                    )}
                  </div>
                  
                  <div className={`p-4 rounded-2xl rounded-tl-none border shadow-sm space-y-3 ${isLatest ? 'bg-white border-indigo-200 ring-2 ring-indigo-50' : 'bg-white border-slate-100'}`}>
                    <p className="text-[12px] text-slate-700 font-medium leading-relaxed whitespace-pre-line">{msg.content}</p>
                    
                    {msg.attachment && (
                      <div className="pt-2 border-t border-slate-50">
                        {isImage(msg.attachment) ? (
                          <div className="relative rounded-xl overflow-hidden border border-slate-100 group/img shadow-sm bg-slate-50">
                            <img src={msg.attachment} alt="Đính kèm" className="max-h-80 w-full object-contain mx-auto transition-transform group-hover/img:scale-[1.02]" />
                            <a href={msg.attachment} target="_blank" rel="noreferrer" className="absolute top-2 right-2 p-2 bg-black/60 text-white rounded-lg opacity-0 group-hover/img:opacity-100 transition-opacity backdrop-blur-sm">
                              <ExternalLink size={14} />
                            </a>
                          </div>
                        ) : (
                          <a 
                            href={msg.attachment} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl text-indigo-600 hover:bg-indigo-50 transition-all shadow-inner"
                          >
                            <div className="p-2 bg-white rounded-lg shadow-sm"><Paperclip size={18} /></div>
                            <span className="text-[10px] font-black uppercase truncate flex-1 tracking-tight">Tài liệu đính kèm</span>
                            <ExternalLink size={16} />
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
            <div className="p-6 bg-white rounded-full mb-4 shadow-inner"><Bell size={48} className="text-slate-200" /></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">Chưa có thông báo nào</p>
          </div>
        )}
      </div>

      {isTeacher ? (
        <div className="p-4 border-t border-slate-100 bg-white shrink-0 space-y-4">
          {(isUploading || attachmentUrl) && (
            <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-2xl border border-indigo-100 animate-in slide-in-from-bottom-2 shadow-sm">
               {isUploading ? (
                 <div className="flex items-center gap-3 text-indigo-600 py-1">
                    <Loader2 size={18} className="animate-spin" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Đang tải tệp...</span>
                 </div>
               ) : (
                 <>
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-600 shadow-sm shrink-0 border border-indigo-100">
                       {isImage(attachmentUrl) ? <ImageIcon size={20}/> : <Paperclip size={20}/>}
                    </div>
                    <div className="flex-1 min-w-0">
                       <p className="text-[10px] font-black text-indigo-800 uppercase truncate">Tệp sẵn sàng</p>
                    </div>
                    <button onClick={() => setAttachmentUrl('')} className="p-2 text-rose-500 hover:bg-rose-100 rounded-xl transition-all shadow-sm bg-white">
                       <X size={18} />
                    </button>
                 </>
               )}
            </div>
          )}
          
          <form onSubmit={handleSend} className="space-y-3">
            <div className="flex items-center gap-2">
              <input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                onChange={handleFileUpload}
                accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
              />
              <button 
                type="button"
                disabled={isUploading || isSending}
                onClick={() => fileInputRef.current?.click()}
                className={`p-3.5 rounded-2xl transition-all flex items-center justify-center border shadow-sm ${isUploading ? 'bg-slate-100 text-slate-300 border-slate-200' : 'bg-slate-50 text-indigo-600 border-slate-200 hover:bg-white hover:border-indigo-300'}`}
                title="Đính kèm file"
              >
                <ImageIcon size={22} />
              </button>
              
              <div className="flex-1">
                <textarea 
                  rows={1}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Nhập thông báo mới nhất..."
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[12px] font-bold outline-none focus:bg-white focus:border-indigo-400 transition-all shadow-inner resize-none min-h-[50px] max-h-[150px]"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={!canSubmit}
              className={`w-full py-4 rounded-2xl text-[11px] font-black uppercase tracking-[2px] flex items-center justify-center gap-3 transition-all shadow-xl active:scale-[0.98] ${
                canSubmit
                  ? 'bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700' 
                  : 'bg-slate-100 text-slate-300 cursor-not-allowed border border-slate-200'
              }`}
            >
              {isSending ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Đang đăng...
                </>
              ) : (
                <>
                  <CheckCircle size={18} />
                  Đăng thông báo ngay
                </>
              )}
            </button>
          </form>
        </div>
      ) : (
        <div className="p-5 bg-slate-100 border-t border-slate-200 shrink-0 flex items-center justify-center gap-3">
           <ShieldCheck size={16} className="text-slate-400" />
           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Xem thông báo từ Giáo viên chủ nhiệm</p>
        </div>
      )}
    </div>
  );
};

export default GroupChat;
