
import React, { useState, useMemo, useRef } from 'react';
import { 
  GraduationCap, Save, Loader2, Search, FileUp, Eye, X, User, ChevronLeft, ChevronRight, Lock, ShieldCheck, Book
} from 'lucide-react';
import { AppState, Student, Grade, Assignment, Teacher, Role } from '../types';
import { supabase } from '../services/supabaseClient';

interface Props {
  state: AppState;
  students: Student[];
  grades: Grade[];
  assignments: Assignment[];
  onUpdateGrades: () => Promise<void>;
}

const subjectsList = [
  { id: 'TOAN', name: 'Toán' }, { id: 'VAN', name: 'Văn' }, { id: 'ANH', name: 'Anh' },
  { id: 'LY', name: 'Lý' }, { id: 'HOA', name: 'Hóa' }, { id: 'SINH', name: 'Sinh' },
  { id: 'DIA', name: 'Địa' }, { id: 'SU', name: 'Sử' }, { id: 'GDCD', name: 'GDCD' }
];

const ITEMS_PER_PAGE = 15;
const GRADE_COLUMNS = ['ĐGTX1', 'ĐGTX2', 'ĐGTX3', 'ĐGTX4', 'ĐGTX5', 'ĐGGK', 'ĐGCK'];

const GradeBoard: React.FC<Props> = ({ state, students, grades, assignments, onUpdateGrades }) => {
  const [selectedHK, setSelectedHK] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [localGrades, setLocalGrades] = useState<Record<string, Record<string, number | null>>>({
    '1': {}, '2': {}
  });

  const currentUser = state.currentUser as Teacher;
  const isAdmin = currentUser?.quanly === true;
  const isHomeroom = state.currentRole === Role.CHU_NHIEM;

  // LOGIC PHÂN QUYỀN HIỂN THỊ MÔN HỌC
  const visibleSubjects = useMemo(() => {
    if (isAdmin || isHomeroom) return subjectsList;

    const myAssignedSubjects = (assignments || [])
      .filter(a => 
        a.MaGV === currentUser.MaGV && 
        a.MaLop === state.selectedClass && 
        a.LoaiPhanCong === Role.GIANG_DAY
      )
      .map(a => String(a.MaMonHoc).toUpperCase());

    return subjectsList.filter(s => myAssignedSubjects.includes(s.id.toUpperCase()));
  }, [assignments, currentUser.MaGV, state.selectedClass, isAdmin, isHomeroom]);

  const [selectedSubject, setSelectedSubject] = useState(visibleSubjects[0]?.id || subjectsList[0].id);

  useMemo(() => {
    if (visibleSubjects.length > 0 && !visibleSubjects.some(s => s.id === selectedSubject)) {
      setSelectedSubject(visibleSubjects[0].id);
    }
  }, [visibleSubjects]);

  const canEdit = useMemo(() => {
    if (isAdmin) return true;
    if (isHomeroom) return false;

    const isMySubject = (assignments || [])
      .some(a => 
        a.MaGV === currentUser.MaGV && 
        a.MaLop === state.selectedClass && 
        String(a.MaMonHoc).toUpperCase() === String(selectedSubject).toUpperCase() &&
        a.LoaiPhanCong === Role.GIANG_DAY
      );

    return isMySubject;
  }, [isAdmin, isHomeroom, assignments, currentUser.MaGV, state.selectedClass, selectedSubject]);

  const filteredStudents = useMemo(() => {
    return (students || [])
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
      // ÉP KIỂU VÀ TRIM KHI LỌC DỮ LIỆU ĐỂ TRÁNH LỖI MÀN HÌNH TRẮNG / KHÔNG HIỂN THỊ
      const records = (grades || []).filter(g => 
        String(g.MaHS).trim() === String(maHS).trim() && 
        String(g.MaMonHoc).trim().toUpperCase() === String(subjectId).trim().toUpperCase() && 
        Number(g.HocKy) === Number(hk) && 
        Number(g.MaNienHoc) === Number(state.selectedYear)
      );
      records.forEach(r => {
        const typeKey = String(r.LoaiDiem).trim();
        sourceGrades[typeKey] = Number(r.DiemSo);
      });
    }

    const tx = ['ĐGTX1', 'ĐGTX2', 'ĐGTX3', 'ĐGTX4', 'ĐGTX5']
      .map(key => sourceGrades[key])
      .filter(v => v !== null && v !== undefined && !isNaN(v)) as number[];
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
      const currentGrades = (grades || []).filter(g => 
        String(g.MaHS).trim() === String(student.MaHS).trim() && 
        String(g.MaMonHoc).trim().toUpperCase() === String(selectedSubject).trim().toUpperCase() && 
        Number(g.HocKy) === Number(hk) && 
        Number(g.MaNienHoc) === Number(state.selectedYear)
      );
      currentGrades.forEach(g => {
        const typeKey = String(g.LoaiDiem).trim();
        data[hk.toString()][typeKey] = Number(g.DiemSo);
      });
    });
    setLocalGrades(data);
    setEditingStudent(student);
  };

  const saveDetail = async () => {
    if (!editingStudent || !canEdit) return;
    setIsProcessing(true);
    try {
      const upsertData: any[] = [];
      [1, 2].forEach(hk => {
        GRADE_COLUMNS.forEach(type => {
          const val = localGrades[hk.toString()][type];
          if (val !== null && val !== undefined && !isNaN(val)) {
            const old = (grades || []).find(g => 
              String(g.MaHS).trim() === String(editingStudent.MaHS).trim() && 
              String(g.MaMonHoc).trim().toUpperCase() === String(selectedSubject).trim().toUpperCase() && 
              Number(g.HocKy) === Number(hk) && 
              Number(g.MaNienHoc) === Number(state.selectedYear) && 
              String(g.LoaiDiem).trim() === String(type).trim()
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
    if (!canEdit) return;
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
      if (lines.length < 2) return;
      const rows = lines.slice(1);
      const upsertMap = new Map<string, any>();

      rows.forEach(row => {
        const cols = row.split(',').map(c => c.trim());
        if (cols.length >= 6) {
          const maHS = cols[0];
          let mapping = cols.length === 8 
            ? ['ĐGTX1', 'ĐGTX2', 'ĐGTX3', 'ĐGTX4', 'ĐGGK', 'ĐGCK']
            : ['ĐGTX1', 'ĐGTX2', 'ĐGTX3', 'ĐGTX4', 'ĐGTX5', 'ĐGGK', 'ĐGCK'];

          mapping.forEach((type, idx) => {
            const val = cols[idx + 2];
            if (val !== undefined && val !== '') {
              const num = parseFloat(val);
              if (!isNaN(num)) {
                const old = grades.find(g => 
                  String(g.MaHS).trim() === String(maHS).trim() && 
                  String(g.MaMonHoc).trim().toUpperCase() === String(selectedSubject).trim().toUpperCase() && 
                  Number(g.HocKy) === Number(selectedHK) && 
                  Number(g.MaNienHoc) === Number(state.selectedYear) && 
                  String(g.LoaiDiem).trim() === String(type).trim()
                );
                const key = `${maHS}_${type}`;
                upsertMap.set(key, {
                  ...(old ? { MaDiem: old.MaDiem } : { MaDiem: Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000000) }),
                  MaHS: maHS, MaMonHoc: selectedSubject, MaNienHoc: state.selectedYear, 
                  HocKy: selectedHK, LoaiDiem: type, DiemSo: num
                });
              }
            }
          });
        }
      });

      const finalUpsertData = Array.from(upsertMap.values());
      if (finalUpsertData.length > 0) {
        setIsProcessing(true);
        const { error } = await supabase.from('grades').upsert(finalUpsertData);
        if (error) alert("Lỗi: " + error.message);
        else { await onUpdateGrades(); alert(`Thành công! Đã nhập ${finalUpsertData.length} đầu điểm.`); }
        setIsProcessing(false);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-2 pb-20 animate-in fade-in">
      <div className="flex flex-wrap gap-0.5 bg-slate-100 p-1 rounded-t-xl">
        {visibleSubjects.length > 0 ? visibleSubjects.map(s => (
          <button 
            key={s.id} 
            onClick={() => { setSelectedSubject(s.id); setCurrentPage(1); }} 
            className={`px-3 py-2 text-[10px] font-black uppercase transition-all rounded-lg border-2 ${selectedSubject === s.id ? 'bg-indigo-600 text-white border-indigo-700 shadow-md' : 'bg-white text-slate-500 border-white hover:border-indigo-100'}`}
          >
            {s.name}
          </button>
        )) : (
          <div className="p-3 bg-rose-50 text-rose-500 border border-rose-100 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
            <Lock size={12}/> Bạn chưa được phân công môn học nào tại lớp này
          </div>
        )}
      </div>

      <div className="bg-[#0f172a] text-white p-3 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-700 shadow-sm relative overflow-hidden">
        <div className="flex items-center gap-4 relative z-10">
          <div className="p-2 bg-orange-500 rounded-xl"><GraduationCap size={20} /></div>
          <div>
            <h2 className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
              Môn: {subjectsList.find(s => s.id === selectedSubject)?.name}
              {canEdit ? (
                <span className="px-2 py-0.5 bg-emerald-500 text-white rounded-md text-[8px] tracking-tight">Quyền chỉnh sửa</span>
              ) : (
                <span className="px-2 py-0.5 bg-slate-600 text-slate-300 rounded-md text-[8px] tracking-tight">Chế độ xem</span>
              )}
            </h2>
            <p className="text-[9px] text-slate-400 font-bold uppercase">Niên học: {state.selectedYear} • Lớp: {state.selectedClass}</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
            {[1, 2].map(hk => (
              <button key={hk} onClick={() => setSelectedHK(hk)} className={`px-4 py-1.5 text-[9px] font-black uppercase transition-all rounded-lg ${selectedHK === hk ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Học kỳ {hk}</button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={12} />
            <input type="text" placeholder="Tìm học sinh..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 text-[10px] w-40 focus:ring-1 focus:ring-indigo-500 outline-none text-white rounded-xl" />
          </div>
          {canEdit && (
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-[9px] font-black uppercase transition-all rounded-xl shadow-lg shadow-emerald-900/20"><FileUp size={14} /> Nhập CSV</button>
          )}
          <input type="file" ref={fileInputRef} onChange={handleImportCSV} accept=".csv" className="hidden" />
        </div>
        <div className="absolute top-0 right-0 p-8 opacity-5"><ShieldCheck size={120} /></div>
      </div>

      <div className="bg-white border border-slate-200 overflow-hidden shadow-sm rounded-b-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-[9px] font-black uppercase tracking-widest border-b border-slate-100">
                <th className="p-4 w-12 text-center border-r">STT</th>
                <th className="p-4 w-24 border-r">Mã HS</th>
                <th className="p-4 border-r">Học và Tên Học Sinh</th>
                <th className="p-4 text-center w-24 border-r">ĐTB HK1</th>
                <th className="p-4 text-center w-24 border-r">ĐTB HK2</th>
                <th className="p-4 text-center w-28 bg-orange-50 text-orange-600 font-black">Cả Năm</th>
                <th className="p-4 text-center w-20">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginatedStudents.map((s, idx) => {
                const tb1 = calculateAvg(s.MaHS, 1, selectedSubject);
                const tb2 = calculateAvg(s.MaHS, 2, selectedSubject);
                const cn = (tb1 !== null && tb2 !== null) ? (tb1 + tb2 * 2) / 3 : null;
                return (
                  <tr key={s.MaHS} className="hover:bg-indigo-50/20 transition-all text-[11px] font-bold group">
                    <td className="p-3 text-center text-slate-300 border-r">{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                    <td className="p-3 text-slate-500 border-r">{s.MaHS}</td>
                    <td className="p-3 text-slate-800 uppercase border-r font-black tracking-tight">{s.Hoten}</td>
                    <td className="p-3 text-center border-r text-slate-500">{tb1 ? tb1.toFixed(1) : '--'}</td>
                    <td className="p-3 text-center border-r text-slate-500">{tb2 ? tb2.toFixed(1) : '--'}</td>
                    <td className="p-3 text-center bg-orange-50/50 font-black text-orange-600 border-r">{cn ? cn.toFixed(1) : '--'}</td>
                    <td className="p-3 text-center">
                      <button onClick={() => handleOpenDetail(s)} className={`p-2 rounded-xl transition-all shadow-sm flex items-center justify-center mx-auto ${canEdit ? 'bg-slate-900 text-white hover:bg-indigo-600' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>
                        {canEdit ? <Book size={14} /> : <Eye size={14} />}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {paginatedStudents.length === 0 && (
            <div className="py-20 text-center opacity-30 flex flex-col items-center">
               <GraduationCap size={48} className="text-slate-200 mb-4" />
               <p className="text-[10px] font-black uppercase tracking-widest">Không có dữ liệu học sinh</p>
            </div>
          )}
        </div>
        <div className="p-3 bg-slate-50 border-t flex items-center justify-between">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Trang {currentPage} / {totalPages || 1}</span>
          <div className="flex gap-2">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 bg-white border border-slate-200 text-slate-400 rounded-xl hover:bg-slate-100 disabled:opacity-30"><ChevronLeft size={14} /></button>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-2 bg-white border border-slate-200 text-slate-400 rounded-xl hover:bg-slate-100 disabled:opacity-30"><ChevronRight size={14} /></button>
          </div>
        </div>
      </div>

      {editingStudent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-5xl shadow-2xl rounded-[40px] overflow-hidden animate-in zoom-in-95 border border-white/20 flex flex-col max-h-[90vh]">
            <div className="bg-[#0f172a] text-white p-6 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-indigo-600 flex items-center justify-center font-black text-2xl rounded-2xl shadow-xl">{editingStudent.Hoten.charAt(0)}</div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight leading-none mb-2">{editingStudent.Hoten}</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Mã: {editingStudent.MaHS}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                    <span className="text-[10px] text-orange-400 font-bold uppercase">Môn: {subjectsList.find(s => s.id === selectedSubject)?.name}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setEditingStudent(null)} className="p-3 hover:bg-slate-800 text-slate-400 rounded-full transition-colors"><X size={28} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30 flex flex-col md:flex-row gap-8 custom-scrollbar">
              {[1, 2].map(hk => (
                <div key={hk} className={`flex-1 bg-white border rounded-[32px] p-6 shadow-sm ${!canEdit ? 'opacity-90' : ''}`}>
                  <div className="flex items-center justify-between border-b border-slate-50 pb-4 mb-6">
                    <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                      <span className="w-2 h-6 bg-indigo-600 rounded-full"></span>
                      Học kỳ {hk}
                    </h4>
                    <div className="text-right">
                       <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">ĐTB Dự kiến</p>
                       <p className="text-xl font-black text-indigo-600">{calculateAvg(editingStudent.MaHS, hk, selectedSubject, localGrades[hk.toString()])?.toFixed(1) || '--'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {GRADE_COLUMNS.map(col => (
                      <div key={col} className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase block px-1 tracking-tighter">{col}</label>
                        <input 
                          type="number" 
                          step="0.1" 
                          min="0" 
                          max="10" 
                          disabled={!canEdit}
                          value={localGrades[hk.toString()][col] ?? ''} 
                          onChange={(e) => {
                            const val = e.target.value === '' ? null : parseFloat(e.target.value);
                            if (val !== null && (val < 0 || val > 10)) return;
                            setLocalGrades(prev => ({ ...prev, [hk.toString()]: { ...prev[hk.toString()], [col]: val } }));
                          }} 
                          className={`w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-base font-black text-slate-800 text-center focus:border-indigo-400 focus:bg-white outline-none transition-all shadow-inner ${!canEdit ? 'bg-slate-100 cursor-not-allowed text-slate-400' : ''}`} 
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white p-8 flex flex-col md:flex-row items-center justify-between border-t border-slate-100 gap-6 shrink-0">
               <div className="flex items-center gap-6">
                  <div className="text-center md:text-left">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cả năm dự kiến</p>
                    <p className="text-4xl font-black text-slate-900 leading-none mt-1">
                      {(() => {
                        const tb1 = calculateAvg(editingStudent.MaHS, 1, selectedSubject, localGrades['1']);
                        const tb2 = calculateAvg(editingStudent.MaHS, 2, selectedSubject, localGrades['2']);
                        return (tb1 !== null && tb2 !== null) ? ((tb1 + tb2 * 2) / 3).toFixed(1) : '--';
                      })()}
                    </p>
                  </div>
                  {!canEdit && (
                    <div className="px-6 py-3 bg-amber-50 text-amber-600 border border-amber-100 rounded-2xl flex items-center gap-3 animate-pulse">
                      <Lock size={20}/>
                      <div className="text-left">
                        <p className="text-[10px] font-black uppercase tracking-widest">Chế độ chỉ xem</p>
                        <p className="text-[9px] font-bold opacity-70">Bạn không có quyền sửa điểm môn này</p>
                      </div>
                    </div>
                  )}
               </div>
               
               <div className="flex gap-4 w-full md:w-auto">
                 <button onClick={() => setEditingStudent(null)} className="flex-1 md:flex-none px-10 py-4 bg-slate-100 text-slate-500 rounded-2xl border border-slate-200 hover:bg-slate-200 transition-all font-black text-[11px] uppercase tracking-widest">Đóng</button>
                 {canEdit && (
                   <button onClick={saveDetail} disabled={isProcessing} className="flex-1 md:flex-none px-16 py-4 bg-indigo-600 text-white rounded-2xl flex items-center justify-center gap-3 hover:bg-indigo-700 shadow-xl shadow-indigo-100 active:scale-95 transition-all font-black text-[11px] uppercase tracking-widest">
                     {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Xác nhận lưu điểm
                   </button>
                 )}
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GradeBoard;
