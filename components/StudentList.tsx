
import React, { useState, useRef, useMemo } from 'react';
import { 
  Search, X, User, Users, Sparkles, Edit2, Trash2, Save, Award, Phone, MapPin, Calendar, BrainCircuit, CheckCircle2, ChevronRight, Mail, Briefcase, Heart, 
  TrendingUp, ShieldAlert, ClipboardList, Info, Star, AlertTriangle, Clock, Printer, FileSpreadsheet, Download
} from 'lucide-react';
import { AppState, Student, Grade, LearningLog, Discipline, AttendanceStatus } from '../types';

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

type ProfileTab = 'SYLL' | 'GRADES' | 'DISCIPLINE' | 'LOGS';
type GradeView = 'HK1' | 'HK2' | 'CANAM';

const XCircle = ({ size, className }: { size?: number, className?: string }) => <X size={size} className={className} />;

const statusConfig: Record<AttendanceStatus, { label: string, color: string, icon: any, bg: string }> = {
  CO_MAT: { label: 'Bình thường', color: 'text-emerald-600', icon: CheckCircle2, bg: 'bg-emerald-50' },
  VANG_CP: { label: 'Vắng CP', color: 'text-amber-600', icon: AlertTriangle, bg: 'bg-amber-50' },
  VANG_KP: { label: 'Vắng KP', color: 'text-rose-600', icon: XCircle, bg: 'bg-rose-50' },
  TRE: { label: 'Đi trễ', color: 'text-indigo-600', icon: Clock, bg: 'bg-indigo-50' },
};

const subjectsList = [
  { id: 'TOAN', name: 'Toán Học' }, { id: 'VAN', name: 'Ngữ Văn' }, { id: 'ANH', name: 'Tiếng Anh' },
  { id: 'LY', name: 'Vật Lý' }, { id: 'HOA', name: 'Hóa Học' }, { id: 'SINH', name: 'Sinh Học' },
  { id: 'DIA', name: 'Địa Lý' }, { id: 'SU', name: 'Lịch Sử' }, { id: 'GDCD', name: 'GDCD' }
];

