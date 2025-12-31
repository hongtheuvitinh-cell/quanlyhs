
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

  // Form phân công giảng dạy
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

      if (yrData && yrData.length > 0) {
        setYears(yrData);
        if (state.selectedYear === 0) {
          setState(p => ({ ...p, selectedYear: yrData[0].MaNienHoc }));
        }
      }
      if (clData) {
        setClasses(clData);
        if (clData.length > 0 && state.selectedClass === '') {
          setState(p => ({ ...p, selectedClass: clData[0].MaLop }));
        }
      }
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

  const handleLogin = (role: Role, id: string, passwordInput: string) => {
    if (role === Role.STUDENT) {
      const student = students.find(s => s.MaHS === id);
      if (student) {
        const storedPass = (student as any).MatKhau || '123456';
        if (storedPass === passwordInput) {
          setState(prev => ({ ...prev, currentUser: student, currentRole: Role.STUDENT }));
          setIsLoggedIn(true);
        } else {
          alert("Mật khẩu Học sinh không chính xác!");
        }
      } else {
        alert("Mã Học sinh không tồn tại!");
      }
    } else {
      const teacher = teachers.find(t => t.MaGV === id);
      if (teacher) {
        const storedPass = (teacher as any).MatKhau || '123456';
        if (storedPass === passwordInput) {
          const cnAssignment = assignments.find(a => a.MaGV === id && a.LoaiPhanCong === Role.CHU_NHIEM && a.MaNienHoc === state.selectedYear);
          if (cnAssignment) {
             setState(prev => ({ ...prev, currentUser: teacher, currentRole: Role.CHU_NHIEM, selectedClass: cnAssignment.MaLop }));
          } else {
             setState(prev => ({ ...prev, currentUser: teacher, currentRole: Role.GIANG_DAY }));
          }
          setIsLoggedIn(true);
        } else {
          alert("Mật khẩu Giáo viên không chính xác!");
        }
      } else {
        alert("Mã Giáo viên không tồn tại!");
      }
    }
  };

  const handleAddYear = async () => {
    if (!newYearName) return;
    if (years.some(y => y.TenNienHoc === newYearName)) {
      alert("Niên học này đã tồn tại!");
      return;
    }

    const { data, error } = await supabase.from('academic_years').insert([{ TenNienHoc: newYearName }]).select();
    if (error) {
      alert("Lỗi SQL: " + error.message);
      return;
    }
    if (data) {
      setYears([data[0], ...years]);
      if (state.selectedYear === 0) setState(p => ({ ...p, selectedYear: data[0].MaNienHoc }));
      setNewYearName('');
      alert("Đã thêm Niên học thành công!");
    }
  };

  const handleAddTeacher = async () => {
    if (!newTeacherID || !newTeacherName) return;
    const { data, error } = await supabase.from('teachers').insert([{ 
      MaGV: newTeacherID, 
      Hoten: newTeacherName, 
      MaMonChinh: 'TOAN',
      MatKhau: '123456'
    }]).select();
    if (error) { alert("Lỗi: " + error.message); return; }
    if (data) {
      setTeachers([...teachers, data[0]]);
      setNewTeacherID(''); setNewTeacherName('');
      alert("Đã thêm Giáo viên! Mật khẩu mặc định: 123456");
    }
  };

  const handleAddClass = async () => {
    if (!newClassID || !newClassName) return;
    if (state.selectedYear === 0) { alert("Cần chọn niên học trước!"); return; }
    
    const { data: classData, error: classError } = await supabase.from('classes').insert([{ MaLop: newClassID, TenLop: newClassName, Khoi: parseInt(newClassID) || 10 }]).select();
    if (classError) { alert("Lỗi: " + classError.message); return; }
    
    if (classData) {
      setClasses(prev => [...prev, classData[0]]);
      if (state.selectedClass === '') setState(p => ({ ...p, selectedClass: classData[0].MaLop }));
      
      if (selectedTeacherID) {
        const { data: assignData } = await supabase.from('assignments').insert([{
          MaGV: selectedTeacherID, MaLop: classData[0].MaLop, MaNienHoc: state.selectedYear, LoaiPhanCong: Role.CHU_NHIEM, MaMonHoc: null
        }]).select();
        if (assignData) setAssignments(prev => [...prev, assignData[0]]);
      }
      setNewClassID(''); setNewClassName(''); setSelectedTeacherID('');
      alert(`Đã hoàn tất tạo lớp ${newClassName}!`);
    }
  };

  const handleAddTeachingAssignment = async () => {
    if (!assignGV || !assignClass || !assignSub) {
      alert("Vui lòng nhập đầy đủ Giáo viên, Lớp và Môn học!");
      return;
    }
    // Kiểm tra trùng lặp
    const exists = assignments.some(a => 
      a.MaGV === assignGV && 
      a.MaLop === assignClass && 
      a.MaMonHoc === assignSub && 
      a.MaNienHoc === state.selectedYear
    );
    if (exists) {
      alert("Phân công này đã tồn tại!");
      return;
    }

    const { data, error } = await supabase.from('assignments').insert([{
      MaGV: assignGV,
      MaLop: assignClass,
      MaNienHoc: state.selectedYear,
      LoaiPhanCong: Role.GIANG_DAY,
      MaMonHoc: assignSub
    }]).select();

    if (error) {
      alert("Lỗi phân công: " + error.message);
      return;
    }
    if (data) {
      setAssignments([...assignments, data[0]]);
      alert("Đã phân công giảng dạy thành công!");
    }
  };

  const handleDeleteAssignment = async (id: number) => {
    if (confirm("Gỡ bỏ phân công này?")) {
      const { error } = await supabase.from('assignments').delete().eq('MaPhanCong', id);
      if (error) {
        alert("Lỗi khi xóa: " + error.message);
      } else {
        setAssignments(assignments.filter(a => a.MaPhanCong !== id));
      }
    }
  };

  const handleUpdateGrades = async (newGrades: Grade[]) => {
    setGrades(prev => {
      const updated = [...prev];
      newGrades.forEach(item => {
        const idx = updated.findIndex(g => g.MaHS === item.MaHS && g.MaMonHoc === item.MaMonHoc && g.HocKy === item.HocKy && g.LoaiDiem === item.LoaiDiem);
        if (idx > -1) updated[idx] = item;
        else updated.push(item);
      });
      return updated;
    });
    await supabase.from('grades').upsert(newGrades);
  };

  const handleUpdateTasks = async (updatedTasks: AssignmentTask[]) => {
    setTasks(updatedTasks);
    await supabase.from('tasks').upsert(updatedTasks);
  };

  const handleUpdateDisciplines = async (newDisciplines: Discipline[]) => {
    setDisciplines(prev => [...prev, ...newDisciplines]);
    await supabase.from('disciplines').insert(newDisciplines);
  };

  const handleUpdateLogs = async (newLogs: LearningLog[]) => {
    setLogs(prev => [...prev, ...newLogs]);
    await supabase.from('learning_logs').insert(newLogs);
  };

  if (isLoading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-900 text-white">
      <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
      <p className="font-black text-indigo-200 uppercase tracking-[0.2em] text-[10px]">Đang kết nối Cloud Database...</p>
    </div>
  );

  if (!isLoggedIn) return <Login onLogin={handleLogin} teachers={teachers} students={students} />;

  if (state.currentRole === Role.STUDENT) {
    return (
      <StudentPortal 
        student={state.currentUser as Student} 
        grades={grades.filter(g => g.MaHS === (state.currentUser as Student).MaHS)}
        disciplines={disciplines.filter(d => d.MaHS === (state.currentUser as Student).MaHS)}
        tasks={tasks.filter(t => t.MaLop === (state.currentUser as Student).MaLopHienTai)}
        onLogout={() => setIsLoggedIn(false)}
        onToggleTask={(taskId) => {
          const task = tasks.find(t => t.MaNhiemVu === taskId);
          if (task) {
            const isDone = task.DanhSachHoanThanh.includes((state.currentUser as Student).MaHS);
            const updated = {
              ...task,
              DanhSachHoanThanh: isDone 
                ? task.DanhSachHoanThanh.filter(id => id !== (state.currentUser as Student).MaHS)
                : [...task.DanhSachHoanThanh, (state.currentUser as Student).MaHS]
            };
            handleUpdateTasks([updated]);
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
              <div className="h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold border border-indigo-200">{currentUserData?.Hoten?.charAt(0)}</div>
              <div className="min-w-0">
                <p className="font-bold text-sm text-gray-800 truncate">{currentUserData?.Hoten}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase">ID: {currentUserData?.MaGV}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1 p-1 bg-white rounded-xl border border-gray-100 shadow-sm">
              <button onClick={() => setState(p => ({...p, currentRole: Role.CHU_NHIEM}))} className={`text-[10px] py-2 rounded-lg font-black uppercase transition-all ${state.currentRole === Role.CHU_NHIEM ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>Chủ nhiệm</button>
              <button onClick={() => setState(p => ({...p, currentRole: Role.GIANG_DAY}))} className={`text-[10px] py-2 rounded-lg font-black uppercase transition-all ${state.currentRole === Role.GIANG_DAY ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>Giảng dạy</button>
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
                {years.length > 0 ? (
                  <select 
                    value={state.selectedYear} 
                    onChange={(e) => setState(prev => ({ ...prev, selectedYear: parseInt(e.target.value) }))} 
                    className="text-base font-black border-none bg-transparent outline-none cursor-pointer text-gray-800 appearance-none pr-1"
                  >
                    {years.map(y => <option key={y.MaNienHoc} value={y.MaNienHoc}>{y.TenNienHoc}</option>)}
                  </select>
                ) : (
                  <span className="text-sm font-bold text-rose-500 italic">Chưa có dữ liệu</span>
                )}
                <div className="text-gray-800 mt-1"><ChevronRight size={14} /></div>
              </div>
            </div>
            
            <div className="flex items-center text-gray-200 h-8 self-center"><ChevronRight size={24} /></div>

            <div className="flex flex-col">
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Lớp hiện tại</span>
              <div className="flex items-center gap-1 bg-indigo-50 px-3 py-1 rounded-xl mt-0.5 border border-indigo-100 group">
                {classes.length > 0 ? (
                  <select 
                    value={state.selectedClass} 
                    onChange={(e) => setState(prev => ({ ...prev, selectedClass: e.target.value }))} 
                    className="text-base font-black border-none bg-transparent text-indigo-700 outline-none cursor-pointer appearance-none"
                  >
                    {classes.map(c => <option key={c.MaLop} value={c.MaLop}>{c.TenLop}</option>)}
                  </select>
                ) : (
                  <span className="text-sm font-bold text-indigo-400 italic">Trống</span>
                )}
                <div className="text-indigo-700"><ChevronRight size={14} className="rotate-90" /></div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full text-[11px] font-black uppercase tracking-widest border border-emerald-100">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                Cloud Online
             </div>
             <button onClick={() => setIsSettingsOpen(true)} className="p-2.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-transparent hover:border-indigo-100 shadow-sm bg-white">
               <Settings size={22} />
             </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          {years.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <div className="p-6 bg-amber-50 rounded-[40px] text-amber-600 mb-6 border border-amber-100"><Database size={64}/></div>
              <h3 className="text-2xl font-black text-gray-800 mb-2">Cloud chưa được cấu hình</h3>
              <p className="text-gray-400 font-medium mb-8 leading-relaxed">Để bắt đầu, bạn cần thiết lập ít nhất một Niên học và một Lớp học trong phần Cấu hình.</p>
              <button onClick={() => setIsSettingsOpen(true)} className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2">
                <Settings size={20}/> Mở Cấu hình ngay
              </button>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && <Dashboard state={state} students={students.filter(s => s.MaLopHienTai === state.selectedClass)} grades={grades} disciplines={disciplines} />}
              {activeTab === 'students' && (
                <StudentList 
                  state={state} students={students.filter(s => s.MaLopHienTai === state.selectedClass)} grades={grades} logs={logs} disciplines={disciplines}
                  onAddStudent={async s => { 
                    const studentWithPass = { ...s, MatKhau: '123456' };
                    setStudents([...students, studentWithPass]); 
                    await supabase.from('students').insert([studentWithPass]); 
                  }}
                  onAddStudents={async newItems => { 
                    const itemsWithPass = newItems.map(item => ({ ...item, MatKhau: '123456' }));
                    setStudents([...students, ...itemsWithPass]); 
                    await supabase.from('students').insert(itemsWithPass); 
                  }}
                  onUpdateStudent={async s => { setStudents(students.map(item => item.MaHS === s.MaHS ? s : item)); await supabase.from('students').update(s).eq('MaHS', s.MaHS); }} 
                  onDeleteStudent={async id => { if(confirm("Xóa học sinh này?")) { setStudents(students.filter(s => s.MaHS !== id)); await supabase.from('students').delete().eq('MaHS', id); } }} 
                />
              )}
              {activeTab === 'grades' && <GradeBoard state={state} students={students.filter(s => s.MaLopHienTai === state.selectedClass)} grades={grades} onUpdateGrades={handleUpdateGrades} />}
              {activeTab === 'tasks' && <TaskManager state={state} students={students.filter(s => s.MaLopHienTai === state.selectedClass)} tasks={tasks} onUpdateTasks={handleUpdateTasks} />}
              {activeTab === 'discipline' && <DisciplineManager state={state} students={students.filter(s => s.MaLopHienTai === state.selectedClass)} disciplines={disciplines} violationRules={violationRules} onUpdateDisciplines={handleUpdateDisciplines} onUpdateRules={async r => { setViolationRules(r); await supabase.from('violation_rules').upsert(r); }} />}
              {activeTab === 'logs' && <LearningLogs state={state} students={students.filter(s => s.MaLopHienTai === state.selectedClass)} logs={logs} assignment={currentAssignment!} onUpdateLogs={handleUpdateLogs} />}
            </>
          )}
        </div>
      </main>

      {isSettingsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in">
          <div className="bg-white w-full max-w-5xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
            <div className="p-8 border-b flex items-center justify-between shrink-0">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-gray-900 text-white rounded-2xl"><Settings size={28}/></div>
                  <div>
                    <h3 className="font-black text-2xl text-gray-800 tracking-tight">Cấu hình Hệ thống Cloud</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Thiết lập dữ liệu nền tảng cho trường học</p>
                  </div>
               </div>
               <button onClick={() => { setIsSettingsOpen(false); fetchData(); }} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={28} className="text-gray-400"/></button>
            </div>

            <div className="flex gap-4 px-8 pt-4">
              <button onClick={() => setSettingsTab('years')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${settingsTab === 'years' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-100'}`}>1. Niên học</button>
              <button onClick={() => setSettingsTab('teachers')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${settingsTab === 'teachers' ? 'bg-amber-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-100'}`}>2. Giáo viên</button>
              <button onClick={() => setSettingsTab('classes')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${settingsTab === 'classes' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-100'}`}>3. Lớp học</button>
              <button onClick={() => setSettingsTab('assignments')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${settingsTab === 'assignments' ? 'bg-rose-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-100'}`}>4. Phân công dạy</button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {settingsTab === 'years' && (
                <div className="max-w-md space-y-6">
                  <div className="flex gap-2 p-1.5 bg-gray-50 rounded-2xl border border-gray-100">
                    <input type="text" placeholder="VD: 2024-2025" value={newYearName} onChange={e => setNewYearName(e.target.value)} className="flex-1 px-4 py-3 bg-white border border-transparent rounded-xl font-bold text-sm outline-none shadow-sm" />
                    <button onClick={handleAddYear} className="px-6 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase hover:bg-indigo-700 transition-all flex items-center gap-2"><Plus size={16}/> Thêm</button>
                  </div>
                  <div className="space-y-2">
                    {years.map(y => (
                      <div key={y.MaNienHoc} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 group shadow-sm">
                        <span className="font-bold text-gray-700">{y.TenNienHoc}</span>
                        <button onClick={async () => { if(confirm("Xóa niên học này? Tất cả dữ liệu liên quan sẽ bị ảnh hưởng.")) { await supabase.from('academic_years').delete().eq('MaNienHoc', y.MaNienHoc); setYears(years.filter(item => item.MaNienHoc !== y.MaNienHoc)); } }} className="p-2 text-gray-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {settingsTab === 'teachers' && (
                <div className="max-w-2xl space-y-6">
                  <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 grid grid-cols-2 gap-4">
                    <div className="space-y-1.5"><label className="text-[10px] font-black text-amber-600 uppercase">Mã GV (Dùng đăng nhập)</label><input type="text" placeholder="VD: GV_ANH" value={newTeacherID} onChange={e => setNewTeacherID(e.target.value)} className="w-full px-4 py-3 bg-white border rounded-xl font-bold text-sm outline-none" /></div>
                    <div className="space-y-1.5"><label className="text-[10px] font-black text-amber-600 uppercase">Họ và Tên</label><input type="text" placeholder="VD: Nguyễn Văn Anh" value={newTeacherName} onChange={e => setNewTeacherName(e.target.value)} className="w-full px-4 py-3 bg-white border rounded-xl font-bold text-sm outline-none" /></div>
                    <button onClick={handleAddTeacher} className="col-span-2 py-4 bg-amber-600 text-white rounded-2xl font-black text-sm uppercase shadow-lg hover:bg-amber-700 transition-all flex items-center justify-center gap-2"><UserPlus size={18}/> Đăng ký Giáo viên</button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {teachers.map(t => (
                      <div key={t.MaGV} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 group shadow-sm">
                        <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center font-black text-xs uppercase">{t.Hoten.charAt(0)}</div><div><p className="text-sm font-bold text-gray-700">{t.Hoten}</p><p className="text-[10px] text-gray-400 font-bold uppercase">ID: {t.MaGV}</p></div></div>
                        <button onClick={async () => { if(confirm("Xóa giáo viên này?")) { await supabase.from('teachers').delete().eq('MaGV', t.MaGV); setTeachers(teachers.filter(item => item.MaGV !== t.MaGV)); } }} className="p-2 text-gray-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {settingsTab === 'classes' && (
                <div className="max-w-2xl space-y-6">
                  <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5"><label className="text-[10px] font-black text-emerald-600 uppercase">Mã lớp</label><input type="text" placeholder="12A1" value={newClassID} onChange={e => setNewClassID(e.target.value)} className="w-full px-4 py-3 bg-white border rounded-xl font-bold text-sm outline-none" /></div>
                      <div className="space-y-1.5"><label className="text-[10px] font-black text-emerald-600 uppercase">Tên lớp</label><input type="text" placeholder="Lớp 12A1" value={newClassName} onChange={e => setNewClassName(e.target.value)} className="w-full px-4 py-3 bg-white border rounded-xl font-bold text-sm outline-none" /></div>
                    </div>
                    <div className="space-y-1.5"><label className="text-[10px] font-black text-emerald-600 uppercase flex items-center gap-1"><UserCheck size={12}/> GV Chủ nhiệm</label><select value={selectedTeacherID} onChange={e => setSelectedTeacherID(e.target.value)} className="w-full px-4 py-3 bg-white border rounded-xl font-bold text-sm outline-none appearance-none"><option value="">-- Chọn GV --</option>{teachers.map(t => <option key={t.MaGV} value={t.MaGV}>{t.Hoten} ({t.MaGV})</option>)}</select></div>
                    <button onClick={handleAddClass} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"><Save size={18}/> Tạo lớp học</button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {classes.map(c => {
                      const gvcn = assignments.find(a => a.MaLop === c.MaLop && a.LoaiPhanCong === Role.CHU_NHIEM && a.MaNienHoc === state.selectedYear);
                      const t = teachers.find(item => item.MaGV === gvcn?.MaGV);
                      return (
                        <div key={c.MaLop} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 group shadow-sm">
                          <div className="flex items-center gap-3"><div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-black text-xs uppercase border border-emerald-100">{c.MaLop}</div><div><p className="font-bold text-gray-700">{c.TenLop}</p><p className="text-[10px] text-gray-400 font-bold uppercase">CN: {t?.Hoten || 'Chưa có'}</p></div></div>
                          <button onClick={async () => { if(confirm("Xóa lớp?")) { await supabase.from('classes').delete().eq('MaLop', c.MaLop); setClasses(classes.filter(item => item.MaLop !== c.MaLop)); } }} className="p-2 text-gray-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {settingsTab === 'assignments' && (
                <div className="max-w-4xl space-y-6">
                  <div className="bg-rose-50 p-6 rounded-3xl border border-rose-100 grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-rose-600 uppercase">Giáo viên</label>
                      <select value={assignGV} onChange={e => setAssignGV(e.target.value)} className="w-full px-4 py-3 bg-white border rounded-xl font-bold text-sm outline-none appearance-none">
                        <option value="">-- Chọn GV --</option>
                        {teachers.map(t => <option key={t.MaGV} value={t.MaGV}>{t.Hoten}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-rose-600 uppercase">Lớp học</label>
                      <select value={assignClass} onChange={e => setAssignClass(e.target.value)} className="w-full px-4 py-3 bg-white border rounded-xl font-bold text-sm outline-none appearance-none">
                        <option value="">-- Chọn lớp --</option>
                        {classes.map(c => <option key={c.MaLop} value={c.MaLop}>{c.TenLop}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-rose-600 uppercase">Môn học</label>
                      <select value={assignSub} onChange={e => setAssignSub(e.target.value)} className="w-full px-4 py-3 bg-white border rounded-xl font-bold text-sm outline-none appearance-none">
                        <option value="">-- Chọn môn --</option>
                        {SUBJECTS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <button onClick={handleAddTeachingAssignment} className="col-span-3 py-4 bg-rose-600 text-white rounded-2xl font-black text-sm uppercase shadow-lg hover:bg-rose-700 transition-all flex items-center justify-center gap-2">
                      <UserRoundCheck size={18}/> Phân công giảng dạy
                    </button>
                  </div>

                  <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <tr>
                          <th className="px-6 py-4">Giáo viên</th>
                          <th className="px-6 py-4 text-center">Lớp</th>
                          <th className="px-6 py-4 text-center">Môn học</th>
                          <th className="px-6 py-4 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {assignments.filter(a => a.LoaiPhanCong === Role.GIANG_DAY && a.MaNienHoc === state.selectedYear).map(a => {
                          const t = teachers.find(item => item.MaGV === a.MaGV);
                          const subName = SUBJECTS.find(s => s.id === a.MaMonHoc)?.name || a.MaMonHoc;
                          return (
                            <tr key={a.MaPhanCong} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4">
                                <p className="font-bold text-gray-800 text-sm">{t?.Hoten}</p>
                                <p className="text-[9px] text-gray-400 font-black uppercase">ID: {a.MaGV}</p>
                              </td>
                              <td className="px-6 py-4 text-center font-black text-rose-600">{a.MaLop}</td>
                              <td className="px-6 py-4 text-center font-bold text-gray-600">{subName}</td>
                              <td className="px-6 py-4 text-right">
                                <button onClick={() => handleDeleteAssignment(a.MaPhanCong)} className="p-2 text-gray-300 hover:text-rose-600 transition-colors">
                                  <Trash2 size={16}/>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="p-8 bg-gray-50 border-t flex justify-end shrink-0">
               <button onClick={() => { setIsSettingsOpen(false); fetchData(); }} className="px-12 py-4 bg-gray-900 text-white rounded-2xl font-black shadow-xl hover:bg-black transition-all text-sm uppercase tracking-widest">Hoàn tất cấu hình</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
