
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, GraduationCap, ClipboardList, ShieldAlert, LayoutDashboard, LogOut,
  Send, Plus, Loader2, BookOpen, UserCheck, Settings, Database, ChevronRight, Lock, Shield, X, Save, Calendar, Book
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';
import { Role, AppState, Student, Grade, Assignment, LearningLog, Discipline, AcademicYear, Class, ViolationRule, AssignmentTask, Teacher, SchoolPlan, ChatMessage } from './types';
import StudentList from './components/StudentList';
import GradeBoard from './components/GradeBoard';
import Dashboard from './components/Dashboard';
import DisciplineManager from './components/DisciplineManager';
import LearningLogs from './components/LearningLogs';
import TaskManager from './components/TaskManager';
import SystemManager from './components/SystemManager';
import Login from './components/Login';
import SchoolPlans from './components/SchoolPlans';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'students' | 'grades' | 'discipline' | 'logs' | 'tasks' | 'system' | 'plans'>('dashboard');
  
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [violationRules, setViolationRules] = useState<ViolationRule[]>([]);
  const [logs, setLogs] = useState<LearningLog[]>([]);
  const [tasks, setTasks] = useState<AssignmentTask[]>([]);
  const [plans, setPlans] = useState<SchoolPlan[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  const [state, setState] = useState<AppState>({
    currentUser: null,
    currentRole: Role.CHU_NHIEM,
    selectedClass: '',
    selectedYear: 0,
    selectedSubject: null
  });

  const fetchData = async () => {
    if (!isSupabaseConfigured) { setIsLoading(false); return; }
    try {
      const [
        { data: yrData }, { data: clData }, { data: tcData }, { data: asData },
        { data: stData }, { data: grData }, { data: dsData }, { data: lgData },
        { data: tkData }, { data: rlData }, { data: plData }, { data: msData }
      ] = await Promise.all([
        supabase.from('academic_years').select('*').order('MaNienHoc', { ascending: false }),
        supabase.from('classes').select('*').order('MaLop', { ascending: true }),
        supabase.from('teachers').select('*').order('Hoten', { ascending: true }),
        supabase.from('assignments').select('*'),
        supabase.from('students').select('*'),
        supabase.from('grades').select('*'),
        supabase.from('disciplines').select('*'),
        supabase.from('learning_logs').select('*'),
        supabase.from('tasks').select('*'),
        supabase.from('violation_rules').select('*'),
        supabase.from('school_plans').select('*'),
        supabase.from('messages').select('*').order('created_at', { ascending: true })
      ]);

      if (yrData) setYears(yrData);
      if (clData) setClasses(clData);
      if (tcData) setTeachers(tcData);
      if (asData) setAssignments(asData);
      if (stData) setStudents(stData || []);
      if (grData) setGrades(grData || []);
      if (dsData) setDisciplines(dsData || []);
      if (lgData) setLogs(lgData || []);
      if (tkData) setTasks(tkData || []);
      if (rlData) setViolationRules(rlData || []);
      if (plData) setPlans(plData || []);
      if (msData) setMessages(msData || []);

      if (yrData?.length && state.selectedYear === 0) {
        setState(p => ({ ...p, selectedYear: yrData[0].MaNienHoc }));
      }
    } catch (err) {
      console.error("Lỗi đồng bộ:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Lọc các lớp mà GV có quyền truy cập dựa trên Vai trò hiện tại và Niên học
  const filteredClasses = useMemo(() => {
    if (!state.currentUser || (state.currentUser as any).MaHS) return [];
    const teacherID = (state.currentUser as Teacher).MaGV;
    
    const myAs = assignments.filter(a => a.MaGV === teacherID && a.MaNienHoc === state.selectedYear);
    
    // Lấy ID các lớp phù hợp với vai trò đang chọn (Chủ nhiệm hoặc Giảng dạy)
    const validClassIds = myAs
      .filter(a => a.LoaiPhanCong === state.currentRole)
      .map(a => a.MaLop);
      
    return classes.filter(c => validClassIds.includes(c.MaLop));
  }, [classes, assignments, state.currentUser, state.currentRole, state.selectedYear]);

  // Cập nhật lớp khi danh sách lớp thay đổi hoặc đổi vai trò
  useEffect(() => {
    if (filteredClasses.length > 0) {
      if (!state.selectedClass || !filteredClasses.some(c => c.MaLop === state.selectedClass)) {
        setState(p => ({ ...p, selectedClass: filteredClasses[0].MaLop }));
      }
    } else {
      setState(p => ({ ...p, selectedClass: '' }));
    }
  }, [filteredClasses, state.currentRole]);

  const currentClassStudents = useMemo(() => {
    if (!state.selectedClass || !students) return [];
    return students.filter(s => s.MaLopHienTai === state.selectedClass && s.MaNienHoc === state.selectedYear);
  }, [students, state.selectedClass, state.selectedYear]);

  const handleLogin = (role: Role, id: string, pass: string) => {
    if (role === Role.STUDENT) {
      const s = students.find(x => x.MaHS === id);
      if (s && (s.MatKhau || '123456') === pass) {
        setState(p => ({ ...p, currentUser: s, currentRole: Role.STUDENT, selectedClass: s.MaLopHienTai, selectedYear: s.MaNienHoc }));
        setIsLoggedIn(true);
      } else alert("Sai thông tin đăng nhập!");
    } else {
      const t = teachers.find(x => x.MaGV === id);
      if (t && (t.MatKhau || '123456') === pass) {
        const myAs = assignments.filter(a => a.MaGV === id);
        if (myAs.length === 0) { alert("Giáo viên này chưa có phân công trong hệ thống!"); return; }
        
        const initialRole = myAs.some(a => a.LoaiPhanCong === Role.CHU_NHIEM) ? Role.CHU_NHIEM : Role.GIANG_DAY;
        const firstClass = myAs.find(a => a.LoaiPhanCong === initialRole)?.MaLop || myAs[0].MaLop;
        
        setState(p => ({ 
          ...p, 
          currentUser: t, 
          currentRole: initialRole, 
          selectedClass: firstClass, 
          selectedYear: myAs[0].MaNienHoc || state.selectedYear 
        }));
        setIsLoggedIn(true);
      } else alert("Sai thông tin đăng nhập!");
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!state.currentUser || !state.selectedClass) return;
    const user = state.currentUser as any;
    const newMessage = {
      MaLop: state.selectedClass, MaNienHoc: state.selectedYear,
      senderId: user.MaGV || user.MaHS, senderName: user.Hoten,
      senderRole: state.currentRole, content: content
    };
    await supabase.from('messages').insert([newMessage]);
    fetchData();
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>;
  if (!isLoggedIn) return <Login onLogin={handleLogin} teachers={teachers} students={students} />;

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden text-[13px] font-normal text-slate-600">
      {/* SIDEBAR - Đảm bảo vai trò được phục hồi */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 shadow-sm relative z-20">
        <div className="p-6 flex items-center gap-3 border-b border-slate-50">
          <div className="bg-indigo-600 p-2.5 rounded-2xl text-white shadow-lg"><GraduationCap size={20} /></div>
          <h1 className="font-black text-lg text-slate-800 tracking-tight uppercase italic">EduManager</h1>
        </div>
        
        <nav className="flex-1 px-4 space-y-1.5 pt-6 overflow-y-auto custom-scrollbar">
          {/* Bộ chuyển vai trò quan trọng cho GV */}
          {state.currentRole !== Role.STUDENT && (
            <div className="mb-6 px-4 py-3 bg-slate-50 rounded-2xl border border-slate-100">
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Chế độ làm việc</p>
               <div className="flex p-1 bg-white border rounded-xl shadow-sm">
                  <button 
                    onClick={() => setState(p => ({...p, currentRole: Role.CHU_NHIEM}))}
                    className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${state.currentRole === Role.CHU_NHIEM ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                  >Chủ nhiệm</button>
                  <button 
                    onClick={() => setState(p => ({...p, currentRole: Role.GIANG_DAY}))}
                    className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${state.currentRole === Role.GIANG_DAY ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                  >Giảng dạy</button>
               </div>
            </div>
          )}

          {[
            { id: 'dashboard', label: 'Bàn làm việc', icon: LayoutDashboard },
            { id: 'plans', label: 'Kế hoạch tuần', icon: Calendar },
            { id: 'students', label: 'Học sinh & SYLL', icon: Users },
            { id: 'grades', label: 'Bảng điểm môn', icon: GraduationCap },
            { id: 'tasks', label: 'Giao bài tập', icon: Send },
            { id: 'discipline', label: 'Kỷ luật', icon: ShieldAlert },
            { id: 'logs', label: 'Nhật ký', icon: ClipboardList },
          ].map((item: any) => (
            <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === item.id ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}>
              <item.icon size={18} /> <span className="flex-1 text-left">{item.label}</span>
            </button>
          ))}
          
          <button onClick={() => setActiveTab('system')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest mt-6 transition-all ${activeTab === 'system' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-50'}`}>
            <Settings size={18} /> Cấu hình hệ thống
          </button>
        </nav>

        <div className="p-6 border-t border-slate-50 mt-auto">
          <button onClick={() => setIsLoggedIn(false)} className="w-full flex items-center gap-3 px-4 py-2.5 text-rose-500 font-black uppercase text-[10px] tracking-widest hover:bg-rose-50 rounded-2xl transition-all">
            <LogOut size={18}/> Đăng xuất
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden">
        {/* HEADER - Khôi phục Niên học và Lớp */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 relative z-10">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Lớp học:</span>
              <select value={state.selectedClass} onChange={(e) => setState(p => ({...p, selectedClass: e.target.value}))} className="font-black text-slate-800 border-none outline-none bg-slate-50 px-3 py-1.5 rounded-xl text-xs shadow-inner cursor-pointer">
                {filteredClasses.length > 0 ? filteredClasses.map(c => <option key={c.MaLop} value={c.MaLop}>{c.TenLop}</option>) : <option value="">Chưa có lớp</option>}
              </select>
            </div>
            <div className="w-px h-6 bg-slate-100"></div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Niên học:</span>
              <select value={state.selectedYear} onChange={(e) => setState(p => ({...p, selectedYear: parseInt(e.target.value)}))} className="font-black text-indigo-600 border-none outline-none bg-indigo-50 px-3 py-1.5 rounded-xl text-xs shadow-inner cursor-pointer">
                {years.map(y => <option key={y.MaNienHoc} value={y.MaNienHoc}>{y.TenNienHoc}</option>)}
              </select>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="text-right hidden sm:block">
                <p className="text-[11px] font-black text-slate-800 uppercase">{(state.currentUser as Teacher)?.Hoten}</p>
                <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest">{state.currentRole === Role.CHU_NHIEM ? 'GV Chủ nhiệm' : 'GV Giảng dạy'}</p>
             </div>
             <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black shadow-lg shadow-indigo-100">
               {(state.currentUser as Teacher)?.Hoten?.charAt(0)}
             </div>
          </div>
        </header>

        {/* CONTENT AREA - Đảm bảo cuộn không bị lỗi */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/40 custom-scrollbar">
          {activeTab === 'dashboard' && <Dashboard state={state} students={currentClassStudents} grades={grades} disciplines={disciplines} plans={plans} messages={messages.filter(m => m.MaLop === state.selectedClass)} onSendMessage={handleSendMessage} />}
          {activeTab === 'students' && <StudentList state={state} students={currentClassStudents} grades={grades} disciplines={disciplines} logs={logs} violationRules={violationRules} onUpdateStudent={(s) => supabase.from('students').upsert(s).then(() => fetchData())} onDeleteStudent={(id) => supabase.from('students').delete().eq('MaHS', id).then(() => fetchData())} />}
          {activeTab === 'grades' && <GradeBoard state={state} students={currentClassStudents} grades={grades} onUpdateGrades={() => fetchData()} />}
          {activeTab === 'tasks' && <TaskManager state={state} students={currentClassStudents} tasks={tasks} onUpdateTasks={(t) => supabase.from('tasks').upsert(t).then(() => fetchData())} onDeleteTask={(id) => supabase.from('tasks').delete().eq('MaNhiemVu', id).then(() => fetchData())} />}
          {activeTab === 'discipline' && <DisciplineManager state={state} students={currentClassStudents} disciplines={disciplines} violationRules={violationRules} onUpdateDisciplines={(d) => supabase.from('disciplines').upsert(d).then(() => fetchData())} onDeleteDiscipline={(id) => supabase.from('disciplines').delete().eq('MaKyLuat', id).then(() => fetchData())} onUpdateRules={(r) => supabase.from('violation_rules').upsert(r).then(() => fetchData())} />}
          {activeTab === 'logs' && <LearningLogs state={state} students={currentClassStudents} logs={logs} assignment={assignments.find(a => a.MaLop === state.selectedClass) as any} onUpdateLogs={(l) => supabase.from('learning_logs').upsert(l).then(() => fetchData())} onDeleteLog={(id) => supabase.from('learning_logs').delete().eq('MaTheoDoi', id).then(() => fetchData())} />}
          {activeTab === 'system' && <SystemManager years={years} classes={classes} teachers={teachers} assignments={assignments} onUpdate={() => fetchData()} students={students} />}
          {activeTab === 'plans' && <SchoolPlans state={state} plans={plans} classes={classes} onUpdatePlan={(p) => supabase.from('school_plans').upsert(p).then(() => fetchData())} onDeletePlan={(id) => supabase.from('school_plans').delete().eq('MaKeHoach', id).then(() => fetchData())} />}
        </div>
      </main>
    </div>
  );
};

export default App;
