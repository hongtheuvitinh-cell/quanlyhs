
import React, { useState } from 'react';
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

const SystemManager: React.FC<Props> = ({ years, classes, teachers, assignments, onUpdate, students }) => {
  const [activeSubTab, setActiveSubTab] = useState<'YEARS' | 'CLASSES' | 'ASSIGN'>('YEARS');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newYearName, setNewYearName] = useState('');
  const [newClass, setNewClass] = useState<Partial<Class>>({ MaLop: '', TenLop: '', Khoi: 10 });

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
    const { error } = await supabase.from('classes').insert([newClass]);
    if (error) alert("Lỗi: " + error.message); else { setNewClass({ MaLop: '', TenLop: '', Khoi: 10 }); await onUpdate(); }
    setIsSubmitting(false);
  };

  const handleDeleteYear = async (id: number) => {
    if (!confirm("Xóa niên học này? Lưu ý: Mọi dữ liệu phân công thuộc niên học này sẽ bị ảnh hưởng.")) return;
    await supabase.from('academic_years').delete().eq('MaNienHoc', id);
    await onUpdate();
  };

  const handleDeleteClass = async (id: string) => {
    if (!confirm("Xóa lớp học này khỏi hệ thống?")) return;
    await supabase.from('classes').delete().eq('MaLop', id);
    await onUpdate();
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
          <BookOpen size={16} /> Phân công
        </button>
      </div>

      <div className="bg-white rounded-[40px] border border-slate-200 overflow-hidden shadow-sm min-h-[500px]">
        {activeSubTab === 'YEARS' && (
          <div className="p-8 space-y-10 animate-in slide-in-from-left-4 duration-500">
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
                   <button onClick={() => handleDeleteYear(y.MaNienHoc)} className="p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={18}/></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSubTab === 'CLASSES' && (
          <div className="p-8 space-y-10 animate-in slide-in-from-right-4 duration-500">
             <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-6 items-end shadow-inner">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase px-2">Mã lớp</label>
                   <input type="text" value={newClass.MaLop} onChange={e => setNewClass({...newClass, MaLop: e.target.value})} placeholder="VD: 10A1" className="w-full p-3.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none" />
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
                <button disabled={isSubmitting} onClick={handleAddClass} className="py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-700 shadow-xl transition-all active:scale-95"><Plus size={18}/> Thêm lớp</button>
             </div>
             
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {classes.map(c => (
                   <div key={c.MaLop} className="p-6 bg-white border border-slate-100 rounded-[32px] shadow-sm hover:border-indigo-400 transition-all relative group">
                      <div className="flex justify-between items-start mb-4">
                         <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[9px] font-black uppercase border border-indigo-100">Khối {c.Khoi}</span>
                         <button onClick={() => handleDeleteClass(c.MaLop)} className="text-slate-200 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
                      </div>
                      <h4 className="font-black text-slate-800 text-base uppercase mb-1">{c.TenLop}</h4>
                      <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Mã lớp: {c.MaLop}</p>
                   </div>
                ))}
             </div>
          </div>
        )}

        {activeSubTab === 'ASSIGN' && (
           <div className="p-32 text-center flex flex-col items-center justify-center gap-6 animate-in zoom-in">
              <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-200 shadow-inner"><BookOpen size={40}/></div>
              <div className="space-y-2">
                 <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">Cấu hình phân công giáo viên</h4>
                 <p className="text-xs text-slate-400 max-w-sm font-medium mx-auto">Vui lòng quản lý phân công giảng dạy thông qua cơ sở dữ liệu Supabase để đảm bảo bảo mật và tính chính xác cao nhất cho niên học hiện tại.</p>
              </div>
           </div>
        )}
      </div>
    </div>
  );
};

export default SystemManager;
