
import React, { useMemo } from 'react';
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
  Lock
} from 'lucide-react';
import { Student, Grade, Discipline, AssignmentTask } from '../types';

interface Props {
  student: Student;
  grades: Grade[];
  disciplines: Discipline[];
  tasks: AssignmentTask[];
  onLogout: () => void;
  onToggleTask: (taskId: number) => void;
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-indigo-600 p-8 text-white relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12"><GraduationCap size={160} /></div>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
          <div className="flex items-center gap-8 text-center md:text-left">
            <div className="h-28 w-28 rounded-[40px] bg-white/20 backdrop-blur-md border-4 border-white/30 p-1 shadow-2xl flex items-center justify-center overflow-hidden">
               {student.Anh ? <img src={student.Anh} className="w-full h-full object-cover rounded-[34px]" /> : <User size={56} />}
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full mb-2 inline-block">Mã HS: {student.MaHS}</span>
              <h1 className="text-4xl font-black tracking-tight">{student.Hoten}</h1>
              <p className="text-indigo-100 font-medium flex items-center gap-2 justify-center md:justify-start mt-2">
                <Layout size={18} /> Lớp {student.MaLopHienTai} • <Calendar size={18} /> {new Date(student.NgaySinh).toLocaleDateString('vi-VN')}
              </p>
            </div>
          </div>
          <button onClick={onLogout} className="px-8 py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black transition-all flex items-center gap-3 backdrop-blur-md border border-white/20">
            <LogOut size={20} /> Đăng xuất
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-8 grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><TrendingUp size={24}/></div>
              <div><p className="text-[10px] font-black text-gray-400 uppercase">ĐTB Cả Năm</p><h4 className="text-2xl font-black text-gray-800">{finalAvg}</h4></div>
            </div>
            <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><Trophy size={24}/></div>
              <div><p className="text-[10px] font-black text-gray-400 uppercase">Điểm Rèn luyện</p><h4 className="text-2xl font-black text-gray-800">{conductScore}đ</h4></div>
            </div>
            <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl"><ShieldAlert size={24}/></div>
              <div><p className="text-[10px] font-black text-gray-400 uppercase">Lỗi vi phạm</p><h4 className="text-2xl font-black text-gray-800">{disciplines.filter(d => d.MaHS === student.MaHS).length}</h4></div>
            </div>
          </div>

          <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
             <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                <div className="flex items-center gap-3"><Award size={24} className="text-indigo-600" /><h3 className="font-black text-gray-800">Bảng điểm Tổng kết</h3></div>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-left">
                 <thead>
                    <tr className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                       <th className="px-8 py-5">Môn học</th>
                       <th className="px-6 py-5 text-center">Học kỳ 1</th>
                       <th className="px-6 py-5 text-center">Học kỳ 2</th>
                       <th className="px-8 py-5 text-right bg-indigo-50/50 text-indigo-700">Cả năm</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50">
                    {gradeTableData.map(row => (
                      <tr key={row.name} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-8 py-5 font-bold text-gray-800">{row.name}</td>
                        <td className="px-6 py-5 text-center text-gray-500">{row.hk1?.toFixed(1) || '--'}</td>
                        <td className="px-6 py-5 text-center text-gray-500">{row.hk2?.toFixed(1) || '--'}</td>
                        <td className="px-8 py-5 text-right font-black text-indigo-600 bg-indigo-50/20">{row.cn?.toFixed(1) || '--'}</td>
                      </tr>
                    ))}
                 </tbody>
               </table>
             </div>
          </div>
        </div>

