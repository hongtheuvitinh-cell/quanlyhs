
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, 
  GraduationCap, 
  ClipboardList, 
  ShieldAlert, 
  LayoutDashboard, 
  LogOut,
  ChevronRight,
  Send,
  Settings,
  Plus,
  X,
  Database,
  Loader2,
  CloudOff,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Save
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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
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

  const [newYearName, setNewYearName] = useState('');

  const currentUserData = state.currentUser as any;

  const handleSupabaseError = (error: any, actionName: string) => {
    console.error(`Lỗi ${actionName}:`, error);
    let message = `❌ LỖI HỆ THỐNG: ${actionName}\n\n`;
    if (error.code === '42P01') message += "Bảng không tồn tại.";
    else if (error.code === '23503') message += "Lỗi khóa ngoại: Không thể xóa vì có dữ liệu liên quan.";
    else message += `Mã: ${error.code}\n${error.message}`;
    alert(message);
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

      if (yrData && yrData.length > 0 && state.selectedYear === 0) {
        setState((p: AppState) => ({ ...p, selectedYear: yrData[0].MaNienHoc }));
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
    const myAssignments = assignments.filter((a: Assignment) => a.MaGV === teacherID && a.MaNienHoc === state.selectedYear);
    
    if (state.currentRole === Role.CHU_NHIEM) {
      const homeroomClasses = myAssignments.filter((a: Assignment) => a.LoaiPhanCong === Role.CHU_NHIEM).map((a: Assignment) => a.MaLop);
      return classes.filter((c: Class) => homeroomClasses.includes(c.MaLop));
    } else {
      const subjectClasses = myAssignments.filter((a: Assignment) => a.LoaiPhanCong === Role.GIANG_DAY).map((a: Assignment) => a.MaLop);
      return classes.filter((c: Class) => subjectClasses.includes(c.MaLop));
    }
  }, [classes, assignments, state.currentUser, state.currentRole, state.selectedYear]);

  const currentAssignment = useMemo(() => {
    if (!state.currentUser || (state.currentUser as any).MaHS) return null;
    const teacherID = (state.currentUser as Teacher).MaGV;
    return assignments.find((a: Assignment) => 
      a.MaGV === teacherID && a.MaLop === state.selectedClass && a.MaNienHoc === state.selectedYear &&
      (state.currentRole === Role.CHU_NHIEM ? a.LoaiPhanCong === Role.CHU_NHIEM : a.LoaiPhanCong === Role.GIANG_DAY)
    );
  }, [assignments, state.currentUser, state.selectedClass, state.selectedYear, state.currentRole]);

  const handleUpdateDisciplines = async (newDisciplines: Discipline[]) => {
    if (!isSupabaseConfigured) return;
    try {
      // Dùng upsert để hỗ trợ cả Thêm mới và Sửa
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
        ...g, MaDiem: Math.floor(Date.now() / 1000) + index + Math.floor(Math.random() * 1000000)
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
        setState(p => ({ ...p, currentUser: t, currentRole: cnAs ? Role.CHU_NHIEM : Role.GIANG_DAY, selectedClass: cnAs?.MaLop || myAs[0]?.MaLop || '' }));
        setIsLoggedIn(true);
      } else alert("Sai thông tin!");
    }
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={48} /></div>;
  if (!isLoggedIn) return <Login onLogin={handleLogin} teachers={teachers} students={students} />;

  if (state.currentRole === Role.STUDENT) return <StudentPortal student={state.currentUser as Student} grades={grades} disciplines={disciplines} tasks={tasks} onLogout={() => setIsLoggedIn(false)} onToggleTask={async (id, link) => {}} />;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      <aside className="w-72 bg-white border-r flex flex-col shrink-0">
        <div className="p-6 border-b flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg text-white"><GraduationCap size={24} /></div>
          <h1 className="font-bold text-xl">EduManager</h1>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {[
            { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
            { id: 'students', label: 'Học sinh', icon: Users },
            { id: 'grades', label: 'Bảng điểm', icon: GraduationCap },
            { id: 'tasks', label: 'Nhiệm vụ', icon: Send },
            { id: 'discipline', label: 'Kỷ luật', icon: ShieldAlert },
            { id: 'logs', label: 'Nhật ký', icon: ClipboardList },
          ].map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold ${activeTab === item.id ? 'bg-indigo-50 text-indigo-700' : 'text-gray-400 hover:bg-gray-50'}`}>
              <item.icon size={20} /> {item.label}
            </button>
          ))}
        </nav>
        <button onClick={() => setIsLoggedIn(false)} className="m-4 p-4 text-red-500 font-bold flex items-center gap-3 hover:bg-red-50 rounded-xl"><LogOut size={20}/>Thoát</button>
      </aside>
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-8">
            <select value={state.selectedYear} onChange={e => setState(p => ({...p, selectedYear: parseInt(e.target.value)}))} className="font-bold border-none outline-none">{years.map(y => <option key={y.MaNienHoc} value={y.MaNienHoc}>{y.TenNienHoc}</option>)}</select>
            <select value={state.selectedClass} onChange={e => setState(p => ({...p, selectedClass: e.target.value}))} className="font-bold border-none outline-none">{filteredClasses.map(c => <option key={c.MaLop} value={c.MaLop}>{c.TenLop}</option>)}</select>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> Cloud Online</div>
        </header>
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
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
