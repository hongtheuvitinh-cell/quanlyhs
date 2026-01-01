
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

  // Hàm helper để log lỗi chi tiết
  const handleSupabaseError = (error: any, actionName: string) => {
    console.error(`Lỗi ${actionName}:`, error);
    let message = `❌ KHÔNG THỂ GHI DỮ LIỆU: ${actionName}\n\n`;
    
    if (error.code === '42P01') message += "Lỗi: Bảng không tồn tại trong Database.";
    else if (error.code === '42703') message += "Lỗi: Sai tên cột. Vui lòng kiểm tra tên cột trong Supabase (có thể là ma_hs thay vì MaHS).";
    else if (error.code === '23505') message += "Lỗi: Dữ liệu bị trùng Mã số (Primary Key).";
    else if (error.code === 'PGRST301') message += "Lỗi: JWT hết hạn, vui lòng F5 trang.";
    else if (error.message.includes('policy')) message += "Lỗi: Bị chặn bởi RLS Policy. Bạn hãy kiểm tra lại cấu hình Policy ALL/true như hướng dẫn.";
    else message += `Mã lỗi: ${error.code}\nNội dung: ${error.message}`;

    alert(message);
  };

  const fetchData = async () => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }
    
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
        setState((p: AppState) => ({ ...p, selectedYear: yrData[0].MaNienHoc }));
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
      a.MaGV === teacherID && 
      a.MaLop === state.selectedClass && 
      a.MaNienHoc === state.selectedYear &&
      (state.currentRole === Role.CHU_NHIEM ? a.LoaiPhanCong === Role.CHU_NHIEM : a.LoaiPhanCong === Role.GIANG_DAY)
    );
  }, [assignments, state.currentUser, state.selectedClass, state.selectedYear, state.currentRole]);

  useEffect(() => {
    if (filteredClasses.length > 0) {
      const currentExists = filteredClasses.some((c: Class) => c.MaLop === state.selectedClass);
      if (!currentExists) {
        setState((prev: AppState) => ({ ...prev, selectedClass: filteredClasses[0].MaLop }));
      }
    } else if (isLoggedIn && state.currentUser && !(state.currentUser as any).MaHS) {
      setState((prev: AppState) => ({ ...prev, selectedClass: '' }));
    }
  }, [filteredClasses, state.currentRole]);

  const handleLogin = (role: Role, id: string, passwordInput: string) => {
    if (role === Role.STUDENT) {
      const student = students.find((s: Student) => s.MaHS === id);
      if (student && (student.MatKhau || '123456') === passwordInput) {
        setState((prev: AppState) => ({ ...prev, currentUser: student, currentRole: Role.STUDENT, selectedClass: student.MaLopHienTai }));
        setIsLoggedIn(true);
      } else { alert("Thông tin đăng nhập không chính xác!"); }
    } else {
      const teacher = teachers.find((t: Teacher) => t.MaGV === id);
      if (teacher && (teacher.MatKhau || '123456') === passwordInput) {
        const myAs = assignments.filter((a: Assignment) => a.MaGV === id);
        const cnAs = myAs.find((a: Assignment) => a.LoaiPhanCong === Role.CHU_NHIEM);
        setState((prev: AppState) => ({ 
          ...prev, 
          currentUser: teacher, 
          currentRole: cnAs ? Role.CHU_NHIEM : Role.GIANG_DAY,
          selectedClass: cnAs?.MaLop || myAs[0]?.MaLop || ''
        }));
        setIsLoggedIn(true);
      } else { alert("Thông tin đăng nhập không chính xác!"); }
    }
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
      alert("Đã đồng bộ điểm lên Cloud!");
    } catch (error: any) { handleSupabaseError(error, "Cập nhật điểm số"); }
  };

  const handleUpdateTasks = async (newTasks: AssignmentTask[]) => {
    if (!isSupabaseConfigured) return;
    try {
      const { error } = await supabase.from('tasks').upsert(newTasks);
      if (error) throw error;
      await fetchData();
    } catch (error: any) { handleSupabaseError(error, "Giao nhiệm vụ"); }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!isSupabaseConfigured) return;
    try {
      const { error } = await supabase.from('tasks').delete().eq('MaNhiemVu', taskId);
      if (error) throw error;
      await fetchData();
    } catch (error: any) { handleSupabaseError(error, "Xóa nhiệm vụ"); }
  };

  const handleUpdateDisciplines = async (newDisciplines: Discipline[]) => {
    if (!isSupabaseConfigured) return;
    try {
      const { error } = await supabase.from('disciplines').insert(newDisciplines);
      if (error) throw error;
      await fetchData();
      alert("✅ Đã ghi nhận kỷ luật lên Cloud thành công!");
    } catch (err: any) { handleSupabaseError(err, "Lưu kỷ luật"); }
  };

  const handleUpdateViolationRules = async (newRules: ViolationRule[]) => {
    if (!isSupabaseConfigured) return;
    try {
      const { error } = await supabase.from('violation_rules').upsert(newRules);
      if (error) throw error;
      await fetchData();
    } catch (err: any) { handleSupabaseError(err, "Cấu hình quy tắc"); }
  };

  const handleAddYear = async () => {
    if (!newYearName.trim() || !isSupabaseConfigured) return;
    const { error } = await supabase.from('academic_years').insert([{ TenNienHoc: newYearName }]);
    if (error) handleSupabaseError(error, "Thêm niên học");
    else { setNewYearName(''); await fetchData(); }
  };

  if (!isSupabaseConfigured && !isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-sans">
        <div className="bg-white/95 backdrop-blur-xl w-full max-w-2xl rounded-[48px] shadow-2xl p-12 text-center relative z-10">
          <CloudOff size={48} className="mx-auto mb-8 text-rose-600" />
          <h1 className="text-3xl font-black mb-4 uppercase">Chưa cấu hình Cloud</h1>
          <button onClick={() => window.location.reload()} className="px-8 py-4 bg-slate-800 text-white rounded-2xl font-black uppercase tracking-widest text-xs">Thử lại</button>
        </div>
      </div>
    );
  }

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-indigo-600" size={48} /></div>;

  if (!isLoggedIn) return <Login onLogin={handleLogin} teachers={teachers} students={students} />;

  if (state.currentRole === Role.STUDENT && state.currentUser) {
    return (
      <StudentPortal 
        student={state.currentUser as Student} 
        grades={grades} 
        disciplines={disciplines} 
        tasks={tasks}
        onLogout={() => setIsLoggedIn(false)}
        onToggleTask={async (taskId: number, link?: string) => {
          const task = tasks.find((t: AssignmentTask) => t.MaNhiemVu === taskId);
          if (!task) return;
          const studentId = (state.currentUser as Student).MaHS;
          const isDone = task.DanhSachHoanThanh.includes(studentId);
          
          const updatedTask = {
            ...task,
            DanhSachHoanThanh: isDone && !link ? task.DanhSachHoanThanh.filter(id => id !== studentId) : Array.from(new Set([...task.DanhSachHoanThanh, studentId])),
            BaoCaoNhiemVu: {
              ...(task.BaoCaoNhiemVu || {}),
              [studentId]: link || ''
            }
          };
          await handleUpdateTasks([updatedTask]);
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
              <button onClick={() => setState((p: AppState) => ({...p, currentRole: Role.CHU_NHIEM}))} className={`text-[10px] py-2 rounded-lg font-black uppercase transition-all ${state.currentRole === Role.CHU_NHIEM ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>Chủ nhiệm</button>
              <button onClick={() => setState((p: AppState) => ({...p, currentRole: Role.GIANG_DAY}))} className={`text-[10px] py-2 rounded-lg font-black uppercase transition-all ${state.currentRole === Role.GIANG_DAY ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>Giảng dạy</button>
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
          <button onClick={() => setIsLoggedIn(false)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"><LogOut size={20} />Thoát Cloud</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 px-8 flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-8">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Niên học</span>
              <div className="flex items-center gap-1">
                <select value={state.selectedYear} onChange={(e) => setState((prev: AppState) => ({ ...prev, selectedYear: parseInt(e.target.value) }))} className="text-base font-black border-none bg-transparent outline-none cursor-pointer text-gray-800 appearance-none pr-1">
                  {years.map((y: AcademicYear) => <option key={y.MaNienHoc} value={y.MaNienHoc}>{y.TenNienHoc}</option>)}
                </select>
                <ChevronRight size={14} className="text-gray-400 mt-1" />
              </div>
            </div>
            <div className="flex flex-col border-l pl-8">
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Lớp</span>
              <div className="flex items-center gap-1 bg-indigo-50 px-3 py-1 rounded-xl mt-0.5 border border-indigo-100">
                <select value={state.selectedClass} onChange={(e) => setState((prev: AppState) => ({ ...prev, selectedClass: e.target.value }))} className="text-base font-black border-none bg-transparent text-indigo-700 outline-none cursor-pointer appearance-none">
                  {filteredClasses.length > 0 ? (
                    filteredClasses.map((c: Class) => <option key={c.MaLop} value={c.MaLop}>{c.TenLop}</option>)
                  ) : (
                    <option value="">(Không có lớp)</option>
                  )}
                </select>
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
              <Database size={64} className="text-amber-500 mb-6"/>
              <h3 className="text-2xl font-black text-gray-800 mb-2">Chưa có lớp cho vai trò này</h3>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && <Dashboard state={state} students={students.filter((s: Student) => s.MaLopHienTai === state.selectedClass)} grades={grades} disciplines={disciplines} />}
              {activeTab === 'students' && (
                <StudentList 
                  state={state} students={students.filter((s: Student) => s.MaLopHienTai === state.selectedClass)} grades={grades} logs={logs} disciplines={disciplines}
                  onAddStudent={async (s: Student) => { try { const { error } = await supabase.from('students').insert([s]); if (error) throw error; await fetchData(); } catch(e) { handleSupabaseError(e, "Thêm học sinh"); } }}
                  onAddStudents={async (newItems: Student[]) => { try { const { error } = await supabase.from('students').insert(newItems); if (error) throw error; await fetchData(); } catch(e) { handleSupabaseError(e, "Nhập học sinh"); } }}
                  onUpdateStudent={async (s: Student) => { try { const { error } = await supabase.from('students').update(s).eq('MaHS', s.MaHS); if (error) throw error; await fetchData(); } catch(e) { handleSupabaseError(e, "Cập nhật học sinh"); } }} 
                  onDeleteStudent={async (id: string) => { if(confirm("Xóa học sinh này?")) { try { const { error } = await supabase.from('students').delete().eq('MaHS', id); if (error) throw error; await fetchData(); } catch(e) { handleSupabaseError(e, "Xóa học sinh"); } } }} 
                />
              )}
              {activeTab === 'grades' && <GradeBoard state={state} students={students.filter((s: Student) => s.MaLopHienTai === state.selectedClass)} grades={grades} onUpdateGrades={handleUpdateGrades} />}
              {activeTab === 'tasks' && <TaskManager state={state} students={students.filter((s: Student) => s.MaLopHienTai === state.selectedClass)} tasks={tasks} onUpdateTasks={handleUpdateTasks} onDeleteTask={handleDeleteTask} />}
              {activeTab === 'discipline' && <DisciplineManager state={state} students={students.filter((s: Student) => s.MaLopHienTai === state.selectedClass)} disciplines={disciplines} violationRules={violationRules} onUpdateDisciplines={handleUpdateDisciplines} onUpdateRules={handleUpdateViolationRules} />}
              {activeTab === 'logs' && <LearningLogs state={state} students={students.filter((s: Student) => s.MaLopHienTai === state.selectedClass)} logs={logs} assignment={currentAssignment!} onUpdateLogs={async (l: LearningLog[]) => { try { const { error } = await supabase.from('learning_logs').insert(l); if (error) throw error; await fetchData(); } catch(e) { handleSupabaseError(e, "Điểm danh"); } }} />}
            </>
          )}
        </div>
      </main>
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-5xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-8 py-5 border-b flex items-center justify-between">
               <h3 className="font-black text-xl text-gray-800">Cấu hình hệ thống</h3>
               <button onClick={() => { setIsSettingsOpen(false); fetchData(); }} className="p-2 hover:bg-gray-100 rounded-full"><X size={24}/></button>
            </div>
            <div className="flex-1 p-8 space-y-4">
              <div className="bg-gray-50 p-6 rounded-3xl border">
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Tên niên học mới</label>
                <div className="flex gap-2">
                  <input type="text" value={newYearName} onChange={e => setNewYearName(e.target.value)} placeholder="VD: 2026-2027" className="flex-1 px-4 py-2 border rounded-xl" />
                  <button onClick={handleAddYear} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold">Thêm</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
