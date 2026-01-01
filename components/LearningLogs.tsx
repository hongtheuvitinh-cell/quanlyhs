
import React, { useState, useMemo } from 'react';
import { 
  ClipboardList, 
  Plus, 
  User, 
  MessageSquare, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Check, 
  Calendar,
  Search,
  Users,
  AlertTriangle,
  Save,
  ChevronRight,
  Info
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

  const filteredStudents = students.filter(s => 
    s.Hoten.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.MaHS.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const attendanceStats = useMemo(() => {
    const values = Object.values(tempAttendance) as Array<{ status: AttendanceStatus; note: string }>;
    return {
      present: values.filter(v => v.status === 'CO_MAT').length,
      absentCP: values.filter(v => v.status === 'VANG_CP').length,
      absentKP: values.filter(v => v.status === 'VANG_KP').length,
      late: values.filter(v => v.status === 'TRE').length,
    };
  }, [tempAttendance]);

  const handleUpdateStatus = (studentId: string, status: AttendanceStatus) => {
    setTempAttendance(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], status }
    }));
  };

  const handleUpdateNote = (studentId: string, note: string) => {
    setTempAttendance(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], note }
    }));
  };

  const saveRollCall = () => {
    // Sửa ID ở đây: dùng giây thay vì miligiây để không bị lỗi out of range integer
    const baseId = Math.floor(Date.now() / 1000);
    
    const newLogs: LearningLog[] = students.map((s, index) => ({
      MaTheoDoi: baseId + index + Math.floor(Math.random() * 1000),
      MaHS: s.MaHS,
      MaPhanCong: assignment.MaPhanCong,
      NgayGhiChep: selectedDate,
      NhanXet: tempAttendance[s.MaHS].note,
      TrangThai: tempAttendance[s.MaHS].status
    }));
    
    onUpdateLogs(newLogs);
    alert(`Đã lưu điểm danh ngày ${selectedDate} lên Cloud.`);
    setActiveTab('history');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[32px] shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg">
            <ClipboardList size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-800 tracking-tight">Nhật ký & Điểm danh</h2>
            <p className="text-sm text-gray-500 font-medium">Theo dõi nề nếp tiết học hàng ngày</p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-1 bg-gray-50 rounded-2xl border border-gray-100">
          <button 
            onClick={() => setActiveTab('history')} 
            className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'history' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}
          >
            Lịch sử nhật ký
          </button>
          <button 
            onClick={() => setActiveTab('rollcall')} 
            className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'rollcall' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}
          >
            Điểm danh mới
          </button>
        </div>
      </div>

      {activeTab === 'rollcall' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Tìm học sinh để điểm danh..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl outline-none text-sm w-64"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={18} className="text-gray-400" />
                  <input 
                    type="date" 
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="text-sm font-bold bg-transparent outline-none"
                  />
                </div>
              </div>

              <div className="divide-y divide-gray-50">
                {filteredStudents.map((student) => {
                  const current = tempAttendance[student.MaHS];
                  return (
                    <div key={student.MaHS} className="p-4 hover:bg-gray-50/50 transition-colors flex items-center gap-6">
                      <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center font-black text-gray-400 shrink-0">
                        {student.Anh ? <img src={student.Anh} className="w-full h-full object-cover rounded-xl" /> : student.Hoten.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-800 truncate">{student.Hoten}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">{student.MaHS}</p>
                      </div>
                      
                      <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl">
                        {(Object.keys(statusConfig) as AttendanceStatus[]).map(status => {
                          const conf = statusConfig[status];
                          const isActive = current.status === status;
                          return (
                            <button
                              key={status}
                              onClick={() => handleUpdateStatus(student.MaHS, status)}
                              title={conf.label}
                              className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all ${isActive ? `${conf.bg} ${conf.color} shadow-sm ring-1 ring-inset ring-gray-200` : 'text-gray-400 hover:text-gray-600'}`}
                            >
                              <conf.icon size={20} />
                            </button>
                          );
                        })}
                      </div>

                      <div className="w-48">
                        <input 
                          type="text" 
                          placeholder="Nhận xét nhanh..."
                          value={current.note}
                          onChange={(e) => handleUpdateNote(student.MaHS, e.target.value)}
                          className="w-full bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 ring-indigo-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 sticky top-24">
              <h3 className="font-black text-lg text-gray-800 mb-6 flex items-center gap-2">
                <Users size={20} className="text-indigo-600" /> Thống kê hôm nay
              </h3>
              
              <div className="space-y-4 mb-8">
                <StatRow label="Hiện diện" value={attendanceStats.present} color="text-emerald-600" bg="bg-emerald-50" icon={CheckCircle2} />
                <StatRow label="Vắng có phép" value={attendanceStats.absentCP} color="text-amber-600" bg="bg-amber-50" icon={AlertTriangle} />
                <StatRow label="Vắng không phép" value={attendanceStats.absentKP} color="text-rose-600" bg="bg-rose-50" icon={XCircle} />
                <StatRow label="Đi học trễ" value={attendanceStats.late} color="text-indigo-600" bg="bg-indigo-50" icon={Clock} />
              </div>

              <div className="bg-indigo-50 p-4 rounded-2xl mb-8 border border-indigo-100">
                <div className="flex gap-3 text-indigo-700">
                  <Info size={20} className="shrink-0" />
                  <p className="text-xs font-medium leading-relaxed">
                    Dữ liệu điểm danh sẽ được đồng bộ vào học bạ nề nếp của học sinh ngay sau khi lưu.
                  </p>
                </div>
              </div>

              <button 
                onClick={saveRollCall}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                <Save size={20} /> Lưu & Hoàn tất
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 space-y-6">
            {filteredLogs.length > 0 ? filteredLogs.map(log => {
              const student = students.find(s => s.MaHS === log.MaHS);
              const config = statusConfig[log.TrangThai];
              return (
                <div key={log.MaTheoDoi} className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 flex items-center gap-6 hover:shadow-md transition-shadow">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black shrink-0 ${config.bg} ${config.color} border border-gray-50`}>
                    <config.icon size={28} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-bold text-gray-800">{student?.Hoten}</h4>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{new Date(log.NgayGhiChep).toLocaleDateString('vi-VN')}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                       <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter ${config.bg} ${config.color}`}>
                         {config.label}
                       </span>
                    </div>
                    <p className="text-sm text-gray-500 italic flex items-start gap-2">
                      <MessageSquare size={14} className="mt-1 shrink-0 text-gray-300" />
                      "{log.NhanXet || 'Không có nhận xét chi tiết'}"
                    </p>
                  </div>
                  <ChevronRight className="text-gray-200" />
                </div>
              );
            }) : (
              <div className="bg-white rounded-[40px] border border-dashed border-gray-200 py-20 flex flex-col items-center justify-center opacity-50">
                <ClipboardList size={48} className="mb-4 text-gray-300" />
                <p className="font-bold text-gray-400">Chưa có dữ liệu lịch sử nhật ký</p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-gray-900 text-white p-8 rounded-[40px] shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-5"><Users size={120} /></div>
               <h3 className="font-black text-xl mb-4 relative z-10">Lưu ý chuyên cần</h3>
               <ul className="space-y-4 relative z-10">
                 <li className="flex gap-3 text-sm text-gray-400">
                    <Check className="text-emerald-500 shrink-0" size={18} />
                    <span>Học sinh vắng quá 45 buổi sẽ bị đình chỉ học tập.</span>
                 </li>
                 <li className="flex gap-3 text-sm text-gray-400">
                    <Check className="text-emerald-500 shrink-0" size={18} />
                    <span>Hệ thống tự động thông báo khi có cập nhật Vắng/Trễ.</span>
                 </li>
               </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatRow = ({ label, value, color, bg, icon: Icon }: any) => (
  <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50/50 border border-gray-50">
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg ${bg} ${color}`}><Icon size={16} /></div>
      <span className="text-xs font-bold text-gray-500">{label}</span>
    </div>
    <span className={`text-sm font-black ${color}`}>{value}</span>
  </div>
);

export default LearningLogs;
