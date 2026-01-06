
import React, { useMemo, useState } from 'react';
import { 
  Plus, GraduationCap, Send, ShieldAlert, LogOut, User, Calendar, CheckCircle, 
  Circle, Trophy, BookOpen, Award, TrendingUp, Clock, Layout, AlertCircle, 
  Lock, Link as LinkIcon, Check, Shield, Save, X, Loader2, ExternalLink, 
  Info, ClipboardList, Globe, Home, Menu, ChevronRight, Bell
} from 'lucide-react';
import { Student, Grade, Discipline, AssignmentTask, ViolationRule, SchoolPlan, ChatMessage, Role } from '../types';
import { supabase } from '../services/supabaseClient';
import GroupChat from './GroupChat';

interface Props {
  student: Student;
  grades: Grade[];
  disciplines: Discipline[];
  violationRules: ViolationRule[];
  tasks: AssignmentTask[];
  plans: SchoolPlan[];
  messages: ChatMessage[];
  onSendMessage: (content: string, attachment?: string) => Promise<void>;
  onLogout: () => void;
  onToggleTask: (taskId: number, link?: string) => Promise<void>;
  onUpdateProfile: () => Promise<void>;
}

const subjectsList = [
  { id: 'TOAN', name: 'Toán Học' }, { id: 'VAN', name: 'Ngữ Văn' }, { id: 'ANH', name: 'Tiếng Anh' },
  { id: 'LY', name: 'Vật Lý' }, { id: 'HOA', name: 'Hóa Học' }, { id: 'SINH', name: 'Sinh Học' },
  { id: 'DIA', name: 'Địa Lý' }, { id: 'SU', name: 'Lịch Sử' }, { id: 'GDCD', name: 'GDCD' }
];

type ViewState = 'dashboard' | 'study' | 'tasks' | 'discipline' | 'profile';