const StudentList: React.FC<Props> = ({ state, students, grades, logs, disciplines, onAddStudent, onAddStudents, onUpdateStudent, onDeleteStudent }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'ai' | 'profile'>('add');
  const [activeProfileTab, setActiveProfileTab] = useState<ProfileTab>('SYLL');
  const [gradeView, setGradeView] = useState<GradeView>('HK1');
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<Student | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formStudent, setFormStudent] = useState<Partial<Student>>({
    MaHS: '', Hoten: '', NgaySinh: '2008-01-01', GioiTinh: true,
    DiaChi: '', TenCha: '', NgheNghiepCha: '', TenMe: '', NgheNghiepMe: '', 
    SDT_LinkHe: '', Email: '', Anh: '', GhiChuKhac: '', MatKhau: '123456'
  });

  const filteredStudents = (students || []).filter((s: Student) => 
    s.Hoten.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.MaHS.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resetForm = () => {
    setIsModalOpen(false);
    setModalMode('add');
    setActiveProfileTab('SYLL');
    setGradeView('HK1');
    setSelectedStudentForProfile(null);
    setFormStudent({
      MaHS: '', Hoten: '', NgaySinh: '2008-01-01', GioiTinh: true,
      DiaChi: '', TenCha: '', NgheNghiepCha: '', TenMe: '', NgheNghiepMe: '', 
      SDT_LinkHe: '', Email: '', Anh: '', GhiChuKhac: '', MatKhau: '123456'
    });
  };

  const handleSave = () => {
    if (!formStudent.MaHS || !formStudent.Hoten) { alert("Vui lòng nhập Mã HS và Họ tên!"); return; }
    const finalStudent: Student = {
      MaHS: formStudent.MaHS!, Hoten: formStudent.Hoten!, NgaySinh: formStudent.NgaySinh!,
      GioiTinh: !!formStudent.GioiTinh, DiaChi: formStudent.DiaChi || '', TenCha: formStudent.TenCha || '',
      NgheNghiepCha: formStudent.NgheNghiepCha || '', TenMe: formStudent.TenMe || '',
      NgheNghiepMe: formStudent.NgheNghiepMe || '', SDT_LinkHe: formStudent.SDT_LinkHe || '',
      Email: formStudent.Email || '', MaLopHienTai: state.selectedClass, MaNienHoc: state.selectedYear,
      Anh: formStudent.Anh || '', GhiChuKhac: formStudent.GhiChuKhac || '', MatKhau: formStudent.MatKhau || '123456'
    };
    if (modalMode === 'add') onAddStudent(finalStudent);
    else onUpdateStudent(finalStudent);
    resetForm();
  };

  const studentGrades = useMemo(() => {
    if (!selectedStudentForProfile) return [];
    return (grades || []).filter((g: Grade) => g.MaHS === selectedStudentForProfile.MaHS && g.MaNienHoc === state.selectedYear);
  }, [selectedStudentForProfile, grades, state.selectedYear]);

  const studentDisciplines = useMemo(() => {
    if (!selectedStudentForProfile) return [];
    return (disciplines || []).filter((d: Discipline) => d.MaHS === selectedStudentForProfile.MaHS && d.MaNienHoc === state.selectedYear);
  }, [selectedStudentForProfile, disciplines, state.selectedYear]);

  const studentLogs = useMemo(() => {
    if (!selectedStudentForProfile) return [];
    return (logs || []).filter((l: LearningLog) => l.MaHS === selectedStudentForProfile.MaHS).sort((a: LearningLog, b: LearningLog) => new Date(b.NgayGhiChep).getTime() - new Date(a.NgayGhiChep).getTime());
  }, [selectedStudentForProfile, logs]);

  const conductData = useMemo(() => {
    if (!selectedStudentForProfile) return { score: 100, classification: 'Tốt', color: 'emerald' };
    const totalDeduction = studentDisciplines.reduce((sum: number, d: Discipline) => sum + (Number(d.DiemTruTaiThoiDiemDo) || 0), 0);
    const score = Math.max(0, 100 - totalDeduction);
    let classification = "Yếu"; let color = "rose";
    if (score >= 80) { classification = "Tốt"; color = "emerald"; }
    else if (score >= 65) { classification = "Khá"; color = "indigo"; }
    else if (score >= 50) { classification = "Trung Bình"; color = "amber"; }
    return { score, classification, color };
  }, [studentDisciplines, selectedStudentForProfile]);

  // Updated naming to ggk/gck for consistency and fixed undefined gck error
  const getSubjectRow = (subjectId: string, semester: number) => {
    const sGrades = studentGrades.filter((g: Grade) => g.MaMonHoc === subjectId && g.HocKy === semester);
    const tx = [1, 2, 3, 4, 5].map((i: number) => sGrades.find((g: Grade) => g.LoaiDiem === `ĐGTX${i}`)?.DiemSo);
    const ggk = sGrades.find((g: Grade) => g.LoaiDiem === 'ĐGGK')?.DiemSo;
    const gck = sGrades.find((g: Grade) => g.LoaiDiem === 'ĐGCK')?.DiemSo;
    let avg = null;
    const txValues = tx.filter((v: any) => v !== undefined) as number[];
    // Fix: Using ggk and gck correctly after renaming
    if (txValues.length > 0 && ggk !== undefined && gck !== undefined) {
      avg = (txValues.reduce((a: number, b: number) => a + b, 0) + ggk * 2 + gck * 3) / (txValues.length + 5);
    }
    return { tx, gk: ggk, ck: gck, avg };
  };

  const handleExportExcel = () => {
    if (!selectedStudentForProfile) return;
    let csvContent = "\uFEFF"; 
    csvContent += `HỌ TÊN: ${selectedStudentForProfile.Hoten}, MÃ HS: ${selectedStudentForProfile.MaHS}, LỚP: ${state.selectedClass}\n`;
    csvContent += `CHẾ ĐỘ XEM: ${gradeView === 'CANAM' ? 'Cả Năm' : 'Học kỳ ' + gradeView.slice(-1)}\n\n`;
    if (gradeView === 'CANAM') {
      csvContent += "Môn học,TB Học kỳ 1,TB Học kỳ 2,Trung bình Cả Năm\n";
      subjectsList.forEach((sub: any) => {
        const h1 = getSubjectRow(sub.id, 1).avg;
        const h2 = getSubjectRow(sub.id, 2).avg;
        const cn = (h1 !== null && h2 !== null) ? (h1 + h2 * 2) / 3 : null;
        csvContent += `${sub.name},${h1?.toFixed(1) || '-'},${h2?.toFixed(1) || '-'},${cn?.toFixed(1) || '-'}\n`;
      });
    } else {
      const semester = gradeView === 'HK1' ? 1 : 2;
      csvContent += "Môn học,TX1,TX2,TX3,TX4,TX5,GK,CK,TB Học Kỳ\n";
      subjectsList.forEach((sub: any) => {
        const { tx, gk, ck, avg } = getSubjectRow(sub.id, semester);
        const txStr = tx.map((v: any) => v !== undefined ? v.toFixed(1) : '-').join(',');
        csvContent += `${sub.name},${txStr},${gk?.toFixed(1) || '-'},${ck?.toFixed(1) || '-'},${avg?.toFixed(1) || '-'}\n`;
      });
    }
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `BangDiem_${selectedStudentForProfile.MaHS}_${gradeView}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 animate-in fade-in pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Users className="text-indigo-600" size={18} /> Quản lý Học sinh & SYLL</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input type="text" placeholder="Tìm tên, mã..." className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none w-48 text-[11px] font-normal focus:bg-white transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <button onClick={() => { setModalMode('add'); setIsModalOpen(true); }} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-bold uppercase shadow-sm">Thêm mới</button>
          <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-[10px] font-bold uppercase flex items-center gap-1.5 shadow-sm"><Sparkles size={12} className="text-indigo-600" /> Quét AI</button>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filteredStudents.map((student: Student) => (
          <div key={student.MaHS} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-200 transition-all group relative">
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                {student.Anh ? <img src={student.Anh} className="w-full h-full object-cover" /> : <User size={18} className="text-slate-300" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-bold text-indigo-500 uppercase tracking-widest leading-none">{student.MaHS}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${student.GioiTinh ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>
                    {student.GioiTinh ? 'Nam' : 'Nữ'}
                  </span>
                </div>
                <h3 className="text-xs font-bold text-slate-800 truncate mb-1">{student.Hoten}</h3>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-normal">
                  <Calendar size={10} /> {new Date(student.NgaySinh).toLocaleDateString('vi-VN')}
                </div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between">
              <div className="flex gap-1.5">
                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-normal"><Phone size={10}/> {student.SDT_LinkHe}</div>
              </div>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setSelectedStudentForProfile(student); setModalMode('profile'); setIsModalOpen(true); }} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg"><Award size={15} /></button>
                <button onClick={() => { setFormStudent(student); setModalMode('edit'); setIsModalOpen(true); }} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Edit2 size={15}/></button>
                <button onClick={() => onDeleteStudent(student.MaHS)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"><Trash2 size={15}/></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const InfoItem = ({ icon, label, value }: { icon: any, label: string, value: string }) => (
  <div className="flex items-start gap-3">
    <div className="text-slate-300 mt-1 shrink-0">{icon}</div>
    <div className="min-w-0">
      <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1 tracking-tight">{label}</p>
      <p className="text-[11px] font-semibold text-slate-700 break-words">{value}</p>
    </div>
  </div>
);

const Field = ({ label, value, onChange, type = "text" }: { label: string, value: any, onChange: (v: string) => void, type?: string }) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{label}</label>
    <input 
      type={type} value={value || ''} onChange={e => onChange(e.target.value)} 
      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all shadow-sm" 
    />
  </div>
);

export default StudentList;
