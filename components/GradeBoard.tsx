
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
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Bản nháp điểm cục bộ
  const [draftGrades, setDraftGrades] = useState<Record<string, Record<string, number | null>>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Sync dữ liệu từ Server vào Draft mỗi khi đổi tab Môn/Kỳ
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

  // Hàm thực thi lưu (dùng chung cho cả tay và file)
  const executeSave = async (dataToSave: Record<string, Record<string, number | null>>) => {
    setIsProcessing(true);
    try {
      const upsertData: any[] = [];
      for (const maHS in dataToSave) {
        for (const type of GRADE_COLUMNS) {
          const val = dataToSave[maHS][type];
          if (val !== null && val !== undefined) {
            // Tìm MaDiem cũ nếu có để Update, không thì sẽ tự sinh ID mới trong DB
            const old = grades.find(g => g.MaHS === maHS && g.MaMonHoc === selectedSubject && g.HocKy === selectedHK && g.MaNienHoc === state.selectedYear && g.LoaiDiem === type);
            upsertData.push({
              ...(old ? { MaDiem: old.MaDiem } : { MaDiem: Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 100000) }),
              MaHS: maHS, MaMonHoc: selectedSubject, MaNienHoc: state.selectedYear, 
              HocKy: selectedHK, LoaiDiem: type, DiemSo: val
            });
          }
        }
      }

      if (upsertData.length > 0) {
        await supabase.from('grades').upsert(upsertData);
        await onUpdateGrades();
        setHasChanges(false);
      }
    } catch (e: any) {
      alert("Lỗi lưu dữ liệu: " + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualInput = (maHS: string, type: string, value: string) => {
    const num = value === '' ? null : parseFloat(value);
    if (num !== null && (num < 0 || num > 10)) return;
    setDraftGrades(prev => ({ ...prev, [maHS]: { ...(prev[maHS] || {}), [type]: num } }));
    setHasChanges(true);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      const rows = text.split(/\r?\n/).filter(line => line.trim() !== '').slice(1);
      const newBatch: Record<string, Record<string, number | null>> = { ...draftGrades };

      rows.forEach(row => {
        const cols = row.split(',').map(c => c.trim());
        if (cols.length >= 8) { // Cấu trúc: MaHS, HoTen, TX1, TX2, TX3, TX4, GK, CK
          const maHS = cols[0];
          if (!newBatch[maHS]) newBatch[maHS] = {};
          GRADE_COLUMNS.forEach((type, idx) => {
            const val = cols[idx + 2]; // Bắt đầu đọc từ cột index 2 (sau MaHS và HoTen)
            newBatch[maHS][type] = (val === '' || isNaN(parseFloat(val))) ? null : parseFloat(val);
          });
        }
      });

      // Ghi trực tiếp vào Database như yêu cầu
      await executeSave(newBatch);
      alert("Đã tự động cập nhật bảng điểm từ file CSV thành công!");
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getTBHK = (maHS: string) => {
    const sGrades = draftGrades[maHS] || {};
    const tx = [sGrades['ĐGTX1'], sGrades['ĐGTX2'], sGrades['ĐGTX3'], sGrades['ĐGTX4']].filter(v => v !== null) as number[];
    const gk = sGrades['ĐGGK'];
    const ck = sGrades['ĐGCK'];
    if (tx.length > 0 && gk !== null && ck !== null) {
      return ((tx.reduce((a, b) => a + b, 0) + gk * 2 + ck * 3) / (tx.length + 5)).toFixed(1);
    }
    return '--';
  };

  const getTBCN = (maHS: string) => {
    const g1 = grades.filter(g => g.MaHS === maHS && g.MaMonHoc === selectedSubject && g.HocKy === 1 && g.MaNienHoc === state.selectedYear);
    const g2 = grades.filter(g => g.MaHS === maHS && g.MaMonHoc === selectedSubject && g.HocKy === 2 && g.MaNienHoc === state.selectedYear);
    
    const calc = (list: any[]) => {
      const tx = list.filter(g => g.LoaiDiem.startsWith('ĐGTX')).map(g => g.DiemSo);
      const gk = list.find(g => g.LoaiDiem === 'ĐGGK')?.DiemSo;
      const ck = list.find(g => g.LoaiDiem === 'ĐGCK')?.DiemSo;
      return (tx.length > 0 && gk !== undefined && ck !== undefined) ? (tx.reduce((a, b) => a + b, 0) + gk * 2 + ck * 3) / (tx.length + 5) : null;
    };

    const tb1 = calc(g1);
    const tb2 = calc(g2);
    return (tb1 && tb2) ? ((tb1 + tb2 * 2) / 3).toFixed(1) : '--';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-40 animate-in fade-in">
      {/* Khối Điều Khiển */}
      <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-50 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-lg"><GraduationCap size={20} /></div>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Bảng điểm lớp {state.selectedClass}</h2>
            </div>
            <div className="flex gap-2">
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase border border-emerald-100 hover:bg-emerald-100 transition-all">
                <FileUp size={16} /> Nhập điểm CSV
              </button>
              <input type="file" ref={fileInputRef} onChange={handleImportCSV} accept=".csv" className="hidden" />
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {subjects.map(s => (
              <button key={s.id} onClick={() => setSelectedSubject(s.id)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${selectedSubject === s.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>{s.name}</button>
            ))}
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200 shadow-inner">
            {[1, 2].map(hk => (
              <button key={hk} onClick={() => setSelectedHK(hk)} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${selectedHK === hk ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}>Học kỳ {hk}</button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
            <input type="text" placeholder="Tìm tên..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold outline-none focus:bg-white transition-all shadow-inner" />
          </div>
        </div>
      </div>

      {/* Bảng Dữ Liệu */}
      <div className="bg-white rounded-[40px] border border-slate-200 shadow-xl overflow-hidden flex flex-col min-h-[600px]">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">
                <th className="px-6 py-5 w-16 text-center">STT</th>
                <th className="px-4 py-5 min-w-[180px]">Học sinh</th>
                {GRADE_COLUMNS.map(type => <th key={type} className="px-2 py-5 text-center w-20">{type}</th>)}
                <th className="px-6 py-5 text-center bg-indigo-50/50 text-indigo-600 w-24">TBHK</th>
                <th className="px-6 py-5 text-center bg-emerald-50/50 text-emerald-600 w-24">TBCN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedStudents.map((s, idx) => {
                const globalIdx = (currentPage - 1) * ITEMS_PER_PAGE + idx + 1;
                return (
                  <tr key={s.MaHS} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-6 py-4 text-center font-black text-slate-300 text-xs">{globalIdx}</td>
                    <td className="px-4 py-4">
                      <p className="font-black text-slate-800 text-[12px] uppercase truncate">{s.Hoten}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">{s.MaHS}</p>
                    </td>
                    {GRADE_COLUMNS.map(type => (
                      <td key={type} className="px-2 py-4 text-center">
                        <input 
                          type="number" step="0.1" min="0" max="10"
                          value={draftGrades[s.MaHS]?.[type] ?? ''} 
                          onChange={(e) => handleManualInput(s.MaHS, type, e.target.value)} 
                          className="w-14 h-10 text-center font-black text-xs bg-white border border-slate-200 rounded-xl focus:border-indigo-500 outline-none transition-all" 
                        />
                      </td>
                    ))}
                    <td className="px-6 py-4 text-center bg-indigo-50/10 font-black text-xs text-indigo-600">{getTBHK(s.MaHS)}</td>
                    <td className="px-6 py-4 text-center bg-emerald-50/10 font-black text-xs text-emerald-600">{getTBCN(s.MaHS)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Phân trang */}
        <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between mt-auto">
          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Trang {currentPage} / {totalPages || 1}</div>
          <div className="flex items-center gap-3">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 disabled:opacity-20"><ChevronLeft size={18} /></button>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 disabled:opacity-20"><ChevronRight size={18} /></button>
          </div>
        </div>
      </div>

      {/* Nút lưu thủ công */}
      {hasChanges && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-10">
          <div className="bg-slate-900 text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-8 border border-white/10 backdrop-blur-md">
            <p className="text-[10px] font-black uppercase tracking-widest">Đã chỉnh sửa điểm</p>
            <button 
              onClick={() => executeSave(draftGrades)} 
              disabled={isProcessing} 
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-lg"
            >
              {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Lưu thay đổi
            </button>
            <button onClick={() => setHasChanges(false)} className="text-[10px] font-black uppercase text-slate-400 hover:text-white">Hủy</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GradeBoard;
