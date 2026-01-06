
import React, { useState, useEffect, useMemo } from 'react';
import { 
  GraduationCap, Save, Loader2, ChevronLeft, ChevronRight, 
  Search, Filter, Calculator, Download, AlertCircle
} from 'lucide-react';
import { AppState, Student, Grade } from '../types';
import { supabase } from '../services/supabaseClient';

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

const ITEMS_PER_PAGE = 10;

const GradeBoard: React.FC<Props> = ({ state, students, grades, onUpdateGrades }) => {
  const [selectedSubject, setSelectedSubject] = useState(subjects[0].id);
  const [selectedHK, setSelectedHK] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [tempGrades, setTempGrades] = useState<Grade[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setTempGrades(grades);
    setHasChanges(false);
  }, [grades]);

  // Cột điểm cố định theo yêu cầu
  const columns = ['ĐGTX1', 'ĐGTX2', 'ĐGTX3', 'ĐGTX4', 'ĐGGK', 'ĐGCK'];

  // 1. Lọc và Sắp xếp danh sách học sinh
  const filteredStudents = useMemo(() => {
    return students
      .filter(s => 
        s.Hoten.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.MaHS.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => a.MaHS.localeCompare(b.MaHS, undefined, { numeric: true }));
  }, [students, searchTerm]);

  // 2. Phân trang logic
  const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredStudents.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredStudents, currentPage]);

  useEffect(() => {
    setCurrentPage(1); // Reset trang khi tìm kiếm hoặc đổi môn
  }, [searchTerm, selectedSubject]);

  // 3. Hàm tính ĐTB (Trung bình môn)
  const calculateDTB = (studentId: string) => {
    const sGrades = tempGrades.filter(g => 
      g.MaHS === studentId && 
      g.MaMonHoc === selectedSubject && 
      g.HocKy === selectedHK && 
      g.MaNienHoc === state.selectedYear && 
      g.DiemSo !== null
    );

    const tx = sGrades.filter(g => g.LoaiDiem.startsWith('ĐGTX')).map(g => g.DiemSo);
    const gk = sGrades.find(g => g.LoaiDiem === 'ĐGGK')?.DiemSo;
    const ck = sGrades.find(g => g.LoaiDiem === 'ĐGCK')?.DiemSo;

    if (tx.length > 0 && gk !== undefined && ck !== undefined) {
      // Công thức: (Tổng TX + GK*2 + CK*3) / (Số lượng TX + 2 + 3)
      const sum = tx.reduce((a, b) => a + b, 0) + (gk * 2) + (ck * 3);
      return (sum / (tx.length + 5)).toFixed(1);
    }
    return '--';
  };

  const handleInputChange = (studentId: string, type: string, rawValue: string) => {
    let val = rawValue === '' ? null : parseFloat(rawValue);
    if (val !== null && (val < 0 || val > 10)) return; // Bảo vệ dữ liệu

    setTempGrades(prev => {
      const updated = [...prev];
      const idx = updated.findIndex(g => 
        g.MaHS === studentId && g.MaMonHoc === selectedSubject && 
        g.HocKy === selectedHK && g.MaNienHoc === state.selectedYear && g.LoaiDiem === type
      );

      if (idx > -1) {
        updated[idx] = { ...updated[idx], DiemSo: val as any };
      } else if (val !== null) {
        updated.push({ 
          MaDiem: Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000), 
          MaHS: studentId, MaMonHoc: selectedSubject, MaNienHoc: state.selectedYear, 
          HocKy: selectedHK, LoaiDiem: type, DiemSo: val 
        });
      }
      return updated;
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const contextGrades = tempGrades.filter(g => 
        g.MaMonHoc === selectedSubject && 
        g.HocKy === selectedHK && 
        g.MaNienHoc === state.selectedYear
      );
      
      const toUpsert = contextGrades.filter(g => g.DiemSo !== null);
      const toDelete = contextGrades.filter(g => g.DiemSo === null);

      if (toUpsert.length > 0) await supabase.from('grades').upsert(toUpsert);
      if (toDelete.length > 0) await supabase.from('grades').delete().in('MaDiem', toDelete.map(g => g.MaDiem));

      onUpdateGrades(tempGrades.filter(g => g.DiemSo !== null));
      setHasChanges(false);
      alert("Đã lưu bảng điểm thành công!");
    } catch (e: any) {
      alert("Lỗi lưu trữ: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in pb-32">
      {/* Header Điều khiển */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-4 border-b border-slate-50 pb-4">
            <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg"><GraduationCap size={24} /></div>
            <div>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Ghi điểm: {subjects.find(s => s.id === selectedSubject)?.name}</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Lớp: {state.selectedClass} • Học kỳ: {selectedHK}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {subjects.map(sub => (
              <button 
                key={sub.id} 
                onClick={() => setSelectedSubject(sub.id)} 
                className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase border transition-all ${selectedSubject === sub.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-indigo-100'}`}
              >
                {sub.name}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm space-y-6">
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Tìm học sinh</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              <input 
                type="text" 
                placeholder="Tên hoặc Mã HS..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-xs font-bold focus:bg-white focus:border-indigo-400 transition-all shadow-inner" 
              />
            </div>
          </div>
          <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200">
            {[1, 2].map(hk => (
              <button 
                key={hk} 
                onClick={() => setSelectedHK(hk)} 
                className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${selectedHK === hk ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}
              >
                Học kỳ {hk}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bảng điểm chính - Phân trang 10 dòng */}
      <div className="bg-white rounded-[40px] border border-slate-200 shadow-xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">
                <th className="px-8 py-6 w-20 text-center">STT</th>
                <th className="px-6 py-6 min-w-[220px]">Họ và Tên</th>
                {columns.map(col => (
                  <th key={col} className="px-2 py-6 text-center w-20">{col}</th>
                ))}
                <th className="px-8 py-6 text-center bg-indigo-50/50 text-indigo-600 w-28">Đ.Trung Bình</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedStudents.map((s, idx) => {
                const globalIdx = (currentPage - 1) * ITEMS_PER_PAGE + idx + 1;
                const dtb = calculateDTB(s.MaHS);
                
                return (
                  <tr key={s.MaHS} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5 text-center font-black text-slate-300 text-xs">{globalIdx}</td>
                    <td className="px-6 py-5">
                      <div className="min-w-0">
                        <p className="font-black text-slate-800 text-[13px] uppercase truncate group-hover:text-indigo-600 transition-colors tracking-tight">{s.Hoten}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{s.MaHS}</p>
                      </div>
                    </td>
                    {columns.map(type => {
                      const gradeObj = tempGrades.find(g => 
                        g.MaHS === s.MaHS && 
                        g.MaMonHoc === selectedSubject && 
                        g.HocKy === selectedHK && 
                        g.MaNienHoc === state.selectedYear && 
                        g.LoaiDiem === type
                      );
                      
                      return (
                        <td key={type} className="px-2 py-5 text-center">
                          <input 
                            type="number" 
                            step="0.1" 
                            min="0"
                            max="10"
                            value={gradeObj?.DiemSo ?? ''} 
                            onChange={(e) => handleInputChange(s.MaHS, type, e.target.value)} 
                            placeholder="-" 
                            className="w-14 h-11 text-center font-black text-sm bg-white border border-slate-200 rounded-[14px] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all shadow-sm" 
                          />
                        </td>
                      );
                    })}
                    <td className="px-8 py-5 text-center bg-indigo-50/20">
                      <div className={`text-base font-black ${dtb !== '--' && Number(dtb) >= 8 ? 'text-emerald-600' : dtb !== '--' && Number(dtb) < 5 ? 'text-rose-600' : 'text-indigo-600'}`}>
                        {dtb}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Chân bảng: Điều hướng Phân trang */}
        <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
           <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Hiển thị {paginatedStudents.length} / {filteredStudents.length} học sinh
           </div>
           
           <div className="flex items-center gap-4">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={`p-3 rounded-2xl border transition-all ${currentPage === 1 ? 'text-slate-200 border-slate-100 bg-white cursor-not-allowed' : 'text-slate-600 border-slate-200 bg-white hover:bg-slate-50 shadow-sm active:scale-90'}`}
              >
                <ChevronLeft size={20} />
              </button>
              
              <div className="flex items-center gap-1.5">
                 {Array.from({length: totalPages}, (_, i) => i + 1).map(page => (
                   <button 
                     key={page} 
                     onClick={() => setCurrentPage(page)}
                     className={`w-10 h-10 rounded-xl text-[10px] font-black transition-all ${currentPage === page ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100 hover:border-indigo-100'}`}
                   >
                     {page}
                   </button>
                 ))}
              </div>

              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className={`p-3 rounded-2xl border transition-all ${currentPage === totalPages || totalPages === 0 ? 'text-slate-200 border-slate-100 bg-white cursor-not-allowed' : 'text-slate-600 border-slate-200 bg-white hover:bg-slate-50 shadow-sm active:scale-90'}`}
              >
                <ChevronRight size={20} />
              </button>
           </div>
        </div>
      </div>

      {/* Nút Lưu Nổi (Floating Save) */}
      {hasChanges && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-12">
          <button 
            onClick={handleSave} 
            disabled={isSaving} 
            className="px-12 py-5 bg-slate-900 text-white rounded-[24px] shadow-2xl flex items-center gap-4 font-black text-xs uppercase tracking-[2px] hover:scale-105 active:scale-95 transition-all group"
          >
            {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} className="group-hover:rotate-12 transition-transform" />}
            Xác nhận đồng bộ điểm số
          </button>
        </div>
      )}
      
      {filteredStudents.length === 0 && (
         <div className="py-32 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-100">
            <Calculator size={64} className="text-slate-200 mx-auto mb-4" />
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest italic">Không tìm thấy dữ liệu học sinh phù hợp</p>
         </div>
      )}
    </div>
  );
};

export default GradeBoard;
