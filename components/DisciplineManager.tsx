
import React, { useState, useMemo } from 'react';
import { ShieldAlert, Plus, Calendar, AlertCircle, Settings, Trash2, Save, X, Edit3, Check, Trophy, Ban } from 'lucide-react';
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
    MaHS: '', NgayViPham: new Date().toISOString().split('T')[0], MaLoi: '', NoiDungChiTiet: '', HinhThucXL: 'Nhắc nhở'
  });

  const conductScores = useMemo(() => {
    return students.map(student => {
      const studentDisciplines = disciplines.filter(d => d.MaHS === student.MaHS && d.MaNienHoc === state.selectedYear);
      // KHẮC PHỤC LỖI NaN: Chuyển đổi giá trị sang Number và fallback về 0
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
    if (!newDiscipline.MaHS || !newDiscipline.MaLoi) { alert("Vui lòng chọn học sinh và lỗi vi phạm"); return; }
    const selectedRule = violationRules.find(r => r.MaLoi === newDiscipline.MaLoi);
    if (!selectedRule) return;
    
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
    setNewDiscipline({ MaHS: '', NgayViPham: new Date().toISOString().split('T')[0], MaLoi: '', NoiDungChiTiet: '', HinhThucXL: 'Nhắc nhở' });
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
        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">Quản lý Nề nếp & Rèn luyện</h2>
          <p className="text-sm text-gray-500 font-medium">Lớp {state.selectedClass} • Điểm cơ bản: 100</p>
        </div>
        <div className="flex items-center gap-2 p-1 bg-gray-50 rounded-2xl border border-gray-100">
          <button onClick={() => setActiveView('LIST')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeView === 'LIST' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-400'}`}>Lịch sử vi phạm</button>
          <button onClick={() => setActiveView('CONDUCT')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeView === 'CONDUCT' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-400'}`}>Điểm rèn luyện</button>
          {isChuNhiem && <button onClick={() => setActiveView('RULES')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeView === 'RULES' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-400'}`}>Bộ quy tắc</button>}
        </div>
      </div>

      {!isChuNhiem && (
        <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl flex items-center gap-3 text-orange-700 text-sm font-medium">
          <AlertCircle size={20} /> Chỉ Giáo viên chủ nhiệm mới có quyền cấu hình bộ quy tắc.
        </div>
      )}

      {activeView === 'LIST' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div onClick={() => isChuNhiem && setIsModalOpen(true)} className={`bg-white rounded-[32px] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center p-8 transition-all group ${isChuNhiem ? 'cursor-pointer hover:border-rose-400 hover:bg-rose-50/30' : 'opacity-50'}`}>
            <div className="p-4 bg-rose-50 rounded-full text-rose-600 mb-4 group-hover:scale-110 transition-transform"><Plus size={32} /></div>
            <p className="font-bold text-gray-800">Ghi nhận vi phạm mới</p>
            <p className="text-xs text-gray-400 mt-1">Chọn lỗi từ bộ quy tắc của trường</p>
          </div>
          {disciplines.map(item => {
            const student = students.find(s => s.MaHS === item.MaHS);
            const rule = violationRules.find(r => r.MaLoi === item.MaLoi);
            return (
              <div key={item.MaKyLuat} className="bg-white rounded-[32px] shadow-sm border border-gray-100 p-6 hover:shadow-xl transition-all relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Ban size={80} /></div>
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-gray-50 rounded-xl flex items-center justify-center text-rose-600 font-black border border-gray-100">{student?.Hoten.charAt(0)}</div>
                    <div><h4 className="font-bold text-gray-800 leading-tight">{student?.Hoten}</h4><span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{student?.MaHS}</span></div>
                  </div>
                  <div className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-black shadow-lg shadow-rose-100">-{item.DiemTruTaiThoiDiemDo}đ</div>
                </div>
                <div className="space-y-3 mb-4 relative z-10">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase"><Calendar size={12} />{new Date(item.NgayViPham).toLocaleDateString('vi-VN')}</div>
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <p className="text-xs font-black text-rose-600 uppercase mb-1">{rule?.TenLoi || 'Lỗi hệ thống'}</p>
                    <p className="text-sm text-gray-600 leading-relaxed italic">"{item.NoiDungChiTiet}"</p>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-gray-50 pt-4 relative z-10">
                  <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-3 py-1 rounded-full uppercase tracking-wider border border-rose-100">{item.HinhThucXL}</span>
                </div>
              </div>
            );
          })}
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
          <div className="p-6 bg-emerald-600 text-white flex items-center justify-between"><div className="flex items-center gap-3"><Trophy size={24} /><div><h3 className="font-bold text-lg">Điểm rèn luyện</h3><p className="text-xs text-emerald-100">Bắt đầu từ 100 điểm</p></div></div></div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <tr><th className="px-6 py-5">Học sinh</th><th className="px-6 py-5 text-center">Số lỗi</th><th className="px-6 py-5 text-center">Tổng điểm trừ</th><th className="px-6 py-5 text-center">Điểm hiện tại</th><th className="px-6 py-5 text-center">Xếp loại</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {conductScores.map(({ student, score, totalDeduction, classification, color }) => (
                  <tr key={student.MaHS} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-gray-800">{student.Hoten}</td>
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
              <div className="flex items-center gap-3"><ShieldAlert size={20} className="text-rose-600" /><h3 className="font-black text-lg text-gray-800">Ghi nhận vi phạm</h3></div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={24} className="text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><label className="text-[10px] font-black text-gray-400 uppercase">Học sinh</label><select value={newDiscipline.MaHS} onChange={(e) => setNewDiscipline({...newDiscipline, MaHS: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border rounded-xl text-sm font-bold outline-none">{students.map(s => <option key={s.MaHS} value={s.MaHS}>{s.Hoten}</option>)}</select></div>
                <div className="space-y-1.5"><label className="text-[10px] font-black text-gray-400 uppercase">Ngày</label><input type="date" value={newDiscipline.NgayViPham} onChange={(e) => setNewDiscipline({...newDiscipline, NgayViPham: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border rounded-xl text-sm font-bold outline-none" /></div>
              </div>
              <div className="space-y-1.5"><label className="text-[10px] font-black text-gray-400 uppercase">Lỗi vi phạm</label><select value={newDiscipline.MaLoi} onChange={(e) => setNewDiscipline({...newDiscipline, MaLoi: e.target.value})} className="w-full px-4 py-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-sm font-black outline-none"><option value="">Chọn lỗi...</option>{violationRules.map(r => <option key={r.MaLoi} value={r.MaLoi}>{r.TenLoi} (-{r.DiemTru}đ)</option>)}</select></div>
              <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase">Xử lý</label><div className="flex flex-wrap gap-1.5">{actionTypes.map(type => (<button key={type} onClick={() => setNewDiscipline({...newDiscipline, HinhThucXL: type})} className={`px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border ${newDiscipline.HinhThucXL === type ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-400 border-gray-100'}`}>{type}</button>))}</div></div>
              <div className="space-y-1.5 pb-2"><label className="text-[10px] font-black text-gray-400 uppercase">Chi tiết</label><textarea value={newDiscipline.NoiDungChiTiet} onChange={(e) => setNewDiscipline({...newDiscipline, NoiDungChiTiet: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border rounded-2xl text-sm min-h-[100px]" placeholder="Nguyên nhân, sự việc..."></textarea></div>
            </div>
            <div className="p-6 bg-gray-50 border-t flex gap-3"><button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-white border text-gray-500 rounded-xl font-bold">Hủy</button><button onClick={handleAddDiscipline} className="flex-[2] py-3 bg-rose-600 text-white rounded-xl font-bold shadow-lg shadow-rose-100 active:scale-95 transition-all flex items-center justify-center gap-2"><Save size={18} /> Lưu vi phạm</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DisciplineManager;
