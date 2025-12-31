
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

      // Thiết lập năm học mặc định nếu chưa có
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

  // Lọc lớp học dựa trên vai trò đang chọn (Chủ nhiệm / Giảng dạy)
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

  // Tự động chọn lớp đầu tiên trong danh sách lọc khi danh sách thay đổi (VD: khi chuyển tab vai trò)
  useEffect(() => {
    if (filteredClasses.length > 0) {
      const currentExists = filteredClasses.some(c => c.MaLop === state.selectedClass);
      if (!currentExists) {
        setState(prev => ({ ...prev, selectedClass: filteredClasses[0].MaLop }));
      }
    } else if (isLoggedIn && state.currentUser && !(state.currentUser as any).MaHS) {
      // Nếu không có lớp nào phù hợp vai trò, xóa selectedClass
      setState(prev => ({ ...prev, selectedClass: '' }));
    }
  }, [filteredClasses, state.currentRole]);

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
        const myAs = assignments.filter(a => a.MaGV === id);
        const cnAs = myAs.find(a => a.LoaiPhanCong === Role.CHU_NHIEM);
        
        setState(prev => ({ 
          ...prev, 
          currentUser: teacher, 
          currentRole: cnAs ? Role.CHU_NHIEM : Role.GIANG_DAY,
          selectedClass: cnAs?.MaLop || myAs[0]?.MaLop || ''
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
    if (error) alert("Lỗi: " + error.message);
    else if (data) {
      await fetchData();
      setNewYearName('');
      alert("Đã thêm niên học!");
    }
  };

  const handleAddTeacher = async () => {
    if (!newTeacherID || !newTeacherName) return;
    const { data, error } = await supabase.from('teachers').insert([{ 
      MaGV: newTeacherID, Hoten: newTeacherName, MaMonChinh: 'TOAN', MatKhau: '123456'
    }]).select();
    if (error) alert("Lỗi: " + error.message);
    else if (data) {
      await fetchData();
      setNewTeacherID(''); setNewTeacherName('');
      alert("Đã thêm giáo viên!");
    }
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
      // Tự động phân công chủ nhiệm
      const { error: assignError } = await supabase.from('assignments').insert([{
        MaGV: selectedTeacherID, MaLop: classData[0].MaLop, MaNienHoc: state.selectedYear, LoaiPhanCong: Role.CHU_NHIEM, MaMonHoc: null
      }]);
      if (assignError) console.error("Lỗi phân công CN:", assignError.message);
    }
    
    await fetchData();
    setNewClassID(''); setNewClassName(''); setSelectedTeacherID('');
    alert("Đã tạo lớp và phân công chủ nhiệm thành công!");
  };

  const handleAddTeachingAssignment = async () => {
    if (!assignGV || !assignClass || !assignSub) {
      alert("Vui lòng chọn đầy đủ thông tin phân công!");
      return;
    }
    const { data, error } = await supabase.from('assignments').insert([{
      MaGV: assignGV, MaLop: assignClass, MaNienHoc: state.selectedYear, LoaiPhanCong: Role.GIANG_DAY, MaMonHoc: assignSub
    }]).select();
    
    if (error) {
      alert("Lỗi phân công: " + error.message);
    } else if (data) {
      await fetchData();
      alert("Đã phân công giảng dạy!");
    }
  };

  const handleDeleteAssignment = async (id: number) => {
    if (confirm("Gỡ bỏ phân công này?")) {
      const { error } = await supabase.from('assignments').delete().eq('MaPhanCong', id);
      if (!error) await fetchData();
    }
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
                    <option value="">(Không có lớp)</option>
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
             <button onClick={() => setIsSettingsOpen(true)} className="p-2.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all shadow-sm bg-white border border-gray-100">
               <Settings size={22} />
             </button>
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
                  onAddStudent={async s => { await supabase.from('students').insert([s]); await fetchData(); }}
                  onAddStudents={async newItems => { await supabase.from('students').insert(newItems); await fetchData(); }}
                  onUpdateStudent={async s => { await supabase.from('students').update(s).eq('MaHS', s.MaHS); await fetchData(); }} 
                  onDeleteStudent={async id => { if(confirm("Xóa học sinh?")) { await supabase.from('students').delete().eq('MaHS', id); await fetchData(); } }} 
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
            <div className="p-8 border-b flex items-center justify-between">
               <h3 className="font-black text-2xl text-gray-800">Cấu hình Hệ thống Cloud</h3>
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
                  <div className="grid grid-cols-1 gap-2">
                    {years.map(y => <div key={y.MaNienHoc} className="flex justify-between p-4 bg-gray-50 rounded-xl font-bold"><span>{y.TenNienHoc}</span></div>)}
                  </div>
                </div>
              )}
              {settingsTab === 'teachers' && (
                <div className="max-w-2xl space-y-4">
                  <div className="grid grid-cols-2 gap-4"><input type="text" placeholder="Mã GV" value={newTeacherID} onChange={e => setNewTeacherID(e.target.value)} className="px-4 py-2 border rounded-xl" /><input type="text" placeholder="Họ và Tên" value={newTeacherName} onChange={e => setNewTeacherName(e.target.value)} className="px-4 py-2 border rounded-xl" /></div>
                  <button onClick={handleAddTeacher} className="w-full py-3 bg-amber-600 text-white rounded-xl font-bold uppercase">Đăng ký Giáo viên</button>
                  <div className="grid grid-cols-2 gap-2">
                    {teachers.map(t => <div key={t.MaGV} className="p-3 bg-gray-50 rounded-xl border"><b>{t.Hoten}</b><br/><span className="text-[10px] text-gray-400 font-black uppercase">ID: {t.MaGV}</span></div>)}
                  </div>
                </div>
              )}
              {settingsTab === 'classes' && (
                <div className="max-w-2xl space-y-4">
                  <div className="grid grid-cols-2 gap-4"><input type="text" placeholder="Mã lớp" value={newClassID} onChange={e => setNewClassID(e.target.value)} className="px-4 py-2 border rounded-xl" /><input type="text" placeholder="Tên lớp" value={newClassName} onChange={e => setNewClassName(e.target.value)} className="px-4 py-2 border rounded-xl" /></div>
                  <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase">Gán giáo viên chủ nhiệm</label><select value={selectedTeacherID} onChange={e => setSelectedTeacherID(e.target.value)} className="w-full px-4 py-2 border rounded-xl"><option value="">-- Chọn GV --</option>{teachers.map(t => <option key={t.MaGV} value={t.MaGV}>{t.Hoten}</option>)}</select></div>
                  <button onClick={handleAddClass} className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold uppercase">Tạo lớp học</button>
                </div>
              )}
              {settingsTab === 'assignments' && (
                <div className="max-w-4xl space-y-4">
                  <div className="bg-rose-50 p-6 rounded-3xl border border-rose-100 grid grid-cols-3 gap-4">
                    <select value={assignGV} onChange={e => setAssignGV(e.target.value)} className="px-4 py-3 bg-white border rounded-xl text-sm font-bold"><option value="">-- Giáo viên --</option>{teachers.map(t => <option key={t.MaGV} value={t.MaGV}>{t.Hoten}</option>)}</select>
                    <select value={assignClass} onChange={e => setAssignClass(e.target.value)} className="px-4 py-3 bg-white border rounded-xl text-sm font-bold"><option value="">-- Lớp học --</option>{classes.map(c => <option key={c.MaLop} value={c.MaLop}>{c.TenLop}</option>)}</select>
                    <select value={assignSub} onChange={e => setAssignSub(e.target.value)} className="px-4 py-3 bg-white border rounded-xl text-sm font-bold"><option value="">-- Môn học --</option>{SUBJECTS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                    <button onClick={handleAddTeachingAssignment} className="col-span-3 py-3 bg-rose-600 text-white rounded-xl font-bold uppercase shadow-lg">Xác nhận phân công dạy</button>
                  </div>
                  <div className="bg-white rounded-[32px] border overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <tr><th className="px-6 py-4">Giáo viên</th><th className="px-6 py-4">Lớp</th><th className="px-6 py-4">Vai trò / Môn</th><th className="px-6 py-4 text-right">Gỡ</th></tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {assignments.filter(a => a.MaNienHoc === state.selectedYear).map(a => {
                          const t = teachers.find(item => item.MaGV === a.MaGV);
                          const subName = a.LoaiPhanCong === Role.CHU_NHIEM ? 'Chủ nhiệm' : (SUBJECTS.find(s => s.id === a.MaMonHoc)?.name || a.MaMonHoc);
                          return (
                            <tr key={a.MaPhanCong} className="text-sm">
                              <td className="px-6 py-4 font-bold">{t?.Hoten}</td>
                              <td className="px-6 py-4 font-black text-indigo-600">{a.MaLop}</td>
                              <td className="px-6 py-4 font-bold text-gray-500 uppercase text-[10px]">{subName}</td>
                              <td className="px-6 py-4 text-right"><button onClick={() => handleDeleteAssignment(a.MaPhanCong)} className="text-rose-600 hover:bg-rose-50 p-2 rounded-lg transition-colors"><Trash2 size={16}/></button></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            <div className="p-8 bg-gray-50 border-t flex justify-end">
               <button onClick={() => { setIsSettingsOpen(false); fetchData(); }} className="px-12 py-3 bg-gray-900 text-white rounded-2xl font-black shadow-xl">Đóng cấu hình</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
