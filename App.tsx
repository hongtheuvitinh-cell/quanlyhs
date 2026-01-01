
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, GraduationCap, ClipboardList, ShieldAlert, LayoutDashboard, LogOut,
  Send, Plus, Loader2, BookOpen, UserCheck, Settings, Database, ChevronRight, Lock, Shield, X, Save
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';
import { Role, AppState, Student, Grade, Assignment, LearningLog, Discipline, AcademicYear, Class, ViolationRule, AssignmentTask, Teacher } from './types';
import StudentList from './components/StudentList';
import GradeBoard from './components/GradeBoard';
import Dashboard from './components/Dashboard';
import DisciplineManager from './components/DisciplineManager';
import LearningLogs from './components/LearningLogs';
import TaskManager from './components/TaskManager';
import SystemManager from './components/SystemManager';
import Login from './components/Login';
import StudentPortal from './components/StudentPortal';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'students' | 'grades' | 'discipline' | 'logs' | 'tasks' | 'system'>('dashboard');
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  
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

  const [passwordForm, setPasswordForm] = useState({ old: '', new: '', confirm: '' });

  const fetchData = async () => {
    if (!isSupabaseConfigured) { setIsLoading(false); return; }
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
      
      // Đồng bộ thông tin user hiện tại nếu có thay đổi
      if (state.currentUser) {
        if ((state.currentUser as any).MaHS) {
          const freshUser = (stData as Student[])?.find((s: Student) => s.MaHS === (state.currentUser as Student).MaHS);
          if (freshUser) setState(p => ({ ...p, currentUser: freshUser }));
        } else {
          const freshUser = (tcData as Teacher[])?.find((t: Teacher) => t.MaGV === (state.currentUser as Teacher).MaGV);
          if (freshUser) setState(p => ({ ...p, currentUser: freshUser }));
        }
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

  const handleLogin = (role: Role, id: string, pass: string) => {
    if (role === Role.STUDENT) {
      const s = students.find((x: Student) => x.MaHS === id);
      if (s && (s.MatKhau || '123456') === pass) {
        setState(p => ({ ...p, currentUser: s, currentRole: Role.STUDENT, selectedClass: s.MaLopHienTai }));
        setIsLoggedIn(true);
      } else alert("Mã HS hoặc mật khẩu không chính xác!");
    } else {
      const t = teachers.find((x: Teacher) => x.MaGV === id);
      if (t && (t.MatKhau || '123456') === pass) {
        const myAs = assignments.filter(a => a.MaGV === id);
        const initialRole = myAs.some(a => a.LoaiPhanCong === Role.CHU_NHIEM) ? Role.CHU_NHIEM : Role.GIANG_DAY;
        const initialClass = myAs.find(a => a.LoaiPhanCong === initialRole)?.MaLop || (myAs[0]?.MaLop || '');
        setState(p => ({ ...p, currentUser: t, currentRole: initialRole, selectedClass: initialClass }));
        setIsLoggedIn(true);
      } else alert("Mã GV hoặc mật khẩu không chính xác!");
    }
  };

  const handleUpdateTeacherPassword = async () => {
    const t = state.currentUser as Teacher;
    if (!t) return;
    if (!passwordForm.old || !passwordForm.new || !passwordForm.confirm) { alert("Vui lòng nhập đủ thông tin!"); return; }
    if (passwordForm.new !== passwordForm.confirm) { alert("Xác nhận mật khẩu không khớp!"); return; }
    if (passwordForm.old !== (t.MatKhau || '123456')) { alert("Mật khẩu cũ không chính xác!"); return; }
    
    setIsLoading(true);
    try {
      const { error } = await supabase.from('teachers').update({ MatKhau: passwordForm.new }).eq('MaGV', t.MaGV);
      if (error) throw error;
      alert("Đã cập nhật mật khẩu thành công!");
      setIsPasswordModalOpen(false);
      setPasswordForm({ old: '', new: '', confirm: '' });
      await fetchData();
    } catch (e: any) { alert(e.message); }
    finally { setIsLoading(false); }
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>;
  
  if (!isLoggedIn) return <Login onLogin={handleLogin} teachers={teachers} students={students} />;

  // TRANG CỦA HỌC SINH
  if (state.currentRole === Role.STUDENT) {
    return (
      <StudentPortal 
        student={state.currentUser as Student} 
        grades={grades} 
        disciplines={disciplines} 
        tasks={tasks} 
        onLogout={() => setIsLoggedIn(false)} 
        onToggleTask={(taskId: number, link?: string) => { console.log(taskId, link); }} 
        onUpdateProfile={fetchData} 
      />
    );
  }

  // TRANG CỦA GIÁO VIÊN
  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden text-[13px] font-normal text-slate-600">
      <aside className="w-60 bg-white border-r border-slate-200 flex flex-col shrink-0 shadow-sm relative z-20">
        <div className="p-5 flex items-center gap-2.5 border-b border-slate-50">
          <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-indigo-100 shadow-lg"><GraduationCap size={18} /></div>
          <h1 className="font-bold text-base text-slate-800 tracking-tight">EduManager</h1>
        </div>
        
        <div className="p-4">
           <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[9px] font-bold uppercase text-slate-400 mb-2 px-1 tracking-widest">Chế độ làm việc</p>
              <div className="flex p-1 bg-white rounded-xl border border-slate-100">
                <button 
                  onClick={() => setState(p => ({...p, currentRole: Role.CHU_NHIEM}))}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all ${state.currentRole === Role.CHU_NHIEM ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <UserCheck size={11}/> CN
                </button>
                <button 
                  onClick={() => setState(p => ({...p, currentRole: Role.GIANG_DAY}))}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all ${state.currentRole === Role.GIANG_DAY ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <BookOpen size={11}/> GD
                </button>
              </div>
           </div>
        </div>

        <nav className="flex-1 px-3 space-y-0.5 pt-2 overflow-y-auto custom-scrollbar">
          <p className="text-[9px] font-bold uppercase text-slate-400 mb-2 px-2 tracking-widest mt-4">Nghiệp vụ</p>
          {[
            { id: 'dashboard', label: 'Bàn làm việc', icon: LayoutDashboard },
            { id: 'students', label: 'Học sinh & SYLL', icon: Users },
            { id: 'grades', label: 'Bảng điểm môn', icon: GraduationCap },
            { id: 'tasks', label: 'Giao bài tập', icon: Send },
            { id: 'discipline', label: 'Kỷ luật rèn luyện', icon: ShieldAlert },
            { id: 'logs', label: 'Nhật ký tiết học', icon: ClipboardList },
          ].map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl font-bold transition-all ${activeTab === item.id ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}>
              <item.icon size={16} /> <span className="flex-1 text-left">{item.label}</span>
              {activeTab === item.id && <ChevronRight size={12} />}
            </button>
          ))}

          <p className="text-[9px] font-bold uppercase text-slate-400 mb-2 px-2 tracking-widest mt-8">Quản trị</p>
          <button onClick={() => setActiveTab('system')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl font-bold transition-all ${activeTab === 'system' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
            <Settings size={16} /> <span className="flex-1 text-left">Cấu hình hệ thống</span>
            {activeTab === 'system' && <ChevronRight size={12} />}
          </button>
        </nav>
        
        <div className="p-4 mt-auto border-t border-slate-50">
          <button onClick={() => setIsLoggedIn(false)} className="w-full flex items-center gap-3 px-3 py-2 text-rose-500 font-bold hover:bg-rose-50 rounded-xl transition-all"><LogOut size={16}/> Đăng xuất</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-white">
        <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 relative z-10">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Niên học:</span>
              <select value={state.selectedYear} onChange={e => setState(p => ({...p, selectedYear: parseInt(e.target.value)}))} className="font-bold border-none outline-none bg-slate-50 px-2 py-1 rounded-lg text-slate-700">{years.map(y => <option key={y.MaNienHoc} value={y.MaNienHoc}>{y.TenNienHoc}</option>)}</select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lớp:</span>
              <select value={state.selectedClass} onChange={e => setState(p => ({...p, selectedClass: e.target.value}))} className="font-bold border-none outline-none bg-slate-50 px-2 py-1 rounded-lg text-slate-700">{filteredClasses.map(c => <option key={c.MaLop} value={c.MaLop}>{c.TenLop}</option>)}</select>
            </div>
          </div>
          <div className="flex items-center gap-4 cursor-pointer hover:bg-slate-50 p-1 px-3 rounded-xl transition-all" onClick={() => setIsPasswordModalOpen(true)}>
             <div className="text-right">
                <p className="text-[11px] font-bold text-slate-800 leading-none mb-1">{(state.currentUser as Teacher)?.Hoten}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Giáo viên {state.currentRole === Role.CHU_NHIEM ? 'Chủ nhiệm' : 'Giảng dạy'}</p>
             </div>
             <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold border border-indigo-100">{(state.currentUser as Teacher)?.Hoten?.charAt(0)}</div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50/30">
          {activeTab === 'dashboard' && <Dashboard state={state} students={students.filter(s => s.MaLopHienTai === state.selectedClass)} grades={grades} disciplines={disciplines} />}
          {activeTab === 'system' && <SystemManager years={years} classes={classes} teachers={teachers} assignments={assignments} onUpdate={fetchData} />}
          {activeTab === 'discipline' && (
            <DisciplineManager 
              state={state} 
              students={students.filter(s => s.MaLopHienTai === state.selectedClass)} 
              disciplines={disciplines.filter(d => students.filter(s => s.MaLopHienTai === state.selectedClass).some(s => s.MaHS === d.MaHS))} 
              violationRules={violationRules} 
              onUpdateDisciplines={l => supabase.from('disciplines').upsert(l).then(fetchData)} 
              onDeleteDiscipline={id => supabase.from('disciplines').delete().eq('MaKyLuat', id).then(fetchData)}
              onUpdateRules={r => supabase.from('violation_rules').upsert(r).then(fetchData)} 
            />
          )}
          {activeTab === 'students' && <StudentList state={state} students={students.filter(s => s.MaLopHienTai === state.selectedClass)} grades={grades} logs={logs} disciplines={disciplines} onAddStudent={s => supabase.from('students').insert([s]).then(fetchData)} onAddStudents={s => supabase.from('students').insert(s).then(fetchData)} onUpdateStudent={s => supabase.from('students').update(s).eq('MaHS', s.MaHS).then(fetchData)} onDeleteStudent={id => supabase.from('students').delete().eq('MaHS', id).then(fetchData)} />}
          {activeTab === 'grades' && <GradeBoard state={state} students={students.filter(s => s.MaLopHienTai === state.selectedClass)} grades={grades} onUpdateGrades={g => fetchData()} />}
          {activeTab === 'tasks' && <TaskManager state={state} students={students.filter(s => s.MaLopHienTai === state.selectedClass)} tasks={tasks} onUpdateTasks={t => fetchData()} onDeleteTask={id => fetchData()} />}
          {activeTab === 'logs' && (
            <LearningLogs 
              state={state} 
              students={students.filter(s => s.MaLopHienTai === state.selectedClass)} 
              logs={logs} 
              assignment={currentAssignment!} 
              onUpdateLogs={l => supabase.from('learning_logs').upsert(l).then(fetchData)} 
              onDeleteLog={id => supabase.from('learning_logs').delete().eq('MaTheoDoi', id).then(fetchData)}
            />
          )}
        </div>
      </main>

      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95">
             <div className="p-6 border-b flex items-center justify-between">
                <h3 className="font-black text-sm text-slate-800 uppercase tracking-tight flex items-center gap-2"><Lock size={18} className="text-indigo-600"/> Đổi mật khẩu Giáo viên</h3>
                <button onClick={() => setIsPasswordModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20}/></button>
             </div>
             <div className="p-6 space-y-4">
                <div className="space-y-1">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Mật khẩu cũ</label>
                   <input type="password" value={passwordForm.old} onChange={e => setPasswordForm({...passwordForm, old: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-indigo-400" />
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Mật khẩu mới</label>
                   <input type="password" value={passwordForm.new} onChange={e => setPasswordForm({...passwordForm, new: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-indigo-400" />
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Xác nhận mật khẩu mới</label>
                   <input type="password" value={passwordForm.confirm} onChange={e => setPasswordForm({...passwordForm, confirm: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-indigo-400" />
                </div>
             </div>
             <div className="p-4 bg-slate-50 border-t flex gap-3">
                <button onClick={() => setIsPasswordModalOpen(false)} className="flex-1 py-3 bg-white border border-slate-200 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest">Hủy</button>
                <button onClick={handleUpdateTeacherPassword} className="flex-[2] py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-2"><Save size={16}/> Cập nhật</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
