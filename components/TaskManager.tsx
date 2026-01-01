
import React, { useState, useMemo } from 'react';
import { Send, CheckCircle, Circle, Calendar, Plus, X, ClipboardCheck, Trophy, Clock, Target, Edit2, Trash2, Save, BookOpen, Users, Check, Loader2, Info, ChevronRight, UserPlus, Filter, Search } from 'lucide-react';
import { AppState, Student, AssignmentTask, Teacher, Role } from '../types';

interface Props {
  state: AppState;
  students: Student[];
  tasks: AssignmentTask[];
  onUpdateTasks: (tasks: AssignmentTask[]) => Promise<void>;
  onDeleteTask: (taskId: number) => Promise<void>;
}

const subjects = [
  { id: 'TOAN', name: 'Toán Học' }, { id: 'VAN', name: 'Ngữ Văn' }, { id: 'ANH', name: 'Tiếng Anh' },
  { id: 'LY', name: 'Vật Lý' }, { id: 'HOA', name: 'Hóa Học' }, { id: 'SINH', name: 'Sinh Học' },
  { id: 'DIA', name: 'Địa Lý' }, { id: 'SU', name: 'Lịch Sử' }, { id: 'GDCD', name: 'GDCD' },
  { id: 'SHL', name: 'Sinh hoạt lớp' }
];

