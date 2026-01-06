
import React, { useState, useMemo } from 'react';
import { 
  Search, User, Users, Calendar, Phone, Trash2, Plus, Sparkles, X, Save, 
  Edit2, MapPin, Mail, Info, Loader2, ChevronRight, FileSpreadsheet, 
  AlertTriangle, MessageSquare, Camera, Download, UserPlus, GraduationCap,
  CheckCircle, Image as ImageIcon, FileText, BrainCircuit, FileUp, Link as LinkIcon, Lock,
  ShieldAlert, ClipboardList, Briefcase
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
    <div className="space-y-4 animate-in fade-in pb-20 overflow-y-auto">
      {/* Header Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-[32px] border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-100"><Users size={24} /></div>
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Học sinh lớp {state.selectedClass}</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{sortedStudents.length} học sinh trong danh sách</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Tìm tên hoặc mã..." 
              className="pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none w-full sm:w-48 text-xs font-bold" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
          <button onClick={() => { setFormData({}); setIsFormOpen(true); }} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 transition-all text-[10px] font-black uppercase tracking-widest">
            <Plus size={18}/> Thêm HS mới
          </button>
        </div>
      </div>

      {/* Grid of Student Cards - PHỤC HỒI GIAO DIỆN CARD */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
        {sortedStudents.map((student, sIdx) => (
          <div 
            key={student.MaHS} 
            onClick={() => { setSelectedStudent(student); setActiveInfoTab('SYLL'); setAiResult(null); }}
            className="bg-white p-5 rounded-[32px] border border-slate-200 shadow-sm hover:border-indigo-400 hover:shadow-xl transition-all group cursor-pointer animate-in zoom-in duration-300"
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
                <h3 className="text-sm font-black text-slate-800 truncate group-hover:text-indigo-600 uppercase leading-tight mb-2 tracking-tight">{student.Hoten}</h3>
                <div className="flex flex-col gap-1.5">
                   <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold"><Calendar size={12} /> {student.NgaySinh}</div>
                   <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold"><Phone size={12} /> {student.SDT_LinkHe}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal - PHỤC HỒI MODAL CHI TIẾT */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-5xl h-[90vh] rounded-[40px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
            <div className="p-6 border-b flex items-center justify-between shrink-0 bg-white">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-16 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden">
                    {selectedStudent.Anh ? <img src={selectedStudent.Anh} className="w-full h-full object-cover" /> : <User size={24} className="text-slate-300 mx-auto mt-4" />}
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-slate-800 uppercase leading-none mb-1">{selectedStudent.Hoten}</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mã định danh: {selectedStudent.MaHS} • Lớp: {selectedStudent.MaLopHienTai}</p>
                  </div>
               </div>
               <div className="flex items-center gap-2">
                  <button onClick={() => { setFormData(selectedStudent); setIsFormOpen(true); }} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><Edit2 size={20}/></button>
                  <button onClick={() => onDeleteStudent(selectedStudent.MaHS)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={20}/></button>
                  <button onClick={() => setSelectedStudent(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors ml-4"><X size={24}/></button>
               </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
               {/* Sidebar Tabs */}
               <div className="w-64 border-r border-slate-50 p-6 space-y-2 hidden md:block shrink-0 bg-slate-50/20">
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
                  
                  <div className="pt-6 mt-6 border-t border-slate-100">
                     <button 
                       onClick={() => handleAnalyze(selectedStudent)}
                       disabled={isAnalyzing}
                       className="w-full py-4 bg-emerald-50 text-emerald-600 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-100 transition-all border border-emerald-100 shadow-sm"
                     >
                       {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                       Phân tích AI Gemini
                     </button>
                  </div>
               </div>

               {/* Tab Content */}
               <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-white">
                  {aiResult && (
                    <div className="mb-6 p-5 bg-emerald-50 border border-emerald-100 rounded-3xl animate-in slide-in-from-top-4">
                       <h5 className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-2 flex items-center gap-2"><BrainCircuit size={16}/> Nhận xét từ AI Gemini</h5>
                       <p className="text-xs font-medium text-emerald-800 leading-relaxed italic">"{aiResult}"</p>
                    </div>
                  )}

                  {activeInfoTab === 'SYLL' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-500">
                       <InfoField label="Ngày sinh" value={selectedStudent.NgaySinh} icon={<Calendar size={14}/>} />
                       <InfoField label="Giới tính" value={selectedStudent.GioiTinh ? 'Nam' : 'Nữ'} icon={<User size={14}/>} />
                       <InfoField label="Số điện thoại" value={selectedStudent.SDT_LinkHe} icon={<Phone size={14}/>} />
                       <InfoField label="Email liên hệ" value={selectedStudent.Email} icon={<Mail size={14}/>} />
                       <InfoField label="Địa chỉ thường trú" value={selectedStudent.DiaChi} icon={<MapPin size={14}/>} colSpan={2} />
                       <InfoField label="Mật khẩu đăng nhập" value={selectedStudent.MatKhau || '123456'} icon={<Lock size={14}/>} colorClass="text-indigo-600 bg-indigo-50/50" />
                       <div className="md:col-span-1"></div>
                       <InfoField label="Họ tên Cha" value={selectedStudent.TenCha} icon={<Users size={14}/>} />
                       <InfoField label="Nghề nghiệp Cha" value={selectedStudent.NgheNghiepCha} icon={<Briefcase size={14}/>} />
                       <InfoField label="Họ tên Mẹ" value={selectedStudent.TenMe} icon={<Users size={14}/>} />
                       <InfoField label="Nghề nghiệp Mẹ" value={selectedStudent.NgheNghiepMe} icon={<Briefcase size={14}/>} />
                    </div>
                  )}

                  {activeInfoTab === 'GRADES' && (
                    <div className="space-y-6 animate-in fade-in">
                       <div className="flex p-1 bg-slate-50 border border-slate-200 rounded-xl w-fit">
                          <button onClick={() => setGradeSubTab(1)} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${gradeSubTab === 1 ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400'}`}>Học kỳ 1</button>
                          <button onClick={() => setGradeSubTab(2)} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${gradeSubTab === 2 ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400'}`}>Học kỳ 2</button>
                       </div>
                       <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                          <table className="w-full text-left">
                             <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b">
                                <tr>
                                  <th className="px-6 py-4">Môn học</th>
                                  <th className="px-4 py-4 text-center">ĐGTX</th>
                                  <th className="px-4 py-4 text-center">GK</th>
                                  <th className="px-4 py-4 text-center">CK</th>
                                  <th className="px-6 py-4 text-right text-indigo-600">Trung bình</th>
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-50">
                                {subjectsList.map(sub => {
                                   const avg = calculateSubjectAvg(selectedStudent.MaHS, sub.id, gradeSubTab);
                                   return (
                                     <tr key={sub.id} className="hover:bg-slate-50/50">
                                       <td className="px-6 py-3 text-xs font-bold text-slate-700 uppercase">{sub.name}</td>
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
                    <div className="space-y-4 animate-in fade-in">
                       {disciplines.filter(d => d.MaHS === selectedStudent.MaHS).length > 0 ? (
                         disciplines.filter(d => d.MaHS === selectedStudent.MaHS).map(d => (
                            <div key={d.MaKyLuat} className="p-5 bg-white rounded-3xl border border-slate-200 flex justify-between items-center shadow-sm">
                               <div>
                                  <p className="text-[11px] font-black text-rose-600 uppercase mb-1">{violationRules.find(r => r.MaLoi === d.MaLoi)?.TenLoi || 'Vi phạm'}</p>
                                  <p className="text-[12px] text-slate-600 italic font-medium">"{d.NoiDungChiTiet}"</p>
                                  <p className="text-[9px] text-slate-300 font-bold mt-2 uppercase">{d.NgayViPham}</p>
                               </div>
                               <span className="px-4 py-1.5 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-black uppercase border border-rose-100">{d.HinhThucXL}</span>
                            </div>
                         ))
                       ) : (
                         <div className="py-20 text-center opacity-30 text-slate-300 uppercase text-[10px] font-black flex flex-col items-center gap-4">
                            <CheckCircle size={48} />
                            Học sinh chưa có vi phạm nào.
                         </div>
                       )}
                    </div>
                  )}

                  {activeInfoTab === 'LOGS' && (
                    <div className="space-y-4 animate-in fade-in">
                        {logs.filter(l => l.MaHS === selectedStudent.MaHS).length > 0 ? (
                          logs.filter(l => l.MaHS === selectedStudent.MaHS).sort((a,b) => new Date(b.NgayGhiChep).getTime() - new Date(a.NgayGhiChep).getTime()).map(l => (
                             <div key={l.MaTheoDoi} className="p-5 bg-white rounded-3xl border border-slate-200 shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                   <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{l.NgayGhiChep}</span>
                                   <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${l.TrangThai === 'CO_MAT' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{l.TrangThai}</span>
                                </div>
                                <p className="text-[12px] text-slate-700 font-medium leading-relaxed italic">"{l.NhanXet}"</p>
                             </div>
                          ))
                        ) : (
                          <div className="py-20 text-center opacity-30 text-slate-300 uppercase text-[10px] font-black flex flex-col items-center gap-4">
                            <ClipboardList size={48} />
                            Học sinh chưa có nhật ký theo dõi.
                         </div>
                        )}
                    </div>
                  )}
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Form Thêm/Sửa HS - PHỤC HỒI FORM CŨ VÀ THÊM TRƯỜNG MẬT KHẨU */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white w-full max-w-2xl rounded-[40px] p-8 shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar">
              <div className="flex items-center justify-between mb-8">
                 <h3 className="text-base font-black text-slate-800 uppercase tracking-widest">{formData.MaHS ? 'Cập nhật SYLL' : 'Tiếp nhận học sinh mới'}</h3>
                 <button onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={24}/></button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <InputField label="Họ và tên học sinh" value={formData.Hoten} onChange={(v:any) => setFormData({...formData, Hoten: v})} placeholder="VD: Nguyễn Văn A" />
                 <InputField label="Mã học sinh (ID)" value={formData.MaHS} onChange={(v:any) => setFormData({...formData, MaHS: v})} placeholder="VD: HS001" disabled={!!formData.MaHS} />
                 <InputField label="Mật khẩu đăng nhập" value={formData.MatKhau} onChange={(v:any) => setFormData({...formData, MatKhau: v})} placeholder="Mặc định: 123456" />
                 <InputField label="Ngày sinh" value={formData.NgaySinh} onChange={(v:any) => setFormData({...formData, NgaySinh: v})} type="date" />
                 
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase px-1 tracking-widest">Giới tính</label>
                    <div className="flex p-1 bg-slate-50 border border-slate-200 rounded-2xl">
                       <button onClick={() => setFormData({...formData, GioiTinh: true})} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${formData.GioiTinh ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>Nam</button>
                       <button onClick={() => setFormData({...formData, GioiTinh: false})} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${!formData.GioiTinh ? 'bg-white text-pink-600 shadow-sm' : 'text-slate-400'}`}>Nữ</button>
                    </div>
                 </div>
                 
                 <InputField label="Số điện thoại liên hệ" value={formData.SDT_LinkHe} onChange={(v:any) => setFormData({...formData, SDT_LinkHe: v})} placeholder="VD: 090xxxxxxx" />
                 <InputField label="Địa chỉ thường trú" value={formData.DiaChi} onChange={(v:any) => setFormData({...formData, DiaChi: v})} placeholder="Số nhà, đường, phường..." colSpan={2} />
                 
                 <div className="md:col-span-2 grid grid-cols-2 gap-4 border-t pt-6 mt-2">
                    <InputField label="Họ tên Cha" value={formData.TenCha} onChange={(v:any) => setFormData({...formData, TenCha: v})} />
                    <InputField label="Nghề nghiệp Cha" value={formData.NgheNghiepCha} onChange={(v:any) => setFormData({...formData, NgheNghiepCha: v})} />
                    <InputField label="Họ tên Mẹ" value={formData.TenMe} onChange={(v:any) => setFormData({...formData, TenMe: v})} />
                    <InputField label="Nghề nghiệp Mẹ" value={formData.NgheNghiepMe} onChange={(v:any) => setFormData({...formData, NgheNghiepMe: v})} />
                 </div>
              </div>

              <div className="mt-10 flex gap-4">
                 <button onClick={() => setIsFormOpen(false)} className="flex-1 py-4 bg-slate-50 border border-slate-200 text-slate-500 rounded-3xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all">Hủy bỏ</button>
                 <button onClick={() => { onUpdateStudent({...formData as Student, MaLopHienTai: state.selectedClass, MaNienHoc: state.selectedYear}); setIsFormOpen(false); if(selectedStudent) setSelectedStudent({...formData as Student}); }} className="flex-[2] py-4 bg-indigo-600 text-white rounded-3xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-3">
                    <Save size={18} /> Lưu hồ sơ học sinh
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

// Component con để hiển thị thông tin đẹp mắt
const InfoField = ({ label, value, colSpan = 1, icon, colorClass = "bg-white" }: any) => (
  <div className={`space-y-1.5 ${colSpan === 2 ? 'md:col-span-2' : ''}`}>
    <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest px-1 flex items-center gap-1.5 opacity-70">
      {icon} {label}
    </p>
    <div className={`p-4 rounded-2xl border border-slate-100 font-bold text-slate-800 text-[12px] truncate shadow-sm group-hover:border-indigo-100 transition-all ${colorClass}`}>
      {value || '---'}
    </div>
  </div>
);

const InputField = ({ label, value, onChange, placeholder = '', type = 'text', disabled = false, colSpan = 1 }: any) => (
  <div className={`space-y-1.5 ${colSpan === 2 ? 'md:col-span-2' : ''}`}>
    <label className="text-[10px] font-black text-slate-500 uppercase px-1 tracking-widest">{label}</label>
    <input 
      type={type} 
      value={value || ''} 
      disabled={disabled}
      onChange={e => onChange(e.target.value)} 
      className={`w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-[12px] font-bold outline-none focus:bg-white focus:border-indigo-400 transition-all shadow-inner ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`} 
      placeholder={placeholder}
    />
  </div>
);

export default StudentList;
