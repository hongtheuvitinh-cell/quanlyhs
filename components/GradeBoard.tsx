
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  GraduationCap, Save, Loader2, ChevronLeft, ChevronRight, 
  Search, Calculator, FileUp, Download, AlertCircle, FileSpreadsheet, RefreshCw
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
  
  // Draft state độc lập hoàn toàn
  const [draftGrades, setDraftGrades] = useState<Record<string, Record<string, number | null>>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // CHỈ đồng bộ dữ liệu từ Server khi đổi Môn/Học kỳ hoặc khi KHÔNG có thay đổi chưa lưu
  useEffect(() => {
    if (hasChanges) return; // Bảo vệ dữ liệu đang nhập

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
  }, [selectedSubject, selectedHK, state.selectedYear, grades, hasChanges]);

  // Lọc và Phân trang
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

  const handleInput = (maHS: string, type: string, value: string) => {
    const num = value === '' ? null : parseFloat(value);
    if (num !== null && (num < 0 || num > 10)) return;

    setDraftGrades(prev => ({
      ...prev,
      [maHS]: { ...(prev[maHS] || {}), [type]: num }
    }));
    setHasChanges(true);
  };

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

  const getTBCN = (maHS: string) => {
    // HK1: Lấy trực tiếp từ database (grades) để đảm bảo chính xác
    const hk1Records = grades.filter(g => g.MaHS === maHS && g.MaMonHoc === selectedSubject && g.HocKy === 1 && g.MaNienHoc === state.selectedYear);
    const tx1 = hk1Records.filter(g => g.LoaiDiem.startsWith('ĐGTX')).map(g => g.DiemSo);
    const gk1 = hk1Records.find(g => g.LoaiDiem === 'ĐGGK')?.DiemSo;
    const ck1 = hk1Records.find(g => g.LoaiDiem === 'ĐGCK')?.DiemSo;
    
    let tb1: number | null = null;
    if (tx1.length > 0 && gk1 !== undefined && ck1 !== undefined) {
      tb1 = (tx1.reduce((a, b) => a + b, 0) + gk1 * 2 + ck1 * 3) / (tx1.length + 5);
    }

    // HK2: Ưu tiên lấy từ Draft (vì có thể đang nhập)
    let tb2: number | null = null;
    if (selectedHK === 2) {
      const res = getTBHK(maHS);
      if (res !== '--') tb2 = parseFloat(res);
    } else {
      const hk2Records = grades.filter(g => g.MaHS === maHS && g.MaMonHoc === selectedSubject && g.HocKy === 2 && g.MaNienHoc === state.selectedYear);
      const tx2 = hk2Records.filter(g => g.LoaiDiem.startsWith('ĐGTX')).map(g => g.DiemSo);
      const gk2 = hk2Records.find(g => g.LoaiDiem === 'ĐGGK')?.DiemSo;
      const ck2 = hk2Records.find(g => g.LoaiDiem === 'ĐGCK')?.DiemSo;
      if (tx2.length > 0 && gk2 !== undefined && ck2 !== undefined) {
        tb2 = (tx2.reduce((a, b) => a + b, 0) + gk2 * 2 + ck2 * 3) / (tx2.length + 5);
      }
    }

    if (tb1 !== null && tb2 !== null) return ((tb1 + tb2 * 2) / 3).toFixed(1);
    return '--';
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

      // Quan trọng: Sau khi lưu thành công, tắt cờ hasChanges TRƯỚC khi fetch
      setHasChanges(false);
      await onUpdateGrades();
      alert("Đã đồng bộ điểm số thành công!");
    } catch (e: any) {
      alert("Lỗi: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const downloadSampleCSV = () => {
    const header = "MaHS,HoTen,DGTX1,DGTX2,DGTX3,DGTX4,DGGK,DGCK\n";
    const rows = filteredStudents.map(s => `${s.MaHS},${s.Hoten},,,,,`).join("\n");
    const blob = new Blob(["\ufeff" + header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Mau_Nhap_Diem_${state.selectedClass}.csv`);
    link.click();
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      // Xử lý các dòng, loại bỏ dòng trống và ký tự ẩn
      const rows = text.split(/\r?\n/).filter(line => line.trim() !== '').slice(1);
      const newDraft = { ...draftGrades };

      rows.forEach(row => {
        const cols = row.split(',').map(c => c.trim());
        if (cols.length >= 8) { // MaHS, HoTen, TX1, TX2, TX3, TX4, GK, CK
          const maHS = cols[0];
          if (!newDraft[maHS]) newDraft[maHS] = {};
          
          // Bắt đầu từ index 2 (bỏ qua MaHS, HoTen)
          GRADE_COLUMNS.forEach((type, idx) => {
            const val = cols[idx + 2];
            newDraft[maHS][type] = (val === '' || isNaN(parseFloat(val))) ? null : parseFloat(val);
          });
        }
      });

      setDraftGrades(newDraft);
      setHasChanges(true);
      alert("Đã đọc file CSV thành công. Vui lòng nhấn LƯU để đồng bộ!");
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-40 animate-in fade-in">
      {/* Header Chức năng */}
      <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-50 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-lg"><GraduationCap size={20} /></div>
              <div>
                <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest">Bảng điểm lớp {state.selectedClass}</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Trang {currentPage} / {totalPages || 1}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={downloadSampleCSV} className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-500 rounded-xl text-[10px] font-black uppercase border border-slate-100 hover:bg-slate-100 transition-all">
                <Download size={14} /> Mẫu CSV
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase border border-emerald-100 hover:bg-emerald-100 transition-all">
                <FileUp size={16} /> Nhập CSV
              </button>
              <input type="file" ref={fileInputRef} onChange={handleImportCSV} accept=".csv" className="hidden" />
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {subjects.map(s => (
              <button key={s.id} onClick={() => { if(!hasChanges || confirm("Thay đổi chưa lưu sẽ bị mất. Tiếp tục?")) { setSelectedSubject(s.id); setHasChanges(false); }}} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${selectedSubject === s.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-indigo-100'}`}>{s.name}</button>
            ))}
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200 shadow-inner">
            {[1, 2].map(hk => (
              <button key={hk} onClick={() => { if(!hasChanges || confirm("Thay đổi chưa lưu sẽ bị mất?")) { setSelectedHK(hk); setHasChanges(false); }}} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${selectedHK === hk ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}>Học kỳ {hk}</button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
            <input type="text" placeholder="Tìm tên học sinh..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold outline-none focus:bg-white focus:border-indigo-400 transition-all shadow-inner" />
          </div>
        </div>
      </div>

      {/* Bảng Điểm */}
      <div className="bg-white rounded-[40px] border border-slate-200 shadow-xl overflow-hidden flex flex-col min-h-[640px]">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">
                <th className="px-6 py-5 w-16 text-center">STT</th>
                <th className="px-4 py-5 min-w-[180px]">Học sinh</th>
                {GRADE_COLUMNS.map(type => (
                  <th key={type} className="px-2 py-5 text-center w-20">{type}</th>
                ))}
                <th className="px-6 py-5 text-center bg-indigo-50/50 text-indigo-600 w-24 border-l border-indigo-100">TBHK</th>
                <th className="px-6 py-5 text-center bg-emerald-50/50 text-emerald-600 w-24 border-l border-emerald-100">TBCN</th>
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
                      <div className="min-w-0">
                        <p className="font-black text-slate-800 text-[12px] uppercase truncate group-hover:text-indigo-600 transition-colors">{s.Hoten}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{s.MaHS}</p>
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
                    <td className="px-6 py-4 text-center bg-indigo-50/10 border-l border-indigo-50">
                      <div className={`text-xs font-black ${tbhk !== '--' && Number(tbhk) >= 8 ? 'text-indigo-600' : 'text-slate-500'}`}>{tbhk}</div>
                    </td>
                    <td className="px-6 py-4 text-center bg-emerald-50/10 border-l border-emerald-50">
                      <div className={`text-xs font-black ${tbcn !== '--' && Number(tbcn) >= 8 ? 'text-emerald-600' : 'text-slate-500'}`}>{tbcn}</div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={11} className="py-40 text-center">
                    <div className="opacity-30">
                      <Calculator size={48} className="mx-auto mb-4" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Không có dữ liệu</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang */}
        <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between mt-auto">
          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
            {paginatedStudents.length} / {filteredStudents.length} học sinh
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 disabled:opacity-30"><ChevronLeft size={18} /></button>
            <div className="flex gap-1.5">
               {Array.from({length: totalPages}, (_, i) => i + 1).map(p => (
                 <button key={p} onClick={() => setCurrentPage(p)} className={`w-9 h-9 rounded-xl text-[9px] font-black ${currentPage === p ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100'}`}>{p}</button>
               ))}
            </div>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 disabled:opacity-30"><ChevronRight size={18} /></button>
          </div>
        </div>
      </div>

      {/* Nút lưu nổi */}
      {hasChanges && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-10">
          <div className="bg-slate-900 text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-8 border border-white/10 backdrop-blur-md">
            <div className="flex items-center gap-3">
               <AlertCircle size={18} className="text-amber-400" />
               <p className="text-[10px] font-black uppercase tracking-[1.5px]">Đã nhập điểm - Chưa lưu</p>
            </div>
            <div className="h-4 w-px bg-white/10"></div>
            <div className="flex gap-2">
              <button 
                onClick={handleSave} 
                disabled={isSaving} 
                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Lưu thay đổi
              </button>
              <button 
                onClick={() => { if(confirm("Hủy mọi thay đổi?")) { setHasChanges(false); onUpdateGrades(); } }}
                className="px-6 py-2 bg-slate-800 hover:bg-slate-700 rounded-full text-[10px] font-black uppercase"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GradeBoard;
