
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, GraduationCap, ClipboardList, ShieldAlert, LayoutDashboard, LogOut,
  Send, Plus, Loader2, BookOpen, UserCheck
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';
import { Role, AppState, Student, Grade, Assignment, LearningLog, Discipline, AcademicYear, Class, ViolationRule, AssignmentTask, Teacher } from './types';
import StudentList from './components/StudentList';
import GradeBoard from './components/GradeBoard';
import Dashboard from './components/Dashboard';
import DisciplineManager from './components/DisciplineManager';
import LearningLogs from './components/LearningLogs';
import TaskManager from './components/TaskManager';
import Login from './components/Login';
import StudentPortal from './components/StudentPortal';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'students' | 'grades' | 'discipline' | 'logs' | 'tasks'>('dashboard');
  
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
  
  const [state, setState] = useState<AppState>({
    currentUser: null,
    currentRole: Role.CHU_NHIEM,
    selectedClass: '',
    selectedYear: 0,
    selectedSubject: null
  });

  const handleSupabaseError = (error: any, actionName: string) => {
    console.error(`Lỗi ${actionName}:`, error);
    alert(`❌ LỖI HỆ THỐNG: ${actionName}\n\nMã: ${error.code}\n${error.message}`);
  };

  const fetchData = async () => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }
    try {
      const [
        { data: yrData }, { data: clData }, { data: tcData }, { data: asData },
        { data: stData }, { data: grData }, { data: dsData }, { data: lgData },
        { data: tkData }, { data: rlData }
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
        supabase.from('violation_rules').select('*')
      ]);

      if (yrData) setYears(yrData);
      if (clData) setClasses(clData);
      if (tcData) setTeachers(tcData);
      if (asData) setAssignments(asData);
      if (stData) setStudents(stData);
      if (grData) setGrades(grData);
      if (dsData) setDisciplines(dsData);
      if (lgData) setLogs(lgData);
      if (tkData) setTasks(tkData);
      if (rlData) setViolationRules(rlData);

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

  const filteredClasses = useMemo(() => {
    if (!state.currentUser || (state.currentUser as any).MaHS) return [];
    const teacherID = (state.currentUser as Teacher).MaGV;
    const myAssignments = assignments.filter(a => a.MaGV === teacherID && a.MaNienHoc === state.selectedYear);
    const assignedClassIds = myAssignments
      .filter(a => a.LoaiPhanCong === state.currentRole)
      .map(a => a.MaLop);
    return classes.filter(c => assignedClassIds.includes(c.MaLop));
  }, [classes, assignments, state.currentUser, state.currentRole, state.selectedYear]);

  useEffect(() => {
    if (filteredClasses.length > 0 && (!state.selectedClass || !filteredClasses.some(c => c.MaLop === state.selectedClass))) {
      setState(p => ({ ...p, selectedClass: filteredClasses[0].MaLop }));
    }
  }, [filteredClasses, state.selectedClass]);

  const currentAssignment = useMemo(() => {
    if (!state.currentUser || (state.currentUser as any).MaHS) return null;
    const teacherID = (state.currentUser as Teacher).MaGV;
    return assignments.find(a => 
      a.MaGV === teacherID && a.MaLop === state.selectedClass && a.MaNienHoc === state.selectedYear &&
      a.LoaiPhanCong === state.currentRole
    );
  }, [assignments, state.currentUser, state.selectedClass, state.selectedYear, state.currentRole]);

  const handleUpdateDisciplines = async (newDisciplines: Discipline[]) => {
    if (!isSupabaseConfigured) return;
    try {
      const { error } = await supabase.from('disciplines').upsert(newDisciplines);
      if (error) throw error;
      await fetchData();
    } catch (err: any) { handleSupabaseError(err, "Cập nhật kỷ luật"); }
  };

  const handleDeleteDiscipline = async (id: number) => {
    if (!isSupabaseConfigured) return;
    try {
      const { error } = await supabase.from('disciplines').delete().eq('MaKyLuat', id);
      if (error) throw error;
      await fetchData();
    } catch (err: any) { handleSupabaseError(err, "Xóa kỷ luật"); }
  };

  const handleUpdateGrades = async (newGrades: Grade[]) => {
    if (newGrades.length === 0 || !isSupabaseConfigured) return;
    try {
      const { MaMonHoc, MaNienHoc, HocKy } = newGrades[0];
      const studentIds = newGrades.map(g => g.MaHS);
      await supabase.from('grades').delete().eq('MaMonHoc', MaMonHoc).eq('MaNienHoc', MaNienHoc).eq('HocKy', HocKy).in('MaHS', studentIds);
      const gradesToInsert = newGrades.map((g, index) => ({
        ...g, MaDiem: Math.floor(Date.now() / 1000) + index + Math.floor(Math.random() * 1000)
      }));
      const { error } = await supabase.from('grades').insert(gradesToInsert);
      if (error) throw error;
      await fetchData(); 
    } catch (error: any) { handleSupabaseError(error, "Cập nhật điểm số"); }
  };

  const handleUpdateTasks = async (newTasks: AssignmentTask[]) => {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.from('tasks').upsert(newTasks);
    if (error) handleSupabaseError(error, "Giao nhiệm vụ"); else await fetchData();
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.from('tasks').delete().eq('MaNhiemVu', taskId);
    if (error) handleSupabaseError(error, "Xóa nhiệm vụ"); else await fetchData();
  };

  const handleUpdateViolationRules = async (newRules: ViolationRule[]) => {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.from('violation_rules').upsert(newRules);
    if (error) handleSupabaseError(error, "Quy tắc vi phạm"); else await fetchData();
  };

  const handleLogin = (role: Role, id: string, pass: string) => {
    if (role === Role.STUDENT) {
      const s = students.find(x => x.MaHS === id);
      if (s && (s.MatKhau || '123456') === pass) {
        setState(p => ({ ...p, currentUser: s, currentRole: Role.STUDENT, selectedClass: s.MaLopHienTai }));
        setIsLoggedIn(true);
      } else alert("Sai thông tin!");
    } else {
      const t = teachers.find(x => x.MaGV === id);
      if (t && (t.MatKhau || '123456') === pass) {
        const myAs = assignments.filter(a => a.MaGV === id);
        const cnAs = myAs.find(a => a.LoaiPhanCong === Role.CHU_NHIEM);
        const initialRole = cnAs ? Role.CHU_NHIEM : Role.GIANG_DAY;
        const initialClass = cnAs ? cnAs.MaLop : (myAs[0]?.MaLop || '');
        setState(p => ({ ...p, currentUser: t, currentRole: initialRole, selectedClass: initialClass }));
        setIsLoggedIn(true);
      } else alert("Sai thông tin!");
    }
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-slate-900"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>;
  if (!isLoggedIn) return <Login onLogin={handleLogin} teachers={teachers} students={students} />;

  if (state.currentRole === Role.STUDENT) return <StudentPortal student={state.currentUser as Student} grades={grades} disciplines={disciplines} tasks={tasks} onLogout={() => setIsLoggedIn(false)} onToggleTask={async () => {}} />;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden text-sm font-normal">
      <aside className="w-60 bg-slate-900 text-slate-400 border-r border-slate-800 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-800 flex items-center gap-3">
          <div className="bg-indigo-600 p-1 rounded-lg text-white shadow-lg"><GraduationCap size={18} /></div>
          <h1 className="font-bold text-base text-white tracking-tight">EduManager</h1>
        </div>
        
        <div className="p-3">
           <div className="p-2.5 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <p className="text-[9px] font-black uppercase text-slate-500 mb-2 px-1">Vai trò công việc</p>
              <div className="flex p-0.5 bg-slate-900 rounded-lg">
                <button 
                  onClick={() => setState(p => ({...p, currentRole: Role.CHU_NHIEM}))}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[9px] font-black uppercase transition-all ${state.currentRole === Role.CHU_NHIEM ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <UserCheck size={11}/> Chủ nhiệm
                </button>
                <button 
                  onClick={() => setState(p => ({...p, currentRole: Role.GIANG_DAY}))}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[9px] font-black uppercase transition-all ${state.currentRole === Role.GIANG_DAY ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <BookOpen size={11}/> Giảng dạy
                </button>
              </div>
           </div>
        </div>

        <nav className="flex-1 px-2 space-y-0.5 pt-2">
          {[
            { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
            { id: 'students', label: 'Học sinh', icon: Users },
            { id: 'grades', label: 'Bảng điểm', icon: GraduationCap },
            { id: 'tasks', label: 'Nhiệm vụ', icon: Send },
            { id: 'discipline', label: 'Kỷ luật', icon: ShieldAlert },
            { id: 'logs', label: 'Nhật ký', icon: ClipboardList },
          ].map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-bold text-xs transition-all ${activeTab === item.id ? 'bg-indigo-600/10 text-indigo-400 border-l-2 border-indigo-500' : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'}`}>
              <item.icon size={16} /> {item.label}
            </button>
          ))}
        </nav>
        
        <div className="p-3">
          <button onClick={() => setIsLoggedIn(false)} className="w-full flex items-center gap-3 px-3 py-2 text-rose-500 text-xs font-bold hover:bg-rose-500/10 rounded-lg transition-all"><LogOut size={16}/> Đăng xuất</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-12 bg-white border-b border-gray-200 px-6 flex items-center justify-between shrink-0 shadow-sm relative z-10">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Năm học:</span>
              <select value={state.selectedYear} onChange={e => setState(p => ({...p, selectedYear: parseInt(e.target.value)}))} className="font-bold border-none outline-none bg-transparent py-1 text-xs">{years.map(y => <option key={y.MaNienHoc} value={y.MaNienHoc}>{y.TenNienHoc}</option>)}</select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Lớp:</span>
              <select value={state.selectedClass} onChange={e => setState(p => ({...p, selectedClass: e.target.value}))} className="font-bold border-none outline-none bg-transparent py-1 text-xs">{filteredClasses.map(c => <option key={c.MaLop} value={c.MaLop}>{c.TenLop}</option>)}</select>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[8px] font-black uppercase tracking-tighter border border-emerald-100 flex items-center gap-1">
               <div className="w-1 h-1 rounded-full bg-emerald-500"></div> Cloud
             </div>
             <div className="text-xs font-bold text-gray-700">{(state.currentUser as Teacher)?.Hoten}</div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-gray-50/50">
          {activeTab === 'dashboard' && <Dashboard state={state} students={students.filter(s => s.MaLopHienTai === state.selectedClass)} grades={grades} disciplines={disciplines} />}
          {activeTab === 'discipline' && (
            <DisciplineManager 
              state={state} 
              students={students.filter(s => s.MaLopHienTai === state.selectedClass)} 
              disciplines={disciplines.filter(d => students.filter(s => s.MaLopHienTai === state.selectedClass).some(s => s.MaHS === d.MaHS))} 
              violationRules={violationRules} 
              onUpdateDisciplines={handleUpdateDisciplines} 
              onDeleteDiscipline={handleDeleteDiscipline}
              onUpdateRules={handleUpdateViolationRules} 
            />
          )}
          {activeTab === 'students' && <StudentList state={state} students={students.filter(s => s.MaLopHienTai === state.selectedClass)} grades={grades} logs={logs} disciplines={disciplines} onAddStudent={s => supabase.from('students').insert([s]).then(fetchData)} onAddStudents={s => supabase.from('students').insert(s).then(fetchData)} onUpdateStudent={s => supabase.from('students').update(s).eq('MaHS', s.MaHS).then(fetchData)} onDeleteStudent={id => supabase.from('students').delete().eq('MaHS', id).then(fetchData)} />}
          {activeTab === 'grades' && <GradeBoard state={state} students={students.filter(s => s.MaLopHienTai === state.selectedClass)} grades={grades} onUpdateGrades={handleUpdateGrades} />}
          {activeTab === 'tasks' && <TaskManager state={state} students={students.filter(s => s.MaLopHienTai === state.selectedClass)} tasks={tasks} onUpdateTasks={handleUpdateTasks} onDeleteTask={handleDeleteTask} />}
          {activeTab === 'logs' && <LearningLogs state={state} students={students.filter(s => s.MaLopHienTai === state.selectedClass)} logs={logs} assignment={currentAssignment!} onUpdateLogs={l => supabase.from('learning_logs').insert(l).then(fetchData)} />}
        </div>
      </main>
    </div>
  );
};

export default App;
