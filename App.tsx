
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
import StudentPortal from './components/StudentPortal';
import SchoolPlans from './components/SchoolPlans';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'students' | 'grades' | 'discipline' | 'logs' | 'tasks' | 'system' | 'plans'>('dashboard');
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  
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

  const [passwordForm, setPasswordForm] = useState({ old: '', new: '', confirm: '' });

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

  useEffect(() => { 
    fetchData(); 
  }, []);

  // HÀM LỌC HỌC SINH QUAN TRỌNG: Không bao giờ dùng slice() và so sánh nới lỏng
  const currentClassStudents = useMemo(() => {
    if (!state.selectedClass || !students) return [];
    const target = state.selectedClass.toString().trim().toLowerCase();
    return students.filter(s => {
      const sClass = (s.MaLopHienTai || "").toString().trim().toLowerCase();
      return sClass === target;
    });
  }, [students, state.selectedClass]);

  const currentAssignment = useMemo(() => {
    if (!state.currentUser || (state.currentUser as any).MaHS || !state.selectedClass) return null;
    const teacher = state.currentUser as Teacher;
    return assignments.find(a => 
      a.MaGV === teacher.MaGV && 
      (a.MaLop || "").toString().trim().toLowerCase() === state.selectedClass.toString().trim().toLowerCase() && 
      a.MaNienHoc === state.selectedYear &&
      a.LoaiPhanCong === state.currentRole &&
      (state.currentRole === Role.CHU_NHIEM ? true : a.MaMonHoc === state.selectedSubject)
    ) || null;
  }, [assignments, state.currentUser, state.selectedClass, state.selectedYear, state.currentRole, state.selectedSubject]);

  const filteredClasses = useMemo(() => {
    if (!state.currentUser || (state.currentUser as any).MaHS) return [];
    const teacherID = (state.currentUser as Teacher).MaGV;
    const myAssignments = assignments.filter(a => a.MaGV === teacherID && a.MaNienHoc === state.selectedYear);
    const assignedClassIds = myAssignments
      .filter(a => a.LoaiPhanCong === state.currentRole)
      .map(a => a.MaLop.toString().trim().toLowerCase());
    return classes.filter(c => assignedClassIds.includes(c.MaLop.toString().trim().toLowerCase()));
  }, [classes, assignments, state.currentUser, state.currentRole, state.selectedYear]);

  const mySubjectsInClass = useMemo(() => {
    if (!state.currentUser || (state.currentUser as any).MaHS) return [];
    const teacherID = (state.currentUser as Teacher).MaGV;
    return assignments
      .filter(a => 
        a.MaGV === teacherID && 
        a.MaLop.toString().trim().toLowerCase() === state.selectedClass.toString().trim().toLowerCase() && 
        a.MaNienHoc === state.selectedYear &&
        a.LoaiPhanCong === state.currentRole
      )
      .map(a => a.MaMonHoc || 'SHL');
  }, [assignments, state.currentUser, state.selectedClass, state.selectedYear, state.currentRole]);

  const handleLogin = (role: Role, id: string, pass: string) => {
    if (role === Role.STUDENT) {
      const s = students.find(x => x.MaHS === id);
      if (s && (s.MatKhau || '123456') === pass) {
        setState(p => ({ ...p, currentUser: s, currentRole: Role.STUDENT, selectedClass: s.MaLopHienTai, selectedYear: s.MaNienHoc }));
        setIsLoggedIn(true);
      } else alert("Sai thông tin đăng nhập học sinh!");
    } else {
      const t = teachers.find(x => x.MaGV === id);
      if (t && (t.MatKhau || '123456') === pass) {
        const myAs = assignments.filter(a => a.MaGV === id);
        if (myAs.length === 0) {
          alert("Giáo viên chưa được phân công lớp nào!");
          return;
        }
        const initialRole = myAs.some(a => a.LoaiPhanCong === Role.CHU_NHIEM) ? Role.CHU_NHIEM : Role.GIANG_DAY;
        setState(p => ({ ...p, currentUser: t, currentRole: initialRole, selectedClass: myAs[0]?.MaLop || '', selectedYear: myAs[0]?.MaNienHoc || state.selectedYear }));
        setIsLoggedIn(true);
      } else alert("Sai thông tin đăng nhập giáo viên!");
    }
  };

  const handleSendMessage = async (content: string, attachment?: string) => {
    if (!state.currentUser || !state.selectedClass) return;
    const user = state.currentUser as any;
    const newMessage = {
      MaLop: state.selectedClass,
      MaNienHoc: state.selectedYear,
      senderId: user.MaGV || user.MaHS,
      senderName: user.Hoten,
      senderRole: state.currentRole,
      content: content,
      attachment: attachment || null
    };
    const { error } = await supabase.from('messages').insert([newMessage]);
    if (error) alert("Lỗi gửi tin nhắn: " + error.message);
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>;
  if (!isLoggedIn) return <Login onLogin={handleLogin} teachers={teachers} students={students} />;

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden text-[13px] font-normal text-slate-600">
      <aside className="w-60 bg-white border-r border-slate-200 flex flex-col shrink-0 shadow-sm relative z-20">
        <div className="p-5 flex items-center gap-2.5 border-b border-slate-50">
          <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg"><GraduationCap size={18} /></div>
          <h1 className="font-bold text-base text-slate-800 tracking-tight">EduManager</h1>
        </div>
        <div className="p-4">
           <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[9px] font-bold uppercase text-slate-400 mb-2 px-1 tracking-widest text-center">Chế độ làm việc</p>
              <div className="flex p-1 bg-white rounded-xl border border-slate-100">
                <button 
                  onClick={() => setState(p => ({...p, currentRole: Role.CHU_NHIEM}))}
                  className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold uppercase ${state.currentRole === Role.CHU_NHIEM ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                >CN</button>
                <button 
                  onClick={() => setState(p => ({...p, currentRole: Role.GIANG_DAY}))}
                  className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold uppercase ${state.currentRole === Role.GIANG_DAY ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                >GD</button>
              </div>
           </div>
        </div>
        <nav className="flex-1 px-3 space-y-1 pt-2 overflow-y-auto custom-scrollbar">
          {[
            { id: 'dashboard', label: 'Bàn làm việc', icon: LayoutDashboard },
            { id: 'plans', label: 'Kế hoạch tuần', icon: Calendar },
            { id: 'students', label: 'Học sinh & SYLL', icon: Users },
            { id: 'grades', label: 'Bảng điểm môn', icon: GraduationCap },
            { id: 'tasks', label: 'Giao bài tập', icon: Send },
            { id: 'discipline', label: 'Kỷ luật', icon: ShieldAlert },
            { id: 'logs', label: 'Nhật ký', icon: ClipboardList },
          ].map((item: any) => (
            <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold transition-all ${activeTab === item.id ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}>
              <item.icon size={16} /> <span className="flex-1 text-left">{item.label}</span>
            </button>
          ))}
          <button onClick={() => setActiveTab('system')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl font-bold mt-4 ${activeTab === 'system' ? 'bg-slate-900 text-white' : 'text-slate-500'}`}>
            <Settings size={16} /> <span>Cấu hình hệ thống</span>
          </button>
        </nav>
        <div className="p-4 mt-auto border-t border-slate-50">
          <button onClick={() => setIsLoggedIn(false)} className="w-full flex items-center gap-3 px-3 py-2 text-rose-500 font-bold hover:bg-rose-50 rounded-xl transition-all"><LogOut size={16}/> Đăng xuất</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden">
        <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase">Lớp:</span>
              <select value={state.selectedClass} onChange={(e) => setState(p => ({...p, selectedClass: e.target.value}))} className="font-bold border-none outline-none bg-slate-50 px-2 py-1 rounded-lg text-slate-700">
                {filteredClasses.map(c => <option key={c.MaLop} value={c.MaLop}>{c.TenLop}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase">Môn:</span>
              <select value={state.selectedSubject || ''} onChange={(e) => setState(p => ({...p, selectedSubject: e.target.value}))} className="font-black border-none outline-none px-2 py-1 rounded-lg bg-indigo-50 text-indigo-600">
                {state.currentRole === Role.CHU_NHIEM && <option value="SHL">S.Hoạt lớp</option>}
                {mySubjectsInClass.filter(s => s !== 'SHL').map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3 px-3 py-1 rounded-xl bg-slate-50 border border-slate-200">
             <div className="text-right">
                <p className="text-[11px] font-bold text-slate-800">{(state.currentUser as Teacher)?.Hoten}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase">{state.currentRole === Role.CHU_NHIEM ? 'GV Chủ nhiệm' : 'GV Giảng dạy'}</p>
             </div>
             <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black">{(state.currentUser as Teacher)?.Hoten?.charAt(0)}</div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30 custom-scrollbar">
          {activeTab === 'dashboard' && <Dashboard state={state} students={currentClassStudents} grades={grades} disciplines={disciplines} plans={plans} messages={messages.filter(m => m.MaLop === state.selectedClass)} onSendMessage={handleSendMessage} />}
          {activeTab === 'students' && <StudentList state={state} students={currentClassStudents} grades={grades} disciplines={disciplines} logs={logs} violationRules={violationRules} onUpdateStudent={(s) => supabase.from('students').upsert(s).then(() => fetchData())} onDeleteStudent={(id) => supabase.from('students').delete().eq('MaHS', id).then(() => fetchData())} />}
          {activeTab === 'grades' && <GradeBoard state={state} students={currentClassStudents} grades={grades} onUpdateGrades={() => fetchData()} />}
          {activeTab === 'tasks' && <TaskManager state={state} students={currentClassStudents} tasks={tasks} onUpdateTasks={(newTasks) => supabase.from('tasks').upsert(newTasks).then(() => fetchData())} onDeleteTask={(id) => supabase.from('tasks').delete().eq('MaNhiemVu', id).then(() => fetchData())} />}
          {activeTab === 'discipline' && <DisciplineManager state={state} students={currentClassStudents} disciplines={disciplines} violationRules={violationRules} onUpdateDisciplines={(d) => supabase.from('disciplines').upsert(d).then(() => fetchData())} onDeleteDiscipline={(id) => supabase.from('discipline').delete().eq('MaKyLuat', id).then(() => fetchData())} onUpdateRules={(r) => supabase.from('violation_rules').upsert(r).then(() => fetchData())} />}
          {activeTab === 'logs' && currentAssignment && <LearningLogs state={state} students={currentClassStudents} logs={logs} assignment={currentAssignment} onUpdateLogs={(l) => supabase.from('learning_logs').upsert(l).then(() => fetchData())} onDeleteLog={(id) => supabase.from('learning_logs').delete().eq('MaTheoDoi', id).then(() => fetchData())} />}
          {activeTab === 'system' && <SystemManager years={years} classes={classes} teachers={teachers} assignments={assignments} onUpdate={() => fetchData()} students={students} />}
          {activeTab === 'plans' && <SchoolPlans state={state} plans={plans} classes={classes} onUpdatePlan={(p) => supabase.from('school_plans').upsert(p).then(() => fetchData())} onDeletePlan={(id) => supabase.from('school_plans').delete().eq('MaKeHoach', id).then(() => fetchData())} />}
        </div>
      </main>
    </div>
  );
};

export default App;
