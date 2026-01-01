
import React, { useState, useMemo } from 'react';
import { Search, User, Users, Calendar, Phone, Trash2, Plus, Sparkles, X, Save, Edit2, MapPin, Mail, Info, Loader2, ChevronRight, FileSpreadsheet, AlertTriangle, MessageSquare, Camera } from 'lucide-react';
import { AppState, Student, Grade, Discipline, LearningLog, ViolationRule } from '../types';
import { analyzeStudentPerformance, parseStudentListFromImage } from '../services/geminiService';

interface Props {
  state: AppState;
  students: Student[];
  grades: Grade[];
  disciplines: Discipline[];
  logs: LearningLog[];
  violationRules: ViolationRule[];
  onUpdateStudent: (student: Student) => void;
  onDeleteStudent: (maHS: string) => void;
}

const subjectsList = [
  { id: 'TOAN', name: 'Toán Học' }, { id: 'VAN', name: 'Ngữ Văn' }, { id: 'ANH', name: 'Tiếng Anh' },
  { id: 'LY', name: 'Vật Lý' }, { id: 'HOA', name: 'Hóa Học' }, { id: 'SINH', name: 'Sinh Học' },
  { id: 'DIA', name: 'Địa Lý' }, { id: 'SU', name: 'Lịch Sử' }, { id: 'GDCD', name: 'GDCD' }
];

