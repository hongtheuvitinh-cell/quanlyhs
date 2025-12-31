
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
  UserRoundCheck,
  Edit3,
  Check
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
  const [editingYearId, setEditingYearId] = useState<number | null>(null);
  const [editYearName, setEditYearName] = useState('');

  const [newClassName, setNewClassName] = useState('');
  const [newClassID, setNewClassID] = useState('');
  const [selectedTeacherID, setSelectedTeacherID] = useState('');
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherID, setNewTeacherID] = useState('');

  const [assignGV, setAssignGV] = useState('');
  const [assignClass, setAssignClass] = useState('');
  const [assignSub, setAssignSub] = useState('');

  // Fix: Defined currentUserData for use in sidebar to handle both Teacher and Student roles
  const currentUserData = state.currentUser as any;

  const fetchData = async () => {
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
        setState(p => ({ ...p, selectedYear: yrData[0].MaNienHoc }));
      }
    } catch (err) {
      console.error("Lỗi đồng bộ dữ liệu:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredClasses = useMemo(() => {
    if (!state.currentUser || (state.currentUser as any).MaHS) return [];
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

  // Fix: Defined currentAssignment for LearningLogs tab to track specific class assignment
  const currentAssignment = useMemo(() => {
    if (!state.currentUser || (state.currentUser as any).MaHS) return null;
    const teacherID = (state.currentUser as Teacher).MaGV;
    return assignments.find(a => 
      a.MaGV === teacherID && 
      a.MaLop === state.selectedClass && 
      a.MaNienHoc === state.selectedYear &&
      (state.currentRole === Role.CHU_NHIEM ? a.LoaiPhanCong === Role.CHU_NHIEM : a.LoaiPhanCong === Role.GIANG_DAY)
    );
  }, [assignments, state.currentUser, state.selectedClass, state.selectedYear, state.currentRole]);

  useEffect(() => {
    if (filteredClasses.length > 0) {
      const currentExists = filteredClasses.some(c => c.MaLop === state.selectedClass);
      if (!currentExists) {
        setState(prev => ({ ...prev, selectedClass: filteredClasses[0].MaLop }));
      }
    } else if (isLoggedIn && state.currentUser && !(state.currentUser as any).MaHS) {
      setState(prev => ({ ...prev, selectedClass: '' }));
    }
  }, [filteredClasses, state.currentRole]);

  const handleLogin = (role: Role, id: string, passwordInput: string) => {
    if (role === Role.STUDENT) {
      const student = students.find(s => s.MaHS === id);
      if (student && (student.MatKhau || '123456') === passwordInput) {
        setState(prev => ({ ...prev, currentUser: student, currentRole: Role.STUDENT, selectedClass: student.MaLopHienTai }));
        setIsLoggedIn(true);
      } else { alert("Thông tin đăng nhập không chính xác!"); }
    } else {
      const teacher = teachers.find(t => t.MaGV === id);
      if (teacher && (teacher.MatKhau || '123456') === passwordInput) {
        const myAs = assignments.filter(a => a.MaGV === id);
        const cnAs = myAs.find(a => a.LoaiPhanCong === Role.CHU_NHIEM);
        setState(prev => ({ 
          ...prev, 
          currentUser: teacher, 
          currentRole: cnAs ? Role.CHU_NHIEM : Role.GIANG_DAY,
          selectedClass: cnAs?.MaLop || myAs[0]?.MaLop || ''
        }));
        setIsLoggedIn(true);
      } else { alert("Thông tin đăng nhập không chính xác!"); }
    }
  };

  const handleAddYear = async () => {
    if (!newYearName) return;
    const { data, error } = await supabase.from('academic_years').insert([{ TenNienHoc: newYearName }]).select();
    if (error) {
      alert("Lỗi thêm niên học: " + error.message);
      return;
    }
    await fetchData();
    setNewYearName('');
  };

  const handleUpdateYear = async (id: number) => {
    if (!editYearName) return;
    const { error } = await supabase.from('academic_years').update({ TenNienHoc: editYearName }).eq('MaNienHoc', id);
    if (error) {
      alert("Lỗi cập nhật: " + error.message);
      return;
    }
    setEditingYearId(null);
    await fetchData();
  };

  const handleDeleteYear = async (id: number) => {
    if (confirm("Xóa niên học này? Lưu ý: Dữ liệu liên quan có thể bị ảnh hưởng.")) {
      const { error } = await supabase.from('academic_years').delete().eq('MaNienHoc', id);
      if (error) {
        alert("Lỗi xóa: " + error.message);
        return;
      }
      await fetchData();
    }
  };

  const handleAddTeacher = async () => {
    if (!newTeacherID || !newTeacherName) return;
    const { data, error } = await supabase.from('teachers').insert([{ 
      MaGV: newTeacherID, Hoten: newTeacherName, MaMonChinh: 'TOAN', MatKhau: '123456'
    }]).select();
    if (error) {
      alert("Lỗi thêm GV: " + error.message);
      return;
    }
    await fetchData();
    setNewTeacherID(''); setNewTeacherName('');
  };

  const handleAddClass = async () => {
    if (!newClassID || !newClassName) return;
    const { data: classData, error: classError } = await supabase.from('classes').insert([{ 
      MaLop: newClassID, TenLop: newClassName, Khoi: parseInt(newClassID) || 10 
    }]).select();
    
    if (classError) {
      alert("Lỗi tạo lớp: " + classError.message);
      return;
    }

    if (classData && selectedTeacherID) {
      const { error: assignError } = await supabase.from('assignments').insert([{
        MaGV: selectedTeacherID, MaLop: classData[0].MaLop, MaNienHoc: state.selectedYear, LoaiPhanCong: Role.CHU_NHIEM, MaMonHoc: null
      }]);
      if (assignError) console.error("Lỗi gán chủ nhiệm:", assignError);
    }
    await fetchData();
    setNewClassID(''); setNewClassName(''); setSelectedTeacherID('');
  };

  // Fix: Conditional rendering for non-logged in state
  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} teachers={teachers} students={students} />;
  }

  // Fix: Conditional rendering for student view
  if (state.currentRole === Role.STUDENT && state.currentUser) {
    return (
      <StudentPortal 
        student={state.currentUser as Student} 
        grades={grades} 
        disciplines={disciplines} 
        tasks={tasks}
        onLogout={() => setIsLoggedIn(false)}
        onToggleTask={async (taskId) => {
          const task = tasks.find(t => t.MaNhiemVu === taskId);
          if (!task) return;
          const studentId = (state.currentUser as Student).MaHS;
          const isDone = task.DanhSachHoanThanh.includes(studentId);
          const updatedTask = {
            ...task,
            DanhSachHoanThanh: isDone 
              ? task.DanhSachHoanThanh.filter(id => id !== studentId)
              : [...task.DanhSachHoanThanh, studentId]
          };
          await supabase.from('tasks').upsert(updatedTask);
          await fetchData();
        }}
      />
    );
  }

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
                <p className="text-[10px] text-gray-400 font-bold uppercase">ID: {currentUserData?.MaGV || currentUserData?.MaHS}</p>
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
                    <option value="">(Không có lớp)</option>
                  )}
                </select>
                <div className="text-indigo-700"><ChevronRight size={14} className="rotate-90" /></div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full text-[11px] font-black uppercase border border-emerald-100 shadow-sm"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>Cloud Online</div>
             <button onClick={() => setIsSettingsOpen(true)} className="p-2.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all shadow-sm bg-white border border-gray-100"><Settings size={22} /></button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          {!state.selectedClass && isLoggedIn && !(state.currentUser as any).MaHS ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <div className="p-6 bg-amber-50 rounded-[40px] text-amber-600 mb-6 border border-amber-100"><Database size={64}/></div>
              <h3 className="text-2xl font-black text-gray-800 mb-2">Chưa có lớp cho vai trò này</h3>
              <p className="text-gray-400 font-medium mb-8 leading-relaxed">Bạn cần được phân công làm Chủ nhiệm hoặc Giảng dạy một lớp nào đó để xem dữ liệu.</p>
              <button onClick={() => setIsSettingsOpen(true)} className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg">Mở Phân công</button>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && <Dashboard state={state} students={students.filter(s => s.MaLopHienTai === state.selectedClass)} grades={grades} disciplines={disciplines} />}
              {activeTab === 'students' && (
                <StudentList 
                  state={state} students={students.filter(s => s.MaLopHienTai === state.selectedClass)} grades={grades} logs={logs} disciplines={disciplines}
                  onAddStudent={async s => { 
                    const { error } = await supabase.from('students').insert([s]); 
                    if (error) { alert("Lỗi lưu học sinh: " + error.message); return; }
                    await fetchData(); 
                  }}
                  onAddStudents={async newItems => { 
                    const { error } = await supabase.from('students').insert(newItems); 
                    if (error) { alert("Lỗi nhập danh sách: " + error.message); return; }
                    await fetchData(); 
                  }}
                  onUpdateStudent={async s => { 
                    const { error } = await supabase.from('students').update(s).eq('MaHS', s.MaHS); 
                    if (error) { alert("Lỗi cập nhật: " + error.message); return; }
                    await fetchData(); 
                  }} 
                  onDeleteStudent={async id => { 
                    if(confirm("Xóa học sinh?")) { 
                      const { error } = await supabase.from('students').delete().eq('MaHS', id); 
                      if (error) { alert("Lỗi xóa: " + error.message); return; }
                      await fetchData(); 
                    } 
                  }} 
                />
              )}
              {activeTab === 'grades' && <GradeBoard state={state} students={students.filter(s => s.MaLopHienTai === state.selectedClass)} grades={grades} onUpdateGrades={async g => { await supabase.from('grades').upsert(g); await fetchData(); }} />}
              {activeTab === 'tasks' && <TaskManager state={state} students={students.filter(s => s.MaLopHienTai === state.selectedClass)} tasks={tasks} onUpdateTasks={async t => { await supabase.from('tasks').upsert(t); await fetchData(); }} />}
              {activeTab === 'discipline' && <DisciplineManager state={state} students={students.filter(s => s.MaLopHienTai === state.selectedClass)} disciplines={disciplines} violationRules={violationRules} onUpdateDisciplines={async d => { await supabase.from('disciplines').insert(d); await fetchData(); }} onUpdateRules={async r => { await supabase.from('violation_rules').upsert(r); await fetchData(); }} />}
              {activeTab === 'logs' && <LearningLogs state={state} students={students.filter(s => s.MaLopHienTai === state.selectedClass)} logs={logs} assignment={currentAssignment!} onUpdateLogs={async l => { await supabase.from('learning_logs').insert(l); await fetchData(); }} />}
            </>
          )}
        </div>
      </main>

      {isSettingsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-5xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-8 py-5 border-b flex items-center justify-between">
               <h3 className="font-black text-xl text-gray-800">Cấu hình Hệ thống</h3>
               <button onClick={() => { setIsSettingsOpen(false); fetchData(); }} className="p-2 hover:bg-gray-100 rounded-full"><X size={24}/></button>
            </div>
            <div className="flex gap-2 px-8 pt-3">
              <button onClick={() => setSettingsTab('years')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${settingsTab === 'years' ? 'bg-indigo-600 text-white' : 'text-gray-400'}`}>1. Niên học</button>
              <button onClick={() => setSettingsTab('teachers')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${settingsTab === 'teachers' ? 'bg-amber-600 text-white' : 'text-gray-400'}`}>2. Giáo viên</button>
              <button onClick={() => setSettingsTab('classes')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${settingsTab === 'classes' ? 'bg-emerald-600 text-white' : 'text-gray-400'}`}>3. Lớp học</button>
              <button onClick={() => setSettingsTab('assignments')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${settingsTab === 'assignments' ? 'bg-rose-600 text-white' : 'text-gray-400'}`}>4. Phân công dạy</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {settingsTab === 'years' && (
                <div className="max-w-xl space-y-4">
                  <div className="flex gap-2 bg-gray-50 p-2 rounded-xl border border-gray-100">
                    <input type="text" placeholder="VD: 2024-2025" value={newYearName} onChange={e => setNewYearName(e.target.value)} className="flex-1 px-4 py-2 bg-white border rounded-lg font-bold text-sm" />
                    <button onClick={handleAddYear} className="px-6 bg-indigo-600 text-white rounded-lg font-bold text-xs flex items-center gap-2"><Plus size={14}/> Thêm</button>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5">
                    {years.map(y => (
                      <div key={y.MaNienHoc} className="flex justify-between items-center px-4 py-2.5 bg-white border border-gray-100 rounded-xl group">
                        {editingYearId === y.MaNienHoc ? (
                          <div className="flex gap-2 w-full">
                            <input type="text" value={editYearName} onChange={e => setEditYearName(e.target.value)} className="flex-1 px-3 py-1.5 border rounded-lg font-bold text-sm" />
                            <button onClick={() => handleUpdateYear(y.MaNienHoc)} className="p-1.5 bg-emerald-600 text-white rounded-lg"><Check size={14}/></button>
                            <button onClick={() => setEditingYearId(null)} className="p-1.5 bg-gray-200 text-gray-500 rounded-lg"><X size={14}/></button>
                          </div>
                        ) : (
                          <>
                            <span className="font-bold text-sm text-gray-700">{y.TenNienHoc}</span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setEditingYearId(y.MaNienHoc); setEditYearName(y.TenNienHoc); }} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit3 size={14}/></button>
                              <button onClick={() => handleDeleteYear(y.MaNienHoc)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"><Trash2 size={14}/></button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="px-8 py-5 bg-gray-50 border-t flex justify-end shrink-0">
               <button onClick={() => { setIsSettingsOpen(false); fetchData(); }} className="px-10 py-2.5 bg-gray-900 text-white rounded-2xl font-black text-xs shadow-xl">Hoàn tất</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
