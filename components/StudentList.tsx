
import React, { useState, useRef } from 'react';
import { 
  Search, X, User, Users, Sparkles, Edit2, Trash2, Save, Award, Phone, MapPin, Calendar, BrainCircuit, CheckCircle2, ChevronRight, Mail, Briefcase, Heart
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

  return (
    <div className="space-y-4 animate-in fade-in pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-3 rounded-xl border border-slate-200">
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
                <button onClick={() => { setSelectedStudentForProfile(student); setModalMode('profile'); setIsModalOpen(true); }} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg"><Award size={15} /></button>
                <button onClick={() => { setFormStudent(student); setModalMode('edit'); setIsModalOpen(true); }} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Edit2 size={15}/></button>
                <button onClick={() => onDeleteStudent(student.MaHS)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"><Trash2 size={15}/></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
               <h3 className="font-bold text-sm text-slate-800 uppercase tracking-tight">
                 {modalMode === 'profile' ? 'Sơ yếu lý lịch (SYLL)' : modalMode === 'edit' ? 'Cập nhật SYLL' : 'Thêm mới Học sinh'}
               </h3>
               <button onClick={resetForm} className="p-1 hover:bg-slate-100 rounded-full transition-colors"><X size={18}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-5 bg-slate-50/30">
               {modalMode === 'profile' && selectedStudentForProfile ? (
                 <div className="space-y-6">
                    <div className="flex gap-4 items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                       <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center">
                          {selectedStudentForProfile.Anh ? <img src={selectedStudentForProfile.Anh} className="w-full h-full object-cover" /> : <User size={30} className="text-slate-200" />}
                       </div>
                       <div>
                          <h4 className="text-base font-bold text-slate-800">{selectedStudentForProfile.Hoten}</h4>
                          <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">{selectedStudentForProfile.MaHS} • {selectedStudentForProfile.GioiTinh ? 'Nam' : 'Nữ'}</p>
                       </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-4">
                          <h5 className="text-[10px] font-black text-slate-400 uppercase border-l-2 border-indigo-500 pl-2">Thông tin cá nhân</h5>
                          <InfoItem icon={<Calendar size={14}/>} label="Ngày sinh" value={new Date(selectedStudentForProfile.NgaySinh).toLocaleDateString('vi-VN')} />
                          <InfoItem icon={<MapPin size={14}/>} label="Địa chỉ" value={selectedStudentForProfile.DiaChi} />
                          <InfoItem icon={<Mail size={14}/>} label="Email" value={selectedStudentForProfile.Email || 'Chưa cập nhật'} />
                       </div>
                       <div className="space-y-4">
                          <h5 className="text-[10px] font-black text-slate-400 uppercase border-l-2 border-rose-500 pl-2">Gia đình & Liên hệ</h5>
                          <InfoItem icon={<Heart size={14}/>} label="Họ tên Cha" value={selectedStudentForProfile.TenCha || '---'} />
                          <InfoItem icon={<Briefcase size={14}/>} label="Nghề nghiệp" value={selectedStudentForProfile.NgheNghiepCha || '---'} />
                          <InfoItem icon={<Heart size={14}/>} label="Họ tên Mẹ" value={selectedStudentForProfile.TenMe || '---'} />
                          <InfoItem icon={<Phone size={14}/>} label="Số điện thoại" value={selectedStudentForProfile.SDT_LinkHe} />
                       </div>
                    </div>
                 </div>
               ) : (
                 <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       <Field label="Mã Học Sinh" value={formStudent.MaHS} onChange={v => setFormStudent({...formStudent, MaHS: v})} />
                       <div className="md:col-span-2"><Field label="Họ và Tên" value={formStudent.Hoten} onChange={v => setFormStudent({...formStudent, Hoten: v})} /></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       <Field label="Ngày sinh" type="date" value={formStudent.NgaySinh} onChange={v => setFormStudent({...formStudent, NgaySinh: v})} />
                       <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase px-1">Giới tính</label>
                          <select value={formStudent.GioiTinh ? 'true' : 'false'} onChange={e => setFormStudent({...formStudent, GioiTinh: e.target.value === 'true'})} className="w-full p-2 bg-white border border-slate-200 rounded-lg font-normal text-xs outline-none">
                            <option value="true">Nam</option>
                            <option value="false">Nữ</option>
                          </select>
                       </div>
                       <Field label="Link Ảnh (Nếu có)" value={formStudent.Anh} onChange={v => setFormStudent({...formStudent, Anh: v})} />
                    </div>
                    <Field label="Địa chỉ thường trú" value={formStudent.DiaChi} onChange={v => setFormStudent({...formStudent, DiaChi: v})} />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                       <div className="space-y-4">
                          <h5 className="text-[10px] font-black text-slate-400 uppercase px-1">Thông tin Cha</h5>
                          <Field label="Họ tên Cha" value={formStudent.TenCha} onChange={v => setFormStudent({...formStudent, TenCha: v})} />
                          <Field label="Nghề nghiệp Cha" value={formStudent.NgheNghiepCha} onChange={v => setFormStudent({...formStudent, NgheNghiepCha: v})} />
                       </div>
                       <div className="space-y-4">
                          <h5 className="text-[10px] font-black text-slate-400 uppercase px-1">Thông tin Mẹ</h5>
                          <Field label="Họ tên Mẹ" value={formStudent.TenMe} onChange={v => setFormStudent({...formStudent, TenMe: v})} />
                          <Field label="Nghề nghiệp Mẹ" value={formStudent.NgheNghiepMe} onChange={v => setFormStudent({...formStudent, NgheNghiepMe: v})} />
                       </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                       <Field label="Số điện thoại liên hệ" value={formStudent.SDT_LinkHe} onChange={v => setFormStudent({...formStudent, SDT_LinkHe: v})} />
                       <Field label="Email cá nhân" value={formStudent.Email} onChange={v => setFormStudent({...formStudent, Email: v})} />
                    </div>
                 </div>
               )}
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-end gap-2 shrink-0">
               <button onClick={resetForm} className="px-4 py-1.5 bg-white border border-slate-200 text-slate-500 rounded-lg font-bold text-[10px] uppercase">Đóng</button>
               {modalMode !== 'profile' && (
                  <button onClick={handleSave} className="px-5 py-1.5 bg-indigo-600 text-white rounded-lg font-bold shadow-sm text-[10px] uppercase flex items-center gap-1.5"><Save size={14}/> Lưu hồ sơ</button>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const InfoItem = ({ icon, label, value }: { icon: any, label: string, value: string }) => (
  <div className="flex items-center gap-3">
    <div className="text-slate-300">{icon}</div>
    <div>
      <p className="text-[9px] font-bold text-slate-400 uppercase leading-none mb-0.5">{label}</p>
      <p className="text-[11px] font-normal text-slate-700">{value}</p>
    </div>
  </div>
);

const Field = ({ label, value, onChange, type = "text" }: { label: string, value: any, onChange: (v: string) => void, type?: string }) => (
  <div className="space-y-1">
    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-1">{label}</label>
    <input 
      type={type} value={value || ''} onChange={e => onChange(e.target.value)} 
      className="w-full p-2 bg-white border border-slate-200 rounded-lg font-normal text-xs outline-none focus:border-indigo-300 transition-all shadow-sm" 
    />
  </div>
);

export default StudentList;
