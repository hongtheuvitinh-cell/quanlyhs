
import React, { useState, useMemo } from 'react';
import { 
  ClipboardList, Plus, User, MessageSquare, CheckCircle2, XCircle, Clock, Check, Calendar, Search, Users, AlertTriangle, Save, ChevronRight, Info, UserPlus, Trash2, Loader2, Edit3, X, Filter
} from 'lucide-react';
import { AppState, Student, LearningLog, Assignment, AttendanceStatus } from '../types';

interface Props {
  state: AppState;
  students: Student[];
  logs: LearningLog[];
  assignment: Assignment;
  onUpdateLogs: (newLogs: LearningLog[]) => Promise<void>;
  onDeleteLog: (id: number) => Promise<void>;
}

const statusConfig: Record<AttendanceStatus, { label: string, color: string, icon: any, bg: string }> = {
  CO_MAT: { label: 'Bình thường', color: 'text-emerald-600', icon: CheckCircle2, bg: 'bg-emerald-50' },
  VANG_CP: { label: 'Vắng CP', color: 'text-amber-600', icon: AlertTriangle, bg: 'bg-amber-50' },
  VANG_KP: { label: 'Vắng KP', color: 'text-rose-600', icon: XCircle, bg: 'bg-rose-50' },
  TRE: { label: 'Đi trễ', color: 'text-indigo-600', icon: Clock, bg: 'bg-indigo-50' },
};

interface PendingLog {
  MaHS: string;
  Hoten: string;
  status: AttendanceStatus;
  note: string;
}

