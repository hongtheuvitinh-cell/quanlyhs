
import React, { useState, useMemo } from 'react';
import { 
  Calendar, Layers, UserPlus, Plus, Edit2, Trash2, Save, X, Database, Users, BookOpen, GraduationCap, Briefcase, Check, AlertCircle, Loader2, Search, ArrowRightLeft, UserCheck
} from 'lucide-react';
import { AcademicYear, Class, Teacher, Assignment, Role, Student } from '../types';
import { supabase } from '../services/supabaseClient';

interface Props {
  years: AcademicYear[];
  classes: Class[];
  teachers: Teacher[];
  assignments: Assignment[];
  onUpdate: () => Promise<void>;
  students: Student[];
}

const subjects = [
  { id: 'TOAN', name: 'Toán Học' }, { id: 'VAN', name: 'Ngữ Văn' }, { id: 'ANH', name: 'Tiếng Anh' },
  { id: 'LY', name: 'Vật Lý' }, { id: 'HOA', name: 'Hóa Học' }, { id: 'SINH', name: 'Sinh Học' },
  { id: 'SHL', name: 'Sinh hoạt lớp' }
];

const SystemManager: React.FC<Props> = ({ years, classes, teachers, assignments, onUpdate, students }) => {
  const [activeSubTab, setActiveSubTab] = useState<'YEARS' | 'CLASSES' | 'ASSIGN' | 'PLACEMENT'>('YEARS');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // States cho Niên học
  const [newYearName, setNewYearName] = useState('');
  const [editingYearId, setEditingYearId] = useState<number | null>(null);
  const [editYearName, setEditYearName] = useState('');

  // States cho Lớp học
  const [classForm, setClassForm] = useState({
    MaLop: '', TenLop: '', Khoi: 10, MaNienHoc: years[0]?.MaNienHoc || 0, MaGVCN: ''
  });
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editClassData, setEditClassData] = useState({ TenLop: '', Khoi: 10 });

  // States cho Phân công giảng dạy
  const [assignForm, setAssignForm] = useState({
    MaGV: '', MaLop: '', MaNienHoc: years[0]?.MaNienHoc || 0, MaMonHoc: 'TOAN'
  });

  // States cho Xếp lớp
  const [placementSearch, setPlacementSearch] = useState('');
  const [targetClass, setTargetClass] = useState('');
  const [targetYear, setTargetYear] = useState(years[0]?.MaNienHoc || 0);

  // --- LOGIC NIÊN HỌC ---
  const handleAddYear = async () => {
    if (!newYearName) return;
    setIsSubmitting(true);
    const { error } = await supabase.from('academic_years').insert([{ 
      MaNienHoc: Math.floor(Date.now() / 1000), 
      TenNienHoc: newYearName 
    }]);
    if (error) alert("Lỗi: " + error.message); else { setNewYearName(''); await onUpdate(); }
    setIsSubmitting(false);
  };

  const handleDeleteYear = async (id: number) => {
    if (!confirm("Cảnh báo: Xóa niên học sẽ ảnh hưởng đến toàn bộ dữ liệu phân công và học sinh liên quan. Bạn chắc chắn chứ?")) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('academic_years').delete().eq('MaNienHoc', id);
      if (error) {
        if (error.code === '23503') alert("Không thể xóa: Niên học này đã có dữ liệu (Lớp, Học sinh hoặc Phân công) gắn liền. Hãy xóa dữ liệu liên quan trước.");
        else alert("Lỗi: " + error.message);
      } else {
        await onUpdate();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateYear = async (id: number) => {
    if (!editYearName) return;
    setIsSubmitting(true);
    const { error } = await supabase.from('academic_years').update({ TenNienHoc: editYearName }).eq('MaNienHoc', id);
    if (error) alert(error.message); 
    else { setEditingYearId(null); await onUpdate(); }
    setIsSubmitting(false);
  };

  // --- LOGIC LỚP & CHỦ NHIỆM ---
  const handleAddClassFull = async () => {
    if (!classForm.MaLop || !classForm.TenLop || !classForm.MaNienHoc) {
      alert("Vui lòng nhập đầy đủ Mã lớp, Tên lớp và Niên học!");
      return;
    }
    setIsSubmitting(true);
    try {
      const { error: errClass } = await supabase.from('classes').upsert([{ 
        MaLop: classForm.MaLop, TenLop: classForm.TenLop, Khoi: classForm.Khoi 
      }]);
      if (errClass) throw errClass;

      if (classForm.MaGVCN) {
        const { error: errAssign } = await supabase.from('assignments').insert([{
          MaGV: classForm.MaGVCN, MaLop: classForm.MaLop, MaNienHoc: classForm.MaNienHoc,
          LoaiPhanCong: Role.CHU_NHIEM, MaMonHoc: null
        }]);
        if (errAssign) throw errAssign;
      }

      alert("Đã tạo lớp thành công!");
      setClassForm({ ...classForm, MaLop: '', TenLop: '' });
      await onUpdate();
    } catch (e: any) { alert(e.message); } finally { setIsSubmitting(false); }
  };

  const handleUpdateClass = async (maLop: string) => {
    if (!editClassData.TenLop) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('classes').update({
        TenLop: editClassData.TenLop,
        Khoi: editClassData.Khoi
      }).eq('MaLop', maLop);
      
      if (error) throw error;
      setEditingClassId(null);
      await onUpdate();
      alert("Cập nhật thông tin lớp thành công!");
    } catch (e: any) {
      alert("Lỗi cập nhật: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClass = async (maLop: string) => {
    if (!confirm(`Bạn có chắc muốn xóa lớp ${maLop}? Hành động này sẽ xóa toàn bộ phân công dạy và chủ nhiệm của lớp này.`)) return;
    setIsSubmitting(true);
    try {
      await supabase.from('assignments').delete().eq('MaLop', maLop);
      const { error } = await supabase.from('classes').delete().eq('MaLop', maLop);
      if (error) {
        if (error.code === '23503') alert("Không thể xóa lớp này vì đã có dữ liệu học sinh bên trong. Vui lòng chuyển học sinh sang lớp khác trước khi xóa.");
        else throw error;
      } else {
        await onUpdate();
        alert("Đã xóa lớp thành công.");
      }
    } catch (e: any) {
      alert("Lỗi xóa lớp: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredClassesByYear = useMemo(() => {
    if (!classForm.MaNienHoc) return [];
    const yearAssignments = assignments.filter(a => a.MaNienHoc === classForm.MaNienHoc && a.LoaiPhanCong === Role.CHU_NHIEM);
    const classIdsInYear = yearAssignments.map(a => a.MaLop);
    return classes.filter(c => classIdsInYear.includes(c.MaLop));
  }, [classes, assignments, classForm.MaNienHoc]);

  // --- LOGIC PHÂN CÔNG GIẢNG DẠY ---
  const handleAddAssignment = async () => {
    if (!assignForm.MaGV || !assignForm.MaLop || !assignForm.MaNienHoc) {
      alert("Vui lòng chọn đủ Giáo viên, Lớp và Niên học!");
      return;
    }
    setIsSubmitting(true);
    const { error } = await supabase.from('assignments').insert([{
      MaGV: assignForm.MaGV, MaLop: assignForm.MaLop, MaNienHoc: assignForm.MaNienHoc,
      LoaiPhanCong: Role.GIANG_DAY, MaMonHoc: assignForm.MaMonHoc
    }]);
    if (error) alert(error.message); else { alert("Đã phân công!"); await onUpdate(); }
    setIsSubmitting(false);
  };

  const handleDeleteAssignment = async (id: number) => {
    if (!confirm("Hủy bỏ phân công này?")) return;
    const { error } = await supabase.from('assignments').delete().eq('MaPhanCong', id);
    if (error) alert(error.message); else await onUpdate();
  };

  const classesForAssignDropdown = useMemo(() => {
    const yearAssignments = assignments.filter(a => a.MaNienHoc === assignForm.MaNienHoc && a.LoaiPhanCong === Role.CHU_NHIEM);
    const classIds = yearAssignments.map(a => a.MaLop);
    return classes.filter(c => classIds.includes(c.MaLop));
  }, [classes, assignments, assignForm.MaNienHoc]);

  const filteredAssignmentsHistory = useMemo(() => {
    return assignments.filter(a => a.LoaiPhanCong === Role.GIANG_DAY && a.MaNienHoc === assignForm.MaNienHoc);
  }, [assignments, assignForm.MaNienHoc]);

  // --- LOGIC XẾP LỚP HỌC SINH ---
  const handlePlacement = async (maHS: string) => {
    if (!targetClass || !targetYear) {
      alert("Vui lòng chọn Lớp đích và Niên học!");
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('students').update({
        MaLopHienTai: targetClass,
        MaNienHoc: targetYear
      }).eq('MaHS', maHS);
      if (error) throw error;
      await onUpdate();
    } catch (e: any) {
      alert("Lỗi xếp lớp: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredStudentsForPlacement = useMemo(() => {
    if (!placementSearch.trim()) return students.slice(0, 10);
    return students.filter(s => 
      s.Hoten.toLowerCase().includes(placementSearch.toLowerCase()) || 
      s.MaHS.toLowerCase().includes(placementSearch.toLowerCase())
    );
  }, [students, placementSearch]);

  const classesForPlacement = useMemo(() => {
    const yearAssignments = assignments.filter(a => a.MaNienHoc === targetYear && a.LoaiPhanCong === Role.CHU_NHIEM);
    const classIds = yearAssignments.map(a => a.MaLop);
    return classes.filter(c => classIds.includes(c.MaLop));
  }, [classes, assignments, targetYear]);

  return (
    <div className="space-y-6 animate-in fade-in pb-20">
      <div className="flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 w-fit shadow-sm">
        <button onClick={() => setActiveSubTab('YEARS')} className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${activeSubTab === 'YEARS' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
          <Calendar size={14} /> Niên học
        </button>
        <button onClick={() => setActiveSubTab('CLASSES')} className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${activeSubTab === 'CLASSES' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}>
          <Layers size={14} /> Lớp & Chủ nhiệm
        </button>
        <button onClick={() => setActiveSubTab('ASSIGN')} className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${activeSubTab === 'ASSIGN' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}>
          <BookOpen size={14} /> Phân công dạy
        </button>
        <button onClick={() => setActiveSubTab('PLACEMENT')} className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${activeSubTab === 'PLACEMENT' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}>
          <ArrowRightLeft size={14} /> Xếp lớp HS
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        {activeSubTab === 'YEARS' && (
          <div className="p-6 space-y-6">
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 space-y-1.5 w-full">
                <label className="text-[10px] font-bold text-slate-400 uppercase px-1 tracking-widest">Tên niên học mới</label>
                <input type="text" value={newYearName} onChange={e => setNewYearName(e.target.value)} placeholder="VD: 2025-2026" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-normal outline-none focus:border-indigo-500 shadow-sm" />
              </div>
              <button disabled={isSubmitting} onClick={handleAddYear} className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-bold uppercase flex items-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all">
                <Plus size={16}/> Thêm năm học
              </button>
            </div>
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase border-b border-slate-100">
                <tr><th className="px-5 py-4">Mã</th><th className="px-5 py-4">Niên học</th><th className="px-5 py-4 text-right">Thao tác</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {years.map(y => (
                  <tr key={y.MaNienHoc} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3 font-normal text-slate-400 text-[11px]">{y.MaNienHoc}</td>
                    <td className="px-5 py-3 font-bold text-slate-800 text-xs">
                      {editingYearId === y.MaNienHoc ? (
                        <input type="text" value={editYearName} onChange={e => setEditYearName(e.target.value)} className="bg-white border border-indigo-200 px-2 py-1 rounded outline-none w-32 font-bold" autoFocus />
                      ) : y.TenNienHoc}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {editingYearId === y.MaNienHoc ? (
                        <div className="flex justify-end gap-1">
                          <button onClick={() => handleUpdateYear(y.MaNienHoc)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Check size={16}/></button>
                          <button onClick={() => setEditingYearId(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={16}/></button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1">
                          <button onClick={() => { setEditingYearId(y.MaNienHoc); setEditYearName(y.TenNienHoc); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><Edit2 size={16}/></button>
                          <button onClick={() => handleDeleteYear(y.MaNienHoc)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={16}/></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeSubTab === 'CLASSES' && (
          <div className="p-6 space-y-6">
             <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-end">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase px-1 tracking-widest">Niên học áp dụng</label>
                  <select value={classForm.MaNienHoc} onChange={e => setClassForm({...classForm, MaNienHoc: parseInt(e.target.value)})} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none text-indigo-600">
                    {years.map(y => <option key={y.MaNienHoc} value={y.MaNienHoc}>{y.TenNienHoc}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase px-1 tracking-widest">Mã lớp</label>
                  <input type="text" value={classForm.MaLop} onChange={e => setClassForm({...classForm, MaLop: e.target.value})} placeholder="10A1" className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-normal shadow-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase px-1 tracking-widest">Tên lớp</label>
                  <input type="text" value={classForm.TenLop} onChange={e => setClassForm({...classForm, TenLop: e.target.value})} placeholder="Lớp 10A1" className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-normal shadow-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase px-1 tracking-widest">GV Chủ nhiệm</label>
                  <select value={classForm.MaGVCN} onChange={e => setClassForm({...classForm, MaGVCN: e.target.value})} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none">
                    <option value="">-- Chưa phân --</option>
                    {teachers.map(t => <option key={t.MaGV} value={t.MaGV}>{t.Hoten}</option>)}
                  </select>
                </div>
                <button disabled={isSubmitting} onClick={handleAddClassFull} className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-bold uppercase flex items-center justify-center gap-2 shadow-lg transition-all hover:bg-black">
                  <Plus size={16}/> Tạo & Gán
                </button>
             </div>

             <div className="space-y-3">
               <h3 className="text-xs font-bold text-slate-800 uppercase px-1 flex items-center gap-2">
                 <Database size={16} className="text-indigo-600" /> Danh sách quản lý lớp
               </h3>
               {filteredClassesByYear.length > 0 ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredClassesByYear.map(c => {
                      const activeAssigns = assignments.filter(a => a.MaLop === c.MaLop && a.LoaiPhanCong === Role.CHU_NHIEM && a.MaNienHoc === classForm.MaNienHoc);
                      const isEditing = editingClassId === c.MaLop;
                      
                      return (
                        <div key={c.MaLop} className={`p-5 rounded-[28px] border transition-all flex flex-col gap-3 relative overflow-hidden shadow-sm ${isEditing ? 'bg-indigo-50 border-indigo-200 shadow-lg' : 'bg-white border-slate-100 hover:border-indigo-100'}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                               <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Niên học: {years.find(y => y.MaNienHoc === classForm.MaNienHoc)?.TenNienHoc}</span>
                            </div>
                            <span className="text-[10px] font-black bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-lg">{c.MaLop}</span>
                          </div>

                          {isEditing ? (
                            <div className="space-y-3 py-2 animate-in slide-in-from-top-2">
                               <div className="space-y-1">
                                  <label className="text-[9px] font-black text-slate-400 uppercase px-1">Tên lớp hiển thị</label>
                                  <input type="text" value={editClassData.TenLop} onChange={e => setEditClassData({...editClassData, TenLop: e.target.value})} className="w-full p-2 bg-white border border-indigo-200 rounded-xl text-xs font-bold outline-none" />
                               </div>
                               <div className="space-y-1">
                                  <label className="text-[9px] font-black text-slate-400 uppercase px-1">Khối lớp</label>
                                  <select value={editClassData.Khoi} onChange={e => setEditClassData({...editClassData, Khoi: parseInt(e.target.value)})} className="w-full p-2 bg-white border border-indigo-200 rounded-xl text-xs font-bold outline-none">
                                     <option value={10}>Khối 10</option>
                                     <option value={11}>Khối 11</option>
                                     <option value={12}>Khối 12</option>
                                  </select>
                               </div>
                               <div className="flex gap-2 pt-2">
                                  <button onClick={() => handleUpdateClass(c.MaLop)} className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase shadow-md flex items-center justify-center gap-2">
                                     {isSubmitting ? <Loader2 size={12} className="animate-spin" /> : <Check size={14} />} Lưu
                                  </button>
                                  <button onClick={() => setEditingClassId(null)} className="flex-1 py-2 bg-white border border-slate-200 text-slate-400 rounded-xl text-[10px] font-black uppercase">Hủy</button>
                               </div>
                            </div>
                          ) : (
                            <>
                              <h4 className="text-sm font-black text-slate-800 uppercase leading-none mt-1">{c.TenLop} (Khối {c.Khoi})</h4>
                              <div className="pt-3 border-t border-slate-50 flex items-center gap-3">
                                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg shrink-0"><UserPlus size={14} /></div>
                                <div className="min-w-0">
                                    {activeAssigns.length > 0 ? activeAssigns.map(a => {
                                      const t = teachers.find(x => x.MaGV === a.MaGV);
                                      return (
                                        <div key={a.MaPhanCong} className="text-[10px] font-normal text-slate-500 truncate">
                                          GVCN: <span className="font-bold text-indigo-600 uppercase tracking-tight">{t?.Hoten}</span>
                                        </div>
                                      );
                                    }) : (
                                      <div className="text-[10px] font-bold text-rose-400 uppercase italic">Chưa có GVCN</div>
                                    )}
                                </div>
                              </div>
                              <div className="mt-2 flex justify-end gap-1">
                                 <button onClick={() => { setEditingClassId(c.MaLop); setEditClassData({ TenLop: c.TenLop, Khoi: c.Khoi }); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><Edit2 size={16}/></button>
                                 <button onClick={() => handleDeleteClass(c.MaLop)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={16}/></button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                 </div>
               ) : (
                 <div className="py-16 bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-300">
                    <AlertCircle size={40} className="mb-3 opacity-20" />
                    <p className="text-[11px] font-black uppercase tracking-widest leading-relaxed text-center">Niên học hiện tại chưa có lớp học nào.<br/>Vui lòng tạo lớp mới ở trên.</p>
                 </div>
               )}
             </div>
          </div>
        )}

        {activeSubTab === 'ASSIGN' && (
          <div className="p-6 space-y-6">
             <div className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 items-end">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-indigo-400 uppercase px-1 tracking-widest">Chọn niên học</label>
                  <select value={assignForm.MaNienHoc} onChange={e => setAssignForm({...assignForm, MaNienHoc: parseInt(e.target.value)})} className="w-full p-2.5 bg-white border border-indigo-100 rounded-xl text-xs font-bold outline-none text-indigo-600">
                    {years.map(y => <option key={y.MaNienHoc} value={y.MaNienHoc}>{y.TenNienHoc}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-indigo-400 uppercase px-1 tracking-widest">Giáo viên</label>
                  <select value={assignForm.MaGV} onChange={e => setAssignForm({...assignForm, MaGV: e.target.value})} className="w-full p-2.5 bg-white border border-indigo-100 rounded-xl text-xs font-bold outline-none">
                    <option value="">Chọn GV...</option>
                    {teachers.map(t => <option key={t.MaGV} value={t.MaGV}>{t.Hoten}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-indigo-400 uppercase px-1 tracking-widest">Môn giảng dạy</label>
                  <select value={assignForm.MaMonHoc} onChange={e => setAssignForm({...assignForm, MaMonHoc: e.target.value})} className="w-full p-2.5 bg-white border border-indigo-100 rounded-xl text-xs font-bold outline-none">
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-indigo-400 uppercase px-1 tracking-widest">Lớp học ({years.find(y => y.MaNienHoc === assignForm.MaNienHoc)?.TenNienHoc})</label>
                  <select value={assignForm.MaLop} onChange={e => setAssignForm({...assignForm, MaLop: e.target.value})} className="w-full p-2.5 bg-white border border-indigo-100 rounded-xl text-xs font-bold outline-none">
                    <option value="">Chọn lớp...</option>
                    {classesForAssignDropdown.map(c => <option key={c.MaLop} value={c.MaLop}>{c.TenLop}</option>)}
                  </select>
                </div>
                <button disabled={isSubmitting} onClick={handleAddAssignment} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-bold uppercase flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
                  <Plus size={16}/> Phân công
                </button>
             </div>

             <div className="space-y-3">
               <h3 className="text-xs font-bold text-slate-800 uppercase px-1 flex items-center gap-2">
                 <Briefcase size={16} className="text-emerald-600" /> Danh sách giáo viên bộ môn năm {years.find(y => y.MaNienHoc === assignForm.MaNienHoc)?.TenNienHoc}
               </h3>
               {filteredAssignmentsHistory.length > 0 ? (
                 <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase border-b">
                      <tr><th className="px-5 py-4">Giáo viên</th><th className="px-5 py-4">Môn dạy</th><th className="px-5 py-4">Lớp</th><th className="px-5 py-4 text-right">Thao tác</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {filteredAssignmentsHistory.map(a => {
                         const t = teachers.find(x => x.MaGV === a.MaGV);
                         const c = classes.find(x => x.MaLop === a.MaLop);
                         const sub = subjects.find(x => x.id === a.MaMonHoc);
                         return (
                           <tr key={a.MaPhanCong} className="hover:bg-slate-50 transition-colors">
                              <td className="px-5 py-3 font-bold text-slate-800 text-xs uppercase">{t?.Hoten}</td>
                              <td className="px-5 py-3"><span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[9px] font-bold uppercase">{sub?.name || a.MaMonHoc}</span></td>
                              <td className="px-5 py-3 font-normal text-slate-500 text-xs">{c?.TenLop}</td>
                              <td className="px-5 py-3 text-right"><button onClick={() => handleDeleteAssignment(a.MaPhanCong)} className="p-1.5 text-slate-300 hover:text-rose-500 rounded-xl transition-all"><Trash2 size={16}/></button></td>
                           </tr>
                         );
                       })}
                    </tbody>
                 </table>
               ) : (
                 <div className="py-20 text-center font-bold text-slate-300 text-[10px] uppercase tracking-widest italic bg-white border border-slate-100 rounded-[40px] opacity-40">Chưa có dữ liệu phân công giảng dạy cho năm này</div>
               )}
             </div>
          </div>
        )}

        {activeSubTab === 'PLACEMENT' && (
          <div className="p-6 space-y-6">
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase px-1 tracking-widest">Niên học đích</label>
                    <select value={targetYear} onChange={e => setTargetYear(parseInt(e.target.value))} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none text-indigo-600">
                      {years.map(y => <option key={y.MaNienHoc} value={y.MaNienHoc}>{y.TenNienHoc}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase px-1 tracking-widest">Lớp đích</label>
                    <select value={targetClass} onChange={e => setTargetClass(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none text-indigo-600">
                      <option value="">-- Chọn lớp đích --</option>
                      {classesForPlacement.map(c => <option key={c.MaLop} value={c.MaLop}>{c.TenLop}</option>)}
                    </select>
                  </div>
                  <div className="lg:col-span-2 space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase px-1 tracking-widest">Tìm học sinh cần xếp lớp</label>
                    <div className="relative">
                       <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                       <input type="text" value={placementSearch} onChange={e => setPlacementSearch(e.target.value)} placeholder="Nhập tên hoặc mã học sinh..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-normal outline-none focus:border-indigo-500 shadow-sm" />
                    </div>
                  </div>
               </div>

               <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Kết quả tìm kiếm</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                     {filteredStudentsForPlacement.length > 0 ? filteredStudentsForPlacement.map(s => {
                        const currentYear = years.find(y => y.MaNienHoc === s.MaNienHoc)?.TenNienHoc;
                        return (
                          <div key={s.MaHS} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-indigo-300 transition-all">
                             <div className="flex items-center gap-3">
                                <div className="h-9 w-9 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 font-black text-xs">{s.Hoten.charAt(0)}</div>
                                <div>
                                   <p className="text-xs font-black text-slate-800 uppercase leading-none mb-1">{s.Hoten}</p>
                                   <p className="text-[9px] text-slate-400 font-bold uppercase">Lớp: {s.MaLopHienTai} ({currentYear})</p>
                                </div>
                             </div>
                             <button 
                                onClick={() => handlePlacement(s.MaHS)}
                                disabled={isSubmitting || !targetClass}
                                className={`p-2 rounded-xl transition-all ${targetClass ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-100 text-slate-300'}`}
                                title="Xếp vào lớp đang chọn"
                             >
                                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <UserCheck size={16} />}
                             </button>
                          </div>
                        );
                     }) : (
                        <div className="col-span-full py-10 text-center text-[10px] font-black text-slate-300 uppercase italic">Không tìm thấy học sinh nào</div>
                     )}
                  </div>
               </div>
            </div>

            <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-start gap-3">
               <AlertCircle className="text-indigo-600 shrink-0 mt-0.5" size={16} />
               <p className="text-[10px] text-indigo-700 font-medium leading-relaxed">
                 <span className="font-black uppercase">Lưu ý:</span> Chức năng xếp lớp sẽ cập nhật trực tiếp <b>Lớp hiện tại</b> và <b>Niên học</b> của học sinh. 
                 Điều này thường dùng khi bắt đầu năm học mới để chuyển học sinh từ lớp cũ lên lớp mới.
               </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemManager;
