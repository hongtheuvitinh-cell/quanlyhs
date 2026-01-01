
import React, { useState } from 'react';
import { 
  Calendar, Layers, UserPlus, Plus, Edit2, Trash2, Save, X, Database, Users, BookOpen, GraduationCap, Briefcase
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

  // States cho Lớp học & Chủ nhiệm
  const [classForm, setClassForm] = useState({
    MaLop: '', TenLop: '', Khoi: 10, MaNienHoc: years[0]?.MaNienHoc || 0, MaGVCN: ''
  });

  // States cho Phân công giảng dạy
  const [assignForm, setAssignForm] = useState({
    MaGV: '', MaLop: '', MaNienHoc: years[0]?.MaNienHoc || 0, MaMonHoc: 'TOAN'
  });

  const handleAddYear = async () => {
    if (!newYearName) return;
    setIsSubmitting(true);
    const { error } = await supabase.from('academic_years').insert([{ 
      MaNienHoc: Math.floor(Date.now() / 1000), 
      TenNienHoc: newYearName 
    }]);
    if (error) alert(error.message); else { setNewYearName(''); await onUpdate(); }
    setIsSubmitting(false);
  };

  const handleAddClassFull = async () => {
    if (!classForm.MaLop || !classForm.TenLop || !classForm.MaNienHoc) {
      alert("Vui lòng nhập đầy đủ Mã lớp, Tên lớp và Niên học!");
      return;
    }
    setIsSubmitting(true);
    try {
      // 1. Tạo lớp (Nếu chưa có)
      const { error: errClass } = await supabase.from('classes').upsert([{ 
        MaLop: classForm.MaLop, TenLop: classForm.TenLop, Khoi: classForm.Khoi 
      }]);
      
      if (errClass) throw errClass;

      // 2. Nếu có chọn GVCN, tạo phân công chủ nhiệm
      if (classForm.MaGVCN) {
        const { error: errAssign } = await supabase.from('assignments').insert([{
          MaGV: classForm.MaGVCN,
          MaLop: classForm.MaLop,
          MaNienHoc: classForm.MaNienHoc,
          LoaiPhanCong: Role.CHU_NHIEM,
          MaMonHoc: null
        }]);
        if (errAssign) throw errAssign;
      }

      alert("Thành công!");
      setClassForm({ ...classForm, MaLop: '', TenLop: '' });
      await onUpdate();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddAssignment = async () => {
    if (!assignForm.MaGV || !assignForm.MaLop || !assignForm.MaNienHoc) {
      alert("Vui lòng chọn đủ Giáo viên, Lớp và Niên học!");
      return;
    }
    setIsSubmitting(true);
    const { error } = await supabase.from('assignments').insert([{
      MaGV: assignForm.MaGV,
      MaLop: assignForm.MaLop,
      MaNienHoc: assignForm.MaNienHoc,
      LoaiPhanCong: Role.GIANG_DAY,
      MaMonHoc: assignForm.MaMonHoc
    }]);
    if (error) alert(error.message); else { alert("Đã phân công!"); await onUpdate(); }
    setIsSubmitting(false);
  };

  const handleDeleteAssignment = async (id: number) => {
    if (!confirm("Hủy bỏ phân công này?")) return;
    const { error } = await supabase.from('assignments').delete().eq('MaPhanCong', id);
    if (error) alert(error.message); else await onUpdate();
  };

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
                    <td className="px-5 py-3 font-bold text-slate-800 text-xs">{y.TenNienHoc}</td>
                    <td className="px-5 py-3 text-right">
                      <button className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={16}/></button>
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
                  <label className="text-[10px] font-bold text-slate-400 uppercase px-1 tracking-widest">Niên học</label>
                  <select value={classForm.MaNienHoc} onChange={e => setClassForm({...classForm, MaNienHoc: parseInt(e.target.value)})} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none">
                    <option value="">Chọn năm...</option>
                    {years.map(y => <option key={y.MaNienHoc} value={y.MaNienHoc}>{y.TenNienHoc}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase px-1 tracking-widest">Mã lớp</label>
                  <input type="text" value={classForm.MaLop} onChange={e => setClassForm({...classForm, MaLop: e.target.value})} placeholder="10A1" className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-normal" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase px-1 tracking-widest">Tên lớp</label>
                  <input type="text" value={classForm.TenLop} onChange={e => setClassForm({...classForm, TenLop: e.target.value})} placeholder="Lớp 10A1" className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-normal" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase px-1 tracking-widest">GV Chủ nhiệm</label>
                  <select value={classForm.MaGVCN} onChange={e => setClassForm({...classForm, MaGVCN: e.target.value})} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none text-indigo-600">
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
                 <Database size={16} className="text-indigo-600" /> Danh sách lớp đã cấu hình
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {classes.map(c => {
                    const activeAssigns = assignments.filter(a => a.MaLop === c.MaLop && a.LoaiPhanCong === Role.CHU_NHIEM);
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
                            {activeAssigns.length > 0 ? (
                              activeAssigns.map(a => {
                                const t = teachers.find(x => x.MaGV === a.MaGV);
                                return (
                                  <div key={a.MaPhanCong} className="text-[10px] font-normal text-slate-500 truncate">
                                    GVCN: <span className="font-bold text-indigo-600">{t?.Hoten}</span>
                                    <span className="ml-1 opacity-50 text-[8px]">({years.find(y => y.MaNienHoc === a.MaNienHoc)?.TenNienHoc})</span>
                                  </div>
                                );
                              })
                            ) : <span className="text-[10px] font-normal text-slate-400 italic">Chưa phân chủ nhiệm</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
               </div>
             </div>
          </div>
        )}

        {activeSubTab === 'ASSIGN' && (
          <div className="p-6 space-y-6">
             <div className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 items-end">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-indigo-400 uppercase px-1 tracking-widest">Niên học</label>
                  <select value={assignForm.MaNienHoc} onChange={e => setAssignForm({...assignForm, MaNienHoc: parseInt(e.target.value)})} className="w-full p-2.5 bg-white border border-indigo-100 rounded-xl text-xs font-bold outline-none">
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
                  <select value={assignForm.MaMonHoc} onChange={e => setAssignForm({...assignForm, MaMonHoc: e.target.value})} className="w-full p-2.5 bg-white border border-indigo-100 rounded-xl text-xs font-bold outline-none text-indigo-600">
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-indigo-400 uppercase px-1 tracking-widest">Lớp dạy</label>
                  <select value={assignForm.MaLop} onChange={e => setAssignForm({...assignForm, MaLop: e.target.value})} className="w-full p-2.5 bg-white border border-indigo-100 rounded-xl text-xs font-bold outline-none">
                    <option value="">Chọn lớp...</option>
                    {classes.map(c => <option key={c.MaLop} value={c.MaLop}>{c.TenLop}</option>)}
                  </select>
                </div>
                <button disabled={isSubmitting} onClick={handleAddAssignment} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-bold uppercase flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
                  <Plus size={16}/> Phân công
                </button>
             </div>

             <div className="space-y-3">
               <h3 className="text-xs font-bold text-slate-800 uppercase px-1 flex items-center gap-2">
                 <Briefcase size={16} className="text-emerald-600" /> Lịch sử phân công giảng dạy
               </h3>
               <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase border-b">
                    <tr><th className="px-5 py-4">Giáo viên</th><th className="px-5 py-4">Môn dạy</th><th className="px-5 py-4">Lớp</th><th className="px-5 py-4">Niên học</th><th className="px-5 py-4 text-right">Thao tác</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                     {assignments.filter(a => a.LoaiPhanCong === Role.GIANG_DAY).map(a => {
                       const t = teachers.find(x => x.MaGV === a.MaGV);
                       const c = classes.find(x => x.MaLop === a.MaLop);
                       const y = years.find(x => x.MaNienHoc === a.MaNienHoc);
                       const sub = subjects.find(x => x.id === a.MaMonHoc);
                       return (
                         <tr key={a.MaPhanCong} className="hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-3 font-bold text-slate-800 text-xs">{t?.Hoten}</td>
                            <td className="px-5 py-3"><span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[9px] font-bold uppercase">{sub?.name || a.MaMonHoc}</span></td>
                            <td className="px-5 py-3 font-normal text-slate-500 text-xs">{c?.TenLop}</td>
                            <td className="px-5 py-3 font-normal text-slate-400 text-[10px]">{y?.TenNienHoc}</td>
                            <td className="px-5 py-3 text-right"><button onClick={() => handleDeleteAssignment(a.MaPhanCong)} className="p-1.5 text-slate-300 hover:text-rose-500 rounded-xl transition-all"><Trash2 size={16}/></button></td>
                         </tr>
                       );
                     })}
                  </tbody>
               </table>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemManager;
