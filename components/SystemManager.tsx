
import React, { useState } from 'react';
import { 
  Calendar, Layers, UserPlus, Plus, Edit2, Trash2, Save, X, Database, Users, BookOpen
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

const SystemManager: React.FC<Props> = ({ years, classes, teachers, assignments, onUpdate }) => {
  const [activeSubTab, setActiveSubTab] = useState<'YEARS' | 'CLASSES' | 'ASSIGN'>('YEARS');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // States for adding
  const [newYearName, setNewYearName] = useState('');
  const [newClassName, setNewClassName] = useState('');
  const [newClassId, setNewClassId] = useState('');
  const [newClassGrade, setNewClassGrade] = useState(10);

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

  const handleAddClass = async () => {
    if (!newClassId || !newClassName) return;
    setIsSubmitting(true);
    const { error } = await supabase.from('classes').insert([{ 
      MaLop: newClassId, 
      TenLop: newClassName, 
      Khoi: newClassGrade 
    }]);
    if (error) alert(error.message); else { setNewClassId(''); setNewClassName(''); await onUpdate(); }
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-4 animate-in fade-in">
      <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 w-fit">
        <button onClick={() => setActiveSubTab('YEARS')} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${activeSubTab === 'YEARS' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-600'}`}>Niên học</button>
        <button onClick={() => setActiveSubTab('CLASSES')} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${activeSubTab === 'CLASSES' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Phân lớp</button>
        <button onClick={() => setActiveSubTab('ASSIGN')} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${activeSubTab === 'ASSIGN' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Phân công</button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {activeSubTab === 'YEARS' && (
          <div className="p-4 space-y-4">
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase px-1">Tên niên học mới</label>
                <input type="text" value={newYearName} onChange={e => setNewYearName(e.target.value)} placeholder="VD: 2025-2026" className="w-full p-2 bg-slate-50 border border-slate-100 rounded-lg text-xs font-normal" />
              </div>
              <button disabled={isSubmitting} onClick={handleAddYear} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-[10px] font-bold uppercase flex items-center gap-1.5">
                <Plus size={14}/> Thêm
              </button>
            </div>
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase border-b border-slate-100">
                <tr><th className="px-4 py-3">Mã Niên Học</th><th className="px-4 py-3">Tên Niên Học</th><th className="px-4 py-3 text-right">Thao tác</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {years.map(y => (
                  <tr key={y.MaNienHoc} className="text-xs">
                    <td className="px-4 py-2 font-normal text-slate-500">{y.MaNienHoc}</td>
                    <td className="px-4 py-2 font-bold text-slate-800">{y.TenNienHoc}</td>
                    <td className="px-4 py-2 text-right">
                      <button className="p-1.5 text-rose-500 hover:bg-rose-50 rounded"><Trash2 size={14}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeSubTab === 'CLASSES' && (
          <div className="p-4 space-y-4">
             <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase px-1">Mã lớp</label>
                  <input type="text" value={newClassId} onChange={e => setNewClassId(e.target.value)} placeholder="10A1" className="w-full p-2 bg-slate-50 border border-slate-100 rounded-lg text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase px-1">Tên hiển thị</label>
                  <input type="text" value={newClassName} onChange={e => setNewClassName(e.target.value)} placeholder="Lớp 10A1" className="w-full p-2 bg-slate-50 border border-slate-100 rounded-lg text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase px-1">Khối</label>
                  <select value={newClassGrade} onChange={e => setNewClassGrade(parseInt(e.target.value))} className="w-full p-2 bg-slate-50 border border-slate-100 rounded-lg text-xs">
                    <option value={10}>Khối 10</option><option value={11}>Khối 11</option><option value={12}>Khối 12</option>
                  </select>
                </div>
                <button disabled={isSubmitting} onClick={handleAddClass} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-[10px] font-bold uppercase flex items-center gap-1.5 justify-center">
                  <Plus size={14}/> Tạo lớp
                </button>
             </div>
             <table className="w-full text-left">
                <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase border-b border-slate-100">
                  <tr><th className="px-4 py-3">Mã Lớp</th><th className="px-4 py-3">Tên Lớp</th><th className="px-4 py-3">Khối</th><th className="px-4 py-3 text-right">Thao tác</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {classes.map(c => (
                    <tr key={c.MaLop} className="text-xs">
                      <td className="px-4 py-2 font-bold text-slate-800">{c.MaLop}</td>
                      <td className="px-4 py-2 font-normal text-slate-600">{c.TenLop}</td>
                      <td className="px-4 py-2 font-normal text-slate-600">Khối {c.Khoi}</td>
                      <td className="px-4 py-2 text-right">
                        <button className="p-1.5 text-rose-500 hover:bg-rose-50 rounded"><Trash2 size={14}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
             </table>
          </div>
        )}

        {activeSubTab === 'ASSIGN' && (
          <div className="p-4 space-y-4">
             <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg flex items-center gap-3 text-blue-700 text-xs font-normal italic">
                <Database size={16} /> Tính năng đang được tối ưu hóa để quản lý hàng nghìn giáo viên trên Cloud.
             </div>
             <table className="w-full text-left">
                <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase border-b">
                  <tr><th className="px-4 py-3">Giáo viên</th><th className="px-4 py-3">Lớp</th><th className="px-4 py-3">Nhiệm vụ</th><th className="px-4 py-3 text-right">Thao tác</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                   {assignments.map(a => {
                     const t = teachers.find(x => x.MaGV === a.MaGV);
                     const c = classes.find(x => x.MaLop === a.MaLop);
                     return (
                       <tr key={a.MaPhanCong} className="text-xs">
                          <td className="px-4 py-2 font-bold text-slate-800">{t?.Hoten}</td>
                          <td className="px-4 py-2 font-normal text-slate-500">{c?.TenLop}</td>
                          <td className="px-4 py-2">
                             <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${a.LoaiPhanCong === Role.CHU_NHIEM ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
                               {a.LoaiPhanCong === Role.CHU_NHIEM ? 'Chủ nhiệm' : 'Giảng dạy'}
                             </span>
                          </td>
                          <td className="px-4 py-2 text-right"><button className="p-1 text-slate-300"><X size={14}/></button></td>
                       </tr>
                     );
                   })}
                </tbody>
             </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemManager;