const StudentList: React.FC<Props> = ({ state, students, grades, disciplines, logs, violationRules, onUpdateStudent, onDeleteStudent }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [activeInfoTab, setActiveInfoTab] = useState<'SYLL' | 'GRADES' | 'DISCIPLINE' | 'LOGS'>('SYLL');
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Student>>({
    Hoten: '', MaHS: '', NgaySinh: '', GioiTinh: true, SDT_LinkHe: '', DiaChi: '', TenCha: '', TenMe: ''
  });

  const filteredStudents = (students || []).filter(s => 
    s.Hoten.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.MaHS.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const calculateSubjectAvg = (maHS: string, maMon: string, semester: number) => {
    const sGrades = grades.filter(g => g.MaHS === maHS && g.MaMonHoc === maMon && g.HocKy === semester && g.MaNienHoc === state.selectedYear);
    if (sGrades.length === 0) return null;
    const dgtx = sGrades.filter(g => g.LoaiDiem.startsWith('ĐGTX')).map(g => g.DiemSo);
    const ggk = sGrades.find(g => g.LoaiDiem === 'ĐGGK')?.DiemSo;
    const gck = sGrades.find(g => g.LoaiDiem === 'ĐGCK')?.DiemSo;
    if (dgtx.length > 0 && ggk !== undefined && gck !== undefined) {
      return (dgtx.reduce((a, b) => a + b, 0) + ggk * 2 + gck * 3) / (dgtx.length + 5);
    }
    return null;
  };

  const handleAnalyze = async (student: Student) => {
    setIsAnalyzing(true);
    setAiResult(null);
    try {
      const studentGrades = grades.filter(g => g.MaHS === student.MaHS);
      const studentLogs = logs.filter(l => l.MaHS === student.MaHS);
      const analysis = await analyzeStudentPerformance(student, studentGrades, studentLogs);
      setAiResult(analysis);
    } catch (err) {
      setAiResult("Không thể phân tích lúc này.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveStudent = () => {
    if (!formData.Hoten || !formData.MaHS) { alert("Nhập đủ Tên và Mã HS!"); return; }
    onUpdateStudent({
      ...formData as Student,
      MaLopHienTai: state.selectedClass,
      MaNienHoc: state.selectedYear,
      MatKhau: formData.MatKhau || '123456'
    });
    setIsFormOpen(false);
    setFormData({});
  };

  const handleAiImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsAiLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = (event.target?.result as string).split(',')[1];
        const result = await parseStudentListFromImage(base64, file.type, state.currentRole);
        if (result && result.length > 0) {
          // Chỉ lấy học sinh đầu tiên để điền form (demo) hoặc duyệt mảng để upsert hết
          const first = result[0];
          setFormData({ ...formData, ...first });
          setIsFormOpen(true);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      alert("AI không thể đọc được ảnh này.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const exportGradesToCSV = (student: Student) => {
    let csvContent = "Môn học,HK1,HK2,Cả năm\n";
    subjectsList.forEach(sub => {
      const hk1 = calculateSubjectAvg(student.MaHS, sub.id, 1)?.toFixed(1) || "-";
      const hk2 = calculateSubjectAvg(student.MaHS, sub.id, 2)?.toFixed(1) || "-";
      const cn = calculateSubjectAvg(student.MaHS, sub.id, 1) && calculateSubjectAvg(student.MaHS, sub.id, 2) 
        ? ((calculateSubjectAvg(student.MaHS, sub.id, 1)! + calculateSubjectAvg(student.MaHS, sub.id, 2)! * 2) / 3).toFixed(1) 
        : "-";
      csvContent += `${sub.name},${hk1},${hk2},${cn}\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `BangDiem_${student.MaHS}.csv`);
    link.click();
  };

  return (
    <div className="space-y-4 animate-in fade-in pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-md"><Users size={20} /></div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Hồ sơ Học sinh & SYLL</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Lớp {state.selectedClass} • {students.length} thành viên</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Tìm theo tên..." 
              className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none w-full sm:w-48 text-xs focus:bg-white transition-all" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
          <label className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl cursor-pointer hover:bg-indigo-100 transition-all border border-indigo-100">
             {isAiLoading ? <Loader2 size={18} className="animate-spin"/> : <Camera size={18} />}
             <input type="file" className="hidden" accept="image/*" onChange={handleAiImport} />
          </label>
          <button onClick={() => { setFormData({}); setIsFormOpen(true); }} className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"><Plus size={18}/></button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredStudents.map((student) => {
          const sGrades = grades.filter(g => g.MaHS === student.MaHS && g.MaNienHoc === state.selectedYear);
          const avg = sGrades.length > 0 ? (sGrades.reduce((sum, g) => sum + g.DiemSo, 0) / sGrades.length).toFixed(1) : '--';
          return (
            <div 
              key={student.MaHS} 
              onClick={() => { setSelectedStudent(student); setActiveInfoTab('SYLL'); setAiResult(null); }}
              className="bg-white p-5 rounded-[32px] border border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-50/50 transition-all group cursor-pointer relative"
            >
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100 overflow-hidden shadow-inner group-hover:scale-105 transition-transform">
                  {student.Anh ? <img src={student.Anh} className="w-full h-full object-cover" /> : <User size={28} className="text-indigo-300" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">{student.MaHS}</span>
                    <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase ${student.GioiTinh ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>
                      {student.GioiTinh ? 'Nam' : 'Nữ'}
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-slate-800 truncate group-hover:text-indigo-600 transition-colors uppercase">{student.Hoten}</h3>
                  <div className="flex flex-col gap-1 mt-2">
                     <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold"><Calendar size={12} className="text-indigo-300" /> {student.NgaySinh}</div>
                     <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold"><Phone size={12} className="text-indigo-300" /> {student.SDT_LinkHe}</div>
                  </div>
                </div>
              </div>
              
              <div className="mt-5 pt-4 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                   <div className="p-1 bg-indigo-50 rounded-md"><Sparkles size={10} className="text-indigo-600" /></div>
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Trung bình:</span>
                   <span className="text-xs font-black text-indigo-600">{avg}</span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                   <button onClick={(e) => { e.stopPropagation(); setFormData(student); setIsFormOpen(true); }} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl"><Edit2 size={16}/></button>
                   <button onClick={(e) => { e.stopPropagation(); if(confirm("Xóa học sinh này?")) onDeleteStudent(student.MaHS); }} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl"><Trash2 size={16}/></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL CHI TIẾT 4 TAB */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-5xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
             <div className="p-6 border-b flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg"><Info size={20} /></div>
                   <div>
                     <h3 className="font-black text-slate-800 text-sm uppercase tracking-tight">Hồ sơ học sinh chuyên sâu</h3>
                     <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{selectedStudent.Hoten} • Lớp {state.selectedClass}</p>
                   </div>
                </div>
                <button onClick={() => setSelectedStudent(null)} className="p-2 hover:bg-slate-100 rounded-full"><X size={24} className="text-slate-400"/></button>
             </div>

             <div className="flex border-b bg-slate-50/50 p-2 gap-2 shrink-0">
                <button onClick={() => setActiveInfoTab('SYLL')} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeInfoTab === 'SYLL' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white'}`}>Sơ yếu lý lịch</button>
                <button onClick={() => setActiveInfoTab('GRADES')} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeInfoTab === 'GRADES' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white'}`}>Kết quả học tập</button>
                <button onClick={() => setActiveInfoTab('DISCIPLINE')} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeInfoTab === 'DISCIPLINE' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white'}`}>Kỷ luật & Vi phạm</button>
                <button onClick={() => setActiveInfoTab('LOGS')} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeInfoTab === 'LOGS' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white'}`}>Nhật ký giáo viên</button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-white">
                {activeInfoTab === 'SYLL' && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-left-4">
                     <div className="lg:col-span-4 space-y-6">
                        <div className="aspect-square bg-white rounded-[40px] border border-slate-200 p-2 shadow-sm overflow-hidden group">
                           {selectedStudent.Anh ? <img src={selectedStudent.Anh} className="w-full h-full object-cover rounded-[32px]" /> : <div className="w-full h-full bg-slate-50 rounded-[32px] flex items-center justify-center text-slate-200"><User size={64}/></div>}
                        </div>
                        <div className="bg-indigo-600 p-6 rounded-[32px] text-white shadow-xl shadow-indigo-200 relative overflow-hidden">
                           <div className="relative z-10">
                              <h4 className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">AI Cố vấn học tập</h4>
                              <button 
                                onClick={() => handleAnalyze(selectedStudent)}
                                disabled={isAnalyzing}
                                className="mt-4 w-full py-3 bg-white/20 hover:bg-white/30 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest backdrop-blur-md transition-all border border-white/10"
                              >
                                 {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                 Phân tích học sinh
                              </button>
                           </div>
                           {aiResult && <div className="mt-4 p-4 bg-white/10 rounded-2xl text-[11px] leading-relaxed border border-white/5 animate-in fade-in">"{aiResult}"</div>}
                        </div>
                     </div>
                     <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                           <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Cá nhân</h5>
                           <div className="space-y-3">
                              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100"><p className="text-[9px] text-slate-400 uppercase font-bold">Địa chỉ</p><p className="text-xs font-bold text-slate-700">{selectedStudent.DiaChi}</p></div>
                              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100"><p className="text-[9px] text-slate-400 uppercase font-bold">Email</p><p className="text-xs font-bold text-slate-700">{selectedStudent.Email || 'Chưa cập nhật'}</p></div>
                           </div>
                        </div>
                        <div className="space-y-4">
                           <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Gia đình</h5>
                           <div className="space-y-3">
                              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100"><p className="text-[9px] text-slate-400 uppercase font-bold">Cha: {selectedStudent.TenCha}</p><p className="text-xs font-bold text-slate-700">{selectedStudent.NgheNghiepCha}</p></div>
                              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100"><p className="text-[9px] text-slate-400 uppercase font-bold">Mẹ: {selectedStudent.TenMe}</p><p className="text-xs font-bold text-slate-700">{selectedStudent.NgheNghiepMe}</p></div>
                           </div>
                        </div>
                     </div>
                  </div>
                )}

                {activeInfoTab === 'GRADES' && (
                  <div className="space-y-6 animate-in slide-in-from-right-4">
                     <div className="flex items-center justify-between mb-2">
                        <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Bảng điểm tổng hợp các môn</h4>
                        <button onClick={() => exportGradesToCSV(selectedStudent)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-100 transition-all active:scale-95"><FileSpreadsheet size={16}/> Xuất Excel</button>
                     </div>
                     <div className="overflow-hidden border border-slate-100 rounded-3xl">
                        <table className="w-full text-left">
                           <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              <tr><th className="px-6 py-4">Môn học</th><th className="px-6 py-4 text-center">Học kỳ 1</th><th className="px-6 py-4 text-center">Học kỳ 2</th><th className="px-6 py-4 text-right text-indigo-600">Cả năm</th></tr>
                           </thead>
                           <tbody className="divide-y divide-slate-50">
                              {subjectsList.map(sub => {
                                 const hk1 = calculateSubjectAvg(selectedStudent.MaHS, sub.id, 1);
                                 const hk2 = calculateSubjectAvg(selectedStudent.MaHS, sub.id, 2);
                                 const cn = (hk1 && hk2) ? (hk1 + hk2 * 2) / 3 : null;
                                 return (
                                   <tr key={sub.id} className="hover:bg-slate-50/50">
                                      <td className="px-6 py-4 font-bold text-slate-800 text-xs">{sub.name}</td>
                                      <td className="px-6 py-4 text-center text-slate-500 font-bold">{hk1?.toFixed(1) || '-'}</td>
                                      <td className="px-6 py-4 text-center text-slate-500 font-bold">{hk2?.toFixed(1) || '-'}</td>
                                      <td className="px-6 py-4 text-right font-black text-indigo-600">{cn?.toFixed(1) || '-'}</td>
                                   </tr>
                                 );
                              })}
                           </tbody>
                        </table>
                     </div>
                  </div>
                )}

                {activeInfoTab === 'DISCIPLINE' && (
                  <div className="space-y-6 animate-in slide-in-from-bottom-4">
                     <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Lịch sử vi phạm nề nếp</h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {disciplines.filter(d => d.MaHS === selectedStudent.MaHS).length > 0 ? disciplines.filter(d => d.MaHS === selectedStudent.MaHS).map(d => {
                           const rule = violationRules.find(r => r.MaLoi === d.MaLoi);
                           return (
                             <div key={d.MaKyLuat} className="p-4 bg-rose-50/50 border border-rose-100 rounded-2xl flex items-start gap-4">
                                <div className="p-2 bg-rose-600 text-white rounded-xl shadow-md"><AlertTriangle size={18}/></div>
                                <div>
                                   <div className="flex items-center gap-2 mb-1">
                                      <span className="text-[10px] font-black text-rose-600 uppercase">{rule?.TenLoi || 'Vi phạm'}</span>
                                      <span className="text-[9px] font-bold text-slate-400">{d.NgayViPham}</span>
                                   </div>
                                   <p className="text-[11px] text-slate-600 font-medium italic">"{d.NoiDungChiTiet}"</p>
                                   <span className="mt-2 inline-block px-2 py-0.5 bg-rose-600 text-white rounded text-[8px] font-black uppercase tracking-tighter">{d.HinhThucXL}</span>
                                </div>
                             </div>
                           );
                        }) : <div className="col-span-2 py-12 text-center text-slate-300 font-bold uppercase text-[10px] tracking-widest bg-slate-50 rounded-3xl border-2 border-dashed border-slate-100">Học sinh chưa có vi phạm nào</div>}
                     </div>
                  </div>
                )}

                {activeInfoTab === 'LOGS' && (
                  <div className="space-y-6 animate-in slide-in-from-top-4">
                     <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Nhật ký nhận xét từ giáo viên bộ môn</h4>
                     <div className="space-y-3">
                        {logs.filter(l => l.MaHS === selectedStudent.MaHS).length > 0 ? logs.filter(l => l.MaHS === selectedStudent.MaHS).map(l => (
                          <div key={l.MaTheoDoi} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-start gap-4 hover:border-indigo-200 transition-all">
                             <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><MessageSquare size={18}/></div>
                             <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                   <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Tiết học ngày {l.NgayGhiChep}</span>
                                   <span className="px-2 py-0.5 bg-slate-900 text-white rounded-[6px] text-[8px] font-black uppercase">{l.TrangThai}</span>
                                </div>
                                <p className="text-[11px] text-slate-700 font-medium leading-relaxed italic">"{l.NhanXet}"</p>
                             </div>
                          </div>
                        )) : <div className="py-12 text-center text-slate-300 font-bold uppercase text-[10px] tracking-widest bg-slate-50 rounded-3xl border-2 border-dashed border-slate-100">Chưa có ghi chú nhật ký</div>}
                     </div>
                  </div>
                )}
             </div>
             
             <div className="p-6 bg-slate-50 border-t flex justify-end gap-3 shrink-0">
                <button onClick={() => setSelectedStudent(null)} className="px-8 py-3 bg-white border border-slate-200 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest">Đóng hồ sơ</button>
             </div>
          </div>
        </div>
      )}

      {/* MODAL THÊM / SỬA HỌC SINH */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b flex items-center justify-between bg-white shrink-0">
               <h3 className="font-black text-sm text-slate-800 uppercase tracking-tight">{formData.MaHS ? 'Cập nhật học sinh' : 'Thêm học sinh mới'}</h3>
               <button onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/30 space-y-6">
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><label className="text-[9px] font-bold text-slate-400 uppercase px-1">Mã Học Sinh</label><input type="text" value={formData.MaHS} onChange={e => setFormData({...formData, MaHS: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none" placeholder="HS001"/></div>
                  <div className="space-y-1"><label className="text-[9px] font-bold text-slate-400 uppercase px-1">Họ và Tên</label><input type="text" value={formData.Hoten} onChange={e => setFormData({...formData, Hoten: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none" placeholder="Nguyễn Văn A"/></div>
                  <div className="space-y-1"><label className="text-[9px] font-bold text-slate-400 uppercase px-1">Ngày sinh</label><input type="date" value={formData.NgaySinh} onChange={e => setFormData({...formData, NgaySinh: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none"/></div>
                  <div className="space-y-1"><label className="text-[9px] font-bold text-slate-400 uppercase px-1">Giới tính</label>
                    <div className="flex p-1 bg-white border border-slate-200 rounded-2xl h-11">
                      <button onClick={() => setFormData({...formData, GioiTinh: true})} className={`flex-1 rounded-xl text-[10px] font-black uppercase ${formData.GioiTinh ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Nam</button>
                      <button onClick={() => setFormData({...formData, GioiTinh: false})} className={`flex-1 rounded-xl text-[10px] font-black uppercase ${!formData.GioiTinh ? 'bg-pink-500 text-white' : 'text-slate-400'}`}>Nữ</button>
                    </div>
                  </div>
                  <div className="space-y-1"><label className="text-[9px] font-bold text-slate-400 uppercase px-1">Điện thoại</label><input type="text" value={formData.SDT_LinkHe} onChange={e => setFormData({...formData, SDT_LinkHe: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none" placeholder="090..."/></div>
                  <div className="space-y-1"><label className="text-[9px] font-bold text-slate-400 uppercase px-1">Địa chỉ</label><input type="text" value={formData.DiaChi} onChange={e => setFormData({...formData, DiaChi: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none" placeholder="123..."/></div>
                  <div className="space-y-1"><label className="text-[9px] font-bold text-slate-400 uppercase px-1">Họ tên Cha</label><input type="text" value={formData.TenCha} onChange={e => setFormData({...formData, TenCha: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none"/></div>
                  <div className="space-y-1"><label className="text-[9px] font-bold text-slate-400 uppercase px-1">Họ tên Mẹ</label><input type="text" value={formData.TenMe} onChange={e => setFormData({...formData, TenMe: e.target.value})} className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none"/></div>
               </div>
            </div>
            <div className="p-6 bg-white border-t flex justify-end gap-3 shrink-0">
               <button onClick={() => setIsFormOpen(false)} className="px-8 py-3 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest">Hủy</button>
               <button onClick={handleSaveStudent} className="px-10 py-3 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all text-[10px] uppercase tracking-widest flex items-center gap-2"><Save size={16}/> Lưu thay đổi</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentList;
