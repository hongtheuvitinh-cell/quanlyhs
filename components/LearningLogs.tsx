
import React, { useState, useMemo } from 'react';
import { 
  ClipboardList, Plus, User, MessageSquare, CheckCircle2, XCircle, Clock, Check, Calendar, Search, Users, AlertTriangle, Save, ChevronRight, Info, UserPlus, Trash2, Loader2
} from 'lucide-react';
import { AppState, Student, LearningLog, Assignment, AttendanceStatus } from '../types';

interface Props {
  state: AppState;
  students: Student[];
  logs: LearningLog[];
  assignment: Assignment;
  onUpdateLogs: (newLogs: LearningLog[]) => void;
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

const LearningLogs: React.FC<Props> = ({ state, students, logs, assignment, onUpdateLogs }) => {
  const [activeTab, setActiveTab] = useState<'history' | 'rollcall'>('history');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // States cho form thêm mới học sinh vào nhật ký
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [currentStatus, setCurrentStatus] = useState<AttendanceStatus>('CO_MAT');
  const [currentNote, setCurrentNote] = useState('');
  
  // Danh sách học sinh đang đợi để lưu
  const [pendingLogs, setPendingLogs] = useState<PendingLog[]>([]);

  const filteredLogs = useMemo(() => {
    return logs.filter(l => l.MaPhanCong === assignment?.MaPhanCong)
               .sort((a, b) => new Date(b.NgayGhiChep).getTime() - new Date(a.NgayGhiChep).getTime());
  }, [logs, assignment]);

  const searchResults = useMemo(() => {
    if (!studentSearch.trim()) return [];
    return students.filter(s => 
      s.Hoten.toLowerCase().includes(studentSearch.toLowerCase()) || 
      s.MaHS.toLowerCase().includes(studentSearch.toLowerCase())
    ).slice(0, 5);
  }, [students, studentSearch]);

  const addStudentToPending = () => {
    if (!selectedStudentId) {
      alert("Vui lòng chọn học sinh!");
      return;
    }
    const student = students.find(s => s.MaHS === selectedStudentId);
    if (!student) return;

    if (pendingLogs.some(l => l.MaHS === selectedStudentId)) {
      alert("Học sinh này đã có trong danh sách ghi chép hiện tại!");
      return;
    }

    setPendingLogs([...pendingLogs, {
      MaHS: student.MaHS,
      Hoten: student.Hoten,
      status: currentStatus,
      note: currentNote
    }]);

    // Reset form chọn
    setSelectedStudentId('');
    setStudentSearch('');
    setCurrentNote('');
    setCurrentStatus('CO_MAT');
  };

  const removePendingLog = (maHS: string) => {
    setPendingLogs(pendingLogs.filter(l => l.MaHS !== maHS));
  };

  const saveAllLogs = async () => {
    if (pendingLogs.length === 0) {
      alert("Chưa có học sinh nào được chọn để ghi chép!");
      return;
    }
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
      alert(`Đã lưu nhật ký cho ${pendingLogs.length} học sinh thành công!`);
      setPendingLogs([]);
      setActiveTab('history');
    } catch (e: any) {
      alert("Lỗi khi lưu nhật ký: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-md"><ClipboardList size={20} /></div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 leading-none mb-1 uppercase tracking-tight">Nhật ký & Ghi chú tiết học</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Môn: {assignment?.MaMonHoc || 'Chủ nhiệm'} • Lớp {state.selectedClass}</p>
          </div>
        </div>
        <div className="flex p-0.5 bg-slate-100 rounded-lg border border-slate-200">
          <button onClick={() => setActiveTab('history')} className={`px-4 py-1.5 rounded-md text-[9px] font-black uppercase transition-all ${activeTab === 'history' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Xem lịch sử</button>
          <button onClick={() => setActiveTab('rollcall')} className={`px-4 py-1.5 rounded-md text-[9px] font-black uppercase transition-all ${activeTab === 'rollcall' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Ghi chép mới</button>
        </div>
      </div>

      {activeTab === 'rollcall' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form thêm học sinh */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm space-y-5">
               <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                 <UserPlus size={16} className="text-indigo-600" /> Chọn học sinh cần lưu ý
               </h3>
               
               <div className="space-y-1.5 relative">
                  <label className="text-[9px] font-bold text-slate-400 uppercase px-1 tracking-widest">Tìm tên học sinh</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                    <input 
                      type="text" 
                      placeholder="Nhập tên hoặc mã HS..." 
                      value={studentSearch} 
                      onChange={e => {
                        setStudentSearch(e.target.value);
                        if (selectedStudentId) setSelectedStudentId('');
                      }} 
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none text-xs font-normal focus:bg-white focus:border-indigo-300 transition-all" 
                    />
                  </div>
                  {searchResults.length > 0 && !selectedStudentId && (
                    <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                      {searchResults.map(s => (
                        <button key={s.MaHS} onClick={() => { setSelectedStudentId(s.MaHS); setStudentSearch(s.Hoten); }} className="w-full px-4 py-2.5 text-left text-[11px] font-bold text-slate-700 hover:bg-indigo-50 border-b border-slate-50 last:border-0 flex justify-between items-center group">
                          {s.Hoten} <span className="text-[9px] text-slate-300 group-hover:text-indigo-400 uppercase tracking-tighter">{s.MaHS}</span>
                        </button>
                      ))}
                    </div>
                  )}
               </div>

               <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase px-1 tracking-widest">Trạng thái/Phân loại</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(statusConfig) as AttendanceStatus[]).map(status => {
                      const conf = statusConfig[status];
                      const Icon = conf.icon;
                      return (
                        <button 
                          key={status} 
                          onClick={() => setCurrentStatus(status)}
                          className={`flex items-center gap-2 p-2.5 rounded-xl border text-[10px] font-bold uppercase transition-all ${currentStatus === status ? `${conf.bg} ${conf.color} border-indigo-200 shadow-sm` : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                        >
                          <Icon size={14} /> {conf.label}
                        </button>
                      );
                    })}
                  </div>
               </div>

               <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase px-1 tracking-widest">Ghi chú (Đặc biệt: Tai nạn, đánh nhau...)</label>
                  <textarea 
                    value={currentNote} 
                    onChange={e => setCurrentNote(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-normal min-h-[100px] outline-none focus:bg-white focus:border-indigo-300 transition-all shadow-sm"
                    placeholder="Nhập chi tiết trường hợp cần ghi chép..."
                  ></textarea>
               </div>

               <button 
                onClick={addStudentToPending}
                disabled={!selectedStudentId}
                className={`w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md ${selectedStudentId ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
               >
                 <Plus size={16} /> Thêm vào danh sách
               </button>
            </div>
          </div>

          {/* Danh sách đang đợi */}
          <div className="lg:col-span-2 space-y-4">
             <div className="bg-white rounded-[28px] border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full min-h-[500px]">
                <div className="p-4 bg-slate-50/50 border-b flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-800 text-xs uppercase tracking-widest">Danh sách ghi chép chờ lưu</h3>
                      <span className="bg-indigo-600 text-white px-2 py-0.5 rounded-full text-[9px] font-black">{pendingLogs.length}</span>
                   </div>
                   <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                         <Calendar size={14} className="text-slate-400" />
                         <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="text-[11px] font-bold bg-white border border-slate-200 px-2 py-1 rounded-lg outline-none" />
                      </div>
                   </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                   {pendingLogs.length > 0 ? pendingLogs.map(log => {
                      const conf = statusConfig[log.status];
                      const Icon = conf.icon;
                      return (
                        <div key={log.MaHS} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 animate-in slide-in-from-right-4">
                           <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${conf.bg} ${conf.color} border border-slate-100`}>
                             <Icon size={20} />
                           </div>
                           <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                 <h4 className="text-xs font-bold text-slate-800 truncate uppercase">{log.Hoten}</h4>
                                 <button onClick={() => removePendingLog(log.MaHS)} className="p-1 text-slate-300 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-all"><Trash2 size={16}/></button>
                              </div>
                              <p className="text-[11px] text-slate-500 font-normal italic leading-relaxed line-clamp-2">"{log.note || 'Không có ghi chú thêm'}"</p>
                           </div>
                        </div>
                      );
                   }) : (
                     <div className="h-full flex flex-col items-center justify-center text-center opacity-30 py-20">
                        <User size={48} className="text-slate-200 mb-3" />
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Chưa có học sinh nào<br/>được chọn để ghi chép đặc biệt</p>
                     </div>
                   )}
                </div>

                {pendingLogs.length > 0 && (
                  <div className="p-4 bg-slate-50 border-t flex flex-col items-center">
                     <button 
                      onClick={saveAllLogs}
                      disabled={isSubmitting}
                      className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                     >
                        {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        {isSubmitting ? "Đang lưu lên Cloud..." : `Lưu tất cả ${pendingLogs.length} bản ghi Cloud`}
                     </button>
                     <p className="mt-3 text-[9px] font-bold text-slate-400 uppercase tracking-tight flex items-center gap-1">
                        <Info size={12} /> Dữ liệu sẽ được lưu trữ vĩnh viễn và hiển thị trong hồ sơ học sinh
                     </p>
                  </div>
                )}
             </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-3">
            {filteredLogs.length > 0 ? filteredLogs.map(log => {
              const student = students.find(s => s.MaHS === log.MaHS);
              const conf = statusConfig[log.TrangThai];
              const StatusIcon = conf.icon;
              return (
                <div key={log.MaTheoDoi} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-4 hover:border-indigo-100 transition-colors group">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${conf.bg} ${conf.color} border border-slate-100 group-hover:shadow-sm transition-all`}>
                    <StatusIcon size={24} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <h4 className="font-bold text-slate-800 text-xs uppercase tracking-tight">{student?.Hoten || 'Học sinh đã xóa'}</h4>
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 rounded-lg text-[10px] text-slate-400 font-bold border border-slate-100">
                        <Calendar size={12} /> {log.NgayGhiChep}
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 font-normal italic leading-relaxed">"{log.NhanXet || 'Bình thường'}"</p>
                  </div>
                </div>
              );
            }) : (
              <div className="py-20 bg-white rounded-[32px] border-2 border-dashed border-slate-100 text-center flex flex-col items-center justify-center opacity-40">
                 <ClipboardList size={48} className="text-slate-200 mb-3" />
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chưa có lịch sử ghi chép tiết học</p>
              </div>
            )}
          </div>
          
          <div className="space-y-4">
             <div className="bg-indigo-600 rounded-[32px] p-6 text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
                <div className="relative z-10">
                   <h3 className="font-black text-sm uppercase tracking-widest mb-2">Thống kê tiết học</h3>
                   <div className="space-y-4 mt-4">
                      <div className="flex justify-between items-center border-b border-white/10 pb-2">
                         <span className="text-[10px] font-bold uppercase opacity-70">Tổng ghi chép</span>
                         <span className="text-xl font-black">{filteredLogs.length}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-white/10 pb-2">
                         <span className="text-[10px] font-bold uppercase opacity-70">Vắng không phép</span>
                         <span className="text-xl font-black text-rose-300">{filteredLogs.filter(l => l.TrangThai === 'VANG_KP').length}</span>
                      </div>
                   </div>
                </div>
                <div className="absolute bottom-0 right-0 opacity-10 -mr-4 -mb-4">
                   <ClipboardList size={120} />
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LearningLogs;
