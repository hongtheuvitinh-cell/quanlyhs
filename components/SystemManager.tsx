
import React, { useState, useMemo } from 'react';
import { 
  Calendar, Layers, UserPlus, Plus, Edit2, Trash2, Save, X, Database, Users, BookOpen, GraduationCap, Briefcase, Check, AlertCircle, Loader2, Search, ArrowRightLeft, UserCheck, ChevronRight
} from 'lucide-react';
import { AcademicYear, Class, Teacher, Assignment, Role, Student, AppState } from '../types';
import { supabase } from '../services/supabaseClient';

interface Props {
  state: AppState;
  years: AcademicYear[];
  classes: Class[];
  teachers: Teacher[];
  assignments: Assignment[];
  onUpdate: () => Promise<void>;
  students: Student[];
}

const subjectList = [
  { id: 'GVCN', name: 'Chủ nhiệm (GVCN)', isRole: true },
  { id: 'TOAN', name: 'Toán Học' }, { id: 'VAN', name: 'Ngữ Văn' }, { id: 'ANH', name: 'Tiếng Anh' },
  { id: 'LY', name: 'Vật Lý' }, { id: 'HOA', name: 'Hóa Học' }, { id: 'SINH', name: 'Sinh Học' },
  { id: 'DIA', name: 'Địa Lý' }, { id: 'SU', name: 'Lịch Sử' }, { id: 'GDCD', name: 'GDCD' },
  { id: 'TIN', name: 'Tin Học' }, { id: 'CONGNGHE', name: 'Công Nghệ' }, { id: 'GDTC', name: 'Thể Dục' }
];