const StudentPortal: React.FC<Props> = ({ student, grades, disciplines, violationRules, tasks, plans, messages, onSendMessage, onLogout, onToggleTask, onUpdateProfile }) => {
  const [activeView, setActiveView] = useState<ViewState>('dashboard');
  const [passwordForm, setPasswordForm] = useState({ old: '', new: '', confirm: '' });
  const [isUpdating, setIsUpdating] = useState(false);
  const [taskLinks, setTaskLinks] = useState<Record<number, string>>({});
  const [processingTaskId, setProcessingTaskId] = useState<number | null>(null);

  const myPlans = useMemo(() => {
    return [...plans]
      .filter(p => !p.DoiTuong || p.DoiTuong.length === 0 || p.DoiTuong.includes(student.MaLopHienTai))
      .sort((a, b) => b.Tuan - a.Tuan);
  }, [plans, student.MaLopHienTai]);

  const calculateSubjectAvg = (mSubject: string, semester: number) => {
    const sGrades = (grades || []).filter(g => g.MaHS === student.MaHS && g.MaMonHoc === mSubject && g.HocKy === semester);
    const dgtx = sGrades.filter(g => g.LoaiDiem.startsWith('ĐGTX')).map(g => g.DiemSo);
    const ggk = sGrades.find(g => g.LoaiDiem === 'ĐGGK')?.DiemSo;
    const gck = sGrades.find(g => g.LoaiDiem === 'ĐGCK')?.DiemSo;
    if (dgtx.length > 0 || ggk !== undefined || gck !== undefined) {
      let total = dgtx.reduce((a, b) => a + b, 0);
      let count = dgtx.length;
      if (ggk !== undefined) { total += ggk * 2; count += 2; }
      if (gck !== undefined) { total += gck * 3; count += 3; }
      return count > 0 ? total / count : null;
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
    const totalDeduction = disciplines.reduce((sum, d) => sum + (d.DiemTruTaiThoiDiemDo || 0), 0);
    return Math.max(0, 100 - totalDeduction);
  }, [disciplines]);

  const handleTaskSubmit = async (taskId: number) => {
    const link = taskLinks[taskId] || "";
    setProcessingTaskId(taskId);
    try {
      await onToggleTask(taskId, link);
      alert("Đã nộp bài thành công!");
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
      alert("Đã đổi mật khẩu thành công!");
      setPasswordForm({ old: '', new: '', confirm: '' });
      await onUpdateProfile();
    } catch (e: any) { alert(e.message); } finally { setIsUpdating(false); }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Trang chủ', icon: Home },
    { id: 'study', label: 'Học tập', icon: GraduationCap },
    { id: 'tasks', label: 'Nhiệm vụ', icon: Send },
    { id: 'discipline', label: 'Rèn luyện', icon: ShieldAlert },
    { id: 'profile', label: 'Cá nhân', icon: User },
  ];

  const portalState = {
     currentUser: student,
     currentRole: Role.STUDENT,
     selectedClass: student.MaLopHienTai,
     selectedYear: student.MaNienHoc,
     selectedSubject: null
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row font-sans">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex w-72 bg-white border-r border-slate-200 flex-col shrink-0 shadow-sm">
        <div className="p-8 border-b border-slate-50">
          <div className="flex items-center gap-3">
             <div className="p-2.5 bg-indigo-600 rounded-2xl text-white shadow-lg"><Shield size={20} /></div>
             <h1 className="font-black text-slate-800 uppercase italic tracking-tighter">EduStudent</h1>
          </div>
        </div>
        
        <div className="p-6 flex-1 space-y-2">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 px-4">Bảng điều khiển</p>
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id as ViewState)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${
                activeView === item.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <item.icon size={18} /> {item.label}
            </button>
          ))}
        </div>

        <div className="p-6 border-t border-slate-50">
          <div className="p-4 bg-slate-50 rounded-3xl flex items-center gap-3 mb-4">
             <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-black">
               {student.Hoten.charAt(0)}
             </div>
             <div className="min-w-0">
                <p className="text-[11px] font-black text-slate-800 uppercase truncate mb-1">{student.Hoten}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Lớp {student.MaLopHienTai}</p>
             </div>
          </div>
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 text-rose-500 font-black uppercase text-[10px] tracking-widest hover:bg-rose-50 rounded-2xl transition-all">
            <LogOut size={18} /> Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-10 lg:p-12 overflow-y-auto pb-24 bg-slate-50/30 custom-scrollbar">
        {activeView === 'dashboard' && (
          <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
             <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">Chào {student.Hoten.split(' ').pop()}! 👋</h2>
                  <p className="text-slate-400 font-medium text-sm mt-1">Hôm nay là một ngày tuyệt vời để học thêm điều mới.</p>
                </div>
                <div className="px-4 py-2 bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center gap-2">
                   <Calendar size={16} className="text-indigo-600" />
                   <span className="text-[11px] font-black text-slate-500 uppercase">{new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                </div>
             </header>

             <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 space-y-8">
                   <div className="bg-white rounded-[40px] shadow-sm border border-slate-200 overflow-hidden relative group">
                      <div className="p-8 border-b border-slate-50 bg-indigo-600 text-white">
                         <div className="flex items-center gap-3">
                            <Calendar size={20}/>
                            <h3 className="font-black text-sm uppercase tracking-widest">Thông báo & Kế hoạch tuần</h3>
                         </div>
                      </div>
                      
                      <div className="p-8 space-y-6">
                         {myPlans.length > 0 ? myPlans.slice(0, 2).map((p, idx) => (
                           <div key={p.MaKeHoach} className="flex gap-6 pb-6 border-b border-slate-50 last:pb-0 last:border-0">
                              <div className="flex flex-col items-center gap-2 shrink-0">
                                 <div className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center border-2 bg-indigo-50 border-indigo-100 text-indigo-600">
                                    <span className="text-[9px] font-black uppercase leading-none mb-1">Tuần</span>
                                    <span className="text-xl font-black">{p.Tuan}</span>
                                 </div>
                              </div>
                              <div className="flex-1 space-y-3">
                                 <h4 className="font-black text-slate-800 text-sm uppercase tracking-tight">{p.TieuDe}</h4>
                                 <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-50 text-[11px] text-slate-600 font-medium whitespace-pre-line italic">
                                    "{p.NoiDung}"
                                 </div>
                                 {p.DinhKem && (
                                   <a href={p.DinhKem} target="_blank" className="inline-flex items-center gap-2 text-indigo-600 font-black text-[10px] uppercase hover:underline">
                                      <LinkIcon size={14} /> Mở tài liệu đính kèm
                                   </a>
                                 )}
                              </div>
                           </div>
                         )) : (
                           <p className="text-center text-slate-300 py-10 font-black text-[10px] uppercase">Chưa có thông báo mới</p>
                         )}
                      </div>
                   </div>

                   <GroupChat state={portalState as any} messages={messages} onSendMessage={onSendMessage} />
                </div>

                <div className="lg:col-span-4 space-y-6">
                   <div className="p-6 rounded-[32px] bg-indigo-600 text-white shadow-xl shadow-indigo-100 relative overflow-hidden group">
                      <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-2">Điểm trung bình (TB)</p>
                      <h4 className="text-4xl font-black">{finalAvg}</h4>
                      <div className="mt-4 flex items-center gap-2 text-[10px] font-bold bg-white/10 w-fit px-2 py-1 rounded-lg">
                        Xếp loại dự kiến: {Number(finalAvg) >= 8 ? 'Giỏi' : 'Khá'}
                      </div>
                   </div>

                   <div className="p-6 rounded-[32px] bg-white border border-slate-200 shadow-sm">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Tiến độ nhiệm vụ</p>
                      <div className="space-y-4">
                         <div className="flex justify-between text-xs font-black uppercase">
                            <span>Hoàn thành</span>
                            <span>{tasks.filter(t => t.DanhSachHoanThanh.includes(student.MaHS)).length}/{tasks.length}</span>
                         </div>
                         <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full" style={{width: `${(tasks.filter(t => t.DanhSachHoanThanh.includes(student.MaHS)).length / (tasks.length || 1)) * 100}%`}}></div>
                         </div>
                      </div>
                   </div>

                   <div className="p-6 rounded-[32px] bg-rose-50 border border-rose-100">
                      <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest mb-3">Điểm rèn luyện</p>
                      <h4 className="text-2xl font-black text-rose-600 mb-1">{conductScore}đ</h4>
                      <p className="text-[10px] text-rose-500/70 font-medium italic">Vi phạm: {disciplines.length} lỗi</p>
                   </div>
                </div>
             </div>
          </div>
        )}

        {activeView === 'study' && (
          <div className="max-w-5xl mx-auto space-y-8 animate-in slide-in-from-right-4">
             <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg"><GraduationCap size={24} /></div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Bảng điểm chi tiết</h2>
             </div>
             <div className="bg-white rounded-[40px] shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b">
                      <th className="px-10 py-6">Môn học</th>
                      <th className="px-8 py-6 text-center">Học kỳ 1</th>
                      <th className="px-8 py-6 text-center">Học kỳ 2</th>
                      <th className="px-10 py-6 text-right text-indigo-600">Cả năm</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                     {gradeTableData.map(row => (
                       <tr key={row.name} className="hover:bg-indigo-50/30 transition-colors">
                         <td className="px-10 py-5 font-black text-slate-700 text-sm uppercase">{row.name}</td>
                         <td className="px-8 py-5 text-center text-slate-500 font-black text-sm">{row.hk1?.toFixed(1) || '--'}</td>
                         <td className="px-8 py-5 text-center text-slate-500 font-black text-sm">{row.hk2?.toFixed(1) || '--'}</td>
                         <td className="px-10 py-5 text-right font-black text-indigo-600 bg-indigo-50/20 text-base">{row.cn?.toFixed(1) || '--'}</td>
                       </tr>
                     ))}
                  </tbody>
                </table>
             </div>
          </div>
        )}

        {activeView === 'tasks' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-right-4">
             <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg"><Send size={24} /></div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Nhiệm vụ & Bài tập</h2>
             </div>
             
             <div className="grid grid-cols-1 gap-6">
                {tasks.length > 0 ? tasks.map(task => {
                   const isDone = (task.DanhSachHoanThanh || []).includes(student.MaHS);
                   return (
                     <div key={task.MaNhiemVu} className={`p-8 rounded-[40px] border transition-all flex flex-col md:flex-row gap-8 ${isDone ? 'bg-emerald-50/30 border-emerald-100 opacity-80' : 'bg-white border-slate-200 shadow-md shadow-indigo-50/20'}`}>
                        <div className="flex-1 space-y-4">
                           <div className="flex items-center justify-between">
                              <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">{task.MaMonHoc}</span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Hạn: {task.HanChot}</span>
                           </div>
                           <h4 className="font-black text-base uppercase leading-tight text-slate-800">{task.TieuDe}</h4>
                           <p className="text-[12px] text-slate-500 font-medium italic leading-relaxed whitespace-pre-line">"{task.MoTa}"</p>
                        </div>
                        <div className="md:w-64 space-y-4 flex flex-col justify-center">
                           <input 
                              type="text" 
                              placeholder="Dán link nộp bài..."
                              value={taskLinks[task.MaNhiemVu] !== undefined ? taskLinks[task.MaNhiemVu] : (task.BaoCaoNhiemVu?.[student.MaHS] || "")}
                              onChange={(e) => setTaskLinks({...taskLinks, [task.MaNhiemVu]: e.target.value})}
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-bold outline-none shadow-inner focus:bg-white transition-all" 
                           />
                           <button 
                              onClick={() => handleTaskSubmit(task.MaNhiemVu)}
                              disabled={processingTaskId === task.MaNhiemVu}
                              className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg transition-all ${isDone ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white'}`}
                           >
                              {processingTaskId === task.MaNhiemVu ? <Loader2 size={16} className="animate-spin" /> : (isDone ? <CheckCircle size={16} /> : <Circle size={16} />)}
                              {isDone ? 'Cập nhật bài nộp' : 'Xác nhận nộp bài'}
                           </button>
                        </div>
                     </div>
                   );
                }) : (
                  <p className="text-center py-20 opacity-30 text-[10px] font-black uppercase">Hiện chưa có nhiệm vụ nào</p>
                )}
             </div>
          </div>
        )}

        {activeView === 'discipline' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-right-4">
             <div className="flex items-center gap-3">
                <div className="p-3 bg-rose-600 rounded-2xl text-white shadow-lg shadow-rose-100"><ShieldAlert size={24} /></div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Rèn luyện & Vi phạm</h2>
             </div>
             <div className="space-y-4">
                {disciplines.map(d => {
                  const rule = violationRules.find(r => r.MaLoi === d.MaLoi);
                  return (
                    <div key={d.MaKyLuat} className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                       <div className="flex items-start gap-5">
                          <div className="p-3 bg-rose-50 text-rose-500 rounded-2xl border border-rose-100 shrink-0"><AlertCircle size={24}/></div>
                          <div>
                             <h4 className="font-black text-slate-800 text-sm uppercase mb-1">Lỗi: {rule?.TenLoi || d.MaLoi}</h4>
                             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3">{d.NgayViPham}</p>
                             <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-[11px] font-medium text-slate-600 italic whitespace-pre-line">"{d.NoiDungChiTiet}"</div>
                          </div>
                       </div>
                       <span className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shrink-0 text-center">{d.HinhThucXL}</span>
                    </div>
                  );
                })}
                {disciplines.length === 0 && (
                  <div className="py-20 text-center opacity-30">
                     <CheckCircle size={48} className="mx-auto mb-4 text-emerald-300" />
                     <p className="text-[11px] font-black uppercase tracking-widest">Tuyệt vời! Bạn không có vi phạm nào.</p>
                  </div>
                )}
             </div>
          </div>
        )}

        {activeView === 'profile' && (
          <div className="max-w-2xl mx-auto space-y-8 animate-in slide-in-from-right-4">
             <div className="bg-white rounded-[40px] shadow-sm border border-slate-200 overflow-hidden p-10 space-y-10">
                <div className="flex flex-col md:flex-row items-center gap-8 border-b border-slate-50 pb-8">
                   <div className="w-24 h-32 bg-slate-100 rounded-3xl overflow-hidden flex items-center justify-center">
                      <User size={48} className="text-slate-200" />
                   </div>
                   <div className="text-center md:text-left space-y-2">
                      <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{student.Hoten}</h3>
                      <div className="flex flex-wrap justify-center md:justify-start gap-2">
                         <span className="text-[9px] font-black uppercase bg-indigo-600 text-white px-3 py-1 rounded-full shadow-sm">Mã HS: {student.MaHS}</span>
                         <span className="text-[9px] font-black uppercase bg-white border border-slate-200 text-slate-500 px-3 py-1 rounded-full">Lớp: {student.MaLopHienTai}</span>
                      </div>
                   </div>
                </div>

                <div className="space-y-6">
                   <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1 border-l-2 border-indigo-600 pl-3">Đổi mật khẩu truy cập</h4>
                   <div className="space-y-4">
                      <input type="password" value={passwordForm.old} onChange={e => setPasswordForm({...passwordForm, old: e.target.value})} placeholder="Mật khẩu cũ" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm" />
                      <input type="password" value={passwordForm.new} onChange={e => setPasswordForm({...passwordForm, new: e.target.value})} placeholder="Mật khẩu mới" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm" />
                      <input type="password" value={passwordForm.confirm} onChange={e => setPasswordForm({...passwordForm, confirm: e.target.value})} placeholder="Xác nhận mật khẩu mới" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm" />
                      <button onClick={handleUpdatePassword} disabled={isUpdating} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95">
                         {isUpdating ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Xác nhận thay đổi
                      </button>
                   </div>
                </div>
             </div>
          </div>
        )}
      </main>

      {/* Mobile Nav Bottom */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 flex justify-around p-3">
        {menuItems.map(item => (
          <button key={item.id} onClick={() => setActiveView(item.id as ViewState)} className={`flex flex-col items-center gap-1 ${activeView === item.id ? 'text-indigo-600' : 'text-slate-400'}`}>
            <item.icon size={20} />
            <span className="text-[8px] font-black uppercase">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default StudentPortal;
