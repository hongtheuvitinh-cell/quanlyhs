
import React from 'react';
import { 
  Users, 
  TrendingUp, 
  AlertCircle, 
  Calendar,
  CheckCircle2
} from 'lucide-react';
// Added Teacher to imports
import { AppState, Student, Grade, Discipline, Teacher } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Props {
  state: AppState;
  students: Student[];
  grades: Grade[];
  disciplines: Discipline[];
}

const Dashboard: React.FC<Props> = ({ state, students, grades, disciplines }) => {
  // Statistics
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
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          {/* Fixed: Use currentUser as Teacher to access Hoten */}
          <h2 className="text-2xl font-bold text-gray-800">Chào buổi sáng, {(state.currentUser as Teacher)?.Hoten}</h2>
          <p className="text-gray-500">Dưới đây là tổng quan tình hình lớp {state.selectedClass}.</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
          <Calendar size={18} className="text-indigo-600" />
          <span className="text-sm font-medium text-gray-700">{new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={<Users size={24} />} 
          label="Sĩ số lớp" 
          value={totalStudents.toString()} 
          subValue="Học sinh"
          color="indigo" 
        />
        <StatCard 
          icon={<TrendingUp size={24} />} 
          label="Điểm trung bình" 
          value={avgGrade} 
          subValue="Điểm/10"
          color="emerald" 
        />
        <StatCard 
          icon={<AlertCircle size={24} />} 
          label="Vi phạm mới" 
          value={pendingActions.toString()} 
          subValue="Trường hợp"
          color="rose" 
        />
        <StatCard 
          icon={<CheckCircle2 size={24} />} 
          label="Tỉ lệ hiện diện" 
          value="98%" 
          subValue="Hôm nay"
          color="sky" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-indigo-600" />
            Phân loại học lực
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                <Tooltip cursor={{fill: '#f9fafb'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <AlertCircle size={20} className="text-rose-600" />
            Kỷ luật gần đây
          </h3>
          <div className="space-y-4 flex-1">
            {classDisciplines.length > 0 ? classDisciplines.map(d => {
              const student = students.find(s => s.MaHS === d.MaHS);
              return (
                <div key={d.MaKyLuat} className="flex gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors">
                  <div className="h-10 w-10 bg-rose-100 rounded-full flex items-center justify-center text-rose-600 shrink-0 font-bold">
                    {student?.Hoten.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{student?.Hoten}</p>
                    {/* Fixed: Use NoiDungChiTiet instead of NoiDung */}
                    <p className="text-xs text-gray-500 line-clamp-1">{d.NoiDungChiTiet}</p>
                    <span className="text-[10px] text-rose-500 font-bold uppercase tracking-wider">{d.HinhThucXL}</span>
                  </div>
                </div>
              );
            }) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <CheckCircle2 size={48} className="text-emerald-500 mb-2 opacity-20" />
                <p className="text-gray-400 text-sm italic">Chưa có vi phạm nào được ghi nhận.</p>
              </div>
            )}
          </div>
          <button className="mt-4 w-full py-2 bg-gray-50 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-100 transition-colors uppercase tracking-widest">
            Xem tất cả
          </button>
        </div>
      </div>
    </div>
  );
};

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue: string;
  color: 'indigo' | 'emerald' | 'rose' | 'sky';
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, subValue, color }) => {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    sky: 'bg-sky-50 text-sky-600 border-sky-100',
  };

  return (
    <div className={`p-6 rounded-2xl bg-white border border-gray-100 shadow-sm transition-transform hover:-translate-y-1`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 border ${colors[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
        <div className="flex items-baseline gap-2">
          <h4 className="text-3xl font-bold text-gray-800">{value}</h4>
          <span className="text-xs text-gray-400">{subValue}</span>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
