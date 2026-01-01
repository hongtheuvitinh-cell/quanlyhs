
import React, { useState, useRef, useMemo } from 'react';
import { 
  Search, X, User, Users, Sparkles, Edit2, Trash2, Save, Award, Phone, MapPin, Calendar, BrainCircuit, CheckCircle2, ChevronRight, Mail, Briefcase, Heart, 
  TrendingUp, ShieldAlert, ClipboardList, Info, Star, AlertTriangle, Clock
} from 'lucide-react';
import { AppState, Student, Grade, LearningLog, Discipline, AttendanceStatus } from '../types';
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

type ProfileTab = 'SYLL' | 'GRADES' | 'DISCIPLINE' | 'LOGS';

// Define XCircle before its usage in statusConfig to avoid block-scoped variable error
const XCircle = ({ size, className }: { size?: number, className?: string }) => <X size={size} className={className} />;

const statusConfig: Record<AttendanceStatus, { label: string, color: string, icon: any, bg: string }> = {
  CO_MAT: { label: 'Bình thường', color: 'text-emerald-600', icon: CheckCircle2, bg: 'bg-emerald-50' },
  VANG_CP: { label: 'Vắng CP', color: 'text-amber-600', icon: AlertTriangle, bg: 'bg-amber-50' },
  VANG_KP: { label: 'Vắng KP', color: 'text-rose-600', icon: XCircle, bg: 'bg-rose-50' },
  TRE: { label: 'Đi trễ', color: 'text-indigo-600', icon: Clock, bg: 'bg-indigo-50' },
};

