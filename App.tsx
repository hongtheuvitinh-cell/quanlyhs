
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
  UserCheck
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

  // State cho việc thêm mới trong Settings
  const [newYearName, setNewYearName] = useState('');
  const [newClassName, setNewClassName] = useState('');
  const [newClassID, setNewClassID] = useState('');
  const [selectedTeacherID, setSelectedTeacherID] = useState('');

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

      if (yrData) {
        setYears(yrData);
        if (yrData.length > 0) setState(p => ({ ...p, selectedYear: yrData[0].MaNienHoc }));
      }
      if (clData) {
        setClasses(clData);
        if (clData.length > 0) setState(p => ({ ...p, selectedClass: clData[0].MaLop }));
      }
      if (tcData) setTeachers(tcData);
      else setTeachers(mockTeachers); // Fallback

      if (asData) setAssignments(asData);
      if (stData) setStudents(stData);
      if (grData) setGrades(grData);
      if (dsData) setDisciplines(dsData);
      if (lgData) setLogs(lgData);
      if (tkData) setTasks(tkData);
      if (rlData) setViolationRules(rlData);
    } catch (err) {
      console.error("Lỗi fetch dữ liệu Supabase:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
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
      const teacher = teachers.find(t => t.MaGV === id);
      if (teacher) {
        const cnAssignment = assignments.find(a => a.MaGV === id && a.LoaiPhanCong === Role.CHU_NHIEM && a.MaNienHoc === state.selectedYear);
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

  const handleAddYear = async () => {
    if (!newYearName) return;
    const newYear = { TenNienHoc: newYearName };
    const { data, error } = await supabase.from('academic_years').insert([newYear]).select();
    if (data) {
      setYears([data[0], ...years]);
      setNewYearName('');
      alert("Đã thêm niên học mới!");
    }
  };

  const handleDeleteYear = async (id: number) => {
    if (!confirm("Xóa niên học này sẽ ảnh hưởng đến toàn bộ dữ liệu liên quan. Xác nhận xóa?")) return;
    await supabase.from('academic_years').delete().eq('MaNienHoc', id);
    setYears(years.filter(y => y.MaNienHoc !== id));
  };

  const handleAddClass = async () => {
    if (!newClassID || !newClassName) {
      alert("Vui lòng nhập đầy đủ Mã lớp và Tên lớp!");
      return;
    }
    
    // 1. Tạo lớp mới
    const newCls = { MaLop: newClassID, TenLop: newClassName, Khoi: parseInt(newClassID) || 10 };
    const { data: classData, error: classError } = await supabase.from('classes').insert([newCls]).select();
    
    if (classError) {
      alert("Lỗi khi tạo lớp: " + classError.message);
      return;
    }

    if (classData) {
      const createdClass = classData[0];
      setClasses(prev => [...prev, createdClass]);

      // 2. Nếu có chọn GVCN, tạo bản ghi phân công ngay
      if (selectedTeacherID) {
        const newAssign = {
          MaGV: selectedTeacherID,
          MaLop: createdClass.MaLop,
          MaNienHoc: state.selectedYear,
          LoaiPhanCong: Role.CHU_NHIEM,
          MaMonHoc: null
        };
        const { data: assignData } = await supabase.from('assignments').insert([newAssign]).select();
        if (assignData) {
          setAssignments(prev => [...prev, assignData[0]]);
        }
      }

      setNewClassID('');
      setNewClassName('');
      setSelectedTeacherID('');
      alert(`🎉 Đã tạo lớp ${newClassName} thành công!`);
    }
  };

  const handleDeleteClass = async (id: string) => {
    if (!confirm(`Xóa lớp ${id}? Hành động này không thể hoàn tác.`)) return;
    const { error } = await supabase.from('classes').delete().eq('MaLop', id);
    if (!error) {
      setClasses(classes.filter(c => c.MaLop !== id));
    } else {
      alert("Không thể xóa lớp đang có dữ liệu ràng buộc.");
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
              <div>
                <p className="font-bold text-sm text-gray-800">{currentUserData?.Hoten}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase">GV Cloud ID: {currentUserData?.MaGV}</p>
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
                <select 
                  value={state.selectedYear} 
                  onChange={(e) => setState(prev => ({ ...prev, selectedYear: parseInt(e.target.value) }))} 
                  className="text-base font-black border-none bg-transparent outline-none cursor-pointer text-gray-800 appearance-none pr-1"
                >
                  {years.map(y => <option key={y.MaNienHoc} value={y.MaNienHoc}>{y.TenNienHoc}</option>)}
                </select>
                <div className="text-gray-800 mt-1"><ChevronRight size={14} /></div>
              </div>
            </div>
            
            <div className="flex items-center text-gray-200 h-8 self-center"><ChevronRight size={24} /></div>

            <div className="flex flex-col">
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Lớp hiện tại</span>
              <div className="flex items-center gap-1 bg-indigo-50 px-3 py-1 rounded-xl mt-0.5 border border-indigo-100 group">
                <select 
                  value={state.selectedClass} 
                  onChange={(e) => setState(prev => ({ ...prev, selectedClass: e.target.value }))} 
                  className="text-base font-black border-none bg-transparent text-indigo-700 outline-none cursor-pointer appearance-none"
                >
                  {classes.map(c => <option key={c.MaLop} value={c.MaLop}>{c.TenLop}</option>)}
                </select>
                <div className="text-indigo-700"><ChevronRight size={14} className="rotate-90" /></div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full text-[11px] font-black uppercase tracking-widest border border-emerald-100">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                Cloud Active
             </div>
             <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-transparent hover:border-indigo-100 shadow-sm bg-white"
             >
               <Settings size={22} />
             </button>
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

      {/* MODAL CẤU HÌNH HỆ THỐNG */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in">
          <div className="bg-white w-full max-w-5xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
            <div className="p-8 border-b flex items-center justify-between shrink-0">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-gray-900 text-white rounded-2xl"><Settings size={28}/></div>
                  <div>
                    <h3 className="font-black text-2xl text-gray-800 tracking-tight">Cấu hình Hệ thống</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Quản lý danh mục Niên học và Lớp học Cloud</p>
                  </div>
               </div>
               <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={28} className="text-gray-400"/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar grid grid-cols-1 md:grid-cols-2 gap-12">
              {/* QUẢN LÝ NIÊN HỌC */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-lg text-gray-800 flex items-center gap-2">
                    <Calendar size={20} className="text-indigo-600" /> Quản lý Niên học
                  </h4>
                </div>
                
                <div className="flex gap-2 p-1.5 bg-gray-50 rounded-2xl border border-gray-100">
                  <input 
                    type="text" 
                    placeholder="VD: 2025-2026" 
                    value={newYearName}
                    onChange={e => setNewYearName(e.target.value)}
                    className="flex-1 px-4 py-3 bg-white border border-transparent rounded-xl font-bold text-sm outline-none focus:ring-2 ring-indigo-500/20 shadow-sm"
                  />
                  <button onClick={handleAddYear} className="px-6 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase hover:bg-indigo-700 transition-all flex items-center gap-2">
                    <Plus size={16}/> Thêm
                  </button>
                </div>

                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                  {years.map(y => (
                    <div key={y.MaNienHoc} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 group hover:border-indigo-200 transition-all shadow-sm">
                      <div className="flex items-center gap-3">
                         <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
                         <span className="font-bold text-gray-700">{y.TenNienHoc}</span>
                      </div>
                      <button onClick={() => handleDeleteYear(y.MaNienHoc)} className="p-2 text-gray-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                    </div>
                  ))}
                </div>
              </div>

              {/* QUẢN LÝ LỚP HỌC */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-lg text-gray-800 flex items-center gap-2">
                    <Users size={20} className="text-emerald-600" /> Tạo Lớp & Phân công GVCN
                  </h4>
                </div>

                <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Mã lớp</label>
                      <input 
                        type="text" 
                        placeholder="VD: 12A1" 
                        value={newClassID}
                        onChange={e => setNewClassID(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-emerald-200 rounded-xl font-bold text-sm outline-none focus:ring-2 ring-emerald-500/20"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Tên lớp</label>
                      <input 
                        type="text" 
                        placeholder="VD: Lớp 12A1" 
                        value={newClassName}
                        onChange={e => setNewClassName(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-emerald-200 rounded-xl font-bold text-sm outline-none focus:ring-2 ring-emerald-500/20"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                      <UserCheck size={12}/> GV Chủ nhiệm
                    </label>
                    <select 
                      value={selectedTeacherID}
                      onChange={e => setSelectedTeacherID(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-emerald-200 rounded-xl font-bold text-sm outline-none focus:ring-2 ring-emerald-500/20 appearance-none"
                    >
                      <option value="">-- Chọn Giáo viên --</option>
                      {teachers.map(t => <option key={t.MaGV} value={t.MaGV}>{t.Hoten} ({t.MaGV})</option>)}
                    </select>
                  </div>

                  <button 
                    onClick={handleAddClass} 
                    className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase shadow-lg shadow-emerald-100 hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Save size={18}/> Xác nhận tạo lớp
                  </button>
                </div>

                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                  {classes.map(c => {
                    const gvcn = assignments.find(a => a.MaLop === c.MaLop && a.LoaiPhanCong === Role.CHU_NHIEM && a.MaNienHoc === state.selectedYear);
                    const teacher = teachers.find(t => t.MaGV === gvcn?.MaGV);
                    return (
                      <div key={c.MaLop} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 group shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-black text-xs border border-emerald-100">{c.MaLop}</div>
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-700">{c.TenLop}</span>
                            <span className="text-[10px] text-gray-400 font-bold uppercase">GVCN: {teacher?.Hoten || 'Chưa phân công'}</span>
                          </div>
                        </div>
                        <button onClick={() => handleDeleteClass(c.MaLop)} className="p-2 text-gray-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-8 bg-gray-50 border-t flex justify-end shrink-0">
               <button onClick={() => { setIsSettingsOpen(false); fetchData(); }} className="px-12 py-4 bg-gray-900 text-white rounded-2xl font-black shadow-xl hover:bg-black active:scale-95 transition-all text-sm uppercase tracking-widest">Hoàn tất cấu hình</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
