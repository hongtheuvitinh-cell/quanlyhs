
import React, { useState, useMemo } from 'react';
// Added Search to the imports from lucide-react
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
    return tasks.filter(t => t.MaLop === state.selectedClass && 
      (state.currentRole === Role.CHU_NHIEM ? true : t.MaMonHoc === (state.selectedSubject || 'SHL')))
      .sort((a, b) => b.MaNhiemVu - a.MaNhiemVu);
  }, [tasks, state.selectedClass, state.selectedSubject, state.currentRole]);

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-md"><Send size={18} /></div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Giao bài & Nhiệm vụ</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Lớp {state.selectedClass} • {currentTasks.length} nhiệm vụ</p>
          </div>
        </div>
        <button onClick={handleOpenAdd} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 flex items-center gap-2 hover:bg-indigo-700 active:scale-95 transition-all"><Plus size={16} /> Tạo nhiệm vụ</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-3">
          {currentTasks.length > 0 ? currentTasks.map(task => {
            const isSelected = selectedTask?.MaNhiemVu === task.MaNhiemVu;
            const progress = task.DanhSachGiao?.length > 0 ? Math.round((task.DanhSachHoanThanh.length / task.DanhSachGiao.length) * 100) : 0;
            return (
              <div key={task.MaNhiemVu} onClick={() => setSelectedTask(task)} className={`p-5 rounded-3xl border transition-all cursor-pointer group relative ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-white border-slate-200 hover:border-indigo-300 shadow-sm'}`}>
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border ${isSelected ? 'bg-white/10 border-white/20 text-white' : 'bg-indigo-50 border-indigo-100 text-indigo-600'}`}>{task.MaMonHoc}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-bold uppercase ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>{task.HanChot}</span>
                  </div>
                </div>
                <h4 className="font-bold text-xs line-clamp-1 mb-3">{task.TieuDe}</h4>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[9px] font-bold uppercase">
                    <span className={isSelected ? 'text-indigo-100' : 'text-slate-400'}>Hoàn thành: {task.DanhSachHoanThanh.length}/{task.DanhSachGiao?.length}</span>
                    <span>{progress}%</span>
                  </div>
                  <div className={`h-1.5 w-full rounded-full overflow-hidden ${isSelected ? 'bg-white/20' : 'bg-slate-100'}`}>
                    <div className={`h-full transition-all duration-500 ${isSelected ? 'bg-white shadow-[0_0_8px_white]' : 'bg-indigo-500 shadow-sm'}`} style={{width: `${progress}%`}}></div>
                  </div>
                </div>
                {isSelected && (
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(task); }} className="p-1.5 bg-white/20 hover:bg-white/40 rounded-lg"><Edit2 size={12} /></button>
                    <button onClick={(e) => { e.stopPropagation(); onDeleteTask(task.MaNhiemVu); }} className="p-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg"><Trash2 size={12}/></button>
                  </div>
                )}
              </div>
            );
          }) : (
             <div className="py-20 bg-white rounded-[32px] border-2 border-dashed border-slate-100 text-center opacity-40">
                <Target size={40} className="text-slate-200 mb-2 mx-auto" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">Chưa có nhiệm vụ<br/>nào được tạo</p>
             </div>
          )}
        </div>

        <div className="lg:col-span-8">
          {selectedTask ? (
            <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full min-h-[500px] animate-in slide-in-from-right-4">
              <div className="p-6 bg-slate-50/50 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><ClipboardCheck size={18} /></div>
                   <div>
                     <h3 className="font-black text-slate-800 text-sm uppercase tracking-tight">{selectedTask.TieuDe}</h3>
                     <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Hạn nộp: {selectedTask.HanChot}</p>
                   </div>
                </div>
                <div className="flex gap-2">
                   <button onClick={() => handleOpenEdit(selectedTask)} className="p-2 text-indigo-600 hover:bg-white border border-transparent hover:border-indigo-100 rounded-xl transition-all shadow-sm" title="Sửa nhiệm vụ"><Edit2 size={18}/></button>
                   <button onClick={() => onDeleteTask(selectedTask.MaNhiemVu).then(() => setSelectedTask(null))} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all" title="Xóa nhiệm vụ"><Trash2 size={18}/></button>
                </div>
              </div>
              <div className="p-6 border-b bg-white">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Mô tả nhiệm vụ</p>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs font-medium text-slate-700 leading-relaxed italic">
                  "{selectedTask.MoTa || 'Không có mô tả chi tiết cho nhiệm vụ này.'}"
                </div>
              </div>
              <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-slate-50/20">
                <div className="flex items-center justify-between mb-4 px-2">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Danh sách học sinh được giao ({selectedTask.DanhSachGiao?.length})</p>
                   <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-tighter">
                      <span className="flex items-center gap-1 text-emerald-600"><CheckCircle size={12} /> Xong: {selectedTask.DanhSachHoanThanh.length}</span>
                      <span className="flex items-center gap-1 text-slate-300"><Clock size={12} /> Đợi: {selectedTask.DanhSachGiao?.length - selectedTask.DanhSachHoanThanh.length}</span>
                   </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {students.filter(s => !selectedTask.DanhSachGiao || selectedTask.DanhSachGiao.includes(s.MaHS)).map(s => {
                    const isDone = selectedTask.DanhSachHoanThanh.includes(s.MaHS);
                    const link = selectedTask.BaoCaoNhiemVu?.[s.MaHS];
                    return (
                      <div key={s.MaHS} className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between group ${isDone ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-100 shadow-sm'}`}>
                        <div className="flex items-center gap-3">
                           <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-[10px] ${isDone ? 'bg-white text-emerald-600 shadow-sm' : 'bg-slate-50 text-slate-400'}`}>{s.Hoten.charAt(0)}</div>
                           <div>
                             <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-600 transition-colors uppercase">{s.Hoten}</span>
                             {link && <a href={link} target="_blank" className="block text-[8px] text-indigo-500 hover:underline mt-0.5 font-bold uppercase tracking-tighter">Xem báo cáo &rarr;</a>}
                           </div>
                        </div>
                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-tighter ${isDone ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-400'}`}>
                          {isDone ? <Check size={10} /> : <Clock size={10} />}
                          {isDone ? 'Hoàn thành' : 'Chưa xong'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full bg-white rounded-[40px] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-300 gap-4">
              <div className="p-6 bg-slate-50 rounded-full animate-bounce"><Trophy size={48} className="opacity-20" /></div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Chọn nhiệm vụ bên trái để xem chi tiết</p>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b flex items-center justify-between bg-white shrink-0">
               <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-600 rounded-xl text-white"><Send size={18} /></div>
                  <h3 className="font-black text-sm text-slate-800 uppercase tracking-tight">{modalMode === 'add' ? 'Phân công nhiệm vụ mới' : 'Cập nhật nhiệm vụ'}</h3>
               </div>
               <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-6 bg-slate-50/30">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-4">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2"><Info size={14} /> Thông tin chung</h5>
                    <div className="space-y-4">
                       <div className="space-y-1.5">
                          <label className="text-[9px] font-bold text-slate-500 uppercase px-1">Tiêu đề nhiệm vụ</label>
                          <input type="text" value={taskForm.TieuDe} onChange={e => setTaskForm({...taskForm, TieuDe: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-indigo-400 shadow-sm" placeholder="VD: Nộp báo cáo chuyên đề..." />
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-bold text-slate-500 uppercase px-1">Môn học</label>
                            <select value={taskForm.MaMonHoc} onChange={e => setTaskForm({...taskForm, MaMonHoc: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none text-indigo-600">
                              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-bold text-slate-500 uppercase px-1">Hạn nộp</label>
                            <input type="date" value={taskForm.HanChot} onChange={e => setTaskForm({...taskForm, HanChot: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none" />
                          </div>
                       </div>
                       <div className="space-y-1.5">
                          <label className="text-[9px] font-bold text-slate-500 uppercase px-1">Mô tả & Yêu cầu</label>
                          <textarea value={taskForm.MoTa} onChange={e => setTaskForm({...taskForm, MoTa: e.target.value})} className="w-full p-4 bg-white border border-slate-200 rounded-2xl h-32 text-xs font-medium outline-none focus:border-indigo-400 shadow-sm" placeholder="Mô tả chi tiết nội dung cần làm..."></textarea>
                       </div>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                       <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><UserPlus size={14} /> Phân công nhóm</h5>
                       <div className="flex gap-2">
                          <button onClick={() => setAssignedStudentIds(students.map(s => s.MaHS))} className="text-[9px] font-bold text-indigo-600 hover:underline">Tất cả</button>
                          <button onClick={() => setAssignedStudentIds([])} className="text-[9px] font-bold text-rose-500 hover:underline">Hủy hết</button>
                       </div>
                    </div>
                    <div className="space-y-2">
                       <div className="relative">
                          {/* Correctly using imported Search icon */}
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                          <input type="text" placeholder="Tìm tên để chọn..." value={studentFilter} onChange={e => setStudentFilter(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-normal outline-none focus:border-indigo-300" />
                       </div>
                       <div className="bg-white border border-slate-200 rounded-2xl max-h-[300px] overflow-y-auto p-2 custom-scrollbar">
                          {filteredStudentsForModal.map(s => (
                            <button key={s.MaHS} onClick={() => toggleStudent(s.MaHS)} className={`w-full flex items-center justify-between p-2.5 rounded-xl mb-1 last:mb-0 transition-all ${assignedStudentIds.includes(s.MaHS) ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-slate-50 border border-transparent'}`}>
                               <div className="flex items-center gap-3">
                                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black ${assignedStudentIds.includes(s.MaHS) ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{s.Hoten.charAt(0)}</div>
                                  <span className={`text-[11px] font-bold uppercase ${assignedStudentIds.includes(s.MaHS) ? 'text-indigo-800' : 'text-slate-500'}`}>{s.Hoten}</span>
                               </div>
                               {assignedStudentIds.includes(s.MaHS) ? <CheckCircle size={14} className="text-indigo-600" /> : <Circle size={14} className="text-slate-200" />}
                            </button>
                          ))}
                       </div>
                       <p className="text-[9px] font-bold text-slate-400 uppercase text-center py-1">Đã chọn: <span className="text-indigo-600">{assignedStudentIds.length}/{students.length}</span> học sinh</p>
                    </div>
                 </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t flex justify-end gap-3 shrink-0">
               <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 bg-white border border-slate-200 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all">Đóng</button>
               <button onClick={handleSaveTask} disabled={isSubmitting} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-2 text-[10px] uppercase tracking-widest">
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16}/>}
                  {modalMode === 'add' ? 'Phát hành nhiệm vụ' : 'Cập nhật nhiệm vụ'}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskManager;
