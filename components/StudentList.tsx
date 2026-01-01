
import React, { useState, useRef } from 'react';
import { 
  Search, X, User, Users, Sparkles, Edit2, Trash2, Save, Award, Phone, MapPin, Calendar, BrainCircuit, CheckCircle2, ChevronRight
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
    setAiPreviewData([]);
    setSelectedStudentForProfile(null);
    setFormStudent({
      MaHS: '', Hoten: '', NgaySinh: '2008-01-01', GioiTinh: true,
      DiaChi: '', TenCha: '', NgheNghiepCha: '', TenMe: '', NgheNghiepMe: '', 
      SDT_LinkHe: '', Email: '', Anh: '', GhiChuKhac: '', MatKhau: '123456'
    });
  };

  const handleSave = () => {
    if (!formStudent.MaHS || !formStudent.Hoten) return;
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-base font-bold text-gray-800 flex items-center gap-2"><Users className="text-indigo-600" size={20} /> Danh sách học sinh</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input type="text" placeholder="Tìm tên, mã..." className="pl-9 pr-3 py-1.5 bg-gray-50 border rounded-lg outline-none w-48 text-xs font-normal focus:bg-white transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <button onClick={() => { setModalMode('add'); setIsModalOpen(true); }} className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase shadow-sm">Thêm mới</button>
          <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-[10px] font-black uppercase flex items-center gap-1.5 shadow-sm"><Sparkles size={12} className="text-indigo-600" /> Quét AI</button>
          <input type="file" ref={fileInputRef} onChange={async (e) => {
             const file = e.target.files?.[0]; if (!file) return;
             setIsAiProcessing(true);
             const reader = new FileReader(); reader.readAsDataURL(file);
             reader.onload = async () => {
                const base64 = (reader.result as string).split(',')[1];
                try {
                   const data = await parseStudentListFromImage(base64, file.type, state.currentRole);
                   if (data?.length) { setAiPreviewData(data); setModalMode('ai'); setIsModalOpen(true); }
                } finally { setIsAiProcessing(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
             };
          }} className="hidden" accept="image/*" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filteredStudents.map((student) => (
          <div key={student.MaHS} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all group relative">
            <div className="flex items-start gap-3">
              <div className="h-14 w-14 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 overflow-hidden">
                {student.Anh ? <img src={student.Anh} className="w-full h-full object-cover" /> : <User size={20} className="text-indigo-200" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest leading-none">{student.MaHS}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${student.GioiTinh ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>
                    {student.GioiTinh ? 'Nam' : 'Nữ'}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-gray-800 truncate mb-1">{student.Hoten}</h3>
                <div className="flex items-center gap-1.5 text-[11px] text-gray-400 font-normal">
                  <Calendar size={11} /> {new Date(student.NgaySinh).toLocaleDateString('vi-VN')}
                </div>
              </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
              <div className="flex gap-1">
                <div title="SĐT" className="w-6 h-6 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-300"><Phone size={12}/></div>
                <div title="Địa chỉ" className="w-6 h-6 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-300"><MapPin size={12}/></div>
              </div>
              <div className="flex items-center gap-0.5">
                <button onClick={() => { setSelectedStudentForProfile(student); setModalMode('profile'); setIsModalOpen(true); }} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg"><Award size={16} /></button>
                <button onClick={() => { setIsAnalyzing(true); analyzeStudentPerformance(student, grades.filter(g => g.MaHS === student.MaHS), logs.filter(l => l.MaHS === student.MaHS)).then(res => { setAiAnalysis(res ?? null); setIsAnalyzing(false); }); }} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg"><BrainCircuit size={16} /></button>
                <button onClick={() => { setFormStudent(student); setModalMode('edit'); setIsModalOpen(true); }} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Edit2 size={16}/></button>
                <button onClick={() => onDeleteStudent(student.MaHS)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"><Trash2 size={16}/></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b flex items-center justify-between bg-white shrink-0">
               <h3 className="font-black text-sm text-gray-800 uppercase tracking-tight">
                 {modalMode === 'ai' ? 'Trích xuất AI' : modalMode === 'profile' ? 'Hồ sơ học tập' : modalMode === 'edit' ? 'Sửa thông tin' : 'Thêm học sinh'}
               </h3>
               <button onClick={resetForm} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"><X size={20}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
               {modalMode === 'profile' && selectedStudentForProfile ? (
                 <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                       <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100"><p className="text-[9px] font-black text-indigo-400 uppercase">ĐTB HK</p><h4 className="text-xl font-bold text-indigo-900">8.2</h4></div>
                       <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100"><p className="text-[9px] font-black text-emerald-400 uppercase">Hạnh kiểm</p><h4 className="text-xl font-bold text-emerald-900">Tốt</h4></div>
                       <div className="bg-rose-50 p-4 rounded-xl border border-rose-100"><p className="text-[9px] font-black text-rose-400 uppercase">Vi phạm</p><h4 className="text-xl font-bold text-rose-900">{disciplines.filter(d => d.MaHS === selectedStudentForProfile.MaHS).length}</h4></div>
                    </div>
                 </div>
               ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Field label="Mã HS" value={formStudent.MaHS} onChange={v => setFormStudent({...formStudent, MaHS: v})} />
                    <Field label="Họ tên" value={formStudent.Hoten} onChange={v => setFormStudent({...formStudent, Hoten: v})} />
                    <Field label="Ngày sinh" type="date" value={formStudent.NgaySinh} onChange={v => setFormStudent({...formStudent, NgaySinh: v})} />
                    <Field label="Link Ảnh" value={formStudent.Anh} onChange={v => setFormStudent({...formStudent, Anh: v})} />
                    <div className="md:col-span-2"><Field label="Địa chỉ" value={formStudent.DiaChi} onChange={v => setFormStudent({...formStudent, DiaChi: v})} /></div>
                 </div>
               )}
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-2 shrink-0">
               <button onClick={resetForm} className="px-5 py-2 bg-white border border-gray-200 text-gray-500 rounded-xl font-black text-[9px] uppercase">Hủy</button>
               {modalMode !== 'profile' && (
                  <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-black shadow-lg text-[9px] uppercase"><Save size={14} className="inline mr-1"/> Lưu dữ liệu</button>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Field = ({ label, value, onChange, type = "text" }: { label: string, value: any, onChange: (v: string) => void, type?: string }) => (
  <div className="space-y-1">
    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest px-1">{label}</label>
    <input 
      type={type} value={value || ''} onChange={e => onChange(e.target.value)} 
      className="w-full p-2 bg-gray-50 border border-transparent rounded-lg font-normal text-xs outline-none focus:bg-white focus:border-indigo-100 transition-all" 
    />
  </div>
);

export default StudentList;
