
import React, { useState, useMemo, useRef } from 'react';
import { 
  GraduationCap, Save, Loader2, Search, FileUp, Eye, X, User, ChevronLeft, ChevronRight
} from 'lucide-react';
import { AppState, Student, Grade } from '../types';
import { supabase } from '../services/supabaseClient';

interface Props {
  state: AppState;
  students: Student[];
  grades: Grade[];
  onUpdateGrades: () => Promise<void>;
}

const subjects = [
  { id: 'TOAN', name: 'Toán' }, { id: 'VAN', name: 'Văn' }, { id: 'ANH', name: 'Anh' },
  { id: 'LY', name: 'Lý' }, { id: 'HOA', name: 'Hóa' }, { id: 'SINH', name: 'Sinh' },
  { id: 'DIA', name: 'Địa' }, { id: 'SU', name: 'Sử' }, { id: 'GDCD', name: 'GDCD' }
];

const ITEMS_PER_PAGE = 15;
const GRADE_COLUMNS = ['ĐGTX1', 'ĐGTX2', 'ĐGTX3', 'ĐGTX4', 'ĐGGK', 'ĐGCK'];

const GradeBoard: React.FC<Props> = ({ state, students, grades, onUpdateGrades }) => {
  const [selectedSubject, setSelectedSubject] = useState(subjects[0].id);
  const [selectedHK, setSelectedHK] = useState(1); // Trạng thái học kỳ làm việc chính
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [localGrades, setLocalGrades] = useState<Record<string, Record<string, number | null>>>({
    '1': {}, '2': {}
  });

  const filteredStudents = useMemo(() => {
    return students
      .filter(s => 
        s.Hoten.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.MaHS.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => a.MaHS.localeCompare(b.MaHS, undefined, { numeric: true }));
  }, [students, searchTerm]);

  const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredStudents.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredStudents, currentPage]);

  const calculateAvg = (maHS: string, hk: number, subjectId: string, currentLocalGrades?: Record<string, number | null>) => {
    let sourceGrades: Record<string, number | null> = {};
    
    if (currentLocalGrades) {
      sourceGrades = currentLocalGrades;
    } else {
      const records = grades.filter(g => 
        g.MaHS === maHS && 
        g.MaMonHoc === subjectId && 
        Number(g.HocKy) === Number(hk) && 
        Number(g.MaNienHoc) === Number(state.selectedYear)
      );
      if (records.length === 0) return null;
      records.forEach(r => sourceGrades[r.LoaiDiem] = r.DiemSo);
    }

    const tx = [sourceGrades['ĐGTX1'], sourceGrades['ĐGTX2'], sourceGrades['ĐGTX3'], sourceGrades['ĐGTX4']].filter(v => v !== null && v !== undefined) as number[];
    const gk = sourceGrades['ĐGGK'];
    const ck = sourceGrades['ĐGCK'];

    if (tx.length === 0 && (gk === null || gk === undefined) && (ck === null || ck === undefined)) return null;

    let totalScore = 0;
    let totalWeight = 0;
    tx.forEach(v => { totalScore += v; totalWeight += 1; });
    if (gk !== null && gk !== undefined) { totalScore += (gk * 2); totalWeight += 2; }
    if (ck !== null && ck !== undefined) { totalScore += (ck * 3); totalWeight += 3; }

    return totalWeight > 0 ? totalScore / totalWeight : null;
  };

  const handleOpenDetail = (student: Student) => {
    const data: Record<string, Record<string, number | null>> = { '1': {}, '2': {} };
    [1, 2].forEach(hk => {
      GRADE_COLUMNS.forEach(col => data[hk.toString()][col] = null);
      const currentGrades = grades.filter(g => 
        g.MaHS === student.MaHS && 
        g.MaMonHoc === selectedSubject && 
        Number(g.HocKy) === Number(hk) && 
        Number(g.MaNienHoc) === Number(state.selectedYear)
      );
      currentGrades.forEach(g => data[hk.toString()][g.LoaiDiem] = g.DiemSo);
    });
    setLocalGrades(data);
    setEditingStudent(student);
  };

  const saveDetail = async () => {
    if (!editingStudent) return;
    setIsProcessing(true);
    try {
      const upsertData: any[] = [];
      [1, 2].forEach(hk => {
        GRADE_COLUMNS.forEach(type => {
          const val = localGrades[hk.toString()][type];
          if (val !== null && val !== undefined && !isNaN(val)) {
            const old = grades.find(g => 
              g.MaHS === editingStudent.MaHS && 
              g.MaMonHoc === selectedSubject && 
              Number(g.HocKy) === Number(hk) && 
              Number(g.MaNienHoc) === Number(state.selectedYear) && 
              g.LoaiDiem === type
            );
            upsertData.push({
              ...(old ? { MaDiem: old.MaDiem } : { MaDiem: Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 100000) }),
              MaHS: editingStudent.MaHS, MaMonHoc: selectedSubject, MaNienHoc: state.selectedYear, 
              HocKy: hk, LoaiDiem: type, DiemSo: val
            });
          }
        });
      });

      if (upsertData.length > 0) {
        await supabase.from('grades').upsert(upsertData);
        await onUpdateGrades();
      }
      setEditingStudent(null);
    } catch (e: any) {
      alert("Lỗi: " + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      const rows = text.split(/\r?\n/).filter(line => line.trim() !== '').slice(1);
      const upsertData: any[] = [];

      rows.forEach(row => {
        const cols = row.split(',').map(c => c.trim());
        if (cols.length >= 3) {
          const maHS = cols[0];
          GRADE_COLUMNS.forEach((type, idx) => {
            const val = cols[idx + 2];
            const num = (val === '' || isNaN(parseFloat(val))) ? null : parseFloat(val);
            if (num !== null) {
              const old = grades.find(g => 
                g.MaHS === maHS && 
                g.MaMonHoc === selectedSubject && 
                Number(g.HocKy) === Number(selectedHK) && 
                Number(g.MaNienHoc) === Number(state.selectedYear) && 
                g.LoaiDiem === type
              );
              upsertData.push({
                ...(old ? { MaDiem: old.MaDiem } : { MaDiem: Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 100000) }),
                MaHS: maHS, MaMonHoc: selectedSubject, MaNienHoc: state.selectedYear, 
                HocKy: selectedHK, LoaiDiem: type, DiemSo: num
              });
            }
          });
        }
      });

      if (upsertData.length > 0) {
        setIsProcessing(true);
        await supabase.from('grades').upsert(upsertData);
        await onUpdateGrades();
        setIsProcessing(false);
        alert("Đã nhập điểm từ file thành công cho HK" + selectedHK);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-3 pb-20 animate-in fade-in">
      {/* THANH ĐIỀU KHIỂN CHÍNH - NAVY BLUE */}
      <div className="bg-[#0f172a] text-white p-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shadow-md rounded-none">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-500 rounded-none"><GraduationCap size={18} /></div>
          <div>
            <h2 className="text-[11px] font-black uppercase tracking-widest">Bảng điểm môn: {subjects.find(s => s.id === selectedSubject)?.name}</h2>
            <p className="text-[9px] text-slate-400 font-bold uppercase">Niên học: {state.selectedYear}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Nút chọn HK bảng chính */}
          <div className="flex bg-slate-800 p-0.5 rounded-none border border-slate-700">
            {[1, 2].map(hk => (
              <button 
                key={hk} onClick={() => setSelectedHK(hk)}
                className={`px-4 py-1.5 text-[9px] font-black uppercase transition-all ${selectedHK === hk ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Học kỳ {hk}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" size={12} />
            <input 
              type="text" placeholder="Tìm tên/mã..." 
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)} 
              className="pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 text-[10px] w-40 focus:ring-1 focus:ring-orange-500 outline-none text-white" 
            />
          </div>

          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-[9px] font-black uppercase transition-all shadow-sm">
            <FileUp size={14} /> Import CSV
          </button>
          <input type="file" ref={fileInputRef} onChange={handleImportCSV} accept=".csv" className="hidden" />
        </div>
      </div>

      {/* CHỌN MÔN HỌC COMPACT */}
      <div className="flex flex-wrap gap-1">
        {subjects.map(s => (
          <button 
            key={s.id} onClick={() => { setSelectedSubject(s.id); setCurrentPage(1); }} 
            className={`px-3 py-1 text-[9px] font-black uppercase border transition-all ${selectedSubject === s.id ? 'bg-orange-500 text-white border-orange-600 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* BẢNG ĐIỂM DẠNG GỌN */}
      <div className="bg-white border border-slate-200 shadow-lg overflow-hidden rounded-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#1e293b] text-white text-[9px] font-black uppercase tracking-tighter border-b border-slate-700">
                <th className="p-2 w-10 text-center border-r border-slate-700">STT</th>
                <th className="p-2 w-24 border-r border-slate-700">Mã HS</th>
                <th className="p-2 min-w-[180px] border-r border-slate-700">Họ và Tên Học Sinh</th>
                <th className="p-2 text-center w-24 border-r border-slate-700">TB HK1</th>
                <th className="p-2 text-center w-24 border-r border-slate-700">TB HK2</th>
                <th className="p-2 text-center w-28 bg-orange-600 border-r border-orange-700">Cả Năm</th>
                <th className="p-2 text-center w-20">Sửa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedStudents.map((s, idx) => {
                const tb1 = calculateAvg(s.MaHS, 1, selectedSubject);
                const tb2 = calculateAvg(s.MaHS, 2, selectedSubject);
                const cn = (tb1 !== null && tb2 !== null) ? (tb1 + tb2 * 2) / 3 : null;

                return (
                  <tr key={s.MaHS} className="hover:bg-slate-50 transition-colors text-[10px] font-bold">
                    <td className="p-1.5 text-center text-slate-400 border-r border-slate-100">{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                    <td className="p-1.5 text-slate-500 border-r border-slate-100">{s.MaHS}</td>
                    <td className="p-1.5 text-slate-800 uppercase border-r border-slate-100">{s.Hoten}</td>
                    <td className="p-1.5 text-center border-r border-slate-100 text-slate-600">{tb1 ? tb1.toFixed(1) : '--'}</td>
                    <td className="p-1.5 text-center border-r border-slate-100 text-slate-600">{tb2 ? tb2.toFixed(1) : '--'}</td>
                    <td className="p-1.5 text-center bg-orange-50/50 font-black text-orange-700 border-r border-orange-100">{cn ? cn.toFixed(1) : '--'}</td>
                    <td className="p-1.5 text-center">
                      <button onClick={() => handleOpenDetail(s)} className="p-1.5 bg-slate-100 text-slate-600 hover:bg-orange-500 hover:text-white transition-all shadow-sm border border-slate-200">
                        <Eye size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* PHÂN TRANG GỌN */}
        <div className="p-2 bg-[#f8fafc] border-t flex items-center justify-between">
          <span className="text-[9px] font-black text-slate-400 uppercase">TRANG {currentPage} / {totalPages || 1}</span>
          <div className="flex gap-1">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1 bg-white border border-slate-200 text-slate-400 disabled:opacity-20 hover:border-orange-500"><ChevronLeft size={14} /></button>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-1 bg-white border border-slate-200 text-slate-400 disabled:opacity-20 hover:border-orange-500"><ChevronRight size={14} /></button>
          </div>
        </div>
      </div>

      {/* MODAL CHI TIẾT - SHARP RECTANGLE (Không bo góc) */}
      {editingStudent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-4xl shadow-2xl rounded-none overflow-hidden animate-in zoom-in-95 border-t-4 border-orange-500 flex flex-col max-h-[90vh]">
            {/* Header Modal */}
            <div className="bg-[#0f172a] text-white p-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500 flex items-center justify-center font-black text-lg">{editingStudent.Hoten.charAt(0)}</div>
                <div>
                  <h3 className="text-[11px] font-black uppercase tracking-tight leading-none mb-1">{editingStudent.Hoten}</h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">ID: {editingStudent.MaHS} | Môn: {subjects.find(s => s.id === selectedSubject)?.name}</p>
                </div>
              </div>
              <button onClick={() => setEditingStudent(null)} className="p-2 hover:bg-slate-800 text-slate-400 transition-colors"><X size={20} /></button>
            </div>

            {/* Body Modal - 2 Cột song song */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50 flex flex-col md:flex-row gap-6 custom-scrollbar">
              {[1, 2].map(hk => (
                <div key={hk} className="flex-1 bg-white border border-slate-200 p-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-4">
                    <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest border-l-2 border-orange-500 pl-2">Học kỳ {hk}</h4>
                    <div className="text-right">
                       <p className="text-[8px] text-slate-400 font-bold uppercase">Điểm TB dự kiến</p>
                       <p className="text-sm font-black text-orange-600">{calculateAvg(editingStudent.MaHS, hk, selectedSubject, localGrades[hk.toString()])?.toFixed(1) || '--'}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {GRADE_COLUMNS.map(col => (
                      <div key={col} className="space-y-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase block px-1">{col}</label>
                        <input 
                          type="number" step="0.1" min="0" max="10"
                          value={localGrades[hk.toString()][col] ?? ''} 
                          onChange={(e) => {
                            const val = e.target.value === '' ? null : parseFloat(e.target.value);
                            if (val !== null && (val < 0 || val > 10)) return;
                            setLocalGrades(prev => ({
                              ...prev,
                              [hk.toString()]: { ...prev[hk.toString()], [col]: val }
                            }));
                          }}
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-none text-[11px] font-black text-slate-800 text-center focus:border-orange-500 focus:bg-white outline-none transition-all shadow-inner" 
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Modal */}
            <div className="bg-white p-4 flex flex-col md:flex-row items-center justify-between border-t border-slate-200 gap-4 shrink-0">
               <div className="flex items-center gap-8">
                  <div className="text-center">
                    <p className="text-[8px] font-black text-slate-400 uppercase">Điểm Cả năm (Dự kiến)</p>
                    <p className="text-xl font-black text-slate-900 leading-none mt-1">
                      {(() => {
                        const tb1 = calculateAvg(editingStudent.MaHS, 1, selectedSubject, localGrades['1']);
                        const tb2 = calculateAvg(editingStudent.MaHS, 2, selectedSubject, localGrades['2']);
                        return (tb1 !== null && tb2 !== null) ? ((tb1 + tb2 * 2) / 3).toFixed(1) : '--';
                      })()}
                    </p>
                  </div>
               </div>

               <div className="flex gap-2 w-full md:w-auto">
                 <button onClick={() => setEditingStudent(null)} className="flex-1 md:flex-none px-6 py-2.5 bg-slate-100 text-slate-500 text-[10px] font-black uppercase rounded-none border border-slate-200 hover:bg-slate-200 transition-all">Hủy bỏ</button>
                 <button 
                   onClick={saveDetail} 
                   disabled={isProcessing}
                   className="flex-[2] md:flex-none px-10 py-2.5 bg-[#0f172a] text-white text-[10px] font-black uppercase rounded-none shadow-lg flex items-center justify-center gap-2 hover:bg-orange-600 transition-all"
                 >
                   {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Lưu kết quả
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GradeBoard;
