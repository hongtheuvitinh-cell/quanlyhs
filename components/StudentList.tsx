
import React, { useState, useMemo } from 'react';
import { 
  Search, User, Users, Calendar, Phone, Trash2, Plus, Sparkles, X, Save, 
  Edit2, MapPin, Mail, Info, Loader2, ChevronRight, FileSpreadsheet, 
  AlertTriangle, MessageSquare, Camera, Download, UserPlus, GraduationCap,
  CheckCircle, Image as ImageIcon, FileText, BrainCircuit, FileUp, Link as LinkIcon, Lock,
  // Add missing imports
  ShieldAlert, ClipboardList
} from 'lucide-react';
import { AppState, Student, Grade, Discipline, LearningLog, ViolationRule } from '../types';
import { analyzeStudentPerformance } from '../services/geminiService';

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
  const [gradeSubTab, setGradeSubTab] = useState<1 | 2>(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Student>>({});

  const sortedStudents = useMemo(() => {
    return students
      .filter(s => {
        const matchesSearch = s.Hoten.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             s.MaHS.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
      })
      .sort((a, b) => a.MaHS.localeCompare(b.MaHS, undefined, { numeric: true, sensitivity: 'base' }));
  }, [students, searchTerm]);

  const calculateSubjectAvg = (maHS: string, maMon: string, semester: number) => {
    const sGrades = grades.filter(g => g.MaHS === maHS && g.MaMonHoc === maMon && g.HocKy === semester);
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
    try {
      const studentGrades = grades.filter(g => g.MaHS === student.MaHS);
      const studentLogs = logs.filter(l => l.MaHS === student.MaHS);
      const analysis = await analyzeStudentPerformance(student, studentGrades, studentLogs);
      setAiResult(analysis);
    } catch (err) {
      setAiResult("Lỗi phân tích.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in pb-20">
      {/* Header Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-[32px] border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-100"><Users size={24} /></div>
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Học sinh lớp {state.selectedClass}</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{sortedStudents.length} thành viên đang hiển thị</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Tìm tên..." 
              className="pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none w-full sm:w-48 text-xs font-bold" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
          <button onClick={() => { setFormData({}); setIsFormOpen(true); }} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 transition-all text-[10px] font-black uppercase tracking-widest">
            <Plus size={18}/> Thêm HS
          </button>
        </div>
      </div>

      {/* Grid of Student Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {sortedStudents.map((student, sIdx) => (
          <div 
            key={student.MaHS} 
            onClick={() => { setSelectedStudent(student); setActiveInfoTab('SYLL'); setAiResult(null); }}
            className="bg-white p-5 rounded-[32px] border border-slate-200 shadow-sm hover:border-indigo-400 hover:shadow-xl transition-all group cursor-pointer"
          >
            <div className="flex items-start gap-4">
              <div className="h-20 w-16 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200 overflow-hidden shadow-inner">
                {student.Anh ? <img src={student.Anh} className="w-full h-full object-cover" /> : <User size={32} className="text-slate-200" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{sIdx + 1}. {student.MaHS}</span>
                  <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase ${student.GioiTinh ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>
                    {student.GioiTinh ? 'Nam' : 'Nữ'}
                  </span>
                </div>
                <h3 className="text-sm font-black text-slate-800 truncate group-hover:text-indigo-600 uppercase leading-tight mb-2">{student.Hoten}</h3>
                <div className="flex flex-col gap-1.5">
                   <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold"><Calendar size={12} /> {student.NgaySinh}</div>
                   <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold"><Phone size={12} /> {student.SDT_LinkHe}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-5xl h-[90vh] rounded-[40px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
            <div className="p-6 border-b flex items-center justify-between shrink-0">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-16 rounded-xl bg-slate-100 border overflow-hidden">
                    {selectedStudent.Anh ? <img src={selectedStudent.Anh} className="w-full h-full object-cover" /> : <User size={24} className="text-slate-300 mx-auto mt-4" />}
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-slate-800 uppercase leading-none mb-1">{selectedStudent.Hoten}</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mã HS: {selectedStudent.MaHS} • Lớp: {selectedStudent.MaLopHienTai}</p>
                  </div>
               </div>
               <button onClick={() => setSelectedStudent(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={24}/></button>
            </div>

            <div className="flex-1 flex overflow-hidden">
               {/* Sidebar Tabs */}
               <div className="w-64 border-r border-slate-50 p-6 space-y-2 hidden md:block">
                  {[
                    { id: 'SYLL', label: 'Sơ yếu lý lịch', icon: User },
                    { id: 'GRADES', label: 'Bảng điểm chi tiết', icon: GraduationCap },
                    { id: 'DISCIPLINE', label: 'Kỷ luật & Rèn luyện', icon: ShieldAlert },
                    { id: 'LOGS', label: 'Nhật ký theo dõi', icon: ClipboardList }
                  ].map(tab => (
                    <button 
                      key={tab.id}
                      onClick={() => { setActiveInfoTab(tab.id as any); setAiResult(null); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeInfoTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:bg-slate-50'}`}
                    >
                      <tab.icon size={16} /> {tab.label}
                    </button>
                  ))}
                  
                  <div className="pt-6 mt-6 border-t border-slate-50">
                     <button 
                       onClick={() => handleAnalyze(selectedStudent)}
                       disabled={isAnalyzing}
                       className="w-full py-4 bg-emerald-50 text-emerald-600 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-100 transition-all"
                     >
                       {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                       Phân tích AI Gemini
                     </button>
                  </div>
               </div>

               {/* Tab Content */}
               <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/20">
                  {aiResult && (
                    <div className="mb-6 p-5 bg-emerald-50 border border-emerald-100 rounded-3xl animate-in slide-in-from-top-4">
                       <h5 className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-2 flex items-center gap-2"><BrainCircuit size={16}/> Nhận xét từ AI Gemini</h5>
                       <p className="text-xs font-medium text-emerald-800 leading-relaxed italic">"{aiResult}"</p>
                    </div>
                  )}

                  {activeInfoTab === 'SYLL' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <InfoField label="Ngày sinh" value={selectedStudent.NgaySinh} icon={<Calendar size={14}/>} />
                       <InfoField label="Giới tính" value={selectedStudent.GioiTinh ? 'Nam' : 'Nữ'} icon={<User size={14}/>} />
                       <InfoField label="Số điện thoại" value={selectedStudent.SDT_LinkHe} icon={<Phone size={14}/>} />
                       <InfoField label="Email" value={selectedStudent.Email} icon={<Mail size={14}/>} />
                       <InfoField label="Địa chỉ" value={selectedStudent.DiaChi} icon={<MapPin size={14}/>} colSpan={2} />
                       <InfoField label="Họ tên Cha" value={selectedStudent.TenCha} icon={<Users size={14}/>} />
                       <InfoField label="Nghề nghiệp Cha" value={selectedStudent.NgheNghiepCha} icon={<Briefcase size={14}/>} />
                       <InfoField label="Họ tên Mẹ" value={selectedStudent.TenMe} icon={<Users size={14}/>} />
                       <InfoField label="Nghề nghiệp Mẹ" value={selectedStudent.NgheNghiepMe} icon={<Briefcase size={14}/>} />
                    </div>
                  )}

                  {activeInfoTab === 'GRADES' && (
                    <div className="space-y-6">
                       <div className="flex p-1 bg-white border border-slate-200 rounded-xl w-fit">
                          <button onClick={() => setGradeSubTab(1)} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${gradeSubTab === 1 ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Học kỳ 1</button>
                          <button onClick={() => setGradeSubTab(2)} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${gradeSubTab === 2 ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Học kỳ 2</button>
                       </div>
                       <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                          <table className="w-full text-left">
                             <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b">
                                <tr>
                                  <th className="px-6 py-4">Môn học</th>
                                  <th className="px-4 py-4 text-center">TX1</th>
                                  <th className="px-4 py-4 text-center">TX2</th>
                                  <th className="px-4 py-4 text-center">GK</th>
                                  <th className="px-4 py-4 text-center">CK</th>
                                  <th className="px-6 py-4 text-right text-indigo-600">Trung bình</th>
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-50">
                                {subjectsList.map(sub => {
                                   const avg = calculateSubjectAvg(selectedStudent.MaHS, sub.id, gradeSubTab);
                                   return (
                                     <tr key={sub.id}>
                                       <td className="px-6 py-3 text-xs font-bold text-slate-700 uppercase">{sub.name}</td>
                                       <td className="px-4 py-3 text-center text-xs font-medium text-slate-400">---</td>
                                       <td className="px-4 py-3 text-center text-xs font-medium text-slate-400">---</td>
                                       <td className="px-4 py-3 text-center text-xs font-medium text-slate-400">---</td>
                                       <td className="px-4 py-3 text-center text-xs font-medium text-slate-400">---</td>
                                       <td className="px-6 py-3 text-right font-black text-indigo-600 text-sm">{avg?.toFixed(1) || '--'}</td>
                                     </tr>
                                   );
                                })}
                             </tbody>
                          </table>
                       </div>
                    </div>
                  )}

                  {activeInfoTab === 'DISCIPLINE' && (
                    <div className="space-y-4">
                       {disciplines.filter(d => d.MaHS === selectedStudent.MaHS).length > 0 ? disciplines.filter(d => d.MaHS === selectedStudent.MaHS).map(d => (
                         <div key={d.MaKyLuat} className="p-4 bg-white rounded-2xl border border-slate-200 flex justify-between items-center">
                            <div>
                               <p className="text-[11px] font-black text-rose-600 uppercase mb-1">{violationRules.find(r => r.MaLoi === d.MaLoi)?.TenLoi}</p>
                               <p className="text-[10px] text-slate-500 italic font-medium">"{d.NoiDungChiTiet}"</p>
                               <p className="text-[9px] text-slate-300 font-bold mt-2 uppercase">{d.NgayViPham}</p>
                            </div>
                            <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-lg text-[9px] font-black uppercase border border-rose-100">{d.HinhThucXL}</span>
                         </div>
                       )) : (
                         <div className="py-20 text-center opacity-30 text-slate-300 uppercase text-[10px] font-black">Học sinh chưa có vi phạm nào.</div>
                       )}
                    </div>
                  )}
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Form Thêm HS */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white w-full max-w-lg rounded-[40px] p-8 shadow-2xl">
              <h3 className="text-sm font-black text-slate-800 uppercase mb-6 tracking-widest">Thêm học sinh mới</h3>
              <div className="space-y-4">
                 <InputField label="Họ và tên" value={formData.Hoten} onChange={(v:any) => setFormData({...formData, Hoten: v})} placeholder="Nguyễn Văn A" />
                 <div className="grid grid-cols-2 gap-4">
                    <InputField label="Mã học sinh" value={formData.MaHS} onChange={(v:any) => setFormData({...formData, MaHS: v})} placeholder="HS001" />
                    <InputField label="Ngày sinh" value={formData.NgaySinh} onChange={(v:any) => setFormData({...formData, NgaySinh: v})} type="date" />
                 </div>
              </div>
              <div className="mt-8 flex gap-3">
                 <button onClick={() => setIsFormOpen(false)} className="flex-1 py-3.5 bg-white border border-slate-200 text-slate-500 rounded-2xl font-black text-[10px] uppercase">Hủy</button>
                 <button onClick={() => { onUpdateStudent({...formData as Student, MaLopHienTai: state.selectedClass, MaNienHoc: state.selectedYear}); setIsFormOpen(false); }} className="flex-[2] py-3.5 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg">Lưu thông tin</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const InfoField = ({ label, value, colSpan = 1, icon }: any) => (
  <div className={`space-y-1 ${colSpan === 2 ? 'md:col-span-2' : ''}`}>
    <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest px-1 flex items-center gap-1">
      {icon} {label}
    </p>
    <div className="p-3 bg-white rounded-xl border border-slate-100 font-bold text-slate-700 text-[11px] truncate shadow-sm">
      {value || '---'}
    </div>
  </div>
);

const InputField = ({ label, value, onChange, placeholder = '', type = 'text' }: any) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-black text-slate-400 uppercase px-1 tracking-widest">{label}</label>
    <input 
      type={type} 
      value={value || ''} 
      onChange={e => onChange(e.target.value)} 
      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-[12px] font-bold outline-none focus:bg-white focus:border-indigo-400 transition-all shadow-inner" 
      placeholder={placeholder}
    />
  </div>
);

const Briefcase = ({ size, className }: any) => <ImageIcon size={size} className={className} />;

export default StudentList;
