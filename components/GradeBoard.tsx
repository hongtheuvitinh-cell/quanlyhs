
import { useState, useRef, useEffect } from 'react';
import { Search, Sparkles, GraduationCap, BookOpen, Table, ListChecks, Save, Loader2 } from 'lucide-react';
import { AppState, Student, Grade, Role } from '../types';
import { parseGradesFromImage } from '../services/geminiService';

interface Props {
  state: AppState;
  students: Student[];
  grades: Grade[];
  onUpdateGrades: (newGrades: Grade[]) => void;
}

const subjects = [
  { id: 'TOAN', name: 'Toán' }, { id: 'VAN', name: 'Văn' }, { id: 'ANH', name: 'Anh' },
  { id: 'LY', name: 'Lý' }, { id: 'HOA', name: 'Hóa' }, { id: 'SINH', name: 'Sinh' }
];

const GradeBoard: React.FC<Props> = ({ state, students, grades, onUpdateGrades }) => {
  const isGiangDay = state.currentRole === Role.GIANG_DAY;
  const [viewMode, setViewMode] = useState<'DETAIL' | 'SUMMARY'>('DETAIL');
  const [selectedSubject, setSelectedSubject] = useState(isGiangDay ? (state.selectedSubject || 'TOAN') : 'TOAN');
  const [selectedHK, setSelectedHK] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [tempGrades, setTempGrades] = useState<Grade[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTempGrades(grades); setHasChanges(false); }, [grades]);

  const txColumns = Array.from({ length: 4 }, (_, i) => `ĐGTX${i + 1}`);
  const allColumns = [...txColumns, 'ĐGGK', 'ĐGCK'];

  const handleInputChange = (studentId: string, type: string, rawValue: string) => {
    let val = rawValue === '' ? 0 : parseFloat(rawValue);
    if (!rawValue.includes('.') && val > 10 && val <= 100) val = val / 10;
    setTempGrades(prev => {
      const updated = [...prev];
      const idx = updated.findIndex(g => g.MaHS === studentId && g.MaMonHoc === selectedSubject && g.HocKy === selectedHK && g.LoaiDiem === type);
      const newGrade: Grade = { MaDiem: idx > -1 ? updated[idx].MaDiem : 0, MaHS: studentId, MaMonHoc: selectedSubject, MaNienHoc: state.selectedYear, HocKy: selectedHK, LoaiDiem: type, DiemSo: val };
      if (idx > -1) updated[idx] = newGrade; else updated.push(newGrade);
      return updated;
    });
    setHasChanges(true);
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      const gradesToSave = tempGrades.filter(g => students.some(s => s.MaHS === g.MaHS) && g.MaMonHoc === selectedSubject && g.HocKy === selectedHK);
      await onUpdateGrades(gradesToSave);
      setHasChanges(false);
    } finally { setIsSaving(false); }
  };

  const calculateSubjectAvg = (studentId: string, subjectId: string, semester: number) => {
    const sGrades = tempGrades.filter(g => g.MaHS === studentId && g.MaMonHoc === subjectId && g.HocKy === semester);
    const dgtx = sGrades.filter(g => g.LoaiDiem.startsWith('ĐGTX')).map(g => g.DiemSo);
    const ggk = sGrades.find(g => g.LoaiDiem === 'ĐGGK')?.DiemSo;
    const gck = sGrades.find(g => g.LoaiDiem === 'ĐGCK')?.DiemSo;
    if (dgtx.length && ggk !== undefined && gck !== undefined) return (dgtx.reduce((a, b) => a + b, 0) + ggk * 2 + gck * 3) / (dgtx.length + 5);
    return null;
  };

  const filteredStudents = students.filter(s => s.Hoten.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-3 pb-32 animate-in fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-3 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-600 rounded-lg text-white shadow-lg"><GraduationCap size={16} /></div>
          <div>
            <h2 className="text-sm font-bold text-gray-800 tracking-tight leading-none mb-0.5">Bảng điểm lớp {state.selectedClass}</h2>
            <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">Học kỳ {selectedHK}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex p-0.5 bg-gray-100 rounded-lg">
            <button onClick={() => setViewMode('DETAIL')} className={`px-3 py-1 rounded text-[8px] font-black uppercase transition-all ${viewMode === 'DETAIL' ? 'bg-white text-indigo-600' : 'text-gray-400'}`}><ListChecks size={10} /> Chi tiết</button>
            <button onClick={() => setViewMode('SUMMARY')} className={`px-3 py-1 rounded text-[8px] font-black uppercase transition-all ${viewMode === 'SUMMARY' ? 'bg-white text-indigo-600' : 'text-gray-400'}`}><Table size={10} /> Tổng</button>
          </div>
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded text-[8px] font-black uppercase"><Sparkles size={10} /> AI</button>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" />
        </div>
      </div>

      <div className="bg-white p-2 rounded-xl border border-gray-100 shadow-sm flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
          <input type="text" placeholder="Tìm tên..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border rounded-lg outline-none text-[11px] font-normal" />
        </div>
        <div className="flex gap-1 p-0.5 bg-gray-100 rounded-lg">
          {[1, 2].map(hk => (<button key={hk} onClick={() => setSelectedHK(hk)} className={`px-3 py-1 rounded text-[8px] font-black uppercase transition-all ${selectedHK === hk ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}>HK {hk}</button>))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-[8px] font-black text-gray-500 uppercase border-b border-gray-200">
                <th className="px-3 py-2 border-r border-gray-200 w-8 text-center">STT</th>
                <th className="px-3 py-2 border-r border-gray-200">Học sinh</th>
                {viewMode === 'DETAIL' ? (
                  <>
                    {allColumns.map(h => <th key={h} className="px-1 py-2 border-r border-gray-200 text-center w-12">{h}</th>)}
                    <th className="px-3 py-2 text-center bg-indigo-50/50 text-indigo-600 font-black w-16">TB</th>
                  </>
                ) : (
                  <>
                    {subjects.map(sub => <th key={sub.id} className="px-1 py-2 border-r border-gray-200 text-center w-12">{sub.name}</th>)}
                    <th className="px-3 py-2 text-center bg-emerald-50 text-emerald-700 font-black w-16">TB HK</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStudents.map((s, idx) => {
                const tb = calculateSubjectAvg(s.MaHS, selectedSubject, selectedHK);
                return (
                  <tr key={s.MaHS} className="hover:bg-indigo-50/10 transition-colors">
                    <td className="px-3 py-1.5 border-r border-gray-100 text-center font-normal text-gray-400 text-[10px]">{idx + 1}</td>
                    <td className="px-3 py-1.5 border-r border-gray-100 font-bold text-gray-800 text-[11px] whitespace-nowrap">{s.Hoten}</td>
                    {viewMode === 'DETAIL' ? (
                      <>
                        {allColumns.map(type => {
                          const gradeObj = tempGrades.find(g => g.MaHS === s.MaHS && g.MaMonHoc === selectedSubject && g.HocKy === selectedHK && g.LoaiDiem === type);
                          return (
                            <td key={type} className="px-1 py-1 border-r border-gray-100 text-center">
                              <input type="number" step="0.1" value={gradeObj?.DiemSo ?? ''} onChange={(e) => handleInputChange(s.MaHS, type, e.target.value)} placeholder="-" className="w-9 h-6 text-center font-normal text-[11px] bg-gray-50/30 border border-gray-100 rounded focus:bg-white outline-none" />
                            </td>
                          );
                        })}
                        <td className="px-3 py-1.5 text-center bg-indigo-50/20 font-bold text-indigo-600 text-[11px]">{tb?.toFixed(1) || '--'}</td>
                      </>
                    ) : (
                      <>
                        {subjects.map(sub => (
                          <td key={sub.id} className="px-1 py-1 border-r border-gray-100 text-center text-[11px] font-normal text-gray-500">{calculateSubjectAvg(s.MaHS, sub.id, selectedHK)?.toFixed(1) || '-'}</td>
                        ))}
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {hasChanges && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5">
          <div className="bg-gray-900 text-white px-4 py-2 rounded-xl shadow-2xl flex items-center gap-4">
            <span className="text-[10px] font-bold">Lưu thay đổi bảng điểm?</span>
            <button onClick={handleSaveChanges} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 rounded text-[9px] font-black uppercase"><Save size={12} className="inline mr-1" /> Lưu Cloud</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GradeBoard;
