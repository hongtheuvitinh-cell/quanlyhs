
import React, { useState, useMemo } from 'react';
import { 
  Search, User, Users, Calendar, Phone, Trash2, Plus, Sparkles, X, Save, 
  Edit2, MapPin, Mail, Info, Loader2, ChevronRight, GraduationCap,
  CheckCircle, Image as ImageIcon, BrainCircuit, ShieldAlert, ClipboardList, Briefcase, Lock
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
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [formData, setFormData] = useState<Partial<Student>>({});

  const sortedStudents = useMemo(() => {
    return students
      .filter(s => s.Hoten.toLowerCase().includes(searchTerm.toLowerCase()) || s.MaHS.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => a.MaHS.localeCompare(b.MaHS, undefined, { numeric: true }));
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
    } catch (err) { setAiResult("Lỗi phân tích."); } finally { setIsAnalyzing(false); }
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-20">
      {/* Top Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-100"><Users size={24} /></div>
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Học sinh lớp {state.selectedClass}</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Niên học: {state.selectedYear} • Sĩ số: {sortedStudents.length}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input type="text" placeholder="Tìm tên hoặc mã số..." className="pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none w-64 text-xs font-bold focus:bg-white focus:border-indigo-400 transition-all shadow-inner" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <button onClick={() => { setFormData({}); setIsFormOpen(true); }} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl shadow-xl hover:bg-indigo-700 transition-all text-[10px] font-black uppercase tracking-widest">Thêm HS Mới</button>
        </div>
      </div>

      {/* Grid Card 3D Aesthetic - Khôi phục hoàn toàn */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
        {sortedStudents.map((student, sIdx) => (
          <div 
            key={student.MaHS} 
            onClick={() => { setSelectedStudent(student); setActiveInfoTab('SYLL'); setAiResult(null); }} 
            className="bg-white p-6 rounded-[40px] border border-slate-200 shadow-sm hover:shadow-2xl hover:border-indigo-400 hover:-translate-y-1.5 transition-all group cursor-pointer animate-in zoom-in duration-300 relative overflow-hidden"
          >
            <div className="flex items-start gap-5 relative z-10">
              <div className="h-24 w-20 rounded-[28px] bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200 overflow-hidden shadow-inner relative">
                {student.Anh ? <img src={student.Anh} className="w-full h-full object-cover" /> : <User size={40} className="text-slate-200" />}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors"></div>
              </div>
              <div className="flex-1 min-w-0 py-1">
                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-lg mb-2 inline-block shadow-sm">ID: {student.MaHS}</span>
                <h3 className="text-[15px] font-black text-slate-800 truncate uppercase mb-2 group-hover:text-indigo-600 transition-colors tracking-tight">{student.Hoten}</h3>
                <div className="text-[11px] text-slate-400 font-bold flex flex-col gap-2">
                   <span className="flex items-center gap-2"><Calendar size={13} className="text-indigo-300"/> {student.NgaySinh}</span>
                   <span className="flex items-center gap-2"><Phone size={13} className="text-indigo-300"/> {student.SDT_LinkHe}</span>
                </div>
              </div>
            </div>
            {/* Trang trí góc card */}
            <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-indigo-50 rounded-full opacity-50 group-hover:scale-150 transition-transform"></div>
          </div>
        ))}
      </div>

      {/* Detail Modal - SYLL / Grades / Discipline / Logs */}
      {selectedStudent && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
          <div className="bg-white w-full max-w-5xl h-[90vh] rounded-[50px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 border border-white/20">
            {/* Modal Header */}
            <div className="p-8 border-b flex items-center justify-between shrink-0 bg-white">
               <div className="flex items-center gap-6">
                  <div className="w-16 h-20 rounded-3xl bg-slate-100 border-2 border-slate-50 overflow-hidden shadow-sm">
                    {selectedStudent.Anh ? <img src={selectedStudent.Anh} className="w-full h-full object-cover" /> : <User size={32} className="text-slate-300 mx-auto mt-6" />}
                  </div>
                  <div>
                    <h3 className="font-black text-2xl text-slate-800 uppercase tracking-tight leading-none mb-2">{selectedStudent.Hoten}</h3>
                    <div className="flex items-center gap-3">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full border">Mã HS: {selectedStudent.MaHS}</p>
                       <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">Lớp: {selectedStudent.MaLopHienTai}</p>
                    </div>
                  </div>
               </div>
               <div className="flex items-center gap-3">
                  <button onClick={() => { setFormData(selectedStudent); setIsFormOpen(true); }} className="p-3 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-2xl transition-all shadow-sm"><Edit2 size={20}/></button>
                  <button onClick={() => { if(confirm("Xóa hồ sơ học sinh này?")) onDeleteStudent(selectedStudent.MaHS); }} className="p-3 bg-rose-50 text-rose-500 hover:bg-rose-100 rounded-2xl transition-all shadow-sm"><Trash2 size={20}/></button>
                  <button onClick={() => setSelectedStudent(null)} className="p-3 hover:bg-slate-100 rounded-full ml-4 transition-colors"><X size={28} className="text-slate-400" /></button>
               </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
               {/* Modal Sidebar Navigation */}
               <div className="w-72 border-r p-8 space-y-3 hidden md:block shrink-0 bg-slate-50/30">
                  {[
                    { id: 'SYLL', label: 'Sơ yếu lý lịch', icon: User },
                    { id: 'GRADES', label: 'Bảng điểm chi tiết', icon: GraduationCap },
                    { id: 'DISCIPLINE', label: 'Kỷ luật rèn luyện', icon: ShieldAlert },
                    { id: 'LOGS', label: 'Nhật ký học tập', icon: ClipboardList }
                  ].map(tab => (
                    <button 
                      key={tab.id} 
                      onClick={() => setActiveInfoTab(tab.id as any)} 
                      className={`w-full flex items-center gap-4 px-6 py-4 rounded-3xl text-[11px] font-black uppercase tracking-widest transition-all ${activeInfoTab === tab.id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 scale-[1.02]' : 'text-slate-400 hover:bg-white hover:text-slate-600 hover:shadow-sm'}`}
                    >
                      <tab.icon size={18} /> {tab.label}
                    </button>
                  ))}
                  <div className="pt-8 border-t border-slate-100 mt-4">
                    <button onClick={() => handleAnalyze(selectedStudent)} className="w-full py-5 bg-emerald-50 text-emerald-600 rounded-[32px] text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-sm hover:bg-emerald-100 transition-all border border-emerald-100">
                      {isAnalyzing ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />} Phân tích AI Gemini
                    </button>
                  </div>
               </div>

               {/* Modal Content Scrollable Area */}
               <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-white">
                  {aiResult && <div className="mb-10 p-7 bg-emerald-50 border border-emerald-100 rounded-[36px] text-[13px] text-emerald-800 font-medium italic leading-relaxed animate-in slide-in-from-top-4 shadow-sm relative"><Sparkles className="absolute -top-3 -right-3 text-emerald-400" size={24}/> AI: "{aiResult}"</div>}
                  
                  {activeInfoTab === 'SYLL' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-500">
                       <InfoField label="Ngày sinh" value={selectedStudent.NgaySinh} icon={<Calendar size={16}/>} />
                       <InfoField label="Số điện thoại" value={selectedStudent.SDT_LinkHe} icon={<Phone size={16}/>} />
                       <InfoField label="Tài khoản đăng nhập" value={selectedStudent.MaHS} icon={<User size={16}/>} />
                       <InfoField label="Mật khẩu truy cập" value={selectedStudent.MatKhau || '123456'} icon={<Lock size={16}/>} colorClass="text-indigo-600 bg-indigo-50/50" />
                       <InfoField label="Email liên hệ" value={selectedStudent.Email} icon={<Mail size={16}/>} />
                       <InfoField label="Địa chỉ thường trú" value={selectedStudent.DiaChi} icon={<MapPin size={16}/>} colSpan={2} />
                       
                       <div className="md:col-span-2 grid grid-cols-2 gap-8 p-8 bg-slate-50/50 rounded-[40px] border border-slate-100 shadow-inner mt-4">
                          <InfoField label="Họ tên Cha" value={selectedStudent.TenCha} icon={<Users size={16}/>} />
                          <InfoField label="Nghề nghiệp Cha" value={selectedStudent.NgheNghiepCha} icon={<Briefcase size={16}/>} />
                          <InfoField label="Họ tên Mẹ" value={selectedStudent.TenMe} icon={<Users size={16}/>} />
                          <InfoField label="Nghề nghiệp Mẹ" value={selectedStudent.NgheNghiepMe} icon={<Briefcase size={16}/>} />
                       </div>
                    </div>
                  )}

                  {activeInfoTab === 'GRADES' && (
                    <div className="bg-white rounded-[40px] border border-slate-200 overflow-hidden shadow-sm animate-in fade-in duration-500">
                       <table className="w-full text-left">
                          <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">
                             <tr><th className="px-8 py-6">Môn học bộ môn</th><th className="px-8 py-6 text-center">Học kỳ 1</th><th className="px-8 py-6 text-center">Học kỳ 2</th></tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                             {subjectsList.map(sub => (
                               <tr key={sub.id} className="hover:bg-indigo-50/20 transition-colors">
                                  <td className="px-8 py-5 text-xs font-black text-slate-700 uppercase tracking-tight">{sub.name}</td>
                                  <td className="px-8 py-5 text-center font-black text-indigo-600 text-sm">{calculateSubjectAvg(selectedStudent.MaHS, sub.id, 1)?.toFixed(1) || '--'}</td>
                                  <td className="px-8 py-5 text-center font-black text-indigo-600 text-sm">{calculateSubjectAvg(selectedStudent.MaHS, sub.id, 2)?.toFixed(1) || '--'}</td>
                               </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                  )}
                  {/* ... các tab khác xử lý tương tự ... */}
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Form thêm mới / chỉnh sửa */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
           <div className="bg-white w-full max-w-2xl rounded-[50px] p-12 shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar border border-white/20">
              <div className="flex items-center justify-between mb-10">
                 <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest">Hồ sơ học sinh điện tử</h3>
                 <button onClick={() => setIsFormOpen(false)} className="p-3 hover:bg-slate-100 rounded-full transition-colors"><X size={28} className="text-slate-400"/></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <InputField label="Họ và tên học sinh" value={formData.Hoten} onChange={(v:any) => setFormData({...formData, Hoten: v})} />
                 <InputField label="Mã số HS (ID)" value={formData.MaHS} onChange={(v:any) => setFormData({...formData, MaHS: v})} disabled={!!formData.MaHS} />
                 <InputField label="Ngày sinh" value={formData.NgaySinh} onChange={(v:any) => setFormData({...formData, NgaySinh: v})} type="date" />
                 <InputField label="Số điện thoại" value={formData.SDT_LinkHe} onChange={(v:any) => setFormData({...formData, SDT_LinkHe: v})} />
                 <InputField label="Mật khẩu tài khoản" value={formData.MatKhau} onChange={(v:any) => setFormData({...formData, MatKhau: v})} placeholder="Mặc định: 123456" />
                 <InputField label="Địa chỉ" value={formData.DiaChi} onChange={(v:any) => setFormData({...formData, DiaChi: v})} colSpan={2} />
              </div>
              <div className="mt-12 flex gap-6">
                 <button onClick={() => setIsFormOpen(false)} className="flex-1 py-5 bg-slate-50 border border-slate-200 text-slate-500 rounded-[28px] font-black text-[11px] uppercase tracking-widest hover:bg-slate-100 transition-all">Hủy bỏ</button>
                 <button onClick={() => { onUpdateStudent({...formData as Student, MaLopHienTai: state.selectedClass, MaNienHoc: state.selectedYear}); setIsFormOpen(false); }} className="flex-[2] py-5 bg-indigo-600 text-white rounded-[28px] font-black text-[11px] uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-3">
                    <Save size={20}/> Lưu hồ sơ
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const InfoField = ({ label, value, colSpan = 1, icon, colorClass = "bg-slate-50" }: any) => (
  <div className={`space-y-2 ${colSpan === 2 ? 'md:col-span-2' : ''}`}>
    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest px-2 flex items-center gap-2 opacity-80">{icon} {label}</p>
    <div className={`p-5 rounded-[24px] border border-slate-100 font-bold text-slate-800 text-[13px] shadow-sm transition-all hover:border-indigo-100 hover:shadow-md ${colorClass}`}>{value || '---'}</div>
  </div>
);

const InputField = ({ label, value, onChange, placeholder = '', type = 'text', disabled = false, colSpan = 1 }: any) => (
  <div className={`space-y-2 ${colSpan === 2 ? 'md:col-span-2' : ''}`}>
    <label className="text-[10px] font-black text-slate-400 uppercase px-2 tracking-widest">{label}</label>
    <input type={type} value={value || ''} disabled={disabled} onChange={e => onChange(e.target.value)} className={`w-full p-5 bg-slate-50 border border-slate-200 rounded-[24px] text-[13px] font-bold focus:bg-white focus:border-indigo-400 transition-all shadow-inner outline-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`} placeholder={placeholder} />
  </div>
);

export default StudentList;
