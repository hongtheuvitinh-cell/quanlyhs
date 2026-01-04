
import React, { useMemo, useState } from 'react';
import { 
  Plus, GraduationCap, Send, ShieldAlert, LogOut, User, Calendar, CheckCircle, 
  Circle, Trophy, BookOpen, Award, TrendingUp, Clock, Layout, AlertCircle, 
  Lock, Link as LinkIcon, Check, Shield, Save, X, Loader2, ExternalLink, 
  Info, ClipboardList, Globe, Home, Menu, ChevronRight, Bell
} from 'lucide-react';
// Added missing Role import
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
  onSendMessage: (content: string) => Promise<void>;
  // Fix: changed onLogout from void to () => void to correctly match usage as an event callback
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ old: '', new: '', confirm: '' });
  const [isUpdating, setIsUpdating] = useState(false);
  const [taskLinks, setTaskLinks] = useState<Record<number, string>>({});
  const [processingTaskId, setProcessingTaskId] = useState<number | null>(null);
  const [viewingDiscipline, setViewingDiscipline] = useState<Discipline | null>(null);

  // Logic lọc kế hoạch: Toàn trường HOẶC dành riêng cho lớp này
  const myPlans = useMemo(() => {
    return [...plans]
      .filter(p => !p.DoiTuong || p.DoiTuong.length === 0 || p.DoiTuong.includes(student.MaLopHienTai))
      .sort((a, b) => b.Tuan - a.Tuan);
  }, [plans, student.MaLopHienTai]);

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

  const renderNav = (isMobile = false) => (
    <nav className={isMobile ? "flex justify-around items-center h-full px-4" : "space-y-2"}>
      {menuItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeView === item.id;
        return (
          <button
            key={item.id}
            onClick={() => { setActiveView(item.id as ViewState); if(!isMobile) setIsSidebarOpen(false); }}
            className={`flex items-center gap-3 transition-all ${
              isMobile 
                ? `flex-col py-1 px-3 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`
                : `w-full px-4 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest ${
                    isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'
                  }`
            }`}
          >
            <Icon size={isMobile ? 22 : 18} />
            <span className={isMobile ? "text-[8px] font-bold uppercase mt-0.5" : ""}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );

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
      <aside className="hidden md:flex w-72 bg-white border-r border-slate-200 flex-col shrink-0">
        <div className="p-8 border-b border-slate-50">
          <div className="flex items-center gap-3">
             <div className="p-2.5 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-100"><Shield size={20} /></div>
             <h1 className="font-black text-slate-800 uppercase italic tracking-tighter">EduStudent</h1>
          </div>
        </div>
        
        <div className="p-6 flex-1">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 px-4">Menu chức năng</p>
          {renderNav()}
        </div>

        <div className="p-6 border-t border-slate-50">
          <div className="p-4 bg-slate-50 rounded-3xl flex items-center gap-3 mb-4">
             <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-black">
               {student.Hoten.charAt(0)}
             </div>
             <div className="min-w-0">
                <p className="text-[11px] font-black text-slate-800 uppercase truncate leading-none mb-1">{student.Hoten}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase">Lớp {student.MaLopHienTai}</p>
             </div>
          </div>
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 text-rose-500 font-black uppercase text-[10px] tracking-widest hover:bg-rose-50 rounded-2xl transition-all">
            <LogOut size={18} /> Đăng xuất
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
           <div className="p-1.5 bg-indigo-600 rounded-lg text-white"><Shield size={16} /></div>
           <h1 className="font-black text-slate-800 uppercase text-xs italic">EduStudent</h1>
        </div>
        <div className="flex items-center gap-3">
           <span className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg border border-indigo-100">Lớp {student.MaLopHienTai}</span>
           <button onClick={onLogout} className="p-2 text-rose-500"><LogOut size={20} /></button>
        </div>
      </header>

      {/* Content Area */}
      <main className="flex-1 p-6 md:p-10 lg:p-12 overflow-y-auto pb-24 md:pb-12 bg-slate-50/50">
        {activeView === 'dashboard' && (
          <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">Chào học sinh, {student.Hoten.split(' ').pop()}! 👋</h2>
                  <p className="text-slate-400 font-medium text-sm mt-1">Chúc bạn một ngày học tập thật hiệu quả và đầy cảm hứng.</p>
                </div>
                <div className="px-4 py-2 bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center gap-2 w-fit">
                   <Calendar size={16} className="text-indigo-600" />
                   <span className="text-[11px] font-black text-slate-500 uppercase">{new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                </div>
             </header>

             <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* KẾ HOẠCH TUẦN */}
                <div className="lg:col-span-8 space-y-6">
                   <div className="bg-white rounded-[40px] shadow-sm border border-slate-200 overflow-hidden relative group">
                      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity"><Bell size={120} /></div>
                      <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-indigo-600 text-white relative z-10">
                         <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md"><Calendar size={20}/></div>
                            <h3 className="font-black text-sm uppercase tracking-widest">Kế hoạch tuần & Thông báo</h3>
                         </div>
                      </div>
                      
                      <div className="p-8 space-y-6 bg-white relative z-10">
                         {myPlans.length > 0 ? myPlans.slice(0, 2).map((p, idx) => (
                           <div key={p.MaKeHoach} className={`flex gap-6 pb-6 last:pb-0 last:border-0 border-b border-slate-50 ${idx === 0 ? 'animate-in slide-in-from-right duration-700' : ''}`}>
                              <div className="flex flex-col items-center gap-2 shrink-0">
                                 <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center border-2 ${idx === 0 ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                                    <span className="text-[9px] font-black uppercase leading-none mb-1">Tuần</span>
                                    <span className="text-xl font-black leading-none">{p.Tuan}</span>
                                 </div>
                                 <div className="h-full w-px bg-slate-100"></div>
                              </div>
                              <div className="flex-1 space-y-3">
                                 <div className="flex flex-wrap items-center justify-between gap-2">
                                    <h4 className="font-black text-slate-800 text-sm uppercase tracking-tight leading-tight">{p.TieuDe}</h4>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase bg-slate-50 px-2 py-0.5 rounded-lg">{p.TuNgay} → {p.DenNgay}</span>
                                 </div>
                                 <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-50">
                                    <p className="text-[11px] text-slate-600 font-medium italic leading-relaxed whitespace-pre-line">"{p.NoiDung}"</p>
                                 </div>
                                 
                                 {/* SỬA LỖI IPAD: Hiển thị link rõ ràng hơn */}
                                 {p.DinhKem && (
                                   <div className="flex justify-start pt-1">
                                      <a 
                                        href={p.DinhKem} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="flex items-center gap-2.5 px-5 py-3 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 border border-indigo-500"
                                      >
                                        <LinkIcon size={16} /> Xem tệp đính kèm / Link thông báo
                                      </a>
                                   </div>
                                 )}
                              </div>
                           </div>
                         )) : (
                           <div className="py-20 text-center space-y-4 opacity-30">
                              <Bell size={48} className="mx-auto text-slate-300" />
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hiện chưa có kế hoạch hoặc thông báo mới.</p>
                           </div>
                         )}
                      </div>
                   </div>

                   {/* THẢO LUẬN NHÓM - Dành cho học sinh */}
                   <GroupChat state={portalState as any} messages={messages} onSendMessage={onSendMessage} />
                </div>

                {/* THỐNG KÊ NHANH - CỘT PHẢI */}
                <div className="lg:col-span-4 space-y-6">
                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6">
                      <div className="p-6 rounded-[32px] bg-indigo-600 text-white shadow-xl shadow-indigo-100 relative overflow-hidden group">
                         <div className="absolute -bottom-4 -right-4 opacity-10 group-hover:scale-110 transition-transform"><GraduationCap size={100} /></div>
                         <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-2">Điểm học tập (Dự kiến)</p>
                         <h4 className="text-4xl font-black">{finalAvg}</h4>
                         <div className="mt-4 flex items-center gap-2 text-[10px] font-bold bg-white/10 w-fit px-2 py-1 rounded-lg">
                           <TrendingUp size={14}/> Xếp loại: {Number(finalAvg) >= 8 ? 'Giỏi' : 'Khá'}
                         </div>
                      </div>

                      <div className="p-6 rounded-[32px] bg-white border border-slate-200 shadow-sm">
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Nhiệm vụ học tập</p>
                         <div className="space-y-4">
                            <div className="flex items-center justify-between">
                               <span className="text-xs font-black text-slate-700 uppercase">Hoàn thành</span>
                               <span className="text-xs font-black text-indigo-600">{tasks.filter(t => t.DanhSachHoanThanh.includes(student.MaHS)).length}/{tasks.length}</span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                               <div className="h-full bg-indigo-500 rounded-full" style={{width: `${(tasks.filter(t => t.DanhSachHoanThanh.includes(student.MaHS)).length / (tasks.length || 1)) * 100}%`}}></div>
                            </div>
                            <button onClick={() => setActiveView('tasks')} className="w-full mt-2 py-2.5 text-[9px] font-black uppercase text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-all">Chi tiết nhiệm vụ &rarr;</button>
                         </div>
                      </div>

                      <div className="p-6 rounded-[32px] bg-rose-50 border border-rose-100">
                         <div className="flex items-center justify-between mb-3">
                            <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Hạnh kiểm</p>
                            <ShieldAlert size={16} className="text-rose-400" />
                         </div>
                         <h4 className="text-2xl font-black text-rose-600 mb-2">{conductScore} <span className="text-xs font-bold opacity-60">/ 100đ</span></h4>
                         <p className="text-[10px] text-rose-500/70 font-medium italic">Bạn có {myDisciplines.length} lỗi vi phạm.</p>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        )}

        {activeView === 'study' && (
          <div className="max-w-5xl mx-auto space-y-8 animate-in slide-in-from-right-4 duration-500">
             <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg"><GraduationCap size={24} /></div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Kết quả học tập điện tử</h2>
             </div>
             <div className="bg-white rounded-[40px] shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                   <table className="w-full text-left">
                     <thead>
                       <tr className="bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                         <th className="px-10 py-6">Môn học bộ môn</th>
                         <th className="px-8 py-6 text-center">Học kỳ 1</th>
                         <th className="px-8 py-6 text-center">Học kỳ 2</th>
                         <th className="px-10 py-6 text-right text-indigo-600">Điểm Cả năm</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                        {gradeTableData.map((row: any) => (
                          <tr key={row.name} className="hover:bg-indigo-50/30 transition-colors group">
                            <td className="px-10 py-5 font-black text-slate-700 text-sm group-hover:text-indigo-600 transition-colors uppercase">{row.name}</td>
                            <td className="px-8 py-5 text-center text-slate-500 font-black text-sm">{row.hk1?.toFixed(1) || '--'}</td>
                            <td className="px-8 py-5 text-center text-slate-500 font-black text-sm">{row.hk2?.toFixed(1) || '--'}</td>
                            <td className="px-10 py-5 text-right font-black text-indigo-600 bg-indigo-50/20 text-base">{row.cn?.toFixed(1) || '--'}</td>
                          </tr>
                        ))}
                     </tbody>
                   </table>
                </div>
             </div>
          </div>
        )}

        {activeView === 'tasks' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-right-4 duration-500">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg"><Send size={24} /></div>
                   <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Nhiệm vụ & Bài tập</h2>
                </div>
                <span className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-2xl text-[10px] font-black uppercase border border-indigo-100">{tasks.length} nhiệm vụ</span>
             </div>
             
             <div className="grid grid-cols-1 gap-6">
                {tasks.length > 0 ? tasks.map((task: AssignmentTask) => {
                   const isDone = (task.DanhSachHoanThanh || []).includes(student.MaHS);
                   const reportLink = task.BaoCaoNhiemVu?.[student.MaHS] || "";
                   
                   return (
                     <div key={task.MaNhiemVu} className={`p-8 rounded-[40px] border transition-all flex flex-col md:flex-row gap-8 ${isDone ? 'bg-emerald-50/30 border-emerald-100 opacity-80' : 'bg-white border-slate-200 shadow-md shadow-indigo-50/30'}`}>
                        <div className="flex-1 space-y-4">
                           <div className="flex items-center justify-between">
                              <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-xl border ${isDone ? 'bg-white border-emerald-200 text-emerald-600' : 'bg-indigo-50 border-indigo-100 text-indigo-600'}`}>{task.MaMonHoc}</span>
                              <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400">
                                <Clock size={14} /> Hạn chót: {task.HanChot}
                              </div>
                           </div>
                           <div>
                              <h4 className={`font-black text-base uppercase leading-tight mb-2 ${isDone ? 'text-emerald-700' : 'text-slate-800'}`}>{task.TieuDe}</h4>
                              <p className="text-[12px] text-slate-500 font-medium italic leading-relaxed">"{task.MoTa}"</p>
                           </div>
                        </div>
                        
                        <div className="md:w-72 space-y-4 border-t md:border-t-0 md:border-l border-slate-100 pt-6 md:pt-0 md:pl-8 flex flex-col justify-center">
                           <div className="space-y-1.5">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Link nộp bài</label>
                              <div className="relative">
                                 <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                                 <input 
                                   type="text" 
                                   placeholder="Dán link..."
                                   value={taskLinks[task.MaNhiemVu] !== undefined ? taskLinks[task.MaNhiemVu] : reportLink}
                                   onChange={(e) => setTaskLinks({...taskLinks, [task.MaNhiemVu]: e.target.value})}
                                   className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-bold outline-none focus:bg-white transition-all shadow-inner" 
                                 />
                              </div>
                           </div>
                           <button 
                              onClick={() => handleTaskSubmit(task.MaNhiemVu)}
                              disabled={processingTaskId === task.MaNhiemVu}
                              className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 ${isDone ? 'bg-emerald-600 text-white shadow-emerald-100' : 'bg-indigo-600 text-white shadow-indigo-100'}`}
                           >
                              {processingTaskId === task.MaNhiemVu ? <Loader2 size={16} className="animate-spin" /> : (isDone ? <CheckCircle size={16} /> : <Circle size={16} />)}
                              {isDone ? 'Cập nhật nộp bài' : 'Xác nhận nộp bài'}
                           </button>
                        </div>
                     </div>
                   );
                }) : (
                  <div className="py-24 text-center opacity-30">
                     <Plus size={48} className="mx-auto mb-4" />
                     <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Hiện chưa có nhiệm vụ nào.</p>
                  </div>
                )}
             </div>
          </div>
        )}

        {activeView === 'discipline' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-right-4 duration-500">
             <div className="flex items-center gap-3">
                <div className="p-3 bg-rose-600 rounded-2xl text-white shadow-lg shadow-rose-100"><ShieldAlert size={24} /></div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Rèn luyện & Vi phạm</h2>
             </div>
             <div className="space-y-4">
                {myDisciplines.length > 0 ? myDisciplines.map(d => {
                  const rule = violationRules.find(r => r.MaLoi === d.MaLoi);
                  return (
                    <div key={d.MaKyLuat} className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:border-rose-200 transition-all">
                       <div className="flex items-start gap-5">
                          <div className="p-3 bg-rose-50 text-rose-500 rounded-2xl border border-rose-100 shrink-0"><AlertCircle size={24}/></div>
                          <div>
                             <div className="flex items-center gap-3 mb-1.5">
                                <h4 className="font-black text-slate-800 text-sm uppercase tracking-tight">Lỗi: {rule?.TenLoi || d.MaLoi}</h4>
                                <span className="text-[10px] font-black text-rose-500 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100">-{d.DiemTruTaiThoiDiemDo}đ</span>
                             </div>
                             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">{d.NgayViPham}</p>
                             <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-[11px] font-medium text-slate-600 italic">"{d.NoiDungChiTiet}"</div>
                          </div>
                       </div>
                       <div className="md:text-right shrink-0">
                          <span className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg">{d.HinhThucXL}</span>
                       </div>
                    </div>
                  );
                }) : (
                  <div className="py-24 bg-white rounded-[40px] border-2 border-dashed border-slate-100 text-center opacity-30">
                     <CheckCircle size={56} className="mx-auto text-emerald-200 mb-4" />
                     <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Tuyệt vời! Bạn không có vi phạm nào.</p>
                  </div>
                )}
             </div>
          </div>
        )}

        {activeView === 'profile' && (
          <div className="max-w-2xl mx-auto space-y-8 animate-in slide-in-from-right-4 duration-500">
             <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-slate-900 rounded-2xl text-white shadow-lg"><User size={24} /></div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Cá nhân & Bảo mật</h2>
             </div>
             
             <div className="bg-white rounded-[40px] shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-8 space-y-10">
                   <div className="flex flex-col md:flex-row items-center gap-8 border-b border-slate-50 pb-8">
                      <div className="w-24 h-32 bg-slate-100 rounded-3xl overflow-hidden shrink-0 flex items-center justify-center">
                         {student.Anh ? <img src={student.Anh} className="w-full h-full object-cover" /> : <User size={48} className="text-slate-200" />}
                      </div>
                      <div className="text-center md:text-left space-y-2">
                         <h3 className="text-2xl font-black text-slate-800 uppercase leading-none">{student.Hoten}</h3>
                         <div className="flex flex-wrap justify-center md:justify-start gap-2">
                            <span className="text-[9px] font-black uppercase tracking-widest bg-indigo-600 text-white px-3 py-1 rounded-full">ID: {student.MaHS}</span>
                            <span className="text-[9px] font-black uppercase tracking-widest bg-white border border-slate-200 text-slate-500 px-3 py-1 rounded-full">Lớp: {student.MaLopHienTai}</span>
                         </div>
                      </div>
                   </div>

                   <div className="space-y-6">
                      <div className="flex items-center gap-2 border-b border-slate-50 pb-2 text-rose-500">
                         <Lock size={16} />
                         <h4 className="text-[10px] font-black uppercase tracking-widest">Đổi mật khẩu</h4>
                      </div>
                      <div className="space-y-4">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input type="password" value={passwordForm.old} onChange={(e: any) => setPasswordForm({...passwordForm, old: e.target.value})} placeholder="Mật khẩu cũ" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm" />
                            <input type="password" value={passwordForm.new} onChange={(e: any) => setPasswordForm({...passwordForm, new: e.target.value})} placeholder="Mật khẩu mới" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm" />
                         </div>
                         <input type="password" value={passwordForm.confirm} onChange={(e: any) => setPasswordForm({...passwordForm, confirm: e.target.value})} placeholder="Xác nhận mật khẩu mới" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm" />
                         <button onClick={handleUpdatePassword} disabled={isUpdating} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3">
                            {isUpdating ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Cập nhật
                         </button>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        )}
      </main>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50">
        {renderNav(true)}
      </div>
    </div>
  );
};

export default StudentPortal;
