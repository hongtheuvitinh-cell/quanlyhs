
import React, { useMemo, useState } from 'react';
import { 
  GraduationCap, Send, ShieldAlert, LogOut, User, Calendar, CheckCircle, Circle, Trophy, BookOpen, Award, TrendingUp, Clock, Layout, AlertCircle, Lock, Link as LinkIcon, Check, Shield, Save, X, Loader2
} from 'lucide-react';
import { Student, Grade, Discipline, AssignmentTask } from '../types';
import { supabase } from '../services/supabaseClient';

interface Props {
  student: Student;
  grades: Grade[];
  disciplines: Discipline[];
  tasks: AssignmentTask[];
  onLogout: () => void;
  onToggleTask: (taskId: number, link?: string) => void;
  onUpdateProfile: () => void;
}

const subjectsList = [
  { id: 'TOAN', name: 'Toán Học' }, { id: 'VAN', name: 'Ngữ Văn' }, { id: 'ANH', name: 'Tiếng Anh' },
  { id: 'LY', name: 'Vật Lý' }, { id: 'HOA', name: 'Hóa Học' }, { id: 'SINH', name: 'Sinh Học' },
];

const StudentPortal: React.FC<Props> = ({ student, grades, disciplines, tasks, onLogout, onToggleTask, onUpdateProfile }) => {
  const today = new Date().toISOString().split('T')[0];
  const [activePortalTab, setActivePortalTab] = useState<'study' | 'security'>('study');
  const [taskLinks, setTaskLinks] = useState<Record<number, string>>({});
  const [passwordForm, setPasswordForm] = useState({ old: '', new: '', confirm: '' });
  const [isUpdating, setIsUpdating] = useState(false);

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

  const handleUpdatePassword = async () => {
    if (passwordForm.new !== passwordForm.confirm) { alert("Xác nhận mật khẩu không khớp!"); return; }
    if (passwordForm.old !== (student.MatKhau || '123456')) { alert("Mật khẩu cũ không chính xác!"); return; }
    
    setIsUpdating(true);
    try {
      const { error } = await supabase.from('students').update({ MatKhau: passwordForm.new }).eq('MaHS', student.MaHS);
      if (error) throw error;
      alert("Cập nhật mật khẩu thành công!");
      setPasswordForm({ old: '', new: '', confirm: '' });
      onUpdateProfile();
    } catch (e: any) { alert(e.message); }
    finally { setIsUpdating(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
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
          <div className="flex items-center gap-3">
            <button onClick={() => setActivePortalTab(activePortalTab === 'study' ? 'security' : 'study')} className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black transition-all flex items-center gap-2 border border-white/20 text-xs uppercase tracking-widest">
              {activePortalTab === 'study' ? <Shield size={18} /> : <BookOpen size={18} />}
              {activePortalTab === 'study' ? 'Bảo mật' : 'Học tập'}
            </button>
            <button onClick={onLogout} className="px-6 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-white rounded-2xl font-black transition-all flex items-center gap-2 border border-white/20 text-xs uppercase tracking-widest">
              <LogOut size={18} /> Thoát
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-8">
        {activePortalTab === 'study' ? (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 animate-in fade-in duration-500">
            <div className="xl:col-span-2 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 flex flex-col gap-1">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Điểm TB học tập</p>
                   <div className="flex items-baseline gap-1">
                      <h4 className="text-3xl font-black text-indigo-600">{finalAvg}</h4>
                      <TrendingUp size={16} className="text-indigo-300" />
                   </div>
                </div>
                <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 flex flex-col gap-1">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Điểm rèn luyện</p>
                   <div className="flex items-baseline gap-1">
                      <h4 className="text-3xl font-black text-emerald-600">{conductScore}</h4>
                      <Award size={16} className="text-emerald-300" />
                   </div>
                </div>
                <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 flex flex-col gap-1">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Số lỗi vi phạm</p>
                   <div className="flex items-baseline gap-1">
                      <h4 className="text-3xl font-black text-rose-600">{disciplines.filter(d => d.MaHS === student.MaHS).length}</h4>
                      <AlertCircle size={16} className="text-rose-300" />
                   </div>
                </div>
              </div>

              <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
                 <div className="p-8 border-b border-gray-50 flex items-center justify-between"><h3 className="font-black text-gray-800 text-sm uppercase tracking-tight">Kết quả học tập điện tử</h3></div>
                 <table className="w-full text-left">
                   <thead><tr className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest"><th className="px-8 py-4">Môn học</th><th className="px-6 py-4 text-center">HK1</th><th className="px-6 py-4 text-center">HK2</th><th className="px-8 py-4 text-right text-indigo-600">Cả năm</th></tr></thead>
                   <tbody className="divide-y divide-gray-50">
                      {gradeTableData.map(row => (
                        <tr key={row.name} className="hover:bg-gray-50/50"><td className="px-8 py-4 font-bold text-gray-800 text-xs">{row.name}</td><td className="px-6 py-4 text-center text-gray-500 font-bold">{row.hk1?.toFixed(1) || '--'}</td><td className="px-6 py-4 text-center text-gray-500 font-bold">{row.hk2?.toFixed(1) || '--'}</td><td className="px-8 py-4 text-right font-black text-indigo-600">{row.cn?.toFixed(1) || '--'}</td></tr>
                      ))}
                   </tbody>
                 </table>
              </div>
            </div>

            <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden flex flex-col">
               <div className="p-8 border-b bg-indigo-50/30 flex items-center justify-between shrink-0"><h3 className="font-black text-gray-800 text-sm uppercase tracking-tight">Việc cần làm</h3></div>
               <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                  {tasks.length > 0 ? tasks.map(task => {
                     const isDone = task.DanhSachHoanThanh.includes(student.MaHS);
                     const existingLink = task.BaoCaoNhiemVu?.[student.MaHS] || '';
                     return (
                       <div key={task.MaNhiemVu} className={`p-5 rounded-3xl border transition-all ${isDone ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-gray-100 shadow-sm'}`}>
                          <div className="flex justify-between items-start mb-2">
                             <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">{task.MaMonHoc}</span>
                             <span className="text-[9px] font-bold text-gray-400 flex items-center gap-1"><Clock size={10} /> {task.HanChot}</span>
                          </div>
                          <h4 className={`font-black text-xs mb-1 ${isDone ? 'text-emerald-700' : 'text-gray-800'}`}>{task.TieuDe}</h4>
                          <p className="text-[10px] text-gray-500 mb-4 line-clamp-2 italic">"{task.MoTa}"</p>
                          {isDone && <div className="p-2 bg-white rounded-xl border border-emerald-200 text-[9px] font-black text-emerald-600 uppercase flex items-center gap-2"><Check size={14}/> Đã hoàn thành</div>}
                       </div>
                     );
                  }) : (
                    <div className="py-20 text-center text-slate-300 font-bold uppercase text-[10px] tracking-widest opacity-30">Chưa có nhiệm vụ giao</div>
                  )}
               </div>
            </div>
          </div>
        ) : (
          <div className="max-w-xl mx-auto bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden animate-in slide-in-from-bottom-8">
             <div className="p-8 border-b flex items-center gap-3">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl"><Lock size={20}/></div>
                <h3 className="font-black text-gray-800 uppercase tracking-tight">Thiết lập bảo mật tài khoản</h3>
             </div>
             <div className="p-8 space-y-6">
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Mật khẩu hiện tại</label>
                   <input type="password" value={passwordForm.old} onChange={e => setPasswordForm({...passwordForm, old: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:bg-white focus:border-indigo-400 font-bold text-sm" />
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Mật khẩu mới</label>
                   <input type="password" value={passwordForm.new} onChange={e => setPasswordForm({...passwordForm, new: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:bg-white focus:border-indigo-400 font-bold text-sm" />
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Xác nhận mật khẩu mới</label>
                   <input type="password" value={passwordForm.confirm} onChange={e => setPasswordForm({...passwordForm, confirm: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:bg-white focus:border-indigo-400 font-bold text-sm" />
                </div>
                <div className="pt-4 flex gap-4">
                   <button onClick={() => setActivePortalTab('study')} className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black text-[11px] uppercase tracking-widest">Quay lại</button>
                   <button onClick={handleUpdatePassword} disabled={isUpdating} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-2">
                     {isUpdating ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                     Lưu mật khẩu mới
                   </button>
                </div>
             </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default StudentPortal;
