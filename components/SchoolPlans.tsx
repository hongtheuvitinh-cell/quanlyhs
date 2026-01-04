
import React, { useState, useMemo } from 'react';
import { 
  Calendar, Info, Plus, Trash2, Edit2, Save, X, FileText, 
  Users, Globe, ChevronRight, Clock, AlertCircle, Loader2, Link as LinkIcon 
} from 'lucide-react';
import { AppState, SchoolPlan, Class, Role } from '../types';

interface Props {
  state: AppState;
  plans: SchoolPlan[];
  classes: Class[];
  onUpdatePlan: (plan: SchoolPlan) => Promise<void>;
  onDeletePlan: (id: number) => Promise<void>;
}

const SchoolPlans: React.FC<Props> = ({ state, plans, classes, onUpdatePlan, onDeletePlan }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Partial<SchoolPlan> | null>(null);
  const isAdmin = (state.currentUser as any)?.MaGV === 'GV001'; // Giả định GV001 là admin

  const filteredPlans = useMemo(() => {
    return plans
      .filter(p => p.MaNienHoc === state.selectedYear)
      .sort((a, b) => b.Tuan - a.Tuan);
  }, [plans, state.selectedYear]);

  const handleSave = async () => {
    if (!editingPlan?.TieuDe || !editingPlan?.Tuan) {
      alert("Vui lòng nhập Tiêu đề và số Tuần!");
      return;
    }
    setIsSubmitting(true);
    try {
      const plan: SchoolPlan = {
        MaKeHoach: editingPlan.MaKeHoach || Math.floor(Date.now() / 1000),
        TieuDe: editingPlan.TieuDe!,
        NoiDung: editingPlan.NoiDung || '',
        Tuan: Number(editingPlan.Tuan),
        TuNgay: editingPlan.TuNgay || new Date().toISOString().split('T')[0],
        DenNgay: editingPlan.DenNgay || new Date().toISOString().split('T')[0],
        MaNienHoc: state.selectedYear,
        DoiTuong: editingPlan.DoiTuong || null,
        DinhKem: editingPlan.DinhKem || ''
      };
      await onUpdatePlan(plan);
      setIsModalOpen(false);
    } catch (e: any) {
      alert("Lỗi: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAdd = () => {
    setEditingPlan({
      Tuan: filteredPlans.length > 0 ? filteredPlans[0].Tuan + 1 : 1,
      TuNgay: new Date().toISOString().split('T')[0],
      DenNgay: new Date().toISOString().split('T')[0],
      DoiTuong: null
    });
    setIsModalOpen(true);
  };

  const openEdit = (plan: SchoolPlan) => {
    setEditingPlan(plan);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-20">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-100"><Calendar size={24} /></div>
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Kế hoạch & Thông báo tuần</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Niên học {state.selectedYear} • {filteredPlans.length} kế hoạch</p>
          </div>
        </div>
        {isAdmin && (
          <button onClick={openAdd} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2">
            <Plus size={18} /> Đăng kế hoạch tuần
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredPlans.length > 0 ? filteredPlans.map(plan => {
          const isGlobal = !plan.DoiTuong || plan.DoiTuong.length === 0;
          const isTargetedToMe = isGlobal || (state.selectedClass && plan.DoiTuong?.includes(state.selectedClass));
          
          if (!isAdmin && !isTargetedToMe) return null;

          return (
            <div key={plan.MaKeHoach} className="bg-white rounded-[40px] border border-slate-200 shadow-sm p-6 flex flex-col gap-5 hover:shadow-xl transition-all group relative overflow-hidden">
               <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Tuần {plan.Tuan}</span>
                    <h3 className="text-sm font-black text-slate-800 uppercase leading-tight">{plan.TieuDe}</h3>
                  </div>
                  <div className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ${isGlobal ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                    {isGlobal ? <Globe size={12}/> : <Users size={12}/>}
                    {isGlobal ? 'Toàn trường' : 'Chọn lọc'}
                  </div>
               </div>
               
               <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 flex-1">
                 <p className="text-[11px] text-slate-600 leading-relaxed font-medium whitespace-pre-line line-clamp-6 italic">
                   {plan.NoiDung || 'Chưa có nội dung chi tiết.'}
                 </p>
               </div>

               <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                    <Clock size={12} /> {plan.TuNgay} → {plan.DenNgay}
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1">
                       <button onClick={() => openEdit(plan)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><Edit2 size={16}/></button>
                       <button onClick={() => { if(confirm("Xóa kế hoạch này?")) onDeletePlan(plan.MaKeHoach); }} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={16}/></button>
                    </div>
                  )}
               </div>

               {plan.DinhKem && (
                 <a href={plan.DinhKem} target="_blank" className="mt-2 flex items-center justify-center gap-2 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all border border-indigo-100 shadow-sm">
                   <LinkIcon size={14} /> Xem tệp đính kèm
                 </a>
               )}
            </div>
          );
        }) : (
          <div className="col-span-full py-24 bg-white rounded-[40px] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center opacity-30">
             <FileText size={56} className="text-slate-300 mb-4" />
             <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Chưa có kế hoạch tuần nào được đăng</p>
          </div>
        )}
      </div>

      {isModalOpen && editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
              <div className="p-6 border-b flex items-center justify-between bg-white shrink-0">
                 <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-600 rounded-2xl text-white shadow-lg"><FileText size={20} /></div>
                    <h3 className="font-black text-sm text-slate-800 uppercase tracking-tight">Soạn thảo kế hoạch tuần</h3>
                 </div>
                 <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={24}/></button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 bg-slate-50/20 space-y-6 custom-scrollbar">
                 <div className="grid grid-cols-3 gap-6">
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Tuần số</label>
                       <input type="number" value={editingPlan.Tuan || ''} onChange={e => setEditingPlan({...editingPlan, Tuan: parseInt(e.target.value)})} className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-indigo-400 shadow-sm" />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Từ ngày</label>
                       <input type="date" value={editingPlan.TuNgay || ''} onChange={e => setEditingPlan({...editingPlan, TuNgay: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none shadow-sm" />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Đến ngày</label>
                       <input type="date" value={editingPlan.DenNgay || ''} onChange={e => setEditingPlan({...editingPlan, DenNgay: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none shadow-sm" />
                    </div>
                 </div>

                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Tiêu đề thông báo</label>
                    <input type="text" value={editingPlan.TieuDe || ''} onChange={e => setEditingPlan({...editingPlan, TieuDe: e.target.value})} placeholder="VD: Kế hoạch Tuần học thứ 25" className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-indigo-400 shadow-sm" />
                 </div>

                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nội dung kế hoạch chi tiết</label>
                    <textarea value={editingPlan.NoiDung || ''} onChange={e => setEditingPlan({...editingPlan, NoiDung: e.target.value})} className="w-full p-5 bg-white border border-slate-200 rounded-[32px] text-xs font-medium h-48 outline-none focus:border-indigo-400 shadow-sm" placeholder="Liệt kê các đầu việc trọng tâm trong tuần..."></textarea>
                 </div>

                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Link đính kèm (Drive/Ảnh/PDF)</label>
                    <input type="text" value={editingPlan.DinhKem || ''} onChange={e => setEditingPlan({...editingPlan, DinhKem: e.target.value})} placeholder="https://..." className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-xs font-normal outline-none focus:border-indigo-400 shadow-sm" />
                 </div>

                 <div className="space-y-3">
                    <div className="flex justify-between items-center">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Đối tượng áp dụng</label>
                       <button onClick={() => setEditingPlan({...editingPlan, DoiTuong: null})} className="text-[9px] font-black text-emerald-600 uppercase hover:underline">Toàn trường</button>
                    </div>
                    <div className="flex flex-wrap gap-2 p-3 bg-white border border-slate-100 rounded-2xl min-h-[60px] shadow-inner">
                       {classes.map(c => {
                          const isSelected = editingPlan.DoiTuong?.includes(c.MaLop);
                          return (
                            <button 
                              key={c.MaLop} 
                              onClick={() => {
                                let newDoiTuong = editingPlan.DoiTuong ? [...editingPlan.DoiTuong] : [];
                                if (isSelected) newDoiTuong = newDoiTuong.filter(id => id !== c.MaLop);
                                else newDoiTuong.push(c.MaLop);
                                setEditingPlan({...editingPlan, DoiTuong: newDoiTuong});
                              }}
                              className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-all border ${isSelected ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-slate-300'}`}
                            >
                              {c.MaLop}
                            </button>
                          );
                       })}
                    </div>
                    {(!editingPlan.DoiTuong || editingPlan.DoiTuong.length === 0) && (
                      <p className="text-[9px] text-emerald-600 font-bold italic text-center">Tất cả các lớp sẽ nhận được thông báo này.</p>
                    )}
                 </div>
              </div>

              <div className="p-6 bg-white border-t flex justify-end gap-3 shrink-0">
                 <button onClick={() => setIsModalOpen(false)} className="px-10 py-3.5 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">Đóng</button>
                 <button onClick={handleSave} disabled={isSubmitting} className="px-14 py-3.5 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all text-[10px] uppercase tracking-widest flex items-center gap-2">
                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18}/>} 
                    {editingPlan.MaKeHoach ? 'Cập nhật' : 'Đăng kế hoạch'}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default SchoolPlans;