const StudentList: React.FC<Props> = ({ state, students, grades, logs, disciplines, onAddStudent, onAddStudents, onUpdateStudent, onDeleteStudent }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'ai' | 'profile'>('add');
  const [activeProfileTab, setActiveProfileTab] = useState<ProfileTab>('SYLL');
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<Student | null>(null);
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
    setActiveProfileTab('SYLL');
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

  // Tính toán dữ liệu cho Tab Hồ sơ
  const studentGrades = useMemo(() => {
    if (!selectedStudentForProfile) return [];
    return grades.filter(g => g.MaHS === selectedStudentForProfile.MaHS && g.MaNienHoc === state.selectedYear);
  }, [selectedStudentForProfile, grades, state.selectedYear]);

  const studentDisciplines = useMemo(() => {
    if (!selectedStudentForProfile) return [];
    return disciplines.filter(d => d.MaHS === selectedStudentForProfile.MaHS && d.MaNienHoc === state.selectedYear);
  }, [selectedStudentForProfile, disciplines, state.selectedYear]);

  const studentLogs = useMemo(() => {
    if (!selectedStudentForProfile) return [];
    return logs.filter(l => l.MaHS === selectedStudentForProfile.MaHS).sort((a,b) => new Date(b.NgayGhiChep).getTime() - new Date(a.NgayGhiChep).getTime());
  }, [selectedStudentForProfile, logs]);

  const conductData = useMemo(() => {
    if (!selectedStudentForProfile) return { score: 100, classification: 'Tốt', color: 'emerald' };
    const totalDeduction = studentDisciplines.reduce((sum, d) => sum + (d.DiemTruTaiThoiDiemDo || 0), 0);
    const score = Math.max(0, 100 - totalDeduction);
    let classification = "Yếu"; let color = "rose";
    if (score >= 80) { classification = "Tốt"; color = "emerald"; }
    else if (score >= 65) { classification = "Khá"; color = "indigo"; }
    else if (score >= 50) { classification = "Trung Bình"; color = "amber"; }
    return { score, classification, color };
  }, [studentDisciplines, selectedStudentForProfile]);

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
          <input type="file" ref={fileInputRef} onChange={async (e) => {}} className="hidden" accept="image/*" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filteredStudents.map((student) => (
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
                <div title={student.SDT_LinkHe} className="flex items-center gap-1 text-[10px] text-slate-400 font-normal"><Phone size={10}/> {student.SDT_LinkHe}</div>
              </div>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setSelectedStudentForProfile(student); setModalMode('profile'); setIsModalOpen(true); }} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Xem hồ sơ toàn diện"><Award size={15} /></button>
                <button onClick={() => { setFormStudent(student); setModalMode('edit'); setIsModalOpen(true); }} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Chỉnh sửa SYLL"><Edit2 size={15}/></button>
                <button onClick={() => onDeleteStudent(student.MaHS)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg" title="Xóa học sinh"><Trash2 size={15}/></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95">
            {/* Header Modal */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
               <div className="flex items-center gap-3">
                 <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-100">
                    {modalMode === 'profile' ? <Award size={18}/> : <Edit2 size={18}/>}
                 </div>
                 <div>
                    <h3 className="font-bold text-sm text-slate-800 uppercase tracking-tight">
                      {modalMode === 'profile' ? `Hồ sơ toàn diện: ${selectedStudentForProfile?.Hoten}` : modalMode === 'edit' ? 'Cập nhật SYLL' : 'Thêm mới Học sinh'}
                    </h3>
                    {modalMode === 'profile' && <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Mã HS: {selectedStudentForProfile?.MaHS}</p>}
                 </div>
               </div>
               <button onClick={resetForm} className="p-1.5 hover:bg-slate-100 rounded-full transition-colors"><X size={20} className="text-slate-400" /></button>
            </div>

            {/* Tab Navigation (Only for Profile Mode) */}
            {modalMode === 'profile' && (
              <div className="px-6 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-1 shrink-0 overflow-x-auto no-scrollbar">
                <button onClick={() => setActiveProfileTab('SYLL')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${activeProfileTab === 'SYLL' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                  <User size={14}/> SYLL
                </button>
                <button onClick={() => setActiveProfileTab('GRADES')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${activeProfileTab === 'GRADES' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                  <TrendingUp size={14}/> Học tập
                </button>
                <button onClick={() => setActiveProfileTab('DISCIPLINE')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${activeProfileTab === 'DISCIPLINE' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                  <ShieldAlert size={14}/> Rèn luyện
                </button>
                <button onClick={() => setActiveProfileTab('LOGS')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${activeProfileTab === 'LOGS' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                  <ClipboardList size={14}/> Nhật ký
                </button>
              </div>
            )}

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50/20">
               {modalMode === 'profile' && selectedStudentForProfile ? (
                 <div className="animate-in fade-in duration-300">
                    {activeProfileTab === 'SYLL' && (
                       <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                          <div className="md:col-span-4 space-y-6">
                             <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
                                <div className="w-24 h-24 rounded-3xl bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center mb-4">
                                   {selectedStudentForProfile.Anh ? <img src={selectedStudentForProfile.Anh} className="w-full h-full object-cover" /> : <User size={40} className="text-slate-200" />}
                                </div>
                                <h4 className="text-base font-bold text-slate-800 leading-tight mb-1">{selectedStudentForProfile.Hoten}</h4>
                                <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase ${selectedStudentForProfile.GioiTinh ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>
                                   {selectedStudentForProfile.GioiTinh ? 'Nam' : 'Nữ'}
                                </span>
                             </div>
                             <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                                <InfoItem icon={<Phone size={14}/>} label="Liên hệ" value={selectedStudentForProfile.SDT_LinkHe} />
                                <InfoItem icon={<Mail size={14}/>} label="Email" value={selectedStudentForProfile.Email || 'Chưa cập nhật'} />
                                <InfoItem icon={<MapPin size={14}/>} label="Địa chỉ" value={selectedStudentForProfile.DiaChi} />
                             </div>
                          </div>
                          <div className="md:col-span-8 space-y-6">
                             <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                                   <Heart size={14} className="text-rose-500" /> Thông tin gia đình
                                </h5>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                   <div className="space-y-4">
                                      <InfoItem icon={<User size={14}/>} label="Họ tên Cha" value={selectedStudentForProfile.TenCha || '---'} />
                                      <InfoItem icon={<Briefcase size={14}/>} label="Nghề nghiệp" value={selectedStudentForProfile.NgheNghiepCha || '---'} />
                                   </div>
                                   <div className="space-y-4">
                                      <InfoItem icon={<User size={14}/>} label="Họ tên Mẹ" value={selectedStudentForProfile.TenMe || '---'} />
                                      <InfoItem icon={<Briefcase size={14}/>} label="Nghề nghiệp" value={selectedStudentForProfile.NgheNghiepMe || '---'} />
                                   </div>
                                </div>
                             </div>
                             <div className="bg-indigo-600 p-6 rounded-3xl text-white shadow-xl shadow-indigo-100 flex items-center justify-between">
                                <div>
                                   <p className="text-[10px] font-bold uppercase opacity-70 mb-1">Ghi chú đặc biệt</p>
                                   <p className="text-sm font-medium italic">"{selectedStudentForProfile.GhiChuKhac || 'Không có ghi chú thêm.'}"</p>
                                </div>
                                <Info size={32} className="opacity-20" />
                             </div>
                          </div>
                       </div>
                    )}

                    {activeProfileTab === 'GRADES' && (
                       <div className="space-y-6">
                          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                             <table className="w-full text-left">
                                <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                   <tr>
                                      <th className="px-6 py-4">Môn học</th>
                                      <th className="px-6 py-4">Loại điểm</th>
                                      <th className="px-6 py-4">Học kỳ</th>
                                      <th className="px-6 py-4 text-right">Điểm số</th>
                                   </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                   {studentGrades.length > 0 ? studentGrades.sort((a,b) => a.HocKy - b.HocKy).map(g => (
                                      <tr key={g.MaDiem} className="hover:bg-slate-50/50">
                                         <td className="px-6 py-3 font-bold text-slate-800 text-xs">{g.MaMonHoc}</td>
                                         <td className="px-6 py-3 text-slate-500 text-xs">{g.LoaiDiem}</td>
                                         <td className="px-6 py-3 text-slate-500 text-xs">HK{g.HocKy}</td>
                                         <td className="px-6 py-3 text-right"><span className={`font-black text-sm ${g.DiemSo >= 8 ? 'text-emerald-600' : g.DiemSo < 5 ? 'text-rose-600' : 'text-indigo-600'}`}>{g.DiemSo.toFixed(1)}</span></td>
                                      </tr>
                                   )) : (
                                      <tr><td colSpan={4} className="py-20 text-center text-slate-300 font-bold uppercase text-[10px] tracking-widest">Chưa có dữ liệu điểm</td></tr>
                                   )}
                                </tbody>
                             </table>
                          </div>
                       </div>
                    )}

                    {activeProfileTab === 'DISCIPLINE' && (
                       <div className="space-y-6">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                                <div className={`w-14 h-14 rounded-2xl bg-${conductData.color}-50 flex items-center justify-center text-${conductData.color}-600 border border-${conductData.color}-100`}>
                                   <Star size={28} />
                                </div>
                                <div>
                                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Điểm rèn luyện</p>
                                   <h4 className={`text-2xl font-black text-${conductData.color}-600`}>{conductData.score} <span className="text-xs font-bold text-slate-300">/ 100</span></h4>
                                </div>
                             </div>
                             <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                                <div className={`w-14 h-14 rounded-2xl bg-${conductData.color}-50 flex items-center justify-center text-${conductData.color}-600 border border-${conductData.color}-100`}>
                                   <Award size={28} />
                                </div>
                                <div>
                                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Xếp loại hạnh kiểm</p>
                                   <h4 className={`text-2xl font-black text-${conductData.color}-600 uppercase tracking-tighter`}>{conductData.classification}</h4>
                                </div>
                             </div>
                          </div>

                          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                             <div className="px-6 py-4 bg-slate-50 border-b border-slate-100"><h6 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Lịch sử vi phạm kỷ luật</h6></div>
                             <div className="divide-y divide-slate-50">
                                {studentDisciplines.length > 0 ? studentDisciplines.map(d => (
                                   <div key={d.MaKyLuat} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                      <div className="flex items-center gap-4">
                                         <div className="text-[10px] font-bold text-slate-300 w-20">{d.NgayViPham}</div>
                                         <div>
                                            <p className="text-[11px] font-bold text-slate-800 uppercase">{d.MaLoi}</p>
                                            <p className="text-[10px] text-slate-400 italic">"{d.NoiDungChiTiet}"</p>
                                         </div>
                                      </div>
                                      <div className="flex items-center gap-3">
                                         <span className="px-2 py-0.5 bg-rose-50 text-rose-600 rounded-lg text-[9px] font-black">-{d.DiemTruTaiThoiDiemDo}đ</span>
                                         <span className="px-2 py-0.5 border border-slate-100 text-slate-400 rounded-lg text-[9px] font-bold uppercase">{d.HinhThucXL}</span>
                                      </div>
                                   </div>
                                )) : (
                                   <div className="py-12 text-center text-slate-300 font-bold uppercase text-[10px] tracking-widest">Tác phong nề nếp tốt, không có vi phạm</div>
                                )}
                             </div>
                          </div>
                       </div>
                    )}

                    {activeProfileTab === 'LOGS' && (
                       <div className="space-y-4">
                          {studentLogs.length > 0 ? studentLogs.map(log => {
                             const conf = statusConfig[log.TrangThai];
                             return (
                                <div key={log.MaTheoDoi} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex gap-5 hover:border-indigo-100 transition-all group">
                                   <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${conf.bg} ${conf.color} border border-slate-50 group-hover:shadow-lg transition-all`}>
                                      <conf.icon size={24} />
                                   </div>
                                   <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between mb-2">
                                         <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg uppercase border ${conf.color} ${conf.bg} border-current opacity-70`}>{conf.label}</span>
                                         <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold"><Calendar size={12} /> {log.NgayGhiChep}</div>
                                      </div>
                                      <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-50">
                                         <p className="text-[11px] text-slate-700 font-semibold leading-relaxed">"{log.NhanXet || 'Học sinh sinh hoạt bình thường trong tiết học'}"</p>
                                      </div>
                                   </div>
                                </div>
                             );
                          }) : (
                             <div className="py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-100 text-slate-300">
                                <ClipboardList size={40} className="mb-2 mx-auto opacity-20" />
                                <p className="text-[10px] font-black uppercase tracking-widest">Chưa có nhật ký theo dõi cho học sinh này</p>
                             </div>
                          )}
                       </div>
                    )}
                 </div>
               ) : (
                 /* Form Chỉnh sửa/Thêm mới SYLL (Giữ nguyên như cũ) */
                 <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       <Field label="Mã Học Sinh" value={formStudent.MaHS} onChange={v => setFormStudent({...formStudent, MaHS: v})} />
                       <div className="md:col-span-2"><Field label="Họ và Tên" value={formStudent.Hoten} onChange={v => setFormStudent({...formStudent, Hoten: v})} /></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       <Field label="Ngày sinh" type="date" value={formStudent.NgaySinh} onChange={v => setFormStudent({...formStudent, NgaySinh: v})} />
                       <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase px-1 tracking-widest">Giới tính</label>
                          <select value={formStudent.GioiTinh ? 'true' : 'false'} onChange={e => setFormStudent({...formStudent, GioiTinh: e.target.value === 'true'})} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-indigo-400">
                            <option value="true">Nam</option>
                            <option value="false">Nữ</option>
                          </select>
                       </div>
                       <Field label="Link Ảnh chân dung" value={formStudent.Anh} onChange={v => setFormStudent({...formStudent, Anh: v})} />
                    </div>
                    <Field label="Địa chỉ cư trú" value={formStudent.DiaChi} onChange={v => setFormStudent({...formStudent, DiaChi: v})} />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                       <div className="space-y-4">
                          <h5 className="text-[10px] font-black text-slate-400 uppercase px-1 flex items-center gap-2"><User size={12}/> Thông tin Cha</h5>
                          <Field label="Họ tên Cha" value={formStudent.TenCha} onChange={v => setFormStudent({...formStudent, TenCha: v})} />
                          <Field label="Nghề nghiệp" value={formStudent.NgheNghiepCha} onChange={v => setFormStudent({...formStudent, NgheNghiepCha: v})} />
                       </div>
                       <div className="space-y-4">
                          <h5 className="text-[10px] font-black text-slate-400 uppercase px-1 flex items-center gap-2"><User size={12}/> Thông tin Mẹ</h5>
                          <Field label="Họ tên Mẹ" value={formStudent.TenMe} onChange={v => setFormStudent({...formStudent, TenMe: v})} />
                          <Field label="Nghề nghiệp" value={formStudent.NgheNghiepMe} onChange={v => setFormStudent({...formStudent, NgheNghiepMe: v})} />
                       </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-6">
                       <Field label="Số điện thoại PH" value={formStudent.SDT_LinkHe} onChange={v => setFormStudent({...formStudent, SDT_LinkHe: v})} />
                       <Field label="Email liên hệ" value={formStudent.Email} onChange={v => setFormStudent({...formStudent, Email: v})} />
                    </div>
                 </div>
               )}
            </div>

            {/* Footer Modal */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
               <button onClick={resetForm} className="px-6 py-2 bg-white border border-slate-200 text-slate-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all">Đóng</button>
               {modalMode !== 'profile' && (
                  <button onClick={handleSave} className="px-8 py-2 bg-indigo-600 text-white rounded-xl font-black shadow-lg shadow-indigo-100 text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 active:scale-95 transition-all">
                     <Save size={16}/> Lưu hồ sơ
                  </button>
               )}
            </div>
          </div>
        </div>
      )}
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
