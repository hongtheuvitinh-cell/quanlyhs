
import React, { useMemo } from 'react';
import { 
  Users, 
  TrendingUp, 
  AlertCircle, 
  Calendar,
  CheckCircle2,
  FileText,
  ChevronRight
} from 'lucide-react';
import { AppState, Student, Grade, Discipline, Teacher, SchoolPlan } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Props {
  state: AppState;
  students: Student[];
  grades: Grade[];
  disciplines: Discipline[];
  plans: SchoolPlan[];
}

const Dashboard: React.FC<Props> = ({ state, students, grades, disciplines, plans }) => {
  const totalStudents = students.length;
  const classGrades = grades.filter(g => students.some(s => s.MaHS === g.MaHS));
  const avgGrade = classGrades.length > 0 
    ? (classGrades.reduce((sum, g) => sum + g.DiemSo, 0) / classGrades.length).toFixed(1)
    : '0.0';
  
  const classDisciplines = disciplines.filter(d => students.some(s => s.MaHS === d.MaHS));
  const pendingActions = classDisciplines.length;

  // Fix: Added useMemo import
  const latestPlan = useMemo(() => {
    return [...plans]
      .filter(p => p.MaNienHoc === state.selectedYear)
      .sort((a, b) => b.Tuan - a.Tuan)[0];
  }, [plans, state.selectedYear]);

  const data = [
    { name: 'Yếu', value: students.filter((_, i) => i % 5 === 0).length, color: '#f87171' },
    { name: 'Trung Bình', value: students.filter((_, i) => i % 3 === 0).length, color: '#fbbf24' },
    { name: 'Khá', value: students.filter((_, i) => i % 2 === 0).length, color: '#60a5fa' },
    { name: 'Giỏi', value: Math.max(0, students.length - 3), color: '#34d399' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Chào buổi sáng, {(state.currentUser as Teacher)?.Hoten}</h2>
          <p className="text-xs text-slate-400 font-normal">Dưới đây là tổng quan tình hình lớp {state.selectedClass}.</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl shadow-sm border border-slate-100">
          <Calendar size={14} className="text-indigo-600" />
          <span className="text-[11px] font-normal text-slate-600">{new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Users size={20} />} label="Sĩ số lớp" value={totalStudents.toString()} subValue="Học sinh" color="indigo" />
        <StatCard icon={<TrendingUp size={20} />} label="Điểm trung bình" value={avgGrade} subValue="Điểm/10" color="emerald" />
        <StatCard icon={<AlertCircle size={20} />} label="Vi phạm" value={pendingActions.toString()} subValue="Trường hợp" color="rose" />
        <StatCard icon={<CheckCircle2 size={20} />} label="Hiện diện" value="98%" subValue="Hôm nay" color="sky" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
           {latestPlan && (
             <div className="bg-white p-6 rounded-[32px] border border-indigo-100 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><FileText size={120} /></div>
                <div className="flex items-center gap-2 mb-4">
                   <div className="px-3 py-1 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest">Kế hoạch Tuần {latestPlan.Tuan}</div>
                   <span className="text-[9px] text-slate-400 font-bold uppercase">{latestPlan.TuNgay} → {latestPlan.DenNgay}</span>
                </div>
                <h3 className="text-base font-black text-slate-800 uppercase mb-3 leading-tight">{latestPlan.TieuDe}</h3>
                <p className="text-[11px] text-slate-500 font-medium italic line-clamp-2 mb-4">"{latestPlan.NoiDung}"</p>
                <div className="flex justify-end">
                   <button className="flex items-center gap-1.5 text-[10px] font-black text-indigo-600 uppercase hover:underline">Chi tiết kế hoạch <ChevronRight size={14}/></button>
                </div>
             </div>
           )}

           <div className="bg-white p-5 rounded-[32px] border border-slate-200 shadow-sm">
             <h3 className="text-xs font-bold mb-5 flex items-center gap-2 uppercase tracking-wider text-slate-800 px-1">
               <TrendingUp size={16} className="text-indigo-600" /> Phân loại học lực dự kiến
             </h3>
             <div className="h-[250px]">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={data}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                   <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} dy={10} />
                   <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                   <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px'}} />
                   <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={40}>
                     {data.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                   </Bar>
                 </BarChart>
               </ResponsiveContainer>
             </div>
           </div>
        </div>

        <div className="bg-white p-5 rounded-[32px] border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-xs font-bold mb-5 flex items-center gap-2 uppercase tracking-wider text-slate-800 px-1">
            <AlertCircle size={16} className="text-rose-600" /> Kỷ luật gần đây
          </h3>
          <div className="space-y-3 flex-1">
            {classDisciplines.length > 0 ? classDisciplines.slice(0, 6).map(d => {
              const student = students.find(s => s.MaHS === d.MaHS);
              return (
                <div key={d.MaKyLuat} className="flex gap-3 p-3 hover:bg-slate-50 rounded-2xl transition-colors border border-transparent hover:border-slate-100">
                  <div className="h-10 w-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600 shrink-0 font-black text-xs">
                    {student?.Hoten.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-800 truncate uppercase">{student?.Hoten}</p>
                    <p className="text-[10px] text-slate-400 font-medium line-clamp-1 italic">"{d.NoiDungChiTiet}"</p>
                    <span className="text-[8px] text-rose-500 font-black uppercase tracking-widest mt-1 block">{d.HinhThucXL}</span>
                  </div>
                </div>
              );
            }) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <CheckCircle2 size={40} className="text-emerald-200 mb-2" />
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest italic">Nề nếp lớp đang rất tốt</p>
              </div>
            )}
          </div>
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
    <div className="p-5 rounded-[28px] bg-white border border-slate-200 shadow-sm hover:scale-[1.02] transition-transform">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 border shadow-lg ${colors[color]}`}>{icon}</div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</p>
      <div className="flex items-baseline gap-2">
        <h4 className="text-2xl font-black text-slate-800">{value}</h4>
        <span className="text-[10px] text-slate-400 font-bold uppercase">{subValue}</span>
      </div>
    </div>
  );
};

export default Dashboard;
