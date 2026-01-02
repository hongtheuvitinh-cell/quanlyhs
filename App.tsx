
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
    return assignments.find(a => 
      a.MaGV === (state.currentUser as Teacher).MaGV && 
      a.MaLop === state.selectedClass && 
      a.MaNienHoc === state.selectedYear &&
      a.LoaiPhanCong === state.currentRole
    );
  }, [assignments, state.currentUser, state.selectedClass, state.selectedYear, state.currentRole]);

  const handleLogin = (role: Role, id: string, pass: string) => {
    if (role === Role.STUDENT) {
      const s = students.find(x => x.MaHS === id);
      if (s && (s.MatKhau || '123456') === pass) {
        setState(p => ({ ...p, currentUser: s, currentRole: Role.STUDENT, selectedClass: s.MaLopHienTai, selectedYear: s.MaNienHoc }));
        setIsLoggedIn(true);
      } else alert("Sai thông tin đăng nhập học sinh!");
    } else {
      const t = teachers.find(x => x.MaGV === id);
      if (t && (t.MatKhau || '123456') === pass) {
        const myAs = assignments.filter(a => a.MaGV === id);
        if (myAs.length === 0) {
          alert("Giáo viên chưa được phân công lớp nào!");
          return;
        }
        const initialRole = myAs.some(a => a.LoaiPhanCong === Role.CHU_NHIEM) ? Role.CHU_NHIEM : Role.GIANG_DAY;
        setState(p => ({ ...p, currentUser: t, currentRole: initialRole, selectedClass: myAs[0]?.MaLop || '', selectedYear: myAs[0]?.MaNienHoc || state.selectedYear }));
        setIsLoggedIn(true);
      } else alert("Sai thông tin đăng nhập giáo viên!");
    }
  };

  const handleUpdateTeacherPassword = async () => {
    const t = state.currentUser as Teacher;
    if (!t) return;
    if (passwordForm.new !== passwordForm.confirm) { alert("Mật khẩu không khớp!"); return; }
    if (passwordForm.old !== (t.MatKhau || '123456')) { alert("Mật khẩu cũ sai!"); return; }
    setIsLoading(true);
    try {
      await supabase.from('teachers').update({ MatKhau: passwordForm.new }).eq('MaGV', t.MaGV);
      alert("Đã đổi mật khẩu!");
      setIsPasswordModalOpen(false);
      fetchData();
    } catch (e: any) { alert(e.message); }
    finally { setIsLoading(false); }
  };

  const handleToggleTask = async (taskId: number, link?: string) => {
    const student = state.currentUser as Student;
    if (!student) return;
    const task = tasks.find(t => t.MaNhiemVu === taskId);
    if (!task) return;

    let newDoneList = [...task.DanhSachHoanThanh];
    let newReports = { ...task.BaoCaoNhiemVu };

    if (newDoneList.includes(student.MaHS)) {
      newDoneList = newDoneList.filter(id => id !== student.MaHS);
      delete newReports[student.MaHS];
    } else {
      newDoneList.push(student.MaHS);
      if (link) newReports[student.MaHS] = link;
    }

    try {
      await supabase.from('tasks').update({ 
        DanhSachHoanThanh: newDoneList,
        BaoCaoNhiemVu: newReports
      }).eq('MaNhiemVu', taskId);
      fetchData();
    } catch (e) {
      alert("Lỗi cập nhật bài tập");
    }
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>;
  if (!isLoggedIn) return <Login onLogin={handleLogin} teachers={teachers} students={students} />;

  if (state.currentRole === Role.STUDENT) {
    return (
      <StudentPortal 
        student={state.currentUser as Student}
        grades={grades}
        disciplines={disciplines}
        violationRules={violationRules}
        tasks={tasks.filter(t => t.MaLop === state.selectedClass && t.DanhSachGiao.includes((state.currentUser as Student).MaHS))}
        onLogout={() => setIsLoggedIn(false)}
        onToggleTask={handleToggleTask}
        onUpdateProfile={() => fetchData()}
      />
    );
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden text-[13px] font-normal text-slate-600">
      <aside className="w-60 bg-white border-r border-slate-200 flex flex-col shrink-0 shadow-sm relative z-20">
        <div className="p-5 flex items-center gap-2.5 border-b border-slate-50">
          <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg"><GraduationCap size={18} /></div>
          <h1 className="font-bold text-base text-slate-800 tracking-tight">EduManager</h1>
        </div>
        <div className="p-4">
           <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[9px] font-bold uppercase text-slate-400 mb-2 px-1 tracking-widest text-center">Chế độ làm việc</p>
              <div className="flex p-1 bg-white rounded-xl border border-slate-100">
                <button 
                  onClick={() => setState(p => ({...p, currentRole: Role.CHU_NHIEM}))}
                  className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold uppercase ${state.currentRole === Role.CHU_NHIEM ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                >CN</button>
                <button 
                  onClick={() => setState(p => ({...p, currentRole: Role.GIANG_DAY}))}
                  className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold uppercase ${state.currentRole === Role.GIANG_DAY ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                >GD</button>
              </div>
           </div>
        </div>
        <nav className="flex-1 px-3 space-y-1 pt-2 overflow-y-auto custom-scrollbar">
          {[
            { id: 'dashboard', label: 'Bàn làm việc', icon: LayoutDashboard },
            { id: 'students', label: 'Học sinh & SYLL', icon: Users },
            { id: 'grades', label: 'Bảng điểm môn', icon: GraduationCap },
            { id: 'tasks', label: 'Giao bài tập', icon: Send },
            { id: 'discipline', label: 'Kỷ luật', icon: ShieldAlert },
            { id: 'logs', label: 'Nhật ký', icon: ClipboardList },
          ].map((item: any) => (
            <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl font-bold transition-all ${activeTab === item.id ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}>
              <item.icon size={16} /> <span className="flex-1 text-left">{item.label}</span>
            </button>
          ))}
          <button onClick={() => setActiveTab('system')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl font-bold mt-4 ${activeTab === 'system' ? 'bg-slate-900 text-white' : 'text-slate-500'}`}>
            <Settings size={16} /> <span>Cấu hình hệ thống</span>
          </button>
        </nav>
        <div className="p-4 mt-auto border-t border-slate-50">
          <button onClick={() => setIsLoggedIn(false)} className="w-full flex items-center gap-3 px-3 py-2 text-rose-500 font-bold hover:bg-rose-50 rounded-xl transition-all"><LogOut size={16}/> Đăng xuất</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-white">
        <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase">Niên học:</span>
              <select value={state.selectedYear} onChange={(e: any) => setState(p => ({...p, selectedYear: parseInt(e.target.value)}))} className="font-bold border-none outline-none bg-slate-50 px-2 py-1 rounded-lg text-slate-700">{years.map(y => <option key={y.MaNienHoc} value={y.MaNienHoc}>{y.TenNienHoc}</option>)}</select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase">Lớp:</span>
              <select value={state.selectedClass} onChange={(e: any) => setState(p => ({...p, selectedClass: e.target.value}))} className="font-bold border-none outline-none bg-slate-50 px-2 py-1 rounded-lg text-slate-700">{filteredClasses.map(c => <option key={c.MaLop} value={c.MaLop}>{c.TenLop}</option>)}</select>
            </div>
          </div>
          <div className="flex items-center gap-4 cursor-pointer p-1 px-3 rounded-xl hover:bg-slate-50" onClick={() => setIsPasswordModalOpen(true)}>
             <div className="text-right">
                <p className="text-[11px] font-bold text-slate-800">{(state.currentUser as Teacher)?.Hoten}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase">Giáo viên</p>
             </div>
             <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold border border-indigo-100">{(state.currentUser as Teacher)?.Hoten?.charAt(0)}</div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
          {activeTab === 'dashboard' && <Dashboard state={state} students={students.filter(s => s.MaLopHienTai === state.selectedClass)} grades={grades} disciplines={disciplines} />}
          {activeTab === 'system' && <SystemManager years={years} classes={classes} teachers={teachers} assignments={assignments} onUpdate={() => fetchData()} />}
          {activeTab === 'students' && (
            <StudentList 
              state={state} 
              students={students.filter(s => s.MaLopHienTai === state.selectedClass)} 
              grades={grades} 
              disciplines={disciplines}
              logs={logs}
              violationRules={violationRules}
              onUpdateStudent={(s) => supabase.from('students').upsert(s).then(() => fetchData())} 
              onDeleteStudent={async (id) => {
                if (!confirm(`Xóa học sinh ${id} sẽ xóa toàn bộ điểm số, kỷ luật và nhật ký liên quan. Bạn có chắc chắn?`)) return;
                setIsLoading(true);
                try {
                  // PHẢI XÓA THEO THỨ TỰ NGƯỢC LẠI CỦA RÀNG BUỘC KHÓA NGOẠI
                  
                  // 1. Xóa tất cả các bản ghi trong bảng grades có MaHS này
                  const { error: errGrades } = await supabase.from('grades').delete().eq('MaHS', id);
                  if (errGrades) throw new Error("Lỗi xóa điểm: " + errGrades.message);

                  // 2. Xóa kỷ luật
                  const { error: errDisciplines } = await supabase.from('disciplines').delete().eq('MaHS', id);
                  if (errDisciplines) throw new Error("Lỗi xóa kỷ luật: " + errDisciplines.message);

                  // 3. Xóa nhật ký
                  const { error: errLogs } = await supabase.from('learning_logs').delete().eq('MaHS', id);
                  if (errLogs) throw new Error("Lỗi xóa nhật ký: " + errLogs.message);

                  // 4. Xử lý bảng Tasks (Nhiệm vụ) - Cập nhật JSON arrays
                  const { data: relatedTasks } = await supabase.from('tasks').select('*');
                  if (relatedTasks) {
                    for (const task of relatedTasks) {
                      let needsUpdate = false;
                      let newGiao = [...(task.DanhSachGiao || [])];
                      let newHoanThanh = [...(task.DanhSachHoanThanh || [])];
                      let newReports = { ...(task.BaoCaoNhiemVu || {}) };

                      if (newGiao.includes(id)) { newGiao = newGiao.filter(x => x !== id); needsUpdate = true; }
                      if (newHoanThanh.includes(id)) { newHoanThanh = newHoanThanh.filter(x => x !== id); needsUpdate = true; }
                      if (newReports[id]) { delete newReports[id]; needsUpdate = true; }

                      if (needsUpdate) {
                        await supabase.from('tasks').update({
                          DanhSachGiao: newGiao,
                          DanhSachHoanThanh: newHoanThanh,
                          BaoCaoNhiemVu: newReports
                        }).eq('MaNhiemVu', task.MaNhiemVu);
                      }
                    }
                  }

                  // 5. CUỐI CÙNG mới xóa học sinh khỏi bảng students
                  const { error: errStudent } = await supabase.from('students').delete().eq('MaHS', id);
                  if (errStudent) throw new Error("Lỗi xóa học sinh: " + errStudent.message);

                  await fetchData();
                  alert("Đã xóa học sinh và các dữ liệu liên quan thành công.");
                } catch (err: any) {
                  alert(err.message);
                } finally {
                  setIsLoading(false);
                }
              }} 
            />
          )}
          {activeTab === 'grades' && <GradeBoard state={state} students={students.filter(s => s.MaLopHienTai === state.selectedClass)} grades={grades} onUpdateGrades={() => fetchData()} />}
          {activeTab === 'tasks' && (
            <TaskManager 
              state={state} 
              students={students.filter(s => s.MaLopHienTai === state.selectedClass)} 
              tasks={tasks} 
              onUpdateTasks={() => fetchData()} 
              onDeleteTask={async (id) => {
                if (!confirm("Xác nhận xóa nhiệm vụ này vĩnh viễn?")) return;
                setIsLoading(true);
                try {
                  const { error } = await supabase.from('tasks').delete().eq('MaNhiemVu', id);
                  if (error) throw error;
                  await fetchData();
                  alert("Đã xóa nhiệm vụ thành công.");
                } catch (err: any) {
                  alert("Lỗi khi xóa nhiệm vụ: " + err.message);
                } finally {
                  setIsLoading(false);
                }
              }} 
            />
          )}
          {activeTab === 'discipline' && (
            <DisciplineManager 
              state={state} 
              students={students.filter(s => s.MaLopHienTai === state.selectedClass)} 
              disciplines={disciplines} 
              violationRules={violationRules} 
              onUpdateDisciplines={(d) => supabase.from('disciplines').upsert(d).then(() => fetchData())} 
              onDeleteDiscipline={(id) => supabase.from('disciplines').delete().eq('MaKyLuat', id).then(() => fetchData())} 
              onUpdateRules={(r) => supabase.from('violation_rules').upsert(r).then(() => fetchData())} 
            />
          )}
          {activeTab === 'logs' && currentAssignment && (
            <LearningLogs 
              state={state} 
              students={students.filter(s => s.MaLopHienTai === state.selectedClass)} 
              logs={logs} 
              assignment={currentAssignment} 
              onUpdateLogs={(l) => supabase.from('learning_logs').upsert(l).then(() => fetchData())} 
              onDeleteLog={(id) => supabase.from('learning_logs').delete().eq('MaTheoDoi', id).then(() => fetchData())} 
            />
          )}
        </div>
      </main>

      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-md rounded-[32px] shadow-2xl p-6">
             <h3 className="font-black text-sm text-slate-800 uppercase mb-4">Đổi mật khẩu Giáo viên</h3>
             <div className="space-y-3">
                <input type="password" placeholder="Mật khẩu cũ" value={passwordForm.old} onChange={(e: any) => setPasswordForm({...passwordForm, old: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none" />
                <input type="password" placeholder="Mật khẩu mới" value={passwordForm.new} onChange={(e: any) => setPasswordForm({...passwordForm, new: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none" />
                <input type="password" placeholder="Xác nhận" value={passwordForm.confirm} onChange={(e: any) => setPasswordForm({...passwordForm, confirm: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none" />
             </div>
             <div className="mt-6 flex gap-3">
                <button onClick={() => setIsPasswordModalOpen(false)} className="flex-1 py-3 bg-white border border-slate-200 text-slate-500 rounded-2xl font-black text-[10px] uppercase">Hủy</button>
                <button onClick={handleUpdateTeacherPassword} className="flex-[2] py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg">Cập nhật</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
