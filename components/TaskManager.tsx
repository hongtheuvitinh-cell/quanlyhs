
import React, { useState, useMemo } from 'react';
import { 
  Send, 
  CheckCircle, 
  Circle, 
  Calendar, 
  Plus, 
  X, 
  ClipboardCheck, 
  Trophy, 
  Clock, 
  Info,
  ChevronRight,
  Target,
  AlertCircle,
  Lock,
  ExternalLink,
  Paperclip
} from 'lucide-react';
import { AppState, Student, AssignmentTask, Teacher } from '../types';

interface Props {
  state: AppState;
  students: Student[];
  tasks: AssignmentTask[];
  onUpdateTasks: (tasks: AssignmentTask[]) => void;
}

const TaskManager: React.FC<Props> = ({ state, students, tasks, onUpdateTasks }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<AssignmentTask | null>(null);
  const [newTask, setNewTask] = useState({ TieuDe: '', MoTa: '', HanChot: new Date().toISOString().split('T')[0] });
  const today = new Date().toISOString().split('T')[0];

  const currentTasks = useMemo(() => {
    return tasks.filter(t => t.MaLop === state.selectedClass && t.MaMonHoc === (state.selectedSubject || 'TOAN'));
  }, [tasks, state.selectedClass, state.selectedSubject]);

  const handleCreateTask = () => {
    if (!newTask.TieuDe) return;
    const task: AssignmentTask = {
      MaNhiemVu: Date.now(),
      TieuDe: newTask.TieuDe,
      MoTa: newTask.MoTa,
      MaLop: state.selectedClass,
      MaMonHoc: state.selectedSubject || 'TOAN',
      MaGV: (state.currentUser as Teacher)?.MaGV || '',
      HanChot: newTask.HanChot,
      MaNienHoc: state.selectedYear,
      DanhSachHoanThanh: [],
      BaoCaoNhiemVu: {}
    };
    onUpdateTasks([task, ...tasks]);
    setIsModalOpen(false);
    setNewTask({ TieuDe: '', MoTa: '', HanChot: new Date().toISOString().split('T')[0] });
  };

  const toggleCompletion = (taskId: number, studentId: string) => {
    onUpdateTasks(tasks.map(t => {
      if (t.MaNhiemVu === taskId) {
        const isCompleted = t.DanhSachHoanThanh.includes(studentId);
        return {
          ...t,
          DanhSachHoanThanh: isCompleted 
            ? t.DanhSachHoanThanh.filter(id => id !== studentId)
            : [...t.DanhSachHoanThanh, studentId]
        };
      }
      return t;
    }));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[32px] shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg"><Send size={24} /></div>
          <div>
            <h2 className="text-2xl font-black text-gray-800 tracking-tight">Giao bài & Nhiệm vụ</h2>
            <p className="text-sm text-gray-500 font-medium">Theo dõi tiến độ hoàn thành bài tập</p>
          </div>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2">
          <Plus size={20} /> Giao nhiệm vụ mới
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">Danh sách nhiệm vụ</h3>
          {currentTasks.map(task => {
            const percent = Math.round((task.DanhSachHoanThanh.length / students.length) * 100);
            const isSelected = selectedTask?.MaNhiemVu === task.MaNhiemVu;
            const isExpired = today > task.HanChot;
            return (
              <div key={task.MaNhiemVu} onClick={() => setSelectedTask(task)} className={`p-5 rounded-[28px] border transition-all cursor-pointer ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-100 hover:border-indigo-300'}`}>
                <div className="flex justify-between items-start mb-3">
                   <div className={`p-2 rounded-xl ${isSelected ? 'bg-white/20' : 'bg-indigo-50 text-indigo-600'}`}><Target size={18} /></div>
                   <div className={`text-[10px] font-black uppercase flex items-center gap-1 ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                      {isExpired ? <Lock size={10} /> : <Clock size={10} />} {task.HanChot}
                   </div>
                </div>
                <h4 className="font-bold text-sm mb-1">{task.TieuDe}</h4>
                <div className="space-y-1.5 mt-4">
                   <div className="flex justify-between text-[10px] font-black"><span>TIẾN ĐỘ</span><span>{percent}%</span></div>
                   <div className="h-1.5 w-full bg-gray-100/20 rounded-full overflow-hidden">
                      <div className="h-full bg-current transition-all duration-500" style={{ width: `${percent}%` }}></div>
                   </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="lg:col-span-2">
          {selectedTask ? (
            <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 bg-gray-50/50 border-b flex items-center justify-between">
                 <div className="flex items-center gap-3"><ClipboardCheck size={20}/><h3 className="font-black text-gray-800">Kiểm tra hoàn thành</h3></div>
                 <span className="text-xs font-bold text-gray-400">{selectedTask.DanhSachHoanThanh.length}/{students.length} đã xong</span>
              </div>
              <div className="p-2 grid grid-cols-1 md:grid-cols-2 gap-1 max-h-[500px] overflow-y-auto">
                {students.map(student => {
                  const isDone = selectedTask.DanhSachHoanThanh.includes(student.MaHS);
                  const reportLink = selectedTask.BaoCaoNhiemVu?.[student.MaHS];
                  return (
                    <div key={student.MaHS} className={`flex items-center justify-between p-4 rounded-2xl transition-all ${isDone ? 'bg-emerald-50/50 border border-emerald-100' : 'hover:bg-gray-50'}`}>
                      <div className="flex items-center gap-3">
                         <div onClick={() => toggleCompletion(selectedTask.MaNhiemVu, student.MaHS)} className="cursor-pointer">
                           {isDone ? <CheckCircle size={24} className="text-emerald-600" /> : <Circle size={24} className="text-gray-200" />}
                         </div>
                         <div>
                            <p className="text-sm font-bold text-gray-800">{student.Hoten}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase">{student.MaHS}</p>
                         </div>
                      </div>
                      {reportLink && (
                        <a href={reportLink} target="_blank" rel="noreferrer" className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-all flex items-center gap-1.5 text-[10px] font-black uppercase">
                          <Paperclip size={14} /> Link báo cáo
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="h-full bg-white rounded-[40px] border border-dashed flex flex-col items-center justify-center opacity-30 p-12 text-center">
               <Trophy size={64} className="mb-4" />
               <h4 className="text-lg font-black">Chọn nhiệm vụ để xem chi tiết</h4>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between">
               <h3 className="text-xl font-black text-gray-800">Giao nhiệm vụ mới</h3>
               <button onClick={() => setIsModalOpen(false)} className="p-2"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-4">
              <input type="text" placeholder="Tiêu đề..." value={newTask.TieuDe} onChange={e => setNewTask({...newTask, TieuDe: e.target.value})} className="w-full px-5 py-3.5 bg-gray-50 border rounded-2xl font-bold" />
              <input type="date" value={newTask.HanChot} onChange={e => setNewTask({...newTask, HanChot: e.target.value})} className="w-full px-5 py-3.5 bg-gray-50 border rounded-2xl font-bold" />
              <textarea placeholder="Mô tả..." value={newTask.MoTa} onChange={e => setNewTask({...newTask, MoTa: e.target.value})} className="w-full px-5 py-3.5 bg-gray-50 border rounded-2xl h-32"></textarea>
            </div>
            <div className="p-6 bg-gray-50 flex gap-3"><button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-white border text-gray-500 rounded-2xl font-black">Hủy</button><button onClick={handleCreateTask} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg">Giao bài</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskManager;
