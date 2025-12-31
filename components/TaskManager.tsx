
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
  Lock
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
      DanhSachHoanThanh: []
    };
    onUpdateTasks([task, ...tasks]);
    setIsModalOpen(false);
    setNewTask({ TieuDe: '', MoTa: '', HanChot: new Date().toISOString().split('T')[0] });
  };

  const toggleCompletion = (taskId: number, studentId: string) => {
    const task = tasks.find(t => t.MaNhiemVu === taskId);
    if (!task) return;
    
    // Kiểm tra xem bài tập đã hết hạn chưa. Nếu hết hạn mà chưa xong thì Giáo viên vẫn có thể tick giúp (nhưng HS thì bị khóa)
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
            <p className="text-sm text-gray-500 font-medium">Theo dõi tiến độ hoàn thành bài tập của học sinh</p>
          </div>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-2">
          <Plus size={20} /> Giao nhiệm vụ mới
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">Danh sách nhiệm vụ</h3>
          {currentTasks.length > 0 ? currentTasks.map(task => {
            const percent = Math.round((task.DanhSachHoanThanh.length / students.length) * 100);
            const isSelected = selectedTask?.MaNhiemVu === task.MaNhiemVu;
            const isExpired = today > task.HanChot;

            return (
              <div 
                key={task.MaNhiemVu} 
                onClick={() => setSelectedTask(task)}
                className={`p-5 rounded-[28px] border transition-all cursor-pointer group ${isSelected ? 'bg-indigo-600 border-indigo-600 shadow-xl shadow-indigo-100 text-white' : 'bg-white border-gray-100 hover:border-indigo-300'}`}
              >
                <div className="flex justify-between items-start mb-3">
                   <div className={`p-2 rounded-xl ${isSelected ? 'bg-white/20' : 'bg-indigo-50 text-indigo-600'}`}>
                      <Target size={18} />
                   </div>
                   <div className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${isSelected ? 'text-white/80' : isExpired ? 'text-rose-500' : 'text-gray-400'}`}>
                      {isExpired ? <Lock size={10} /> : <Clock size={10} />} {task.HanChot}
                   </div>
                </div>
                <h4 className="font-bold text-sm mb-1 line-clamp-1">{task.TieuDe}</h4>
                <p className={`text-xs mb-4 line-clamp-2 ${isSelected ? 'text-indigo-100' : 'text-gray-400'}`}>{task.MoTa}</p>
                <div className="space-y-1.5">
                   <div className="flex justify-between text-[10px] font-black uppercase"><span>Tiến độ</span><span>{percent}%</span></div>
                   <div className={`h-1.5 w-full rounded-full overflow-hidden ${isSelected ? 'bg-white/20' : 'bg-gray-100'}`}>
                      <div className={`h-full transition-all duration-500 ${isSelected ? 'bg-white' : isExpired ? 'bg-rose-500' : 'bg-indigo-600'}`} style={{ width: `${percent}%` }}></div>
                   </div>
                </div>
              </div>
            );
          }) : (
            <div className="bg-white rounded-[32px] border border-dashed border-gray-200 py-12 flex flex-col items-center justify-center opacity-50">
               <Info size={32} className="mb-2" />
               <p className="text-xs font-bold text-gray-400">Chưa có nhiệm vụ nào</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          {selectedTask ? (
            <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden animate-in slide-in-from-right-4 duration-300">
              <div className="p-6 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                 <div className="flex items-center gap-3"><div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl"><ClipboardCheck size={20}/></div><h3 className="font-black text-gray-800">Kiểm tra hoàn thành</h3></div>
                 <div className="flex items-center gap-4">
                   {today > selectedTask.HanChot && <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-3 py-1 rounded-full uppercase border border-rose-100">Đã hết hạn</span>}
                   <span className="text-xs font-bold text-gray-400">Đã xong: {selectedTask.DanhSachHoanThanh.length}/{students.length}</span>
                 </div>
              </div>
              <div className="p-2 grid grid-cols-1 md:grid-cols-2 gap-1 max-h-[500px] overflow-y-auto">
                {students.map(student => {
                  const isDone = selectedTask.DanhSachHoanThanh.includes(student.MaHS);
                  const isLate = today > selectedTask.HanChot && !isDone;

                  return (
                    <div key={student.MaHS} onClick={() => toggleCompletion(selectedTask.MaNhiemVu, student.MaHS)} className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all ${isDone ? 'bg-emerald-50/50 border border-emerald-100' : isLate ? 'bg-rose-50/30 border border-rose-100' : 'hover:bg-gray-50'}`}>
                      <div className="flex items-center gap-3">
                         <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${isDone ? 'bg-emerald-600 text-white' : isLate ? 'bg-rose-200 text-rose-700' : 'bg-gray-100 text-gray-400'}`}>{student.Hoten.charAt(0)}</div>
                         <div>
                            <p className="text-sm font-bold text-gray-800">{student.Hoten}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase">{student.MaHS}</p>
                            {isLate && <span className="text-[9px] font-black text-rose-600 uppercase flex items-center gap-1 mt-0.5"><AlertCircle size={10} /> Không hoàn thành</span>}
                         </div>
                      </div>
                      {isDone ? <CheckCircle size={24} className="text-emerald-600 fill-emerald-50" /> : isLate ? <AlertCircle size={24} className="text-rose-400" /> : <Circle size={24} className="text-gray-200" />}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="h-full bg-white rounded-[40px] border border-dashed border-gray-200 flex flex-col items-center justify-center text-center p-12 opacity-50">
               <Trophy size={64} className="text-indigo-200 mb-4" />
               <h4 className="text-lg font-black text-gray-400 mb-2">Chưa chọn nhiệm vụ</h4>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b flex items-center justify-between">
               <h3 className="text-xl font-black text-gray-800">Giao nhiệm vụ mới</h3>
               <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5"><label className="text-[10px] font-black text-gray-400 uppercase">Tiêu đề</label><input type="text" value={newTask.TieuDe} onChange={e => setNewTask({...newTask, TieuDe: e.target.value})} className="w-full px-5 py-3.5 bg-gray-50 border rounded-2xl font-bold" /></div>
              <div className="space-y-1.5"><label className="text-[10px] font-black text-gray-400 uppercase">Hạn chót</label><input type="date" value={newTask.HanChot} onChange={e => setNewTask({...newTask, HanChot: e.target.value})} className="w-full px-5 py-3.5 bg-gray-50 border rounded-2xl font-bold" /></div>
              <div className="space-y-1.5"><label className="text-[10px] font-black text-gray-400 uppercase">Mô tả</label><textarea value={newTask.MoTa} onChange={e => setNewTask({...newTask, MoTa: e.target.value})} className="w-full px-5 py-3.5 bg-gray-50 border rounded-2xl h-32"></textarea></div>
            </div>
            <div className="p-6 bg-gray-50 flex gap-3"><button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-white border text-gray-500 rounded-2xl font-black">Hủy</button><button onClick={handleCreateTask} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg">Giao bài ngay</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskManager;
