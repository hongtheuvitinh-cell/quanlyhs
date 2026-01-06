
import React, { useState, useMemo } from 'react';
import { 
  Search, User, Users, Calendar, Phone, Trash2, Plus, Sparkles, X, Save, 
  Edit2, MapPin, Mail, Info, Loader2, ChevronRight, FileSpreadsheet, 
  AlertTriangle, MessageSquare, Camera, Download, UserPlus, GraduationCap,
  CheckCircle, Image as ImageIcon, FileText, BrainCircuit, FileUp, Link as LinkIcon, Lock
} from 'lucide-react';
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
  const [gradeSubTab, setGradeSubTab] = useState<1 | 2 | 'CN'>(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Student>>({
    Hoten: '', MaHS: '', NgaySinh: '', GioiTinh: true, SDT_LinkHe: '', DiaChi: '', 
    TenCha: '', NgheNghiepCha: '', TenMe: '', NgheNghiepMe: '', Email: '', GhiChuKhac: '', Anh: '', MatKhau: '123456'
  });

  const sortedStudents = useMemo(() => {
    return students
      .filter(s => {
        const isCorrectClass = s.MaLopHienTai?.trim() === state.selectedClass?.trim();
        const matchesSearch = s.Hoten.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             s.MaHS.toLowerCase().includes(searchTerm.toLowerCase());
        return isCorrectClass && matchesSearch;
      })
      .sort((a, b) => a.MaHS.localeCompare(b.MaHS, undefined, { numeric: true, sensitivity: 'base' }));
  }, [students, searchTerm, state.selectedClass]);

  const getSpecificGrade = (maHS: string, maMon: string, semester: number, type: string) => {
    const g = grades.find(g => g.MaHS === maHS && g.MaMonHoc === maMon && g.HocKy === semester && g.MaNienHoc === state.selectedYear && g.LoaiDiem === type);
    return g ? g.DiemSo : null;
  };

  const calculateSubjectAvg = (maHS: string, maMon: string, semester: number | 'CN') => {
    if (semester === 'CN') {
      const hk1 = calculateSubjectAvg(maHS, maMon, 1);
      const hk2 = calculateSubjectAvg(maHS, maMon, 2);
      return (hk1 !== null && hk2 !== null) ? (hk1 + hk2 * 2) / 3 : null;
    }

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

  const handleSaveStudent = () => {
    if (!formData.Hoten || !formData.MaHS) { alert("Thiếu mã hoặc tên!"); return; }
    onUpdateStudent({
      ...formData as Student,
      MaHS: formData.MaHS!.trim(),
      MaLopHienTai: state.selectedClass,
      MaNienHoc: state.selectedYear,
      MatKhau: formData.MatKhau || '123456'
    });
    setIsFormOpen(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData(prev => ({ ...prev, Anh: reader.result as string }));
      reader.readAsDataURL(file);
    }
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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-[32px] border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-100"><Users size={24} /></div>
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Học sinh lớp {state.selectedClass}</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{sortedStudents.length} thành viên đã được tải</p>
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
          
          <label className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-600 rounded-xl cursor-pointer hover:bg-emerald-100 transition-all border border-emerald-100 text-[10px] font-black uppercase tracking-widest">
             <FileUp size={16} /> Nhập CSV
             <input type="file" className="hidden" accept=".csv" onChange={() => {}} />
          </label>
          
          <button onClick={() => { setFormData({}); setIsFormOpen(true); }} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 transition-all text-[10px] font-black uppercase tracking-widest">
            <Plus size={18}/> Thêm HS
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {sortedStudents.map((student, sIdx) => {
          const sGrades = grades.filter(g => g.MaHS === student.MaHS && g.MaNienHoc === state.selectedYear);
          const avg = sGrades.length > 0 ? (sGrades.reduce((sum, g) => sum + g.DiemSo, 0) / sGrades.length).toFixed(1) : '--';
          return (
            <div 
              key={student.MaHS} 
              onClick={() => { setSelectedStudent(student); setActiveInfoTab('SYLL'); setAiResult(null); }}
              className="bg-white p-5 rounded-[32px] border border-slate-200 shadow-sm hover:border-indigo-400 hover:shadow-xl transition-all group cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div className="h-16 w-12 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200 overflow-hidden shadow-inner">
                  {student.Anh ? <img src={student.Anh} className="w-full h-full object-cover" /> : <User size={24} className="text-slate-200" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{sIdx + 1}. {student.MaHS}</span>
                    <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase ${student.GioiTinh ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>
                      {student.GioiTinh ? 'Nam' : 'Nữ'}
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-slate-800 truncate group-hover:text-indigo-600 uppercase leading-tight">{student.Hoten}</h3>
                  <div className="flex flex-col gap-1 mt-2">
                     <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold"><Calendar size={12} /> {student.NgaySinh}</div>
                     <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold"><Phone size={12} /> {student.SDT_LinkHe}</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const InfoField = ({ label, value, colSpan = 1, icon }: any) => (
  <div className={`space-y-1 ${colSpan === 2 ? 'md:col-span-2' : ''}`}>
    <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest px-1 flex items-center gap-1">
      {icon} {label}
    </p>
    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 font-bold text-slate-700 text-[11px] truncate">
      {value || '---'}
    </div>
  </div>
);

const InputField = ({ label, value, onChange, placeholder = '', type = 'text', colSpan = 1, required = false }: any) => (
  <div className={`space-y-1.5 ${colSpan === 2 ? 'md:col-span-2' : ''}`}>
    <label className="text-[10px] font-bold text-slate-500 uppercase px-1 tracking-widest">
      {label} {required && <span className="text-rose-500">*</span>}
    </label>
    <input 
      type={type} 
      value={value || ''} 
      onChange={e => onChange(e.target.value)} 
      className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-[12px] font-bold outline-none focus:border-indigo-400 transition-all" 
      placeholder={placeholder}
    />
  </div>
);

export default StudentList;
