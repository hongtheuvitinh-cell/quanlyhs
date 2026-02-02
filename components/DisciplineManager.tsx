
import React, { useState, useMemo, useEffect } from 'react';
import { ShieldAlert, Plus, AlertCircle, Trash2, Save, X, Edit3, Check, Loader2, CheckCircle2, Filter, Eye, Lock, BookOpen, Settings2, Sparkles, Mail, Phone, MessageSquare, ExternalLink, Send, Calendar as CalendarIcon, ClipboardList, Smartphone, CheckCircle, Search, Globe, LayoutGrid, Copy } from 'lucide-react';
import { AppState, Student, Discipline, ViolationRule, Assignment, Teacher, Role } from '../types';
import { supabase } from '../services/supabaseClient';
import { GoogleGenAI } from "@google/genai";

interface Props {
  state: AppState;
  students: Student[]; // Học sinh lớp hiện tại
  allStudents: Student[]; // Toàn bộ học sinh trường
  violationRules: ViolationRule[];
  assignments: Assignment[];
  onUpdateRules: (rules: ViolationRule[]) => Promise<void>;
}

const actionTypes = ["Nhắc nhở", "Viết bản kiểm điểm", "Trực lao động", "Mời phụ huynh", "Khiển trách lớp", "Cảnh cáo", "Đình chỉ"];

