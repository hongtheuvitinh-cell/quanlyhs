
import React, { useState, useEffect } from 'react';
import { Calendar, Clock, BookOpen, Save, History, RotateCcw, Edit3, Check, X } from 'lucide-react';
import { AppState, TimetableData, TimetableHistory, Role } from '../types';
import { supabase } from '../services/supabaseClient';

interface Props {
  state: AppState;
}

const Timetable: React.FC<Props> = ({ state }) => {
  const [timetable, setTimetable] = useState<Record<string, any>>({});
  const [history, setHistory] = useState<TimetableHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [versionName, setVersionName] = useState('');

  const isStudent = state.currentRole === Role.STUDENT;

  const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
  const periods = Array.from({ length: 10 }, (_, i) => i + 1);

  useEffect(() => {
    fetchCurrentTimetable();
    if (!isStudent) {
      fetchHistory();
    }
  }, [state.selectedClass, state.selectedYear]);

  const fetchCurrentTimetable = async () => {
    const { data } = await supabase
      .from('timetables')
      .select('*')
      .eq('MaLop', state.selectedClass)
      .eq('MaNienHoc', state.selectedYear)
      .single();
    
    if (data) setTimetable(data.Data || {});
    else setTimetable({});
  };

  const fetchHistory = async () => {
    const { data } = await supabase
      .from('timetable_history')
      .select('*')
      .eq('MaLop', state.selectedClass)
      .eq('MaNienHoc', state.selectedYear)
      .order('CreatedAt', { ascending: false });
    
    if (data) setHistory(data);
  };

  const handleSave = async (isHistory = false) => {
    if (isStudent) return;
    if (!state.selectedClass || !state.selectedYear) {
      alert('Thiếu thông tin lớp hoặc niên học!');
      return;
    }

    setIsSaving(true);
    try {
      const { error: upsertError } = await supabase.from('timetables').upsert({
        MaLop: state.selectedClass,
        MaNienHoc: state.selectedYear,
        Data: timetable
      }, { onConflict: 'MaLop,MaNienHoc' });

      if (upsertError) throw upsertError;

      if (isHistory) {
        if (!versionName) {
          alert('Vui lòng nhập tên phiên bản để lưu lịch sử!');
          setIsSaving(false);
          return;
        }

        const { error: historyError } = await supabase.from('timetable_history').insert({
          MaLop: state.selectedClass,
          MaNienHoc: state.selectedYear,
          Data: timetable,
          VersionName: versionName
        });

        if (historyError) throw historyError;
        
        setVersionName('');
        fetchHistory();
      }
      setIsEditing(false);
      alert('Đã lưu thời khóa biểu thành công!');
    } catch (e: any) {
      console.error('Lỗi lưu TKB:', e);
      alert(`Lỗi khi lưu thời khóa biểu: ${e.message || 'Không xác định'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const updateCell = (day: string, period: number, value: string) => {
    if (isStudent) return;
    setTimetable({
      ...timetable,
      [`${day}-${period}`]: { subject: value }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Thời khóa biểu</h2>
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">
            Lớp: {state.selectedClass} • Niên học: {state.selectedYear}
          </p>
        </div>
        {!isStudent && (
          <div className="flex gap-2">
             <button onClick={() => setShowHistory(!showHistory)} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 flex items-center gap-2 hover:bg-slate-50 transition-all">
               <History size={14} /> {showHistory ? 'Đóng lịch sử' : 'Lịch sử mẫu cũ'}
             </button>
             {!isEditing ? (
               <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2">
                 <Edit3 size={14} /> Chỉnh sửa
               </button>
             ) : (
               <div className="flex gap-2">
                  <button onClick={() => setIsEditing(false)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2">
                    <X size={14} /> Hủy
                  </button>
                  <button onClick={() => handleSave(false)} disabled={isSaving} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2">
                    <Save size={14} /> Lưu hiện tại
                  </button>
               </div>
             )}
          </div>
        )}
      </div>

      {!isStudent && showHistory && (
        <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-xl animate-in slide-in-from-top duration-300 mb-6">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Các phiên bản cũ</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {history.length > 0 ? history.map((h) => (
              <div key={h.id} className="p-4 border border-slate-100 rounded-2xl bg-slate-50/50 flex justify-between items-center group">
                <div>
                  <p className="text-xs font-bold text-slate-800">{h.VersionName}</p>
                  <p className="text-[9px] text-slate-400">{new Date(h.CreatedAt!).toLocaleString('vi-VN')}</p>
                </div>
                <button onClick={() => { setTimetable(h.Data); setShowHistory(false); }} className="p-2 bg-white text-indigo-600 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-all hover:bg-indigo-600 hover:text-white">
                  <RotateCcw size={14} />
                </button>
              </div>
            )) : <p className="text-[11px] text-slate-400 italic">Chưa có lịch sử lưu trữ</p>}
          </div>
        </div>
      )}

      {!isStudent && isEditing && (
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm mb-6">
          <div className="flex items-center gap-4">
            <input 
              type="text" 
              placeholder="Tên phiên bản (VD: TKB Học kỳ 1)..." 
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
      )}

      <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="p-4 border-b border-r border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest w-16">Tiết</th>
                {days.map(day => (
                  <th key={day} className="p-4 border-b border-r border-slate-100 text-[10px] font-black text-slate-800 uppercase tracking-widest min-w-[120px]">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {periods.map(period => (
                <tr key={period} className="group hover:bg-slate-50/30 transition-all">
                  <td className="p-4 border-b border-r border-slate-100 text-center">
                    <span className="text-xs font-black text-slate-400 group-hover:text-indigo-600 transition-colors">{period}</span>
                  </td>
                  {days.map(day => {
                    const cellData = timetable[`${day}-${period}`];
                    return (
                      <td key={`${day}-${period}`} className="p-4 border-b border-r border-slate-100 relative">
                        <div className="min-h-[60px] flex flex-col justify-center">
                          {isEditing ? (
                            <input 
                              type="text"
                              value={cellData?.subject || ''}
                              onChange={(e) => updateCell(day, period, e.target.value)}
                              className="w-full bg-slate-50 border-none rounded-lg px-2 py-2 text-[11px] font-bold text-indigo-700 focus:ring-1 focus:ring-indigo-500 outline-none"
                              placeholder="..."
                            />
                          ) : (
                            cellData?.subject ? (
                              <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100 group/item cursor-pointer hover:shadow-md transition-all">
                                <p className="text-[11px] font-bold text-indigo-700 mb-0.5">{cellData.subject}</p>
                                <div className="flex items-center gap-1 text-[9px] text-indigo-400 font-medium">
                                  <Clock size={10} />
                                  <span>{period <= 5 ? 'Sáng' : 'Chiều'}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center opacity-10">
                                <BookOpen size={14} />
                              </div>
                            )
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Timetable;
