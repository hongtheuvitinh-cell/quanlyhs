
import React, { useState, useMemo } from 'react';
import { ShieldAlert, Plus, Calendar, AlertCircle, Settings, Trash2, Save, X, Edit3, Check, Trophy, Ban, User, Info } from 'lucide-react';
import { AppState, Student, Discipline, ViolationRule } from '../types';

interface Props {
  state: AppState;
  students: Student[];
  disciplines: Discipline[];
  violationRules: ViolationRule[];
  onUpdateDisciplines: (disciplines: Discipline[]) => void;
  onUpdateRules: (rules: ViolationRule[]) => void;
}

const actionTypes = [
  "Nhắc nhở", "Viết bản kiểm điểm", "Trực lao động", "Mời phụ huynh", "Khiển trách trước lớp", "Cảnh cáo trước hội đồng kỷ luật", "Đình chỉ học tập có thời hạn"
];

const DisciplineManager: React.FC<Props> = ({ state, students, disciplines, violationRules, onUpdateDisciplines, onUpdateRules }) => {
  const isChuNhiem = state.currentRole === 'ChuNhiem';
  const [activeView, setActiveView] = useState<'LIST' | 'RULES' | 'CONDUCT'>('LIST');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [ruleFormData, setRuleFormData] = useState<Partial<ViolationRule>>({});

  const [newDiscipline, setNewDiscipline] = useState<Partial<Discipline>>({
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

  const handleAddDiscipline = () => {
    // Kiểm tra kỹ dữ liệu trước khi lưu
    if (!newDiscipline.MaHS || newDiscipline.MaHS === "") { 
      alert("⚠️ Vui lòng CHỌN HỌC SINH từ danh sách!"); 
      return; 
    }
    if (!newDiscipline.MaLoi || newDiscipline.MaLoi === "") { 
      alert("⚠️ Vui lòng CHỌN LỖI VI PHẠM từ bộ quy tắc!"); 
      return; 
    }

    const selectedRule = violationRules.find(r => r.MaLoi === newDiscipline.MaLoi);
    if (!selectedRule) {
      alert("Lỗi: Quy tắc vi phạm không còn tồn tại.");
      return;
    }
    
    const disciplineRecord: Discipline = {
      MaKyLuat: Date.now(), 
      MaHS: newDiscipline.MaHS!, 
      NgayViPham: newDiscipline.NgayViPham!, 
      MaLoi: newDiscipline.MaLoi!, 
      NoiDungChiTiet: newDiscipline.NoiDungChiTiet || '', 
      DiemTruTaiThoiDiemDo: Number(selectedRule.DiemTru) || 0,
      HinhThucXL: newDiscipline.HinhThucXL!, 
      MaNienHoc: state.selectedYear
    };

    onUpdateDisciplines([disciplineRecord]);
    setIsModalOpen(false);
    
    // Reset form hoàn toàn
    setNewDiscipline({ 
      MaHS: '', 
      NgayViPham: new Date().toISOString().split('T')[0], 
      MaLoi: '', 
      NoiDungChiTiet: '', 
      HinhThucXL: 'Nhắc nhở' 
    });
  };

  const handleSaveRule = () => {
    if (!ruleFormData.TenLoi || ruleFormData.DiemTru === undefined) return;
    if (editingRuleId === 'new') {
      onUpdateRules([...violationRules, { MaLoi: Date.now().toString(), TenLoi: ruleFormData.TenLoi, DiemTru: Number(ruleFormData.DiemTru) }]);
    } else {
      onUpdateRules(violationRules.map(r => r.MaLoi === editingRuleId ? { ...r, TenLoi: ruleFormData.TenLoi!, DiemTru: Number(ruleFormData.DiemTru)! } : r));
    }
    setEditingRuleId(null);
    setRuleFormData({});
  };

  const deleteRule = (maLoi: string) => {
    if(confirm("Xóa lỗi này khỏi bộ quy tắc? Dữ liệu kỷ luật cũ vẫn sẽ được giữ nguyên điểm trừ tại thời điểm đó.")) {
      onUpdateRules(violationRules.filter(r => r.MaLoi !== maLoi));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[32px] shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-rose-600 rounded-2xl text-white shadow-lg shadow-rose-100">
            <ShieldAlert size={24} />
          </div>
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

      {!isChuNhiem && (
        <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl flex items-center gap-3 text-orange-700 text-sm font-medium">
          <AlertCircle size={20} /> Chỉ Giáo viên chủ nhiệm mới có quyền ghi nhận vi phạm và cấu hình bộ quy tắc.
        </div>
      )}

      {activeView === 'LIST' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div 
            onClick={() => isChuNhiem && setIsModalOpen(true)} 
            className={`bg-white rounded-[32px] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center p-8 transition-all group min-h-[220px] ${isChuNhiem ? 'cursor-pointer hover:border-rose-400 hover:bg-rose-50/30' : 'opacity-50 cursor-not-allowed'}`}
          >
            <div className="p-4 bg-rose-50 rounded-full text-rose-600 mb-4 group-hover:scale-110 transition-transform"><Plus size={32} /></div>
            <p className="font-bold text-gray-800">Ghi nhận vi phạm mới</p>
            <p className="text-xs text-gray-400 mt-1">Chọn lỗi từ bộ quy tắc của trường</p>
          </div>
          {disciplines.length > 0 ? disciplines.sort((a,b) => b.MaKyLuat - a.MaKyLuat).map(item => {
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
                </div>
              </div>
            );
          }) : (
             <div className="lg:col-span-2 flex flex-col items-center justify-center p-12 bg-white rounded-[32px] border border-gray-100 text-center">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-4"><Check size={32} /></div>
                <p className="font-bold text-gray-400 uppercase text-xs tracking-widest">Lớp học hiện tại không có vi phạm nào</p>
             </div>
          )}
        </div>
      )}

      {activeView === 'RULES' && (
        <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div className="flex items-center gap-3"><Settings className="text-gray-400" /><h3 className="font-bold text-gray-800">Cấu hình Bộ quy tắc</h3></div>
            <button onClick={() => { setEditingRuleId('new'); setRuleFormData({ TenLoi: '', DiemTru: 2 }); }} className="px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold flex items-center gap-2 active:scale-95 transition-all"><Plus size={16} /> Thêm quy tắc</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <tr><th className="px-6 py-4">Tên lỗi</th><th className="px-6 py-4">Điểm trừ</th><th className="px-6 py-4 text-right">Thao tác</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {editingRuleId === 'new' && (
                  <tr className="bg-indigo-50/30">
                    <td className="px-6 py-4"><input autoFocus type="text" value={ruleFormData.TenLoi} onChange={e => setRuleFormData({...ruleFormData, TenLoi: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm font-bold" placeholder="Tên lỗi..." /></td>
                    <td className="px-6 py-4"><input type="number" value={ruleFormData.DiemTru} onChange={e => setRuleFormData({...ruleFormData, DiemTru: parseInt(e.target.value) || 0})} className="w-24 px-3 py-2 border rounded-lg text-sm font-bold" /></td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2"><button onClick={handleSaveRule} className="p-2 bg-emerald-600 text-white rounded-lg"><Check size={16}/></button><button onClick={() => setEditingRuleId(null)} className="p-2 bg-gray-200 text-gray-500 rounded-lg"><X size={16}/></button></td>
                  </tr>
                )}
                {violationRules.map(rule => (
                  <tr key={rule.MaLoi} className="hover:bg-gray-50 transition-colors">
                    {editingRuleId === rule.MaLoi ? (
                      <>
                        <td className="px-6 py-4"><input autoFocus type="text" value={ruleFormData.TenLoi} onChange={e => setRuleFormData({...ruleFormData, TenLoi: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm font-bold" /></td>
                        <td className="px-6 py-4"><input type="number" value={ruleFormData.DiemTru} onChange={e => setRuleFormData({...ruleFormData, DiemTru: parseInt(e.target.value) || 0})} className="w-24 px-3 py-2 border rounded-lg text-sm font-bold" /></td>
                        <td className="px-6 py-4 text-right flex justify-end gap-2"><button onClick={handleSaveRule} className="p-2 bg-emerald-600 text-white rounded-lg"><Check size={16}/></button><button onClick={() => setEditingRuleId(null)} className="p-2 bg-gray-200 text-gray-500 rounded-lg"><X size={16}/></button></td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 text-sm font-bold text-gray-800">{rule.TenLoi}</td>
                        <td className="px-6 py-4"><span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-lg text-xs font-black">-{rule.DiemTru}đ</span></td>
                        <td className="px-6 py-4 text-right flex justify-end gap-1">
                          <button onClick={() => { setEditingRuleId(rule.MaLoi); setRuleFormData(rule); }} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit3 size={16}/></button>
                          <button onClick={() => deleteRule(rule.MaLoi)} className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"><Trash2 size={16}/></button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeView === 'CONDUCT' && (
        <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 bg-emerald-600 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
                <Trophy size={24} />
                <div>
                    <h3 className="font-bold text-lg">Điểm rèn luyện lớp {state.selectedClass}</h3>
                    <p className="text-xs text-emerald-100">Điểm khởi tạo mặc định: 100</p>
                </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <tr><th className="px-6 py-5">Học sinh</th><th className="px-6 py-5 text-center">Số lỗi</th><th className="px-6 py-5 text-center">Tổng điểm trừ</th><th className="px-6 py-5 text-center">Điểm rèn luyện</th><th className="px-6 py-5 text-center">Xếp loại</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {conductScores.map(({ student, score, totalDeduction, classification, color }) => (
                  <tr key={student.MaHS} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-xs">{student.Hoten.charAt(0)}</div>
                            <div className="text-sm font-bold text-gray-800">{student.Hoten}</div>
                        </div>
                    </td>
                    <td className="px-6 py-4 text-center text-sm font-bold text-gray-500">{disciplines.filter(d => d.MaHS === student.MaHS).length}</td>
                    <td className="px-6 py-4 text-center text-sm font-black text-rose-600">-{totalDeduction}</td>
                    <td className="px-6 py-4 text-center text-lg font-black text-gray-800">{score}</td>
                    <td className="px-6 py-4 text-center"><span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${color}`}>{classification}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-600 rounded-xl text-white shadow-lg"><ShieldAlert size={20} /></div>
                <h3 className="font-black text-xl text-gray-800 tracking-tight">Ghi nhận vi phạm</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-all"><X size={24} className="text-gray-400" /></button>
            </div>
            
            <div className="p-6 space-y-5 overflow-y-auto flex-1 bg-gray-50/30">
              <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-3">
                 <Info size={18} className="text-amber-600 mt-0.5" />
                 <p className="text-[11px] font-bold text-amber-700 leading-relaxed uppercase">Hãy đảm bảo chọn chính xác học sinh và lỗi tương ứng để hệ thống tính điểm rèn luyện đúng.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Chọn học sinh</label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                        <select 
                            value={newDiscipline.MaHS} 
                            onChange={(e) => setNewDiscipline({...newDiscipline, MaHS: e.target.value})} 
                            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-bold outline-none appearance-none focus:border-rose-400 transition-all"
                        >
                            <option value="">-- Click để chọn học sinh --</option>
                            {students.map(s => <option key={s.MaHS} value={s.MaHS}>{s.Hoten} ({s.MaHS})</option>)}
                        </select>
                    </div>
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Ngày vi phạm</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                        <input 
                            type="date" 
                            value={newDiscipline.NgayViPham} 
                            onChange={(e) => setNewDiscipline({...newDiscipline, NgayViPham: e.target.value})} 
                            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-bold outline-none focus:border-rose-400 transition-all" 
                        />
                    </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Lỗi vi phạm (Bộ quy tắc)</label>
                <div className="relative">
                    <Ban className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                    <select 
                        value={newDiscipline.MaLoi} 
                        onChange={(e) => setNewDiscipline({...newDiscipline, MaLoi: e.target.value})} 
                        className="w-full pl-10 pr-4 py-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-sm font-black outline-none appearance-none focus:border-rose-400 transition-all"
                    >
                        <option value="">-- Click để chọn hành vi vi phạm --</option>
                        {violationRules.map(r => <option key={r.MaLoi} value={r.MaLoi}>{r.TenLoi} (-{r.DiemTru}đ)</option>)}
                    </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Hình thức xử lý</label>
                <div className="flex flex-wrap gap-1.5">
                    {actionTypes.map(type => (
                        <button 
                            key={type} 
                            onClick={() => setNewDiscipline({...newDiscipline, HinhThucXL: type})} 
                            className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${newDiscipline.HinhThucXL === type ? 'bg-gray-900 text-white border-gray-900 shadow-md scale-105' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'}`}
                        >
                            {type}
                        </button>
                    ))}
                </div>
              </div>

              <div className="space-y-1.5 pb-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Chi tiết sự việc</label>
                <textarea 
                    value={newDiscipline.NoiDungChiTiet} 
                    onChange={(e) => setNewDiscipline({...newDiscipline, NoiDungChiTiet: e.target.value})} 
                    className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl text-sm min-h-[120px] outline-none focus:border-rose-400 transition-all shadow-inner" 
                    placeholder="Mô tả hoàn cảnh xảy ra vi phạm, thái độ học sinh..."
                ></textarea>
              </div>
            </div>

            <div className="p-6 bg-white border-t flex gap-3 shrink-0">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-white border border-gray-200 text-gray-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition-all">Hủy bỏ</button>
              <button onClick={handleAddDiscipline} className="flex-[2] py-4 bg-rose-600 text-white rounded-2xl font-black shadow-xl shadow-rose-100 active:scale-95 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest">
                <Save size={18} /> Lưu vi phạm Cloud
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DisciplineManager;
