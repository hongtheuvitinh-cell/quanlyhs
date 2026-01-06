
import React, { useState, useMemo, useRef } from 'react';
import { 
  GraduationCap, Save, Loader2, ChevronLeft, ChevronRight, 
  Search, FileUp, Eye, X, User
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
  
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [localGrades, setLocalGrades] = useState<Record<string, number | null>>({});

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

  // HÀM TÍNH ĐIỂM CẢI TIẾN: Linh hoạt hơn
  const calculateAvg = (maHS: string, hk: number, subjectId: string, currentLocalGrades?: Record<string, number | null>) => {
    let sourceGrades: Record<string, number | null> = {};
    
    if (currentLocalGrades && hk === selectedHK) {
      sourceGrades = currentLocalGrades;
    } else {
      // Đảm bảo so sánh đúng kiểu dữ liệu (== thay vì === cho ID nếu cần)
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

    // Nếu không có bất kỳ điểm nào
    if (tx.length === 0 && gk === null && ck === null) return null;

    // Tính điểm trung bình theo trọng số (TX hệ 1, GK hệ 2, CK hệ 3)
    // Nếu thiếu điểm nào thì chỉ chia cho tổng hệ số của các điểm đang có
    let totalScore = 0;
    let totalWeight = 0;

    tx.forEach(v => { totalScore += v; totalWeight += 1; });
    if (gk !== null && gk !== undefined) { totalScore += (gk * 2); totalWeight += 2; }
    if (ck !== null && ck !== undefined) { totalScore += (ck * 3); totalWeight += 3; }

    return totalWeight > 0 ? totalScore / totalWeight : null;
  };

  const handleOpenDetail = (student: Student) => {
    const studentGrades: Record<string, number | null> = {};
    GRADE_COLUMNS.forEach(col => studentGrades[col] = null);

    const currentGrades = grades.filter(g => 
      g.MaHS === student.MaHS && 
      g.MaMonHoc === selectedSubject && 
      Number(g.HocKy) === Number(selectedHK) && 
      Number(g.MaNienHoc) === Number(state.selectedYear)
    );
    
    currentGrades.forEach(g => studentGrades[g.LoaiDiem] = g.DiemSo);
    
    setLocalGrades(studentGrades);
    setEditingStudent(student);
  };

  const saveSingleStudent = async () => {
    if (!editingStudent) return;
    setIsProcessing(true);
    try {
      const upsertData: any[] = [];
      for (const type of GRADE_COLUMNS) {
        const val = localGrades[type];
        // Chỉ lưu nếu giá trị là số hợp lệ
        if (val !== null && val !== undefined && !isNaN(val)) {
          const old = grades.find(g => 
            g.MaHS === editingStudent.MaHS && 
            g.MaMonHoc === selectedSubject && 
            Number(g.HocKy) === Number(selectedHK) && 
            Number(g.MaNienHoc) === Number(state.selectedYear) && 
            g.LoaiDiem === type
          );
          
          upsertData.push({
            ...(old ? { MaDiem: old.MaDiem } : { MaDiem: Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 100000) }),
            MaHS: editingStudent.MaHS, 
            MaMonHoc: selectedSubject, 
            MaNienHoc: state.selectedYear, 
            HocKy: selectedHK, 
            LoaiDiem: type, 
            DiemSo: val
          });
        }
      }

      if (upsertData.length > 0) {
        const { error } = await supabase.from('grades').upsert(upsertData);
        if (error) throw error;
        await onUpdateGrades();
      }
      setEditingStudent(null);
    } catch (e: any) {
      alert("Lỗi lưu điểm: " + e.message);
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
        if (cols.length >= 3) { // Tối thiểu có MaHS, HoTen, TX1
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
        alert("Đã cập nhật dữ liệu từ file thành công!");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-40 animate-in fade-in">
      <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-50 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-lg"><GraduationCap size={20} /></div>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Kết quả môn {subjects.find(s => s.id === selectedSubject)?.name}</h2>
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
              <button key={s.id} onClick={() => { setSelectedSubject(s.id); setCurrentPage(1); }} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${selectedSubject === s.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>{s.name}</button>
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

      <div className="bg-white rounded-[40px] border border-slate-200 shadow-xl overflow-hidden flex flex-col min-h-[500px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">
                <th className="px-8 py-6 w-20 text-center">STT</th>
                <th className="px-6 py-6 min-w-[200px]">Họ và Tên Học Sinh</th>
                <th className="px-6 py-6 text-center w-32">ĐTB HK1</th>
                <th className="px-6 py-6 text-center w-32">ĐTB HK2</th>
                <th className="px-6 py-6 text-center w-40 bg-indigo-50/30 text-indigo-600 border-x border-indigo-100">Cả Năm</th>
                <th className="px-8 py-6 text-center w-32">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedStudents.length > 0 ? paginatedStudents.map((s, idx) => {
                const globalIdx = (currentPage - 1) * ITEMS_PER_PAGE + idx + 1;
                const tb1 = calculateAvg(s.MaHS, 1, selectedSubject);
                const tb2 = calculateAvg(s.MaHS, 2, selectedSubject);
                
                // Tính điểm cả năm nếu có điểm cả 2 kỳ
                const cn = (tb1 !== null && tb2 !== null) ? (tb1 + tb2 * 2) / 3 : null;

                return (
                  <tr key={s.MaHS} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5 text-center font-black text-slate-300 text-xs">{globalIdx}</td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400">{s.Hoten.charAt(0)}</div>
                        <div>
                          <p className="font-black text-slate-800 text-xs uppercase tracking-tight">{s.Hoten}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">{s.MaHS}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center font-black text-slate-500 text-xs">{tb1 ? tb1.toFixed(1) : '--'}</td>
                    <td className="px-6 py-5 text-center font-black text-slate-500 text-xs">{tb2 ? tb2.toFixed(1) : '--'}</td>
                    <td className="px-6 py-5 text-center bg-indigo-50/10 border-x border-indigo-50">
                      <span className={`text-sm font-black ${cn && cn >= 8 ? 'text-indigo-600' : 'text-slate-700'}`}>{cn ? cn.toFixed(1) : '--'}</span>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <button 
                        onClick={() => handleOpenDetail(s)}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 text-[10px] font-black text-slate-600 rounded-xl uppercase tracking-widest hover:border-indigo-400 hover:text-indigo-600 transition-all shadow-sm"
                      >
                        <Eye size={14} /> Chi tiết
                      </button>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={6} className="py-20 text-center opacity-30 text-[11px] font-black uppercase tracking-widest">Không có dữ liệu học sinh</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between mt-auto">
          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Trang {currentPage} / {totalPages || 1}</div>
          <div className="flex items-center gap-3">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 disabled:opacity-20 transition-all"><ChevronLeft size={18} /></button>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 disabled:opacity-20 transition-all"><ChevronRight size={18} /></button>
          </div>
        </div>
      </div>

      {editingStudent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-[48px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 border border-white/20">
            <div className="p-8 border-b bg-white flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-3xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner"><User size={32} /></div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{editingStudent.Hoten}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 py-1 bg-slate-50 rounded-lg border border-slate-100">Mã HS: {editingStudent.MaHS}</span>
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest px-3 py-1 bg-indigo-50 rounded-lg border border-indigo-100">HK{selectedHK} • Môn {subjects.find(s => s.id === selectedSubject)?.name}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setEditingStudent(null)} className="p-3 hover:bg-slate-100 rounded-full transition-colors"><X size={28} className="text-slate-400" /></button>
            </div>

            <div className="p-10 space-y-10 bg-slate-50/30">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {GRADE_COLUMNS.map(col => (
                  <div key={col} className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">{col}</label>
                    <input 
                      type="number" step="0.1" min="0" max="10"
                      value={localGrades[col] ?? ''} 
                      onChange={(e) => {
                        const val = e.target.value === '' ? null : parseFloat(e.target.value);
                        if (val !== null && (val < 0 || val > 10)) return;
                        setLocalGrades(prev => ({ ...prev, [col]: val }));
                      }}
                      className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-base font-black text-slate-800 text-center focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all shadow-sm" 
                      placeholder="-"
                    />
                  </div>
                ))}
              </div>

              <div className="p-6 bg-white rounded-[32px] border border-slate-200 shadow-inner flex items-center justify-around divide-x divide-slate-100">
                <div className="text-center px-4">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">TB Học Kỳ (Dự kiến)</p>
                  <p className="text-2xl font-black text-indigo-600">
                    {calculateAvg(editingStudent.MaHS, selectedHK, selectedSubject, localGrades)?.toFixed(1) || '--'}
                  </p>
                </div>
                <div className="text-center px-4">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">TB Cả Năm (Dự kiến)</p>
                  <p className="text-2xl font-black text-slate-800">
                    {(() => {
                      const curAvg = calculateAvg(editingStudent.MaHS, selectedHK, selectedSubject, localGrades);
                      const otherHK = selectedHK === 1 ? 2 : 1;
                      const otherAvg = calculateAvg(editingStudent.MaHS, otherHK, selectedSubject);
                      if (curAvg !== null && otherAvg !== null) {
                        return selectedHK === 1 ? ((curAvg + otherAvg * 2) / 3).toFixed(1) : ((otherAvg + curAvg * 2) / 3).toFixed(1);
                      }
                      return '--';
                    })()}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-8 border-t bg-white flex gap-4">
              <button onClick={() => setEditingStudent(null)} className="flex-1 py-4 bg-slate-50 border border-slate-200 text-slate-500 rounded-3xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all">Hủy bỏ</button>
              <button 
                onClick={saveSingleStudent} 
                disabled={isProcessing}
                className="flex-[2] py-4 bg-indigo-600 text-white rounded-3xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 hover:bg-indigo-700 active:scale-95 transition-all"
              >
                {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Xác nhận & Lưu điểm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GradeBoard;
