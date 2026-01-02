
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Search, GraduationCap, Table, ListChecks, Save, 
  Loader2, Plus, Minus, AlertCircle, Camera, Download, FileSpreadsheet, Sparkles, BrainCircuit, FileUp, Link as LinkIcon
} from 'lucide-react';
import { AppState, Student, Grade, Role } from '../types';
import { supabase } from '../services/supabaseClient';
import { parseGradesFromImage } from '../services/geminiService';

interface Props {
  state: AppState;
  students: Student[];
  grades: Grade[];
  onUpdateGrades: (newGrades: Grade[]) => void;
}

const subjects = [
  { id: 'TOAN', name: 'Toán Học' }, { id: 'VAN', name: 'Ngữ Văn' }, { id: 'ANH', name: 'Tiếng Anh' },
  { id: 'LY', name: 'Vật Lý' }, { id: 'HOA', name: 'Hóa Học' }, { id: 'SINH', name: 'Sinh Học' },
  { id: 'DIA', name: 'Địa Lý' }, { id: 'SU', name: 'Lịch Sử' }, { id: 'GDCD', name: 'GDCD' }
];

const GradeBoard: React.FC<Props> = ({ state, students, grades, onUpdateGrades }) => {
  const [viewMode, setViewMode] = useState<'DETAIL' | 'SUMMARY'>('DETAIL');
  const [selectedSubject, setSelectedSubject] = useState(subjects[0].id);
  const [selectedHK, setSelectedHK] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [numDGTX, setNumDGTX] = useState(4);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [tempGrades, setTempGrades] = useState<Grade[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => { 
    setTempGrades(grades); 
    setHasChanges(false); 
  }, [grades]);

  const txColumns = useMemo(() => 
    Array.from({ length: numDGTX }, (_, i) => `ĐGTX${i + 1}`), 
    [numDGTX]
  );
  
  const allColumns = useMemo(() => 
    [...txColumns, 'ĐGGK', 'ĐGCK'], 
    [txColumns]
  );

  const handleCsvGradeImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const newGrades: Grade[] = [...tempGrades];
      
      // Bỏ qua dòng header
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim());
        if (cols.length >= 3) {
          const maHS = cols[0];
          const loaiDiem = cols[2];
          const diemSo = parseFloat(cols[3]);
          
          if (maHS && loaiDiem && !isNaN(diemSo)) {
            const idx = newGrades.findIndex(g => 
              g.MaHS === maHS && 
              g.MaMonHoc === selectedSubject && 
              g.HocKy === selectedHK && 
              g.MaNienHoc === state.selectedYear &&
              g.LoaiDiem === loaiDiem
            );
            
            const newGrade: Grade = {
              MaDiem: idx > -1 ? newGrades[idx].MaDiem : Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000),
              MaHS: maHS,
              MaMonHoc: selectedSubject,
              MaNienHoc: state.selectedYear,
              HocKy: selectedHK,
              LoaiDiem: loaiDiem,
              DiemSo: diemSo
            };

            if (idx > -1) newGrades[idx] = newGrade;
            else newGrades.push(newGrade);
          }
        }
      }
      setTempGrades(newGrades);
      setHasChanges(true);
      alert(`Đã nhập điểm thành công từ file CSV!`);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleInputChange = (studentId: string, type: string, rawValue: string) => {
    let val = rawValue === '' ? 0 : parseFloat(rawValue);
    if (!rawValue.includes('.') && val > 10 && val <= 100) val = val / 10;
    
    setTempGrades(prev => {
      const updated = [...prev];
      const idx = updated.findIndex(g => 
        g.MaHS === studentId && 
        g.MaMonHoc === selectedSubject && 
        g.HocKy === selectedHK && 
        g.MaNienHoc === state.selectedYear &&
        g.LoaiDiem === type
      );

      const newGrade: Grade = { 
        MaDiem: idx > -1 ? updated[idx].MaDiem : Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 100000), 
        MaHS: studentId, 
        MaMonHoc: selectedSubject, 
        MaNienHoc: state.selectedYear, 
        HocKy: selectedHK, 
        LoaiDiem: type, 
        DiemSo: val 
      };

      if (idx > -1) {
        updated[idx] = newGrade;
      } else {
        updated.push(newGrade);
      }
      return updated;
    });
    setHasChanges(true);
  };

  const handleAiGradeImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsAiLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = (event.target?.result as string).split(',')[1];
        const results = await parseGradesFromImage(base64, file.type);
        
        if (results && results.length > 0) {
          setTempGrades(prev => {
            const updated = [...prev];
            results.forEach((res: any) => {
              const idx = updated.findIndex(g => 
                g.MaHS === res.MaHS && 
                g.MaMonHoc === selectedSubject && 
                g.HocKy === selectedHK && 
                g.MaNienHoc === state.selectedYear &&
                g.LoaiDiem === res.LoaiDiem
              );
              
              const newGrade = {
                MaDiem: idx > -1 ? updated[idx].MaDiem : Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000),
                MaHS: res.MaHS,
                MaMonHoc: selectedSubject,
                MaNienHoc: state.selectedYear,
                HocKy: selectedHK,
                LoaiDiem: res.LoaiDiem,
                DiemSo: res.DiemSo
              };

              if (idx > -1) updated[idx] = newGrade;
              else updated.push(newGrade);
            });
            return updated;
          });
          setHasChanges(true);
          alert(`AI đã nhận diện thành công ${results.length} đầu điểm!`);
        } else {
          alert("AI không nhận diện được bảng điểm nào trong ảnh.");
        }
      };
      reader.onerror = () => {
        alert("Lỗi đọc file ảnh.");
        setIsAiLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      alert("AI không thể đọc được bảng điểm từ file này. Hãy chắc chắn ảnh rõ nét.");
    } finally {
      setTimeout(() => setIsAiLoading(false), 2000);
    }
  };

  const downloadGradeTemplate = () => {
    const BOM = "\uFEFF";
    const headers = "MaHS,Hoten,LoaiDiem(ĐGTX1-5/ĐGGK/ĐGCK),DiemSo\n";
    const data = students.map(s => `${s.MaHS},${s.Hoten},ĐGTX1,`).join('\n');
    const blob = new Blob([BOM + headers + data], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Mau_Nhap_Diem_${selectedSubject}_Lop_${state.selectedClass}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      const currentContextGrades = tempGrades.filter(g => 
        g.MaMonHoc === selectedSubject && 
        g.HocKy === selectedHK &&
        g.MaNienHoc === state.selectedYear
      );

      const uniqueGradesMap = new Map<string, Grade>();
      currentContextGrades.forEach(g => {
        const key = `${g.MaHS}_${g.LoaiDiem}`;
        uniqueGradesMap.set(key, g);
      });

      const finalGradesToSave = Array.from(uniqueGradesMap.values());
      const { error } = await supabase.from('grades').upsert(finalGradesToSave, { onConflict: 'MaDiem' });
      if (error) throw error;
      
      await onUpdateGrades(tempGrades);
      setHasChanges(false);
      alert("Đã lưu bảng điểm thành công!");
    } catch (e: any) {
      alert("Lỗi lưu dữ liệu: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const calculateSubjectAvg = (studentId: string, subjectId: string, semester: number) => {
    const sGrades = tempGrades.filter(g => 
      g.MaHS === studentId && 
      g.MaMonHoc === subjectId && 
      g.HocKy === semester &&
      g.MaNienHoc === state.selectedYear
    );
    const dgtx = sGrades.filter(g => g.LoaiDiem.startsWith('ĐGTX')).map(g => g.DiemSo);
    const ggk = sGrades.find(g => g.LoaiDiem === 'ĐGGK')?.DiemSo;
    const gck = sGrades.find(g => g.LoaiDiem === 'ĐGCK')?.DiemSo;
    
    if (dgtx.length > 0 && ggk !== undefined && gck !== undefined) {
      return (dgtx.reduce((a, b) => a + b, 0) + ggk * 2 + gck * 3) / (dgtx.length + 5);
    }
    return null;
  };

  const filteredStudents = students.filter(s => s.Hoten.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-4 pb-32 animate-in fade-in">
      {/* Loading Overlay cho Quét AI Bảng Điểm */}
      {isAiLoading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-md animate-in fade-in">
           <div className="bg-white p-8 rounded-[40px] shadow-2xl flex flex-col items-center gap-4 border border-indigo-100">
              <div className="relative">
                 <div className="w-16 h-16 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin"></div>
                 <BrainCircuit className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600" size={24} />
              </div>
              <div className="text-center">
                 <p className="text-[11px] font-black text-slate-800 uppercase tracking-widest">AI đang đọc bảng điểm...</p>
                 <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Đang xử lý thị giác máy tính</p>
              </div>
           </div>
        </div>
      )}

      <div className="flex flex-col xl:flex-row gap-4">
        <div className="flex-1 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-50 pb-3">
             <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-100"><GraduationCap size={18} /></div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Ghi điểm bộ môn</h2>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Lớp {state.selectedClass} • HK {selectedHK}</p>
                </div>
             </div>
             
             <div className="flex items-center gap-2">
                <button onClick={downloadGradeTemplate} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-[10px] font-bold uppercase border border-slate-100 hover:bg-slate-100 transition-all">
                  <Download size={14}/> Mẫu
                </button>
                <label className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold uppercase border border-emerald-100 cursor-pointer hover:bg-emerald-100 transition-all">
                  <FileUp size={14} />
                  Nhập CSV
                  <input type="file" className="hidden" accept=".csv" onChange={handleCsvGradeImport} />
                </label>
                <label className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold uppercase border border-indigo-100 cursor-pointer hover:bg-indigo-100 transition-all">
                  <Camera size={14} />
                  Quét AI
                  <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleAiGradeImport} />
                </label>
             </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {subjects.map(sub => (
              <button 
                key={sub.id} 
                onClick={() => setSelectedSubject(sub.id)}
                className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase transition-all border ${selectedSubject === sub.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' : 'bg-white text-slate-500 border-slate-100 hover:border-indigo-200'}`}
              >
                {sub.name}
              </button>
            ))}
          </div>
        </div>

        <div className="w-full xl:w-80 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
           <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase px-1 tracking-widest">Tìm học sinh</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                <input type="text" placeholder="Nhập tên..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-100 rounded-xl outline-none text-xs font-normal focus:bg-white transition-all" />
              </div>
           </div>
           <div className="flex gap-2">
              <div className="flex-1 flex p-1 bg-slate-100 rounded-xl">
                 <button onClick={() => setViewMode('DETAIL')} className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all ${viewMode === 'DETAIL' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}><ListChecks size={14}/> Chi tiết</button>
                 <button onClick={() => setViewMode('SUMMARY')} className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all ${viewMode === 'SUMMARY' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}><Table size={14}/> Tổng hợp</button>
              </div>
              <div className="flex p-1 bg-slate-100 rounded-xl">
                 {[1, 2].map(hk => (
                   <button key={hk} onClick={() => setSelectedHK(hk)} className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all ${selectedHK === hk ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>HK{hk}</button>
                 ))}
              </div>
           </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <th className="px-5 py-4 w-12 text-center">STT</th>
                <th className="px-5 py-4 min-w-[180px]">Họ và Tên Học Sinh</th>
                {viewMode === 'DETAIL' ? (
                  <>
                    {allColumns.map(h => (
                      <th key={h} className={`px-2 py-4 text-center w-16 ${h === 'ĐGGK' || h === 'ĐGCK' ? 'bg-slate-50' : ''}`}>{h}</th>
                    ))}
                    <th className="px-5 py-4 text-center bg-indigo-50 text-indigo-600 font-black w-20">TB</th>
                  </>
                ) : (
                  <>
                    {subjects.map(sub => <th key={sub.id} className="px-2 py-4 text-center w-16">{sub.name.split(' ')[0]}</th>)}
                    <th className="px-5 py-4 text-center bg-emerald-50 text-emerald-700 font-black w-24">TB HK</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredStudents.map((s, idx) => {
                const tb = calculateSubjectAvg(s.MaHS, selectedSubject, selectedHK);
                return (
                  <tr key={s.MaHS} className="hover:bg-indigo-50/10 transition-colors group">
                    <td className="px-5 py-3 text-center font-normal text-slate-400 text-[11px]">{idx + 1}</td>
                    <td className="px-5 py-3 font-bold text-slate-800 text-xs whitespace-nowrap">
                       <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-300 font-normal">[{s.MaHS}]</span>
                          {s.Hoten}
                       </div>
                    </td>
                    {viewMode === 'DETAIL' ? (
                      <>
                        {allColumns.map(type => {
                          const gradeObj = tempGrades.find(g => 
                            g.MaHS === s.MaHS && 
                            g.MaMonHoc === selectedSubject && 
                            g.HocKy === selectedHK && 
                            g.MaNienHoc === state.selectedYear &&
                            g.LoaiDiem === type
                          );
                          return (
                            <td key={type} className={`px-2 py-2 text-center ${type === 'ĐGGK' || type === 'ĐGCK' ? 'bg-slate-50/30' : ''}`}>
                              <input 
                                type="number" step="0.1" min="0" max="10"
                                value={gradeObj?.DiemSo ?? ''} 
                                onChange={(e) => handleInputChange(s.MaHS, type, e.target.value)} 
                                placeholder="-" 
                                className="w-11 h-8 text-center font-normal text-xs bg-white border border-slate-100 rounded-lg focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 outline-none transition-all shadow-sm group-hover:border-slate-200" 
                              />
                            </td>
                          );
                        })}
                        <td className="px-5 py-3 text-center bg-indigo-50/30 font-bold text-indigo-600 text-xs">
                          {tb !== null ? tb.toFixed(1) : <span className="text-slate-300 opacity-50">--</span>}
                        </td>
                      </>
                    ) : (
                      <>
                        {subjects.map(sub => (
                          <td key={sub.id} className="px-2 py-3 text-center text-xs font-normal text-slate-500">
                            {calculateSubjectAvg(s.MaHS, sub.id, selectedHK)?.toFixed(1) || '-'}
                          </td>
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
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10">
          <div className="bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-6 border border-white/10 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">Dữ liệu chưa lưu</span>
            </div>
            <button 
              disabled={isSaving}
              onClick={handleSaveChanges} 
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Lưu bảng điểm
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GradeBoard;
