
import React from 'react';
import { 
  Users, 
  TrendingUp, 
  AlertCircle, 
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { AppState, Student, Grade, Discipline, Teacher } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Props {
  state: AppState;
  students: Student[];
  grades: Grade[];
  disciplines: Discipline[];
}

const Dashboard: React.FC<Props> = ({ state, students, grades, disciplines }) => {
  const totalStudents = students.length;
  const classGrades = grades.filter(g => students.some(s => s.MaHS === g.MaHS));
  const avgGrade = classGrades.length > 0 
    ? (classGrades.reduce((sum, g) => sum + g.DiemSo, 0) / classGrades.length).toFixed(1)
    : '0.0';
  
  const classDisciplines = disciplines.filter(d => students.some(s => s.MaHS === d.MaHS));
  const pendingActions = classDisciplines.length;

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
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-xs font-bold mb-5 flex items-center gap-2 uppercase tracking-wider text-slate-800">
            <TrendingUp size={16} className="text-indigo-600" /> Phân loại học lực
          </h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px'}} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={32}>
                  {data.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-xs font-bold mb-5 flex items-center gap-2 uppercase tracking-wider text-slate-800">
            <AlertCircle size={16} className="text-rose-600" /> Kỷ luật gần đây
          </h3>
          <div className="space-y-3 flex-1">
            {classDisciplines.length > 0 ? classDisciplines.slice(0, 5).map(d => {
              const student = students.find(s => s.MaHS === d.MaHS);
              return (
                <div key={d.MaKyLuat} className="flex gap-3 p-2.5 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-100">
                  <div className="h-9 w-9 bg-rose-50 rounded-lg flex items-center justify-center text-rose-600 shrink-0 font-bold text-xs">
                    {student?.Hoten.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{student?.Hoten}</p>
                    <p className="text-[11px] text-slate-400 font-normal line-clamp-1">"{d.NoiDungChiTiet}"</p>
                    <span className="text-[9px] text-rose-500 font-bold uppercase tracking-tighter">{d.HinhThucXL}</span>
                  </div>
                </div>
              );
            }) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <CheckCircle2 size={32} className="text-emerald-200 mb-2" />
                <p className="text-slate-400 text-[10px] font-normal italic">Nề nếp lớp đang rất tốt.</p>
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
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    sky: 'bg-sky-50 text-sky-600 border-sky-100',
  };
  return (
    <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 border ${colors[color]}`}>{icon}</div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <div className="flex items-baseline gap-1.5">
        <h4 className="text-xl font-medium text-slate-800">{value}</h4>
        <span className="text-[10px] text-slate-400 font-normal">{subValue}</span>
      </div>
    </div>
  );
};

export default Dashboard;
