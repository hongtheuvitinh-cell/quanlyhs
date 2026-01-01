
import React, { useState, useMemo } from 'react';
import { 
  Calendar, Layers, UserPlus, Plus, Edit2, Trash2, Save, X, Database, Users, BookOpen, GraduationCap, Briefcase, Check, AlertCircle
} from 'lucide-react';
import { AcademicYear, Class, Teacher, Assignment, Role } from '../types';
import { supabase } from '../services/supabaseClient';

interface Props {
  years: AcademicYear[];
  classes: Class[];
  teachers: Teacher[];
  assignments: Assignment[];
  onUpdate: () => Promise<void>;
}

const subjects = [
  { id: 'TOAN', name: 'Toán Học' }, { id: 'VAN', name: 'Ngữ Văn' }, { id: 'ANH', name: 'Tiếng Anh' },
  { id: 'LY', name: 'Vật Lý' }, { id: 'HOA', name: 'Hóa Học' }, { id: 'SINH', name: 'Sinh Học' },
  { id: 'SHL', name: 'Sinh hoạt lớp' }
];

const SystemManager: React.FC<Props> = ({ years, classes, teachers, assignments, onUpdate }) => {
  const [activeSubTab, setActiveSubTab] = useState<'YEARS' | 'CLASSES' | 'ASSIGN'>('YEARS');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // States cho Niên học
  const [newYearName, setNewYearName] = useState('');
  const [editingYearId, setEditingYearId] = useState<number | null>(null);
  const [editYearName, setEditYearName] = useState('');

  // States cho Lớp học & Chủ nhiệm
  const [classForm, setClassForm] = useState({
    MaLop: '', TenLop: '', Khoi: 10, MaNienHoc: years[0]?.MaNienHoc || 0, MaGVCN: ''
  });

  // States cho Phân công giảng dạy
  const [assignForm, setAssignForm] = useState({
    MaGV: '', MaLop: '', MaNienHoc: years[0]?.MaNienHoc || 0, MaMonHoc: 'TOAN'
  });

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
      // 1. Upsert Lớp vào bảng classes (nếu chưa có)
      const { error: errClass } = await supabase.from('classes').upsert([{ 
        MaLop: classForm.MaLop, TenLop: classForm.TenLop, Khoi: classForm.Khoi 
      }]);
      if (errClass) throw errClass;

      // 2. Tạo phân công chủ nhiệm cho Niên học đó
      if (classForm.MaGVCN) {
        const { error: errAssign } = await supabase.from('assignments').insert([{
          MaGV: classForm.MaGVCN, MaLop: classForm.MaLop, MaNienHoc: classForm.MaNienHoc,
          LoaiPhanCong: Role.CHU_NHIEM, MaMonHoc: null
        }]);
        if (errAssign) throw errAssign;
      }

      alert("Thành công!");
      setClassForm({ ...classForm, MaLop: '', TenLop: '' });
      await onUpdate();
    } catch (e: any) { alert(e.message); } finally { setIsSubmitting(false); }
  };

  // Lọc danh sách lớp hiển thị theo Niên học đang chọn trong Form Lớp
  const filteredClassesByYear = useMemo(() => {
    if (!classForm.MaNienHoc) return [];
    // Chỉ lấy các lớp đã được gán chủ nhiệm TRONG NIÊN HỌC ĐANG CHỌN
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

  // Lọc lớp cho dropdown phân công giảng dạy (Chỉ hiện lớp của niên học đang chọn ở form phân công)
  const classesForAssignDropdown = useMemo(() => {
    const yearAssignments = assignments.filter(a => a.MaNienHoc === assignForm.MaNienHoc && a.LoaiPhanCong === Role.CHU_NHIEM);
    const classIds = yearAssignments.map(a => a.MaLop);
    return classes.filter(c => classIds.includes(c.MaLop));
  }, [classes, assignments, assignForm.MaNienHoc]);

  // Lọc danh sách giáo viên phân công giảng dạy theo niên học đang chọn
  const filteredAssignmentsHistory = useMemo(() => {
    return assignments.filter(a => a.LoaiPhanCong === Role.GIANG_DAY && a.MaNienHoc === assignForm.MaNienHoc);
  }, [assignments, assignForm.MaNienHoc]);

  return (
    <div className="space-y-6 animate-in fade-in pb-20">
      <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 w-fit shadow-sm">
        <button onClick={() => setActiveSubTab('YEARS')} className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${activeSubTab === 'YEARS' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
          <Calendar size={14} /> Niên học
        </button>
        <button onClick={() => setActiveSubTab('CLASSES')} className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${activeSubTab === 'CLASSES' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}>
          <Layers size={14} /> Lớp & Chủ nhiệm
        </button>
        <button onClick={() => setActiveSubTab('ASSIGN')} className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${activeSubTab === 'ASSIGN' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}>
          <BookOpen size={14} /> Phân công dạy
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
                 <Database size={16} className="text-indigo-600" /> Danh sách lớp năm {years.find(y => y.MaNienHoc === classForm.MaNienHoc)?.TenNienHoc}
               </h3>
               {filteredClassesByYear.length > 0 ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {filteredClassesByYear.map(c => {
                      const activeAssigns = assignments.filter(a => a.MaLop === c.MaLop && a.LoaiPhanCong === Role.CHU_NHIEM && a.MaNienHoc === classForm.MaNienHoc);
                      return (
                        <div key={c.MaLop} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-indigo-200 transition-all flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Khối {c.Khoi}</span>
                            <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg">{c.MaLop}</span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-800">{c.TenLop}</h4>
                          <div className="mt-1 pt-2 border-t border-slate-50 flex items-center gap-2">
                            <UserPlus size={12} className="text-slate-300" />
                            <div className="min-w-0">
                                {activeAssigns.map(a => {
                                  const t = teachers.find(x => x.MaGV === a.MaGV);
                                  return (
                                    <div key={a.MaPhanCong} className="text-[10px] font-normal text-slate-500 truncate">
                                      GVCN: <span className="font-bold text-indigo-600">{t?.Hoten}</span>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                 </div>
               ) : (
                 <div className="py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-300">
                    <AlertCircle size={32} className="mb-2 opacity-20" />
                    <p className="text-[11px] font-bold uppercase tracking-widest">Không có lớp nào trong năm học này</p>
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
                              <td className="px-5 py-3 font-bold text-slate-800 text-xs">{t?.Hoten}</td>
                              <td className="px-5 py-3"><span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[9px] font-bold uppercase">{sub?.name || a.MaMonHoc}</span></td>
                              <td className="px-5 py-3 font-normal text-slate-500 text-xs">{c?.TenLop}</td>
                              <td className="px-5 py-3 text-right"><button onClick={() => handleDeleteAssignment(a.MaPhanCong)} className="p-1.5 text-slate-300 hover:text-rose-500 rounded-xl transition-all"><Trash2 size={16}/></button></td>
                           </tr>
                         );
                       })}
                    </tbody>
                 </table>
               ) : (
                 <div className="py-20 text-center font-bold text-slate-300 text-[10px] uppercase tracking-widest italic bg-white border border-slate-100 rounded-3xl">Chưa có dữ liệu phân công giảng dạy cho năm này</div>
               )}
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemManager;
