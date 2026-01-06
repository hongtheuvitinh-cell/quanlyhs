
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  GraduationCap, Save, Loader2, ChevronLeft, ChevronRight, 
  Search, Calculator, FileUp, Download, AlertCircle, CheckCircle2
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

const ITEMS_PER_PAGE = 10;
const GRADE_COLUMNS = ['ĐGTX1', 'ĐGTX2', 'ĐGTX3', 'ĐGTX4', 'ĐGGK', 'ĐGCK'];

const GradeBoard: React.FC<Props> = ({ state, students, grades, onUpdateGrades }) => {
  const [selectedSubject, setSelectedSubject] = useState(subjects[0].id);
  const [selectedHK, setSelectedHK] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Bản nháp điểm cục bộ để tránh mất dữ liệu khi re-render
  const [draftGrades, setDraftGrades] = useState<Record<string, Record<string, number | null>>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Đồng bộ hóa Draft khi Môn học/Học kỳ thay đổi
  useEffect(() => {
    const newDraft: Record<string, Record<string, number | null>> = {};
    const currentGrades = grades.filter(g => 
      g.MaMonHoc === selectedSubject && 
      g.HocKy === selectedHK && 
      g.MaNienHoc === state.selectedYear
    );

    currentGrades.forEach(g => {
      if (!newDraft[g.MaHS]) newDraft[g.MaHS] = {};
      newDraft[g.MaHS][g.LoaiDiem] = g.DiemSo;
    });

    setDraftGrades(newDraft);
    setHasChanges(false);
  }, [selectedSubject, selectedHK, state.selectedYear, grades]);

  // Phân trang & Tìm kiếm
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

  useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedSubject, selectedHK]);

  // Tính Điểm Trung Bình Môn (TBHK)
  const getTBHK = (maHS: string) => {
    const sGrades = draftGrades[maHS] || {};
    const tx = [sGrades['ĐGTX1'], sGrades['ĐGTX2'], sGrades['ĐGTX3'], sGrades['ĐGTX4']]
      .filter(v => v !== null && v !== undefined) as number[];
    const gk = sGrades['ĐGGK'];
    const ck = sGrades['ĐGCK'];

    if (tx.length > 0 && gk !== null && gk !== undefined && ck !== null && ck !== undefined) {
      const sum = tx.reduce((a, b) => a + b, 0) + (gk * 2) + (ck * 3);
      return (sum / (tx.length + 5)).toFixed(1);
    }
    return '--';
  };

  // Tính Điểm Trung Bình Cả Năm (TBCN)
  const getTBCN = (maHS: string) => {
    const hk1Grades = grades.filter(g => g.MaHS === maHS && g.MaMonHoc === selectedSubject && g.HocKy === 1 && g.MaNienHoc === state.selectedYear);
    const hk2Grades = grades.filter(g => g.MaHS === maHS && g.MaMonHoc === selectedSubject && g.HocKy === 2 && g.MaNienHoc === state.selectedYear);

    const calcHK = (gList: Grade[]) => {
      const tx = gList.filter(g => g.LoaiDiem.startsWith('ĐGTX')).map(g => g.DiemSo);
      const gk = gList.find(g => g.LoaiDiem === 'ĐGGK')?.DiemSo;
      const gck = gList.find(g => g.LoaiDiem === 'ĐGCK')?.DiemSo;
      if (tx.length > 0 && gk !== undefined && gck !== undefined) return (tx.reduce((a, b) => a + b, 0) + gk * 2 + gck * 3) / (tx.length + 5);
      return null;
    };

    const tb1 = calcHK(hk1Grades);
    const tb2 = calcHK(hk2Grades);

    if (tb1 !== null && tb2 !== null) return ((tb1 + tb2 * 2) / 3).toFixed(1);
    return '--';
  };

  const handleInput = (maHS: string, type: string, value: string) => {
    const num = value === '' ? null : parseFloat(value);
    if (num !== null && (num < 0 || num > 10)) return;

    setDraftGrades(prev => ({
      ...prev,
      [maHS]: { ...(prev[maHS] || {}), [type]: num }
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const upsertData: any[] = [];
      const deleteIds: number[] = [];

      for (const maHS in draftGrades) {
        for (const type of GRADE_COLUMNS) {
          const val = draftGrades[maHS][type];
          const oldRecord = grades.find(g => 
            g.MaHS === maHS && g.MaMonHoc === selectedSubject && 
            g.HocKy === selectedHK && g.MaNienHoc === state.selectedYear && g.LoaiDiem === type
          );

          if (val !== null && val !== undefined) {
            upsertData.push({
              MaDiem: oldRecord?.MaDiem || Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000000),
              MaHS: maHS, MaMonHoc: selectedSubject, MaNienHoc: state.selectedYear, 
              HocKy: selectedHK, LoaiDiem: type, DiemSo: val
            });
          } else if (oldRecord) {
            deleteIds.push(oldRecord.MaDiem);
          }
        }
      }

      if (upsertData.length > 0) await supabase.from('grades').upsert(upsertData);
      if (deleteIds.length > 0) await supabase.from('grades').delete().in('MaDiem', deleteIds);

      await onUpdateGrades();
      setHasChanges(false);
      alert("Đồng bộ điểm số thành công!");
    } catch (e: any) {
      alert("Lỗi lưu trữ: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const rows = text.split('\n').slice(1); // Bỏ qua header
      const newDraft = { ...draftGrades };

      rows.forEach(row => {
        const cols = row.split(',');
        if (cols.length >= 7) {
          const maHS = cols[0].trim();
          if (!newDraft[maHS]) newDraft[maHS] = {};
          GRADE_COLUMNS.forEach((type, idx) => {
            const val = cols[idx + 1]?.trim();
            newDraft[maHS][type] = val === '' ? null : parseFloat(val);
          });
        }
      });

      setDraftGrades(newDraft);
      setHasChanges(true);
      alert("Đã nhập dữ liệu từ CSV!");
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-40 animate-in fade-in">
      {/* Khối chức năng */}
      <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-50 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-lg"><GraduationCap size={20} /></div>
              <div>
                <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest">Ghi điểm môn học</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Trang {currentPage} / {totalPages || 1}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-[10px] font-black uppercase border border-slate-200 hover:bg-slate-100 transition-all">
                <FileUp size={16} /> Nhập CSV
              </button>
              <input type="file" ref={fileInputRef} onChange={handleImportCSV} accept=".csv" className="hidden" />
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {subjects.map(s => (
              <button key={s.id} onClick={() => setSelectedSubject(s.id)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${selectedSubject === s.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-indigo-100'}`}>{s.name}</button>
            ))}
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200">
            {[1, 2].map(hk => (
              <button key={hk} onClick={() => setSelectedHK(hk)} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${selectedHK === hk ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}>Học kỳ {hk}</button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
            <input type="text" placeholder="Tìm tên học sinh..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold outline-none focus:bg-white focus:border-indigo-400 shadow-inner transition-all" />
          </div>
        </div>
      </div>

      {/* Bảng Form chuẩn - 10 HS/Trang */}
      <div className="bg-white rounded-[40px] border border-slate-200 shadow-xl overflow-hidden flex flex-col min-h-[620px]">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">
                <th className="px-6 py-5 w-16 text-center">STT</th>
                <th className="px-4 py-5 min-w-[200px]">Học sinh</th>
                {GRADE_COLUMNS.map(type => (
                  <th key={type} className="px-2 py-5 text-center w-20">{type}</th>
                ))}
                <th className="px-6 py-5 text-center bg-indigo-50/50 text-indigo-600 w-24">TBHK</th>
                <th className="px-6 py-5 text-center bg-emerald-50/50 text-emerald-600 w-24">TBCN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedStudents.length > 0 ? paginatedStudents.map((s, idx) => {
                const globalIdx = (currentPage - 1) * ITEMS_PER_PAGE + idx + 1;
                const tbhk = getTBHK(s.MaHS);
                const tbcn = getTBCN(s.MaHS);
                
                return (
                  <tr key={s.MaHS} className="hover:bg-slate-50/30 transition-colors group">
                    <td className="px-6 py-4 text-center font-black text-slate-300 text-xs">{globalIdx}</td>
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-black text-slate-800 text-[12px] uppercase truncate group-hover:text-indigo-600 transition-colors tracking-tight">{s.Hoten}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{s.MaHS}</p>
                      </div>
                    </td>
                    {GRADE_COLUMNS.map(type => (
                      <td key={type} className="px-2 py-4 text-center">
                        <input 
                          type="number" 
                          step="0.1" 
                          min="0"
                          max="10"
                          value={draftGrades[s.MaHS]?.[type] ?? ''} 
                          onChange={(e) => handleInput(s.MaHS, type, e.target.value)} 
                          placeholder="-" 
                          className="w-14 h-10 text-center font-black text-xs bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all shadow-sm" 
                        />
                      </td>
                    ))}
                    <td className="px-6 py-4 text-center bg-indigo-50/10">
                      <div className={`text-xs font-black ${tbhk !== '--' && Number(tbhk) >= 8 ? 'text-indigo-600' : 'text-slate-500'}`}>{tbhk}</div>
                    </td>
                    <td className="px-6 py-4 text-center bg-emerald-50/10">
                      <div className={`text-xs font-black ${tbcn !== '--' && Number(tbcn) >= 8 ? 'text-emerald-600' : 'text-slate-500'}`}>{tbcn}</div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={11} className="py-40 text-center">
                    <Calculator size={48} className="text-slate-200 mx-auto mb-4 opacity-30" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Không có dữ liệu phù hợp</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Điều hướng Phân trang */}
        <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between mt-auto">
          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
            Hiển thị {paginatedStudents.length} / {filteredStudents.length} học sinh
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`p-2.5 rounded-xl border transition-all ${currentPage === 1 ? 'text-slate-200 border-slate-100 bg-white' : 'text-slate-600 border-slate-200 bg-white hover:bg-slate-50 shadow-sm active:scale-90'}`}
            >
              <ChevronLeft size={18} />
            </button>
            
            <div className="flex items-center gap-1.5">
               {Array.from({length: Math.min(5, totalPages)}, (_, i) => {
                 const page = i + 1;
                 return (
                   <button 
                     key={page} 
                     onClick={() => setCurrentPage(page)}
                     className={`w-9 h-9 rounded-xl text-[9px] font-black transition-all ${currentPage === page ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100 hover:border-indigo-200'}`}
                   >
                     {page}
                   </button>
                 );
               })}
               {totalPages > 5 && <span className="text-slate-300">...</span>}
            </div>

            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className={`p-2.5 rounded-xl border transition-all ${currentPage === totalPages || totalPages === 0 ? 'text-slate-200 border-slate-100 bg-white' : 'text-slate-600 border-slate-200 bg-white hover:bg-slate-50 shadow-sm active:scale-90'}`}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Thanh lưu trữ nổi */}
      {hasChanges && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-10">
          <div className="bg-slate-900 text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-8 border border-white/10 backdrop-blur-md">
            <div className="flex items-center gap-3">
               <AlertCircle size={18} className="text-amber-400" />
               <p className="text-[10px] font-black uppercase tracking-[1.5px]">Dữ liệu đang được chỉnh sửa</p>
            </div>
            <div className="h-4 w-px bg-white/10"></div>
            <button 
              onClick={handleSave} 
              disabled={isSaving} 
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-full text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Lưu bảng điểm
            </button>
            <button 
              onClick={() => { if(confirm("Hủy mọi thay đổi?")) { setHasChanges(false); onUpdateGrades(); } }}
              className="text-[10px] font-black uppercase text-slate-400 hover:text-white"
            >
              Hủy
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GradeBoard;
