
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  Search, Sparkles, GraduationCap, BookOpen, BrainCircuit, Table, ListChecks
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
            const newGrades: Grade[] = data.map((item: any) => {
              // Ưu tiên khớp theo Mã HS (MaHS), nếu không có mới khớp theo Tên
              const matchedStudent = students.find((s: Student) => 
                (item.MaHS && s.MaHS.toLowerCase().trim() === item.MaHS.toLowerCase().trim()) ||
                (s.Hoten.toLowerCase().trim() === item.Hoten.toLowerCase().trim())
              );

              if (!matchedStudent) return null;

              const existing = grades.find((g: Grade) => 
                g.MaHS === matchedStudent.MaHS && 
                g.MaMonHoc === (item.MaMonHoc || selectedSubject) && 
                g.LoaiDiem === item.LoaiDiem &&
                g.HocKy === selectedHK &&
                g.MaNienHoc === state.selectedYear
              );

              return {
                MaDiem: existing?.MaDiem || Date.now() + Math.random(),
                MaHS: matchedStudent.MaHS,
                MaMonHoc: item.MaMonHoc || selectedSubject,
                MaNienHoc: state.selectedYear,
                HocKy: selectedHK,
                LoaiDiem: item.LoaiDiem,
                DiemSo: Number(item.DiemSo)
              };
            }).filter((g: any) => g !== null) as Grade[];

            if (newGrades.length > 0) {
              onUpdateGrades(newGrades);
              alert(`🎉 AI đã nhận diện thành công ${newGrades.length} đầu điểm!`);
            } else {
              alert("AI đọc được bảng nhưng không tìm thấy học sinh nào khớp với danh sách lớp hiện tại.");
            }
          }
        } catch (err: any) {
          console.error(err);
          alert("Lỗi xử lý: AI không thể phân tích cấu trúc bảng này. Hãy thử chụp ảnh rõ hơn hoặc căn lề bảng thẳng hơn.");
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

  const calculateSubjectAvg = (studentId: string, subjectId: string, semester: number) => {
    const sGrades = grades.filter((g: Grade) => 
      g.MaHS === studentId && 
      g.MaMonHoc === subjectId && 
      g.HocKy === semester && 
      g.MaNienHoc === state.selectedYear
    );
    const dgtx = sGrades.filter((g: Grade) => g.LoaiDiem.startsWith('ĐGTX')).map((g: Grade) => Number(g.DiemSo)).filter((d: number) => !isNaN(d));
    const ggk = sGrades.find((g: Grade) => g.LoaiDiem === 'ĐGGK')?.DiemSo;
    const gck = sGrades.find((g: Grade) => g.LoaiDiem === 'ĐGCK')?.DiemSo;
    
    if (dgtx.length > 0 && ggk != null && gck != null) {
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
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-indigo-600 rounded-[24px] text-white shadow-xl shadow-indigo-100"><GraduationCap size={32} /></div>
          <div>
            <h2 className="text-3xl font-black text-gray-800 tracking-tight">
              {viewMode === 'DETAIL' ? 'Sổ điểm chi tiết' : 'Bảng điểm tổng hợp'}
            </h2>
            <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mt-1">
              Lớp {state.selectedClass} • HK {selectedHK} • Niên học {state.selectedYear}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex p-1 bg-gray-100 rounded-2xl mr-2">
            <button onClick={() => setViewMode('DETAIL')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2 ${viewMode === 'DETAIL' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}>
              <ListChecks size={16} /> Chi tiết
            </button>
            <button onClick={() => setViewMode('SUMMARY')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2 ${viewMode === 'SUMMARY' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}>
              <Table size={16} /> Tổng hợp
            </button>
          </div>

          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-6 py-3 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-2xl text-sm font-black hover:bg-indigo-100 transition-all shadow-sm active:scale-95">
            <Sparkles size={18} className="animate-pulse" /> Nhập điểm AI
          </button>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf" onChange={handleAiFileUpload} />
        </div>
      </div>

      <div className="bg-white p-4 rounded-[32px] border border-gray-100 shadow-sm flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input type="text" placeholder="Tìm tên học sinh..." value={searchTerm} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-6 py-3.5 bg-gray-50 border border-transparent rounded-2xl outline-none text-sm font-black focus:bg-white focus:border-indigo-100 transition-all" />
        </div>
        
        {viewMode === 'DETAIL' && (
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-2xl border border-gray-100">
            <BookOpen size={16} className="text-indigo-600" />
            <select disabled={isGiangDay} value={selectedSubject} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedSubject(e.target.value)} className="text-sm font-black bg-transparent outline-none cursor-pointer">
              {subjects.map((s: {id: string, name: string}) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}

        <div className="flex gap-1 p-1 bg-gray-100 rounded-2xl">
          {[1, 2].map((hk: number) => (
            <button key={hk} onClick={() => setSelectedHK(hk)} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${selectedHK === hk ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}>HK {hk}</button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          {viewMode === 'DETAIL' ? (
            <table className="w-full text-left">
              <thead className="bg-gray-50/80 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <tr>
                  <th className="px-8 py-6 border-r border-gray-100">Học sinh</th>
                  {['ĐGTX1', 'ĐGTX2', 'ĐGTX3', 'ĐGTX4', 'ĐGGK', 'ĐGCK'].map((h: string) => <th key={h} className="px-4 py-6 text-center">{h}</th>)}
                  <th className="px-8 py-6 text-center bg-indigo-50/50 text-indigo-600 font-black">TB Môn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredStudents.map((s: Student) => {
                  const sGrades = grades.filter((g: Grade) => g.MaHS === s.MaHS && g.MaMonHoc === selectedSubject && g.HocKy === selectedHK);
                  const tb = calculateSubjectAvg(s.MaHS, selectedSubject, selectedHK);
                  return (
                    <tr key={s.MaHS} className="hover:bg-indigo-50/20 transition-colors">
                      <td className="px-8 py-5 border-r border-gray-100 font-black text-gray-700">
                        <div className="flex flex-col">
                          <span>{s.Hoten}</span>
                          <span className="text-[9px] text-gray-400">{s.MaHS}</span>
                        </div>
                      </td>
                      {['ĐGTX1', 'ĐGTX2', 'ĐGTX3', 'ĐGTX4', 'ĐGGK', 'ĐGCK'].map((type: string) => {
                        const gradeObj = sGrades.find((g: Grade) => g.LoaiDiem === type);
                        return (
                          <td key={type} className="px-2 py-5 text-center">
                            <input 
                              type="number" step="0.1" 
                              value={gradeObj?.DiemSo ?? ''} 
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                const val = e.target.value === '' ? null : parseFloat(e.target.value);
                                onUpdateGrades([{ 
                                  MaDiem: gradeObj?.MaDiem || Date.now() + Math.random(), 
                                  MaHS: s.MaHS, 
                                  MaMonHoc: selectedSubject, 
                                  MaNienHoc: state.selectedYear, 
                                  HocKy: selectedHK, 
                                  LoaiDiem: type, 
                                  DiemSo: val as any 
                                }]);
                              }}
                              className="w-12 h-10 text-center font-black bg-gray-50/50 border border-transparent rounded-xl focus:bg-white focus:border-indigo-400 outline-none transition-all"
                            />
                          </td>
                        );
                      })}
                      <td className="px-8 py-5 text-center"><span className="text-sm font-black text-indigo-600 bg-indigo-50/30 px-4 py-2 rounded-xl inline-block">{tb?.toFixed(1) || '--'}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-gray-50/80 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <tr>
                  <th className="px-8 py-6 border-r border-gray-100 sticky left-0 bg-gray-50/80 z-10">Học sinh</th>
                  {subjects.map((sub: {id: string, name: string}) => <th key={sub.id} className="px-4 py-6 text-center text-[9px]">{sub.name}</th>)}
                  <th className="px-6 py-6 text-center bg-emerald-50 text-emerald-700 font-black">TB Học kỳ</th>
                  <th className="px-8 py-6 text-center bg-gray-900 text-white font-black">Xếp loại</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredStudents.map((s: Student) => {
                  const subjectAvgs = subjects.map((sub: {id: string, name: string}) => calculateSubjectAvg(s.MaHS, sub.id, selectedHK));
                  const validAvgs = subjectAvgs.filter((a: number | null) => a !== null) as number[];
                  const semAvg = validAvgs.length > 0 ? validAvgs.reduce((a: number, b: number) => a + b, 0) / validAvgs.length : null;
                  const rank = semAvg ? getRank(semAvg) : null;
                  return (
                    <tr key={s.MaHS} className="hover:bg-gray-50 transition-colors">
                      <td className="px-8 py-5 border-r border-gray-100 font-black text-gray-700 sticky left-0 bg-white z-10">{s.Hoten}</td>
                      {subjectAvgs.map((avg: number | null, i: number) => (
                        <td key={i} className="px-4 py-5 text-center text-sm font-bold text-gray-500">
                          {avg?.toFixed(1) || '-'}
                        </td>
                      ))}
                      <td className="px-6 py-5 text-center bg-emerald-50/30">
                        <span className="text-sm font-black text-emerald-600">{semAvg?.toFixed(1) || '--'}</span>
                      </td>
                      <td className="px-8 py-5 text-center">
                        {rank && (
                          <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${rank.color}`}>
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
      
      {isAiProcessing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-md animate-in fade-in">
          <div className="bg-white p-12 rounded-[48px] shadow-2xl flex flex-col items-center border border-indigo-100 text-center max-w-sm">
            <div className="relative mb-8">
              <div className="h-24 w-24 border-[8px] border-indigo-50 border-t-indigo-600 rounded-full animate-spin"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <BrainCircuit className="text-indigo-600 animate-pulse" size={32} />
              </div>
            </div>
            <h3 className="font-black text-2xl text-gray-800 mb-3">AI đang làm việc...</h3>
            <p className="text-gray-400 font-medium leading-relaxed italic">
              Đang phân tích bảng điểm từ tài liệu. Vui lòng đợi trong giây lát.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GradeBoard;
