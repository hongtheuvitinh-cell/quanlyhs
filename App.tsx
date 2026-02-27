
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, GraduationCap, ClipboardList, ShieldAlert, LayoutDashboard, LogOut,
  Send, Plus, Loader2, BookOpen, UserCheck, Settings, Database, ChevronRight, Lock, Shield, X, Save, Calendar, Book, Monitor, Clock
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
import StudentPortal from './components/StudentPortal';
import TeacherList from './components/TeacherList';
import ClassSeating from './components/ClassSeating';
import Timetable from './components/Timetable';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'students' | 'grades' | 'discipline' | 'logs' | 'tasks' | 'system' | 'plans' | 'teachers' | 'seating' | 'timetable'>('dashboard');
  
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [violationRules, setViolationRules] = useState<ViolationRule[]>([]);
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
        { data: stData }, { data: rlData }, { data: plData }, { data: msData },
        { data: tkData }
      ] = await Promise.all([
        supabase.from('academic_years').select('*').order('MaNienHoc', { ascending: false }),
        supabase.from('classes').select('*').order('MaLop', { ascending: true }),
        supabase.from('teachers').select('*').order('Hoten', { ascending: true }),
        supabase.from('assignments').select('*'),
        supabase.from('students').select('*').limit(5000), 
        supabase.from('violation_rules').select('*'),
        supabase.from('school_plans').select('*'),
        supabase.from('messages').select('*').order('created_at', { ascending: true }).limit(500),
        supabase.from('tasks').select('*').limit(500)
      ]);

      const fetchedYears = yrData || [];
      const fetchedTeachers = tcData || [];
      const fetchedStudents = stData || [];
      const fetchedAssignments = asData || [];
      const fetchedClasses = clData || [];

      setYears(fetchedYears);
      setClasses(fetchedClasses);
      setTeachers(fetchedTeachers);
      setAssignments(fetchedAssignments);
      setStudents(fetchedStudents);
      setViolationRules(rlData || []);
      setPlans(plData || []);
      setTasks(tkData || []);
      setMessages(Array.isArray(msData) ? msData : []);

      let defaultYear = fetchedYears.length ? fetchedYears[0].MaNienHoc : 0;
      
      const savedSession = localStorage.getItem('edu_session');
      if (savedSession) {
        const { role, id } = JSON.parse(savedSession);
        if (role === Role.STUDENT) {
          const s = fetchedStudents.find(x => x.MaHS === id);
          if (s) {
            setState({
              currentUser: s,
              currentRole: Role.STUDENT,
              selectedClass: s.MaLopHienTai,
              selectedYear: s.MaNienHoc,
              selectedSubject: null
            });
            setIsLoggedIn(true);
          }
        } else {
          const t = fetchedTeachers.find(x => x.MaGV === id);
          if (t) {
            const myAs = fetchedAssignments.filter(a => a.MaGV === id);
            const initialRole = t.quanly ? Role.CHU_NHIEM : (myAs.some(a => a.LoaiPhanCong === Role.CHU_NHIEM) ? Role.CHU_NHIEM : Role.GIANG_DAY);
            const initialClass = t.quanly ? (fetchedClasses[0]?.MaLop || '') : (myAs.find(a => a.LoaiPhanCong === initialRole)?.MaLop || myAs[0]?.MaLop || '');
            const initialYear = myAs[0]?.MaNienHoc || defaultYear;

            setState({
              currentUser: t,
              currentRole: initialRole,
              selectedClass: initialClass,
              selectedYear: initialYear,
              selectedSubject: t.MaMonChinh || null
            });
            setIsLoggedIn(true);
          }
        }
      } else if (fetchedYears.length && state.selectedYear === 0) {
        setState(p => ({ ...p, selectedYear: defaultYear }));
      }
    } catch (err) {
      console.error("Lỗi đồng bộ:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredClasses = useMemo(() => {
    if (!state.currentUser || (state.currentUser as any).MaHS) return [];
    const teacher = state.currentUser as Teacher;
    if (teacher.quanly) return classes || [];
    const teacherID = teacher.MaGV;
    const myAs = (assignments || []).filter(a => a.MaGV === teacherID && a.MaNienHoc === state.selectedYear);
    const validClassIds = myAs.filter(a => a.LoaiPhanCong === state.currentRole).map(a => a.MaLop);
    return (classes || []).filter(c => validClassIds.includes(c.MaLop));
  }, [classes, assignments, state.currentUser, state.currentRole, state.selectedYear]);

  useEffect(() => {
    if (filteredClasses.length > 0) {
      if (!state.selectedClass || !filteredClasses.some(c => c.MaLop === state.selectedClass)) {
        setState(p => ({ ...p, selectedClass: filteredClasses[0].MaLop }));
      }
    }
  }, [filteredClasses]);

  const currentClassStudents = useMemo(() => {
    if (!state.selectedClass || !students) return [];
    return students.filter(s => s.MaLopHienTai === state.selectedClass && s.MaNienHoc === state.selectedYear);
  }, [students, state.selectedClass, state.selectedYear]);

  const handleLogin = (role: Role, id: string, pass: string) => {
    if (role === Role.STUDENT) {
      const s = students.find(x => x.MaHS === id);
      if (s && (s.MatKhau || '123456') === pass) {
        localStorage.setItem('edu_session', JSON.stringify({ role, id }));
        setState(p => ({ ...p, currentUser: s, currentRole: Role.STUDENT, selectedClass: s.MaLopHienTai, selectedYear: s.MaNienHoc }));
        setIsLoggedIn(true);
      } else alert("Sai thông tin!");
    } else {
      const t = teachers.find(x => x.MaGV === id);
      if (t && (t.MatKhau || '123456') === pass) {
        localStorage.setItem('edu_session', JSON.stringify({ role, id }));
        if (t.quanly) {
          setState(p => ({ ...p, currentUser: t, currentRole: Role.CHU_NHIEM, selectedClass: classes[0]?.MaLop || '', selectedYear: years[0]?.MaNienHoc || state.selectedYear }));
          setIsLoggedIn(true);
          return;
        }
        const myAs = assignments.filter(a => a.MaGV === id);
        if (myAs.length === 0) { alert("Chưa có phân công!"); return; }
        const initialRole = myAs.some(a => a.LoaiPhanCong === Role.CHU_NHIEM) ? Role.CHU_NHIEM : Role.GIANG_DAY;
        setState(p => ({ ...p, currentUser: t, currentRole: initialRole, selectedClass: myAs.find(a => a.LoaiPhanCong === initialRole)?.MaLop || myAs[0].MaLop, selectedYear: myAs[0].MaNienHoc || state.selectedYear }));
        setIsLoggedIn(true);
      } else alert("Sai thông tin!");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('edu_session');
    setIsLoggedIn(false);
    setState(p => ({ ...p, currentUser: null }));
  };

  const handleSendMessage = async (content: string, attachment?: string) => {
    if (!state.currentUser || !state.selectedClass) return;
    const user = state.currentUser as any;
    const newMessage = { MaLop: state.selectedClass, MaNienHoc: state.selectedYear, senderId: user.MaGV || user.MaHS, senderName: user.Hoten, senderRole: state.currentRole, content: content, attachment: attachment };
    await supabase.from('messages').insert([newMessage]);
    fetchData();
  };

  const handleToggleTask = async (taskId: number, link?: string) => {
    if (state.currentRole !== Role.STUDENT || !state.currentUser) return;
    const studentId = (state.currentUser as Student).MaHS;
    const task = tasks.find(t => t.MaNhiemVu === taskId);
    if (!task) return;
    let newDone = [...(task.DanhSachHoanThanh || [])];
    let newReports = { ...(task.BaoCaoNhiemVu || {}) };
    if (!newDone.includes(studentId)) newDone.push(studentId);
    if (link) newReports[studentId] = link;
    await supabase.from('tasks').update({ DanhSachHoanThanh: newDone, BaoCaoNhiemVu: newReports }).eq('MaNhiemVu', taskId);
    fetchData();
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>;
  if (!isLoggedIn) return <Login onLogin={handleLogin} teachers={teachers} students={students} />;

  if (state.currentRole === Role.STUDENT) {
    const studentUser = state.currentUser as Student;
    return (
      <StudentPortal 
        student={studentUser} 
        violationRules={violationRules} 
        tasks={(tasks || []).filter(t => t.MaLop === studentUser.MaLopHienTai && t.DanhSachGiao?.includes(studentUser.MaHS))} 
        plans={plans} 
        messages={(messages || []).filter(m => m.MaLop === studentUser.MaLopHienTai)} 
        onSendMessage={handleSendMessage} 
        onLogout={handleLogout} 
        onToggleTask={handleToggleTask} 
        onUpdateProfile={fetchData} 
      />
    );
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden text-[13px] font-normal text-slate-600">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 shadow-sm relative z-20">
        <div className="p-6 flex items-center gap-3 border-b border-slate-50">
          <div className="bg-indigo-600 p-2.5 rounded-2xl text-white shadow-lg"><GraduationCap size={20} /></div>
          <h1 className="font-black text-lg text-slate-800 tracking-tight uppercase italic">EduManager</h1>
        </div>
        <nav className="flex-1 px-4 space-y-1.5 pt-6 overflow-y-auto custom-scrollbar">
          <div className="mb-6 px-4 py-3 bg-slate-50 rounded-2xl border border-slate-100">
             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Chế độ làm việc</p>
             <div className="flex p-1 bg-white border rounded-xl shadow-sm">
                <button onClick={() => setState(p => ({...p, currentRole: Role.CHU_NHIEM}))} className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${state.currentRole === Role.CHU_NHIEM ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Chủ nhiệm</button>
                <button onClick={() => setState(p => ({...p, currentRole: Role.GIANG_DAY}))} className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${state.currentRole === Role.GIANG_DAY ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Giảng dạy</button>
             </div>
          </div>
          {[
            { id: 'dashboard', label: 'Bàn làm việc', icon: LayoutDashboard },
            { id: 'seating', label: 'Sơ đồ lớp', icon: Monitor },
            { id: 'timetable', label: 'Thời khóa biểu', icon: Clock },
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
          {(state.currentUser as Teacher)?.quanly && (
            <button onClick={() => setActiveTab('teachers')} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest mt-6 text-slate-400 hover:bg-slate-50 transition-all"><Shield size={18} /> DS Giáo Viên</button>
          )}
          <button onClick={() => setActiveTab('system')} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest mt-1 text-slate-400 hover:bg-slate-50 transition-all"><Settings size={18} /> Cấu hình</button>
        </nav>
        <div className="p-6 border-t border-slate-50 mt-auto">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-rose-500 font-black uppercase text-[10px] tracking-widest hover:bg-rose-50 rounded-2xl transition-all"><LogOut size={18}/> Đăng xuất</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Lớp học:</span>
              <select value={state.selectedClass} onChange={(e) => setState(p => ({...p, selectedClass: e.target.value}))} className="font-black text-slate-800 border-none outline-none bg-slate-50 px-3 py-1.5 rounded-xl text-xs shadow-inner cursor-pointer">
                {filteredClasses.map(c => <option key={c.MaLop} value={c.MaLop}>{c.TenLop}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Niên học:</span>
              <select value={state.selectedYear} onChange={(e) => setState(p => ({...p, selectedYear: parseInt(e.target.value)}))} className="font-black text-indigo-600 border-none outline-none bg-indigo-50 px-3 py-1.5 rounded-xl text-xs shadow-inner cursor-pointer">
                {years.map(y => <option key={y.MaNienHoc} value={y.MaNienHoc}>{y.TenNienHoc}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="text-right"><p className="text-[11px] font-black text-slate-800 uppercase">{(state.currentUser as Teacher)?.Hoten}</p></div>
             <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black shadow-lg">{(state.currentUser as Teacher)?.Hoten?.charAt(0)}</div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 bg-[#F8FAFC] custom-scrollbar">
          {activeTab === 'dashboard' && <Dashboard state={state} students={currentClassStudents} plans={plans} messages={messages.filter(m => m.MaLop === state.selectedClass)} onSendMessage={handleSendMessage} onTabChange={setActiveTab} />}
          {activeTab === 'students' && <StudentList state={state} students={currentClassStudents} violationRules={violationRules} onUpdateStudent={async (s) => { await supabase.from('students').upsert(s); await fetchData(); }} onDeleteStudent={async (id) => { await supabase.from('students').delete().eq('MaHS', id); await fetchData(); }} />}
          {activeTab === 'grades' && <GradeBoard state={state} students={currentClassStudents} assignments={assignments} />}
          {activeTab === 'tasks' && <TaskManager state={state} students={currentClassStudents} tasks={tasks} onUpdateTasks={async (t) => { await supabase.from('tasks').upsert(t); await fetchData(); }} onDeleteTask={async (id) => { await supabase.from('tasks').delete().eq('MaNhiemVu', id); await fetchData(); }} />}
          {activeTab === 'discipline' && <DisciplineManager state={state} students={currentClassStudents} allStudents={students} violationRules={violationRules} assignments={assignments} onUpdateRules={async (r) => { await supabase.from('violation_rules').upsert(r); await fetchData(); }} />}
          {activeTab === 'logs' && <LearningLogs state={state} students={currentClassStudents} assignments={assignments} />}
          {activeTab === 'system' && <SystemManager years={years} classes={classes} teachers={teachers} assignments={assignments} onUpdate={fetchData} students={students} />}
          {activeTab === 'plans' && <SchoolPlans state={state} plans={plans} classes={classes} onUpdatePlan={async (p) => { await supabase.from('school_plans').upsert(p); await fetchData(); }} onDeletePlan={async (id) => { await supabase.from('school_plans').delete().eq('MaKeHoach', id); await fetchData(); }} />}
          {activeTab === 'teachers' && <TeacherList teachers={teachers} onUpdate={fetchData} />}
          {activeTab === 'seating' && <ClassSeating state={state} students={currentClassStudents} className={classes.find(c => c.MaLop === state.selectedClass)?.TenLop} />}
          {activeTab === 'timetable' && <Timetable state={state} />}
        </div>
      </main>
    </div>
  );
};

export default App;
