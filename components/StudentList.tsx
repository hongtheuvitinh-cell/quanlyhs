
import React, { useState, useMemo } from 'react';
import { 
  Search, User, Users, Calendar, Phone, Trash2, Plus, Sparkles, X, Save, 
  Edit2, MapPin, Mail, Info, Loader2, ChevronRight, FileSpreadsheet, 
  AlertTriangle, MessageSquare, Camera, Download, UserPlus, GraduationCap,
  CheckCircle, Image as ImageIcon, FileText, BrainCircuit, FileUp, Link as LinkIcon
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
    TenCha: '', NgheNghiepCha: '', TenMe: '', NgheNghiepMe: '', Email: '', GhiChuKhac: '', Anh: ''
  });

  const filteredStudents = (students || []).filter(s => 
    s.Hoten.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.MaHS.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim() !== '');
      
      // Bỏ qua dòng header, bắt đầu từ i=1
      let count = 0;
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        if (cols.length >= 2 && cols[0] && cols[1]) {
          const student: Student = {
            MaHS: cols[0],
            Hoten: cols[1],
            NgaySinh: cols[2] || '',
            GioiTinh: cols[3] === '1' || cols[3]?.toLowerCase() === 'nam' || cols[3]?.toLowerCase() === 'true',
            SDT_LinkHe: cols[4] || '',
            Email: cols[5] || '',
            DiaChi: cols[6] || '',
            TenCha: cols[7] || '',
            NgheNghiepCha: cols[8] || '',
            TenMe: cols[9] || '',
            NgheNghiepMe: cols[10] || '',
            GhiChuKhac: cols[11] || '',
            MaLopHienTai: state.selectedClass,
            MaNienHoc: state.selectedYear,
            MatKhau: '123456'
          };
          onUpdateStudent(student);
          count++;
        }
      }
      alert(`Đã nhập thành công ${count} học sinh từ file CSV!`);
      e.target.value = ''; // Reset input file
    };
    reader.readAsText(file, 'UTF-8');
  };

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
    if (!formData.Hoten || !formData.MaHS) { alert("Vui lòng nhập đầy đủ Mã HS và Họ tên!"); return; }
    onUpdateStudent({
      ...formData as Student,
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
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, Anh: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
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
          const first = result[0];
          setFormData({ ...formData, ...first });
          setIsFormOpen(true);
          alert(`Đã nhận diện thành công học sinh: ${first.Hoten}`);
        } else {
          alert("AI không tìm thấy thông tin học sinh trong ảnh này.");
        }
      };
      reader.onerror = () => {
        alert("Lỗi đọc file ảnh.");
        setIsAiLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      alert("AI không thể phân tích dữ liệu từ file này.");
    } finally {
      setTimeout(() => setIsAiLoading(false), 2000);
    }
  };

  const downloadTemplate = () => {
    const BOM = "\uFEFF";
    // Header được thiết kế y hệt giao diện form nhập tay:
    // 1. Định danh (MaHS, Hoten)
    // 2. Cá nhân (NgaySinh, GioiTinh)
    // 3. Liên lạc (SDT, Email, DiaChi)
    // 4. Gia đình (Cha, NgheCha, Me, NgheMe)
    // 5. Khác (GhiChu)
    const headers = "Mã Học Sinh (MaHS),Họ và Tên (Hoten),Ngày sinh (YYYY-MM-DD),Giới tính (1:Nam / 0:Nữ),Số điện thoại (SDT),Email,Địa chỉ liên hệ,Họ tên Cha,Nghề nghiệp Cha,Họ tên Mẹ,Nghề nghiệp Mẹ,Ghi chú đặc biệt\n";
    const example = "HS001,Nguyễn Văn Mẫu,2008-01-01,1,0901234567,mau.nguyen@gmail.com,123 Đường ABC Quận 1,Nguyễn Văn A,Kỹ sư,Trần Thị B,Kinh doanh,Học sinh giỏi cấp trường\n";
    
    const blob = new Blob([BOM + headers + example], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Mau_Ho_So_Hoc_Sinh_${state.selectedClass}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportStudentReport = (student: Student, type: 1 | 2 | 'CN') => {
    const BOM = "\uFEFF";
    const typeName = type === 'CN' ? 'Cả năm' : `Học kỳ ${type}`;
    let csvContent = `BÁO CÁO HỌC TẬP (${typeName}) - ${student.Hoten} (${student.MaHS})\n`;
    if (type !== 'CN') {
      csvContent += "Môn học,TX1,TX2,TX3,TX4,TX5,GK,CK,TB\n";
      subjectsList.forEach(sub => {
        const tx1 = getSpecificGrade(student.MaHS, sub.id, type as number, 'ĐGTX1');
        const tx2 = getSpecificGrade(student.MaHS, sub.id, type as number, 'ĐGTX2');
        const tx3 = getSpecificGrade(student.MaHS, sub.id, type as number, 'ĐGTX3');
        const tx4 = getSpecificGrade(student.MaHS, sub.id, type as number, 'ĐGTX4');
        const tx5 = getSpecificGrade(student.MaHS, sub.id, type as number, 'ĐGTX5');
        const gk = getSpecificGrade(student.MaHS, sub.id, type as number, 'ĐGGK');
        const ck = getSpecificGrade(student.MaHS, sub.id, type as number, 'ĐGCK');
        const tb = calculateSubjectAvg(student.MaHS, sub.id, type);
        csvContent += `${sub.name},${tx1 || ''},${tx2 || ''},${tx3 || ''},${tx4 || ''},${tx5 || ''},${gk || ''},${ck || ''},${tb?.toFixed(1) || ''}\n`;
      });
    } else {
      csvContent += "Môn học,HK1,HK2,Cả năm\n";
      subjectsList.forEach(sub => {
        const hk1 = calculateSubjectAvg(student.MaHS, sub.id, 1);
        const hk2 = calculateSubjectAvg(student.MaHS, sub.id, 2);
        const cn = calculateSubjectAvg(student.MaHS, sub.id, 'CN');
        csvContent += `${sub.name},${hk1?.toFixed(1) || ''},${hk2?.toFixed(1) || ''},${cn?.toFixed(1) || ''}\n`;
      });
    }
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `KetQua_${typeName}_${student.MaHS}.csv`;
    link.click();
    URL.revokeObjectURL(url);
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
      {/* Loading Overlay cho Quét AI */}
      {isAiLoading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-md animate-in fade-in">
           <div className="bg-white p-8 rounded-[40px] shadow-2xl flex flex-col items-center gap-4 border border-indigo-100">
              <div className="relative">
                 <div className="w-16 h-16 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin"></div>
                 <BrainCircuit className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600" size={24} />
              </div>
              <div className="text-center">
                 <p className="text-[11px] font-black text-slate-800 uppercase tracking-widest">AI đang phân tích dữ liệu...</p>
                 <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Vui lòng đợi trong giây lát</p>
              </div>
           </div>
        </div>
      )}

      {/* HEADER CONTROLS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-100"><Users size={22} /></div>
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Học sinh & SYLL</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Lớp {state.selectedClass} • {students.length} thành viên</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={14} />
            <input 
              type="text" 
              placeholder="Tìm tên hoặc mã..." 
              className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none w-full sm:w-48 text-xs focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
          
          <button onClick={downloadTemplate} className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-[10px] font-bold uppercase border border-slate-200 hover:bg-slate-100 transition-all">
            <Download size={14}/> Mẫu HS
          </button>
          
          <label className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl cursor-pointer hover:bg-emerald-100 transition-all border border-emerald-100 text-[10px] font-bold uppercase tracking-widest" title="Nhập danh sách học sinh nhanh từ file CSV">
             <FileUp size={16} />
             Nhập CSV
             <input type="file" className="hidden" accept=".csv" onChange={handleCsvImport} />
          </label>

          <label className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl cursor-pointer hover:bg-indigo-100 transition-all border border-indigo-100 text-[10px] font-bold uppercase tracking-widest" title="AI quét danh sách từ ảnh/PDF">
             <Camera size={16} />
             Quét AI
             <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleAiImport} />
          </label>
          
          <button onClick={() => { setFormData({}); setIsFormOpen(true); }} className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all text-[10px] font-bold uppercase tracking-widest active:scale-95">
            <Plus size={18}/> Thêm HS
          </button>
        </div>
      </div>

      {/* STUDENT GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredStudents.map((student) => {
          const sGrades = grades.filter(g => g.MaHS === student.MaHS && g.MaNienHoc === state.selectedYear);
          const avg = sGrades.length > 0 ? (sGrades.reduce((sum, g) => sum + g.DiemSo, 0) / sGrades.length).toFixed(1) : '--';
          return (
            <div 
              key={student.MaHS} 
              onClick={() => { setSelectedStudent(student); setActiveInfoTab('SYLL'); setAiResult(null); setGradeSubTab(1); }}
              className="bg-white p-5 rounded-[32px] border border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-50/50 transition-all group cursor-pointer relative overflow-hidden"
            >
              <div className="flex items-start gap-4">
                <div className="h-16 w-12 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100 overflow-hidden shadow-inner group-hover:scale-105 transition-transform">
                  {student.Anh ? <img src={student.Anh} className="w-full h-full object-cover" /> : <User size={24} className="text-slate-200" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">{student.MaHS}</span>
                    <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase ${student.GioiTinh ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>
                      {student.GioiTinh ? 'Nam' : 'Nữ'}
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-slate-800 truncate group-hover:text-indigo-600 transition-colors uppercase leading-tight">{student.Hoten}</h3>
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
                   <button onClick={(e) => { e.stopPropagation(); setFormData(student); setIsFormOpen(true); }} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl" title="Sửa học sinh"><Edit2 size={16}/></button>
                   <button onClick={(e) => { e.stopPropagation(); if(confirm("Xóa vĩnh viễn học sinh này và toàn bộ dữ liệu liên quan?")) onDeleteStudent(student.MaHS); }} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl" title="Xóa học sinh"><Trash2 size={16}/></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* HỒ SƠ CHI TIẾT 4 TAB */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-6xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[92vh]">
             {/* Header Modal */}
             <div className="p-4 border-b flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-4">
                   <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg"><Info size={20} /></div>
                   <div>
                     <h3 className="font-black text-slate-800 text-sm uppercase tracking-tight">Hồ sơ điện tử học sinh</h3>
                     <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{selectedStudent.Hoten} • ID: {selectedStudent.MaHS}</p>
                   </div>
                </div>
                <div className="flex items-center gap-2">
                   <button onClick={() => setSelectedStudent(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} className="text-slate-400"/></button>
                </div>
             </div>

             {/* Tab Bar Chính */}
             <div className="flex border-b bg-slate-50/50 p-1.5 gap-1.5 shrink-0">
                <button onClick={() => setActiveInfoTab('SYLL')} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeInfoTab === 'SYLL' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'text-slate-400 hover:bg-white hover:text-slate-600'}`}>
                  <User size={15}/> Sơ yếu lý lịch
                </button>
                <button onClick={() => setActiveInfoTab('GRADES')} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeInfoTab === 'GRADES' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'text-slate-400 hover:bg-white hover:text-slate-600'}`}>
                  <GraduationCap size={15}/> Kết quả học tập
                </button>
                <button onClick={() => setActiveInfoTab('DISCIPLINE')} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeInfoTab === 'DISCIPLINE' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'text-slate-400 hover:bg-white hover:text-slate-600'}`}>
                  <AlertTriangle size={15}/> Kỷ luật
                </button>
                <button onClick={() => setActiveInfoTab('LOGS')} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeInfoTab === 'LOGS' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'text-slate-400 hover:bg-white hover:text-slate-600'}`}>
                  <MessageSquare size={15}/> Nhật ký
                </button>
             </div>
             
             {/* Content Area */}
             <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-white min-h-[500px]">
                {activeInfoTab === 'SYLL' && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-left-4">
                     <div className="lg:col-span-3 space-y-4">
                        <div className="aspect-[2/3] w-24 mx-auto bg-slate-50 rounded-2xl border border-slate-200 p-1 shadow-sm overflow-hidden flex items-center justify-center shrink-0">
                           {selectedStudent.Anh ? (
                             <img src={selectedStudent.Anh} className="w-full h-full object-cover rounded-xl" />
                           ) : (
                             <div className="text-center opacity-30">
                                <User size={32} className="mx-auto" />
                                <p className="text-[8px] font-bold uppercase mt-1">2x3</p>
                             </div>
                           )}
                        </div>
                        <div className="bg-indigo-50 p-4 rounded-[28px] border border-indigo-100">
                           <h4 className="text-[9px] font-black uppercase tracking-widest text-indigo-400 mb-2">AI Phân tích</h4>
                           <button 
                             onClick={() => handleAnalyze(selectedStudent)}
                             disabled={isAnalyzing}
                             className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center justify-center gap-2 text-[9px] font-black uppercase transition-all"
                           >
                              {isAnalyzing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                              Đánh giá HS
                           </button>
                           {aiResult && <div className="mt-3 p-3 bg-white rounded-xl text-[10px] leading-relaxed border border-indigo-100 italic animate-in fade-in">"{aiResult}"</div>}
                        </div>
                     </div>

                     <div className="lg:col-span-9 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                           <InfoField label="Ngày sinh" value={selectedStudent.NgaySinh} />
                           <InfoField label="Giới tính" value={selectedStudent.GioiTinh ? 'Nam' : 'Nữ'} />
                           <InfoField label="Điện thoại" value={selectedStudent.SDT_LinkHe} />
                           <InfoField label="Email" value={selectedStudent.Email} />
                           <InfoField label="Địa chỉ" value={selectedStudent.DiaChi} colSpan={2} />
                        </div>
                        <div className="h-px bg-slate-50"></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="bg-slate-50/50 p-4 rounded-3xl border border-slate-100">
                              <p className="text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">Phụ huynh (Cha)</p>
                              <h6 className="text-xs font-black text-slate-800 uppercase">{selectedStudent.TenCha || '---'}</h6>
                              <p className="text-[10px] text-slate-500 font-medium mt-0.5 italic">{selectedStudent.NgheNghiepCha}</p>
                           </div>
                           <div className="bg-slate-50/50 p-4 rounded-3xl border border-slate-100">
                              <p className="text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">Phụ huynh (Mẹ)</p>
                              <h6 className="text-xs font-black text-slate-800 uppercase">{selectedStudent.TenMe || '---'}</h6>
                              <p className="text-[10px] text-slate-500 font-medium mt-0.5 italic">{selectedStudent.NgheNghiepMe}</p>
                           </div>
                        </div>
                        <div className="p-5 bg-slate-900 rounded-[28px] text-white/90 italic text-[11px] leading-relaxed">
                           <span className="text-indigo-400 font-black uppercase text-[9px] not-italic block mb-1">Ghi chú từ GVCN:</span>
                           "{selectedStudent.GhiChuKhac || 'Chưa có ghi chú đặc biệt.'}"
                        </div>
                     </div>
                  </div>
                )}

                {activeInfoTab === 'GRADES' && (
                  <div className="space-y-6 animate-in slide-in-from-right-4">
                     <div className="flex items-center justify-between bg-slate-50 p-1 rounded-2xl border border-slate-100">
                        <div className="flex gap-1">
                           {[1, 2, 'CN'].map(tab => (
                             <button 
                               key={tab} 
                               onClick={() => setGradeSubTab(tab as any)}
                               className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${gradeSubTab === tab ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                             >
                               {tab === 'CN' ? 'Cả năm' : `Học kỳ ${tab}`}
                             </button>
                           ))}
                        </div>
                        <button 
                           onClick={() => exportStudentReport(selectedStudent, gradeSubTab)} 
                           className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md hover:bg-emerald-700 transition-all active:scale-95"
                        >
                           <FileSpreadsheet size={14}/> Xuất {gradeSubTab === 'CN' ? 'Cả năm' : `HK${gradeSubTab}`}
                        </button>
                     </div>

                     <div className="overflow-hidden border border-slate-100 rounded-[32px] shadow-sm bg-white">
                        <table className="w-full text-left">
                           <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                              <tr>
                                <th className="px-6 py-4">Môn học</th>
                                {gradeSubTab === 'CN' ? (
                                  <>
                                    <th className="px-4 py-4 text-center">Học kỳ 1</th>
                                    <th className="px-4 py-4 text-center">Học kỳ 2</th>
                                  </>
                                ) : (
                                  <>
                                    <th className="px-2 py-4 text-center">TX1</th>
                                    <th className="px-2 py-4 text-center">TX2</th>
                                    <th className="px-2 py-4 text-center">TX3</th>
                                    <th className="px-2 py-4 text-center">TX4</th>
                                    <th className="px-2 py-4 text-center">TX5</th>
                                    <th className="px-3 py-4 text-center bg-slate-100/50">KTGK</th>
                                    <th className="px-3 py-4 text-center bg-slate-100/50">KTCK</th>
                                  </>
                                )}
                                <th className="px-6 py-4 text-right text-indigo-600">TB</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-50">
                              {subjectsList.map(sub => {
                                 const tb = calculateSubjectAvg(selectedStudent.MaHS, sub.id, gradeSubTab);
                                 return (
                                   <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                                      <td className="px-6 py-4 font-bold text-slate-800 text-xs">{sub.name}</td>
                                      {gradeSubTab === 'CN' ? (
                                        <>
                                          <td className="px-4 py-4 text-center text-slate-500 font-bold">{calculateSubjectAvg(selectedStudent.MaHS, sub.id, 1)?.toFixed(1) || '--'}</td>
                                          <td className="px-4 py-4 text-center text-slate-500 font-bold">{calculateSubjectAvg(selectedStudent.MaHS, sub.id, 2)?.toFixed(1) || '--'}</td>
                                        </>
                                      ) : (
                                        <>
                                          <td className="px-2 py-4 text-center text-[11px]">{getSpecificGrade(selectedStudent.MaHS, sub.id, gradeSubTab as number, 'ĐGTX1') || '-'}</td>
                                          <td className="px-2 py-4 text-center text-[11px]">{getSpecificGrade(selectedStudent.MaHS, sub.id, gradeSubTab as number, 'ĐGTX2') || '-'}</td>
                                          <td className="px-2 py-4 text-center text-[11px]">{getSpecificGrade(selectedStudent.MaHS, sub.id, gradeSubTab as number, 'ĐGTX3') || '-'}</td>
                                          <td className="px-2 py-4 text-center text-[11px]">{getSpecificGrade(selectedStudent.MaHS, sub.id, gradeSubTab as number, 'ĐGTX4') || '-'}</td>
                                          <td className="px-2 py-4 text-center text-[11px]">{getSpecificGrade(selectedStudent.MaHS, sub.id, gradeSubTab as number, 'ĐGTX5') || '-'}</td>
                                          <td className="px-3 py-4 text-center bg-slate-100/30 font-bold">{getSpecificGrade(selectedStudent.MaHS, sub.id, gradeSubTab as number, 'ĐGGK') || '-'}</td>
                                          <td className="px-3 py-4 text-center bg-slate-100/30 font-bold">{getSpecificGrade(selectedStudent.MaHS, sub.id, gradeSubTab as number, 'ĐGCK') || '-'}</td>
                                        </>
                                      )}
                                      <td className="px-6 py-4 text-right font-black text-indigo-600 bg-indigo-50/20">{tb?.toFixed(1) || '--'}</td>
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
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {disciplines.filter(d => d.MaHS === selectedStudent.MaHS).length > 0 ? disciplines.filter(d => d.MaHS === selectedStudent.MaHS).map(d => {
                           const rule = violationRules.find(r => r.MaLoi === d.MaLoi);
                           return (
                             <div key={d.MaKyLuat} className="p-4 bg-rose-50/50 border border-rose-100 rounded-3xl flex items-start gap-4">
                                <div className="p-2 bg-rose-600 text-white rounded-xl"><AlertTriangle size={18}/></div>
                                <div className="flex-1">
                                   <div className="flex items-center gap-3 mb-1">
                                      <span className="text-[10px] font-black text-rose-600 uppercase tracking-tight">{rule?.TenLoi || 'Vi phạm'}</span>
                                      <span className="text-[9px] font-bold text-slate-400">{d.NgayViPham}</span>
                                   </div>
                                   <p className="text-[10px] text-slate-600 font-medium italic">"{d.NoiDungChiTiet}"</p>
                                   <div className="mt-2 flex items-center gap-2">
                                      <span className="px-2 py-0.5 bg-rose-600 text-white rounded-[6px] text-[8px] font-black uppercase shadow-sm">{d.HinhThucXL}</span>
                                   </div>
                                </div>
                             </div>
                           );
                        }) : (
                          <div className="col-2 py-16 text-center bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-100">
                             <CheckCircle size={32} className="text-emerald-200 mx-auto mb-2" />
                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Học sinh chưa có vi phạm</p>
                          </div>
                        )}
                     </div>
                  </div>
                )}

                {activeInfoTab === 'LOGS' && (
                  <div className="space-y-3 animate-in slide-in-from-top-4">
                     {logs.filter(l => l.MaHS === selectedStudent.MaHS).length > 0 ? logs.filter(l => l.MaHS === selectedStudent.MaHS).map(l => (
                        <div key={l.MaTheoDoi} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-start gap-4 hover:border-indigo-200 transition-all">
                           <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><MessageSquare size={16}/></div>
                           <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                 <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Tiết ngày {l.NgayGhiChep}</span>
                                 <span className="px-2 py-0.5 bg-slate-900 text-white rounded-[6px] text-[8px] font-black uppercase">{l.TrangThai}</span>
                              </div>
                              <p className="text-[11px] text-slate-700 font-medium italic">"{l.NhanXet}"</p>
                           </div>
                        </div>
                     )) : (
                       <div className="py-16 text-center bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-100">
                          <MessageSquare size={32} className="text-slate-200 mx-auto mb-2" />
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Chưa có nhật ký theo dõi</p>
                       </div>
                     )}
                  </div>
                )}
             </div>
             
             {/* Footer Modal */}
             <div className="p-4 bg-slate-50 border-t flex justify-end gap-3 shrink-0">
                <button onClick={() => setSelectedStudent(null)} className="px-8 py-2.5 bg-white border border-slate-200 text-slate-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all">Đóng</button>
                <button onClick={() => { setFormData(selectedStudent); setIsFormOpen(true); }} className="px-10 py-2.5 bg-indigo-600 text-white rounded-xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-2 text-[10px] uppercase tracking-widest"><Edit2 size={16}/> Sửa thông tin</button>
             </div>
          </div>
        </div>
      )}

      {/* MODAL THÊM / SỬA HỌC SINH */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[92vh]">
            <div className="p-6 border-b flex items-center justify-between bg-white shrink-0">
               <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-600 rounded-2xl text-white shadow-lg"><UserPlus size={22} /></div>
                  <h3 className="font-black text-sm text-slate-800 uppercase tracking-tight">{formData.MaHS ? 'Cập nhật Sơ yếu lý lịch' : 'Thêm hồ sơ học sinh mới'}</h3>
               </div>
               <button onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={24}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/20 space-y-8">
               <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                  <div className="lg:col-span-3">
                    <div className="space-y-4">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Ảnh hồ sơ (2x3)</label>
                       <div className="relative aspect-[2/3] w-full bg-white border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-slate-300 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all cursor-pointer group overflow-hidden">
                          {formData.Anh ? (
                            <img src={formData.Anh} className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-center">
                               <Camera size={32} className="mb-2 group-hover:scale-110 transition-transform mx-auto"/>
                               <p className="text-[9px] font-bold uppercase">Nhấn chọn ảnh</p>
                            </div>
                          )}
                          <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handleFileChange} />
                       </div>
                       {formData.Anh && <button onClick={() => setFormData({...formData, Anh: ''})} className="w-full py-1.5 text-[8px] font-black text-rose-500 uppercase hover:underline">Xóa ảnh hiện tại</button>}
                    </div>
                  </div>

                  <div className="lg:col-span-9 space-y-8">
                     <section className="space-y-4">
                        <div className="flex items-center gap-2 border-b border-indigo-100 pb-2">
                           <User size={14} className="text-indigo-500" />
                           <h5 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Thông tin & Gia đình</h5>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                           <InputField label="Mã Học Sinh" value={formData.MaHS} onChange={v => setFormData({...formData, MaHS: v})} placeholder="HS001" required colSpan={1} />
                           <InputField label="Họ và Tên học sinh" value={formData.Hoten} onChange={v => setFormData({...formData, Hoten: v})} placeholder="Nguyễn Văn A" colSpan={3} required />
                           <InputField label="Ngày sinh" value={formData.NgaySinh} onChange={v => setFormData({...formData, NgaySinh: v})} type="date" colSpan={2} />
                           <div className="space-y-1.5 col-span-2">
                              <label className="text-[10px] font-bold text-slate-500 uppercase px-1 tracking-widest">Giới tính</label>
                              <div className="flex p-1 bg-white border border-slate-200 rounded-2xl h-11">
                                <button onClick={() => setFormData({...formData, GioiTinh: true})} className={`flex-1 rounded-xl text-[10px] font-black uppercase transition-all ${formData.GioiTinh ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>Nam</button>
                                <button onClick={() => setFormData({...formData, GioiTinh: false})} className={`flex-1 rounded-xl text-[10px] font-black uppercase transition-all ${!formData.GioiTinh ? 'bg-pink-500 text-white shadow-md' : 'text-slate-400 hover:bg-pink-50'}`}>Nữ</button>
                              </div>
                           </div>
                           <InputField label="Số điện thoại" value={formData.SDT_LinkHe} onChange={v => setFormData({...formData, SDT_LinkHe: v})} placeholder="090..." colSpan={2} />
                           <InputField label="Email" value={formData.Email} onChange={v => setFormData({...formData, Email: v})} placeholder="abc@gmail.com" colSpan={2} />
                           <InputField label="Địa chỉ" value={formData.DiaChi} onChange={v => setFormData({...formData, DiaChi: v})} placeholder="Địa chỉ thường trú..." colSpan={4} />
                           
                           <InputField label="Họ tên Cha" value={formData.TenCha} onChange={v => setFormData({...formData, TenCha: v})} placeholder="Tên cha" colSpan={2} />
                           <InputField label="Nghề nghiệp Cha" value={formData.NgheNghiepCha} onChange={v => setFormData({...formData, NgheNghiepCha: v})} placeholder="Nghề nghiệp" colSpan={2} />
                           <InputField label="Họ tên Mẹ" value={formData.TenMe} onChange={v => setFormData({...formData, TenMe: v})} placeholder="Tên mẹ" colSpan={2} />
                           <InputField label="Nghề nghiệp Mẹ" value={formData.NgheNghiepMe} onChange={v => setFormData({...formData, NgheNghiepMe: v})} placeholder="Nghề nghiệp" colSpan={2} />
                        </div>
                     </section>

                     <section className="space-y-4">
                        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                           <FileText size={14} className="text-slate-400" />
                           <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ghi chú & Lưu ý</h5>
                        </div>
                        <div className="space-y-1.5">
                           <textarea 
                             value={formData.GhiChuKhac} 
                             onChange={e => setFormData({...formData, GhiChuKhac: e.target.value})} 
                             className="w-full p-5 bg-white border border-slate-200 rounded-[32px] text-[12px] font-medium outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all min-h-[160px]" 
                             placeholder="Các lưu ý đặc biệt..."
                           ></textarea>
                        </div>
                     </section>
                  </div>
               </div>
            </div>
            
            <div className="p-6 bg-white border-t flex justify-end gap-3 shrink-0">
               <button onClick={() => setIsFormOpen(false)} className="px-10 py-3.5 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">Hủy</button>
               <button onClick={handleSaveStudent} className="px-14 py-3.5 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all text-[10px] uppercase tracking-widest flex items-center gap-2"><Save size={18}/> {formData.MaHS ? 'Cập nhật' : 'Lưu hồ sơ'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// UI Components con
const InfoField = ({ label, value, colSpan = 1 }: any) => (
  <div className={`space-y-1 ${colSpan === 2 ? 'md:col-span-2' : colSpan === 3 ? 'md:col-span-3' : ''}`}>
    <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest px-1">{label}</p>
    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 font-bold text-slate-700 text-[11px] truncate">
      {value || '---'}
    </div>
  </div>
);

const InputField = ({ label, value, onChange, placeholder = '', type = 'text', colSpan = 1, required = false }: any) => (
  <div className={`space-y-1.5 ${colSpan === 2 ? 'md:col-span-2' : colSpan === 3 ? 'md:col-span-3' : colSpan === 4 ? 'md:col-span-4' : ''}`}>
    <label className="text-[10px] font-bold text-slate-500 uppercase px-1 tracking-widest">
      {label} {required && <span className="text-rose-500">*</span>}
    </label>
    <input 
      type={type} 
      value={value || ''} 
      onChange={e => onChange(e.target.value)} 
      className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-[12px] font-bold outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all" 
      placeholder={placeholder}
    />
  </div>
);

export default StudentList;
