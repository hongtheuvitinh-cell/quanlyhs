
import React, { useMemo, useState, useEffect } from 'react';
import { 
  Plus, GraduationCap, Send, ShieldAlert, LogOut, User, Calendar, CheckCircle, 
  Circle, Trophy, BookOpen, Award, TrendingUp, Clock, Layout, AlertCircle, 
  Lock, Link as LinkIcon, Check, Shield, Save, X, Loader2, ExternalLink, 
  Info, ClipboardList, Globe, Home, Menu, ChevronRight, Bell, Phone, Mail, MapPin, Briefcase, FileText, AlertTriangle
} from 'lucide-react';
import { Student, Grade, Discipline, AssignmentTask, ViolationRule, SchoolPlan, ChatMessage, Role, AppState } from '../types';
import { supabase } from '../services/supabaseClient';
import GroupChat from './GroupChat';
import Timetable from './Timetable';

interface Props {
  student: Student;
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

type ViewState = 'dashboard' | 'study' | 'tasks' | 'discipline' | 'profile' | 'timetable';

const StudentPortal: React.FC<Props> = ({ student, violationRules, tasks, plans, messages, onSendMessage, onLogout, onToggleTask, onUpdateProfile }) => {
  const [activeView, setActiveView] = useState<ViewState>('dashboard');
  const [isUpdating, setIsUpdating] = useState(false);
  const [taskLinks, setTaskLinks] = useState<Record<number, string>>({});
  const [processingTaskId, setProcessingTaskId] = useState<number | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

  const [myGrades, setMyGrades] = useState<Grade[]>([]);
  const [myDisciplines, setMyDisciplines] = useState<Discipline[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  useEffect(() => {
    if (plans.length > 0 && selectedWeek === null) {
      // Default to the latest week or week 1
      const maxWeek = Math.max(...plans.map(p => p.Tuan));
      setSelectedWeek(maxWeek);
    }
  }, [plans]);

  const selectedPlan = useMemo(() => {
    return plans.find(p => p.Tuan === selectedWeek);
  }, [plans, selectedWeek]);

  const studentState: AppState = {
    currentUser: student,
    currentRole: Role.STUDENT,
    selectedClass: student.MaLopHienTai,
    selectedYear: student.MaNienHoc,
    selectedSubject: null
  };

  const fetchMyData = async () => {
    setIsLoadingData(true);
    try {
      const [{data: gr}, {data: ds}] = await Promise.all([
        supabase.from('grades').select('*').eq('MaHS', student.MaHS).eq('MaNienHoc', student.MaNienHoc),
        supabase.from('disciplines').select('*').eq('MaHS', student.MaHS).eq('MaNienHoc', student.MaNienHoc)
      ]);
      setMyGrades(gr || []);
      setMyDisciplines(ds || []);
    } finally { setIsLoadingData(false); }
  };

  useEffect(() => { fetchMyData(); }, [student.MaHS]);

  const calculateSubjectAvg = (mSubject: string, semester: number) => {
    const gradeRecord = myGrades.find(g => g.MaMonHoc === mSubject && g.HocKy === semester);
    if (!gradeRecord || !gradeRecord.DiemData) return null;
    const data = gradeRecord.DiemData;
    const txKeys = ['ĐGTX1', 'ĐGTX2', 'ĐGTX3', 'ĐGTX4', 'ĐGTX5'];
    const dgtx = txKeys.map(key => data[key]).filter(v => v !== null && v !== undefined && !isNaN(v as number)) as number[];
    const ggk = data['ĐGGK']; const gck = data['ĐGCK'];
    if (dgtx.length === 0 && ggk == null && gck == null) return null;
    let total = 0; let count = 0;
    dgtx.forEach(v => { total += v; count += 1; });
    if (ggk != null) { total += (ggk as number) * 2; count += 2; }
    if (gck != null) { total += (gck as number) * 3; count += 3; }
    return count > 0 ? total / count : null;
  };

  const gradeTableData = useMemo(() => {
    return subjectsList.map(sub => {
      const tb1 = calculateSubjectAvg(sub.id, 1);
      const tb2 = calculateSubjectAvg(sub.id, 2);
      return { name: sub.name, id: sub.id, hk1: tb1, hk2: tb2, cn: (tb1 !== null && tb2 !== null) ? (tb1 + tb2 * 2) / 3 : null };
    });
  }, [myGrades]);

  const finalAvg = useMemo(() => {
    const valid = gradeTableData.filter(d => d.cn !== null).map(d => d.cn as number);
    return valid.length > 0 ? (valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(1) : '--';
  }, [gradeTableData]);

  const conductScore = useMemo(() => {
    const totalDeduction = myDisciplines.reduce((sum, d) => sum + (d.DiemTruTaiThoiDiemDo || 0), 0);
    return Math.max(0, 100 - totalDeduction);
  }, [myDisciplines]);

  // So sánh ngày chính xác
  const isTaskExpired = (hanChot: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(hanChot);
    deadline.setHours(0, 0, 0, 0);
    return today > deadline;
  };

  const handleTaskSubmit = async (taskId: number) => {
    const task = tasks.find(t => t.MaNhiemVu === taskId);
    if (!task) return;
    
    const expired = isTaskExpired(task.HanChot);
    const isDone = (task.DanhSachHoanThanh || []).includes(student.MaHS);

    if (expired && !isDone) {
      alert("Nhiệm vụ này đã quá hạn nộp. Bạn không thể nộp bài trễ!");
      return;
    }

    if (expired && isDone) {
      alert("Nhiệm vụ đã quá hạn. Bạn chỉ có thể xem link đã nộp trước đó, không thể chỉnh sửa.");
      return;
    }

    const link = taskLinks[taskId] ?? (task.BaoCaoNhiemVu?.[student.MaHS] || "");
    if (!link.trim()) {
      alert("Vui lòng nhập link bài nộp!");
      return;
    }

    setProcessingTaskId(taskId);
    try {
      await onToggleTask(taskId, link);
      alert("Đã cập nhật bài nộp thành công!");
    } catch (e) {
      alert("Lỗi nộp bài!");
    } finally {
      setProcessingTaskId(null);
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Trang chủ', icon: Home },
    { id: 'timetable', label: 'Thời khóa biểu', icon: Calendar },
    { id: 'study', label: 'Học tập', icon: GraduationCap },
    { id: 'tasks', label: 'Nhiệm vụ', icon: Send },
    { id: 'discipline', label: 'Rèn luyện', icon: ShieldAlert },
    { id: 'profile', label: 'Cá nhân', icon: User },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row font-sans relative">
      <aside className="hidden md:flex w-72 bg-white border-r border-slate-200 flex-col shrink-0 shadow-sm">
        <div className="p-8 border-b border-slate-50 flex items-center gap-3"><div className="p-2.5 bg-indigo-600 rounded-2xl text-white shadow-lg"><Shield size={20} /></div><h1 className="font-black text-slate-800 uppercase italic tracking-tighter">EduStudent</h1></div>
        <div className="p-6 flex-1 space-y-2">
          {menuItems.map((item) => (
            <button key={item.id} onClick={() => setActiveView(item.id as ViewState)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${activeView === item.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}><item.icon size={18} /> {item.label}</button>
          ))}
        </div>
        <div className="p-6 border-t border-slate-50">
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 text-rose-500 font-black uppercase text-[10px] tracking-widest hover:bg-rose-50 rounded-2xl transition-all"><LogOut size={18} /> Đăng xuất</button>
        </div>
      </aside>
      <main className="flex-1 p-6 md:p-10 lg:p-12 overflow-y-auto pb-24 bg-slate-50/30 custom-scrollbar">
        {activeView === 'dashboard' && (
          <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
             <header className="flex justify-between items-end gap-4"><div><h2 className="text-2xl font-black text-slate-800 tracking-tight">Chào {student.Hoten.split(' ').pop()}! 👋</h2><p className="text-slate-400 font-medium text-sm mt-1">Hôm nay bạn thế nào? Xem các nhiệm vụ cần hoàn thành nhé.</p></div></header>
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 space-y-8">
                   <div className="bg-white rounded-[40px] shadow-sm border border-slate-200 overflow-hidden">
                     <div className="p-8 border-b border-slate-50 bg-indigo-600 text-white flex items-center justify-between">
                       <span className="font-black text-sm uppercase tracking-widest">Kế hoạch tuần học</span>
                       {plans.length > 0 && (
                         <select 
                           value={selectedWeek || ''} 
                           onChange={(e) => setSelectedWeek(Number(e.target.value))}
                           className="bg-indigo-700 text-white border-none rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-white/20"
                         >
                           {plans.sort((a, b) => b.Tuan - a.Tuan).map(p => (
                             <option key={p.MaKeHoach} value={p.Tuan}>Tuần {p.Tuan}</option>
                           ))}
                         </select>
                       )}
                     </div>
                     <div className="p-8">
                       {selectedPlan ? (
                         <div className="flex gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                           <div className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center bg-indigo-50 border-2 border-indigo-100 text-indigo-600 shrink-0">
                             <span className="text-[9px] font-black uppercase mb-1">Tuần</span>
                             <span className="text-xl font-black">{selectedPlan.Tuan}</span>
                           </div>
                           <div className="flex-1">
                             <h4 className="font-black text-slate-800 text-sm uppercase mb-2">{selectedPlan.TieuDe}</h4>
                             <div className="p-4 bg-slate-50/50 rounded-2xl text-[11px] text-slate-600 font-medium italic whitespace-pre-line">
                               "{selectedPlan.NoiDung}"
                             </div>
                           </div>
                         </div>
                       ) : (
                         <p className="text-center text-slate-300 py-10 font-black text-[10px] uppercase">Chưa có thông báo</p>
                       )}
                     </div>
                   </div>
                   <GroupChat state={{currentUser: student, currentRole: Role.STUDENT, selectedClass: student.MaLopHienTai, selectedYear: student.MaNienHoc, selectedSubject: null}} messages={messages} onSendMessage={onSendMessage} />
                </div>
                <div className="lg:col-span-4 space-y-6">
                   <div className="p-6 rounded-[32px] bg-indigo-600 text-white shadow-xl shadow-indigo-100"><p className="text-[9px] font-black uppercase opacity-60 mb-2">Điểm trung bình (TB)</p><h4 className="text-4xl font-black">{finalAvg}</h4></div>
                   <div className="p-6 rounded-[32px] bg-white border border-slate-200 shadow-sm"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Hoàn thành nhiệm vụ</p><div className="space-y-4"><div className="flex justify-between text-xs font-black uppercase"><span>Nộp bài</span><span>{tasks.filter(t => t.DanhSachHoanThanh.includes(student.MaHS)).length}/{tasks.length}</span></div><div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-indigo-500" style={{width: `${(tasks.filter(t => t.DanhSachHoanThanh.includes(student.MaHS)).length / (tasks.length || 1)) * 100}%`}}></div></div></div></div>
                   <div className="p-6 rounded-[32px] bg-rose-50 border border-rose-100"><p className="text-[9px] font-black text-rose-500 uppercase tracking-widest mb-3">Điểm rèn luyện</p><h4 className="text-2xl font-black text-rose-600">{conductScore}đ</h4></div>
                </div>
             </div>
          </div>
        )}
        {activeView === 'timetable' && (
          <div className="max-w-6xl mx-auto animate-in slide-in-from-right-4">
            <Timetable state={studentState} />
          </div>
        )}
        {activeView === 'study' && (
          <div className="max-w-5xl mx-auto space-y-8 animate-in slide-in-from-right-4">
             <div className="flex items-center gap-3"><div className="p-3 bg-indigo-600 rounded-2xl text-white"><GraduationCap size={24} /></div><h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Kết quả học tập</h2></div>
             <div className="bg-white rounded-[40px] shadow-sm border border-slate-200 overflow-hidden"><table className="w-full text-left"><thead><tr className="bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase border-b"><th className="px-10 py-6">Môn học</th><th className="px-8 py-6 text-center">HK 1</th><th className="px-8 py-6 text-center">HK 2</th><th className="px-10 py-6 text-right text-indigo-600">Cả năm</th></tr></thead><tbody className="divide-y divide-slate-50">{gradeTableData.map(row => (<tr key={row.id} className="hover:bg-indigo-50/30 transition-colors"><td className="px-10 py-5 font-black text-slate-700 text-sm uppercase">{row.name}</td><td className="px-8 py-5 text-center text-slate-500 text-sm">{row.hk1?.toFixed(1) || '--'}</td><td className="px-8 py-5 text-center text-slate-500 text-sm">{row.hk2?.toFixed(1) || '--'}</td><td className="px-10 py-5 text-right font-black text-indigo-600 text-base">{row.cn?.toFixed(1) || '--'}</td></tr>))}</tbody></table></div>
          </div>
        )}
        {activeView === 'tasks' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-right-4">
             <div className="flex items-center gap-3"><div className="p-3 bg-indigo-600 rounded-2xl text-white"><Send size={24} /></div><h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Nhiệm vụ & Bài tập</h2></div>
             <div className="grid grid-cols-1 gap-6">{tasks.length > 0 ? tasks.map(task => { 
                const isDone = (task.DanhSachHoanThanh || []).includes(student.MaHS);
                const expired = isTaskExpired(task.HanChot);
                return (
                  <div key={task.MaNhiemVu} className={`p-8 rounded-[40px] border transition-all flex flex-col md:flex-row gap-8 ${isDone ? 'bg-emerald-50/30 border-emerald-100' : expired ? 'bg-slate-50 border-slate-200 opacity-80' : 'bg-white border-slate-200 shadow-md shadow-indigo-50/20'}`}>
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-xl border ${expired ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>{task.MaMonHoc}</span>
                        <div className="flex items-center gap-2">
                           <Clock size={12} className={expired ? 'text-rose-500' : 'text-slate-400'} />
                           <span className={`text-[9px] font-black uppercase ${expired ? 'text-rose-500' : 'text-slate-400'}`}>Hạn: {task.HanChot}</span>
                        </div>
                      </div>
                      <h4 className={`font-black text-base uppercase ${expired && !isDone ? 'text-slate-400' : 'text-slate-800'}`}>{task.TieuDe}</h4>
                      <p className="text-[12px] text-slate-500 italic leading-relaxed whitespace-pre-line">"{task.MoTa}"</p>
                      {expired && !isDone && (
                        <div className="flex items-center gap-2 text-rose-500 bg-rose-50 px-4 py-2 rounded-xl border border-rose-100 w-fit">
                           <AlertTriangle size={14} />
                           <span className="text-[10px] font-black uppercase">Đã quá hạn nộp bài</span>
                        </div>
                      )}
                    </div>
                    <div className="md:w-64 space-y-4 flex flex-col justify-center">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Link nộp bài</label>
                        <input 
                          type="text" 
                          disabled={expired} 
                          placeholder={expired ? "Hết hạn nộp" : "Dán link bài tập tại đây..."} 
                          value={taskLinks[task.MaNhiemVu] ?? (task.BaoCaoNhiemVu?.[student.MaHS] || "")} 
                          onChange={(e) => setTaskLinks({...taskLinks, [task.MaNhiemVu]: e.target.value})} 
                          className={`w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] font-bold outline-none shadow-inner focus:bg-white transition-all ${expired ? 'bg-slate-100 cursor-not-allowed text-slate-400' : ''}`} 
                        />
                      </div>
                      
                      <button 
                        onClick={() => handleTaskSubmit(task.MaNhiemVu)} 
                        disabled={expired || processingTaskId === task.MaNhiemVu} 
                        className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg transition-all ${
                          isDone 
                            ? (expired ? 'bg-slate-400 text-white cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700') 
                            : (expired ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none border border-slate-300' : 'bg-indigo-600 text-white hover:bg-indigo-700')
                        }`}
                      >
                        {processingTaskId === task.MaNhiemVu ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : isDone ? (
                          <><CheckCircle size={16} /> {expired ? 'Đã nộp (Khóa)' : 'Cập nhật bài nộp'}</>
                        ) : (
                          <><Send size={16} /> {expired ? 'Không thể nộp' : 'Nộp bài tập'}</>
                        )}
                      </button>
                    </div>
                  </div>
                ); 
             }) : (<p className="text-center py-20 opacity-30 text-[10px] font-black uppercase">Hiện chưa có bài tập nào được giao</p>)}</div>
          </div>
        )}
        {activeView === 'discipline' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-right-4">
             <div className="flex items-center gap-3"><div className="p-3 bg-rose-600 rounded-2xl text-white shadow-lg"><ShieldAlert size={24} /></div><h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Rèn luyện & Vi phạm</h2></div>
             <div className="space-y-4">{myDisciplines.map(d => { const rule = violationRules.find(r => r.MaLoi === d.MaLoi); return (<div key={d.MaKyLuat} className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6"><div className="flex items-start gap-5"><div className="p-3 bg-rose-50 text-rose-500 rounded-2xl border border-rose-100 shrink-0"><AlertCircle size={24}/></div><div><h4 className="font-black text-slate-800 text-sm uppercase mb-1">Lỗi: {rule?.TenLoi || d.MaLoi}</h4><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3">{d.NgayViPham}</p><div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-[11px] font-medium text-slate-600 italic whitespace-pre-line">"{d.NoiDungChiTiet}"</div></div></div><span className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shrink-0 text-center">{d.HinhThucXL}</span></div>); })}{myDisciplines.length === 0 && (<div className="py-20 text-center opacity-30"><CheckCircle size={48} className="mx-auto mb-4 text-emerald-300" /><p className="text-[11px] font-black uppercase tracking-widest">Tuyệt vời! Bạn không có vi phạm nào.</p></div>)}</div>
          </div>
        )}
        {activeView === 'profile' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-right-4 pb-12">
            <div className="flex items-center gap-3"><div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg"><User size={24} /></div><h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Thông tin cá nhân</h2></div>
            <div className="bg-white rounded-[40px] shadow-sm border border-slate-200 overflow-hidden"><div className="p-8 bg-slate-50/50 border-b flex flex-col md:flex-row items-center gap-8"><div className="w-32 h-40 rounded-[32px] bg-white border-2 border-indigo-100 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">{student.Anh ? <img src={student.Anh} className="w-full h-full object-cover" /> : <User size={48} className="text-slate-200" />}</div><div className="text-center md:text-left"><h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">{student.Hoten}</h3><div className="flex flex-wrap justify-center md:justify-start gap-3"><span className="px-3 py-1 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest">Mã HS: {student.MaHS}</span><span className="px-3 py-1 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md">Lớp: {student.MaLopHienTai}</span></div></div></div><div className="p-10 space-y-8"><div className="grid grid-cols-1 md:grid-cols-2 gap-8"><InfoDisplay label="Ngày sinh" value={student.NgaySinh} icon={<Calendar size={16}/>} /><InfoDisplay label="Giới tính" value={student.GioiTinh ? 'Nam' : 'Nữ'} icon={<User size={16}/>} /><InfoDisplay label="Số điện thoại" value={student.SDT_LinkHe} icon={<Phone size={16}/>} /><InfoDisplay label="Email" value={student.Email || 'Chưa cập nhật'} icon={<Mail size={16}/>} /></div></div></div>
          </div>
        )}
      </main>
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 flex justify-around p-3">{menuItems.map(item => (<button key={item.id} onClick={() => setActiveView(item.id as ViewState)} className={`flex flex-col items-center gap-1 ${activeView === item.id ? 'text-indigo-600' : 'text-slate-400'}`}><item.icon size={20} /><span className="text-[8px] font-black uppercase">{item.label}</span></button>))}</div>
    </div>
  );
};

const InfoDisplay = ({ label, value, icon, colSpan = 1 }: any) => (
  <div className={`space-y-2 ${colSpan === 2 ? 'md:col-span-2' : ''}`}><p className="text-[10px] text-slate-400 uppercase font-black px-2 flex items-center gap-2">{icon} {label}</p><div className="p-4 bg-white border border-slate-100 rounded-2xl font-bold text-slate-700 text-[13px] shadow-sm">{value || '---'}</div></div>
);

export default StudentPortal;
