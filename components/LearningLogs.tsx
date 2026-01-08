
import React, { useState, useMemo, useEffect } from 'react';
import { 
  ClipboardList, Plus, User, MessageSquare, CheckCircle2, XCircle, Clock, Check, Calendar, Search, Users, AlertTriangle, Save, ChevronRight, Info, UserPlus, Trash2, Loader2, Edit3, X, Filter, Lock
} from 'lucide-react';
import { AppState, Student, LearningLog, Assignment, AttendanceStatus, Teacher, Role } from '../types';
import { supabase } from '../services/supabaseClient';

interface Props {
  state: AppState;
  students: Student[];
  assignments: Assignment[];
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

const LearningLogs: React.FC<Props> = ({ state, students, assignments }) => {
  const currentUser = state.currentUser as Teacher;
  const isAdmin = currentUser?.quanly === true;
  const [logs, setLogs] = useState<LearningLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'history' | 'rollcall'>('history');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  const fetchLogs = async () => {
    if (students.length === 0) { setLogs([]); return; }
    setIsLoading(true);
    try {
      const studentIds = students.map(s => s.MaHS);
      const { data, error } = await supabase
        .from('learning_logs')
        .select('*')
        .in('MaHS', studentIds)
        .order('NgayGhiChep', { ascending: false });
      if (error) throw error;
      setLogs(data || []);
    } catch (e) { console.error(e); }
    finally { setTimeout(() => setIsLoading(false), 200); }
  };

  useEffect(() => { fetchLogs(); }, [state.selectedClass, students]);

  const [historyFilterMonth, setHistoryFilterMonth] = useState<string>('all');
  const [historyFilterStart, setHistoryFilterStart] = useState<string>('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [currentStatus, setCurrentStatus] = useState<AttendanceStatus>('CO_MAT');
  const [currentNote, setCurrentNote] = useState('');
  
  const [pendingLogs, setPendingLogs] = useState<PendingLog[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<LearningLog | null>(null);

  const currentTeacherAssignment = useMemo(() => {
    if (!assignments || !state.selectedClass || !currentUser) return undefined;
    return assignments.find(a => 
      a.MaGV === currentUser.MaGV && a.MaLop === state.selectedClass && a.LoaiPhanCong === state.currentRole
    );
  }, [assignments, currentUser, state.selectedClass, state.currentRole]);

  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      const lDate = new Date(l.NgayGhiChep);
      if (isNaN(lDate.getTime())) return true;
      const lMonth = (lDate.getMonth() + 1).toString();
      if (historyFilterMonth !== 'all' && lMonth !== historyFilterMonth) return false;
      if (historyFilterStart && l.NgayGhiChep < historyFilterStart) return false;
      return true;
    });
  }, [logs, historyFilterMonth, historyFilterStart]);

  const canManageLog = (log: LearningLog) => {
    if (isAdmin) return true; // Admin có quyền sửa/xóa mọi nhật ký
    if (!currentUser || !assignments) return false;
    const logAssignment = assignments.find(a => a.MaPhanCong === log.MaPhanCong);
    return logAssignment?.MaGV === currentUser.MaGV;
  };

  const addStudentToPending = () => {
    if (!selectedStudentId) return;
    const student = students.find(s => s.MaHS === selectedStudentId);
    if (!student || pendingLogs.some(l => l.MaHS === selectedStudentId)) return;
    setPendingLogs([...pendingLogs, { MaHS: student.MaHS, Hoten: student.Hoten, status: currentStatus, note: currentNote }]);
    setSelectedStudentId(''); setStudentSearch(''); setCurrentNote(''); setCurrentStatus('CO_MAT');
  };

  const saveAllLogs = async () => {
    if (pendingLogs.length === 0 || !currentTeacherAssignment) return;
    setIsSubmitting(true);
    try {
      const baseId = Math.floor(Date.now() / 1000);
      const newRecords = pendingLogs.map((p, index) => ({
        MaTheoDoi: baseId + index, MaHS: p.MaHS, MaPhanCong: currentTeacherAssignment.MaPhanCong,
        NgayGhiChep: selectedDate, NhanXet: p.note, TrangThai: p.status
      }));
      await supabase.from('learning_logs').insert(newRecords);
      setPendingLogs([]); await fetchLogs(); setActiveTab('history');
    } finally { setIsSubmitting(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Xóa?")) return;
    await supabase.from('learning_logs').delete().eq('MaTheoDoi', id);
    await fetchLogs();
  };

  const handleSaveEdit = async () => {
    if (!editingLog) return;
    setIsSubmitting(true);
    try {
      await supabase.from('learning_logs').update(editingLog).eq('MaTheoDoi', editingLog.MaTheoDoi);
      setIsEditModalOpen(false); setEditingLog(null); await fetchLogs();
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="space-y-4 animate-in fade-in pb-20">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 rounded-2xl text-white shadow-lg"><ClipboardList size={22} /></div>
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Nhật ký theo dõi</h2>
            <p className="text-[10px] text-slate-400 font-bold mt-1">Lớp {state.selectedClass} • {isAdmin ? 'Quản trị viên (Toàn quyền)' : `${logs.length} ghi chép`}</p>
          </div>
        </div>
        <div className="flex p-1 bg-slate-100 rounded-xl">
          <button onClick={() => setActiveTab('history')} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${activeTab === 'history' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Lịch sử</button>
          <button onClick={() => setActiveTab('rollcall')} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${activeTab === 'rollcall' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Ghi chú nhanh</button>
        </div>
      </div>

      <div className="relative min-h-[400px]">
        {isLoading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-3">
             <Loader2 className="animate-spin text-indigo-600" size={32} />
             <p className="text-[10px] font-black text-slate-500 uppercase">Đang truy xuất nhật ký...</p>
          </div>
        )}

        {activeTab === 'rollcall' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white p-6 rounded-[32px] border shadow-sm space-y-5">
                 <h3 className="text-xs font-black text-slate-800 uppercase flex items-center gap-2"><UserPlus size={18} /> Thêm ghi chép</h3>
                 <div className="space-y-1.5 relative">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Tìm học sinh</label>
                    <input type="text" placeholder="Nhập tên hoặc mã..." value={studentSearch} onChange={e => { setStudentSearch(e.target.value); setSelectedStudentId(''); }} className="w-full p-3 bg-slate-50 border rounded-2xl text-xs font-bold outline-none" />
                    {studentSearch.trim() && !selectedStudentId && (
                      <div className="absolute z-30 top-full left-0 right-0 mt-2 bg-white border rounded-2xl shadow-2xl overflow-hidden">
                        {students.filter(s => s.Hoten.toLowerCase().includes(studentSearch.toLowerCase())).slice(0,5).map(s => (
                          <button key={s.MaHS} onClick={() => { setSelectedStudentId(s.MaHS); setStudentSearch(s.Hoten); }} className="w-full px-5 py-3 text-left text-[11px] font-bold border-b last:border-0 hover:bg-indigo-50">
                            {s.Hoten} <span className="text-[9px] text-slate-300">({s.MaHS})</span>
                          </button>
                        ))}
                      </div>
                    )}
                 </div>
                 <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(statusConfig) as AttendanceStatus[]).map(status => (
                      <button key={status} onClick={() => setCurrentStatus(status)} className={`flex items-center gap-2 p-3 rounded-xl border text-[9px] font-black uppercase transition-all ${currentStatus === status ? `${statusConfig[status].bg} ${statusConfig[status].color} border-indigo-300` : 'bg-white text-slate-400'}`}>
                        {statusConfig[status].label}
                      </button>
                    ))}
                 </div>
                 <textarea value={currentNote} onChange={e => setCurrentNote(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-[28px] text-xs font-medium min-h-[100px] outline-none" placeholder="Nhận xét cụ thể..."></textarea>
                 <button onClick={addStudentToPending} disabled={!selectedStudentId} className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all ${selectedStudentId ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-300'}`}><Plus size={18} /> Thêm vào danh sách</button>
              </div>
            </div>
            <div className="lg:col-span-2 flex flex-col h-full bg-white rounded-[40px] border shadow-sm overflow-hidden">
                <div className="p-6 bg-slate-50 border-b flex items-center justify-between">
                   <h3 className="font-black text-slate-800 text-xs uppercase">Danh sách chờ lưu ({pendingLogs.length})</h3>
                   <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="text-[11px] font-black bg-white border px-3 py-1.5 rounded-xl outline-none" />
                </div>
                <div className="flex-1 p-6 space-y-3 overflow-y-auto custom-scrollbar">
                   {pendingLogs.map(log => (
                      <div key={log.MaHS} className="bg-white p-4 rounded-3xl border shadow-sm flex items-center gap-4">
                         <div className="flex-1"><h4 className="text-[11px] font-black text-slate-800 uppercase">{log.Hoten}</h4><p className="text-[10px] text-slate-500 italic">"{log.note || 'Bình thường'}"</p></div>
                         <button onClick={() => setPendingLogs(pendingLogs.filter(l => l.MaHS !== log.MaHS))} className="p-1 text-slate-300 hover:text-rose-500"><Trash2 size={16}/></button>
                      </div>
                   ))}
                </div>
                {pendingLogs.length > 0 && (
                  <div className="p-6 border-t"><button onClick={saveAllLogs} disabled={isSubmitting} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-[11px] uppercase flex items-center justify-center gap-3">{isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Lưu vào hệ thống</button></div>
                )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
             <div className="bg-white p-4 rounded-3xl border shadow-sm flex flex-wrap items-end gap-4">
               <div className="space-y-1.5 flex-1 min-w-[150px]">
                  <label className="text-[9px] font-black text-slate-400 uppercase">Tháng</label>
                  <select value={historyFilterMonth} onChange={e => setHistoryFilterMonth(e.target.value)} className="w-full p-2 bg-slate-50 border rounded-xl text-xs font-bold outline-none">
                     <option value="all">Tất cả</option>
                     {Array.from({length: 12}, (_, i) => (<option key={i+1} value={(i+1).toString()}>Tháng {i+1}</option>))}
                  </select>
               </div>
               <button onClick={() => { setHistoryFilterMonth('all'); setHistoryFilterStart(''); }} className="px-4 py-2 text-[9px] font-black text-rose-500 uppercase hover:bg-rose-50 rounded-xl transition-all">Xóa lọc</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLogs.map(log => {
                const student = students.find(s => s.MaHS === log.MaHS);
                const conf = statusConfig[log.TrangThai] || statusConfig.CO_MAT;
                return (
                  <div key={log.MaTheoDoi} className="bg-white rounded-[32px] p-5 border hover:border-indigo-300 transition-all group shadow-sm flex flex-col gap-4 relative">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${conf.bg} ${conf.color}`}><conf.icon size={20} /></div>
                        <div><h4 className="font-black text-slate-800 text-[11px] uppercase truncate">{student?.Hoten || '---'}</h4><p className="text-[9px] text-slate-400 font-black">{log.NgayGhiChep}</p></div>
                      </div>
                      {canManageLog(log) && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => { setEditingLog(log); setIsEditModalOpen(true); }} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl"><Edit3 size={16}/></button>
                          <button onClick={() => handleDelete(log.MaTheoDoi)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl"><Trash2 size={16}/></button>
                        </div>
                      )}
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border italic text-[11px] text-slate-700">"{log.NhanXet || 'Học sinh hiện diện bình thường.'}"</div>
                    <div className="flex justify-between items-center"><span className={`text-[9px] font-black px-3 py-1 rounded-xl uppercase ${conf.color} ${conf.bg} border border-current opacity-80`}>{conf.label}</span></div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {isEditModalOpen && editingLog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between">
               <h3 className="font-black text-sm text-slate-800 uppercase">Cập nhật nhật ký</h3>
               <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full"><X size={20}/></button>
            </div>
            <div className="p-8 space-y-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Cập nhật phân loại</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(statusConfig) as AttendanceStatus[]).map(status => (
                      <button key={status} onClick={() => setEditingLog({...editingLog, TrangThai: status})} className={`flex items-center gap-2 p-3 rounded-xl border text-[10px] font-black uppercase transition-all shadow-sm ${editingLog.TrangThai === status ? `${statusConfig[status].bg} ${statusConfig[status].color} border-indigo-200` : 'bg-white border-slate-100 text-slate-400'}`}>
                        {statusConfig[status].label}
                      </button>
                    ))}
                  </div>
               </div>
               <textarea value={editingLog.NhanXet} onChange={e => setEditingLog({...editingLog, NhanXet: e.target.value})} className="w-full p-5 bg-slate-50 border rounded-[28px] text-[12px] font-medium min-h-[140px] outline-none shadow-inner"></textarea>
            </div>
            <div className="p-6 bg-slate-50 border-t flex gap-3">
               <button onClick={() => setIsEditModalOpen(false)} className="flex-1 py-3.5 bg-white border text-slate-500 rounded-2xl font-black text-[10px] uppercase">Hủy</button>
               <button onClick={handleSaveEdit} disabled={isSubmitting} className="flex-[2] py-3.5 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2 shadow-xl">{isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Lưu thay đổi</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LearningLogs;