        <div className="space-y-8">
           <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full max-h-[700px]">
              <div className="p-8 border-b border-gray-50 bg-indigo-50/30 flex items-center justify-between">
                <div className="flex items-center gap-3"><Send size={24} className="text-indigo-600" /><h3 className="font-black text-gray-800">Nhiệm vụ học tập</h3></div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                 {tasks.length > 0 ? tasks.map(task => {
                    const isDone = task.DanhSachHoanThanh.includes(student.MaHS);
                    const isExpired = today > task.HanChot;
                    const canToggle = !isExpired || isDone; // Nếu đã xong thì vẫn cho xem, nếu quá hạn mà chưa xong thì khóa

                    return (
                      <div 
                        key={task.MaNhiemVu} 
                        onClick={() => canToggle && onToggleTask(task.MaNhiemVu)}
                        className={`p-5 rounded-3xl border transition-all relative group flex items-start gap-4 ${
                          isDone 
                            ? 'bg-emerald-50 border-emerald-100 opacity-90' 
                            : isExpired 
                              ? 'bg-gray-50 border-gray-200 grayscale cursor-not-allowed' 
                              : 'bg-white border-gray-100 hover:border-indigo-300 shadow-sm cursor-pointer'
                        }`}
                      >
                         <div className={`mt-1 p-1 rounded-full ${isDone ? 'text-emerald-600' : isExpired ? 'text-gray-300' : 'text-gray-200'}`}>
                            {isDone ? <CheckCircle size={28} /> : isExpired ? <Lock size={28} /> : <Circle size={28} />}
                         </div>
                         <div className="flex-1">
                            <div className="flex justify-between items-start mb-1">
                               <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{task.MaMonHoc}</span>
                               <span className={`text-[10px] font-bold flex items-center gap-1 ${isExpired && !isDone ? 'text-rose-500' : 'text-gray-400'}`}>
                                 <Clock size={10} /> {task.HanChot}
                               </span>
                            </div>
                            <h4 className={`font-bold text-sm mb-1 ${isDone ? 'line-through text-gray-400' : isExpired ? 'text-gray-400' : 'text-gray-800'}`}>
                              {task.TieuDe}
                            </h4>
                            <p className="text-xs text-gray-500 line-clamp-2">{task.MoTa}</p>
                            
                            {isExpired && !isDone && (
                              <div className="mt-2 flex items-center gap-1.5 text-rose-600 font-black text-[10px] uppercase">
                                <AlertCircle size={12} /> Đã hết hạn nộp bài
                              </div>
                            )}
                         </div>
                      </div>
                    );
                 }) : (
                   <div className="py-20 flex flex-col items-center text-center opacity-30">
                      <BookOpen size={48} className="mb-4" />
                      <p className="text-sm font-bold">Chưa có bài tập nào được giao</p>
                   </div>
                 )}
              </div>
           </div>

           <div className="bg-gray-900 text-white rounded-[40px] p-8 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5 rotate-12"><ShieldAlert size={100} /></div>
              <h3 className="font-black text-lg mb-6 relative z-10 flex items-center gap-2"><ShieldAlert size={20} className="text-rose-500" /> Nhật ký nề nếp</h3>
              <div className="space-y-4 relative z-10">
                 {disciplines.filter(d => d.MaHS === student.MaHS).length > 0 ? (
                   disciplines.filter(d => d.MaHS === student.MaHS).map(item => (
                     <div key={item.MaKyLuat} className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                        <div className="flex justify-between items-center mb-2">
                           <span className="text-[10px] font-bold text-gray-400">{new Date(item.NgayViPham).toLocaleDateString('vi-VN')}</span>
                           <span className="text-[10px] font-black text-rose-400">-{item.DiemTruTaiThoiDiemDo}đ</span>
                        </div>
                        <p className="text-xs font-bold mb-1">{item.HinhThucXL}</p>
                        <p className="text-[11px] text-gray-400 italic">"{item.NoiDungChiTiet}"</p>
                     </div>
                   ))
                 ) : (
                   <div className="py-10 text-center">
                      <p className="text-xs text-emerald-400 font-bold">Tài khoản sạch. Giữ vững phong độ nhé!</p>
                   </div>
                 )}
              </div>
           </div>
        </div>
      </main>

      <footer className="p-8 text-center text-gray-400 text-[10px] font-bold uppercase tracking-widest bg-white border-t border-gray-100">
         EduManager AI © 2024 • Nền tảng kết nối Giáo dục Việt Nam
      </footer>
    </div>
  );
};

export default StudentPortal;