const DisciplineManager: React.FC<Props> = ({ state, students, allStudents, violationRules, assignments, onUpdateRules }) => {
  const currentUser = state.currentUser as Teacher;
  const isAdmin = currentUser?.quanly === true;
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewScope, setViewScope] = useState<'CLASS' | 'SCHOOL'>(isAdmin ? 'SCHOOL' : 'CLASS');
  
  // Compose Modal States
  const [isComposeModalOpen, setIsComposeModalOpen] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isSending, setIsSending] = useState<'zalo' | 'sms' | 'email' | null>(null);
  const [aiMessage, setAiMessage] = useState('');
  const [targetDiscipline, setTargetDiscipline] = useState<Discipline | null>(null);

  // Custom Confirmation States
  const [deleteTarget, setDeleteTarget] = useState<{id: number, type: 'DISCIPLINE'} | {maLoi: string, type: 'RULE'} | null>(null);

  const canManage = useMemo(() => {
    if (isAdmin) return true;
    if (!currentUser || !state.selectedClass) return false;
    const hasHomeroomAssignment = (assignments || []).some(a => 
      a.MaGV === currentUser.MaGV && a.MaLop === state.selectedClass && a.LoaiPhanCong === Role.CHU_NHIEM
    );
    return state.currentRole === Role.CHU_NHIEM && hasHomeroomAssignment;
  }, [isAdmin, state.currentRole, currentUser, state.selectedClass, assignments]);

  const fetchDisciplines = async () => {
    setIsLoading(true);
    try {
      let query = supabase.from('disciplines').select('*').eq('MaNienHoc', state.selectedYear);
      if (viewScope === 'CLASS') {
        const studentIds = students.map(s => s.MaHS);
        if (studentIds.length === 0) { setDisciplines([]); setIsLoading(false); return; }
        query = query.in('MaHS', studentIds);
      }
      const { data, error } = await query;
      if (error) throw error;
      setDisciplines(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setIsLoading(false), 200);
    }
  };

  useEffect(() => { fetchDisciplines(); }, [state.selectedClass, state.selectedYear, students, viewScope]);

  const [activeView, setActiveView] = useState<'LIST' | 'RULES' | 'CONDUCT' | 'REPORT'>('LIST');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Partial<ViolationRule> | null>(null);

  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [searchStudentTerm, setSearchStudentTerm] = useState('');

  const [formDiscipline, setFormDiscipline] = useState<Partial<Discipline>>({
    MaHS: '', NgayViPham: new Date().toISOString().split('T')[0], MaLoi: '', NoiDungChiTiet: '', HinhThucXL: 'Nhắc nhở'
  });

  const filteredDisciplines = useMemo(() => {
    return (disciplines || []).filter(d => {
      const student = allStudents.find(s => s.MaHS === d.MaHS);
      const matchesSearch = !searchStudentTerm || student?.Hoten.toLowerCase().includes(searchStudentTerm.toLowerCase()) || d.MaHS.toLowerCase().includes(searchStudentTerm.toLowerCase());
      
      const dDate = new Date(d.NgayViPham);
      if (isNaN(dDate.getTime())) return matchesSearch;
      const dMonth = (dDate.getMonth() + 1).toString();
      let matches = matchesSearch;
      if (filterMonth !== 'all' && dMonth !== filterMonth) matches = false;
      return matches;
    }).sort((a,b) => b.MaKyLuat - a.MaKyLuat);
  }, [disciplines, filterMonth, searchStudentTerm, allStudents]);

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

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsSubmitting(true);
    try {
      if (deleteTarget.type === 'DISCIPLINE') {
        const { error } = await supabase.from('disciplines').delete().eq('MaKyLuat', deleteTarget.id);
        if (error) throw error;
        await fetchDisciplines();
      } else if (deleteTarget.type === 'RULE') {
        const { error } = await supabase.from('violation_rules').delete().eq('MaLoi', deleteTarget.maLoi);
        if (error) throw error;
        window.location.reload();
      }
      setDeleteTarget(null);
    } catch (e: any) {
      alert("Lỗi khi xóa: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveRule = async () => {
    if (!editingRule?.TenLoi || editingRule.DiemTru === undefined) { alert("Nhập đủ thông tin quy tắc!"); return; }
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

  const generateAIMessage = async (discipline: Discipline) => {
    const student = allStudents.find(s => s.MaHS === discipline.MaHS);
    const rule = violationRules.find(r => r.MaLoi === discipline.MaLoi);
    if (!student || !process.env.API_KEY) {
      alert("Thiếu API_KEY AI.");
      return;
    }

    setIsGeneratingAI(true);
    setIsComposeModalOpen(true);
    setTargetDiscipline(discipline);
    setAiMessage('Hệ thống đang tự động soạn nội dung tin nhắn...');

    const prompt = `Bạn là một giáo viên chủ nhiệm chuyên nghiệp. Hãy viết tin nhắn cho phụ huynh học sinh ${student.Hoten} (Lớp ${student.MaLopHienTai}) về lỗi: ${rule?.TenLoi || discipline.MaLoi}. Ngày vi phạm: ${discipline.NgayViPham}. Xử lý: ${discipline.HinhThucXL}. Viết 3-4 câu lịch sự, chân thành, khuyến khích sự phối hợp từ gia đình.`;

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      setAiMessage(response.text || "Không thể soạn tin nhắn lúc này.");
    } catch (e) {
      setAiMessage(`Kính gửi phụ huynh em ${student.Hoten}. Nhà trường thông báo em đã vi phạm lỗi ${rule?.TenLoi || discipline.MaLoi} vào ngày ${discipline.NgayViPham}. Hình thức xử lý: ${discipline.HinhThucXL}. Kính mong phụ huynh phối hợp giáo dục em.`);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleActionSend = (type: 'zalo' | 'sms' | 'email') => {
    if (!targetDiscipline) return;
    const student = allStudents.find(s => s.MaHS === targetDiscipline.MaHS);
    if (!student) return;

    const phone = (student.SDT_LinkHe || '').replace(/[^0-9]/g, '');
    const encodedMsg = encodeURIComponent(aiMessage);

    setIsSending(type);
    setTimeout(() => {
        if (type === 'zalo') {
          navigator.clipboard.writeText(aiMessage);
          window.open(`https://zalo.me/${phone}`, '_blank');
        } else if (type === 'sms') {
          window.location.href = `sms:${phone}?body=${encodedMsg}`;
        } else if (type === 'email' && student.Email) {
          window.location.href = `mailto:${student.Email}?subject=Thong bao hoc sinh&body=${encodedMsg}`;
        } else if (type === 'email') {
          alert("Học sinh này chưa cập nhật Email phụ huynh!");
        }
        setIsSending(null);
    }, 800);
  };

  const [modalStudentSearch, setModalStudentSearch] = useState('');
  const searchedStudentsForModal = useMemo(() => {
    const list = isAdmin ? allStudents : students;
    if (!modalStudentSearch.trim()) return list.slice(0, 10);
    return list.filter(s => s.Hoten.toLowerCase().includes(modalStudentSearch.toLowerCase()) || s.MaHS.toLowerCase().includes(modalStudentSearch.toLowerCase())).slice(0, 10);
  }, [modalStudentSearch, allStudents, students, isAdmin]);

  return (
    <div className="space-y-4 animate-in fade-in pb-20">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-600 rounded-2xl text-white shadow-lg"><ShieldAlert size={20} /></div>
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Kỷ luật & Rèn luyện</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{isAdmin ? 'Quản lý Toàn trường' : `Lớp ${state.selectedClass}`}</p>
          </div>
        </div>
        <div className="flex p-1 bg-slate-100 rounded-xl overflow-x-auto custom-scrollbar max-w-full">
          <button onClick={() => setActiveView('LIST')} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase transition-all shrink-0 ${activeView === 'LIST' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400'}`}>Lịch sử</button>
          <button onClick={() => setActiveView('CONDUCT')} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase transition-all shrink-0 ${activeView === 'CONDUCT' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400'}`}>Xếp loại</button>
          {isAdmin && <button onClick={() => setActiveView('RULES')} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase transition-all shrink-0 ${activeView === 'RULES' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400'}`}>Bộ quy tắc</button>}
        </div>
      </div>

      <div className="relative min-h-[400px]">
        {isLoading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-3">
             <Loader2 className="animate-spin text-rose-600" size={32} />
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Đang xử lý dữ liệu...</p>
          </div>
        )}

        {activeView === 'LIST' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-3xl border border-slate-200 flex flex-wrap items-end gap-4 shadow-sm">
               {isAdmin && (
                 <div className="space-y-1.5 flex-none w-48">
                    <label className="text-[9px] font-black text-slate-400 uppercase">Phạm vi xem</label>
                    <div className="flex p-1 bg-slate-100 rounded-xl">
                      <button onClick={() => setViewScope('CLASS')} className={`flex-1 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${viewScope === 'CLASS' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Theo Lớp</button>
                      <button onClick={() => setViewScope('SCHOOL')} className={`flex-1 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${viewScope === 'SCHOOL' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Toàn Trường</button>
                    </div>
                 </div>
               )}
               <div className="space-y-1.5 flex-1 min-w-[200px]">
                  <label className="text-[9px] font-black text-slate-400 uppercase">Tìm học sinh (Tên/Mã)</label>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input type="text" value={searchStudentTerm} onChange={e => setSearchStudentTerm(e.target.value)} placeholder="Nhập tên học sinh..." className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:bg-white transition-all shadow-inner" />
                  </div>
               </div>
               <div className="space-y-1.5 w-32">
                  <label className="text-[9px] font-black text-slate-400 uppercase">Lọc theo tháng</label>
                  <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black outline-none shadow-inner">
                     <option value="all">Tất cả tháng</option>
                     {Array.from({length: 12}, (_, i) => (<option key={i+1} value={(i+1).toString()}>Tháng {i+1}</option>))}
                  </select>
               </div>
               <button onClick={() => { setFilterMonth('all'); setSearchStudentTerm(''); }} className="px-4 py-2.5 text-[9px] font-black text-rose-500 uppercase hover:bg-rose-50 rounded-xl transition-all">Xóa lọc</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {canManage && (
                <div onClick={() => { setModalMode('add'); setIsModalOpen(true); setModalStudentSearch(''); }} className="bg-white rounded-[32px] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-8 hover:bg-rose-50/30 cursor-pointer min-h-[160px] group transition-all">
                  <div className="p-3 bg-rose-50 rounded-2xl text-rose-600 mb-3 group-hover:scale-110 transition-transform"><Plus size={24} /></div>
                  <p className="text-[10px] font-black uppercase text-slate-500">Ghi nhận vi phạm mới</p>
                </div>
              )}
              {filteredDisciplines.map(item => {
                const student = allStudents.find(s => s.MaHS === item.MaHS);
                const rule = violationRules.find(r => r.MaLoi === item.MaLoi);
                return (
                  <div key={item.MaKyLuat} className="bg-white rounded-[32px] shadow-sm border border-slate-200 p-5 group relative overflow-hidden transition-all hover:border-rose-200">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-black text-xs">{student?.Hoten?.charAt(0) || '?'}</div>
                        <div>
                          <h4 className="font-black text-slate-800 text-xs uppercase leading-none mb-1.5 flex items-center gap-2">
                             {student?.Hoten}
                             {viewScope === 'SCHOOL' && <span className="px-1.5 py-0.5 bg-slate-100 text-[8px] rounded text-slate-500">{student?.MaLopHienTai}</span>}
                          </h4>
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{item.NgayViPham}</span>
                        </div>
                      </div>
                      <div className="px-2 py-1 bg-rose-600 text-white rounded-lg text-[10px] font-black shadow-sm">-{item.DiemTruTaiThoiDiemDo}đ</div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-4 shadow-inner">
                      <p className="text-[9px] font-black text-rose-600 uppercase mb-1 tracking-widest">{rule?.TenLoi || item.MaLoi}</p>
                      <p className="text-[11px] text-slate-600 italic line-clamp-2 leading-relaxed">"{item.NoiDungChiTiet}"</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-rose-600 bg-rose-50 px-3 py-1 rounded-xl uppercase tracking-widest border border-rose-100">{item.HinhThucXL}</span>
                      {canManage && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => generateAIMessage(item)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl" title="Báo cáo Phụ huynh"><MessageSquare size={15}/></button>
                          <button onClick={() => { setFormDiscipline(item); setModalMode('edit'); setIsModalOpen(true); }} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl" title="Chỉnh sửa"><Edit3 size={15}/></button>
                          <button onClick={() => setDeleteTarget({id: item.MaKyLuat, type: 'DISCIPLINE'})} className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl" title="Xóa"><Trash2 size={15}/></button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeView === 'CONDUCT' && (
          <div className="bg-white rounded-[40px] shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 bg-slate-50 border-b flex items-center justify-between">
               <h3 className="text-xs font-black uppercase text-slate-800 tracking-widest">Bảng xếp loại rèn luyện lớp {state.selectedClass}</h3>
            </div>
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

        {activeView === 'RULES' && (
          <div className="space-y-6 animate-in slide-in-from-right-4">
             <div className="flex justify-between items-center mb-2 px-2">
                <div>
                   <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest leading-none">Bộ quy tắc lỗi hiện hành</h3>
                   <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Admin có thể thay đổi mức điểm phạt</p>
                </div>
                <button onClick={() => { setEditingRule({ TenLoi: '', DiemTru: 5 }); setIsRuleModalOpen(true); }} className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 flex items-center gap-2 hover:bg-indigo-700 transition-all">
                   <Plus size={18} /> Thêm quy tắc mới
                </button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {violationRules.map(rule => (
                  <div key={rule.MaLoi} className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm hover:border-indigo-300 transition-all group relative">
                     <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100 shadow-inner"><Settings2 size={18}/></div>
                        <div className="text-right">
                           <span className="text-rose-600 font-black text-xl leading-none">-{rule.DiemTru}</span>
                           <span className="text-[9px] text-slate-400 font-bold uppercase block tracking-tighter">Điểm</span>
                        </div>
                     </div>
                     <h4 className="text-[11px] font-black text-slate-800 uppercase leading-tight mb-4 min-h-[32px] tracking-tight">{rule.TenLoi}</h4>
                     <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all pt-2 border-t border-slate-50">
                        <button onClick={() => { setEditingRule(rule); setIsRuleModalOpen(true); }} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl"><Edit3 size={16}/></button>
                        <button onClick={() => setDeleteTarget({maLoi: rule.MaLoi, type: 'RULE'})} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl"><Trash2 size={16}/></button>
                     </div>
                  </div>
                ))}
             </div>
          </div>
        )}
      </div>

      {/* Global Confirmation Modal - Chống bị chặn popup */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[40px] p-10 shadow-2xl animate-in zoom-in-95 border border-white/20 text-center">
            <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mx-auto mb-6 shadow-inner">
              <AlertCircle size={44} />
            </div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-3">Xác nhận thao tác</h3>
            <p className="text-slate-500 text-sm font-medium leading-relaxed mb-10">
              {deleteTarget.type === 'DISCIPLINE' 
                ? "Bạn có chắc chắn muốn xóa bản ghi kỷ luật này? Hành động này sẽ khôi phục lại điểm rèn luyện cho học sinh."
                : "Bạn có chắc muốn xóa quy tắc này? Các vi phạm cũ đã ghi nhận sẽ không bị ảnh hưởng."}
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setDeleteTarget(null)} className="py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">Hủy bỏ</button>
              <button onClick={confirmDelete} disabled={isSubmitting} className="py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-rose-100 hover:bg-rose-700 transition-all flex items-center justify-center gap-2">
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} Xóa vĩnh viễn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nhập liệu vi phạm - Có ô chú thích rộng rãi ở dưới cùng */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden my-auto border border-white/20 animate-in zoom-in-95">
            <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-4">
                 <div className="p-3 bg-rose-600 rounded-2xl text-white shadow-lg"><ShieldAlert size={20}/></div>
                 <h3 className="font-black text-sm text-slate-800 uppercase tracking-tight">{modalMode === 'add' ? 'Ghi nhận vi phạm mới' : 'Cập nhật thông tin vi phạm'}</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={24} className="text-slate-400"/></button>
            </div>

            <div className="px-10 py-8 space-y-6 bg-slate-50/20">
              {modalMode === 'add' ? (
                <div className="space-y-2 relative">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Tìm chọn học sinh</label>
                  <div className="relative">
                    <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input type="text" value={modalStudentSearch} onChange={e => { setModalStudentSearch(e.target.value); setFormDiscipline({...formDiscipline, MaHS: ''}); }} placeholder="Nhập tên hoặc mã HS..." className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none shadow-sm focus:border-indigo-400 transition-all" />
                  </div>
                  {modalStudentSearch.trim() && !formDiscipline.MaHS && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-48 overflow-y-auto custom-scrollbar overflow-hidden">
                      {searchedStudentsForModal.map(s => (
                        <button key={s.MaHS} onClick={() => { setFormDiscipline({...formDiscipline, MaHS: s.MaHS}); setModalStudentSearch(s.Hoten); }} className={`w-full px-5 py-3 text-left text-[11px] font-bold border-b border-slate-50 last:border-0 hover:bg-indigo-50 transition-colors`}>
                          {s.Hoten} <span className="text-[9px] text-slate-400 font-medium ml-2">({s.MaHS} - {s.MaLopHienTai})</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Học sinh vi phạm</p>
                   <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{allStudents.find(s => s.MaHS === formDiscipline.MaHS)?.Hoten}</p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Ngày vi phạm</label>
                  <input type="date" value={formDiscipline.NgayViPham} onChange={e => setFormDiscipline({...formDiscipline, NgayViPham: e.target.value})} className="w-full p-3.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none shadow-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Loại lỗi vi phạm</label>
                  <select value={formDiscipline.MaLoi} onChange={e => setFormDiscipline({...formDiscipline, MaLoi: e.target.value})} className="w-full p-3.5 bg-white border border-slate-200 rounded-2xl text-xs font-black outline-none shadow-sm text-rose-600 cursor-pointer">
                    <option value="">-- Chọn quy tắc --</option>
                    {violationRules.map(r => <option key={r.MaLoi} value={r.MaLoi}>{r.TenLoi} (-{r.DiemTru}đ)</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Hình thức kỷ luật</label>
                <div className="flex flex-wrap gap-2 p-1 bg-white/50 border border-slate-100 rounded-2xl p-2">
                  {actionTypes.map(type => (
                    <button key={type} onClick={() => setFormDiscipline({...formDiscipline, HinhThucXL: type})} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase border transition-all ${formDiscipline.HinhThucXL === type ? 'bg-slate-900 text-white border-slate-900 shadow-md scale-105' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}`}>{type}</button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Ghi chú chi tiết (Ô chú thích)</label>
                <textarea value={formDiscipline.NoiDungChiTiet} onChange={e => setFormDiscipline({...formDiscipline, NoiDungChiTiet: e.target.value})} placeholder="Vd: Không học bài cũ, tái phạm nhiều lần, thái độ chưa tốt..." className="w-full p-5 bg-white border border-slate-200 rounded-[32px] text-xs font-medium min-h-[120px] outline-none shadow-inner focus:border-indigo-400 transition-all resize-none"></textarea>
              </div>
            </div>

            <div className="px-10 py-8 border-t border-slate-50 bg-white flex gap-4 shrink-0">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-slate-50 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all">Hủy</button>
              <button disabled={isSubmitting} onClick={handleSaveDiscipline} className="flex-[2] py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-rose-100 hover:bg-rose-700 transition-all flex items-center justify-center gap-3 active:scale-95">
                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Lưu vi phạm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal soạn tin nhắn Báo cáo PH */}
      {isComposeModalOpen && targetDiscipline && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col border border-white/20 animate-in zoom-in-95">
            <div className="px-8 py-6 border-b flex items-center justify-between bg-white shrink-0">
               <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg"><MessageSquare size={20} /></div>
                  <h3 className="font-black text-sm text-slate-800 uppercase tracking-tight">Báo cáo Phụ huynh</h3>
               </div>
               <button onClick={() => setIsComposeModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={24} className="text-slate-400" /></button>
            </div>
            <div className="p-10 space-y-8 bg-slate-50/10">
              <div className="bg-blue-50 border border-blue-100 p-6 rounded-[32px] flex items-center gap-5 shadow-sm">
                 <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center font-black text-blue-600 shadow-sm text-lg border border-blue-50">PH</div>
                 <div className="min-w-0">
                    <h4 className="font-black text-slate-900 text-sm leading-none mb-2 uppercase">{allStudents.find(s => s.MaHS === targetDiscipline.MaHS)?.Hoten}</h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Gửi tới: {allStudents.find(s => s.MaHS === targetDiscipline.MaHS)?.SDT_LinkHe}</p>
                 </div>
              </div>
              <div className="space-y-3">
                 <div className="flex items-center justify-between px-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nội dung tin nhắn:</label>
                    <button onClick={() => { navigator.clipboard.writeText(aiMessage); alert("Đã sao chép nội dung!"); }} className="flex items-center gap-1.5 text-blue-600 text-[10px] font-black uppercase tracking-widest hover:underline"><Copy size={14} /> Sao chép</button>
                 </div>
                 <div className="relative">
                    {isGeneratingAI && <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center rounded-[32px] border-2 border-dashed border-blue-200"><Loader2 className="animate-spin text-blue-600 mb-2" size={24} /><span className="text-[9px] font-black text-blue-600 uppercase">Hệ thống đang chuẩn bị nội dung...</span></div>}
                    <textarea value={aiMessage} onChange={e => setAiMessage(e.target.value)} className="w-full p-6 bg-white border border-slate-200 rounded-[32px] text-xs font-medium text-slate-700 leading-relaxed outline-none min-h-[180px] shadow-inner" />
                 </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <button onClick={() => handleActionSend('zalo')} className="py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex flex-col items-center gap-2 hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-100"><MessageSquare size={20} /> Zalo</button>
                <button onClick={() => handleActionSend('sms')} className="py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex flex-col items-center gap-2 hover:bg-black transition-all active:scale-95 shadow-lg shadow-slate-200"><Smartphone size={20} /> SMS</button>
                <button onClick={() => handleActionSend('email')} className="py-4 bg-indigo-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex flex-col items-center gap-2 hover:bg-indigo-600 transition-all active:scale-95 shadow-lg shadow-indigo-100"><Mail size={20} /> Email</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal cấu hình quy tắc lỗi */}
      {isRuleModalOpen && editingRule && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="p-8 border-b flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg"><Settings2 size={20}/></div>
                    <h3 className="font-black text-sm text-slate-800 uppercase tracking-tight">Cấu hình quy tắc lỗi</h3>
                 </div>
                 <button onClick={() => setIsRuleModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={24} className="text-slate-400"/></button>
              </div>
              <div className="p-10 space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Tên loại lỗi vi phạm</label>
                    <input type="text" value={editingRule.TenLoi} onChange={e => setEditingRule({...editingRule, TenLoi: e.target.value})} placeholder="VD: Nghỉ học không phép..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:bg-white focus:border-indigo-400" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Mức điểm trừ mặc định</label>
                    <input type="number" value={editingRule.DiemTru} onChange={e => setEditingRule({...editingRule, DiemTru: parseInt(e.target.value) || 0})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:bg-white focus:border-indigo-400" />
                 </div>
              </div>
              <div className="p-8 border-t bg-slate-50/50 flex gap-4">
                 <button onClick={() => setIsRuleModalOpen(false)} className="flex-1 py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl font-black text-[10px] uppercase">Hủy</button>
                 <button onClick={handleSaveRule} disabled={isSubmitting} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 hover:bg-indigo-700">
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
