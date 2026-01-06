
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
  { id: 'TOAN', name: 'Toán Học' }, { id: 'VAN', name: 'Ngữ Văn' }, { id: 'ANH', name: 'Tiếng Anh' },
  { id: 'LY', name: 'Vật Lý' }, { id: 'HOA', name: 'Hóa Học' }, { id: 'SINH', name: 'Sinh Học' },
  { id: 'DIA', name: 'Địa Lý' }, { id: 'SU', name: 'Lịch Sử' }, { id: 'GDCD', name: 'GDCD' }
];

const ITEMS_PER_PAGE = 12;
const GRADE_COLUMNS = ['ĐGTX1', 'ĐGTX2', 'ĐGTX3', 'ĐGTX4', 'ĐGGK', 'ĐGCK'];

const GradeBoard: React.FC<Props> = ({ state, students, grades, onUpdateGrades }) => {
  const [selectedSubject, setSelectedSubject] = useState(subjects[0].id);
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

    if (tx.length === 0 && gk === null && ck === null) return null;

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

  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-20 animate-in fade-in">
      {/* Header gọn gàng */}
      <div className="bg-[#0f172a] text-white p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-500 rounded-none"><GraduationCap size={20} /></div>
          <h2 className="text-xs font-black uppercase tracking-widest">Bảng điểm môn: {subjects.find(s => s.id === selectedSubject)?.name}</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" placeholder="Tìm tên..." 
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)} 
              className="pl-8 pr-3 py-1.5 bg-slate-800 border-none text-[11px] w-48 focus:ring-1 focus:ring-orange-500 outline-none" 
            />
          </div>
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-[10px] font-black uppercase transition-all">
            <FileUp size={14} /> Import CSV
          </button>
          <input type="file" ref={fileInputRef} onChange={() => {}} className="hidden" />
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {subjects.map(s => (
          <button 
            key={s.id} onClick={() => { setSelectedSubject(s.id); setCurrentPage(1); }} 
            className={`px-3 py-1.5 text-[10px] font-black uppercase border-b-2 transition-all ${selectedSubject === s.id ? 'bg-orange-500 text-white border-orange-600' : 'bg-white text-slate-500 border-transparent hover:bg-slate-50'}`}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* Bảng chính Compact */}
      <div className="bg-white border border-slate-200 shadow-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#1e293b] text-white text-[10px] font-black uppercase tracking-widest">
              <th className="p-3 w-12 text-center border-r border-slate-700">STT</th>
              <th className="p-3 border-r border-slate-700">Mã HS</th>
              <th className="p-3 min-w-[200px] border-r border-slate-700">Họ và Tên Học Sinh</th>
              <th className="p-3 text-center w-28 border-r border-slate-700">ĐTB HK1</th>
              <th className="p-3 text-center w-28 border-r border-slate-700">ĐTB HK2</th>
              <th className="p-3 text-center w-32 bg-orange-600 border-r border-orange-700">Cả Năm</th>
              <th className="p-3 text-center w-24">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedStudents.map((s, idx) => {
              const tb1 = calculateAvg(s.MaHS, 1, selectedSubject);
              const tb2 = calculateAvg(s.MaHS, 2, selectedSubject);
              const cn = (tb1 !== null && tb2 !== null) ? (tb1 + tb2 * 2) / 3 : null;

              return (
                <tr key={s.MaHS} className="hover:bg-slate-50 transition-colors text-[11px] font-bold">
                  <td className="p-2 text-center text-slate-400 border-r border-slate-100">{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                  <td className="p-2 text-slate-500 border-r border-slate-100">{s.MaHS}</td>
                  <td className="p-2 text-slate-800 uppercase border-r border-slate-100">{s.Hoten}</td>
                  <td className="p-2 text-center border-r border-slate-100">{tb1 ? tb1.toFixed(1) : '--'}</td>
                  <td className="p-2 text-center border-r border-slate-100">{tb2 ? tb2.toFixed(1) : '--'}</td>
                  <td className="p-2 text-center bg-orange-50 font-black text-orange-700 border-r border-orange-100">{cn ? cn.toFixed(1) : '--'}</td>
                  <td className="p-2 text-center">
                    <button onClick={() => handleOpenDetail(s)} className="p-1.5 bg-slate-900 text-white hover:bg-orange-500 transition-colors">
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Phân trang nhỏ gọn */}
        <div className="p-3 bg-slate-50 border-t flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-400">TRANG {currentPage} / {totalPages || 1}</span>
          <div className="flex gap-1">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 bg-white border border-slate-200 text-slate-400 disabled:opacity-20"><ChevronLeft size={14} /></button>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-1.5 bg-white border border-slate-200 text-slate-400 disabled:opacity-20"><ChevronRight size={14} /></button>
          </div>
        </div>
      </div>

      {/* MODAL SHARP DESIGN (Hình chữ nhật, không bo góc) */}
      {editingStudent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 animate-in fade-in">
          <div className="bg-white w-full max-w-4xl border-t-4 border-orange-500 shadow-2xl rounded-none overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="bg-[#0f172a] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-500 flex items-center justify-center font-black text-xl">{editingStudent.Hoten.charAt(0)}</div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-tight">{editingStudent.Hoten}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Mã: {editingStudent.MaHS} | Môn: {subjects.find(s => s.id === selectedSubject)?.name}</p>
                </div>
              </div>
              <button onClick={() => setEditingStudent(null)} className="p-2 hover:bg-slate-800 text-slate-400 transition-colors"><X size={24} /></button>
            </div>

            {/* Modal Body - 2 Cột HK1 & HK2 */}
            <div className="p-6 bg-slate-50 grid grid-cols-2 gap-8">
              {[1, 2].map(hk => (
                <div key={hk} className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Học kỳ {hk}</h4>
                    <span className="text-[11px] font-black text-orange-600 bg-orange-50 px-2 py-0.5">Dự kiến: {calculateAvg(editingStudent.MaHS, hk, selectedSubject, localGrades[hk.toString()])?.toFixed(1) || '--'}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {GRADE_COLUMNS.map(col => (
                      <div key={col} className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-tighter block">{col}</label>
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
                          className="w-full p-2 bg-white border border-slate-200 rounded-none text-xs font-black text-slate-800 text-center focus:border-orange-500 outline-none transition-all shadow-inner" 
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="bg-[#f8fafc] p-5 flex items-center justify-between border-t border-slate-200">
              <div className="flex items-center gap-6">
                 <div className="text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase">Cả năm dự kiến</p>
                    <p className="text-xl font-black text-slate-900">
                      {(() => {
                        const tb1 = calculateAvg(editingStudent.MaHS, 1, selectedSubject, localGrades['1']);
                        const tb2 = calculateAvg(editingStudent.MaHS, 2, selectedSubject, localGrades['2']);
                        return (tb1 !== null && tb2 !== null) ? ((tb1 + tb2 * 2) / 3).toFixed(1) : '--';
                      })()}
                    </p>
                 </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditingStudent(null)} className="px-6 py-2.5 bg-slate-200 text-slate-600 text-[11px] font-black uppercase tracking-widest hover:bg-slate-300 transition-all rounded-none">Hủy bỏ</button>
                <button 
                  onClick={saveDetail} 
                  disabled={isProcessing}
                  className="px-8 py-2.5 bg-orange-500 text-white text-[11px] font-black uppercase tracking-widest shadow-lg shadow-orange-100 flex items-center justify-center gap-2 hover:bg-orange-600 active:scale-95 transition-all rounded-none"
                >
                  {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Lưu thay đổi
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
