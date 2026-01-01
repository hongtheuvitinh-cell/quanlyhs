
import React, { useMemo, useState } from 'react';
import { 
  Plus, GraduationCap, Send, ShieldAlert, LogOut, User, Calendar, CheckCircle, Circle, Trophy, BookOpen, Award, TrendingUp, Clock, Layout, AlertCircle, Lock, Link as LinkIcon, Check, Shield, Save, X, Loader2, ExternalLink, Info, ClipboardList
} from 'lucide-react';
import { Student, Grade, Discipline, AssignmentTask } from '../types';
import { supabase } from '../services/supabaseClient';

interface Props {
  student: Student;
  grades: Grade[];
  disciplines: Discipline[];
  tasks: AssignmentTask[];
  onLogout: () => void;
  onToggleTask: (taskId: number, link?: string) => Promise<void>;
  onUpdateProfile: () => Promise<void>;
}

const subjectsList = [
  { id: 'TOAN', name: 'Toán Học' }, { id: 'VAN', name: 'Ngữ Văn' }, { id: 'ANH', name: 'Tiếng Anh' },
  { id: 'LY', name: 'Vật Lý' }, { id: 'HOA', name: 'Hóa Học' }, { id: 'SINH', name: 'Sinh Học' },
  { id: 'DIA', name: 'Địa Lý' }, { id: 'SU', name: 'Lịch Sử' }, { id: 'GDCD', name: 'GDCD' }
];