const TaskManager: React.FC<Props> = ({ state, students, tasks, onUpdateTasks, onDeleteTask }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTask, setSelectedTask] = useState<AssignmentTask | null>(null);
  
  // Bộ lọc
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'expired'>('all');

  const [taskForm, setTaskForm] = useState({ 
    MaNhiemVu: 0, 
    TieuDe: '', 
    MoTa: '', 
    HanChot: new Date().toISOString().split('T')[0], 
    MaMonHoc: state.selectedSubject || 'SHL' 
  });
  
  const [assignedStudentIds, setAssignedStudentIds] = useState<string[]>([]);
  const [studentFilter, setStudentFilter] = useState('');

  const currentTasks = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    
    return tasks.filter(t => {
      if (t.MaLop !== state.selectedClass) return false;
      if (state.currentRole !== Role.CHU_NHIEM && t.MaMonHoc !== (state.selectedSubject || 'SHL')) return false;
      
      const tMonth = (new Date(t.HanChot).getMonth() + 1).toString();
      if (filterMonth !== 'all' && tMonth !== filterMonth) return false;
      
      if (filterStatus === 'active' && t.HanChot < today) return false;
      if (filterStatus === 'expired' && t.HanChot >= today) return false;
      
      return true;
    }).sort((a, b) => b.MaNhiemVu - a.MaNhiemVu);
  }, [tasks, state.selectedClass, state.selectedSubject, state.currentRole, filterMonth, filterStatus]);

  const handleOpenAdd = () => {
    setModalMode('add');
    setTaskForm({ 
      MaNhiemVu: 0, 
      TieuDe: '', 
      MoTa: '', 
      HanChot: new Date().toISOString().split('T')[0], 
      MaMonHoc: state.selectedSubject || (subjects[0].id)
    });
    setAssignedStudentIds(students.map(s => s.MaHS));
    setIsModalOpen(true);
  };

  const handleOpenEdit = (task: AssignmentTask) => {
    setModalMode('edit');
    setTaskForm({
      MaNhiemVu: task.MaNhiemVu,
      TieuDe: task.TieuDe,
      MoTa: task.MoTa,
      HanChot: task.HanChot,
      MaMonHoc: task.MaMonHoc
    });
    setAssignedStudentIds(task.DanhSachGiao || []);
    setIsModalOpen(true);
  };

  const handleSaveTask = async () => {
    if (!taskForm.TieuDe.trim() || assignedStudentIds.length === 0) {
      alert("Vui lòng nhập tiêu đề và chọn ít nhất 1 học sinh!");
      return;
    }
    setIsSubmitting(true);
    try {
      const task: AssignmentTask = {
        MaNhiemVu: modalMode === 'add' ? Math.floor(Date.now() / 1000) : taskForm.MaNhiemVu,
        TieuDe: taskForm.TieuDe, 
        MoTa: taskForm.MoTa, 
        MaLop: state.selectedClass, 
        MaMonHoc: taskForm.MaMonHoc,
        MaGV: (state.currentUser as Teacher)?.MaGV || '', 
        HanChot: taskForm.HanChot, 
        MaNienHoc: state.selectedYear,
        DanhSachGiao: assignedStudentIds, 
        DanhSachHoanThanh: modalMode === 'edit' ? (tasks.find(t => t.MaNhiemVu === taskForm.MaNhiemVu)?.DanhSachHoanThanh || []) : [],
        BaoCaoNhiemVu: modalMode === 'edit' ? (tasks.find(t => t.MaNhiemVu === taskForm.MaNhiemVu)?.BaoCaoNhiemVu || {}) : {}
      };
      await onUpdateTasks([task]);
      setIsModalOpen(false);
      if (selectedTask?.MaNhiemVu === task.MaNhiemVu) setSelectedTask(task);
    } finally { setIsSubmitting(false); }
  };

  const toggleStudent = (id: string) => {
    setAssignedStudentIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const filteredStudentsForModal = useMemo(() => {
    return students.filter(s => s.Hoten.toLowerCase().includes(studentFilter.toLowerCase()) || s.MaHS.includes(studentFilter));
  }, [students, studentFilter]);

  return (
    <div className="space-y-4 animate-in fade-in pb-20">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-100"><Send size={20} /></div>
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Giao bài & Nhiệm vụ học tập</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Lớp {state.selectedClass} • {currentTasks.length} nhiệm vụ được lọc</p>
          </div>
        </div>
        <button onClick={handleOpenAdd} className="px-8 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 flex items-center gap-2 hover:bg-indigo-700 active:scale-95 transition-all"><Plus size={18} /> Tạo mới nhiệm vụ</button>
      </div>

      {/* TASK FILTER TOOLBAR */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-wrap items-end gap-5">
         <div className="space-y-1.5 flex-1 min-w-[150px]">
            <label className="text-[9px] font-black text-slate-400 uppercase px-1 tracking-widest flex items-center gap-1"><Filter size={10}/> Tháng hạn nộp</label>
            <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold outline-none text-slate-700 focus:bg-white transition-all">
               <option value="all">Tất cả thời gian</option>
               {Array.from({length: 12}, (_, i) => (
                 <option key={i+1} value={(i+1).toString()}>Hạn nộp Tháng {i+1}</option>
               ))}
            </select>
         </div>
         <div className="space-y-1.5 flex-1 min-w-[150px]">
            <label className="text-[9px] font-black text-slate-400 uppercase px-1 tracking-widest">Trạng thái thời hạn</label>
            <div className="flex p-1 bg-slate-50 border border-slate-200 rounded-xl">
               <button onClick={() => setFilterStatus('all')} className={`flex-1 py-1.5 px-3 rounded-lg text-[9px] font-black uppercase transition-all ${filterStatus === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Tất cả</button>
               <button onClick={() => setFilterStatus('active')} className={`flex-1 py-1.5 px-3 rounded-lg text-[9px] font-black uppercase transition-all ${filterStatus === 'active' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Đang mở</button>
               <button onClick={() => setFilterStatus('expired')} className={`flex-1 py-1.5 px-3 rounded-lg text-[9px] font-black uppercase transition-all ${filterStatus === 'expired' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Hết hạn</button>
            </div>
         </div>
         <button onClick={() => { setFilterMonth('all'); setFilterStatus('all'); }} className="px-4 py-2 text-[9px] font-black text-rose-500 uppercase hover:bg-rose-50 rounded-xl transition-all">Thiết lập lại</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-4">
          {currentTasks.length > 0 ? currentTasks.map(task => {
            const isSelected = selectedTask?.MaNhiemVu === task.MaNhiemVu;
            const progress = task.DanhSachGiao?.length > 0 ? Math.round((task.DanhSachHoanThanh.length / task.DanhSachGiao.length) * 100) : 0;
            const isExpired = task.HanChot < new Date().toISOString().split('T')[0];
            
            return (
              <div key={task.MaNhiemVu} onClick={() => setSelectedTask(task)} className={`p-6 rounded-[32px] border transition-all cursor-pointer group relative overflow-hidden ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xl shadow-indigo-100 scale-[1.02]' : 'bg-white border-slate-200 hover:border-indigo-300 shadow-sm'}`}>
                <div className="flex justify-between items-start mb-3">
                  <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-xl border ${isSelected ? 'bg-white/10 border-white/20 text-white' : 'bg-indigo-50 border-indigo-100 text-indigo-600'}`}>{task.MaMonHoc}</span>
                  <div className="flex items-center gap-2">
                    {isExpired && !isSelected && <span className="text-[8px] font-black bg-rose-50 text-rose-500 px-2 py-0.5 rounded-lg border border-rose-100 uppercase tracking-tighter">Hết hạn</span>}
                    <span className={`text-[10px] font-black uppercase ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>{task.HanChot}</span>
                  </div>
                </div>
                <h4 className="font-black text-sm line-clamp-1 mb-4 uppercase tracking-tight">{task.TieuDe}</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                    <span className={isSelected ? 'text-indigo-100' : 'text-slate-400'}>Nộp bài: {task.DanhSachHoanThanh.length}/{task.DanhSachGiao?.length}</span>
                    <span>{progress}%</span>
                  </div>
                  <div className={`h-2 w-full rounded-full overflow-hidden ${isSelected ? 'bg-white/20' : 'bg-slate-100 shadow-inner'}`}>
                    <div className={`h-full transition-all duration-700 ${isSelected ? 'bg-white shadow-[0_0_12px_white]' : 'bg-indigo-500 shadow-md'}`} style={{width: `${progress}%`}}></div>
                  </div>
                </div>
                {isSelected && (
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(task); }} className="p-2 bg-white/20 hover:bg-white/40 rounded-xl"><Edit2 size={14} /></button>
                    <button onClick={(e) => { e.stopPropagation(); if(confirm("Xóa nhiệm vụ này?")) onDeleteTask(task.MaNhiemVu); }} className="p-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl shadow-lg"><Trash2 size={14}/></button>
                  </div>
                )}
              </div>
            );
          }) : (
             <div className="py-24 bg-white rounded-[40px] border-2 border-dashed border-slate-100 text-center opacity-40 flex flex-col items-center justify-center">
                <Target size={56} className="text-slate-200 mb-4 mx-auto" />
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">Không có nhiệm vụ nào<br/>phù hợp với bộ lọc</p>
             </div>
          )}
        </div>

        <div className="lg:col-span-8">
          {selectedTask ? (
            <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full min-h-[600px] animate-in slide-in-from-right-4">
              <div className="p-8 bg-slate-50/50 border-b flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                   <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg"><ClipboardCheck size={24} /></div>
                   <div>
                     <h3 className="font-black text-slate-800 text-base uppercase tracking-tight leading-none">{selectedTask.TieuDe}</h3>
                     <div className="flex items-center gap-3 mt-1.5">
                        <p className="text-[10px] text-indigo-600 font-black uppercase tracking-widest border border-indigo-100 bg-white px-2 py-0.5 rounded-lg">Môn: {selectedTask.MaMonHoc}</p>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Hạn nộp cuối: {selectedTask.HanChot}</p>
                     </div>
                   </div>
                </div>
                <div className="flex gap-2">
                   <button onClick={() => handleOpenEdit(selectedTask)} className="p-2.5 text-indigo-600 hover:bg-white border border-transparent hover:border-indigo-100 rounded-2xl transition-all shadow-sm"><Edit2 size={20}/></button>
                   <button onClick={() => { if(confirm("Xóa nhiệm vụ?")) onDeleteTask(selectedTask.MaNhiemVu).then(() => setSelectedTask(null)); }} className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"><Trash2 size={20}/></button>
                </div>
              </div>
              <div className="p-8 border-b bg-white">
                <div className="flex items-center gap-2 mb-3">
                   <Info size={14} className="text-slate-400" />
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nội dung & Yêu cầu chi tiết</p>
                </div>
                <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 text-xs font-medium text-slate-700 leading-relaxed italic shadow-inner">
                  "{selectedTask.MoTa || 'Không có mô tả chi tiết cho nhiệm vụ này.'}"
                </div>
              </div>
              <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-slate-50/20">
                <div className="flex items-center justify-between mb-6 px-2">
                   <p className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Học sinh được giao ({selectedTask.DanhSachGiao?.length})</p>
                   <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-widest">
                      <span className="flex items-center gap-1.5 text-emerald-600"><CheckCircle size={14} /> Hoàn thành: {selectedTask.DanhSachHoanThanh.length}</span>
                      <span className="flex items-center gap-1.5 text-slate-300"><Clock size={14} /> Đang chờ: {selectedTask.DanhSachGiao?.length - selectedTask.DanhSachHoanThanh.length}</span>
                   </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {students.filter(s => !selectedTask.DanhSachGiao || selectedTask.DanhSachGiao.includes(s.MaHS)).map(s => {
                    const isDone = selectedTask.DanhSachHoanThanh.includes(s.MaHS);
                    const link = selectedTask.BaoCaoNhiemVu?.[s.MaHS];
                    return (
                      <div key={s.MaHS} className={`p-4 rounded-3xl border transition-all flex items-center justify-between group shadow-sm ${isDone ? 'bg-emerald-50/50 border-emerald-200' : 'bg-white border-slate-100'}`}>
                        <div className="flex items-center gap-4">
                           <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shadow-sm ${isDone ? 'bg-white text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>{s.Hoten.charAt(0)}</div>
                           <div>
                             <span className="text-xs font-black text-slate-700 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{s.Hoten}</span>
                             {link && <a href={link} target="_blank" className="block text-[9px] text-indigo-500 hover:underline mt-1 font-black uppercase tracking-widest">Xem sản phẩm bài làm &rarr;</a>}
                           </div>
                        </div>
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm ${isDone ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400 opacity-60'}`}>
                          {isDone ? <Check size={12} /> : <Clock size={12} />}
                          {isDone ? 'Xong' : 'Chờ'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full bg-white rounded-[40px] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-300 gap-6">
              <div className="p-8 bg-slate-50 rounded-[32px] animate-bounce shadow-inner"><Trophy size={64} className="opacity-10" /></div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Chọn một nhiệm vụ bên trái để xem tiến độ</p>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-3xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b flex items-center justify-between bg-white shrink-0">
               <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg"><Send size={20} /></div>
                  <h3 className="font-black text-base text-slate-800 uppercase tracking-tight">{modalMode === 'add' ? 'Phát hành nhiệm vụ mới' : 'Cập nhật nội dung nhiệm vụ'}</h3>
               </div>
               <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={24}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-8 bg-slate-50/20">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                 <div className="space-y-6">
                    <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2"><Info size={16} className="text-indigo-400"/> Chi tiết bài tập</h5>
                    <div className="space-y-5">
                       <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase px-1 tracking-widest">Tiêu đề nhiệm vụ</label>
                          <input type="text" value={taskForm.TieuDe} onChange={e => setTaskForm({...taskForm, TieuDe: e.target.value})} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-indigo-400 shadow-sm transition-all" placeholder="Nhập tên bài tập/nhiệm vụ..." />
                       </div>
                       <div className="grid grid-cols-2 gap-5">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase px-1 tracking-widest">Môn học</label>
                            <select value={taskForm.MaMonHoc} onChange={e => setTaskForm({...taskForm, MaMonHoc: e.target.value})} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-xs font-black outline-none text-indigo-600 shadow-sm">
                              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase px-1 tracking-widest">Hạn chót nộp bài</label>
                            <input type="date" value={taskForm.HanChot} onChange={e => setTaskForm({...taskForm, HanChot: e.target.value})} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-xs font-black outline-none shadow-sm" />
                          </div>
                       </div>
                       <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase px-1 tracking-widest">Mô tả yêu cầu cụ thể</label>
                          <textarea value={taskForm.MoTa} onChange={e => setTaskForm({...taskForm, MoTa: e.target.value})} className="w-full p-5 bg-white border border-slate-200 rounded-[32px] h-40 text-xs font-medium outline-none focus:border-indigo-400 shadow-sm transition-all" placeholder="Ghi chú chi tiết yêu cầu nộp bài, hình thức báo cáo..."></textarea>
                       </div>
                    </div>
                 </div>

                 <div className="space-y-6">
                    <div className="flex items-center justify-between px-1">
                       <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><UserPlus size={16} className="text-emerald-400" /> Chọn học sinh giao bài</h5>
                       <div className="flex gap-4">
                          <button onClick={() => setAssignedStudentIds(students.map(s => s.MaHS))} className="text-[10px] font-black text-indigo-600 hover:underline uppercase tracking-tighter">Tất cả</button>
                          <button onClick={() => setAssignedStudentIds([])} className="text-[10px] font-black text-rose-500 hover:underline uppercase tracking-tighter">Hủy hết</button>
                       </div>
                    </div>
                    <div className="space-y-4">
                       <div className="relative">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input type="text" placeholder="Tìm tên học sinh nhanh..." value={studentFilter} onChange={e => setStudentFilter(e.target.value)} className="w-full pl-12 pr-5 py-3.5 bg-white border border-slate-200 rounded-2xl text-[12px] font-bold outline-none focus:border-indigo-300 shadow-sm transition-all" />
                       </div>
                       <div className="bg-white border border-slate-200 rounded-[32px] max-h-[350px] overflow-y-auto p-3 custom-scrollbar shadow-inner">
                          {filteredStudentsForModal.length > 0 ? filteredStudentsForModal.map(s => (
                            <button key={s.MaHS} onClick={() => toggleStudent(s.MaHS)} className={`w-full flex items-center justify-between p-3.5 rounded-2xl mb-2 last:mb-0 transition-all ${assignedStudentIds.includes(s.MaHS) ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-slate-50 border border-transparent'}`}>
                               <div className="flex items-center gap-4">
                                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-black shadow-sm ${assignedStudentIds.includes(s.MaHS) ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{s.Hoten.charAt(0)}</div>
                                  <span className={`text-[11px] font-black uppercase tracking-tight ${assignedStudentIds.includes(s.MaHS) ? 'text-indigo-800' : 'text-slate-500'}`}>{s.Hoten}</span>
                               </div>
                               {assignedStudentIds.includes(s.MaHS) ? <CheckCircle size={18} className="text-indigo-600 shadow-sm" /> : <Circle size={18} className="text-slate-200" />}
                            </button>
                          )) : (
                            <div className="py-10 text-center text-[10px] font-black text-slate-300 uppercase">Không tìm thấy học sinh</div>
                          )}
                       </div>
                       <div className="bg-indigo-600 p-3 rounded-2xl text-center shadow-lg shadow-indigo-100">
                          <p className="text-[10px] font-black text-white uppercase tracking-widest">Đã chọn: {assignedStudentIds.length} / {students.length} thành viên</p>
                       </div>
                    </div>
                 </div>
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t flex justify-end gap-4 shrink-0">
               <button onClick={() => setIsModalOpen(false)} className="px-8 py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-100 transition-all shadow-sm">Đóng lại</button>
               <button onClick={handleSaveTask} disabled={isSubmitting} className="px-12 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-3 text-[11px] uppercase tracking-widest">
                  {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Save size={20}/>}
                  {modalMode === 'add' ? 'Phát hành nhiệm vụ' : 'Lưu mọi thay đổi'}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskManager;
