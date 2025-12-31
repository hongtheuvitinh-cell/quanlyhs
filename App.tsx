
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
  Loader2,
  Settings,
  Plus,
  Trash2,
  X,
  Save,
  Calendar,
  UserCheck,
  UserPlus,
  Database,
  BookOpen,
  UserRoundCheck
} from 'lucide-react';
import { supabase } from './services/supabaseClient';
import { Role, AppState, Student, Grade, Assignment, LearningLog, Discipline, AcademicYear, Class, ViolationRule, AssignmentTask, Teacher } from './types';
import StudentList from './components/StudentList';
import GradeBoard from './components/GradeBoard';
import Dashboard from './components/Dashboard';
import DisciplineManager from './components/DisciplineManager';
import LearningLogs from './components/LearningLogs';
import TaskManager from './components/TaskManager';
import Login from './components/Login';
import StudentPortal from './components/StudentPortal';

const SUBJECTS = [
  { id: 'TOAN', name: 'Toán Học' },
  { id: 'VAN', name: 'Ngữ Văn' },
  { id: 'ANH', name: 'Tiếng Anh' },
  { id: 'LY', name: 'Vật Lý' },
  { id: 'HOA', name: 'Hóa Học' },
  { id: 'SINH', name: 'Sinh Học' },
  { id: 'SU', name: 'Lịch Sử' },
  { id: 'DIA', name: 'Địa Lý' },
  { id: 'GDCD', name: 'GDCD' },
  { id: 'TIN', name: 'Tin Học' },
  { id: 'CONGNGHE', name: 'Công Nghệ' },
  { id: 'THE_DUC', name: 'Thể Dục' },
];

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'students' | 'grades' | 'discipline' | 'logs' | 'tasks'>('dashboard');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'years' | 'classes' | 'teachers' | 'assignments'>('years');
  
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
  const [newClassName, setNewClassName] = useState('');
  const [newClassID, setNewClassID] = useState('');
  const [selectedTeacherID, setSelectedTeacherID] = useState('');
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherID, setNewTeacherID] = useState('');

  const [assignGV, setAssignGV] = useState('');
  const [assignClass, setAssignClass] = useState('');
  const [assignSub, setAssignSub] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [
        { data: yrData },
        { data: clData },
        { data: tcData },
        { data: asData },
        { data: stData },
        { data: grData },
        { data: dsData },
        { data: lgData },
        { data: tkData },
        { data: rlData }
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

      if (yrData && yrData.length > 0) setYears(yrData);
      if (clData) setClasses(clData);
      if (tcData) setTeachers(tcData);
      if (asData) setAssignments(asData);
      if (stData) setStudents(stData);
      if (grData) setGrades(grData);
      if (dsData) setDisciplines(dsData);
      if (lgData) setLogs(lgData);
      if (tkData) setTasks(tkData);
      if (rlData) setViolationRules(rlData);
    } catch (err) {
      console.error("Lỗi kết nối Cloud:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Lọc lớp học dựa theo vai trò đang chọn của giáo viên
  const filteredClasses = useMemo(() => {
    if (!state.currentUser || (state.currentUser as any).MaHS) return classes;
    
    const teacherID = (state.currentUser as Teacher).MaGV;
    const myAssignments = assignments.filter(a => a.MaGV === teacherID && a.MaNienHoc === state.selectedYear);
    
    if (state.currentRole === Role.CHU_NHIEM) {
      const homeroomClasses = myAssignments.filter(a => a.LoaiPhanCong === Role.CHU_NHIEM).map(a => a.MaLop);
      return classes.filter(c => homeroomClasses.includes(c.MaLop));
    } else {
      const subjectClasses = myAssignments.filter(a => a.LoaiPhanCong === Role.GIANG_DAY).map(a => a.MaLop);
      return classes.filter(c => subjectClasses.includes(c.MaLop));
    }
  }, [classes, assignments, state.currentUser, state.currentRole, state.selectedYear]);

  // Cập nhật lớp mặc định khi danh sách lớp bị lọc thay đổi
  useEffect(() => {
    if (filteredClasses.length > 0) {
      const isCurrentInFiltered = filteredClasses.some(c => c.MaLop === state.selectedClass);
      if (!isCurrentInFiltered) {
        setState(prev => ({ ...prev, selectedClass: filteredClasses[0].MaLop }));
      }
    } else {
      setState(prev => ({ ...prev, selectedClass: '' }));
    }
  }, [filteredClasses]);

  const handleLogin = (role: Role, id: string, passwordInput: string) => {
    if (role === Role.STUDENT) {
      const student = students.find(s => s.MaHS === id);
      if (student && (student.MatKhau || '123456') === passwordInput) {
        setState(prev => ({ ...prev, currentUser: student, currentRole: Role.STUDENT, selectedClass: student.MaLopHienTai }));
        setIsLoggedIn(true);
      } else {
        alert("Thông tin đăng nhập không chính xác!");
      }
    } else {
      const teacher = teachers.find(t => t.MaGV === id);
      if (teacher && (teacher.MatKhau || '123456') === passwordInput) {
        const cnAssignment = assignments.find(a => a.MaGV === id && a.LoaiPhanCong === Role.CHU_NHIEM);
        setState(prev => ({ 
          ...prev, 
          currentUser: teacher, 
          currentRole: cnAssignment ? Role.CHU_NHIEM : Role.GIANG_DAY,
          selectedClass: cnAssignment?.MaLop || ''
        }));
        setIsLoggedIn(true);
      } else {
        alert("Thông tin đăng nhập không chính xác!");
      }
    }
  };

  const handleAddYear = async () => {
    if (!newYearName) return;
    const { data, error } = await supabase.from('academic_years').insert([{ TenNienHoc: newYearName }]).select();
    if (!error && data) {
      setYears([data[0], ...years]);
      setState(p => ({ ...p, selectedYear: data[0].MaNienHoc }));
      setNewYearName('');
    }
  };

  const handleAddTeacher = async () => {
    if (!newTeacherID || !newTeacherName) return;
    const { data, error } = await supabase.from('teachers').insert([{ 
      MaGV: newTeacherID, Hoten: newTeacherName, MaMonChinh: 'TOAN', MatKhau: '123456'
    }]).select();
    if (!error && data) {
      setTeachers([...teachers, data[0]]);
      setNewTeacherID(''); setNewTeacherName('');
    }
  };

  const handleAddClass = async () => {
    if (!newClassID || !newClassName) return;
    const { data: classData, error: classError } = await supabase.from('classes').insert([{ 
      MaLop: newClassID, TenLop: newClassName, Khoi: parseInt(newClassID) || 10 
    }]).select();
    if (!classError && classData) {
      setClasses(prev => [...prev, classData[0]]);
      if (selectedTeacherID) {
        const { data: assignData } = await supabase.from('assignments').insert([{
          MaGV: selectedTeacherID, MaLop: classData[0].MaLop, MaNienHoc: state.selectedYear, LoaiPhanCong: Role.CHU_NHIEM, MaMonHoc: null
        }]).select();
        if (assignData) setAssignments(prev => [...prev, assignData[0]]);
      }
      setNewClassID(''); setNewClassName('');
    }
  };

  const handleAddTeachingAssignment = async () => {
    if (!assignGV || !assignClass || !assignSub) return;
    const { data, error } = await supabase.from('assignments').insert([{
      MaGV: assignGV, MaLop: assignClass, MaNienHoc: state.selectedYear, LoaiPhanCong: Role.GIANG_DAY, MaMonHoc: assignSub
    }]).select();
    if (!error && data) setAssignments([...assignments, data[0]]);
  };

  if (isLoading) return <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-900 text-white"><Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" /><p className="font-black text-[10px] uppercase tracking-widest">Đang tải dữ liệu Cloud...</p></div>;

  if (!isLoggedIn) return <Login onLogin={handleLogin} teachers={teachers} students={students} />;

  if (state.currentRole === Role.STUDENT) {
    return (
      <StudentPortal 
        student={state.currentUser as Student} 
        grades={grades.filter(g => g.MaHS === (state.currentUser as Student).MaHS)}
        disciplines={disciplines.filter(d => d.MaHS === (state.currentUser as Student).MaHS)}
        tasks={tasks.filter(t => t.MaLop === (state.currentUser as Student).MaLopHienTai)}
        onLogout={() => setIsLoggedIn(false)}
        onToggleTask={async (taskId) => {
          const task = tasks.find(t => t.MaNhiemVu === taskId);
          if (task) {
            const studentId = (state.currentUser as Student).MaHS;
            const updated = {
              ...task,
              DanhSachHoanThanh: task.DanhSachHoanThanh.includes(studentId)
                ? task.DanhSachHoanThanh.filter(id => id !== studentId)
                : [...task.DanhSachHoanThanh, studentId]
            };
            setTasks(tasks.map(t => t.MaNhiemVu === taskId ? updated : t));
            await supabase.from('tasks').update(updated).eq('MaNhiemVu', taskId);
          }
        }}
      />
    );
  }

  const currentUserData = state.currentUser as Teacher;
  const currentAssignment = assignments.find(a => a.MaGV === currentUserData?.MaGV && a.MaLop === state.selectedClass);

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 overflow-hidden">
      <aside className="w-72 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="p-6 flex items-center gap-3 border-b border-gray-100 shrink-0">
          <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-lg"><GraduationCap size={24} /></div>
          <h1 className="font-bold text-xl text-gray-800 tracking-tight">EduManager Cloud</h1>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold">{currentUserData?.Hoten?.charAt(0)}</div>
              <div className="min-w-0">
                <p className="font-bold text-sm text-gray-800 truncate">{currentUserData?.Hoten}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase">ID: {currentUserData?.MaGV}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1 p-1 bg-white rounded-xl border border-gray-100 shadow-sm">
              <button 
                onClick={() => setState(p => ({...p, currentRole: Role.CHU_NHIEM}))} 
                className={`text-[10px] py-2 rounded-lg font-black uppercase transition-all ${state.currentRole === Role.CHU_NHIEM ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Chủ nhiệm
              </button>
              <button 
                onClick={() => setState(p => ({...p, currentRole: Role.GIANG_DAY}))} 
                className={`text-[10px] py-2 rounded-lg font-black uppercase transition-all ${state.currentRole === Role.GIANG_DAY ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Giảng dạy
              </button>
            </div>
          </div>
          <nav className="space-y-1">
            {[
              { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
              { id: 'students', label: 'Học sinh', icon: Users },
              { id: 'grades', label: 'Bảng điểm', icon: GraduationCap },
              { id: 'tasks', label: 'Nhiệm vụ', icon: Send },
              { id: 'discipline', label: 'Kỷ luật', icon: ShieldAlert },
              { id: 'logs', label: 'Nhật ký', icon: ClipboardList },
            ].map((item) => (
              <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === item.id ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600 border border-transparent'}`}>
                <item.icon size={20} className={activeTab === item.id ? 'text-indigo-600' : 'text-gray-300'} />
                {item.label}
              </button>
            ))} 
          </nav>
        </div>
        <div className="p-4 border-t border-gray-100 bg-white shrink-0">
          <button onClick={() => setIsLoggedIn(false)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all">
            <LogOut size={20} />Thoát Cloud
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 px-8 flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-8">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Niên học</span>
              <div className="flex items-center gap-1 group">
                <select value={state.selectedYear} onChange={(e) => setState(prev => ({ ...prev, selectedYear: parseInt(e.target.value) }))} className="text-base font-black border-none bg-transparent outline-none cursor-pointer text-gray-800 appearance-none pr-1">
                  {years.map(y => <option key={y.MaNienHoc} value={y.MaNienHoc}>{y.TenNienHoc}</option>)}
                </select>
                <div className="text-gray-800 mt-1"><ChevronRight size={14} /></div>
              </div>
            </div>
            
            <div className="flex items-center text-gray-200 h-8 self-center"><ChevronRight size={24} /></div>

            <div className="flex flex-col">
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Lớp {state.currentRole === Role.CHU_NHIEM ? 'Chủ nhiệm' : 'Giảng dạy'}</span>
              <div className="flex items-center gap-1 bg-indigo-50 px-3 py-1 rounded-xl mt-0.5 border border-indigo-100 group">
                <select value={state.selectedClass} onChange={(e) => setState(prev => ({ ...prev, selectedClass: e.target.value }))} className="text-base font-black border-none bg-transparent text-indigo-700 outline-none cursor-pointer appearance-none">
                  {filteredClasses.length > 0 ? (
                    filteredClasses.map(c => <option key={c.MaLop} value={c.MaLop}>{c.TenLop}</option>)
                  ) : (
                    <option value="">Không có lớp</option>
                  )}
                </select>
                <div className="text-indigo-700"><ChevronRight size={14} className="rotate-90" /></div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full text-[11px] font-black uppercase border border-emerald-100">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                Cloud Online
             </div>
             <button onClick={() => setIsSettingsOpen(true)} className="p-2.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all shadow-sm bg-white">
               <Settings size={22} />
             </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          {years.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <Database size={64} className="text-indigo-200 mb-4" />
              <h3 className="text-2xl font-black text-gray-800">Cần thiết lập hệ thống</h3>
              <button onClick={() => setIsSettingsOpen(true)} className="mt-4 px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold">Cấu hình ngay</button>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && <Dashboard state={state} students={students.filter(s => s.MaLopHienTai === state.selectedClass)} grades={grades} disciplines={disciplines} />}
              {activeTab === 'students' && (
                <StudentList 
                  state={state} students={students.filter(s => s.MaLopHienTai === state.selectedClass)} grades={grades} logs={logs} disciplines={disciplines}
                  onAddStudent={async s => { setStudents([...students, s]); await supabase.from('students').insert([s]); }}
                  onAddStudents={async newItems => { setStudents([...students, ...newItems]); await supabase.from('students').insert(newItems); }}
                  onUpdateStudent={async s => { setStudents(students.map(item => item.MaHS === s.MaHS ? s : item)); await supabase.from('students').update(s).eq('MaHS', s.MaHS); }} 
                  onDeleteStudent={async id => { if(confirm("Xóa học sinh?")) { setStudents(students.filter(s => s.MaHS !== id)); await supabase.from('students').delete().eq('MaHS', id); } }} 
                />
              )}
              {activeTab === 'grades' && <GradeBoard state={state} students={students.filter(s => s.MaLopHienTai === state.selectedClass)} grades={grades} onUpdateGrades={async g => { setGrades(prev => [...prev, ...g]); await supabase.from('grades').upsert(g); }} />}
              {activeTab === 'tasks' && <TaskManager state={state} students={students.filter(s => s.MaLopHienTai === state.selectedClass)} tasks={tasks} onUpdateTasks={async t => { setTasks(t); await supabase.from('tasks').upsert(t); }} />}
              {activeTab === 'discipline' && <DisciplineManager state={state} students={students.filter(s => s.MaLopHienTai === state.selectedClass)} disciplines={disciplines} violationRules={violationRules} onUpdateDisciplines={async d => { setDisciplines(prev => [...prev, ...d]); await supabase.from('disciplines').insert(d); }} onUpdateRules={async r => { setViolationRules(r); await supabase.from('violation_rules').upsert(r); }} />}
              {activeTab === 'logs' && <LearningLogs state={state} students={students.filter(s => s.MaLopHienTai === state.selectedClass)} logs={logs} assignment={currentAssignment!} onUpdateLogs={async l => { setLogs(prev => [...prev, ...l]); await supabase.from('learning_logs').insert(l); }} />}
            </>
          )}
        </div>
      </main>

      {isSettingsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-5xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 border-b flex items-center justify-between">
               <h3 className="font-black text-2xl text-gray-800">Cấu hình Cloud</h3>
               <button onClick={() => { setIsSettingsOpen(false); fetchData(); }} className="p-2 hover:bg-gray-100 rounded-full"><X size={28}/></button>
            </div>
            <div className="flex gap-4 px-8 pt-4">
              <button onClick={() => setSettingsTab('years')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase transition-all ${settingsTab === 'years' ? 'bg-indigo-600 text-white' : 'text-gray-400'}`}>1. Niên học</button>
              <button onClick={() => setSettingsTab('teachers')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase transition-all ${settingsTab === 'teachers' ? 'bg-amber-600 text-white' : 'text-gray-400'}`}>2. Giáo viên</button>
              <button onClick={() => setSettingsTab('classes')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase transition-all ${settingsTab === 'classes' ? 'bg-emerald-600 text-white' : 'text-gray-400'}`}>3. Lớp học</button>
              <button onClick={() => setSettingsTab('assignments')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase transition-all ${settingsTab === 'assignments' ? 'bg-rose-600 text-white' : 'text-gray-400'}`}>4. Phân công dạy</button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {settingsTab === 'years' && (
                <div className="max-w-md space-y-4">
                  <div className="flex gap-2"><input type="text" placeholder="VD: 2024-2025" value={newYearName} onChange={e => setNewYearName(e.target.value)} className="flex-1 px-4 py-2 bg-gray-50 border rounded-xl" /><button onClick={handleAddYear} className="px-6 bg-indigo-600 text-white rounded-xl font-bold">Thêm</button></div>
                  {years.map(y => <div key={y.MaNienHoc} className="flex justify-between p-4 bg-gray-50 rounded-xl"><span>{y.TenNienHoc}</span></div>)}
                </div>
              )}
              {settingsTab === 'teachers' && (
                <div className="max-w-2xl space-y-4">
                  <div className="grid grid-cols-2 gap-4"><input type="text" placeholder="Mã GV" value={newTeacherID} onChange={e => setNewTeacherID(e.target.value)} className="px-4 py-2 border rounded-xl" /><input type="text" placeholder="Họ và Tên" value={newTeacherName} onChange={e => setNewTeacherName(e.target.value)} className="px-4 py-2 border rounded-xl" /></div>
                  <button onClick={handleAddTeacher} className="w-full py-3 bg-amber-600 text-white rounded-xl font-bold uppercase">Đăng ký Giáo viên</button>
                </div>
              )}
              {settingsTab === 'classes' && (
                <div className="max-w-2xl space-y-4">
                  <div className="grid grid-cols-2 gap-4"><input type="text" placeholder="Mã lớp" value={newClassID} onChange={e => setNewClassID(e.target.value)} className="px-4 py-2 border rounded-xl" /><input type="text" placeholder="Tên lớp" value={newClassName} onChange={e => setNewClassName(e.target.value)} className="px-4 py-2 border rounded-xl" /></div>
                  <select value={selectedTeacherID} onChange={e => setSelectedTeacherID(e.target.value)} className="w-full px-4 py-2 border rounded-xl">{teachers.map(t => <option key={t.MaGV} value={t.MaGV}>{t.Hoten}</option>)}</select>
                  <button onClick={handleAddClass} className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold uppercase">Tạo lớp học</button>
                </div>
              )}
              {settingsTab === 'assignments' && (
                <div className="max-w-4xl space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <select value={assignGV} onChange={e => setAssignGV(e.target.value)} className="px-4 py-2 border rounded-xl">{teachers.map(t => <option key={t.MaGV} value={t.MaGV}>{t.Hoten}</option>)}</select>
                    <select value={assignClass} onChange={e => setAssignClass(e.target.value)} className="px-4 py-2 border rounded-xl">{classes.map(c => <option key={c.MaLop} value={c.MaLop}>{c.TenLop}</option>)}</select>
                    <select value={assignSub} onChange={e => setAssignSub(e.target.value)} className="px-4 py-2 border rounded-xl">{SUBJECTS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                  </div>
                  <button onClick={handleAddTeachingAssignment} className="w-full py-3 bg-rose-600 text-white rounded-xl font-bold uppercase">Phân công giảng dạy</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
