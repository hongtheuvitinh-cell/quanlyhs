
import React, { useState, useMemo } from 'react';
import { ShieldAlert, Plus, AlertCircle, Trash2, Save, X, Edit3, Check, Loader2, CheckCircle2, Filter } from 'lucide-react';
import { AppState, Student, Discipline, ViolationRule } from '../types';

interface Props {
  state: AppState;
  students: Student[];
  disciplines: Discipline[];
  violationRules: ViolationRule[];
  onUpdateDisciplines: (disciplines: Discipline[]) => Promise<void>;
  onDeleteDiscipline: (id: number) => Promise<void>;
  onUpdateRules: (rules: ViolationRule[]) => Promise<void>;
}

const actionTypes = ["Nhắc nhở", "Viết bản kiểm điểm", "Trực lao động", "Mời phụ huynh", "Khiển trách lớp", "Cảnh cáo", "Đình chỉ"];

const DisciplineManager: React.FC<Props> = ({ state, students, disciplines, violationRules, onUpdateDisciplines, onDeleteDiscipline, onUpdateRules }) => {
  const isChuNhiem = state.currentRole === 'ChuNhiem';
  const [activeView, setActiveView] = useState<'LIST' | 'RULES' | 'CONDUCT'>('LIST');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [ruleFormData, setRuleFormData] = useState<Partial<ViolationRule>>({});

  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');

  const [formDiscipline, setFormDiscipline] = useState<Partial<Discipline>>({
    MaHS: '', NgayViPham: new Date().toISOString().split('T')[0], MaLoi: '', NoiDungChiTiet: '', HinhThucXL: 'Nhắc nhở'
  });

  const filteredDisciplines = useMemo(() => {
    return disciplines.filter(d => {
      const dDate = new Date(d.NgayViPham);
      const dMonth = (dDate.getMonth() + 1).toString();
      let matches = true;
      if (filterMonth !== 'all' && dMonth !== filterMonth) matches = false;
      if (filterStartDate && d.NgayViPham < filterStartDate) matches = false;
      if (filterEndDate && d.NgayViPham > filterEndDate) matches = false;
      return matches;
    }).sort((a,b) => b.MaKyLuat - a.MaKyLuat);
  }, [disciplines, filterMonth, filterStartDate, filterEndDate]);

  const conductScores = useMemo(() => {
    return students.map(student => {
      const studentDisciplines = disciplines.filter(d => d.MaHS === student.MaHS && d.MaNienHoc === state.selectedYear);
      const totalDeduction = studentDisciplines.reduce((sum, d) => sum + (Number(d.DiemTruTaiThoiDiemDo) || 0), 0);
      const score = Math.max(0, 100 - totalDeduction);
      let classification = "Yếu"; let color = "text-rose-600 bg-rose-50";
      if (score >= 80) { classification = "Tốt"; color = "text-emerald-600 bg-emerald-50"; }
      else if (score >= 65) { classification = "Khá"; color = "text-indigo-600 bg-indigo-50"; }
      else if (score >= 50) { classification = "Trung Bình"; color = "text-amber-600 bg-amber-50"; }
      return { student, score, totalDeduction, classification, color, violationCount: studentDisciplines.length };
    });
  }, [students, disciplines, state.selectedYear]);

  const handleOpenAdd = () => {
    setModalMode('add');
    setFormDiscipline({ MaHS: '', NgayViPham: new Date().toISOString().split('T')[0], MaLoi: '', NoiDungChiTiet: '', HinhThucXL: 'Nhắc nhở' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: Discipline) => {
    setModalMode('edit');
    setFormDiscipline(item);
    setIsModalOpen(true);
  };

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
      await onUpdateDisciplines([record]);
      setIsModalOpen(false);
    } finally { setIsSubmitting(false); }
  };

  const handleSaveRule = async () => {
    if (!ruleFormData.TenLoi) { alert("Vui lòng nhập tên lỗi!"); return; }
    setIsSubmitting(true);
    try {
      const rule: ViolationRule = {
        MaLoi: editingRuleId === 'new' ? `RULE_${Date.now()}` : editingRuleId!,
        TenLoi: ruleFormData.TenLoi!,
        DiemTru: Number(ruleFormData.DiemTru) || 0
      };
      await onUpdateRules([rule]);
      setEditingRuleId(null);
      setRuleFormData({});
    } catch (e: any) { alert("Lỗi: " + e.message); } finally { setIsSubmitting(false); }
  };

  return (
    <div className="space-y-4 animate-in fade-in pb-20">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-600 rounded-2xl text-white shadow-lg shadow-rose-100"><ShieldAlert size={20} /></div>
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Kỷ luật & Rèn luyện</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Lớp {state.selectedClass} • {filteredDisciplines.length} bản ghi</p>
          </div>
        </div>
        <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200">
          <button onClick={() => setActiveView('LIST')} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${activeView === 'LIST' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400'}`}>Lịch sử vi phạm</button>
          <button onClick={() => setActiveView('CONDUCT')} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${activeView === 'CONDUCT' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400'}`}>Xếp loại hạnh kiểm</button>
          {isChuNhiem && <button onClick={() => setActiveView('RULES')} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${activeView === 'RULES' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400'}`}>Bộ quy tắc</button>}
        </div>
      </div>

      {activeView === 'LIST' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-wrap items-end gap-4">
             <div className="space-y-1.5 flex-1 min-w-[150px]">
                <label className="text-[9px] font-black text-slate-400 uppercase px-1 tracking-widest flex items-center gap-1"><Filter size={10}/> Lọc theo tháng</label>
                <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none text-slate-700 focus:bg-white transition-all">
                   <option value="all">Tất cả các tháng</option>
                   {Array.from({length: 12}, (_, i) => (<option key={i+1} value={(i+1).toString()}>Tháng {i+1}</option>))}
                </select>
             </div>
             <div className="space-y-1.5 flex-1 min-w-[150px]">
                <label className="text-[9px] font-black text-slate-400 uppercase px-1 tracking-widest">Từ ngày</label>
                <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none" />
             </div>
             <div className="space-y-1.5 flex-1 min-w-[150px]">
                <label className="text-[9px] font-black text-slate-400 uppercase px-1 tracking-widest">Đến ngày</label>
                <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none" />
             </div>
             <button onClick={() => { setFilterMonth('all'); setFilterStartDate(''); setFilterEndDate(''); }} className="px-4 py-2 text-[9px] font-black text-rose-500 uppercase hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100">Xóa lọc</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {isChuNhiem && (
              <div onClick={handleOpenAdd} className="bg-white rounded-[32px] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-8 transition-all hover:border-rose-400 hover:bg-rose-50/30 cursor-pointer min-h-[160px] group shadow-sm">
                <div className="p-3 bg-rose-50 rounded-2xl text-rose-600 mb-3 group-hover:scale-110 transition-transform"><Plus size={24} /></div>
                <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Ghi nhận vi phạm mới</p>
              </div>
            )}
            {filteredDisciplines.length > 0 ? filteredDisciplines.map(item => {
              const student = students.find(s => s.MaHS === item.MaHS);
              const rule = violationRules.find(r => r.MaLoi === item.MaLoi);
              return (
                <div key={item.MaKyLuat} className="bg-white rounded-[32px] shadow-sm border border-slate-200 p-5 hover:shadow-xl hover:shadow-rose-50/50 transition-all group relative overflow-hidden">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-black text-xs border border-indigo-100">{student?.Hoten.charAt(0)}</div>
                      <div>
                        <h4 className="font-black text-slate-800 text-xs uppercase leading-none mb-1.5">{student?.Hoten || 'Học sinh'}</h4>
                        <div className="flex items-center gap-2">
                           <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{item.MaHS}</span>
                           <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                           <span className="text-[8px] font-black text-slate-400 uppercase">{item.NgayViPham}</span>
                        </div>
                      </div>
                    </div>
                    <div className="px-2 py-1 bg-rose-600 text-white rounded-lg text-[10px] font-black shadow-md shadow-rose-100">-{item.DiemTruTaiThoiDiemDo}đ</div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-4">
                    <p className="text-[9px] font-black text-rose-600 uppercase mb-1 tracking-widest">{rule?.TenLoi || 'Vi phạm'}</p>
                    <p className="text-[11px] text-slate-600 font-medium italic line-clamp-2">"{item.NoiDungChiTiet || 'Không có mô tả chi tiết'}"</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-rose-600 bg-rose-50 px-3 py-1 rounded-xl uppercase border border-rose-100 tracking-tighter shadow-sm">{item.HinhThucXL}</span>
                    {isChuNhiem && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => handleOpenEdit(item)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl"><Edit3 size={15}/></button>
                        <button onClick={() => { if(confirm("Xóa vi phạm này?")) onDeleteDiscipline(item.MaKyLuat); }} className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl"><Trash2 size={15}/></button>
                      </div>
                    )}
                  </div>
                </div>
              );
            }) : (
              <div className="col-span-full py-20 bg-white rounded-[40px] border-2 border-dashed border-slate-100 text-center flex flex-col items-center justify-center opacity-40">
                <CheckCircle2 size={48} className="text-emerald-200 mb-4" />
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Không tìm thấy vi phạm nào</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeView === 'CONDUCT' && (
        <div className="bg-white rounded-[40px] shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
              <tr><th className="px-8 py-5">Học sinh</th><th className="px-6 py-5 text-center">Tổng số lỗi</th><th className="px-6 py-5 text-center">Điểm rèn luyện</th><th className="px-8 py-5 text-center">Xếp loại</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {conductScores.map(({ student, score, classification, color, violationCount }) => (
                <tr key={student.MaHS} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-4">
                     <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 font-bold text-[10px]">{student.Hoten.charAt(0)}</div>
                        <div>
                           <p className="text-xs font-bold text-slate-800 uppercase">{student.Hoten}</p>
                           <p className="text-[9px] text-slate-400 font-bold">{student.MaHS}</p>
                        </div>
                     </div>
                  </td>
                  <td className="px-6 py-4 text-center text-[11px] font-bold text-slate-400">{violationCount}</td>
                  <td className="px-6 py-4 text-center font-black text-slate-700 text-sm">{score}</td>
                  <td className="px-8 py-4 text-center"><span className={`px-4 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm ${color}`}>{classification}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeView === 'RULES' && (
        <div className="bg-white rounded-[40px] shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
            <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest flex items-center gap-2">Bộ quy tắc rèn luyện</h3>
            <button 
              onClick={() => { setEditingRuleId('new'); setRuleFormData({ TenLoi: '', DiemTru: 2 }); }} 
              disabled={editingRuleId === 'new'}
              className="px-6 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-2"
            >
              <Plus size={16} /> Thêm quy tắc
            </button>
          </div>
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
              <tr><th className="px-8 py-4">Tên lỗi vi phạm</th><th className="px-8 py-4">Điểm trừ</th><th className="px-8 py-4 text-right">Thao tác</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {editingRuleId === 'new' && (
                <tr className="bg-indigo-50/20">
                  <td className="px-8 py-3"><input type="text" placeholder="Tên lỗi..." autoFocus value={ruleFormData.TenLoi || ''} onChange={e => setRuleFormData({...ruleFormData, TenLoi: e.target.value})} className="w-full p-2 bg-white border border-indigo-200 rounded-xl text-xs font-bold outline-none" /></td>
                  <td className="px-8 py-3"><input type="number" value={ruleFormData.DiemTru || 0} onChange={e => setRuleFormData({...ruleFormData, DiemTru: parseInt(e.target.value)})} className="w-24 p-2 bg-white border border-indigo-200 rounded-xl text-xs font-bold text-center" /></td>
                  <td className="px-8 py-3 text-right flex justify-end gap-2"><button onClick={handleSaveRule} className="p-2 bg-emerald-600 text-white rounded-xl"><Check size={18}/></button><button onClick={() => setEditingRuleId(null)} className="p-2 bg-white border border-slate-200 text-slate-400 rounded-xl"><X size={18}/></button></td>
                </tr>
              )}
              {violationRules.map(rule => (
                <tr key={rule.MaLoi} className="hover:bg-slate-50/50 group">
                  {editingRuleId === rule.MaLoi ? (
                    <>
                      <td className="px-8 py-3"><input type="text" value={ruleFormData.TenLoi || ''} onChange={e => setRuleFormData({...ruleFormData, TenLoi: e.target.value})} className="w-full p-2 bg-white border border-indigo-200 rounded-xl text-xs font-bold" /></td>
                      <td className="px-8 py-3"><input type="number" value={ruleFormData.DiemTru || 0} onChange={e => setRuleFormData({...ruleFormData, DiemTru: parseInt(e.target.value)})} className="w-24 p-2 bg-white border border-indigo-200 rounded-xl text-xs font-bold text-center" /></td>
                      <td className="px-8 py-3 text-right flex justify-end gap-2"><button onClick={handleSaveRule} className="p-2 bg-emerald-600 text-white rounded-xl"><Check size={18}/></button><button onClick={() => setEditingRuleId(null)} className="p-2 bg-white border border-slate-200 text-slate-400 rounded-xl"><X size={18}/></button></td>
                    </>
                  ) : (
                    <>
                      <td className="px-8 py-4 text-xs font-bold text-slate-700 uppercase">{rule.TenLoi}</td>
                      <td className="px-8 py-4"><span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-black border border-rose-100">-{rule.DiemTru} điểm</span></td>
                      <td className="px-8 py-4 text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => { setEditingRuleId(rule.MaLoi); setRuleFormData(rule); }} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl"><Edit3 size={16}/></button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 my-auto">
            <div className="px-6 py-3 border-b flex items-center justify-between shrink-0">
              <h3 className="font-black text-sm text-slate-800 uppercase tracking-tight">{modalMode === 'add' ? 'Ghi nhận vi phạm' : 'Cập nhật vi phạm'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} className="text-slate-400" /></button>
            </div>
            <div className="px-6 py-4 space-y-3 bg-slate-50/20 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-1">Học sinh</label>
                  <select disabled={modalMode === 'edit'} value={formDiscipline.MaHS} onChange={e => setFormDiscipline({...formDiscipline, MaHS: e.target.value})} className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none">
                    <option value="">-- Chọn --</option>
                    {students.map(s => <option key={s.MaHS} value={s.MaHS}>{s.Hoten}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-1">Ngày xảy ra</label>
                  <input type="date" value={formDiscipline.NgayViPham} onChange={e => setFormDiscipline({...formDiscipline, NgayViPham: e.target.value})} className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase px-1">Loại lỗi vi phạm</label>
                <select disabled={modalMode === 'edit'} value={formDiscipline.MaLoi} onChange={e => setFormDiscipline({...formDiscipline, MaLoi: e.target.value})} className="w-full p-2 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs font-black outline-none">
                  <option value="">-- Chọn lỗi quy định --</option>
                  {violationRules.map(r => <option key={r.MaLoi} value={r.MaLoi}>{r.TenLoi} (-{r.DiemTru}đ)</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase px-1">Hình thức xử lý</label>
                <div className="flex flex-wrap gap-1">
                  {actionTypes.map(type => (
                    <button key={type} onClick={() => setFormDiscipline({...formDiscipline, HinhThucXL: type})} className={`px-2 py-1.5 rounded-lg text-[9px] font-black uppercase border transition-all ${formDiscipline.HinhThucXL === type ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-100'}`}>{type}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase px-1">Mô tả tình tiết</label>
                <textarea value={formDiscipline.NoiDungChiTiet} onChange={e => setFormDiscipline({...formDiscipline, NoiDungChiTiet: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-xs font-medium min-h-[70px] outline-none" placeholder="Ghi chú chi tiết..."></textarea>
              </div>
            </div>
            <div className="px-6 py-4 border-t bg-slate-50 flex gap-3 shrink-0">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-500 rounded-2xl font-black text-[10px] uppercase">Hủy</button>
              <button disabled={isSubmitting} onClick={handleSaveDiscipline} className="flex-[2] py-2.5 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2">
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Lưu vi phạm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DisciplineManager;