const LearningLogs: React.FC<Props> = ({ state, students, logs, assignment, onUpdateLogs, onDeleteLog }) => {
  const [activeTab, setActiveTab] = useState<'history' | 'rollcall'>('history');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Bộ lọc lịch sử
  const [historyFilterMonth, setHistoryFilterMonth] = useState<string>('all');
  const [historyFilterStart, setHistoryFilterStart] = useState<string>('');
  const [historyFilterEnd, setHistoryFilterEnd] = useState<string>('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [currentStatus, setCurrentStatus] = useState<AttendanceStatus>('CO_MAT');
  const [currentNote, setCurrentNote] = useState('');
  
  const [pendingLogs, setPendingLogs] = useState<PendingLog[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<LearningLog | null>(null);

  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      if (l.MaPhanCong !== assignment?.MaPhanCong) return false;
      
      const lDate = new Date(l.NgayGhiChep);
      const lMonth = (lDate.getMonth() + 1).toString();
      
      if (historyFilterMonth !== 'all' && lMonth !== historyFilterMonth) return false;
      if (historyFilterStart && l.NgayGhiChep < historyFilterStart) return false;
      if (historyFilterEnd && l.NgayGhiChep > historyFilterEnd) return false;
      
      return true;
    }).sort((a, b) => new Date(b.NgayGhiChep).getTime() - new Date(a.NgayGhiChep).getTime());
  }, [logs, assignment, historyFilterMonth, historyFilterStart, historyFilterEnd]);

  const searchResults = useMemo(() => {
    if (!studentSearch.trim()) return [];
    return students.filter(s => 
      s.Hoten.toLowerCase().includes(studentSearch.toLowerCase()) || 
      s.MaHS.toLowerCase().includes(studentSearch.toLowerCase())
    ).slice(0, 5);
  }, [students, studentSearch]);

  const addStudentToPending = () => {
    if (!selectedStudentId) return;
    const student = students.find(s => s.MaHS === selectedStudentId);
    if (!student) return;
    if (pendingLogs.some(l => l.MaHS === selectedStudentId)) return;

    setPendingLogs([...pendingLogs, {
      MaHS: student.MaHS,
      Hoten: student.Hoten,
      status: currentStatus,
      note: currentNote
    }]);

    setSelectedStudentId('');
    setStudentSearch('');
    setCurrentNote('');
    setCurrentStatus('CO_MAT');
  };

  const removePendingLog = (maHS: string) => {
    setPendingLogs(pendingLogs.filter(l => l.MaHS !== maHS));
  };

  const saveAllLogs = async () => {
    if (pendingLogs.length === 0) return;
    setIsSubmitting(true);
    try {
      const baseId = Math.floor(Date.now() / 1000);
      const newLogs: LearningLog[] = pendingLogs.map((p, index) => ({
        MaTheoDoi: baseId + index,
        MaHS: p.MaHS,
        MaPhanCong: assignment.MaPhanCong,
        NgayGhiChep: selectedDate,
        NhanXet: p.note,
        TrangThai: p.status
      }));
      await onUpdateLogs(newLogs);
      setPendingLogs([]);
      setActiveTab('history');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Xóa bản ghi này?")) return;
    setIsSubmitting(true);
    try { await onDeleteLog(id); } finally { setIsSubmitting(false); }
  };

  const handleOpenEdit = (log: LearningLog) => {
    setEditingLog({ ...log });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingLog) return;
    setIsSubmitting(true);
    try {
      await onUpdateLogs([editingLog]);
      setIsEditModalOpen(false);
      setEditingLog(null);
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="space-y-4 animate-in fade-in pb-20">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-100"><ClipboardList size={22} /></div>
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Nhật ký theo dõi tiết học</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Lớp {state.selectedClass} • {filteredLogs.length} ghi chép</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button onClick={() => setActiveTab('history')} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${activeTab === 'history' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Lịch sử nhật ký</button>
            <button onClick={() => setActiveTab('rollcall')} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${activeTab === 'rollcall' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Ghi chú nhanh</button>
          </div>
        </div>
      </div>

      {activeTab === 'rollcall' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm space-y-5">
               <h3 className="text-xs font-black text-slate-800 uppercase flex items-center gap-2 tracking-tight"><UserPlus size={18} className="text-indigo-600" /> Thêm ghi chép đơn</h3>
               <div className="space-y-1.5 relative">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-1 tracking-widest">Tìm học sinh</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input type="text" placeholder="Nhập tên hoặc mã số..." value={studentSearch} onChange={e => { setStudentSearch(e.target.value); if (selectedStudentId) setSelectedStudentId(''); }} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:bg-white focus:border-indigo-400 transition-all shadow-inner" />
                  </div>
                  {searchResults.length > 0 && !selectedStudentId && (
                    <div className="absolute z-30 top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                      {searchResults.map(s => (
                        <button key={s.MaHS} onClick={() => { setSelectedStudentId(s.MaHS); setStudentSearch(s.Hoten); }} className="w-full px-5 py-3 text-left text-[11px] font-bold text-slate-700 hover:bg-indigo-50 border-b border-slate-50 last:border-0 flex justify-between items-center group transition-colors">
                          <span className="uppercase">{s.Hoten}</span> <span className="text-[9px] text-slate-300 font-black group-hover:text-indigo-500 uppercase tracking-widest">{s.MaHS}</span>
                        </button>
                      ))}
                    </div>
                  )}
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-1 tracking-widest">Trạng thái / Phân loại</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(statusConfig) as AttendanceStatus[]).map(status => {
                      const conf = statusConfig[status];
                      const Icon = conf.icon;
                      return (
                        <button key={status} onClick={() => setCurrentStatus(status)} className={`flex items-center gap-2 p-3 rounded-xl border text-[9px] font-black uppercase transition-all shadow-sm ${currentStatus === status ? `${conf.bg} ${conf.color} border-indigo-300 scale-[1.02]` : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}>
                          <Icon size={14} /> {conf.label}
                        </button>
                      );
                    })}
                  </div>
               </div>
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-1 tracking-widest">Nội dung nhận xét cụ thể</label>
                  <textarea value={currentNote} onChange={e => setCurrentNote(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-[28px] text-xs font-medium min-h-[100px] outline-none focus:bg-white focus:border-indigo-400 transition-all shadow-inner" placeholder="VD: Học sinh nộp bài muộn, mất trật tự trong giờ học..."></textarea>
               </div>
               <button onClick={addStudentToPending} disabled={!selectedStudentId} className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 ${selectedStudentId ? 'bg-indigo-600 text-white shadow-indigo-100' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}><Plus size={18} /> Thêm vào danh sách chờ</button>
            </div>
          </div>

          <div className="lg:col-span-2 flex flex-col h-full">
             <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full min-h-[500px]">
                <div className="p-6 bg-slate-50 border-b flex items-center justify-between shrink-0">
                   <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Users size={18} /></div>
                      <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest">Danh sách chờ lưu ({pendingLogs.length})</h3>
                   </div>
                   <div className="flex items-center gap-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ngày ghi:</label>
                      <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="text-[11px] font-black bg-white border border-slate-200 px-3 py-1.5 rounded-xl outline-none shadow-sm" />
                   </div>
                </div>
                <div className="flex-1 p-6 space-y-3 overflow-y-auto custom-scrollbar bg-slate-50/20">
                   {pendingLogs.length > 0 ? pendingLogs.map(log => {
                      const conf = statusConfig[log.status];
                      return (
                        <div key={log.MaHS} className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 animate-in slide-in-from-right-4">
                           <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${conf.bg} ${conf.color} border border-white`}><conf.icon size={18} /></div>
                           <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1"><h4 className="text-[11px] font-black text-slate-800 uppercase truncate tracking-tight">{log.Hoten}</h4><button onClick={() => removePendingLog(log.MaHS)} className="p-1 text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={16}/></button></div>
                              <p className="text-[10px] text-slate-500 font-medium truncate italic leading-tight">"{log.note || 'Không có nhận xét bổ sung'}"</p>
                           </div>
                           <div className={`px-3 py-1 rounded-xl text-[8px] font-black uppercase tracking-tighter ${conf.color} ${conf.bg} border border-current opacity-60`}>{conf.label}</div>
                        </div>
                      );
                   }) : (
                     <div className="h-full flex flex-col items-center justify-center opacity-30 text-slate-400">
                        <Plus size={48} className="mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Hãy thêm học sinh bên trái</p>
                     </div>
                   )}
                </div>
                {pendingLogs.length > 0 && (
                  <div className="p-6 border-t bg-white shrink-0"><button onClick={saveAllLogs} disabled={isSubmitting} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-emerald-50 active:scale-95 transition-all">{isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Xác nhận lưu vào hệ thống</button></div>
                )}
             </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
           {/* HISTORY TOOLBAR */}
           <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-wrap items-end gap-4">
             <div className="space-y-1.5 flex-1 min-w-[150px]">
                <label className="text-[9px] font-black text-slate-400 uppercase px-1 tracking-widest flex items-center gap-1"><Filter size={10}/> Lọc tháng</label>
                <select value={historyFilterMonth} onChange={e => setHistoryFilterMonth(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none text-slate-700 focus:bg-white transition-all">
                   <option value="all">Tất cả các tháng</option>
                   {Array.from({length: 12}, (_, i) => (
                     <option key={i+1} value={(i+1).toString()}>Tháng {i+1}</option>
                   ))}
                </select>
             </div>
             <div className="space-y-1.5 flex-1 min-w-[150px]">
                <label className="text-[9px] font-black text-slate-400 uppercase px-1 tracking-widest">Từ ngày</label>
                <input type="date" value={historyFilterStart} onChange={e => setHistoryFilterStart(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none" />
             </div>
             <div className="space-y-1.5 flex-1 min-w-[150px]">
                <label className="text-[9px] font-black text-slate-400 uppercase px-1 tracking-widest">Đến ngày</label>
                <input type="date" value={historyFilterEnd} onChange={e => setHistoryFilterEnd(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none" />
             </div>
             <button onClick={() => { setHistoryFilterMonth('all'); setHistoryFilterStart(''); setHistoryFilterEnd(''); }} className="px-4 py-2 text-[9px] font-black text-rose-500 uppercase hover:bg-rose-50 rounded-xl transition-all">Xóa lọc</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLogs.length > 0 ? filteredLogs.map(log => {
              const student = students.find(s => s.MaHS === log.MaHS);
              const conf = statusConfig[log.TrangThai];
              return (
                <div key={log.MaTheoDoi} className="bg-white rounded-[32px] p-5 border border-slate-200 hover:border-indigo-300 transition-all group shadow-sm flex flex-col gap-4 overflow-hidden relative">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${conf.bg} ${conf.color} border border-white shadow-sm`}><conf.icon size={22} /></div>
                      <div className="min-w-0">
                        <h4 className="font-black text-slate-800 text-[11px] uppercase truncate tracking-tight">{student?.Hoten || '---'}</h4>
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{log.NgayGhiChep}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => handleOpenEdit(log)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl"><Edit3 size={16}/></button>
                      <button onClick={() => handleDelete(log.MaTheoDoi)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl"><Trash2 size={16}/></button>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex-1 shadow-inner">
                     <p className="text-[11px] text-slate-700 font-medium leading-relaxed italic line-clamp-3">"{log.NhanXet || 'Học sinh hiện diện bình thường.'}"</p>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                     <span className={`text-[9px] font-black px-3 py-1 rounded-xl uppercase tracking-widest border shadow-sm ${conf.color} ${conf.bg} border-current opacity-80`}>{conf.label}</span>
                     <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{log.MaHS}</span>
                  </div>
                </div>
              );
            }) : (
              <div className="col-span-full py-24 bg-white rounded-[40px] border-2 border-dashed border-slate-100 text-center opacity-40 flex flex-col items-center justify-center">
                 <ClipboardList size={56} className="text-slate-200 mb-4 mx-auto" />
                 <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Không có bản ghi nhật ký nào phù hợp</p>
              </div>
            )}
          </div>
        </div>
      )}

      {isEditModalOpen && editingLog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b flex items-center justify-between bg-slate-50/50">
               <h3 className="font-black text-sm text-slate-800 uppercase tracking-tight">Cập nhật nội dung nhật ký</h3>
               <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20}/></button>
            </div>
            <div className="p-8 space-y-6">
               <div className="flex justify-between text-[10px] font-black text-slate-400 border-b pb-4 border-slate-50 uppercase tracking-widest">
                  <span>Học sinh: <span className="text-slate-800">{students.find(s => s.MaHS === editingLog.MaHS)?.Hoten}</span></span>
                  <span>Ngày: <span className="text-indigo-600">{editingLog.NgayGhiChep}</span></span>
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Cập nhật phân loại</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(statusConfig) as AttendanceStatus[]).map(status => {
                      const conf = statusConfig[status];
                      return (
                        <button key={status} onClick={() => setEditingLog({...editingLog, TrangThai: status})} className={`flex items-center gap-2 p-3 rounded-xl border text-[10px] font-black uppercase transition-all shadow-sm ${editingLog.TrangThai === status ? `${conf.bg} ${conf.color} border-indigo-200` : 'bg-white border-slate-100 text-slate-400'}`}>
                          <conf.icon size={16} /> {conf.label}
                        </button>
                      );
                    })}
                  </div>
               </div>
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nhận xét chi tiết</label>
                  <textarea value={editingLog.NhanXet} onChange={e => setEditingLog({...editingLog, NhanXet: e.target.value})} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-[28px] text-[12px] font-medium min-h-[140px] outline-none focus:bg-white focus:border-indigo-400 transition-all shadow-inner"></textarea>
               </div>
            </div>
            <div className="p-6 bg-slate-50 border-t flex gap-3">
               <button onClick={() => setIsEditModalOpen(false)} className="flex-1 py-3.5 bg-white border border-slate-200 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest">Hủy</button>
               <button onClick={handleSaveEdit} disabled={isSubmitting} className="flex-[2] py-3.5 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all">{isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Lưu thay đổi</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LearningLogs;