const SystemManager: React.FC<Props> = ({ state, years, classes, teachers, assignments, onUpdate, students }) => {
  const [activeSubTab, setActiveSubTab] = useState<'YEARS' | 'CLASSES' | 'ASSIGN'>('YEARS');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State cho Năm học
  const [newYearName, setNewYearName] = useState('');
  
  // State cho Lớp học
  const [newClass, setNewClass] = useState<Partial<Class>>({ MaLop: '', TenLop: '', Khoi: 10 });
  const [editingClassId, setEditingClassId] = useState<string | null>(null);

  // State cho Phân công
  const [assignYear, setAssignYear] = useState<number>(state.selectedYear || years[0]?.MaNienHoc || 0);
  const [assignClass, setAssignClass] = useState<string>(state.selectedClass || classes[0]?.MaLop || '');
  const [assignTeacher, setAssignTeacher] = useState<string>(teachers[0]?.MaGV || '');
  const [assignSubject, setAssignSubject] = useState<string>('GVCN');

  const handleAddYear = async () => {
    if (!newYearName) return;
    setIsSubmitting(true);
    const { error } = await supabase.from('academic_years').insert([{ MaNienHoc: Math.floor(Date.now() / 1000), TenNienHoc: newYearName }]);
    if (error) alert("Lỗi: " + error.message); else { setNewYearName(''); await onUpdate(); }
    setIsSubmitting(false);
  };

  const handleAddClass = async () => {
    if (!newClass.MaLop || !newClass.TenLop) return;
    setIsSubmitting(true);
    try {
      if (editingClassId) {
        // Cập nhật tên lớp
        const { error } = await supabase.from('classes').update({ TenLop: newClass.TenLop, Khoi: newClass.Khoi }).eq('MaLop', editingClassId);
        if (error) throw error;
        setEditingClassId(null);
      } else {
        // Thêm mới
        const { error } = await supabase.from('classes').insert([newClass]);
        if (error) throw error;
      }
      setNewClass({ MaLop: '', TenLop: '', Khoi: 10 });
      await onUpdate();
    } catch (e: any) {
      alert("Lỗi: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClass = (c: Class) => {
    setEditingClassId(c.MaLop);
    setNewClass(c);
  };

  const handleSaveAssignment = async () => {
    if (!assignYear || !assignClass || !assignTeacher || !assignSubject) {
      alert("Vui lòng chọn đầy đủ thông tin phân công!");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const isHomeroom = assignSubject === 'GVCN';
      
      const { error } = await supabase.from('assignments').insert([{
        MaGV: assignTeacher,
        MaLop: assignClass,
        MaNienHoc: assignYear,
        LoaiPhanCong: isHomeroom ? Role.CHU_NHIEM : Role.GIANG_DAY,
        MaMonHoc: isHomeroom ? null : assignSubject
      }]);

      if (error) throw error;
      await onUpdate();
      alert("Phân công thành công!");
    } catch (e: any) {
      alert("Lỗi phân công: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAssignment = async (id: number) => {
    if (!confirm("Hủy bỏ phân công này?")) return;
    try {
      const { error } = await supabase.from('assignments').delete().eq('MaPhanCong', id);
      if (error) throw error;
      await onUpdate();
    } catch (e: any) {
      alert("Lỗi: " + e.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-20">
      {/* Sub Tab Navigation */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-[28px] border border-slate-200 w-fit shadow-sm">
        <button onClick={() => setActiveSubTab('YEARS')} className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'YEARS' ? 'bg-slate-900 text-white shadow-xl scale-[1.02]' : 'text-slate-400 hover:bg-slate-50'}`}>
          <Calendar size={16} /> Niên học
        </button>
        <button onClick={() => setActiveSubTab('CLASSES')} className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'CLASSES' ? 'bg-slate-900 text-white shadow-xl scale-[1.02]' : 'text-slate-400 hover:bg-slate-50'}`}>
          <Layers size={16} /> Lớp học
        </button>
        <button onClick={() => setActiveSubTab('ASSIGN')} className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'ASSIGN' ? 'bg-slate-900 text-white shadow-xl scale-[1.02]' : 'text-slate-400 hover:bg-slate-50'}`}>
          <BookOpen size={16} /> Phân công giảng dạy
        </button>
      </div>

      <div className="bg-white rounded-[40px] border border-slate-200 overflow-hidden shadow-sm min-h-[600px]">
        {activeSubTab === 'YEARS' && (
          <div className="p-8 space-y-10 animate-in slide-in-from-left-4">
            <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100 flex flex-col md:flex-row gap-8 items-end shadow-inner">
              <div className="flex-1 space-y-2 w-full">
                <label className="text-[10px] font-black text-slate-400 uppercase px-2 tracking-widest">Tên niên học mới (Ví dụ: 2024-2025)</label>
                <input type="text" value={newYearName} onChange={e => setNewYearName(e.target.value)} placeholder="Nhập tên..." className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-indigo-400 transition-all shadow-sm" />
              </div>
              <button disabled={isSubmitting} onClick={handleAddYear} className="px-10 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-indigo-700 shadow-xl shadow-indigo-100 active:scale-95 transition-all">
                <Plus size={18}/> Thêm niên học
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {years.map(y => (
                <div key={y.MaNienHoc} className="p-6 bg-white border border-slate-100 rounded-[32px] shadow-sm flex items-center justify-between group hover:border-indigo-300 transition-all">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black"><Calendar size={20}/></div>
                      <div>
                         <h4 className="font-black text-slate-800 text-sm uppercase">{y.TenNienHoc}</h4>
                         <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Mã: {y.MaNienHoc}</p>
                      </div>
                   </div>
                   <button onClick={() => supabase.from('academic_years').delete().eq('MaNienHoc', y.MaNienHoc).then(onUpdate)} className="p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={18}/></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSubTab === 'CLASSES' && (
          <div className="p-8 space-y-10 animate-in slide-in-from-right-4">
             <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-6 items-end shadow-inner">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase px-2">Mã lớp</label>
                   <input 
                    type="text" 
                    disabled={!!editingClassId}
                    value={newClass.MaLop} 
                    onChange={e => setNewClass({...newClass, MaLop: e.target.value})} 
                    placeholder="VD: 10A1" 
                    className={`w-full p-3.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none ${editingClassId ? 'opacity-50 cursor-not-allowed' : ''}`} 
                   />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase px-2">Tên lớp</label>
                   <input type="text" value={newClass.TenLop} onChange={e => setNewClass({...newClass, TenLop: e.target.value})} placeholder="VD: Lớp 10A1" className="w-full p-3.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none" />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase px-2">Khối</label>
                   <select value={newClass.Khoi} onChange={e => setNewClass({...newClass, Khoi: parseInt(e.target.value)})} className="w-full p-3.5 bg-white border border-slate-200 rounded-2xl text-xs font-black outline-none shadow-sm">
                      <option value={10}>Khối 10</option><option value={11}>Khối 11</option><option value={12}>Khối 12</option>
                   </select>
                </div>
                <div className="flex gap-2">
                  {editingClassId && (
                    <button onClick={() => { setEditingClassId(null); setNewClass({ MaLop: '', TenLop: '', Khoi: 10 }); }} className="flex-1 py-4 bg-white border border-slate-200 text-slate-400 rounded-2xl text-[10px] font-black uppercase">Hủy</button>
                  )}
                  <button disabled={isSubmitting} onClick={handleAddClass} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-700 shadow-xl transition-all active:scale-95">
                    {editingClassId ? <Save size={18}/> : <Plus size={18}/>}
                    {editingClassId ? 'Cập nhật' : 'Thêm lớp'}
                  </button>
                </div>
             </div>
             
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {classes.map(c => (
                   <div key={c.MaLop} className="p-6 bg-white border border-slate-100 rounded-[32px] shadow-sm hover:border-indigo-400 transition-all relative group">
                      <div className="flex justify-between items-start mb-4">
                         <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[9px] font-black uppercase border border-indigo-100">Khối {c.Khoi}</span>
                         <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={() => handleEditClass(c)} className="p-2 text-indigo-400 hover:text-indigo-600"><Edit2 size={16}/></button>
                            <button onClick={() => supabase.from('classes').delete().eq('MaLop', c.MaLop).then(onUpdate)} className="p-2 text-slate-200 hover:text-rose-500"><Trash2 size={16}/></button>
                         </div>
                      </div>
                      <h4 className="font-black text-slate-800 text-base uppercase mb-1">{c.TenLop}</h4>
                      <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Mã lớp: {c.MaLop}</p>
                   </div>
                ))}
             </div>
          </div>
        )}

        {activeSubTab === 'ASSIGN' && (
           <div className="p-8 space-y-8 animate-in zoom-in">
              <div className="bg-slate-900 text-white p-10 rounded-[40px] shadow-2xl relative overflow-hidden">
                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-5 gap-6 items-end">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">1. Niên học</label>
                      <select value={assignYear} onChange={e => setAssignYear(parseInt(e.target.value))} className="w-full p-4 bg-slate-800 border border-slate-700 rounded-2xl text-xs font-black outline-none focus:border-indigo-400 text-white">
                        {years.map(y => <option key={y.MaNienHoc} value={y.MaNienHoc}>{y.TenNienHoc}</option>)}
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">2. Lớp học</label>
                      <select value={assignClass} onChange={e => setAssignClass(e.target.value)} className="w-full p-4 bg-slate-800 border border-slate-700 rounded-2xl text-xs font-black outline-none focus:border-indigo-400 text-white">
                        {classes.map(c => <option key={c.MaLop} value={c.MaLop}>{c.TenLop}</option>)}
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">3. Giáo viên</label>
                      <select value={assignTeacher} onChange={e => setAssignTeacher(e.target.value)} className="w-full p-4 bg-slate-800 border border-slate-700 rounded-2xl text-xs font-black outline-none focus:border-indigo-400 text-white">
                        {teachers.map(t => <option key={t.MaGV} value={t.MaGV}>{t.Hoten} ({t.MaGV})</option>)}
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">4. Môn phân công</label>
                      <select value={assignSubject} onChange={e => setAssignSubject(e.target.value)} className="w-full p-4 bg-slate-800 border border-slate-700 rounded-2xl text-xs font-black outline-none focus:border-indigo-400 text-amber-400">
                        {subjectList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                   </div>
                   <button disabled={isSubmitting} onClick={handleSaveAssignment} className="py-4 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-[2px] flex items-center justify-center gap-3 hover:bg-indigo-700 shadow-xl transition-all active:scale-95">
                      {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18}/>} Lưu CSDL
                   </button>
                </div>
                <div className="absolute top-0 right-0 p-10 opacity-5"><Database size={150}/></div>
              </div>

              {/* Danh sách phân công hiện tại */}
              <div className="space-y-4">
                 <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest px-4 flex items-center gap-2">
                    <UserCheck size={18} className="text-indigo-600"/> Danh sách phân công hiện hành
                 </h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {assignments
                      .filter(a => a.MaNienHoc === assignYear)
                      .map(a => {
                        const t = teachers.find(x => x.MaGV === a.MaGV);
                        const c = classes.find(x => x.MaLop === a.MaLop);
                        const sub = subjectList.find(s => s.id === (a.MaMonHoc || 'GVCN'));
                        return (
                          <div key={a.MaPhanCong} className="p-5 bg-white border border-slate-100 rounded-[32px] shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
                             <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${a.LoaiPhanCong === Role.CHU_NHIEM ? 'bg-amber-100 text-amber-600 border border-amber-200' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'}`}>
                                   {a.LoaiPhanCong === Role.CHU_NHIEM ? 'CN' : 'BM'}
                                </div>
                                <div className="min-w-0">
                                   <p className="text-[11px] font-black text-slate-800 uppercase truncate leading-none mb-1.5">{t?.Hoten || 'N/A'}</p>
                                   <div className="flex items-center gap-2">
                                      <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">{c?.TenLop || a.MaLop}</span>
                                      <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{sub?.name || a.MaMonHoc}</span>
                                   </div>
                                </div>
                             </div>
                             <button onClick={() => handleDeleteAssignment(a.MaPhanCong)} className="p-2 text-slate-200 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
                          </div>
                        );
                      })
                    }
                    {assignments.filter(a => a.MaNienHoc === assignYear).length === 0 && (
                      <div className="col-span-full py-20 text-center opacity-30 italic text-[10px] font-black uppercase">Chưa có dữ liệu phân công cho năm học này</div>
                    )}
                 </div>
              </div>
           </div>
        )}
      </div>
    </div>
  );
};

export default SystemManager;