const StudentPortal: React.FC<Props> = ({ student, grades, disciplines, tasks, onLogout, onToggleTask, onUpdateProfile }) => {
  const [activePortalTab, setActivePortalTab] = useState<'study' | 'security'>('study');
  const [passwordForm, setPasswordForm] = useState({ old: '', new: '', confirm: '' });
  const [isUpdating, setIsUpdating] = useState(false);
  
  // State cho nộp bài tập
  const [taskLinks, setTaskLinks] = useState<Record<number, string>>({});
  const [processingTaskId, setProcessingTaskId] = useState<number | null>(null);
  
  // State cho xem chi tiết vi phạm
  const [viewingDiscipline, setViewingDiscipline] = useState<Discipline | null>(null);

  const calculateSubjectAvg = (mSubject: string, semester: number) => {
    const sGrades = (grades || []).filter((g: Grade) => g.MaHS === student.MaHS && g.MaMonHoc === mSubject && g.HocKy === semester);
    const dgtx = sGrades.filter((g: Grade) => g.LoaiDiem.startsWith('ĐGTX')).map((g: Grade) => g.DiemSo);
    const ggk = sGrades.find((g: Grade) => g.LoaiDiem === 'ĐGGK')?.DiemSo;
    const gck = sGrades.find((g: Grade) => g.LoaiDiem === 'ĐGCK')?.DiemSo;
    if (dgtx.length > 0 && ggk !== undefined && gck !== undefined) {
      return (dgtx.reduce((a: number, b: number) => a + b, 0) + ggk * 2 + gck * 3) / (dgtx.length + 5);
    }
    return null;
  };

  const gradeTableData = useMemo(() => {
    return subjectsList.map((sub: any) => {
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
    const valid = gradeTableData.filter((d: any) => d.cn !== null).map((d: any) => d.cn as number);
    return valid.length > 0 ? (valid.reduce((a: number, b: number) => a + b, 0) / valid.length).toFixed(1) : '--';
  }, [gradeTableData]);

  const myDisciplines = useMemo(() => {
    return (disciplines || []).filter(d => d.MaHS === student.MaHS).sort((a,b) => b.MaKyLuat - a.MaKyLuat);
  }, [disciplines, student.MaHS]);

  const conductScore = useMemo(() => {
    const totalDeduction = myDisciplines.reduce((sum, d) => sum + (d.DiemTruTaiThoiDiemDo || 0), 0);
    return Math.max(0, 100 - totalDeduction);
  }, [myDisciplines]);

  const handleTaskSubmit = async (taskId: number) => {
    const link = taskLinks[taskId] || "";
    setProcessingTaskId(taskId);
    try {
      await onToggleTask(taskId, link);
    } finally {
      setProcessingTaskId(null);
    }
  };

  const handleUpdatePassword = async () => {
    if (!passwordForm.old || !passwordForm.new || !passwordForm.confirm) { alert("Thiếu thông tin!"); return; }
    if (passwordForm.new !== passwordForm.confirm) { alert("Mật khẩu không khớp!"); return; }
    if (passwordForm.old !== (student.MatKhau || '123456')) { alert("Mật khẩu cũ sai!"); return; }
    setIsUpdating(true);
    try {
      const { error } = await supabase.from('students').update({ MatKhau: passwordForm.new }).eq('MaHS', student.MaHS);
      if (error) throw error;
      alert("Đã đổi mật khẩu!");
      setPasswordForm({ old: '', new: '', confirm: '' });
      await onUpdateProfile();
    } catch (e: any) { alert(e.message); } finally { setIsUpdating(false); }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      <header className="bg-slate-900 p-8 text-white relative shrink-0 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
          <div className="flex items-center gap-6">
            <div className="h-24 w-18 rounded-[28px] bg-white/10 border-4 border-white/20 p-1 flex items-center justify-center overflow-hidden shadow-2xl">
               {student.Anh ? <img src={student.Anh} className="w-full h-full object-cover rounded-[24px]" /> : <User size={40} className="text-white/40" />}
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight">{student.Hoten}</h1>
              <div className="flex items-center gap-3 mt-1.5">
                <p className="text-indigo-400 font-black uppercase text-[10px] tracking-widest bg-white/10 px-3 py-1 rounded-full border border-white/10">Lớp {student.MaLopHienTai}</p>
                <p className="text-white/40 font-black uppercase text-[10px] tracking-widest">ID: {student.MaHS}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setActivePortalTab(activePortalTab === 'study' ? 'security' : 'study')} className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black transition-all flex items-center gap-2 border border-white/10 text-[10px] uppercase tracking-widest shadow-lg">
              {activePortalTab === 'study' ? <Shield size={16} /> : <BookOpen size={16} />}
              {activePortalTab === 'study' ? 'Bảo mật' : 'Học tập'}
            </button>
            <button onClick={onLogout} className="px-6 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-2xl font-black transition-all flex items-center gap-2 border border-rose-500/20 text-[10px] uppercase tracking-widest">
              <LogOut size={16} /> Thoát
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-8 space-y-8">
        {activePortalTab === 'study' ? (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 animate-in fade-in duration-500">
            {/* Cột Trái: Chỉ số & Điểm */}
            <div className="xl:col-span-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard label="Điểm TB học tập" value={finalAvg} icon={<TrendingUp size={20}/>} color="indigo" />
                <StatCard label="Điểm rèn luyện" value={conductScore.toString()} icon={<Award size={20}/>} color="emerald" />
                <StatCard label="Lỗi vi phạm" value={myDisciplines.length.toString()} icon={<ShieldAlert size={20}/>} color="rose" />
              </div>

              <div className="bg-white rounded-[40px] shadow-sm border border-slate-200 overflow-hidden">
                 <div className="p-6 bg-slate-50/50 border-b flex items-center justify-between"><h3 className="font-black text-slate-800 text-[11px] uppercase tracking-widest flex items-center gap-2"><ClipboardList size={16} className="text-indigo-600"/> Bảng điểm học tập điện tử</h3></div>
                 <div className="overflow-x-auto">
                   <table className="w-full text-left">
                     <thead>
                       <tr className="bg-white text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                         <th className="px-8 py-4">Tên môn học</th>
                         <th className="px-6 py-4 text-center">Học kỳ 1</th>
                         <th className="px-6 py-4 text-center">Học kỳ 2</th>
                         <th className="px-8 py-4 text-right text-indigo-600">Cả năm</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                        {gradeTableData.map((row: any) => (
                          <tr key={row.name} className="hover:bg-slate-50/30 transition-colors">
                            <td className="px-8 py-4 font-bold text-slate-800 text-xs">{row.name}</td>
                            <td className="px-6 py-4 text-center text-slate-500 font-bold">{row.hk1?.toFixed(1) || '--'}</td>
                            <td className="px-6 py-4 text-center text-slate-500 font-bold">{row.hk2?.toFixed(1) || '--'}</td>
                            <td className="px-8 py-4 text-right font-black text-indigo-600 bg-indigo-50/10">{row.cn?.toFixed(1) || '--'}</td>
                          </tr>
                        ))}
                     </tbody>
                   </table>
                 </div>
              </div>

              <div className="bg-white rounded-[40px] shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 bg-slate-50/50 border-b flex items-center justify-between"><h3 className="font-black text-slate-800 text-[11px] uppercase tracking-widest flex items-center gap-2"><ShieldAlert size={16} className="text-rose-600"/> Nhật ký rèn luyện (Vi phạm)</h3></div>
                <div className="p-6 space-y-4">
                   {myDisciplines.length > 0 ? myDisciplines.map(d => (
                     <div key={d.MaKyLuat} className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between group hover:border-rose-200 transition-all shadow-sm">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center shrink-0 border border-rose-100"><AlertCircle size={18}/></div>
                           <div>
                              <div className="flex items-center gap-2 mb-0.5">
                                 <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-tight">Lỗi: {d.MaLoi}</h5>
                                 <span className="text-[8px] font-bold text-slate-400">{d.NgayViPham}</span>
                              </div>
                              <span className="px-2 py-0.5 bg-rose-500 text-white rounded-lg text-[8px] font-black uppercase tracking-widest">-{d.DiemTruTaiThoiDiemDo}đ</span>
                           </div>
                        </div>
                        <button onClick={() => setViewingDiscipline(d)} className="px-4 py-2 bg-slate-50 text-slate-500 rounded-xl text-[9px] font-black uppercase hover:bg-slate-900 hover:text-white transition-all">Xem chi tiết</button>
                     </div>
                   )) : (
                     <div className="py-12 text-center text-slate-300 font-bold uppercase text-[9px] tracking-widest">Bạn chưa có vi phạm nào. Rất tốt!</div>
                   )}
                </div>
              </div>
            </div>

            {/* Cột Phải: Nhiệm vụ học tập */}
            <div className="xl:col-span-4 flex flex-col gap-6">
               <div className="bg-white rounded-[40px] shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full min-h-[600px]">
                  <div className="p-6 bg-slate-900 border-b flex items-center justify-between shrink-0">
                    <h3 className="font-black text-white text-[11px] uppercase tracking-widest flex items-center gap-2"><Send size={16}/> Nhiệm vụ học tập</h3>
                    <span className="px-3 py-1 bg-white/10 rounded-full text-[9px] font-black text-white/50">{tasks.length}</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar bg-slate-50/30">
                     {tasks.length > 0 ? tasks.map((task: AssignmentTask) => {
                        const isDone = (task.DanhSachHoanThanh || []).includes(student.MaHS);
                        const reportLink = task.BaoCaoNhiemVu?.[student.MaHS] || "";
                        
                        return (
                          <div key={task.MaNhiemVu} className={`p-6 rounded-[32px] border transition-all ${isDone ? 'bg-emerald-50 border-emerald-200 shadow-sm' : 'bg-white border-slate-200 shadow-md'}`}>
                             <div className="flex justify-between items-start mb-3">
                                <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-xl border ${isDone ? 'bg-white border-emerald-200 text-emerald-600' : 'bg-indigo-50 border-indigo-100 text-indigo-600'}`}>{task.MaMonHoc}</span>
                                <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1"><Clock size={12} /> Hạn: {task.HanChot}</span>
                             </div>
                             <h4 className={`font-black text-xs mb-2 uppercase leading-tight ${isDone ? 'text-emerald-700' : 'text-slate-800'}`}>{task.TieuDe}</h4>
                             <p className="text-[11px] text-slate-500 mb-5 line-clamp-3 italic">"{task.MoTa}"</p>
                             
                             <div className="space-y-4 pt-4 border-t border-slate-100">
                                <div className="space-y-1.5">
                                   <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">Link nộp bài (Drive/Github...)</label>
                                   <div className="relative">
                                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                                      <input 
                                        type="text" 
                                        placeholder="Dán link sản phẩm tại đây..."
                                        value={taskLinks[task.MaNhiemVu] !== undefined ? taskLinks[task.MaNhiemVu] : reportLink}
                                        onChange={(e) => setTaskLinks({...taskLinks, [task.MaNhiemVu]: e.target.value})}
                                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[11px] outline-none focus:bg-white focus:border-indigo-400 transition-all shadow-inner" 
                                      />
                                   </div>
                                </div>
                                <button 
                                   onClick={() => handleTaskSubmit(task.MaNhiemVu)}
                                   disabled={processingTaskId === task.MaNhiemVu}
                                   className={`w-full py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 ${isDone ? 'bg-emerald-600 text-white shadow-emerald-100' : 'bg-indigo-600 text-white shadow-indigo-100'}`}
                                >
                                   {processingTaskId === task.MaNhiemVu ? <Loader2 size={16} className="animate-spin" /> : (isDone ? <CheckCircle size={16} /> : <Circle size={16} />)}
                                   {isDone ? 'Cập nhật nộp bài' : 'Xác nhận hoàn thành'}
                                </button>
                             </div>
                          </div>
                        );
                     }) : (
                       <div className="h-full flex flex-col items-center justify-center opacity-30 text-slate-300">
                          <Plus size={48} className="mb-4" />
                          <p className="text-[10px] font-black uppercase tracking-widest">Chưa có nhiệm vụ giao cho bạn</p>
                       </div>
                     )}
                  </div>
               </div>
            </div>
          </div>
        ) : (
          <div className="max-w-xl mx-auto bg-white rounded-[40px] shadow-sm border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-8">
             <div className="p-8 border-b bg-slate-50 flex items-center gap-3">
                <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-lg"><Lock size={20}/></div>
                <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm">Bảo mật tài khoản</h3>
             </div>
             <div className="p-8 space-y-6">
                <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Mật khẩu hiện tại</label>
                   <input type="password" value={passwordForm.old} onChange={(e: any) => setPasswordForm({...passwordForm, old: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:border-indigo-400 font-bold text-sm" />
                </div>
                <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Mật khẩu mới</label>
                   <input type="password" value={passwordForm.new} onChange={(e: any) => setPasswordForm({...passwordForm, new: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:border-indigo-400 font-bold text-sm" />
                </div>
                <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Xác nhận mật khẩu mới</label>
                   <input type="password" value={passwordForm.confirm} onChange={(e: any) => setPasswordForm({...passwordForm, confirm: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:border-indigo-400 font-bold text-sm" />
                </div>
                <div className="pt-4 flex gap-4">
                   <button onClick={() => setActivePortalTab('study')} className="flex-1 py-4 bg-slate-50 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all">Quay lại</button>
                   <button onClick={handleUpdatePassword} disabled={isUpdating} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 active:scale-95 transition-all">
                     {isUpdating ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                     Lưu mật khẩu mới
                   </button>
                </div>
             </div>
          </div>
        )}
      </main>

      {/* Modal xem chi tiết vi phạm */}
      {viewingDiscipline && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="p-6 border-b flex items-center justify-between bg-rose-50/30">
                 <h3 className="font-black text-slate-800 text-[11px] uppercase tracking-widest flex items-center gap-2"><ShieldAlert size={16} className="text-rose-500"/> Chi tiết vi phạm</h3>
                 <button onClick={() => setViewingDiscipline(null)} className="p-2 hover:bg-white rounded-full transition-colors"><X size={20}/></button>
              </div>
              <div className="p-8 space-y-6">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center shadow-inner"><AlertCircle size={24}/></div>
                    <div>
                       <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Loại lỗi: {viewingDiscipline.MaLoi}</p>
                       <p className="text-xs font-black text-slate-800">Ngày vi phạm: {viewingDiscipline.NgayViPham}</p>
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Nội dung chi tiết từ GV</label>
                    <div className="p-5 bg-slate-50 rounded-[32px] border border-slate-100 italic text-xs text-slate-600 leading-relaxed shadow-inner">
                       "{viewingDiscipline.NoiDungChiTiet || 'Không có mô tả chi tiết.'}"
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-900 text-white rounded-[24px]">
                       <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest mb-1">Hình thức xử lý</p>
                       <p className="text-[10px] font-black uppercase">{viewingDiscipline.HinhThucXL}</p>
                    </div>
                    <div className="p-4 bg-rose-500 text-white rounded-[24px]">
                       <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest mb-1">Điểm rèn luyện</p>
                       <p className="text-[10px] font-black uppercase">-{viewingDiscipline.DiemTruTaiThoiDiemDo} điểm</p>
                    </div>
                 </div>
              </div>
              <div className="p-6 bg-slate-50 border-t flex justify-center">
                 <button onClick={() => setViewingDiscipline(null)} className="px-10 py-3 bg-white border border-slate-200 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all">Đóng cửa sổ</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

// Component con StatCard
const StatCard = ({ label, value, icon, color }: any) => {
  const styles: any = {
    indigo: 'bg-indigo-50 border-indigo-100 text-indigo-600',
    emerald: 'bg-emerald-50 border-emerald-100 text-emerald-600',
    rose: 'bg-rose-50 border-rose-100 text-rose-600',
  };
  return (
    <div className={`p-6 rounded-[32px] border shadow-sm flex flex-col gap-3 transition-all hover:scale-[1.02] ${styles[color]}`}>
       <div className={`w-10 h-10 rounded-2xl flex items-center justify-center bg-white shadow-sm`}>{icon}</div>
       <div>
         <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1">{label}</p>
         <h4 className="text-3xl font-black leading-none">{value}</h4>
       </div>
    </div>
  );
};

export default StudentPortal;
