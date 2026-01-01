
import React, { useState, useMemo, useEffect } from 'react';
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
  Paperclip,
  Loader2,
  BookOpen,
  Users,
  Check
} from 'lucide-react';
import { AppState, Student, AssignmentTask, Teacher, Role } from '../types';

interface Props {
  state: AppState;
  students: Student[];
  tasks: AssignmentTask[];
  onUpdateTasks: (tasks: AssignmentTask[]) => Promise<void>;
}

const subjects = [
  { id: 'TOAN', name: 'Toán Học' },
  { id: 'VAN', name: 'Ngữ Văn' },
  { id: 'ANH', name: 'Tiếng Anh' },
  { id: 'LY', name: 'Vật Lý' },
  { id: 'HOA', name: 'Hóa Học' },
  { id: 'SINH', name: 'Sinh Học' },
  { id: 'SHL', name: 'Sinh hoạt lớp' },
];

const TaskManager: React.FC<Props> = ({ state, students, tasks, onUpdateTasks }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTask, setSelectedTask] = useState<AssignmentTask | null>(null);
  
  // State cho form nhiệm vụ mới
  const [newTask, setNewTask] = useState({ 
    TieuDe: '', 
    MoTa: '', 
    HanChot: new Date().toISOString().split('T')[0],
    MaMonHoc: state.selectedSubject || 'SHL'
  });
  
  // State lưu danh sách ID học sinh được chọn khi tạo nhiệm vụ
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // Reset danh sách chọn khi mở modal
  useEffect(() => {
    if (isModalOpen) {
      setSelectedStudentIds(students.map(s => s.MaHS));
    }
  }, [isModalOpen, students]);

  const today = new Date().toISOString().split('T')[0];

  const currentTasks = useMemo(() => {
    return tasks.filter(t => 
      t.MaLop === state.selectedClass && 
      (state.currentRole === Role.CHU_NHIEM ? true : t.MaMonHoc === (state.selectedSubject || 'TOAN'))
    ).sort((a, b) => b.MaNhiemVu - a.MaNhiemVu);
  }, [tasks, state.selectedClass, state.selectedSubject, state.currentRole]);

  const handleCreateTask = async () => {
    if (!newTask.TieuDe.trim()) {
      alert("Vui lòng nhập tiêu đề nhiệm vụ!");
      return;
    }
    if (selectedStudentIds.length === 0) {
      alert("Vui lòng chọn ít nhất một học sinh để giao nhiệm vụ!");
      return;
    }

    setIsSubmitting(true);
    try {
      const task: AssignmentTask = {
        MaNhiemVu: Date.now(), 
        TieuDe: newTask.TieuDe,
        MoTa: newTask.MoTa,
        MaLop: state.selectedClass,
        MaMonHoc: newTask.MaMonHoc,
        MaGV: (state.currentUser as Teacher)?.MaGV || '',
        HanChot: newTask.HanChot,
        MaNienHoc: state.selectedYear,
        DanhSachGiao: selectedStudentIds, // Chỉ giao cho những em này
        DanhSachHoanThanh: [],
        BaoCaoNhiemVu: {}
      };

      await onUpdateTasks([task]);
      
      setIsModalOpen(false);
      setNewTask({ 
        TieuDe: '', 
        MoTa: '', 
        HanChot: new Date().toISOString().split('T')[0],
        MaMonHoc: state.selectedSubject || 'SHL'
      });
      alert("Đã giao nhiệm vụ thành công!");
    } catch (error: any) {
      const errorDetails = [
        "LỖI HỆ THỐNG:",
        `Message: ${error.message || 'Không có'}`,
        `Code: ${error.code || 'Không có mã lỗi'}`,
        `Detail: ${error.details || 'Không có chi tiết'}`,
        `Hint: ${error.hint || 'Hãy đảm bảo bạn đã chạy script SQL bổ sung cột DanhSachGiao.'}`
      ].join('\n\n');
      alert(errorDetails);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleCompletion = async (taskId: number, studentId: string) => {
    const task = tasks.find(t => t.MaNhiemVu === taskId);
    if (!task) return;

    const isCompleted = task.DanhSachHoanThanh.includes(studentId);
    const updatedTask = {
      ...task,
      DanhSachHoanThanh: isCompleted 
        ? task.DanhSachHoanThanh.filter(id => id !== studentId)
        : [...task.DanhSachHoanThanh, studentId]
    };

    try {
      await onUpdateTasks([updatedTask]);
    } catch (error: any) {
      alert("Lỗi cập nhật: " + (error.message || "Không xác định"));
    }
  };

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId) 
        : [...prev, studentId]
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[32px] shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg"><Send size={24} /></div>
          <div>
            <h2 className="text-2xl font-black text-gray-800 tracking-tight">Giao bài & Nhiệm vụ</h2>
            <p className="text-sm text-gray-500 font-medium">Theo dõi tiến độ hoàn thành bài tập lớp {state.selectedClass}</p>
          </div>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)} 
          className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2 active:scale-95"
        >
          <Plus size={20} /> Giao nhiệm vụ mới
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">Danh sách nhiệm vụ ({currentTasks.length})</h3>
          {currentTasks.length > 0 ? currentTasks.map(task => {
            const assignedCount = task.DanhSachGiao?.length || students.length;
            const percent = assignedCount > 0 ? Math.round((task.DanhSachHoanThanh.length / assignedCount) * 100) : 0;
            const isSelected = selectedTask?.MaNhiemVu === task.MaNhiemVu;
            const isExpired = today > task.HanChot;
            const subName = subjects.find(s => s.id === task.MaMonHoc)?.name || task.MaMonHoc;

            return (
              <div 
                key={task.MaNhiemVu} 
                onClick={() => setSelectedTask(task)} 
                className={`p-5 rounded-[28px] border transition-all cursor-pointer relative overflow-hidden ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-white border-gray-100 hover:border-indigo-300'}`}
              >
                <div className="flex justify-between items-start mb-3">
                   <div className={`p-2 rounded-xl flex items-center gap-2 ${isSelected ? 'bg-white/20' : 'bg-indigo-50 text-indigo-600'}`}>
                      <Target size={18} />
                      <span className="text-[10px] font-black uppercase">{subName}</span>
                   </div>
                   <div className={`text-[10px] font-black uppercase flex items-center gap-1 ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>
                      {isExpired ? <Lock size={10} /> : <Clock size={10} />} {task.HanChot}
                   </div>
                </div>
                <h4 className="font-bold text-sm mb-1 line-clamp-1">{task.TieuDe}</h4>
                <div className="space-y-1.5 mt-4">
                   <div className="flex justify-between text-[10px] font-black">
                      <span className={isSelected ? 'text-white/70' : 'text-gray-400 uppercase'}>TIẾN ĐỘ ({task.DanhSachHoanThanh.length}/{assignedCount})</span>
                      <span>{percent}%</span>
                   </div>
                   <div className={`h-1.5 w-full rounded-full overflow-hidden ${isSelected ? 'bg-white/20' : 'bg-gray-100'}`}>
                      <div 
                        className={`h-full transition-all duration-700 ${isSelected ? 'bg-white' : 'bg-indigo-500'}`} 
                        style={{ width: `${percent}%` }}
                      ></div>
                   </div>
                </div>
              </div>
            );
          }) : (
            <div className="p-10 bg-gray-50 rounded-[32px] border border-dashed border-gray-200 text-center">
              <p className="text-xs font-bold text-gray-400">Chưa có nhiệm vụ nào</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          {selectedTask ? (
            <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden animate-in slide-in-from-right-4 flex flex-col h-full max-h-[700px]">
              <div className="p-6 bg-gray-50/50 border-b flex items-center justify-between shrink-0">
                 <div className="flex items-center gap-3">
                    <ClipboardCheck size={20} className="text-indigo-600" />
                    <div>
                      <h3 className="font-black text-gray-800">{selectedTask.TieuDe}</h3>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Môn: {subjects.find(s => s.id === selectedTask.MaMonHoc)?.name}</p>
                    </div>
                 </div>
                 <div className="text-right">
                   <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase">
                    {selectedTask.DanhSachHoanThanh.length}/{(selectedTask.DanhSachGiao?.length || students.length)} Đã nộp
                   </span>
                 </div>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {students
                    .filter(s => !selectedTask.DanhSachGiao || selectedTask.DanhSachGiao.includes(s.MaHS))
                    .map(student => {
                      const isDone = selectedTask.DanhSachHoanThanh.includes(student.MaHS);
                      const reportLink = selectedTask.BaoCaoNhiemVu?.[student.MaHS];
                      return (
                        <div key={student.MaHS} className={`flex flex-col p-4 rounded-2xl border transition-all ${isDone ? 'bg-emerald-50/50 border-emerald-100' : 'bg-white border-gray-100'}`}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                               <div onClick={() => toggleCompletion(selectedTask.MaNhiemVu, student.MaHS)} className="cursor-pointer hover:scale-110 transition-transform">
                                 {isDone ? <CheckCircle size={24} className="text-emerald-600" /> : <Circle size={24} className="text-gray-200" />}
                               </div>
                               <div>
                                  <p className="text-sm font-bold text-gray-800">{student.Hoten}</p>
                                  <p className="text-[10px] text-gray-400 font-bold uppercase">{student.MaHS}</p>
                               </div>
                            </div>
                            {isDone && <span className="text-[10px] font-black text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-lg uppercase">Xong</span>}
                          </div>
                          
                          {reportLink && (
                            <div className="mt-2 p-3 bg-white rounded-xl border border-indigo-100 shadow-sm animate-in fade-in zoom-in-95">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <Paperclip size={14} className="text-indigo-600 shrink-0" />
                                  <span className="text-[11px] font-bold text-indigo-700 truncate">{reportLink}</span>
                                </div>
                                <a 
                                  href={reportLink.startsWith('http') ? reportLink : `https://${reportLink}`} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all flex items-center justify-center shrink-0"
                                  title="Mở link báo cáo"
                                >
                                  <ExternalLink size={14} />
                                </a>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] bg-white rounded-[40px] border border-dashed border-gray-200 flex flex-col items-center justify-center p-12 text-center">
               <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-200 mb-6">
                 <Trophy size={40} />
               </div>
               <h4 className="text-lg font-black text-gray-400">Chọn một nhiệm vụ bên trái để xem chi tiết tiến độ</h4>
               <p className="text-xs text-gray-300 mt-2 max-w-xs">Hệ thống sẽ chỉ hiển thị những học sinh được giao nhiệm vụ cụ thể.</p>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-4xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 max-h-[90vh]">
            <div className="p-6 border-b flex items-center justify-between bg-white shrink-0">
               <div className="flex items-center gap-3">
                 <div className="p-2 bg-indigo-600 rounded-xl text-white"><Plus size={20}/></div>
                 <h3 className="text-xl font-black text-gray-800">Giao nhiệm vụ mới</h3>
               </div>
               <button onClick={() => !isSubmitting && setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={20}/></button>
            </div>
            
            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
              {/* Cột trái: Thông tin nhiệm vụ */}
              <div className="lg:w-1/2 p-6 space-y-4 overflow-y-auto border-r border-gray-100">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase px-1">Tiêu đề nhiệm vụ</label>
                  <input 
                    type="text" 
                    placeholder="Ví dụ: Hoàn thành bài tập chương 2..." 
                    value={newTask.TieuDe} 
                    onChange={e => setNewTask({...newTask, TieuDe: e.target.value})} 
                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-sm outline-none focus:bg-white focus:border-indigo-400 transition-all" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase px-1">Môn học</label>
                    <div className="relative">
                      <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                      <select 
                        value={newTask.MaMonHoc} 
                        onChange={e => setNewTask({...newTask, MaMonHoc: e.target.value})} 
                        className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-sm outline-none appearance-none focus:bg-white"
                      >
                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase px-1">Hạn chót</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                      <input 
                        type="date" 
                        value={newTask.HanChot} 
                        onChange={e => setNewTask({...newTask, HanChot: e.target.value})} 
                        className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-sm outline-none focus:bg-white" 
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase px-1">Mô tả chi tiết</label>
                  <textarea 
                    placeholder="Hướng dẫn học sinh các bước thực hiện..." 
                    value={newTask.MoTa} 
                    onChange={e => setNewTask({...newTask, MoTa: e.target.value})} 
                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl h-32 text-sm outline-none focus:bg-white focus:border-indigo-400 transition-all"
                  ></textarea>
                </div>
              </div>

              {/* Cột phải: Chọn học sinh */}
              <div className="lg:w-1/2 p-6 flex flex-col overflow-hidden bg-gray-50/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-indigo-600" />
                    <label className="text-[10px] font-black text-gray-500 uppercase">Đối tượng nhận ({selectedStudentIds.length}/{students.length})</label>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setSelectedStudentIds(students.map(s => s.MaHS))} 
                      className="text-[10px] font-black text-indigo-600 uppercase hover:underline"
                    >
                      Tất cả
                    </button>
                    <span className="text-gray-300">|</span>
                    <button 
                      onClick={() => setSelectedStudentIds([])} 
                      className="text-[10px] font-black text-rose-600 uppercase hover:underline"
                    >
                      Bỏ hết
                    </button>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 bg-white rounded-2xl border p-2 shadow-inner">
                   {students.map(s => {
                     const isSelected = selectedStudentIds.includes(s.MaHS);
                     return (
                       <div 
                        key={s.MaHS} 
                        onClick={() => toggleStudentSelection(s.MaHS)}
                        className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${isSelected ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-gray-50 border border-transparent'}`}
                       >
                         <div className="flex items-center gap-3">
                           <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-300'}`}>
                             {isSelected && <Check size={12} strokeWidth={4} />}
                           </div>
                           <span className={`text-sm font-bold ${isSelected ? 'text-indigo-900' : 'text-gray-700'}`}>{s.Hoten}</span>
                         </div>
                         <span className="text-[10px] font-black text-gray-400">{s.MaHS}</span>
                       </div>
                     );
                   })}
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t flex gap-3 shrink-0">
              <button 
                disabled={isSubmitting}
                onClick={() => setIsModalOpen(false)} 
                className="flex-1 py-4 bg-white border border-gray-200 text-gray-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-all disabled:opacity-50"
              >
                Hủy
              </button>
              <button 
                disabled={isSubmitting}
                onClick={handleCreateTask} 
                className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest disabled:opacity-70"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Đang giao bài...
                  </>
                ) : (
                  <>
                    <Send size={18} /> Giao bài ngay
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskManager;
