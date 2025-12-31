
import React, { useState, useRef } from 'react';
import { 
  Search, X, User, Users, Sparkles, Edit2, Trash2, Save, Award, TrendingUp, ShieldAlert, Image as ImageIcon, Phone, Mail, MapPin, Briefcase, Calendar, Key, BrainCircuit, CheckCircle2, MoreVertical
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsAiProcessing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        try {
          const data = await parseStudentListFromImage(base64, file.type, state.currentRole);
          if (data && data.length > 0) {
            setAiPreviewData(data);
            setModalMode('ai');
            setIsModalOpen(true);
          } else { alert("AI không tìm thấy dữ liệu học sinh."); }
        } finally { setIsAiProcessing(false); }
      };
    } catch (error) { setIsAiProcessing(false); } finally { if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handleSave = () => {
    if (!formStudent.MaHS || !formStudent.Hoten) { alert("Vui lòng nhập đủ Mã HS và Họ tên!"); return; }
    
    const finalStudent: Student = {
      MaHS: formStudent.MaHS!,
      Hoten: formStudent.Hoten!,
      NgaySinh: formStudent.NgaySinh || '2008-01-01',
      GioiTinh: formStudent.GioiTinh ?? true,
      DiaChi: formStudent.DiaChi || '',
      TenCha: formStudent.TenCha || '',
      NgheNghiepCha: formStudent.NgheNghiepCha || '',
      TenMe: formStudent.TenMe || '',
      NgheNghiepMe: formStudent.NgheNghiepMe || '',
      SDT_LinkHe: formStudent.SDT_LinkHe || '',
      Email: formStudent.Email || '',
      MaLopHienTai: state.selectedClass,
      MaNienHoc: state.selectedYear,
      Anh: formStudent.Anh || '', 
      GhiChuKhac: formStudent.GhiChuKhac || '',
      MatKhau: formStudent.MatKhau || '123456'
    };

    if (modalMode === 'add') onAddStudent(finalStudent);
    else onUpdateStudent(finalStudent);
    resetForm();
  };

  const handleConfirmAiImport = () => {
    const studentsToImport: Student[] = aiPreviewData.map(s => ({
      MaHS: s.MaHS!,
      Hoten: s.Hoten!,
      NgaySinh: s.NgaySinh || '2008-01-01',
      GioiTinh: s.GioiTinh ?? true,
      DiaChi: s.DiaChi || '',
      TenCha: s.TenCha || '',
      NgheNghiepCha: '',
      TenMe: s.TenMe || '',
      NgheNghiepMe: '',
      SDT_LinkHe: s.SDT_LinkHe || '',
      Email: '',
      MaLopHienTai: state.selectedClass,
      MaNienHoc: state.selectedYear,
      Anh: '',
      GhiChuKhac: '',
      MatKhau: '123456'
    }));
    onAddStudents(studentsToImport);
    resetForm();
  };

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
    <div className="space-y-4 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-black text-gray-800 flex items-center gap-3"><Users className="text-indigo-600" size={20} /> Danh sách lớp</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="text" placeholder="Tìm tên, mã số..." className="pl-10 pr-4 py-2 bg-gray-50 border rounded-xl outline-none w-56 text-sm font-medium focus:bg-white transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <button onClick={() => { setModalMode('add'); setIsModalOpen(true); }} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-md hover:bg-indigo-700 transition-all">Thêm học sinh</button>
          <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-black shadow-sm hover:bg-gray-50 transition-all flex items-center gap-2">
            <Sparkles size={14} className="text-indigo-600" /> Quét AI
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,application/pdf" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-200">
              <th className="px-4 py-3 border-r border-gray-200 w-12 text-center">STT</th>
              <th className="px-4 py-3 border-r border-gray-200 w-24">Mã HS</th>
              <th className="px-4 py-3 border-r border-gray-200">Họ và Tên</th>
              <th className="px-4 py-3 border-r border-gray-200 w-28 text-center">Ngày sinh</th>
              <th className="px-4 py-3 border-r border-gray-200 w-20 text-center">Phái</th>
              <th className="px-4 py-3 border-r border-gray-200">Địa chỉ</th>
              <th className="px-4 py-3 border-r border-gray-200 w-32">Điện thoại</th>
              <th className="px-4 py-3 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredStudents.length > 0 ? filteredStudents.map((student, index) => (
              <tr key={student.MaHS} className="hover:bg-indigo-50/30 transition-colors group text-sm">
                <td className="px-4 py-2 border-r border-gray-100 text-center font-medium text-gray-400">{index + 1}</td>
                <td className="px-4 py-2 border-r border-gray-100 font-bold text-indigo-600">{student.MaHS}</td>
                <td className="px-4 py-2 border-r border-gray-100 font-black text-gray-800">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center shrink-0">
                       {student.Anh ? <img src={student.Anh} className="w-full h-full object-cover" /> : <User size={14} className="text-gray-300" />}
                    </div>
                    {student.Hoten}
                  </div>
                </td>
                <td className="px-4 py-2 border-r border-gray-100 text-center text-gray-600 font-medium">{new Date(student.NgaySinh).toLocaleDateString('vi-VN')}</td>
                <td className="px-4 py-2 border-r border-gray-100 text-center">
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${student.GioiTinh ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>
                    {student.GioiTinh ? 'Nam' : 'Nữ'}
                  </span>
                </td>
                <td className="px-4 py-2 border-r border-gray-100 text-gray-500 truncate max-w-[200px]" title={student.DiaChi}>{student.DiaChi}</td>
                <td className="px-4 py-2 border-r border-gray-100 font-bold text-gray-700">{student.SDT_LinkHe}</td>
                <td className="px-4 py-2 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => { setSelectedStudentForProfile(student); setModalMode('profile'); setIsModalOpen(true); }} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Xem học bạ"><Award size={16} /></button>
                    <button onClick={() => { setIsAnalyzing(true); analyzeStudentPerformance(student, grades.filter(g => g.MaHS === student.MaHS), logs.filter(l => l.MaHS === student.MaHS)).then(res => { setAiAnalysis(res ?? null); setIsAnalyzing(false); }); }} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-all" title="Phân tích AI"><BrainCircuit size={16} /></button>
                    <button onClick={() => { setFormStudent(student); setModalMode('edit'); setIsModalOpen(true); }} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"><Edit2 size={16}/></button>
                    <button onClick={() => onDeleteStudent(student.MaHS)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={16}/></button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={8} className="px-8 py-20 text-center text-gray-400 italic">Không tìm thấy học sinh nào trong lớp này.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-5xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95">
            <div className="px-8 py-4 border-b flex items-center justify-between bg-white shrink-0">
               <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-600 rounded-xl text-white">
                    {modalMode === 'ai' ? <Sparkles size={18}/> : modalMode === 'profile' ? <Award size={18}/> : <User size={18}/>}
                  </div>
                  <h3 className="font-black text-lg text-gray-800">
                    {modalMode === 'ai' ? 'Kết quả trích xuất AI' : modalMode === 'profile' ? 'Hồ sơ học tập' : modalMode === 'edit' ? 'Cập nhật Sơ yếu lý lịch' : 'Tiếp nhận Học sinh mới'}
                  </h3>
               </div>
               <button onClick={resetForm} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={24} className="text-gray-400"/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {modalMode === 'profile' && selectedStudentForProfile ? (
                <div className="space-y-6">
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex items-center gap-4">
                         <div className="p-2.5 bg-white text-indigo-600 rounded-xl shadow-sm"><TrendingUp size={20}/></div>
                         <div><p className="text-[9px] font-black text-indigo-400 uppercase">Học lực</p><h4 className="text-lg font-black text-indigo-900">8.2</h4></div>
                      </div>
                      <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex items-center gap-4">
                         <div className="p-2.5 bg-white text-emerald-600 rounded-xl shadow-sm"><Award size={20}/></div>
                         <div><p className="text-[9px] font-black text-emerald-400 uppercase">Rèn luyện</p><h4 className="text-lg font-black text-emerald-900">Tốt</h4></div>
                      </div>
                      <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 flex items-center gap-4">
                         <div className="p-2.5 bg-white text-rose-600 rounded-xl shadow-sm"><ShieldAlert size={20}/></div>
                         <div><p className="text-[9px] font-black text-rose-400 uppercase">Vi phạm</p><h4 className="text-lg font-black text-rose-900">{disciplines.filter(d => d.MaHS === selectedStudentForProfile.MaHS).length} vụ</h4></div>
                      </div>
                   </div>
                   <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                      <table className="w-full text-left text-sm border-collapse">
                        <thead>
                           <tr className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-200">
                             <th className="px-6 py-3 border-r border-gray-200">Môn học</th>
                             <th className="px-6 py-3 border-r border-gray-200 text-center">HK 1</th>
                             <th className="px-6 py-3 border-r border-gray-200 text-center">HK 2</th>
                             <th className="px-6 py-3 text-center bg-indigo-50/50 text-indigo-600 font-black">Cả năm</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                           {subjectsList.map(sub => {
                              const tb1 = calculateSubjectAvg(selectedStudentForProfile, sub.id, 1);
                              const tb2 = calculateSubjectAvg(selectedStudentForProfile, sub.id, 2);
                              return (
                                <tr key={sub.id} className="hover:bg-gray-50/50">
                                  <td className="px-6 py-2 border-r border-gray-100 font-bold text-gray-800">{sub.name}</td>
                                  <td className="px-6 py-2 border-r border-gray-100 text-center text-gray-500">{tb1?.toFixed(1) || '--'}</td>
                                  <td className="px-6 py-2 border-r border-gray-100 text-center text-gray-500">{tb2?.toFixed(1) || '--'}</td>
                                  <td className="px-6 py-2 text-center font-black text-indigo-600 bg-indigo-50/10">{(tb1 && tb2) ? ((tb1 + tb2 * 2) / 3).toFixed(1) : '--'}</td>
                                </tr>
                              );
                           })}
                        </tbody>
                      </table>
                   </div>
                </div>
              ) : modalMode === 'ai' ? (
                <div className="space-y-4">
                  <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex items-center gap-3 text-indigo-700 text-sm"><CheckCircle2 size={20} className="shrink-0" /><div><p className="font-black">AI đã trích xuất {aiPreviewData.length} học sinh!</p></div></div>
                  <div className="overflow-hidden border border-gray-200 rounded-2xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-gray-50 text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-200">
                        <tr><th className="px-5 py-3 border-r border-gray-200">Mã HS</th><th className="px-5 py-3 border-r border-gray-200">Họ và Tên</th><th className="px-5 py-3">Ngày sinh</th></tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {aiPreviewData.map((s, idx) => (<tr key={idx}><td className="px-5 py-2 border-r border-gray-100 font-black text-indigo-600">{s.MaHS}</td><td className="px-5 py-2 border-r border-gray-100 font-bold text-gray-800">{s.Hoten}</td><td className="px-5 py-2 text-gray-500">{s.NgaySinh}</td></tr>))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex gap-1 p-1 bg-gray-50 rounded-2xl border border-gray-100">
                    <button onClick={() => setActiveFormTab('basic')} className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-xl transition-all ${activeFormTab === 'basic' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>1. Thông tin cá nhân</button>
                    <button onClick={() => setActiveFormTab('family')} className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-xl transition-all ${activeFormTab === 'family' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>2. Gia đình</button>
                    <button onClick={() => setActiveFormTab('contact')} className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-xl transition-all ${activeFormTab === 'contact' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>3. Liên lạc & Ghi chú</button>
                  </div>

                  {activeFormTab === 'basic' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in slide-in-from-left-4">
                      <Field label="Mã Học sinh" icon={<Key size={14}/>} value={formStudent.MaHS} onChange={v => setFormStudent({...formStudent, MaHS: v})} placeholder="VD: HS001" />
                      <Field label="Họ và Tên" icon={<Users size={14}/>} value={formStudent.Hoten} onChange={v => setFormStudent({...formStudent, Hoten: v})} />
                      <Field label="Ngày sinh" icon={<Calendar size={14}/>} value={formStudent.NgaySinh} onChange={v => setFormStudent({...formStudent, NgaySinh: v})} type="date" />
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase px-1">Giới tính</label>
                        <select value={formStudent.GioiTinh ? 'true' : 'false'} onChange={e => setFormStudent({...formStudent, GioiTinh: e.target.value === 'true'})} className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-xl font-bold outline-none focus:bg-white focus:border-indigo-100 transition-all text-xs">
                          <option value="true">Nam</option>
                          <option value="false">Nữ</option>
                        </select>
                      </div>
                      <div className="lg:col-span-2 space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase px-1">Ảnh hồ sơ (Link URL)</label>
                        <div className="relative">
                          <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={14}/>
                          <input type="text" value={formStudent.Anh} onChange={e => setFormStudent({...formStudent, Anh: e.target.value})} className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-transparent rounded-xl font-bold outline-none focus:bg-white focus:border-indigo-100 transition-all text-xs" placeholder="Dán link ảnh tại đây..." />
                        </div>
                      </div>
                    </div>
                  )}

                  {activeFormTab === 'family' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 animate-in slide-in-from-left-4">
                      <Field label="Họ tên Cha" icon={<User size={14}/>} value={formStudent.TenCha} onChange={v => setFormStudent({...formStudent, TenCha: v})} />
                      <Field label="Nghề nghiệp Cha" icon={<Briefcase size={14}/>} value={formStudent.NgheNghiepCha} onChange={v => setFormStudent({...formStudent, NgheNghiepCha: v})} />
                      <Field label="Họ tên Mẹ" icon={<User size={14}/>} value={formStudent.TenMe} onChange={v => setFormStudent({...formStudent, TenMe: v})} />
                      <Field label="Nghề nghiệp Mẹ" icon={<Briefcase size={14}/>} value={formStudent.NgheNghiepMe} onChange={v => setFormStudent({...formStudent, NgheNghiepMe: v})} />
                    </div>
                  )}

                  {activeFormTab === 'contact' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in slide-in-from-left-4">
                      <div className="lg:col-span-3">
                        <Field label="Địa chỉ thường trú" icon={<MapPin size={14}/>} value={formStudent.DiaChi} onChange={v => setFormStudent({...formStudent, DiaChi: v})} />
                      </div>
                      <Field label="Số điện thoại" icon={<Phone size={14}/>} value={formStudent.SDT_LinkHe} onChange={v => setFormStudent({...formStudent, SDT_LinkHe: v})} />
                      <Field label="Email cá nhân" icon={<Mail size={14}/>} value={formStudent.Email} onChange={v => setFormStudent({...formStudent, Email: v})} type="email" />
                      <Field label="Mật khẩu truy cập" icon={<Key size={14}/>} value={formStudent.MatKhau} onChange={v => setFormStudent({...formStudent, MatKhau: v})} />
                      <div className="lg:col-span-3 space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase px-1">Ghi chú đặc biệt</label>
                        <textarea value={formStudent.GhiChuKhac} onChange={e => setFormStudent({...formStudent, GhiChuKhac: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-xl font-bold outline-none focus:bg-white focus:border-indigo-100 transition-all h-16 text-xs" placeholder="VD: Học sinh dân tộc..."></textarea>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-8 py-5 bg-gray-50 border-t flex justify-end gap-3 shrink-0">
               <button onClick={resetForm} className="px-6 py-2.5 bg-white border border-gray-200 text-gray-500 rounded-2xl font-black text-xs active:scale-95 transition-all">Hủy</button>
               {modalMode === 'ai' && (<button onClick={handleConfirmAiImport} className="px-10 py-2.5 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-700 active:scale-95 transition-all text-xs flex items-center gap-2"><Save size={14}/> Nhập tất cả</button>)}
               {(modalMode === 'add' || modalMode === 'edit') && (<button onClick={handleSave} className="px-10 py-2.5 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-700 active:scale-95 transition-all text-xs flex items-center gap-2"><Save size={14}/> Lưu hồ sơ</button>)}
            </div>
          </div>
        </div>
      )}

      {isAiProcessing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-md">
          <div className="bg-white p-8 rounded-[40px] shadow-2xl flex flex-col items-center border border-indigo-100 text-center max-w-sm"><div className="relative mb-6"><div className="h-16 w-16 border-[5px] border-indigo-50 border-t-indigo-600 rounded-full animate-spin"></div><div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"><Sparkles className="text-indigo-600 animate-pulse" size={20} /></div></div><h3 className="font-black text-lg text-gray-800 mb-1">AI đang số hóa dữ liệu...</h3><p className="text-gray-400 text-[10px] font-medium uppercase tracking-widest">Đang trích xuất thông tin hồ sơ</p></div>
        </div>
      )}

      {aiAnalysis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 bg-indigo-600 text-white flex items-center justify-between shrink-0"><div className="flex items-center gap-3"><BrainCircuit size={20}/><h3 className="font-black text-lg">Phân tích chuyên sâu</h3></div><button onClick={() => setAiAnalysis(null)} className="p-2 hover:bg-white/10 rounded-full"><X size={20}/></button></div>
            <div className="p-8 overflow-y-auto custom-scrollbar flex-1 italic text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{aiAnalysis}</div>
            <div className="p-6 bg-gray-50 border-t flex justify-end shrink-0"><button onClick={() => setAiAnalysis(null)} className="px-10 py-2.5 bg-gray-900 text-white rounded-2xl font-black text-xs">Đóng</button></div>
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

const Field = ({ label, icon, value, onChange, placeholder, type = "text" }: { label: string, icon: React.ReactNode, value: any, onChange: (v: string) => void, placeholder?: string, type?: string }) => (
  <div className="space-y-1">
    <label className="text-[10px] font-black text-gray-400 uppercase px-1">{label}</label>
    <div className="relative">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300">{icon}</div>
      <input 
        type={type} 
        value={value || ''} 
        onChange={e => onChange(e.target.value)} 
        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-transparent rounded-xl font-bold outline-none focus:bg-white focus:border-indigo-100 transition-all text-xs" 
        placeholder={placeholder} 
      />
    </div>
  </div>
);

export default StudentList;
