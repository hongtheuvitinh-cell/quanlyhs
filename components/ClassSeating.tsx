
import React, { useState, useEffect } from 'react';
import { Users, Monitor, User, Save, History, RotateCcw, Trash2, Check } from 'lucide-react';
import { Student, SeatingPlan, SeatingHistory, AppState } from '../types';
import { supabase } from '../services/supabaseClient';

interface Props {
  state: AppState;
  students: Student[];
  className?: string;
}

const ClassSeating: React.FC<Props> = ({ state, students, className }) => {
  const [seatingConfig, setSeatingConfig] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<SeatingHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [versionName, setVersionName] = useState('');
  const [rows, setRows] = useState(6);
  const [cols, setCols] = useState(4);

  useEffect(() => {
    fetchCurrentPlan();
    fetchHistory();
  }, [state.selectedClass, state.selectedYear]);

  const fetchCurrentPlan = async () => {
    const { data } = await supabase
      .from('seating_plans')
      .select('*')
      .eq('MaLop', state.selectedClass)
      .eq('MaNienHoc', state.selectedYear)
      .single();
    
    if (data) {
      setSeatingConfig(data.Config || {});
      setRows(data.Rows || 6);
      setCols(data.Cols || 4);
    } else {
      setSeatingConfig({});
      setRows(6);
      setCols(4);
    }
  };

  const fetchHistory = async () => {
    const { data } = await supabase
      .from('seating_history')
      .select('*')
      .eq('MaLop', state.selectedClass)
      .eq('MaNienHoc', state.selectedYear)
      .order('CreatedAt', { ascending: false });
    
    if (data) setHistory(data);
  };

  const handleSave = async (isHistory = false) => {
    if (!state.selectedClass || !state.selectedYear) {
      alert('Thiếu thông tin lớp hoặc niên học!');
      return;
    }

    setIsSaving(true);
    try {
      // Save current plan
      const { error: upsertError } = await supabase.from('seating_plans').upsert({
        MaLop: state.selectedClass,
        MaNienHoc: state.selectedYear,
        Rows: rows,
        Cols: cols,
        Config: seatingConfig
      }, { onConflict: 'MaLop,MaNienHoc' });

      if (upsertError) throw upsertError;

      // If saving as history version
      if (isHistory) {
        if (!versionName) {
          alert('Vui lòng nhập tên phiên bản để lưu lịch sử!');
          setIsSaving(false);
          return;
        }

        const { error: historyError } = await supabase.from('seating_history').insert({
          MaLop: state.selectedClass,
          MaNienHoc: state.selectedYear,
          Rows: rows,
          Cols: cols,
          Config: seatingConfig,
          VersionName: versionName
        });

        if (historyError) throw historyError;
        
        setVersionName('');
        fetchHistory();
      }
      alert('Đã lưu sơ đồ thành công!');
    } catch (e: any) {
      console.error('Lỗi lưu sơ đồ:', e);
      alert(`Lỗi khi lưu sơ đồ: ${e.message || 'Không xác định'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const autoAssign = () => {
    const newConfig: Record<string, string> = {};
    students.forEach((s, i) => {
      if (i < rows * cols) {
        newConfig[i.toString()] = s.MaHS;
      }
    });
    setSeatingConfig(newConfig);
  };

  const restoreVersion = (version: SeatingHistory) => {
    setSeatingConfig(version.Config);
    setRows(version.Rows);
    setCols(version.Cols);
    setShowHistory(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Sơ đồ lớp học</h2>
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">
            Lớp: {className || 'Chưa chọn'} • Niên học: {state.selectedYear}
          </p>
        </div>
        <div className="flex gap-2">
           <button onClick={() => setShowHistory(!showHistory)} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 flex items-center gap-2 hover:bg-slate-50 transition-all">
             <History size={14} /> {showHistory ? 'Đóng lịch sử' : 'Lịch sử mẫu cũ'}
           </button>
           <button onClick={autoAssign} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Tự động xếp</button>
           <button onClick={() => handleSave(false)} disabled={isSaving} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2">
             <Save size={14} /> Lưu hiện tại
           </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Số hàng (dãy):</span>
          <input 
            type="number" 
            min="1" 
            max="10" 
            value={rows} 
            onChange={(e) => setRows(parseInt(e.target.value) || 1)}
            className="w-16 bg-slate-50 border-none rounded-xl px-3 py-2 text-xs font-bold text-indigo-600 focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Số cột:</span>
          <input 
            type="number" 
            min="1" 
            max="10" 
            value={cols} 
            onChange={(e) => setCols(parseInt(e.target.value) || 1)}
            className="w-16 bg-slate-50 border-none rounded-xl px-3 py-2 text-xs font-bold text-indigo-600 focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div className="text-[10px] text-slate-400 font-medium italic">
          * Thay đổi số hàng/cột sẽ cập nhật khung sơ đồ bên dưới.
        </div>
      </div>

      {showHistory && (
        <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-xl animate-in slide-in-from-top duration-300 mb-6">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Các phiên bản cũ</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {history.length > 0 ? history.map((h) => (
              <div key={h.id} className="p-4 border border-slate-100 rounded-2xl bg-slate-50/50 flex justify-between items-center group">
                <div>
                  <p className="text-xs font-bold text-slate-800">{h.VersionName}</p>
                  <p className="text-[9px] text-slate-400">{h.Rows} hàng x {h.Cols} cột • {new Date(h.CreatedAt!).toLocaleString('vi-VN')}</p>
                </div>
                <button onClick={() => restoreVersion(h)} className="p-2 bg-white text-indigo-600 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-all hover:bg-indigo-600 hover:text-white">
                  <RotateCcw size={14} />
                </button>
              </div>
            )) : <p className="text-[11px] text-slate-400 italic">Chưa có lịch sử lưu trữ</p>}
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm mb-6">
        <div className="flex items-center gap-4">
          <input 
            type="text" 
            placeholder="Tên phiên bản (VD: Sơ đồ tháng 9)..." 
            value={versionName}
            onChange={(e) => setVersionName(e.target.value)}
            className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-2 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          <button 
            onClick={() => handleSave(true)}
            disabled={!versionName || isSaving}
            className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50 shadow-lg shadow-emerald-100"
          >
            Lưu vào lịch sử
          </button>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm overflow-x-auto">
        <div className="flex justify-between items-center mb-12 px-10">
          <div className="flex flex-col items-center gap-2">
            <div className="w-32 h-16 bg-amber-100 border-2 border-amber-200 rounded-xl flex items-center justify-center shadow-sm">
              <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Bàn Giáo Viên</span>
            </div>
            <User size={20} className="text-amber-500" />
          </div>
          <div className="flex-1 max-w-md mx-10">
            <div className="h-4 bg-slate-800 rounded-full shadow-lg flex items-center justify-center relative">
              <div className="absolute -top-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Bảng Đen</div>
            </div>
          </div>
        </div>

        <div 
          className="grid gap-6 min-w-[800px]" 
          style={{ 
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` 
          }}
        >
          {Array.from({ length: rows * cols }).map((_, index) => {
            const studentId = seatingConfig[index.toString()];
            const student = students.find(s => s.MaHS === studentId);
            
            return (
              <div 
                key={index} 
                className={`aspect-[4/3] rounded-3xl border-2 flex flex-col items-center justify-center p-4 transition-all relative group ${
                  student 
                    ? 'bg-white border-indigo-100 shadow-sm hover:border-indigo-400' 
                    : 'bg-slate-50 border-dashed border-slate-200 opacity-40'
                }`}
              >
                {student ? (
                  <>
                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 mb-2 font-bold text-xs border border-indigo-100">
                      {student.Anh ? <img src={student.Anh} alt="" className="w-full h-full rounded-full object-cover" /> : student.Hoten.charAt(0)}
                    </div>
                    <p className="text-[11px] font-bold text-slate-800 text-center line-clamp-1">{student.Hoten}</p>
                    <p className="text-[9px] text-slate-400 font-medium mt-0.5">{student.MaHS}</p>
                    <button 
                      onClick={() => {
                        const newConfig = {...seatingConfig};
                        delete newConfig[index.toString()];
                        setSeatingConfig(newConfig);
                      }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                    >
                      <Trash2 size={12} />
                    </button>
                  </>
                ) : (
                  <select 
                    className="w-full bg-transparent text-[9px] font-black text-slate-400 uppercase tracking-widest outline-none text-center cursor-pointer"
                    onChange={(e) => {
                      if (e.target.value) {
                        setSeatingConfig({...seatingConfig, [index.toString()]: e.target.value});
                      }
                    }}
                    value=""
                  >
                    <option value="">Trống</option>
                    {students.filter(s => !Object.values(seatingConfig).includes(s.MaHS)).map(s => (
                      <option key={s.MaHS} value={s.MaHS}>{s.Hoten}</option>
                    ))}
                  </select>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ClassSeating;
