
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

const CSV_COLUMN_MAP: Record<string, string> = {
  'TX1': 'ĐGTX1',
  'TX2': 'ĐGTX2',
  'TX3': 'ĐGTX3',
  'TX4': 'ĐGTX4',
  'TX5': 'ĐGTX5',
  'GK': 'ĐGGK',
  'CK': 'ĐGCK'
};

const GradeBoard: React.FC<Props> = ({ state, students, grades, onUpdateGrades }) => {
  const [viewMode, setViewMode] = useState<'DETAIL' | 'SUMMARY'>('DETAIL');
  const [selectedSubject, setSelectedSubject] = useState(subjects[0].id);
  const [selectedHK, setSelectedHK] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [tempGrades, setTempGrades] = useState<Grade[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  const counterRef = useRef(0);
  const generateUniqueId = () => {
    counterRef.current += 1;
    const base = Math.floor(Date.now() / 1000) - 1700000000; 
    return base + counterRef.current;
  };

  useEffect(() => { 
    setTempGrades(grades); 
    setHasChanges(false); 
  }, [grades]);

  const parseCsvLine = (line: string) => {
    const result = [];
    let curVal = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(curVal.trim());
        curVal = '';
      } else {
        curVal += char;
      }
    }
    result.push(curVal.trim());
    return result.map(v => v.replace(/^"|"$/g, '').trim());
  };

  const txColumns = useMemo(() => ['ĐGTX1', 'ĐGTX2', 'ĐGTX3', 'ĐGTX4', 'ĐGTX5'], []);
  const allColumns = useMemo(() => [...txColumns, 'ĐGGK', 'ĐGCK'], [txColumns]);

  // SẮP XẾP VÀ LỌC LẠI CHÍNH XÁC (KHÔNG BỎ SÓT BẤT KỲ AI)
  const sortedStudents = useMemo(() => {
    return students
      .filter(s => {
        const matchesSearch = s.Hoten.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             s.MaHS.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
      })
      .sort((a, b) => a.MaHS.localeCompare(b.MaHS, undefined, { numeric: true, sensitivity: 'base' }));
  }, [students, searchTerm]);

  const handleExportCsv = () => {
    const BOM = "\uFEFF";
    const headers = "MaHS,Hoten,TX1,TX2,TX3,TX4,TX5,GK,CK,TrungBinh\n";
    
    const rows = sortedStudents.map(s => {
      const rowGrades = allColumns.map(type => {
        const g = tempGrades.find(tg => 
          tg.MaHS === s.MaHS && 
          tg.MaMonHoc === selectedSubject && 
          tg.HocKy === selectedHK && 
          tg.MaNienHoc === state.selectedYear &&
          tg.LoaiDiem === type
        );
        return g && g.DiemSo !== null ? g.DiemSo : "";
      });
      const tb = calculateSubjectAvg(s.MaHS, selectedSubject, selectedHK);
      return [s.MaHS, s.Hoten, ...rowGrades, tb !== null ? tb.toFixed(1) : ""].join(",");
    }).join("\n");

    const blob = new Blob([BOM + headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `BangDiem_${selectedSubject}_Lop${state.selectedClass}_HK${selectedHK}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCsvGradeImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length < 2) return;

      const newGrades: Grade[] = [...tempGrades];
      let changesDetected = false;

      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]);
        if (cols.length < 2) continue;

        const maHS = cols[0];
        const gradeHeaders = ['TX1', 'TX2', 'TX3', 'TX4', 'TX5', 'GK', 'CK'];
        
        gradeHeaders.forEach((header, idx) => {
          const colIndex = idx + 2;
          const diemValue = cols[colIndex];
          
          if (diemValue !== undefined && diemValue !== '') {
            const diemSo = parseFloat(diemValue);
            if (!isNaN(diemSo)) {
              const loaiDiemSystem = CSV_COLUMN_MAP[header];
              
              const existingIdx = newGrades.findIndex(g => 
                g.MaHS === maHS && 
                g.MaMonHoc === selectedSubject && 
                g.HocKy === selectedHK && 
                g.MaNienHoc === state.selectedYear &&
                g.LoaiDiem === loaiDiemSystem
              );

              if (existingIdx > -1) {
                newGrades[existingIdx] = { ...newGrades[existingIdx], DiemSo: diemSo };
              } else {
                newGrades.push({
                  MaDiem: generateUniqueId(),
                  MaHS: maHS,
                  MaMonHoc: selectedSubject,
                  MaNienHoc: state.selectedYear,
                  HocKy: selectedHK,
                  LoaiDiem: loaiDiemSystem,
                  DiemSo: diemSo
                });
              }
              changesDetected = true;
            }
          }
        });
      }

      if (changesDetected) {
        setTempGrades(newGrades);
        setHasChanges(true);
        alert(`Đã nhận dữ liệu. Nhấn "Đồng bộ ngay" để lưu.`);
      }
      e.target.value = '';
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleInputChange = (studentId: string, type: string, rawValue: string) => {
    setTempGrades(prev => {
      const updated = [...prev];
      const idx = updated.findIndex(g => 
        g.MaHS === studentId && 
        g.MaMonHoc === selectedSubject && 
        g.HocKy === selectedHK && 
        g.MaNienHoc === state.selectedYear &&
        g.LoaiDiem === type
      );

      if (rawValue === '') {
        if (idx > -1) {
          updated[idx] = { ...updated[idx], DiemSo: null as any };
        }
        return updated;
      }

      let val = parseFloat(rawValue);
      if (val < 0) val = 0; if (val > 10) val = 10;
      
      if (idx > -1) {
        updated[idx] = { ...updated[idx], DiemSo: val };
      } else {
        updated.push({ 
          MaDiem: generateUniqueId(), 
          MaHS: studentId, 
          MaMonHoc: selectedSubject, 
          MaNienHoc: state.selectedYear, 
          HocKy: selectedHK, 
          LoaiDiem: type, 
          DiemSo: val 
        });
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
              
              if (idx > -1) {
                updated[idx] = { ...updated[idx], DiemSo: res.DiemSo };
              } else {
                updated.push({
                  MaDiem: generateUniqueId(),
                  MaHS: res.MaHS,
                  MaMonHoc: selectedSubject,
                  MaNienHoc: state.selectedYear,
                  HocKy: selectedHK,
                  LoaiDiem: res.LoaiDiem,
                  DiemSo: res.DiemSo
                });
              }
            });
            return updated;
          });
          setHasChanges(true);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      alert("Lỗi AI");
    } finally {
      setTimeout(() => setIsAiLoading(false), 1500);
    }
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      const currentContextGrades = tempGrades.filter(g => 
        g.MaMonHoc === selectedSubject && 
        g.HocKy === selectedHK &&
        g.MaNienHoc === state.selectedYear
      );

      const toUpsert = currentContextGrades.filter(g => g.DiemSo !== null && g.DiemSo !== undefined);
      const toDelete = currentContextGrades.filter(g => g.DiemSo === null || g.DiemSo === undefined);

      if (toUpsert.length > 0) {
        const uniqueUpsert = Array.from(new Map(toUpsert.map(item => [item.MaDiem, item])).values());
        const { error: upsertError } = await supabase.from('grades').upsert(uniqueUpsert);
        if (upsertError) throw upsertError;
      }

      if (toDelete.length > 0) {
        const idsToDelete = toDelete.map(g => g.MaDiem);
        await supabase.from('grades').delete().in('MaDiem', idsToDelete);
      }

      onUpdateGrades(tempGrades.filter(g => g.DiemSo !== null));
      setHasChanges(false);
      alert("Đồng bộ hoàn tất!");
    } catch (e: any) {
      alert("Lỗi: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const calculateSubjectAvg = (studentId: string, subjectId: string, semester: number) => {
    const sGrades = tempGrades.filter(g => 
      g.MaHS === studentId && 
      g.MaMonHoc === subjectId && 
      g.HocKy === semester &&
      g.MaNienHoc === state.selectedYear &&
      g.DiemSo !== null && g.DiemSo !== undefined
    );
    const dgtx = sGrades.filter(g => g.LoaiDiem.startsWith('ĐGTX')).map(g => g.DiemSo);
    const ggk = sGrades.find(g => g.LoaiDiem === 'ĐGGK')?.DiemSo;
    const gck = sGrades.find(g => g.LoaiDiem === 'ĐGCK')?.DiemSo;
    
    if (dgtx.length > 0 && ggk !== undefined && gck !== undefined) {
      return (dgtx.reduce((a, b) => a + b, 0) + ggk * 2 + gck * 3) / (dgtx.length + 5);
    }
    return null;
  };

  return (
    <div className="space-y-4 pb-32 animate-in fade-in">
      {isAiLoading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-md">
           <div className="bg-white p-8 rounded-[40px] shadow-2xl flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
              <p className="text-[11px] font-black text-slate-800 uppercase tracking-widest">AI đang xử lý...</p>
           </div>
        </div>
      )}

      <div className="flex flex-col xl:flex-row gap-4">
        <div className="flex-1 bg-white p-5 rounded-[32px] border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-50 pb-4">
             <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-100"><GraduationCap size={20} /></div>
                <div>
                  <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Bảng điểm lớp {state.selectedClass}</h2>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Học kỳ {selectedHK} • Môn {subjects.find(s => s.id === selectedSubject)?.name}</p>
                </div>
             </div>
             
             <div className="flex items-center gap-2">
                <button 
                  onClick={handleExportCsv}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase hover:bg-slate-200 transition-all border border-slate-200"
                >
                  <Download size={16} /> Xuất CSV
                </button>
                <label className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase border border-emerald-100 cursor-pointer hover:bg-emerald-100 transition-all">
                  <FileUp size={16} /> Nhập CSV
                  <input type="file" className="hidden" accept=".csv" onChange={handleCsvGradeImport} />
                </label>
                <label className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase border border-indigo-100 cursor-pointer hover:bg-indigo-100 transition-all">
                  <Camera size={16} /> Quét AI
                  <input type="file" className="hidden" accept="image/*" onChange={handleAiGradeImport} />
                </label>
             </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {subjects.map(sub => (
              <button 
                key={sub.id} 
                onClick={() => setSelectedSubject(sub.id)}
                className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase transition-all border ${selectedSubject === sub.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white text-slate-500 border-slate-100 hover:border-indigo-200'}`}
              >
                {sub.name}
              </button>
            ))}
          </div>
        </div>

        <div className="w-full xl:w-80 bg-white p-5 rounded-[32px] border border-slate-200 shadow-sm space-y-4">
           <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase px-1 tracking-widest">Tìm học sinh</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                <input type="text" placeholder="Tên hoặc mã..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none text-xs font-bold" />
              </div>
           </div>
           <div className="flex gap-2">
              <div className="flex-1 flex p-1 bg-slate-100 rounded-xl">
                 <button onClick={() => setViewMode('DETAIL')} className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${viewMode === 'DETAIL' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Chi tiết</button>
                 <button onClick={() => setViewMode('SUMMARY')} className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${viewMode === 'SUMMARY' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Tổng hợp</button>
              </div>
              <div className="flex p-1 bg-slate-100 rounded-xl">
                 {[1, 2].map(hk => (
                   <button key={hk} onClick={() => setSelectedHK(hk)} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${selectedHK === hk ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400'}`}>HK{hk}</button>
                 ))}
              </div>
           </div>
        </div>
      </div>

      <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <th className="px-6 py-5 w-16 text-center">STT</th>
                <th className="px-6 py-5 min-w-[200px]">Học Sinh</th>
                {viewMode === 'DETAIL' ? (
                  <>
                    {allColumns.map(h => (
                      <th key={h} className={`px-2 py-5 text-center w-16 ${h.includes('GK') || h.includes('CK') ? 'bg-slate-50' : ''}`}>{h}</th>
                    ))}
                    <th className="px-6 py-5 text-center bg-indigo-50 text-indigo-600 w-24">TB Môn</th>
                  </>
                ) : (
                  <>
                    {subjects.map(sub => <th key={sub.id} className="px-2 py-5 text-center w-16">{sub.name.split(' ')[0]}</th>)}
                    <th className="px-6 py-5 text-center bg-emerald-50 text-emerald-700 w-24">TB HK</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sortedStudents.map((s, idx) => {
                const tb = calculateSubjectAvg(s.MaHS, selectedSubject, selectedHK);
                return (
                  <tr key={s.MaHS} className="hover:bg-indigo-50/10 transition-colors group">
                    <td className="px-6 py-4 text-center font-bold text-slate-300 text-xs">{idx + 1}</td>
                    <td className="px-6 py-4 font-black text-slate-800 text-xs whitespace-nowrap">
                       <div className="flex items-center gap-2">
                          <span className="text-[10px] text-indigo-400 font-bold">[{s.MaHS}]</span>
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
                          const currentVal = (gradeObj && gradeObj.DiemSo !== null) ? gradeObj.DiemSo : '';
                          
                          return (
                            <td key={type} className={`px-2 py-3 text-center ${type.includes('GK') || type.includes('CK') ? 'bg-slate-50/30' : ''}`}>
                              <input 
                                type="number" step="0.1" min="0" max="10"
                                value={currentVal} 
                                onChange={(e) => handleInputChange(s.MaHS, type, e.target.value)} 
                                placeholder="-" 
                                className="w-12 h-9 text-center font-black text-xs bg-white border border-slate-200 rounded-xl focus:border-indigo-400 outline-none shadow-sm" 
                              />
                            </td>
                          );
                        })}
                        <td className="px-6 py-4 text-center bg-indigo-50/30 font-black text-indigo-600 text-sm">
                          {tb !== null ? tb.toFixed(1) : '--'}
                        </td>
                      </>
                    ) : (
                      <>
                        {subjects.map(sub => (
                          <td key={sub.id} className="px-2 py-4 text-center text-[11px] font-bold text-slate-500">
                            {calculateSubjectAvg(s.MaHS, sub.id, selectedHK)?.toFixed(1) || '-'}
                          </td>
                        ))}
                        <td className="px-6 py-4 text-center bg-emerald-50/30 font-black text-emerald-600 text-sm">--</td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {sortedStudents.length === 0 && (
          <div className="py-20 text-center text-slate-400 uppercase text-[10px] font-black tracking-widest">
            Không tìm thấy dữ liệu học sinh lớp {state.selectedClass}
          </div>
        )}
      </div>

      {hasChanges && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10">
          <button 
            disabled={isSaving}
            onClick={handleSaveChanges} 
            className="px-10 py-4 bg-slate-900 text-white rounded-[20px] shadow-2xl flex items-center gap-3 font-black text-[11px] uppercase tracking-widest hover:bg-black active:scale-95 transition-all"
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Đồng bộ vĩnh viễn
          </button>
        </div>
      )}
    </div>
  );
};

export default GradeBoard;
