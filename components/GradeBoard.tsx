
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
  'TX1': 'ĐGTX1', 'TX2': 'ĐGTX2', 'TX3': 'ĐGTX3', 'TX4': 'ĐGTX4', 'TX5': 'ĐGTX5',
  'GK': 'ĐGGK', 'CK': 'ĐGCK'
};

const GradeBoard: React.FC<Props> = ({ state, students, grades, onUpdateGrades }) => {
  const [viewMode, setViewMode] = useState<'DETAIL' | 'SUMMARY'>('DETAIL');
  const [selectedSubject, setSelectedSubject] = useState(subjects[0].id);
  const [selectedHK, setSelectedHK] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [tempGrades, setTempGrades] = useState<Grade[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => { setTempGrades(grades); setHasChanges(false); }, [grades]);

  const allColumns = useMemo(() => ['ĐGTX1', 'ĐGTX2', 'ĐGTX3', 'ĐGTX4', 'ĐGGK', 'ĐGCK'], []);

  // Lọc học sinh chính xác từ danh sách props (đã được App.tsx lọc đúng)
  const sortedStudents = useMemo(() => {
    return students
      .filter(s => s.Hoten.toLowerCase().includes(searchTerm.toLowerCase()) || s.MaHS.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => a.MaHS.localeCompare(b.MaHS, undefined, { numeric: true, sensitivity: 'base' }));
  }, [students, searchTerm]);

  const calculateSubjectAvg = (studentId: string, subjectId: string, semester: number) => {
    const sGrades = tempGrades.filter(g => 
      g.MaHS === studentId && g.MaMonHoc === subjectId && 
      g.HocKy === semester && g.MaNienHoc === state.selectedYear && g.DiemSo !== null
    );
    const dgtx = sGrades.filter(g => g.LoaiDiem.startsWith('ĐGTX')).map(g => g.DiemSo);
    const ggk = sGrades.find(g => g.LoaiDiem === 'ĐGGK')?.DiemSo;
    const gck = sGrades.find(g => g.LoaiDiem === 'ĐGCK')?.DiemSo;
    if (dgtx.length > 0 && ggk !== undefined && gck !== undefined) {
      return (dgtx.reduce((a, b) => a + b, 0) + ggk * 2 + gck * 3) / (dgtx.length + 5);
    }
    return null;
  };

  const handleInputChange = (studentId: string, type: string, rawValue: string) => {
    setTempGrades(prev => {
      const updated = [...prev];
      const idx = updated.findIndex(g => 
        g.MaHS === studentId && g.MaMonHoc === selectedSubject && 
        g.HocKy === selectedHK && g.MaNienHoc === state.selectedYear && g.LoaiDiem === type
      );
      const val = rawValue === '' ? null : parseFloat(rawValue);
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

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      const contextGrades = tempGrades.filter(g => g.MaMonHoc === selectedSubject && g.HocKy === selectedHK && g.MaNienHoc === state.selectedYear);
      const toUpsert = contextGrades.filter(g => g.DiemSo !== null);
      const toDelete = contextGrades.filter(g => g.DiemSo === null);
      if (toUpsert.length > 0) await supabase.from('grades').upsert(toUpsert);
      if (toDelete.length > 0) await supabase.from('grades').delete().in('MaDiem', toDelete.map(g => g.MaDiem));
      onUpdateGrades(tempGrades.filter(g => g.DiemSo !== null));
      setHasChanges(false);
      alert("Đã đồng bộ điểm số!");
    } catch (e: any) { alert(e.message); } finally { setIsSaving(false); }
  };

  return (
    <div className="space-y-4 animate-in fade-in pb-32">
      <div className="flex flex-col xl:flex-row gap-4">
        <div className="flex-1 bg-white p-5 rounded-[32px] border border-slate-200 shadow-sm space-y-4">
           <div className="flex items-center justify-between border-b border-slate-50 pb-4">
              <div className="flex items-center gap-3">
                 <div className="p-2.5 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-100"><GraduationCap size={20} /></div>
                 <div>
                    <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Bảng điểm lớp {state.selectedClass}</h2>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Môn: {subjects.find(s => s.id === selectedSubject)?.name}</p>
                 </div>
              </div>
              <div className="flex gap-2">
                 <button onClick={() => {}} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase border border-slate-200"><Download size={14}/> Xuất CSV</button>
              </div>
           </div>
           <div className="flex flex-wrap gap-2">
             {subjects.map(sub => (
               <button key={sub.id} onClick={() => setSelectedSubject(sub.id)} className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase border transition-all ${selectedSubject === sub.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white text-slate-500 border-slate-100 hover:border-indigo-100'}`}>{sub.name}</button>
             ))}
           </div>
        </div>
        <div className="w-full xl:w-80 bg-white p-5 rounded-[32px] border border-slate-200 shadow-sm space-y-4">
           <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase px-1">Tìm nhanh</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                <input type="text" placeholder="Tên hoặc mã..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-bold" />
              </div>
           </div>
           <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
              {[1, 2].map(hk => (
                <button key={hk} onClick={() => setSelectedHK(hk)} className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${selectedHK === hk ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400'}`}>HK{hk}</button>
              ))}
           </div>
        </div>
      </div>

      <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b">
                <th className="px-6 py-5 w-16 text-center">STT</th>
                <th className="px-6 py-5 min-w-[200px]">Học Sinh</th>
                {allColumns.map(h => <th key={h} className="px-2 py-5 text-center w-16">{h}</th>)}
                <th className="px-6 py-5 text-center bg-indigo-50 text-indigo-600 w-24">Trung Bình</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sortedStudents.map((s, idx) => {
                const tb = calculateSubjectAvg(s.MaHS, selectedSubject, selectedHK);
                return (
                  <tr key={s.MaHS} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-center font-bold text-slate-300 text-xs">{idx + 1}</td>
                    <td className="px-6 py-4 font-black text-slate-800 text-xs uppercase truncate max-w-[250px]">{s.Hoten} <span className="text-slate-300 font-normal ml-1">[{s.MaHS}]</span></td>
                    {allColumns.map(type => {
                      const gradeObj = tempGrades.find(g => g.MaHS === s.MaHS && g.MaMonHoc === selectedSubject && g.HocKy === selectedHK && g.MaNienHoc === state.selectedYear && g.LoaiDiem === type);
                      return (
                        <td key={type} className="px-2 py-2 text-center">
                          <input type="number" step="0.1" value={gradeObj?.DiemSo ?? ''} onChange={(e) => handleInputChange(s.MaHS, type, e.target.value)} placeholder="-" className="w-11 h-9 text-center font-black text-xs bg-white border border-slate-200 rounded-xl focus:border-indigo-400 outline-none shadow-sm" />
                        </td>
                      );
                    })}
                    <td className="px-6 py-4 text-center bg-indigo-50/30 font-black text-indigo-600 text-sm">
                      {tb !== null ? tb.toFixed(1) : '--'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {sortedStudents.length === 0 && (
           <div className="py-20 text-center text-slate-300 uppercase text-[10px] font-black tracking-widest">Không có dữ liệu hiển thị</div>
        )}
      </div>

      {hasChanges && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10">
          <button onClick={handleSaveChanges} disabled={isSaving} className="px-10 py-4 bg-slate-900 text-white rounded-2xl shadow-2xl flex items-center gap-3 font-black text-[11px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Đồng bộ điểm số
          </button>
        </div>
      )}
    </div>
  );
};

export default GradeBoard;
