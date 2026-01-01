
import React, { useMemo, useState } from 'react';
import { 
  GraduationCap, 
  Send, 
  ShieldAlert, 
  LogOut, 
  User, 
  Calendar, 
  CheckCircle, 
  Circle, 
  Trophy, 
  BookOpen, 
  Award, 
  TrendingUp,
  Clock,
  Layout,
  AlertCircle,
  Lock,
  Link as LinkIcon,
  Check
} from 'lucide-react';
import { Student, Grade, Discipline, AssignmentTask } from '../types';

interface Props {
  student: Student;
  grades: Grade[];
  disciplines: Discipline[];
  tasks: AssignmentTask[];
  onLogout: () => void;
  onToggleTask: (taskId: number, link?: string) => void;
}

const subjectsList = [
  { id: 'TOAN', name: 'Toán Học' },
  { id: 'VAN', name: 'Ngữ Văn' },
  { id: 'ANH', name: 'Tiếng Anh' },
  { id: 'LY', name: 'Vật Lý' },
  { id: 'HOA', name: 'Hóa Học' },
  { id: 'SINH', name: 'Sinh Học' },
];

const StudentPortal: React.FC<Props> = ({ student, grades, disciplines, tasks, onLogout, onToggleTask }) => {
  const today = new Date().toISOString().split('T')[0];
  const [taskLinks, setTaskLinks] = useState<Record<number, string>>({});

  const calculateSubjectAvg = (mSubject: string, semester: number) => {
    const sGrades = grades.filter(g => g.MaHS === student.MaHS && g.MaMonHoc === mSubject && g.HocKy === semester);
    const dgtx = sGrades.filter(g => g.LoaiDiem.startsWith('ĐGTX')).map(g => g.DiemSo);
    const ggk = sGrades.find(g => g.LoaiDiem === 'ĐGGK')?.DiemSo;
    const gck = sGrades.find(g => g.LoaiDiem === 'ĐGCK')?.DiemSo;
    if (dgtx.length > 0 && ggk !== undefined && gck !== undefined) {
      return (dgtx.reduce((a, b) => a + b, 0) + ggk * 2 + gck * 3) / (dgtx.length + 5);
    }
    return null;
  };

  const gradeTableData = useMemo(() => {
    return subjectsList.map(sub => {
      const tb1 = calculateSubjectAvg(sub.id, 1);
      const tb2 = calculateSubjectAvg(sub.id, 2);
      return {
        name: sub.name,
        hk1: tb1,
        hk2: tb2,
        cn: (tb1 !== null && tb2 !== null) ? (tb1 + tb2 * 2) / 3 : null
      };
    });
  }, [grades, student.MaHS]);

  const finalAvg = useMemo(() => {
    const valid = gradeTableData.filter(d => d.cn !== null).map(d => d.cn as number);
    return valid.length > 0 ? (valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(1) : '--';
  }, [gradeTableData]);

  const conductScore = useMemo(() => {
    const totalDeduction = disciplines.filter(d => d.MaHS === student.MaHS).reduce((sum, d) => sum + (d.DiemTruTaiThoiDiemDo || 0), 0);
    return 100 - totalDeduction;
  }, [disciplines, student.MaHS]);

  const handleLinkChange = (taskId: number, val: string) => {
    setTaskLinks(prev => ({ ...prev, [taskId]: val }));
  };

  const handleSubmitTask = (taskId: number) => {
    onToggleTask(taskId, taskLinks[taskId] || '');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-indigo-600 p-8 text-white relative shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
          <div className="flex items-center gap-6">
            <div className="h-24 w-24 rounded-[32px] bg-white/20 border-4 border-white/30 p-1 flex items-center justify-center overflow-hidden">
               {student.Anh ? <img src={student.Anh} className="w-full h-full object-cover rounded-[28px]" /> : <User size={40} />}
            </div>
            <div>
              <h1 className="text-3xl font-black">{student.Hoten}</h1>
              <p className="text-indigo-100 font-bold opacity-80 uppercase text-xs tracking-widest mt-1">Lớp {student.MaLopHienTai} • Mã HS: {student.MaHS}</p>
            </div>
          </div>
          <button onClick={onLogout} className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black transition-all flex items-center gap-2 border border-white/20 text-xs uppercase tracking-widest">
            <LogOut size={18} /> Đăng xuất
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-8 grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100"><p className="text-[10px] font-black text-gray-400 uppercase mb-1">Điểm TB</p><h4 className="text-3xl font-black text-indigo-600">{finalAvg}</h4></div>
            <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100"><p className="text-[10px] font-black text-gray-400 uppercase mb-1">Rèn luyện</p><h4 className="text-3xl font-black text-emerald-600">{conductScore}</h4></div>
            <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100"><p className="text-[10px] font-black text-gray-400 uppercase mb-1">Vi phạm</p><h4 className="text-3xl font-black text-rose-600">{disciplines.filter(d => d.MaHS === student.MaHS).length}</h4></div>
          </div>

          <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
             <div className="p-8 border-b border-gray-50 flex items-center justify-between"><h3 className="font-black text-gray-800">Học bạ điện tử</h3></div>
             <table className="w-full text-left">
               <thead><tr className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest"><th className="px-8 py-4">Môn học</th><th className="px-6 py-4 text-center">HK1</th><th className="px-6 py-4 text-center">HK2</th><th className="px-8 py-4 text-right text-indigo-600">Cả năm</th></tr></thead>
               <tbody className="divide-y divide-gray-50">
                  {gradeTableData.map(row => (
                    <tr key={row.name} className="hover:bg-gray-50/50"><td className="px-8 py-4 font-bold text-gray-800">{row.name}</td><td className="px-6 py-4 text-center text-gray-500">{row.hk1?.toFixed(1) || '--'}</td><td className="px-6 py-4 text-center text-gray-500">{row.hk2?.toFixed(1) || '--'}</td><td className="px-8 py-4 text-right font-black text-indigo-600">{row.cn?.toFixed(1) || '--'}</td></tr>
                  ))}
               </tbody>
             </table>
          </div>
        </div>

        <div className="space-y-8 flex flex-col">
           <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden flex flex-col flex-1">
              <div className="p-8 border-b bg-indigo-50/30 flex items-center justify-between"><h3 className="font-black text-gray-800">Nhiệm vụ & Bài tập</h3></div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                 {tasks.map(task => {
                    const isDone = task.DanhSachHoanThanh.includes(student.MaHS);
                    const isExpired = today > task.HanChot;
                    const existingLink = task.BaoCaoNhiemVu?.[student.MaHS] || '';
                    return (
                      <div key={task.MaNhiemVu} className={`p-5 rounded-3xl border transition-all ${isDone ? 'bg-emerald-50 border-emerald-100' : isExpired ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-100 shadow-sm'}`}>
                         <div className="flex justify-between items-start mb-2">
                            <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">{task.MaMonHoc}</span>
                            <span className="text-[9px] font-bold text-gray-400 flex items-center gap-1"><Clock size={10} /> {task.HanChot}</span>
                         </div>
                         <h4 className={`font-black text-sm mb-1 ${isDone ? 'text-emerald-700' : 'text-gray-800'}`}>{task.TieuDe}</h4>
                         <p className="text-xs text-gray-500 mb-4 line-clamp-2">{task.MoTa}</p>
                         
                         {!isDone ? (
                           <div className="space-y-2">
                              <div className="relative">
                                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={14} />
                                <input 
                                  type="text" 
                                  placeholder="Dán link sản phẩm tại đây..." 
                                  value={taskLinks[task.MaNhiemVu] ?? ''}
                                  onChange={(e) => handleLinkChange(task.MaNhiemVu, e.target.value)}
                                  className="w-full pl-9 pr-3 py-2 bg-white border rounded-xl text-xs font-medium outline-none focus:border-indigo-500 transition-all"
                                />
                              </div>
                              <button 
                                onClick={() => handleSubmitTask(task.MaNhiemVu)}
                                className="w-full py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 active:scale-95 transition-all shadow-md"
                              >
                                Nộp bài ngay
                              </button>
                           </div>
                         ) : (
                           <div className="space-y-2">
                              <div className="flex items-center gap-2 p-2 bg-white rounded-xl border border-emerald-200">
                                <CheckCircle size={14} className="text-emerald-500" />
                                <span className="text-[10px] font-black text-emerald-600 uppercase">Đã hoàn thành</span>
                              </div>
                              {existingLink && (
                                <a href={existingLink} target="_blank" rel="noreferrer" className="block p-2 bg-emerald-100 text-emerald-700 rounded-xl text-[10px] font-bold truncate">
                                  Link: {existingLink}
                                </a>
                              )}
                              <button onClick={() => onToggleTask(task.MaNhiemVu)} className="w-full py-1 text-[9px] font-black text-gray-400 hover:text-rose-500 uppercase">Hủy nộp bài</button>
                           </div>
                         )}
                      </div>
                    );
                 })}
              </div>
           </div>
        </div>
      </main>
    </div>
  );
};

export default StudentPortal;
