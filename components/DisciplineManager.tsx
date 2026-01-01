
import React, { useState, useMemo } from 'react';
import { ShieldAlert, Plus, Calendar, AlertCircle, Trash2, Save, X, Edit3, Check, Ban, Loader2, CheckCircle2 } from 'lucide-react';
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

  const [formDiscipline, setFormDiscipline] = useState<Partial<Discipline>>({
    MaHS: '', NgayViPham: new Date().toISOString().split('T')[0], MaLoi: '', NoiDungChiTiet: '', HinhThucXL: 'Nhắc nhở'
  });

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

  const handleDelete = async (id: number) => {
    if (confirm("Xóa vĩnh viễn vi phạm này?")) {
      setIsSubmitting(true);
      try { await onDeleteDiscipline(id); } finally { setIsSubmitting(false); }
    }
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
    if (!ruleFormData.TenLoi) {
      alert("Vui lòng nhập tên lỗi!");
      return;
    }
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
    } catch (e: any) {
      alert("Lỗi khi lưu quy tắc: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in pb-20">
      <div className="flex items-center justify-between gap-4 bg-white p-3 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-rose-600 rounded-lg text-white"><ShieldAlert size={16} /></div>
          <div>
            <h2 className="text-sm font-bold text-gray-800 tracking-tight leading-none uppercase">Kỷ luật & Rèn luyện</h2>
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Lớp {state.selectedClass}</p>
          </div>
        </div>
        <div className="flex p-0.5 bg-gray-50 rounded-lg border border-gray-100">
          <button onClick={() => setActiveView('LIST')} className={`px-4 py-1 rounded-md text-[9px] font-black uppercase transition-all ${activeView === 'LIST' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-400'}`}>Lịch sử</button>
          <button onClick={() => setActiveView('CONDUCT')} className={`px-4 py-1 rounded-md text-[9px] font-black uppercase transition-all ${activeView === 'CONDUCT' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-400'}`}>Xếp loại</button>
          {isChuNhiem && <button onClick={() => setActiveView('RULES')} className={`px-4 py-1 rounded-md text-[9px] font-black uppercase transition-all ${activeView === 'RULES' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-400'}`}>Quy tắc</button>}
        </div>
      </div>

      {activeView === 'LIST' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {isChuNhiem && (
            <div onClick={handleOpenAdd} className="bg-white rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center p-4 transition-all hover:border-rose-400 hover:bg-rose-50/30 cursor-pointer min-h-[140px] group">
              <div className="p-2 bg-rose-50 rounded-full text-rose-600 mb-2 group-hover:scale-110 transition-transform"><Plus size={20} /></div>
              <p className="text-xs font-bold text-gray-800 uppercase">Ghi nhận vi phạm</p>
            </div>
          )}
          {disciplines.length > 0 ? [...disciplines].sort((a,b) => b.MaKyLuat - a.MaKyLuat).map(item => {
            const student = students.find(s => s.MaHS === item.MaHS);
            const rule = violationRules.find(r => r.MaLoi === item.MaLoi);
            return (
              <div key={item.MaKyLuat} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all group relative">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 font-bold text-[10px]">{student?.Hoten.charAt(0)}</div>
                    <div>
                      <h4 className="font-bold text-gray-800 text-[11px] leading-none mb-0.5">{student?.Hoten || 'Học sinh'}</h4>
                      <span className="text-[8px] font-medium text-gray-400 uppercase tracking-tighter">{item.MaHS}</span>
                    </div>
                  </div>
                  <div className="px-1.5 py-0.5 bg-rose-600 text-white rounded text-[9px] font-black">-{item.DiemTruTaiThoiDiemDo}đ</div>
                </div>
                <div className="bg-gray-50/50 p-2.5 rounded-lg border border-gray-100 mb-2">
                  <p className="text-[8px] font-black text-rose-600 uppercase mb-0.5">{rule?.TenLoi || 'Vi phạm'}</p>
                  <p className="text-[11px] text-gray-500 font-normal italic line-clamp-2">"{item.NoiDungChiTiet || 'Không có mô tả chi tiết'}"</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full uppercase border border-rose-100 tracking-tighter">{item.HinhThucXL}</span>
                  {isChuNhiem && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleOpenEdit(item)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Edit3 size={13}/></button>
                      <button onClick={() => handleDelete(item.MaKyLuat)} className="p-1 text-rose-600 hover:bg-rose-50 rounded"><Trash2 size={13}/></button>
                    </div>
                  )}
                </div>
              </div>
            );
          }) : (
            <div className="lg:col-span-2 py-8 bg-white rounded-xl border border-gray-100 text-center flex flex-col items-center">
              <CheckCircle2 size={24} className="text-emerald-200 mb-2" />
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Không có vi phạm</p>
            </div>
          )}
        </div>
      )}

      {activeView === 'CONDUCT' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 text-[8px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-200">
              <tr><th className="px-4 py-3">Học sinh</th><th className="px-4 py-3 text-center">Số lỗi</th><th className="px-4 py-3 text-center">Điểm Rèn Luyện</th><th className="px-4 py-3 text-center">Xếp loại</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {conductScores.map(({ student, score, classification, color, violationCount }) => (
                <tr key={student.MaHS} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-bold text-gray-800 text-xs">{student.Hoten}</td>
                  <td className="px-4 py-3 text-center text-[11px] font-normal text-gray-400">{violationCount}</td>
                  <td className="px-4 py-3 text-center font-bold text-gray-700 text-xs">{score}</td>
                  <td className="px-4 py-3 text-center"><span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter ${color}`}>{classification}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeView === 'RULES' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
            <h3 className="font-bold text-gray-800 text-xs uppercase">BỘ QUY TẮC NỀ NẾP</h3>
            <button 
              onClick={() => { 
                setEditingRuleId('new'); 
                setRuleFormData({ TenLoi: '', DiemTru: 2 }); 
              }} 
              disabled={editingRuleId === 'new'}
              className={`px-3 py-1.5 bg-gray-900 text-white rounded-lg text-[9px] font-black uppercase flex items-center gap-1.5 transition-all ${editingRuleId === 'new' ? 'opacity-50 cursor-not-allowed' : 'hover:bg-black active:scale-95'}`}
            >
              <Plus size={14} /> Thêm mới lỗi
            </button>
          </div>
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-[8px] font-black text-gray-400 uppercase border-b">
              <tr><th className="px-4 py-3">Nội dung lỗi vi phạm</th><th className="px-4 py-3">Điểm trừ</th><th className="px-4 py-3 text-right">Thao tác</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {editingRuleId === 'new' && (
                <tr className="bg-indigo-50/30">
                  <td className="px-4 py-2">
                    <input 
                      type="text" 
                      placeholder="Tên lỗi vi phạm..." 
                      autoFocus
                      value={ruleFormData.TenLoi || ''} 
                      onChange={e => setRuleFormData({...ruleFormData, TenLoi: e.target.value})} 
                      className="w-full p-2 border border-indigo-200 rounded-lg text-[11px] font-normal outline-none focus:ring-1 focus:ring-indigo-500" 
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input 
                      type="number" 
                      value={ruleFormData.DiemTru || 0} 
                      onChange={e => setRuleFormData({...ruleFormData, DiemTru: parseInt(e.target.value) || 0})} 
                      className="w-20 p-2 border border-indigo-200 rounded-lg text-[11px] font-normal outline-none focus:ring-1 focus:ring-indigo-500" 
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-1.5">
                      <button onClick={handleSaveRule} className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm"><Check size={14}/></button>
                      <button onClick={() => setEditingRuleId(null)} className="p-2 bg-gray-200 text-gray-500 rounded-lg hover:bg-gray-300"><X size={14}/></button>
                    </div>
                  </td>
                </tr>
              )}
              {violationRules.map(rule => (
                <tr key={rule.MaLoi} className="hover:bg-gray-50 group">
                  {editingRuleId === rule.MaLoi ? (
                    <>
                      <td className="px-4 py-2"><input type="text" value={ruleFormData.TenLoi || ''} onChange={e => setRuleFormData({...ruleFormData, TenLoi: e.target.value})} className="w-full p-2 border border-indigo-200 rounded-lg text-[11px] font-normal" /></td>
                      <td className="px-4 py-2"><input type="number" value={ruleFormData.DiemTru || 0} onChange={e => setRuleFormData({...ruleFormData, DiemTru: parseInt(e.target.value) || 0})} className="w-20 p-2 border border-indigo-200 rounded-lg text-[11px] font-normal" /></td>
                      <td className="px-4 py-2 text-right flex justify-end gap-1.5"><button onClick={handleSaveRule} className="p-2 bg-emerald-600 text-white rounded-lg"><Check size={14}/></button><button onClick={() => setEditingRuleId(null)} className="p-2 bg-gray-300 rounded-lg"><X size={14}/></button></td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-[11px] font-normal text-gray-700">{rule.TenLoi}</td>
                      <td className="px-4 py-3"><span className="px-2 py-0.5 bg-rose-50 text-rose-600 rounded text-[9px] font-black">-{rule.DiemTru}đ</span></td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditingRuleId(rule.MaLoi); setRuleFormData(rule); }} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit3 size={14}/></button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-black text-xs text-gray-800 uppercase tracking-tight">{modalMode === 'add' ? 'Ghi nhận vi phạm mới' : 'Cập nhật vi phạm'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="p-4 space-y-3 bg-gray-50/30">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest px-1">Chọn học sinh</label>
                  <select disabled={modalMode === 'edit'} value={formDiscipline.MaHS} onChange={e => setFormDiscipline({...formDiscipline, MaHS: e.target.value})} className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs font-normal outline-none focus:border-rose-400">
                    <option value="">-- Chọn --</option>
                    {students.map(s => <option key={s.MaHS} value={s.MaHS}>{s.Hoten} ({s.MaHS})</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest px-1">Ngày vi phạm</label>
                  <input type="date" value={formDiscipline.NgayViPham} onChange={e => setFormDiscipline({...formDiscipline, NgayViPham: e.target.value})} className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs font-normal outline-none focus:border-rose-400" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest px-1">Lỗi vi phạm</label>
                <select disabled={modalMode === 'edit'} value={formDiscipline.MaLoi} onChange={e => setFormDiscipline({...formDiscipline, MaLoi: e.target.value})} className="w-full p-2 bg-rose-50 border border-rose-100 text-rose-600 rounded-lg text-xs font-bold outline-none">
                  <option value="">-- Chọn lỗi quy định --</option>
                  {violationRules.map(r => <option key={r.MaLoi} value={r.MaLoi}>{r.TenLoi} (-{r.DiemTru}đ)</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest px-1">Hình thức xử lý</label>
                <div className="flex flex-wrap gap-1">
                  {actionTypes.map(type => (
                    <button key={type} onClick={() => setFormDiscipline({...formDiscipline, HinhThucXL: type})} className={`px-2 py-1.5 rounded-lg text-[8px] font-black uppercase border transition-all ${formDiscipline.HinhThucXL === type ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'}`}>{type}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest px-1">Mô tả chi tiết lỗi</label>
                <textarea value={formDiscipline.NoiDungChiTiet} onChange={e => setFormDiscipline({...formDiscipline, NoiDungChiTiet: e.target.value})} className="w-full p-2 bg-white border border-gray-200 rounded-lg text-[11px] font-normal min-h-[60px] outline-none" placeholder="VD: Sử dụng điện thoại trong tiết Toán..."></textarea>
              </div>
            </div>
            <div className="p-4 border-t bg-gray-50/50 flex gap-2">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-500 rounded-xl font-black text-[9px] uppercase tracking-widest">Hủy</button>
              <button disabled={isSubmitting} onClick={handleSaveDiscipline} className="flex-[2] py-2.5 bg-rose-600 text-white rounded-xl font-black shadow-lg shadow-rose-200 hover:bg-rose-700 flex items-center justify-center gap-2 text-[9px] uppercase tracking-widest">
                {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {isSubmitting ? "Đang lưu..." : "Lưu vào hệ thống"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DisciplineManager;
