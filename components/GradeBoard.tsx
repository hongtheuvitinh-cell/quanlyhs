
import { useState, useRef, useEffect } from 'react';
import { 
  Search, Sparkles, GraduationCap, BookOpen, BrainCircuit, Table, ListChecks, Save, CheckCircle2, Loader2, AlertCircle
} from 'lucide-react';
import { AppState, Student, Grade, Role } from '../types';
import { parseGradesFromImage } from '../services/geminiService';

interface Props {
  state: AppState;
  students: Student[];
  grades: Grade[];
  onUpdateGrades: (newGrades: Grade[]) => void;
}

const subjects = [
  { id: 'TOAN', name: 'Toán Học' },
  { id: 'VAN', name: 'Ngữ Văn' },
  { id: 'ANH', name: 'Tiếng Anh' },
  { id: 'LY', name: 'Vật Lý' },
  { id: 'HOA', name: 'Hóa Học' },
  { id: 'SINH', name: 'Sinh Học' },
  { id: 'SU', name: 'Lịch Sử' },
  { id: 'DIA', name: 'Địa Lý' },
  { id: 'GDCD', name: 'GDCD' },
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

  useEffect(() => {
    setTempGrades(grades);
    setHasChanges(false);
  }, [grades]);

  useEffect(() => {
    if (isGiangDay && state.selectedSubject) {
      setSelectedSubject(state.selectedSubject);
    }
  }, [state.selectedSubject, isGiangDay]);

  const handleAiFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsAiProcessing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        try {
          const data = await parseGradesFromImage(base64, file.type);
          if (data && Array.isArray(data)) {
            const newGradesFromAi: Grade[] = data.map((item: any, idx: number) => {
              const matchedStudent = students.find((s: Student) => 
                (item.MaHS && s.MaHS.toLowerCase().trim() === item.MaHS.toLowerCase().trim()) ||
                (s.Hoten.toLowerCase().trim() === item.Hoten.toLowerCase().trim())
              );

              if (!matchedStudent) return null;

              return {
                MaDiem: Math.floor(Date.now() / 1000) + idx + Math.floor(Math.random() * 1000),
                MaHS: matchedStudent.MaHS,
                MaMonHoc: item.MaMonHoc || selectedSubject,
                MaNienHoc: state.selectedYear,
                HocKy: selectedHK,
                LoaiDiem: item.LoaiDiem,
                DiemSo: Number(item.DiemSo)
              };
            }).filter((g: any) => g !== null) as Grade[];

            if (newGradesFromAi.length > 0) {
              setTempGrades(prev => {
                const updated = [...prev];
                newGradesFromAi.forEach(ng => {
                  const idx = updated.findIndex(u => 
                    u.MaHS === ng.MaHS && 
                    u.MaMonHoc === ng.MaMonHoc && 
                    u.LoaiDiem === ng.LoaiDiem && 
                    u.HocKy === ng.HocKy &&
                    u.MaNienHoc === ng.MaNienHoc
                  );
                  if (idx > -1) updated[idx] = ng;
                  else updated.push(ng);
                });
                return updated;
              });
              setHasChanges(true);
            }
          }
        } catch (err: any) {
          alert(`Lỗi AI: ${err.message}`);
        } finally {
          setIsAiProcessing(false);
        }
      };
    } catch (error) {
      setIsAiProcessing(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleInputChange = (studentId: string, type: string, value: string) => {
    const val = value === '' ? 0 : parseFloat(value);
    
    setTempGrades(prev => {
      const updated = [...prev];
      const idx = updated.findIndex(g => 
        g.MaHS === studentId && 
        g.MaMonHoc === selectedSubject && 
        g.HocKy === selectedHK && 
        g.LoaiDiem === type &&
        g.MaNienHoc === state.selectedYear
      );

      const existingMaDiem = idx > -1 ? updated[idx].MaDiem : 0;

      const newGrade: Grade = {
        MaDiem: existingMaDiem,
        MaHS: studentId,
        MaMonHoc: selectedSubject,
        MaNienHoc: state.selectedYear,
        HocKy: selectedHK,
        LoaiDiem: type,
        DiemSo: val
      };

      if (idx > -1) updated[idx] = newGrade;
      else updated.push(newGrade);
      
      return updated;
    });
    setHasChanges(true);
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      const studentIds = students.map(s => s.MaHS);
      const gradesToSave = tempGrades.filter(g => 
        studentIds.includes(g.MaHS) &&
        g.MaMonHoc === selectedSubject && 
        g.HocKy === selectedHK && 
        g.MaNienHoc === state.selectedYear
      );

      if (gradesToSave.length === 0) {
        alert("Không có dữ liệu điểm nào để lưu.");
        setIsSaving(false);
        return;
      }

      await onUpdateGrades(gradesToSave);
      setHasChanges(false);
    } finally {
      setIsSaving(false);
    }
  };

  const calculateSubjectAvg = (studentId: string, subjectId: string, semester: number) => {
    const sGrades = tempGrades.filter((g: Grade) => 
      g.MaHS === studentId && 
      g.MaMonHoc === subjectId && 
      g.HocKy === semester && 
      g.MaNienHoc === state.selectedYear
    );
    const dgtx = sGrades.filter((g: Grade) => g.LoaiDiem.startsWith('ĐGTX')).map((g: Grade) => Number(g.DiemSo)).filter((d: number) => !isNaN(d));
    const ggk = sGrades.find((g: Grade) => g.LoaiDiem === 'ĐGGK')?.DiemSo;
    const gck = sGrades.find((g: Grade) => g.LoaiDiem === 'ĐGCK')?.DiemSo;
    
    if (dgtx.length > 0 && ggk !== undefined && gck !== undefined) {
      return (dgtx.reduce((a: number, b: number) => a + b, 0) + Number(ggk) * 2 + Number(gck) * 3) / (dgtx.length + 5);
    }
    return null;
  };

  const getRank = (avg: number) => {
    if (avg >= 8.0) return { label: 'Giỏi', color: 'bg-emerald-50 text-emerald-600' };
    if (avg >= 6.5) return { label: 'Khá', color: 'bg-indigo-50 text-indigo-600' };
    if (avg >= 5.0) return { label: 'Trung Bình', color: 'bg-amber-50 text-amber-600' };
    return { label: 'Yếu', color: 'bg-rose-50 text-rose-600' };
  };

  const filteredStudents = students.filter((s: Student) => s.Hoten.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-4 pb-32 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-lg"><GraduationCap size={20} /></div>
          <div>
            <h2 className="text-xl font-black text-gray-800 tracking-tight">Sổ điểm lớp {state.selectedClass}</h2>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Niên học {state.selectedYear} • Học kỳ {selectedHK}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex p-1 bg-gray-100 rounded-xl mr-2">
            <button onClick={() => setViewMode('DETAIL')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-2 ${viewMode === 'DETAIL' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}>
              <ListChecks size={14} /> Chi tiết
            </button>
            <button onClick={() => setViewMode('SUMMARY')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-2 ${viewMode === 'SUMMARY' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}>
              <Table size={14} /> Tổng hợp
            </button>
          </div>
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl text-[10px] font-black hover:bg-indigo-100 transition-all uppercase">
            <Sparkles size={14} /> Quét điểm AI
          </button>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf" onChange={handleAiFileUpload} />
        </div>
      </div>

      <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input type="text" placeholder="Tìm tên..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-transparent rounded-xl outline-none text-sm font-medium focus:bg-white focus:border-indigo-100 transition-all" />
        </div>
        
        {viewMode === 'DETAIL' && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-xl border border-gray-100">
            <BookOpen size={14} className="text-indigo-600" />
            <select disabled={isGiangDay} value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="text-xs font-black bg-transparent outline-none cursor-pointer">
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}

        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
          {[1, 2].map(hk => (
            <button key={hk} onClick={() => setSelectedHK(hk)} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${selectedHK === hk ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}>HK {hk}</button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          {viewMode === 'DETAIL' ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-200">
                  <th className="px-4 py-3 border-r border-gray-200 w-12 text-center">STT</th>
                  <th className="px-4 py-3 border-r border-gray-200">Họ và Tên</th>
                  {['ĐGTX1', 'ĐGTX2', 'ĐGTX3', 'ĐGTX4', 'ĐGGK', 'ĐGCK'].map(h => <th key={h} className="px-2 py-3 border-r border-gray-200 text-center w-16">{h}</th>)}
                  <th className="px-4 py-3 text-center bg-indigo-50/50 text-indigo-600 font-black w-24">TB Môn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStudents.map((s, idx) => {
                  const sGrades = tempGrades.filter(g => g.MaHS === s.MaHS && g.MaMonHoc === selectedSubject && g.HocKy === selectedHK && g.MaNienHoc === state.selectedYear);
                  const tb = calculateSubjectAvg(s.MaHS, selectedSubject, selectedHK);
                  return (
                    <tr key={s.MaHS} className="hover:bg-indigo-50/10 transition-colors group">
                      <td className="px-4 py-1.5 border-r border-gray-100 text-center font-medium text-gray-400">{idx + 1}</td>
                      <td className="px-4 py-1.5 border-r border-gray-100 font-black text-gray-800 text-sm">{s.Hoten}</td>
                      {['ĐGTX1', 'ĐGTX2', 'ĐGTX3', 'ĐGTX4', 'ĐGGK', 'ĐGCK'].map(type => {
                        const gradeObj = sGrades.find(g => g.LoaiDiem === type);
                        return (
                          <td key={type} className="px-1 py-1 border-r border-gray-100 text-center">
                            <input 
                              type="number" step="0.1" 
                              value={gradeObj?.DiemSo ?? ''} 
                              onChange={(e) => handleInputChange(s.MaHS, type, e.target.value)}
                              className="w-10 h-7 text-center font-bold text-sm bg-gray-50/50 border border-gray-100 rounded focus:bg-white focus:border-indigo-400 outline-none transition-all"
                            />
                          </td>
                        );
                      })}
                      <td className="px-4 py-1.5 text-center bg-indigo-50/20 font-black text-indigo-600 text-sm">{tb?.toFixed(1) || '--'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-200">
                  <th className="px-4 py-3 border-r border-gray-200 sticky left-0 bg-gray-50 z-10 w-48">Học sinh</th>
                  {subjects.map(sub => <th key={sub.id} className="px-2 py-3 border-r border-gray-200 text-center text-[9px] w-14">{sub.name}</th>)}
                  <th className="px-4 py-3 border-r border-gray-200 text-center bg-emerald-50 text-emerald-700 font-black w-20">TB HK</th>
                  <th className="px-4 py-3 text-center bg-gray-900 text-white font-black w-24">Xếp loại</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStudents.map(s => {
                  const subjectAvgs = subjects.map(sub => calculateSubjectAvg(s.MaHS, sub.id, selectedHK));
                  const validAvgs = subjectAvgs.filter(a => a !== null) as number[];
                  const semAvg = validAvgs.length > 0 ? validAvgs.reduce((a, b) => a + b, 0) / validAvgs.length : null;
                  const rank = semAvg ? getRank(semAvg) : null;
                  return (
                    <tr key={s.MaHS} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-1.5 border-r border-gray-100 font-black text-gray-800 text-sm sticky left-0 bg-white z-10">{s.Hoten}</td>
                      {subjectAvgs.map((avg, i) => (
                        <td key={i} className="px-2 py-1.5 border-r border-gray-100 text-center text-xs font-bold text-gray-600">
                          {avg?.toFixed(1) || '-'}
                        </td>
                      ))}
                      <td className="px-4 py-1.5 border-r border-gray-100 text-center bg-emerald-50/10 font-black text-emerald-600 text-sm">
                        {semAvg?.toFixed(1) || '--'}
                      </td>
                      <td className="px-4 py-1.5 text-center">
                        {rank && (
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${rank.color}`}>
                            {rank.label}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {hasChanges && !isSaving && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10">
          <div className="bg-gray-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-6 border border-white/10 backdrop-blur-md">
            <div className="text-left">
              <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Đã thay đổi điểm</p>
              <p className="text-xs font-bold">Lưu thay đổi lên máy chủ Cloud?</p>
            </div>
            <button 
              onClick={handleSaveChanges} 
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs flex items-center gap-2 shadow-lg transition-all active:scale-95"
            >
              <Save size={14} /> Đồng bộ ngay
            </button>
          </div>
        </div>
      )}

      {isAiProcessing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-md animate-in fade-in">
          <div className="bg-white p-10 rounded-[40px] shadow-2xl flex flex-col items-center border border-indigo-100 text-center max-w-sm">
            <div className="relative mb-6">
              <div className="h-16 w-16 border-[5px] border-indigo-50 border-t-indigo-600 rounded-full animate-spin"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <BrainCircuit className="text-indigo-600" size={24} />
              </div>
            </div>
            <h3 className="font-black text-lg text-gray-800 mb-2">AI đang phân tích...</h3>
            <p className="text-gray-400 text-xs font-medium leading-relaxed italic">Vui lòng chờ trong giây lát.</p>
          </div>
        </div>
      )}

      {isSaving && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white px-8 py-6 rounded-3xl shadow-2xl flex flex-col items-center border border-gray-100">
            <Loader2 className="text-indigo-600 animate-spin mb-3" size={32} />
            <h3 className="font-black text-sm text-gray-800 uppercase tracking-widest">Đang đồng bộ Cloud...</h3>
          </div>
        </div>
      )}
    </div>
  );
};

export default GradeBoard;
