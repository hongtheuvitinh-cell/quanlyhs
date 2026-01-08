
import React, { useState, useMemo, useEffect } from 'react';
import { ShieldAlert, Plus, AlertCircle, Trash2, Save, X, Edit3, Check, Loader2, CheckCircle2, Filter, Eye, Lock, BookOpen, Settings2, Sparkles } from 'lucide-react';
import { AppState, Student, Discipline, ViolationRule, Assignment, Teacher, Role } from '../types';
import { supabase } from '../services/supabaseClient';

interface Props {
  state: AppState;
  students: Student[];
  violationRules: ViolationRule[];
  assignments: Assignment[];
  onUpdateRules: (rules: ViolationRule[]) => Promise<void>;
}

const actionTypes = ["Nhắc nhở", "Viết bản kiểm điểm", "Trực lao động", "Mời phụ huynh", "Khiển trách lớp", "Cảnh cáo", "Đình chỉ"];

const DisciplineManager: React.FC<Props> = ({ state, students, violationRules, assignments, onUpdateRules }) => {
  const currentUser = state.currentUser as Teacher;
  const isAdmin = currentUser?.quanly === true;
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const canManage = useMemo(() => {
    if (isAdmin) return true;
    if (!currentUser || !state.selectedClass) return false;
    const hasHomeroomAssignment = (assignments || []).some(a => 
      a.MaGV === currentUser.MaGV && a.MaLop === state.selectedClass && a.LoaiPhanCong === Role.CHU_NHIEM
    );
    return state.currentRole === Role.CHU_NHIEM && hasHomeroomAssignment;
  }, [isAdmin, state.currentRole, currentUser, state.selectedClass, assignments]);

  const fetchDisciplines = async () => {
    if (students.length === 0) { setDisciplines([]); return; }
    setIsLoading(true);
    try {
      const studentIds = students.map(s => s.MaHS);
      const { data, error } = await supabase
        .from('disciplines')
        .select('*')
        .eq('MaNienHoc', state.selectedYear)
        .in('MaHS', studentIds);
      if (error) throw error;
      setDisciplines(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setIsLoading(false), 200);
    }
  };

  useEffect(() => { fetchDisciplines(); }, [state.selectedClass, state.selectedYear, students]);

  const [activeView, setActiveView] = useState<'LIST' | 'RULES' | 'CONDUCT'>('LIST');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // States cho quản lý quy tắc
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Partial<ViolationRule> | null>(null);

  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');

  const [formDiscipline, setFormDiscipline] = useState<Partial<Discipline>>({
    MaHS: '', NgayViPham: new Date().toISOString().split('T')[0], MaLoi: '', NoiDungChiTiet: '', HinhThucXL: 'Nhắc nhở'
  });

  const filteredDisciplines = useMemo(() => {
    return (disciplines || []).filter(d => {
      const dDate = new Date(d.NgayViPham);
      if (isNaN(dDate.getTime())) return true;
      const dMonth = (dDate.getMonth() + 1).toString();
      let matches = true;
      if (filterMonth !== 'all' && dMonth !== filterMonth) matches = false;
      if (filterStartDate && d.NgayViPham < filterStartDate) matches = false;
      if (filterEndDate && d.NgayViPham > filterEndDate) matches = false;
      return matches;
    }).sort((a,b) => b.MaKyLuat - a.MaKyLuat);
  }, [disciplines, filterMonth, filterStartDate, filterEndDate]);

  const conductScores = useMemo(() => {
    return (students || []).map(student => {
      const studentDisciplines = (disciplines || []).filter(d => d.MaHS === student.MaHS);
      const totalDeduction = studentDisciplines.reduce((sum, d) => sum + (Number(d.DiemTruTaiThoiDiemDo) || 0), 0);
      const score = Math.max(0, 100 - totalDeduction);
      let classification = "Yếu"; let color = "text-rose-600 bg-rose-50";
      if (score >= 80) { classification = "Tốt"; color = "text-emerald-600 bg-emerald-50"; }
      else if (score >= 65) { classification = "Khá"; color = "text-indigo-600 bg-indigo-50"; }
      else if (score >= 50) { classification = "Trung Bình"; color = "text-amber-600 bg-amber-50"; }
      return { student, score, totalDeduction, classification, color, violationCount: studentDisciplines.length };
    });
  }, [students, disciplines]);

  const handleSaveDiscipline = async () => {
    if (!formDiscipline.MaHS || !formDiscipline.MaLoi) { alert("Thiếu thông tin!"); return; }
    const selectedRule = violationRules.find(r => r.MaLoi === formDiscipline.MaLoi);
    if (!selectedRule) return;
    setIsSubmitting(true);
    try {
      const record: Discipline = {
        MaKyLuat: modalMode === 'add' ? (Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000)) : formDiscipline.MaKyLuat!, 
        MaHS: formDiscipline.MaHS!, NgayViPham: formDiscipline.NgayViPham!, MaLoi: formDiscipline.MaLoi!, 
        NoiDungChiTiet: formDiscipline.NoiDungChiTiet || '', 
        DiemTruTaiThoiDiemDo: modalMode === 'add' ? (Number(selectedRule.DiemTru) || 0) : (formDiscipline.DiemTruTaiThoiDiemDo || 0),
        HinhThucXL: formDiscipline.HinhThucXL!, MaNienHoc: state.selectedYear
      };
      await supabase.from('disciplines').upsert([record]);
      await fetchDisciplines();
      setIsModalOpen(false);
    } finally { setIsSubmitting(false); }
  };

  const handleDeleteDiscipline = async (id: number) => {
    if (!confirm("Xóa vi phạm này?")) return;
    await supabase.from('disciplines').delete().eq('MaKyLuat', id);
    await fetchDisciplines();
  };

  // Quản lý quy tắc
  const handleSaveRule = async () => {
    if (!editingRule?.TenLoi || !editingRule?.DiemTru) { alert("Nhập đủ thông tin quy tắc!"); return; }
    setIsSubmitting(true);
    try {
      const rule: ViolationRule = {
        MaLoi: editingRule.MaLoi || `RULE_${Date.now()}`,
        TenLoi: editingRule.TenLoi,
        DiemTru: Number(editingRule.DiemTru)
      };
      await onUpdateRules([rule]);
      setIsRuleModalOpen(false);
      setEditingRule(null);
    } finally { setIsSubmitting(false); }
  };

  const handleDeleteRule = async (maLoi: string) => {
    if (!confirm("Xóa quy tắc này? Những vi phạm cũ vẫn giữ nguyên điểm trừ nhưng quy tắc sẽ mất khỏi danh sách chọn.")) return;
    await supabase.from('violation_rules').delete().eq('MaLoi', maLoi);
    window.location.reload(); // Refresh to update rules from App.tsx
  };

  return (
    <div className="space-y-4 animate-in fade-in pb-20">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-600 rounded-2xl text-white shadow-lg"><ShieldAlert size={20} /></div>
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Kỷ luật & Rèn luyện</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Lớp {state.selectedClass} • {isAdmin ? 'Quản trị viên (Toàn quyền)' : canManage ? 'Quản lý (GVCN)' : 'Chỉ xem'}</p>
          </div>
        </div>
        <div className="flex p-1 bg-slate-100 rounded-xl">
          <button onClick={() => setActiveView('LIST')} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${activeView === 'LIST' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400'}`}>Lịch sử</button>
          <button onClick={() => setActiveView('CONDUCT')} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${activeView === 'CONDUCT' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400'}`}>Xếp loại</button>
          {canManage && <button onClick={() => setActiveView('RULES')} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${activeView === 'RULES' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400'}`}>Bộ quy tắc</button>}
        </div>
      </div>

      <div className="relative min-h-[400px]">
        {isLoading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-3">
             <Loader2 className="animate-spin text-rose-600" size={32} />
             <p className="text-[10px] font-black text-slate-500 uppercase">Đang tải...</p>
          </div>
        )}

        {activeView === 'LIST' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-3xl border border-slate-200 flex flex-wrap items-end gap-4 shadow-sm">
               <div className="space-y-1.5 flex-1 min-w-[150px]">
                  <label className="text-[9px] font-black text-slate-400 uppercase">Tháng</label>
                  <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="w-full p-2 bg-slate-50 border rounded-xl text-xs font-bold outline-none">
                     <option value="all">Tất cả</option>
                     {Array.from({length: 12}, (_, i) => (<option key={i+1} value={(i+1).toString()}>Tháng {i+1}</option>))}
                  </select>
               </div>
               <div className="space-y-1.5 flex-1 min-w-[150px]">
                  <label className="text-[9px] font-black text-slate-400 uppercase">Từ ngày</label>
                  <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="w-full p-2 bg-slate-50 border rounded-xl text-xs font-bold outline-none" />
               </div>
               <button onClick={() => { setFilterMonth('all'); setFilterStartDate(''); setFilterEndDate(''); }} className="px-4 py-2 text-[9px] font-black text-rose-500 uppercase hover:bg-rose-50 rounded-xl">Xóa lọc</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {canManage && (
                <div onClick={() => { setModalMode('add'); setIsModalOpen(true); }} className="bg-white rounded-[32px] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-8 hover:bg-rose-50/30 cursor-pointer min-h-[160px] group transition-all">
                  <div className="p-3 bg-rose-50 rounded-2xl text-rose-600 mb-3 group-hover:scale-110 transition-transform"><Plus size={24} /></div>
                  <p className="text-[10px] font-black uppercase">Ghi nhận vi phạm</p>
                </div>
              )}
              {filteredDisciplines.map(item => {
                const student = students.find(s => s.MaHS === item.MaHS);
                const rule = violationRules.find(r => r.MaLoi === item.MaLoi);
                return (
                  <div key={item.MaKyLuat} className="bg-white rounded-[32px] shadow-sm border border-slate-200 p-5 group relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-black text-xs">{student?.Hoten?.charAt(0) || '?'}</div>
                        <div>
                          <h4 className="font-black text-slate-800 text-xs uppercase leading-none mb-1.5">{student?.Hoten}</h4>
                          <span className="text-[8px] font-black text-slate-400 uppercase">{item.NgayViPham}</span>
                        </div>
                      </div>
                      <div className="px-2 py-1 bg-rose-600 text-white rounded-lg text-[10px] font-black">-{item.DiemTruTaiThoiDiemDo}đ</div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border mb-4">
                      <p className="text-[9px] font-black text-rose-600 uppercase mb-1">{rule?.TenLoi || item.MaLoi}</p>
                      <p className="text-[11px] text-slate-600 italic line-clamp-2">"{item.NoiDungChiTiet}"</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-rose-600 bg-rose-50 px-3 py-1 rounded-xl uppercase tracking-widest">{item.HinhThucXL}</span>
                      {canManage && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => { setFormDiscipline(item); setModalMode('edit'); setIsModalOpen(true); }} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl"><Edit3 size={15}/></button>
                          <button onClick={() => handleDeleteDiscipline(item.MaKyLuat)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl"><Trash2 size={15}/></button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeView === 'RULES' && (
          <div className="space-y-6 animate-in slide-in-from-right-4">
             <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                   <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg"><BookOpen size={22} /></div>
                   <div>
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Danh mục lỗi vi phạm</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Xác định các mức điểm trừ chuẩn của trường/lớp</p>
                   </div>
                </div>
                <button onClick={() => { setEditingRule({TenLoi: '', DiemTru: 5}); setIsRuleModalOpen(true); }} className="px-8 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
                   <Plus size={18} /> Thêm quy tắc mới
                </button>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {violationRules.map(rule => (
                  <div key={rule.MaLoi} className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm hover:border-indigo-300 transition-all group relative overflow-hidden">
                     <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400"><Settings2 size={18}/></div>
                        <div className="text-right">
                           <span className="text-rose-600 font-black text-xl">-{rule.DiemTru}</span>
                           <span className="text-[9px] text-slate-400 font-bold uppercase block">Điểm</span>
                        </div>
                     </div>
                     <h4 className="text-[11px] font-black text-slate-800 uppercase leading-tight mb-4 min-h-[32px] line-clamp-2">{rule.TenLoi}</h4>
                     <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all pt-2 border-t border-slate-50">
                        <button onClick={() => { setEditingRule(rule); setIsRuleModalOpen(true); }} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl"><Edit3 size={16}/></button>
                        <button onClick={() => handleDeleteRule(rule.MaLoi)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl"><Trash2 size={16}/></button>
                     </div>
                  </div>
                ))}
                {violationRules.length === 0 && (
                  <div className="col-span-full py-20 text-center opacity-30 italic text-[10px] font-black uppercase">Chưa có quy tắc nào được thiết lập</div>
                )}
             </div>
          </div>
        )}

        {activeView === 'CONDUCT' && (
          <div className="bg-white rounded-[40px] shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b">
                <tr><th className="px-8 py-5">Học sinh</th><th className="px-6 py-5 text-center">Tổng lỗi</th><th className="px-6 py-5 text-center">Điểm rèn luyện</th><th className="px-8 py-5 text-center">Xếp loại</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {conductScores.map(({ student, score, classification, color, violationCount }) => (
                  <tr key={student.MaHS} className="hover:bg-indigo-50/20 transition-colors">
                    <td className="px-8 py-4"><p className="text-xs font-bold text-slate-800 uppercase tracking-tight">{student.Hoten}</p></td>
                    <td className="px-6 py-4 text-center text-[11px] font-bold text-slate-400">{violationCount}</td>
                    <td className="px-6 py-4 text-center font-black text-slate-700 text-sm">{score} / 100</td>
                    <td className="px-8 py-4 text-center"><span className={`px-4 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest ${color}`}>{classification}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Ghi nhận vi phạm */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden my-auto border border-white/20">
            <div className="px-6 py-5 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="p-2.5 bg-rose-600 rounded-xl text-white shadow-lg"><Plus size={18}/></div>
                 <h3 className="font-black text-sm text-slate-800 uppercase tracking-tight">{modalMode === 'add' ? 'Ghi nhận vi phạm' : 'Cập nhật vi phạm'}</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20}/></button>
            </div>
            <div className="px-8 py-6 space-y-5 bg-slate-50/20">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Học sinh</label>
                  <select disabled={modalMode === 'edit'} value={formDiscipline.MaHS} onChange={e => setFormDiscipline({...formDiscipline, MaHS: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none shadow-sm">
                    <option value="">-- Chọn --</option>
                    {students.map(s => <option key={s.MaHS} value={s.MaHS}>{s.Hoten}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Ngày vi phạm</label>
                  <input type="date" value={formDiscipline.NgayViPham} onChange={e => setFormDiscipline({...formDiscipline, NgayViPham: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none shadow-sm" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Lỗi vi phạm (Theo quy tắc)</label>
                <select disabled={modalMode === 'edit'} value={formDiscipline.MaLoi} onChange={e => setFormDiscipline({...formDiscipline, MaLoi: e.target.value})} className="w-full p-3 bg-rose-50 border-rose-100 text-rose-600 rounded-xl text-xs font-black outline-none shadow-sm">
                  <option value="">-- Chọn lỗi từ bộ quy tắc --</option>
                  {violationRules.map(r => <option key={r.MaLoi} value={r.MaLoi}>{r.TenLoi} (-{r.DiemTru}đ)</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Hình thức xử lý</label>
                <div className="flex flex-wrap gap-2">
                  {actionTypes.map(type => (
                    <button key={type} onClick={() => setFormDiscipline({...formDiscipline, HinhThucXL: type})} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase border transition-all shadow-sm ${formDiscipline.HinhThucXL === type ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}`}>{type}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Ghi chú chi tiết</label>
                <textarea value={formDiscipline.NoiDungChiTiet} onChange={e => setFormDiscipline({...formDiscipline, NoiDungChiTiet: e.target.value})} placeholder="Vd: Không thuộc bài môn Toán, tái phạm lần 2..." className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-xs font-medium min-h-[100px] outline-none shadow-inner"></textarea>
              </div>
            </div>
            <div className="px-8 py-5 border-t bg-white flex gap-4">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3.5 bg-slate-50 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all">Hủy bỏ</button>
              <button disabled={isSubmitting} onClick={handleSaveDiscipline} className="flex-[2] py-3.5 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-rose-100 flex items-center justify-center gap-2 hover:bg-rose-700 transition-all">
                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Lưu vi phạm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Quản lý Quy tắc (Rule Modal) */}
      {isRuleModalOpen && editingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden my-auto border border-white/20">
             <div className="px-6 py-5 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-lg"><Settings2 size={18}/></div>
                   <h3 className="font-black text-sm text-slate-800 uppercase tracking-tight">{editingRule.MaLoi ? 'Chỉnh sửa quy tắc' : 'Thêm quy tắc mới'}</h3>
                </div>
                <button onClick={() => setIsRuleModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20}/></button>
             </div>
             <div className="p-8 space-y-6 bg-slate-50/20">
                <div className="space-y-1.5">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Tên lỗi vi phạm</label>
                   <input type="text" value={editingRule.TenLoi} onChange={e => setEditingRule({...editingRule, TenLoi: e.target.value})} placeholder="VD: Đi học muộn" className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-xs font-black outline-none shadow-sm focus:border-indigo-400 transition-all" />
                </div>
                <div className="space-y-1.5">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Điểm trừ mặc định</label>
                   <div className="flex items-center gap-4">
                      <input type="range" min="1" max="50" step="1" value={editingRule.DiemTru} onChange={e => setEditingRule({...editingRule, DiemTru: parseInt(e.target.value)})} className="flex-1 accent-rose-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                      <div className="w-16 h-12 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl flex items-center justify-center font-black text-lg">-{editingRule.DiemTru}</div>
                   </div>
                   <p className="text-[9px] text-slate-400 font-bold uppercase mt-2 italic">* Điểm này sẽ tự động trừ vào 100 điểm rèn luyện gốc của học sinh</p>
                </div>
             </div>
             <div className="p-8 bg-white border-t flex gap-4">
                <button onClick={() => setIsRuleModalOpen(false)} className="flex-1 py-4 bg-slate-50 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest">Đóng</button>
                <button disabled={isSubmitting} onClick={handleSaveRule} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 hover:bg-indigo-700 transition-all">
                   {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18}/>} Lưu quy tắc
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DisciplineManager;
