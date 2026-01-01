
import React, { useState, useMemo } from 'react';
import { ShieldAlert, Plus, Calendar, AlertCircle, Settings, Trash2, Save, X, Edit3, Check, Trophy, Ban, User, Info, Loader2 } from 'lucide-react';
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

const actionTypes = [
  "Nhắc nhở", "Viết bản kiểm điểm", "Trực lao động", "Mời phụ huynh", "Khiển trách trước lớp", "Cảnh cáo trước hội đồng kỷ luật", "Đình chỉ học tập có thời hạn"
];

const DisciplineManager: React.FC<Props> = ({ state, students, disciplines, violationRules, onUpdateDisciplines, onDeleteDiscipline, onUpdateRules }) => {
  const isChuNhiem = state.currentRole === 'ChuNhiem';
  const [activeView, setActiveView] = useState<'LIST' | 'RULES' | 'CONDUCT'>('LIST');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [ruleFormData, setRuleFormData] = useState<Partial<ViolationRule>>({});

  const [formDiscipline, setFormDiscipline] = useState<Partial<Discipline>>({
    MaHS: '', 
    NgayViPham: new Date().toISOString().split('T')[0], 
    MaLoi: '', 
    NoiDungChiTiet: '', 
    HinhThucXL: 'Nhắc nhở'
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
    setFormDiscipline({
        MaHS: '', 
        NgayViPham: new Date().toISOString().split('T')[0], 
        MaLoi: '', 
        NoiDungChiTiet: '', 
        HinhThucXL: 'Nhắc nhở'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: Discipline) => {
    setModalMode('edit');
    setFormDiscipline(item);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("Bạn có chắc chắn muốn XÓA VĨNH VIỄN vi phạm này khỏi Cloud?")) {
      setIsSubmitting(true);
      try {
        await onDeleteDiscipline(id);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleSaveDiscipline = async () => {
    if (!formDiscipline.MaHS) { alert("Vui lòng chọn học sinh!"); return; }
    if (!formDiscipline.MaLoi) { alert("Vui lòng chọn lỗi vi phạm!"); return; }

    const selectedRule = violationRules.find(r => r.MaLoi === formDiscipline.MaLoi);
    if (!selectedRule) return;
    
    setIsSubmitting(true);
    try {
      const record: Discipline = {
        MaKyLuat: modalMode === 'add' ? (Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000)) : formDiscipline.MaKyLuat!, 
        MaHS: formDiscipline.MaHS!, 
        NgayViPham: formDiscipline.NgayViPham!, 
        MaLoi: formDiscipline.MaLoi!, 
        NoiDungChiTiet: formDiscipline.NoiDungChiTiet || '', 
        DiemTruTaiThoiDiemDo: modalMode === 'add' ? (Number(selectedRule.DiemTru) || 0) : (formDiscipline.DiemTruTaiThoiDiemDo || 0),
        HinhThucXL: formDiscipline.HinhThucXL!, 
        MaNienHoc: state.selectedYear
      };

      await onUpdateDisciplines([record]);
      setIsModalOpen(false);
      alert(modalMode === 'add' ? "Đã thêm vi phạm thành công!" : "Đã cập nhật vi phạm thành công!");
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveRule = async () => {
    if (!ruleFormData.TenLoi || ruleFormData.DiemTru === undefined) return;
    setIsSubmitting(true);
    try {
      if (editingRuleId === 'new') {
        const secureRuleId = "RL" + Math.floor(Date.now() / 1000);
        await onUpdateRules([...violationRules, { MaLoi: secureRuleId, TenLoi: ruleFormData.TenLoi, DiemTru: Number(ruleFormData.DiemTru) }]);
      } else {
        await onUpdateRules(violationRules.map(r => r.MaLoi === editingRuleId ? { ...r, TenLoi: ruleFormData.TenLoi!, DiemTru: Number(ruleFormData.DiemTru)! } : r));
      }
      setEditingRuleId(null);
      setRuleFormData({});
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[32px] shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-rose-600 rounded-2xl text-white shadow-lg shadow-rose-100"><ShieldAlert size={24} /></div>
          <div>
            <h2 className="text-2xl font-black text-gray-800 tracking-tight">Kỷ luật & Rèn luyện</h2>
            <p className="text-sm text-gray-500 font-medium">Lớp {state.selectedClass} • Quản lý nề nếp</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-1 bg-gray-50 rounded-2xl border border-gray-100">
          <button onClick={() => setActiveView('LIST')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeView === 'LIST' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-400'}`}>Lịch sử vi phạm</button>
          <button onClick={() => setActiveView('CONDUCT')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeView === 'CONDUCT' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-400'}`}>Điểm rèn luyện</button>
          {isChuNhiem && <button onClick={() => setActiveView('RULES')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeView === 'RULES' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-400'}`}>Bộ quy tắc</button>}
        </div>
      </div>

      {activeView === 'LIST' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div 
            onClick={() => isChuNhiem && handleOpenAdd()} 
            className={`bg-white rounded-[32px] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center p-8 transition-all group min-h-[220px] ${isChuNhiem ? 'cursor-pointer hover:border-rose-400 hover:bg-rose-50/30' : 'opacity-50 cursor-not-allowed'}`}
          >
            <div className="p-4 bg-rose-50 rounded-full text-rose-600 mb-4 group-hover:scale-110 transition-transform"><Plus size={32} /></div>
            <p className="font-bold text-gray-800">Ghi nhận vi phạm mới</p>
            <p className="text-xs text-gray-400 mt-1">Chọn lỗi từ bộ quy tắc của trường</p>
          </div>
          {disciplines.length > 0 ? [...disciplines].sort((a,b) => b.MaKyLuat - a.MaKyLuat).map(item => {
            const student = students.find(s => s.MaHS === item.MaHS);
            const rule = violationRules.find(r => r.MaLoi === item.MaLoi);
            return (
              <div key={item.MaKyLuat} className="bg-white rounded-[32px] shadow-sm border border-gray-100 p-6 hover:shadow-xl transition-all relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Ban size={80} /></div>
                
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-black border border-indigo-100">{student?.Hoten.charAt(0)}</div>
                    <div><h4 className="font-bold text-gray-800 leading-tight">{student?.Hoten || 'HS đã xóa'}</h4><span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{item.MaHS}</span></div>
                  </div>
                  <div className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-black shadow-lg shadow-rose-100">-{item.DiemTruTaiThoiDiemDo}đ</div>
                </div>

                <div className="space-y-3 mb-4 relative z-10">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase"><Calendar size={12} />{new Date(item.NgayViPham).toLocaleDateString('vi-VN')}</div>
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 min-h-[80px]">
                    <p className="text-xs font-black text-rose-600 uppercase mb-1">{rule?.TenLoi || 'Lỗi hệ thống'}</p>
                    <p className="text-sm text-gray-600 leading-relaxed italic line-clamp-2">"{item.NoiDungChiTiet || 'Không có mô tả'}"</p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-gray-50 pt-4 relative z-10">
                  <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-3 py-1 rounded-full uppercase tracking-wider border border-rose-100">{item.HinhThucXL}</span>
                  {isChuNhiem && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button disabled={isSubmitting} onClick={() => handleOpenEdit(item)} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all"><Edit3 size={14}/></button>
                      <button disabled={isSubmitting} onClick={() => handleDelete(item.MaKyLuat)} className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-600 hover:text-white transition-all"><Trash2 size={14}/></button>
                    </div>
                  )}
                </div>
              </div>
            );
          }) : (
             <div className="lg:col-span-2 flex flex-col items-center justify-center p-12 bg-white rounded-[32px] border border-gray-100 text-center">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-4"><Check size={32} /></div>
                <p className="font-bold text-gray-400 uppercase text-xs tracking-widest">Hiện không có vi phạm nào</p>
             </div>
          )}
        </div>
      )}

      {activeView === 'RULES' && (
        <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <h3 className="font-bold text-gray-800">Cấu hình Bộ quy tắc</h3>
            <button disabled={isSubmitting} onClick={() => { setEditingRuleId('new'); setRuleFormData({ TenLoi: '', DiemTru: 2 }); }} className="px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold flex items-center gap-2"><Plus size={16} /> Thêm quy tắc</button>
          </div>
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
              <tr><th className="px-6 py-4">Tên lỗi</th><th className="px-6 py-4">Điểm trừ</th><th className="px-6 py-4 text-right">Thao tác</th></tr>
            </thead>
            <tbody className="divide-y">
              {violationRules.map(rule => (
                <tr key={rule.MaLoi} className="hover:bg-gray-50">
                  {editingRuleId === rule.MaLoi ? (
                    <>
                      <td className="px-6 py-4"><input disabled={isSubmitting} type="text" value={ruleFormData.TenLoi} onChange={e => setRuleFormData({...ruleFormData, TenLoi: e.target.value})} className="w-full p-2 border rounded-lg text-sm" /></td>
                      <td className="px-6 py-4"><input disabled={isSubmitting} type="number" value={ruleFormData.DiemTru} onChange={e => setRuleFormData({...ruleFormData, DiemTru: parseInt(e.target.value) || 0})} className="w-20 p-2 border rounded-lg text-sm" /></td>
                      <td className="px-6 py-4 text-right flex justify-end gap-1"><button onClick={handleSaveRule} className="p-2 bg-emerald-600 text-white rounded-lg"><Check size={14}/></button><button onClick={() => setEditingRuleId(null)} className="p-2 bg-gray-300 rounded-lg"><X size={14}/></button></td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4 text-sm font-bold text-gray-800">{rule.TenLoi}</td>
                      <td className="px-6 py-4"><span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-lg text-xs font-black">-{rule.DiemTru}đ</span></td>
                      <td className="px-6 py-4 text-right flex justify-end gap-1"><button onClick={() => { setEditingRuleId(rule.MaLoi); setRuleFormData(rule); }} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit3 size={14}/></button></td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeView === 'CONDUCT' && (
        <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 bg-emerald-600 text-white"><h3 className="font-bold text-lg">Điểm rèn luyện</h3></div>
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase">
              <tr><th className="px-6 py-5">Học sinh</th><th className="px-6 py-5 text-center">Số lỗi</th><th className="px-6 py-5 text-center">Điểm rèn luyện</th><th className="px-6 py-5 text-center">Xếp loại</th></tr>
            </thead>
            <tbody className="divide-y">
              {conductScores.map(({ student, score, classification, color, violationCount }) => (
                <tr key={student.MaHS} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-bold text-gray-800">{student.Hoten}</td>
                  <td className="px-6 py-4 text-center text-sm font-bold text-gray-400">{violationCount}</td>
                  <td className="px-6 py-4 text-center text-lg font-black">{score}</td>
                  <td className="px-6 py-4 text-center"><span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase ${color}`}>{classification}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="font-black text-xl text-gray-800 uppercase tracking-tight">{modalMode === 'add' ? 'Ghi nhận vi phạm' : 'Sửa thông tin vi phạm'}</h3>
              <button disabled={isSubmitting} onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={24} className="text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-5 overflow-y-auto flex-1 bg-gray-50/30">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase px-1">Chọn học sinh</label>
                  <select 
                    disabled={isSubmitting || modalMode === 'edit'}
                    value={formDiscipline.MaHS} 
                    onChange={e => setFormDiscipline({...formDiscipline, MaHS: e.target.value})} 
                    className="w-full p-3 bg-white border rounded-2xl text-sm font-bold outline-none"
                  >
                    <option value="">-- Click để chọn --</option>
                    {students.map(s => <option key={s.MaHS} value={s.MaHS}>{s.Hoten} ({s.MaHS})</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase px-1">Ngày vi phạm</label>
                  <input 
                    disabled={isSubmitting}
                    type="date" 
                    value={formDiscipline.NgayViPham} 
                    onChange={e => setFormDiscipline({...formDiscipline, NgayViPham: e.target.value})} 
                    className="w-full p-3 bg-white border rounded-2xl text-sm font-bold outline-none" 
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase px-1">Lỗi vi phạm</label>
                <select 
                  disabled={isSubmitting || modalMode === 'edit'}
                  value={formDiscipline.MaLoi} 
                  onChange={e => setFormDiscipline({...formDiscipline, MaLoi: e.target.value})} 
                  className="w-full p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-sm font-black outline-none"
                >
                  <option value="">-- Chọn lỗi --</option>
                  {violationRules.map(r => <option key={r.MaLoi} value={r.MaLoi}>{r.TenLoi} (-{r.DiemTru}đ)</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase px-1">Hình thức xử lý</label>
                <div className="flex flex-wrap gap-1.5">
                  {actionTypes.map(type => (
                    /* Fix reference error: 'setNewDiscipline' should be 'setFormDiscipline' */
                    <button key={type} onClick={() => setFormDiscipline({...formDiscipline, HinhThucXL: type})} className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase border ${formDiscipline.HinhThucXL === type ? 'bg-gray-900 text-white shadow-md' : 'bg-white text-gray-400'}`}>{type}</button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5 pb-2">
                <label className="text-[10px] font-black text-gray-400 uppercase px-1">Chi tiết sự việc</label>
                <textarea 
                  disabled={isSubmitting}
                  value={formDiscipline.NoiDungChiTiet} 
                  onChange={e => setFormDiscipline({...formDiscipline, NoiDungChiTiet: e.target.value})} 
                  className="w-full p-4 bg-white border rounded-2xl text-sm min-h-[120px] outline-none" 
                  placeholder="Mô tả sự việc..."
                ></textarea>
              </div>
            </div>
            <div className="p-6 bg-white border-t flex gap-3">
              <button disabled={isSubmitting} onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-gray-50 text-gray-500 rounded-2xl font-black text-xs uppercase tracking-widest">Hủy</button>
              <button disabled={isSubmitting} onClick={handleSaveDiscipline} className="flex-[2] py-4 bg-rose-600 text-white rounded-2xl font-black shadow-xl shadow-rose-100 active:scale-95 flex items-center justify-center gap-2 text-xs uppercase tracking-widest">
                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                {isSubmitting ? "Đang lưu..." : (modalMode === 'add' ? "Lưu vi phạm Cloud" : "Cập nhật thay đổi")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DisciplineManager;
