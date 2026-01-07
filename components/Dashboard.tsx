
import React, { useMemo, useState, useEffect } from 'react';
import { 
  Users, TrendingUp, AlertCircle, Calendar, CheckCircle2, FileText, ChevronRight, Link as LinkIcon, Lock, Loader2
} from 'lucide-react';
import { AppState, Student, Teacher, SchoolPlan, ChatMessage, Role } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { supabase } from '../services/supabaseClient';

interface Props {
  state: AppState;
  students: Student[];
  plans: SchoolPlan[];
  messages: ChatMessage[];
  onSendMessage: (content: string) => Promise<void>;
}

const Dashboard: React.FC<Props> = ({ state, students, plans, messages, onSendMessage }) => {
  const [stats, setStats] = useState({ avg: '0.0', violations: 0, attendance: '98%' });
  const [isLoading, setIsLoading] = useState(false);
  const currentUser = state.currentUser as Teacher;
  const isAdmin = currentUser?.quanly === true;

  const fetchStats = async () => {
    if (students.length === 0) return;
    setIsLoading(true);
    try {
      const studentIds = students.map(s => s.MaHS);
      const [gradesRes, disciplineRes] = await Promise.all([
        supabase.from('grades').select('DiemSo').in('MaHS', studentIds).eq('MaNienHoc', state.selectedYear),
        supabase.from('disciplines').select('MaKyLuat', { count: 'exact' }).in('MaHS', studentIds).eq('MaNienHoc', state.selectedYear)
      ]);

      const avg = gradesRes.data && gradesRes.data.length > 0 
        ? (gradesRes.data.reduce((sum, g) => sum + g.DiemSo, 0) / gradesRes.data.length).toFixed(1)
        : '0.0';

      setStats({
        avg,
        violations: disciplineRes.count || 0,
        attendance: '98%'
      });
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchStats(); }, [state.selectedClass, students]);

  const latestPlan = useMemo(() => {
    return [...(plans || [])]
      .filter(p => p.MaNienHoc === state.selectedYear)
      .filter(p => isAdmin || p.MaGV === currentUser?.MaGV)
      .sort((a, b) => b.Tuan - a.Tuan)[0];
  }, [plans, state.selectedYear, currentUser?.MaGV, isAdmin]);

  const data = [
    { name: 'Yếu', value: Math.floor(students.length * 0.1), color: '#f87171' },
    { name: 'TB', value: Math.floor(students.length * 0.3), color: '#fbbf24' },
    { name: 'Khá', value: Math.floor(students.length * 0.4), color: '#60a5fa' },
    { name: 'Giỏi', value: Math.max(0, students.length - Math.floor(students.length * 0.8)), color: '#34d399' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Xin chào, {currentUser?.Hoten}</h2>
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">Lớp {state.selectedClass} • Tổng số {students.length} học sinh</p>
        </div>
        <div className="px-3 py-1.5 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center gap-2">
          <Calendar size={14} className="text-indigo-600" />
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight">{new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative">
        {isLoading && <div className="absolute inset-0 z-10 bg-white/20 backdrop-blur-[1px] rounded-[28px]" />}
        <StatCard icon={<Users size={20} />} label="Sĩ số" value={students.length.toString()} subValue="HS" color="indigo" />
        <StatCard icon={<TrendingUp size={20} />} label="ĐTB Chung" value={stats.avg} subValue="Điểm" color="emerald" />
        <StatCard icon={<AlertCircle size={20} />} label="Vi phạm" value={stats.violations.toString()} subValue="Lỗi" color="rose" />
        <StatCard icon={<CheckCircle2 size={20} />} label="Hiện diện" value={stats.attendance} subValue="Hôm nay" color="sky" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
           {latestPlan ? (
             <div className="bg-white p-8 rounded-[40px] border border-indigo-100 shadow-sm relative overflow-hidden group">
                <div className="flex items-center gap-2 mb-4">
                   <div className="px-3 py-1 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest">Kế hoạch Tuần {latestPlan.Tuan}</div>
                </div>
                <h3 className="text-base font-black text-slate-800 uppercase mb-3 leading-tight">{latestPlan.TieuDe}</h3>
                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-50 mb-4 shadow-inner">
                   <p className="text-[11px] text-slate-500 font-medium italic whitespace-pre-line leading-relaxed">"{latestPlan.NoiDung}"</p>
                </div>
                <button className="flex items-center gap-1.5 text-[10px] font-black text-indigo-600 uppercase hover:underline">Xem tất cả kế hoạch <ChevronRight size={14}/></button>
             </div>
           ) : (
             <div className="bg-white p-10 rounded-[40px] border-2 border-dashed border-slate-100 text-center opacity-40">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Chưa có kế hoạch tuần này</p>
             </div>
           )}

           <div className="bg-white p-5 rounded-[32px] border shadow-sm">
             <h3 className="text-[10px] font-black mb-5 flex items-center gap-2 uppercase tracking-widest text-slate-400 px-1"><TrendingUp size={16} className="text-indigo-600" /> Thống kê học lực dự kiến</h3>
             <div className="h-[250px]">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={data}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                   <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} dy={10} />
                   <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                   <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', fontSize: '11px'}} />
                   <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={40}>
                     {data.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                   </Bar>
                 </BarChart>
               </ResponsiveContainer>
             </div>
           </div>
        </div>

        <div className="bg-white p-10 rounded-[32px] border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center opacity-40 h-full">
            <div className="p-6 bg-slate-50 rounded-full mb-4"><Lock size={48} className="text-slate-200" /></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-8 leading-loose">Hệ thống thông báo thông minh đang cập nhật phiên bản mới</p>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, subValue, color }: any) => {
  const colors: any = {
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100 shadow-indigo-50/50',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-emerald-50/50',
    rose: 'bg-rose-50 text-rose-600 border-rose-100 shadow-rose-50/50',
    sky: 'bg-sky-50 text-sky-600 border-sky-100 shadow-sky-50/50',
  };
  return (
    <div className="p-5 rounded-[28px] bg-white border border-slate-200 shadow-sm group hover:border-indigo-400 transition-all">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 border shadow-lg ${colors[color]}`}>{icon}</div>
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <div className="flex items-baseline gap-2">
        <h4 className="text-2xl font-black text-slate-800 tracking-tight">{value}</h4>
        <span className="text-[9px] text-slate-400 font-bold uppercase">{subValue}</span>
      </div>
    </div>
  );
};

export default Dashboard;
