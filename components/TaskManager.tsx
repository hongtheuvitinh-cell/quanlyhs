
import React, { useState, useMemo, useEffect } from 'react';
import { Send, CheckCircle, Circle, Calendar, Plus, X, ClipboardCheck, Trophy, Clock, Target, Edit2, Trash2, Save, BookOpen, Users, Check, Loader2 } from 'lucide-react';
import { AppState, Student, AssignmentTask, Teacher, Role } from '../types';

interface Props {
  state: AppState;
  students: Student[];
  tasks: AssignmentTask[];
  onUpdateTasks: (tasks: AssignmentTask[]) => Promise<void>;
  onDeleteTask: (taskId: number) => Promise<void>;
}

const subjects = [{ id: 'TOAN', name: 'Toán Học' }, { id: 'VAN', name: 'Ngữ Văn' }, { id: 'ANH', name: 'Tiếng Anh' }, { id: 'LY', name: 'Vật Lý' }, { id: 'HOA', name: 'Hóa Học' }, { id: 'SINH', name: 'Sinh Học' }, { id: 'SHL', name: 'Sinh hoạt lớp' }];

const TaskManager: React.FC<Props> = ({ state, students, tasks, onUpdateTasks, onDeleteTask }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTask, setSelectedTask] = useState<AssignmentTask | null>(null);
  const [newTask, setNewTask] = useState({ MaNhiemVu: 0, TieuDe: '', MoTa: '', HanChot: new Date().toISOString().split('T')[0], MaMonHoc: state.selectedSubject || 'SHL' });
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  const currentTasks = useMemo(() => {
    return tasks.filter(t => t.MaLop === state.selectedClass && (state.currentRole === Role.CHU_NHIEM ? true : t.MaMonHoc === (state.selectedSubject || 'TOAN'))).sort((a, b) => b.MaNhiemVu - a.MaNhiemVu);
  }, [tasks, state.selectedClass, state.selectedSubject, state.currentRole]);

  const handleSaveTask = async () => {
    if (!newTask.TieuDe.trim()) return;
    setIsSubmitting(true);
    try {
      const task: AssignmentTask = {
        MaNhiemVu: modalMode === 'add' ? Math.floor(Date.now() / 1000) : newTask.MaNhiemVu,
        TieuDe: newTask.TieuDe, MoTa: newTask.MoTa, MaLop: state.selectedClass, MaMonHoc: newTask.MaMonHoc,
        MaGV: (state.currentUser as Teacher)?.MaGV || '', HanChot: newTask.HanChot, MaNienHoc: state.selectedYear,
        DanhSachGiao: selectedStudentIds, DanhSachHoanThanh: modalMode === 'edit' ? (tasks.find(t => t.MaNhiemVu === newTask.MaNhiemVu)?.DanhSachHoanThanh || []) : [],
        BaoCaoNhiemVu: modalMode === 'edit' ? (tasks.find(t => t.MaNhiemVu === newTask.MaNhiemVu)?.BaoCaoNhiemVu || {}) : {}
      };
      await onUpdateTasks([task]);
      setIsModalOpen(false);
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="space-y-4 animate-in fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3"><div className="p-2 bg-indigo-600 rounded-lg text-white shadow-md"><Send size={18} /></div><div><h2 className="text-sm font-bold text-slate-800">Giao bài & Nhiệm vụ</h2><p className="text-[10px] text-slate-400 font-normal">Quản lý hoạt động lớp {state.selectedClass}</p></div></div>
        <button onClick={() => { setModalMode('add'); setSelectedStudentIds(students.map(s => s.MaHS)); setIsModalOpen(true); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-[10px] font-bold uppercase shadow-sm flex items-center gap-2 hover:bg-indigo-700 transition-all"><Plus size={16} /> Giao nhiệm vụ</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 space-y-3">
          {currentTasks.map(task => {
            const isSelected = selectedTask?.MaNhiemVu === task.MaNhiemVu;
            return (
              <div key={task.MaNhiemVu} onClick={() => setSelectedTask(task)} className={`p-4 rounded-xl border transition-all cursor-pointer ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-200 hover:border-indigo-300'}`}>
                <div className="flex justify-between items-start mb-2"><span className={`text-[8px] font-bold uppercase tracking-widest ${isSelected ? 'text-white/80' : 'text-indigo-600'}`}>{task.MaMonHoc}</span><span className="text-[8px] font-normal uppercase">{task.HanChot}</span></div>
                <h4 className="font-bold text-xs truncate">{task.TieuDe}</h4>
                <div className="mt-3 h-1 w-full bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-indigo-400" style={{width: '40%'}}></div></div>
              </div>
            );
          })}
        </div>

        <div className="lg:col-span-2">
          {selectedTask ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full min-h-[400px]">
              <div className="p-4 bg-slate-50/50 border-b flex items-center justify-between"><h3 className="font-bold text-slate-800 text-sm">{selectedTask.TieuDe}</h3><div className="flex gap-1"><button onClick={() => onDeleteTask(selectedTask.MaNhiemVu)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded"><Trash2 size={16}/></button></div></div>
              <div className="p-4 border-b text-[11px] font-normal text-slate-500 italic">"{selectedTask.MoTa || 'Không có mô tả'}"</div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-2 overflow-y-auto">
                {students.filter(s => !selectedTask.DanhSachGiao || selectedTask.DanhSachGiao.includes(s.MaHS)).map(s => (
                  <div key={s.MaHS} className="p-2 border border-slate-100 rounded-lg flex items-center justify-between"><span className="text-xs font-bold text-slate-700">{s.Hoten}</span><span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${selectedTask.DanhSachHoanThanh.includes(s.MaHS) ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>{selectedTask.DanhSachHoanThanh.includes(s.MaHS) ? 'Xong' : 'Chờ'}</span></div>
                ))}
              </div>
            </div>
          ) : <div className="h-full bg-white rounded-xl border-2 border-dashed border-slate-100 flex items-center justify-center text-slate-300 text-xs font-bold uppercase">Chọn nhiệm vụ để xem</div>}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-4 border-b flex items-center justify-between bg-white"><h3 className="font-bold text-sm text-slate-800 uppercase">{modalMode === 'add' ? 'Giao bài tập mới' : 'Sửa bài tập'}</h3><button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-full"><X size={18}/></button></div>
            <div className="p-5 space-y-4 bg-slate-50/30 overflow-y-auto max-h-[70vh]">
              <div className="space-y-1"><label className="text-[9px] font-bold text-slate-400 uppercase px-1">Tiêu đề</label><input type="text" value={newTask.TieuDe} onChange={e => setNewTask({...newTask, TieuDe: e.target.value})} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-normal text-xs outline-none focus:border-indigo-300 shadow-sm" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-[9px] font-bold text-slate-400 uppercase px-1">Môn</label><select value={newTask.MaMonHoc} onChange={e => setNewTask({...newTask, MaMonHoc: e.target.value})} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-normal outline-none">{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                <div className="space-y-1"><label className="text-[9px] font-bold text-slate-400 uppercase px-1">Hạn nộp</label><input type="date" value={newTask.HanChot} onChange={e => setNewTask({...newTask, HanChot: e.target.value})} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-normal outline-none" /></div>
              </div>
              <div className="space-y-1"><label className="text-[9px] font-bold text-slate-400 uppercase px-1">Mô tả</label><textarea value={newTask.MoTa} onChange={e => setNewTask({...newTask, MoTa: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-xl h-32 text-xs font-normal outline-none" placeholder="Yêu cầu cụ thể..."></textarea></div>
            </div>
            <div className="p-4 bg-slate-50 border-t flex justify-end gap-2"><button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase">Hủy</button><button onClick={handleSaveTask} className="px-5 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow-md text-[10px] uppercase flex items-center gap-1.5"><Save size={14}/> Giao bài</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskManager;
