
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
  Loader2
} from 'lucide-react';
import { supabase } from './services/supabaseClient';
import { Role, AppState, Student, Grade, Assignment, LearningLog, Discipline, AcademicYear, Class, ViolationRule, AssignmentTask, Teacher } from './types';
import { mockTeachers, mockAcademicYears, mockClasses, mockAssignments, mockViolationRules } from './data/mockData';
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
  
  const [years, setYears] = useState<AcademicYear[]>(mockAcademicYears);
  const [classes, setClasses] = useState<Class[]>(mockClasses);
  const [assignments, setAssignments] = useState<Assignment[]>(mockAssignments);
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [violationRules, setViolationRules] = useState<ViolationRule[]>(mockViolationRules);
  const [logs, setLogs] = useState<LearningLog[]>([]);
  const [tasks, setTasks] = useState<AssignmentTask[]>([]);
  
  const [state, setState] = useState<AppState>({
    currentUser: null,
    currentRole: Role.CHU_NHIEM,
    selectedClass: '12A1',
    selectedYear: 1,
    selectedSubject: null
  });

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [
          { data: stData },
          { data: grData },
          { data: dsData },
          { data: lgData },
          { data: tkData },
          { data: rlData }
        ] = await Promise.all([
          supabase.from('students').select('*'),
          supabase.from('grades').select('*'),
          supabase.from('disciplines').select('*'),
          supabase.from('learning_logs').select('*'),
          supabase.from('tasks').select('*'),
          supabase.from('violation_rules').select('*')
        ]);

        if (stData) setStudents(stData);
        if (grData) setGrades(grData);
        if (dsData) setDisciplines(dsData);
        if (lgData) setLogs(lgData);
        if (tkData) setTasks(tkData);
        if (rlData && rlData.length > 0) setViolationRules(rlData);
      } catch (err) {
        console.error("Lỗi fetch dữ liệu Supabase:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleLogin = (role: Role, id: string) => {
    if (role === Role.STUDENT) {
      const student = students.find(s => s.MaHS === id);
      if (student) {
        setState(prev => ({ ...prev, currentUser: student, currentRole: Role.STUDENT }));
        setIsLoggedIn(true);
      } else {
        alert("Không tìm thấy mã Học sinh!");
      }
    } else {
      const teacher = mockTeachers.find(t => t.MaGV === id);
      if (teacher) {
        const cnAssignment = assignments.find(a => a.MaGV === id && a.LoaiPhanCong === Role.CHU_NHIEM);
        if (cnAssignment) {
           setState(prev => ({ ...prev, currentUser: teacher, currentRole: Role.CHU_NHIEM, selectedClass: cnAssignment.MaLop }));
        } else {
           setState(prev => ({ ...prev, currentUser: teacher, currentRole: Role.GIANG_DAY }));
        }
        setIsLoggedIn(true);
      } else {
        alert("Không tìm thấy mã Giáo viên!");
      }
    }
  };

  const handleUpdateGrades = async (newGrades: Grade[]) => {
    const updated = [...grades];
    newGrades.forEach(ng => {
      const idx = updated.findIndex(g => g.MaHS === ng.MaHS && g.MaMonHoc === ng.MaMonHoc && g.HocKy === ng.HocKy && g.LoaiDiem === ng.LoaiDiem);
      if (idx !== -1) updated[idx] = ng;
      else updated.push(ng);
    });
    setGrades(updated);
    await supabase.from('grades').upsert(newGrades);
  };

  const handleUpdateDisciplines = async (newDisciplines: Discipline[]) => {
    setDisciplines([...disciplines, ...newDisciplines]);
    await supabase.from('disciplines').insert(newDisciplines);
  };

  const handleUpdateLogs = async (newLogs: LearningLog[]) => {
    setLogs([...logs, ...newLogs]);
    await supabase.from('learning_logs').insert(newLogs);
  };

  const handleUpdateTasks = async (newTasks: AssignmentTask[]) => {
    setTasks(newTasks);
    await supabase.from('tasks').upsert(newTasks);
  };

  const handleToggleTaskForStudent = async (taskId: number) => {
    const studentUser = state.currentUser as Student;
    const task = tasks.find(t => t.MaNhiemVu === taskId);
    if (!task) return;

    const isDone = task.DanhSachHoanThanh.includes(studentUser.MaHS);
    const newDoneList = isDone 
      ? task.DanhSachHoanThanh.filter(id => id !== studentUser.MaHS) 
      : [...task.DanhSachHoanThanh, studentUser.MaHS];

    setTasks(prev => prev.map(t => t.MaNhiemVu === taskId ? { ...t, DanhSachHoanThanh: newDoneList } : t));
    await supabase.from('tasks').update({ DanhSachHoanThanh: newDoneList }).eq('MaNhiemVu', taskId);
  };

  if (isLoading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 text-center p-8">
      <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mb-6" />
      <h2 className="text-2xl font-black text-gray-800 mb-2">Đang kết nối Cloud Database</h2>
      <p className="text-gray-400 font-medium">EduManager đang đồng bộ dữ liệu của bạn...</p>
    </div>
  );

  if (!isLoggedIn) return <Login onLogin={handleLogin} />;

  if (state.currentRole === Role.STUDENT && state.currentUser) {
    const studentUser = state.currentUser as Student;
    return (
      <StudentPortal 
        student={studentUser}
        grades={grades.filter(g => g.MaHS === studentUser.MaHS)}
        disciplines={disciplines.filter(d => d.MaHS === studentUser.MaHS)}
        tasks={tasks.filter(t => t.MaLop === studentUser.MaLopHienTai)}
        onLogout={() => setIsLoggedIn(false)}
        onToggleTask={handleToggleTaskForStudent}
      />
    );
  }

  const teacher = state.currentUser as Teacher;
  const currentAssignment = assignments.find(a => a.MaGV === teacher.MaGV && a.MaLop === state.selectedClass);

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
              <div className="h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold border border-indigo-200">{teacher.Hoten.charAt(0)}</div>
              <div>
                <p className="font-bold text-sm text-gray-800">{teacher.Hoten}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase">GV Cloud ID: {teacher.MaGV}</p>
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
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Niên học</span>
              <select value={state.selectedYear} onChange={(e) => setState(prev => ({ ...prev, selectedYear: parseInt(e.target.value) }))} className="text-xs font-black border-none bg-transparent outline-none cursor-pointer text-gray-700">
                {years.map(y => <option key={y.MaNienHoc} value={y.MaNienHoc}>{y.TenNienHoc}</option>)}
              </select>
            </div>
            <ChevronRight className="text-gray-300" size={16} />
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-0.5">Lớp hiện tại</span>
              <select value={state.selectedClass} onChange={(e) => setState(prev => ({ ...prev, selectedClass: e.target.value }))} className="text-xs font-black border-none bg-indigo-50 text-indigo-700 rounded-lg px-2 py-1 outline-none cursor-pointer">
                {classes.map(c => <option key={c.MaLop} value={c.MaLop}>{c.TenLop}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                Cloud Active
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          {activeTab === 'dashboard' && <Dashboard state={state} students={students.filter(s => s.MaLopHienTai === state.selectedClass)} grades={grades} disciplines={disciplines} />}
          {activeTab === 'students' && (
            <StudentList 
              state={state} 
              students={students.filter(s => s.MaLopHienTai === state.selectedClass)} 
              grades={grades} 
              logs={logs} 
              disciplines={disciplines}
              onAddStudent={async s => {
                setStudents([...students, s]);
                await supabase.from('students').insert([s]);
              }}
              onAddStudents={async newItems => {
                setStudents([...students, ...newItems]);
                await supabase.from('students').insert(newItems);
              }}
              onUpdateStudent={async s => {
                setStudents(students.map(item => item.MaHS === s.MaHS ? s : item));
                await supabase.from('students').update(s).eq('MaHS', s.MaHS);
              }} 
              onDeleteStudent={async id => {
                if(confirm("Xóa học sinh này khỏi hệ thống Cloud?")) {
                  setStudents(students.filter(s => s.MaHS !== id));
                  await supabase.from('students').delete().eq('MaHS', id);
                }
              }} 
            />
          )}
          {activeTab === 'grades' && (
            <GradeBoard 
              state={state} 
              students={students.filter(s => s.MaLopHienTai === state.selectedClass)} 
              grades={grades} 
              onUpdateGrades={handleUpdateGrades} 
            />
          )}
          {activeTab === 'tasks' && (
            <TaskManager 
              state={state} 
              students={students.filter(s => s.MaLopHienTai === state.selectedClass)} 
              tasks={tasks} 
              onUpdateTasks={handleUpdateTasks} 
            />
          )}
          {activeTab === 'discipline' && (
            <DisciplineManager 
              state={state} 
              students={students.filter(s => s.MaLopHienTai === state.selectedClass)} 
              disciplines={disciplines} 
              violationRules={violationRules}
              onUpdateDisciplines={handleUpdateDisciplines}
              onUpdateRules={async r => {
                setViolationRules(r);
                await supabase.from('violation_rules').upsert(r);
              }}
            />
          )}
          {activeTab === 'logs' && (
            <LearningLogs 
              state={state} 
              students={students.filter(s => s.MaLopHienTai === state.selectedClass)} 
              logs={logs} 
              assignment={currentAssignment!} 
              onUpdateLogs={handleUpdateLogs}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
