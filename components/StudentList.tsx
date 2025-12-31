
import React, { useState, useRef } from 'react';
import { 
  Search, X, User, Users, Sparkles, Edit2, Trash2, Save, Award, TrendingUp, ShieldAlert, Image as ImageIcon, Phone, Mail, MapPin, Briefcase, Calendar, Key, BrainCircuit, CheckCircle2, MoreVertical, ChevronRight
} from 'lucide-react';
import { AppState, Student, Grade, LearningLog, Discipline } from '../types';
import { analyzeStudentPerformance, parseStudentListFromImage } from '../services/geminiService';

interface Props {
  state: AppState;
  students: Student[];
  grades: Grade[];
  logs: LearningLog[];
  disciplines: Discipline[];
  onAddStudent: (student: Student) => void;
  onAddStudents: (students: Student[]) => void;
  onUpdateStudent: (student: Student) => void;
  onDeleteStudent: (maHS: string) => void;
}

const StudentList: React.FC<Props> = ({ state, students, grades, logs, disciplines, onAddStudent, onAddStudents, onUpdateStudent, onDeleteStudent }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'ai' | 'profile'>('add');
  const [activeFormTab, setActiveFormTab] = useState<'basic' | 'family' | 'contact'>('basic');
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<Student | null>(null);
  
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiPreviewData, setAiPreviewData] = useState<Partial<Student>[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formStudent, setFormStudent] = useState<Partial<Student>>({
    MaHS: '', Hoten: '', NgaySinh: '2008-01-01', GioiTinh: true,
    DiaChi: '', TenCha: '', NgheNghiepCha: '', TenMe: '', NgheNghiepMe: '', 
    SDT_LinkHe: '', Email: '', Anh: '', GhiChuKhac: '', MatKhau: '123456'
  });

  const filteredStudents = students.filter(s => 
    s.Hoten.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.MaHS.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resetForm = () => {
    setIsModalOpen(false);
    setModalMode('add');
    setActiveFormTab('basic');
    setAiPreviewData([]);
    setSelectedStudentForProfile(null);
    setFormStudent({
      MaHS: '', Hoten: '', NgaySinh: '2008-01-01', GioiTinh: true,
      DiaChi: '', TenCha: '', NgheNghiepCha: '', TenMe: '', NgheNghiepMe: '', 
      SDT_LinkHe: '', Email: '', Anh: '', GhiChuKhac: '', MatKhau: '123456'
    });
  };

  const handleSave = () => {
    if (!formStudent.MaHS || !formStudent.Hoten) { alert("Vui lòng nhập đủ Mã HS và Họ tên!"); return; }
    const finalStudent: Student = {
      ...(formStudent as Student),
      MaLopHienTai: state.selectedClass,
      MaNienHoc: state.selectedYear,
    };
    if (modalMode === 'add') onAddStudent(finalStudent);
    else onUpdateStudent(finalStudent);
    resetForm();
  };

  const calculateSubjectAvg = (mStudent: Student, mSubject: string, semester: number) => {
    const sGrades = grades.filter(g => g.MaHS === mStudent.MaHS && g.MaMonHoc === mSubject && g.HocKy === semester);
    const dgtx = sGrades.filter(g => g.LoaiDiem.startsWith('ĐGTX')).map(g => g.DiemSo);
    const ggk = sGrades.find(g => g.LoaiDiem === 'ĐGGK')?.DiemSo;
    const gck = sGrades.find(g => g.LoaiDiem === 'ĐGCK')?.DiemSo;
    if (dgtx.length > 0 && ggk !== undefined && gck !== undefined) {
      return (dgtx.reduce((a, b) => a + b, 0) + ggk * 2 + gck * 3) / (dgtx.length + 5);
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-black text-gray-800 flex items-center gap-3"><Users className="text-indigo-600" size={24} /> Danh sách học sinh</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="text" placeholder="Tìm tên, mã số..." className="pl-10 pr-4 py-2 bg-gray-50 border rounded-xl outline-none w-56 text-sm font-medium focus:bg-white transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <button onClick={() => { setModalMode('add'); setIsModalOpen(true); }} className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-lg hover:bg-indigo-700 transition-all">Thêm mới</button>
          <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-black shadow-sm hover:bg-gray-50 transition-all flex items-center gap-2">
            <Sparkles size={14} className="text-indigo-600" /> Quét AI
          </button>
          <input type="file" ref={fileInputRef} onChange={async (e) => {
             const file = e.target.files?.[0];
             if (!file) return;
             setIsAiProcessing(true);
             const reader = new FileReader();
             reader.readAsDataURL(file);
             reader.onload = async () => {
                const base64 = (reader.result as string).split(',')[1];
                try {
                   const data = await parseStudentListFromImage(base64, file.type, state.currentRole);
                   if (data && data.length > 0) { setAiPreviewData(data); setModalMode('ai'); setIsModalOpen(true); }
                } finally { setIsAiProcessing(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
             };
          }} className="hidden" accept="image/*,application/pdf" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredStudents.map((student) => (
          <div key={student.MaHS} className="bg-white p-5 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 overflow-hidden">
                {student.Anh ? <img src={student.Anh} className="w-full h-full object-cover" /> : <User size={24} className="text-indigo-300" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{student.MaHS}</span>
                  <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${student.GioiTinh ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>
                    {student.GioiTinh ? 'Nam' : 'Nữ'}
                  </span>
                </div>
                <h3 className="text-base font-black text-gray-800 truncate mb-1">{student.Hoten}</h3>
                <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                  <Calendar size={12} /> {new Date(student.NgaySinh).toLocaleDateString('vi-VN')}
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
              <div className="flex -space-x-2">
                <div title="Số điện thoại" className="w-8 h-8 rounded-full bg-gray-50 border border-white flex items-center justify-center text-gray-400"><Phone size={14}/></div>
                <div title="Địa chỉ" className="w-8 h-8 rounded-full bg-gray-50 border border-white flex items-center justify-center text-gray-400"><MapPin size={14}/></div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => { setSelectedStudentForProfile(student); setModalMode('profile'); setIsModalOpen(true); }} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><Award size={18} /></button>
                <button onClick={() => { setIsAnalyzing(true); analyzeStudentPerformance(student, grades.filter(g => g.MaHS === student.MaHS), logs.filter(l => l.MaHS === student.MaHS)).then(res => { setAiAnalysis(res ?? null); setIsAnalyzing(false); }); }} className="p-2 text-amber-600 hover:bg-amber-50 rounded-xl transition-all"><BrainCircuit size={18} /></button>
                <button onClick={() => { setFormStudent(student); setModalMode('edit'); setIsModalOpen(true); }} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"><Edit2 size={18}/></button>
                <button onClick={() => onDeleteStudent(student.MaHS)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={18}/></button>
              </div>
            </div>
          </div>
        ))}
        {filteredStudents.length === 0 && (
          <div className="col-span-full py-20 text-center text-gray-400 italic bg-white rounded-[40px] border border-dashed border-gray-200">
            Không tìm thấy học sinh nào trong danh sách.
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in">
          <div className="bg-white w-full max-w-5xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="px-8 py-5 border-b flex items-center justify-between bg-white shrink-0">
               <h3 className="font-black text-xl text-gray-800">
                 {modalMode === 'ai' ? 'Trích xuất từ AI' : modalMode === 'profile' ? 'Hồ sơ học tập' : modalMode === 'edit' ? 'Sửa thông tin' : 'Thêm học sinh'}
               </h3>
               <button onClick={resetForm} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={24}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
               {modalMode === 'profile' && selectedStudentForProfile ? (
                 <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       <div className="bg-indigo-50 p-6 rounded-[32px] border border-indigo-100">
                          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Điểm trung bình</p>
                          <h4 className="text-3xl font-black text-indigo-900">8.2</h4>
                       </div>
                       <div className="bg-emerald-50 p-6 rounded-[32px] border border-emerald-100">
                          <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">Hạnh kiểm</p>
                          <h4 className="text-3xl font-black text-emerald-900">Tốt</h4>
                       </div>
                       <div className="bg-rose-50 p-6 rounded-[32px] border border-rose-100">
                          <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-2">Vi phạm</p>
                          <h4 className="text-3xl font-black text-rose-900">{disciplines.filter(d => d.MaHS === selectedStudentForProfile.MaHS).length}</h4>
                       </div>
                    </div>
                    <div className="bg-white rounded-[32px] border border-gray-200 overflow-hidden shadow-sm">
                       <table className="w-full text-left">
                          <thead>
                             <tr className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-200">
                               <th className="px-8 py-4">Môn học</th>
                               <th className="px-6 py-4 text-center">Học kỳ 1</th>
                               <th className="px-6 py-4 text-center">Học kỳ 2</th>
                               <th className="px-8 py-4 text-right bg-indigo-50/50 text-indigo-600 font-black">Cả năm</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                             {subjectsList.map(sub => {
                                const tb1 = calculateSubjectAvg(selectedStudentForProfile, sub.id, 1);
                                const tb2 = calculateSubjectAvg(selectedStudentForProfile, sub.id, 2);
                                return (
                                  <tr key={sub.id}>
                                    <td className="px-8 py-3 font-bold text-gray-800">{sub.name}</td>
                                    <td className="px-6 py-3 text-center text-gray-500">{tb1?.toFixed(1) || '--'}</td>
                                    <td className="px-6 py-3 text-center text-gray-500">{tb2?.toFixed(1) || '--'}</td>
                                    <td className="px-8 py-3 text-right font-black text-indigo-600">{(tb1 && tb2) ? ((tb1 + tb2 * 2) / 3).toFixed(1) : '--'}</td>
                                  </tr>
                                );
                             })}
                          </tbody>
                       </table>
                    </div>
                 </div>
               ) : modalMode === 'ai' ? (
                  <div className="space-y-4">
                     <p className="text-sm font-bold text-indigo-600">AI đã tìm thấy {aiPreviewData.length} học sinh. Vui lòng kiểm tra lại trước khi nhập.</p>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {aiPreviewData.map((s, i) => (
                           <div key={i} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex justify-between items-center">
                              <div><p className="font-black text-gray-800">{s.Hoten}</p><p className="text-[10px] text-gray-400">{s.MaHS}</p></div>
                              <CheckCircle2 className="text-emerald-500" size={20}/>
                           </div>
                        ))}
                     </div>
                  </div>
               ) : (
                 <div className="space-y-6">
                    <div className="flex gap-2 p-1 bg-gray-50 rounded-2xl border border-gray-100">
                       <button onClick={() => setActiveFormTab('basic')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${activeFormTab === 'basic' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}>1. Cơ bản</button>
                       <button onClick={() => setActiveFormTab('family')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${activeFormTab === 'family' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}>2. Gia đình</button>
                       <button onClick={() => setActiveFormTab('contact')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${activeFormTab === 'contact' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}>3. Liên hệ</button>
                    </div>
                    {activeFormTab === 'basic' && (
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-left-4">
                          <Field label="Mã HS" value={formStudent.MaHS} onChange={v => setFormStudent({...formStudent, MaHS: v})} />
                          <Field label="Họ tên" value={formStudent.Hoten} onChange={v => setFormStudent({...formStudent, Hoten: v})} />
                          <Field label="Ngày sinh" type="date" value={formStudent.NgaySinh} onChange={v => setFormStudent({...formStudent, NgaySinh: v})} />
                          <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase">Giới tính</label><select className="w-full p-4 bg-gray-50 border rounded-2xl font-bold" value={formStudent.GioiTinh ? 'true' : 'false'} onChange={e => setFormStudent({...formStudent, GioiTinh: e.target.value === 'true'})}><option value="true">Nam</option><option value="false">Nữ</option></select></div>
                       </div>
                    )}
                    {activeFormTab === 'family' && (
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-left-4">
                          <Field label="Họ tên Cha" value={formStudent.TenCha} onChange={v => setFormStudent({...formStudent, TenCha: v})} />
                          <Field label="Họ tên Mẹ" value={formStudent.TenMe} onChange={v => setFormStudent({...formStudent, TenMe: v})} />
                       </div>
                    )}
                    {activeFormTab === 'contact' && (
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-left-4">
                          <Field label="Điện thoại" value={formStudent.SDT_LinkHe} onChange={v => setFormStudent({...formStudent, SDT_LinkHe: v})} />
                          <Field label="Email" type="email" value={formStudent.Email} onChange={v => setFormStudent({...formStudent, Email: v})} />
                          <div className="col-span-full"><Field label="Địa chỉ" value={formStudent.DiaChi} onChange={v => setFormStudent({...formStudent, DiaChi: v})} /></div>
                       </div>
                    )}
                 </div>
               )}
            </div>
            <div className="px-8 py-5 bg-gray-50 border-t flex justify-end gap-3 shrink-0">
               <button onClick={resetForm} className="px-6 py-3 bg-white border border-gray-200 text-gray-500 rounded-2xl font-black text-xs uppercase">Đóng</button>
               {modalMode === 'ai' ? (
                  <button onClick={() => { onAddStudents(aiPreviewData as Student[]); resetForm(); }} className="px-10 py-3 bg-indigo-600 text-white rounded-2xl font-black shadow-lg text-xs uppercase">Nhập tất cả</button>
               ) : (modalMode !== 'profile' && (
                  <button onClick={handleSave} className="px-10 py-3 bg-indigo-600 text-white rounded-2xl font-black shadow-lg text-xs uppercase flex items-center gap-2"><Save size={16}/> Lưu hồ sơ</button>
               ))}
            </div>
          </div>
        </div>
      )}

      {isAnalyzing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm">
           <div className="bg-white p-10 rounded-[40px] shadow-2xl flex flex-col items-center border border-indigo-100">
              <div className="h-16 w-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
              <p className="font-black text-gray-800">AI đang phân tích...</p>
           </div>
        </div>
      )}

      {aiAnalysis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in">
          <div className="bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 bg-indigo-600 text-white flex items-center justify-between"><div className="flex items-center gap-3"><BrainCircuit size={20}/><h3 className="font-black text-lg">Phân tích chuyên sâu</h3></div><button onClick={() => setAiAnalysis(null)} className="p-2 hover:bg-white/10 rounded-full"><X size={20}/></button></div>
            <div className="p-8 overflow-y-auto italic text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{aiAnalysis}</div>
            <div className="p-6 bg-gray-50 border-t flex justify-end"><button onClick={() => setAiAnalysis(null)} className="px-8 py-3 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase">Đóng</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

const subjectsList = [
  { id: 'TOAN', name: 'Toán Học' },
  { id: 'VAN', name: 'Ngữ Văn' },
  { id: 'ANH', name: 'Tiếng Anh' },
  { id: 'LY', name: 'Vật Lý' },
  { id: 'HOA', name: 'Hóa Học' },
  { id: 'SINH', name: 'Sinh Học' },
];

const Field = ({ label, value, onChange, type = "text" }: { label: string, value: any, onChange: (v: string) => void, type?: string }) => (
  <div className="space-y-1">
    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{label}</label>
    <input 
      type={type} 
      value={value || ''} 
      onChange={e => onChange(e.target.value)} 
      className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl font-bold outline-none focus:bg-white focus:border-indigo-100 transition-all text-sm" 
    />
  </div>
);

export default StudentList;
