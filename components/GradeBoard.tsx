
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
// Hệ thống hỗ trợ tối đa 5 cột TX, 1 GK, 1 CK
const GRADE_COLUMNS = ['ĐGTX1', 'ĐGTX2', 'ĐGTX3', 'ĐGTX4', 'ĐGTX5', 'ĐGGK', 'ĐGCK'];

const GradeBoard: React.FC<Props> = ({ state, students, grades, onUpdateGrades }) => {
  const [selectedSubject, setSelectedSubject] = useState(subjects[0].id);
  const [selectedHK, setSelectedHK] = useState(1);
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

    const tx = ['ĐGTX1', 'ĐGTX2', 'ĐGTX3', 'ĐGTX4', 'ĐGTX5']
      .map(key => sourceGrades[key])
      .filter(v => v !== null && v !== undefined) as number[];
      
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
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
      if (lines.length < 2) return;

      const header = lines[0].split(',').map(h => h.trim().toUpperCase());
      const rows = lines.slice(1);
      const upsertData: any[] = [];

      // Phân tích cấu trúc file dựa trên số lượng cột điểm (cột 0: MaHS, 1: HoTen)
      // Nếu file có tổng 8 cột -> Điểm ở index 2,3,4,5 (TX), 6 (GK), 7 (CK) -> Thiếu TX5
      // Nếu file có tổng 9 cột -> Điểm ở index 2,3,4,5,6 (TX), 7 (GK), 8 (CK) -> Đủ TX5

      rows.forEach(row => {
        const cols = row.split(',').map(c => c.trim());
        if (cols.length >= 6) {
          const maHS = cols[0];
          
          // Xác định danh sách loại điểm tương ứng với vị trí cột trong file thực tế
          let mapping: string[] = [];
          if (cols.length === 8) {
            // File 6 cột điểm: TX1, TX2, TX3, TX4, GK, CK
            mapping = ['ĐGTX1', 'ĐGTX2', 'ĐGTX3', 'ĐGTX4', 'ĐGGK', 'ĐGCK'];
          } else {
            // File 7 cột điểm (hoặc nhiều hơn): TX1, TX2, TX3, TX4, TX5, GK, CK
            mapping = ['ĐGTX1', 'ĐGTX2', 'ĐGTX3', 'ĐGTX4', 'ĐGTX5', 'ĐGGK', 'ĐGCK'];
          }

          mapping.forEach((type, idx) => {
            const val = cols[idx + 2];
            if (val !== undefined && val !== '') {
              const num = parseFloat(val);
              if (!isNaN(num)) {
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
            }
          });
        }
      });

      if (upsertData.length > 0) {
        setIsProcessing(true);
        const { error } = await supabase.from('grades').upsert(upsertData);
        if (error) alert(error.message);
        else {
           await onUpdateGrades();
           alert(`Đã nhập xong ${upsertData.length} đầu điểm cho HK${selectedHK}.`);
        }
        setIsProcessing(false);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-2 pb-20 animate-in fade-in">
      {/* HEADER SHARP NAVY */}
      <div className="bg-[#0f172a] text-white p-2 flex flex-col lg:flex-row lg:items-center justify-between gap-2 border-b border-slate-700 rounded-none shadow-none">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-orange-500 rounded-none"><GraduationCap size={16} /></div>
          <div>
            <h2 className="text-[10px] font-black uppercase tracking-widest">Bảng điểm môn: {subjects.find(s => s.id === selectedSubject)?.name}</h2>
            <p className="text-[8px] text-slate-400 font-bold uppercase">Niên học: {state.selectedYear}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Nút chọn Học kỳ chính */}
          <div className="flex bg-slate-800 p-0.5 border border-slate-700 rounded-none">
            {[1, 2].map(hk => (
              <button 
                key={hk} onClick={() => setSelectedHK(hk)}
                className={`px-4 py-1 text-[8px] font-black uppercase transition-all rounded-none ${selectedHK === hk ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Học kỳ {hk}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" size={10} />
            <input 
              type="text" placeholder="Tìm kiếm..." 
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)} 
              className="pl-6 pr-2 py-1 bg-slate-800 border border-slate-700 text-[9px] w-32 focus:ring-1 focus:ring-orange-500 outline-none text-white rounded-none" 
            />
          </div>

          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-[8px] font-black uppercase transition-all rounded-none shadow-sm">
            <FileUp size={12} /> Nhập CSV
          </button>
          <input type="file" ref={fileInputRef} onChange={handleImportCSV} accept=".csv" className="hidden" />
        </div>
      </div>

      {/* MÔN HỌC SHARP */}
      <div className="flex flex-wrap gap-0.5">
        {subjects.map(s => (
          <button 
            key={s.id} onClick={() => { setSelectedSubject(s.id); setCurrentPage(1); }} 
            className={`px-2 py-1 text-[8px] font-black uppercase border transition-all rounded-none ${selectedSubject === s.id ? 'bg-orange-500 text-white border-orange-600 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* BẢNG CHÍNH COMPACT */}
      <div className="bg-white border border-slate-200 shadow-none overflow-hidden rounded-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#1e293b] text-white text-[8px] font-black uppercase tracking-tighter border-b border-slate-700">
                <th className="p-2 w-8 text-center border-r border-slate-700">STT</th>
                <th className="p-2 w-20 border-r border-slate-700">Mã HS</th>
                <th className="p-2 border-r border-slate-700">Học và Tên Học Sinh</th>
                <th className="p-2 text-center w-20 border-r border-slate-700">ĐTB HK1</th>
                <th className="p-2 text-center w-20 border-r border-slate-700">ĐTB HK2</th>
                <th className="p-2 text-center w-24 bg-orange-600 border-r border-orange-700 font-black">Cả Năm</th>
                <th className="p-2 text-center w-12">Sửa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedStudents.map((s, idx) => {
                const tb1 = calculateAvg(s.MaHS, 1, selectedSubject);
                const tb2 = calculateAvg(s.MaHS, 2, selectedSubject);
                const cn = (tb1 !== null && tb2 !== null) ? (tb1 + tb2 * 2) / 3 : null;

                return (
                  <tr key={s.MaHS} className="hover:bg-slate-50 transition-colors text-[9px] font-bold">
                    <td className="p-1.5 text-center text-slate-400 border-r border-slate-100">{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                    <td className="p-1.5 text-slate-500 border-r border-slate-100">{s.MaHS}</td>
                    <td className="p-1.5 text-slate-800 uppercase border-r border-slate-100 truncate max-w-[150px]">{s.Hoten}</td>
                    <td className="p-1.5 text-center border-r border-slate-100 text-slate-600">{tb1 ? tb1.toFixed(1) : '--'}</td>
                    <td className="p-1.5 text-center border-r border-slate-100 text-slate-600">{tb2 ? tb2.toFixed(1) : '--'}</td>
                    <td className="p-1.5 text-center bg-orange-50 font-black text-orange-700 border-r border-orange-100">{cn ? cn.toFixed(1) : '--'}</td>
                    <td className="p-1.5 text-center">
                      <button onClick={() => handleOpenDetail(s)} className="p-1.5 bg-slate-900 text-white hover:bg-orange-500 transition-all rounded-none shadow-sm">
                        <Eye size={10} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* PHÂN TRANG GỌN */}
        <div className="p-1.5 bg-[#f8fafc] border-t flex items-center justify-between">
          <span className="text-[8px] font-black text-slate-400 uppercase">Trang {currentPage} / {totalPages || 1}</span>
          <div className="flex gap-1">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1 bg-white border border-slate-200 text-slate-400 disabled:opacity-20 hover:border-orange-500 rounded-none transition-all"><ChevronLeft size={10} /></button>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-1 bg-white border border-slate-200 text-slate-400 disabled:opacity-20 hover:border-orange-500 rounded-none transition-all"><ChevronRight size={10} /></button>
          </div>
        </div>
      </div>

      {/* MODAL CHI TIẾT SONG HÀNH - SHARP RECTANGLE */}
      {editingStudent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-none animate-in fade-in">
          <div className="bg-white w-full max-w-5xl shadow-2xl rounded-none overflow-hidden animate-in zoom-in-95 border-t-4 border-orange-500 flex flex-col max-h-[95vh]">
            {/* Header Modal - Navy */}
            <div className="bg-[#0f172a] text-white p-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500 flex items-center justify-center font-black text-lg rounded-none">{editingStudent.Hoten.charAt(0)}</div>
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-tight leading-none mb-1">{editingStudent.Hoten}</h3>
                  <p className="text-[8px] text-slate-400 font-bold uppercase">Mã: {editingStudent.MaHS} | Môn: {subjects.find(s => s.id === selectedSubject)?.name}</p>
                </div>
              </div>
              <button onClick={() => setEditingStudent(null)} className="p-2 hover:bg-slate-800 text-slate-400 transition-colors rounded-none"><X size={20} /></button>
            </div>

            {/* Body Modal - 2 Cột cạnh nhau */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50 flex flex-col md:flex-row gap-4 custom-scrollbar">
              {[1, 2].map(hk => (
                <div key={hk} className="flex-1 bg-white border border-slate-200 p-4 rounded-none shadow-none">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-4">
                    <h4 className="text-[9px] font-black text-slate-800 uppercase tracking-widest border-l-2 border-orange-500 pl-2">Học kỳ {hk}</h4>
                    <div className="text-right">
                       <p className="text-[7px] text-slate-400 font-bold uppercase">Điểm TB dự kiến</p>
                       <p className="text-xs font-black text-orange-600">{calculateAvg(editingStudent.MaHS, hk, selectedSubject, localGrades[hk.toString()])?.toFixed(1) || '--'}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {GRADE_COLUMNS.map(col => (
                      <div key={col} className="space-y-1">
                        <label className="text-[7px] font-black text-slate-400 uppercase block px-1">{col}</label>
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
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-none text-[10px] font-black text-slate-800 text-center focus:border-orange-500 focus:bg-white outline-none transition-all shadow-inner" 
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Modal */}
            <div className="bg-white p-4 flex flex-col md:flex-row items-center justify-between border-t border-slate-200 gap-4 shrink-0">
               <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Điểm Cả năm (Dự kiến)</p>
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
                 <button onClick={() => setEditingStudent(null)} className="flex-1 md:flex-none px-6 py-2.5 bg-slate-100 text-slate-500 rounded-none border border-slate-200 hover:bg-slate-200 transition-all font-black text-[10px] uppercase">Hủy bỏ</button>
                 <button 
                   onClick={saveDetail} 
                   disabled={isProcessing}
                   className="flex-[2] md:flex-none px-10 py-2.5 bg-[#0f172a] text-white rounded-none shadow-none flex items-center justify-center gap-2 hover:bg-orange-600 active:scale-95 transition-all font-black text-[10px] uppercase"
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
