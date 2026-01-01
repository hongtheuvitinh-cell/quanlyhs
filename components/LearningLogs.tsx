
import React, { useState, useMemo } from 'react';
import { 
  ClipboardList, Plus, User, MessageSquare, CheckCircle2, XCircle, Clock, Check, Calendar, Search, Users, AlertTriangle, Save, ChevronRight, Info
} from 'lucide-react';
import { AppState, Student, LearningLog, Assignment, AttendanceStatus } from '../types';

interface Props {
  state: AppState;
  students: Student[];
  logs: LearningLog[];
  assignment: Assignment;
  onUpdateLogs: (newLogs: LearningLog[]) => void;
}

const statusConfig: Record<AttendanceStatus, { label: string, color: string, icon: any, bg: string }> = {
  CO_MAT: { label: 'Có mặt', color: 'text-emerald-600', icon: CheckCircle2, bg: 'bg-emerald-50' },
  VANG_CP: { label: 'Vắng CP', color: 'text-amber-600', icon: AlertTriangle, bg: 'bg-amber-50' },
  VANG_KP: { label: 'Vắng KP', color: 'text-rose-600', icon: XCircle, bg: 'bg-rose-50' },
  TRE: { label: 'Đi trễ', color: 'text-indigo-600', icon: Clock, bg: 'bg-indigo-50' },
};

const LearningLogs: React.FC<Props> = ({ state, students, logs, assignment, onUpdateLogs }) => {
  const [activeTab, setActiveTab] = useState<'history' | 'rollcall'>('history');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [tempAttendance, setTempAttendance] = useState<Record<string, { status: AttendanceStatus, note: string }>>(
    students.reduce((acc, s) => ({ ...acc, [s.MaHS]: { status: 'CO_MAT', note: '' } }), {})
  );

  const filteredLogs = useMemo(() => {
    return logs.filter(l => l.MaPhanCong === assignment?.MaPhanCong)
               .sort((a, b) => new Date(b.NgayGhiChep).getTime() - new Date(a.NgayGhiChep).getTime());
  }, [logs, assignment]);

  const filteredStudents = students.filter(s => s.Hoten.toLowerCase().includes(searchTerm.toLowerCase()));

  const saveRollCall = () => {
    const baseId = Math.floor(Date.now() / 1000);
    const newLogs: LearningLog[] = students.map((s, index) => ({
      MaTheoDoi: baseId + index, MaHS: s.MaHS, MaPhanCong: assignment.MaPhanCong,
      NgayGhiChep: selectedDate, NhanXet: tempAttendance[s.MaHS].note, TrangThai: tempAttendance[s.MaHS].status
    }));
    onUpdateLogs(newLogs);
    alert(`Đã lưu điểm danh ngày ${selectedDate}`);
    setActiveTab('history');
  };

  return (
    <div className="space-y-4 animate-in fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-md"><ClipboardList size={20} /></div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 leading-none mb-1">Nhật ký & Điểm danh</h2>
            <p className="text-[10px] text-slate-400 font-normal">Lớp {state.selectedClass} • {new Date().toLocaleDateString('vi-VN')}</p>
          </div>
        </div>
        <div className="flex p-0.5 bg-slate-100 rounded-lg border border-slate-200">
          <button onClick={() => setActiveTab('history')} className={`px-4 py-1.5 rounded-md text-[9px] font-bold uppercase transition-all ${activeTab === 'history' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Lịch sử</button>
          <button onClick={() => setActiveTab('rollcall')} className={`px-4 py-1.5 rounded-md text-[9px] font-bold uppercase transition-all ${activeTab === 'rollcall' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Ghi mới</button>
        </div>
      </div>

      {activeTab === 'rollcall' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
             <div className="p-3 border-b bg-slate-50/50 flex items-center justify-between">
                <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} /><input type="text" placeholder="Tìm tên..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 pr-3 py-1.5 bg-white border rounded-lg text-xs font-normal outline-none w-48" /></div>
                <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="text-xs font-bold bg-transparent outline-none" />
             </div>
             <div className="divide-y divide-slate-100">
                {filteredStudents.map(student => (
                  <div key={student.MaHS} className="p-3 flex items-center gap-4 hover:bg-slate-50/50">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-400 text-xs shrink-0">{student.Hoten.charAt(0)}</div>
                    <div className="flex-1 min-w-0"><p className="text-xs font-bold text-slate-800 truncate">{student.Hoten}</p><p className="text-[9px] text-slate-400 font-normal uppercase">{student.MaHS}</p></div>
                    <div className="flex gap-1">
                      {(Object.keys(statusConfig) as AttendanceStatus[]).map(status => {
                        // Fix: Assign component to a capitalized variable before using it in JSX to avoid IntrinsicElements error
                        const StatusIcon = statusConfig[status].icon;
                        return (
                          <button key={status} onClick={() => setTempAttendance({...tempAttendance, [student.MaHS]: {...tempAttendance[student.MaHS], status}})} className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${tempAttendance[student.MaHS].status === status ? `${statusConfig[status].bg} ${statusConfig[status].color} border border-slate-200` : 'text-slate-300 hover:text-slate-500'}`}>
                            <StatusIcon size={16} />
                          </button>
                        );
                      })}
                    </div>
                    <input type="text" placeholder="Ghi chú..." value={tempAttendance[student.MaHS].note} onChange={e => setTempAttendance({...tempAttendance, [student.MaHS]: {...tempAttendance[student.MaHS], note: e.target.value}})} className="w-32 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5 text-[11px] font-normal outline-none focus:border-indigo-300" />
                  </div>
                ))}
             </div>
          </div>
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm h-fit space-y-4">
             <h3 className="font-bold text-xs text-slate-800 uppercase tracking-widest border-b pb-2">Xác nhận nộp</h3>
             <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-100 text-[11px] font-normal text-indigo-700 italic">Dữ liệu sẽ được lưu trữ vĩnh viễn trên Cloud sau khi bấm nút lưu.</div>
             <button onClick={saveRollCall} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest transition-all"><Save size={16} /> Lưu & Hoàn tất</button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 space-y-3">
            {filteredLogs.length > 0 ? filteredLogs.map(log => {
              const student = students.find(s => s.MaHS === log.MaHS);
              const conf = statusConfig[log.TrangThai];
              // Fix: Assign component to a capitalized variable before using it in JSX to avoid IntrinsicElements error
              const StatusIcon = conf.icon;
              return (
                <div key={log.MaTheoDoi} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${conf.bg} ${conf.color} border border-slate-100`}>
                    <StatusIcon size={20} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-0.5"><h4 className="font-bold text-slate-800 text-xs">{student?.Hoten}</h4><span className="text-[9px] font-normal text-slate-400">{log.NgayGhiChep}</span></div>
                    <p className="text-[11px] text-slate-500 font-normal italic leading-relaxed">"{log.NhanXet || 'Không có ghi chú'}"</p>
                  </div>
                </div>
              );
            }) : <div className="py-20 bg-white rounded-xl border-2 border-dashed border-slate-100 text-center font-bold text-slate-300 text-xs uppercase tracking-widest">Chưa có lịch sử</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default LearningLogs;
