
import React, { useState } from 'react';
import { Search, User, Users, Calendar, Phone, Trash2 } from 'lucide-react';
import { AppState, Student, Grade } from '../types';

interface Props {
  state: AppState;
  students: Student[];
  grades: Grade[];
  onUpdateStudent: (student: Student) => void;
  onDeleteStudent: (maHS: string) => void;
}

const StudentList: React.FC<Props> = ({ state, students, grades, onDeleteStudent }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredStudents = (students || []).filter(s => 
    s.Hoten.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.MaHS.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStudentAvg = (studentId: string) => {
    const sGrades = (grades || []).filter(g => g.MaHS === studentId && g.MaNienHoc === state.selectedYear);
    if (sGrades.length === 0) return null;
    const total = sGrades.reduce((sum, g) => sum + g.DiemSo, 0);
    return (total / sGrades.length).toFixed(1);
  };

  return (
    <div className="space-y-4 animate-in fade-in pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Users className="text-indigo-600" size={18} /> Danh sách lớp {state.selectedClass}
        </h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input 
            type="text" 
            placeholder="Tìm tên học sinh..." 
            className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none w-full sm:w-64 text-xs focus:bg-white transition-all" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredStudents.map((student) => {
          const avg = getStudentAvg(student.MaHS);
          return (
            <div key={student.MaHS} className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm hover:border-indigo-200 transition-all group">
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100 overflow-hidden">
                  {student.Anh ? <img src={student.Anh} className="w-full h-full object-cover" /> : <User size={24} className="text-indigo-300" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-black text-indigo-500 uppercase">{student.MaHS}</span>
                    <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase ${student.GioiTinh ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>
                      {student.GioiTinh ? 'Nam' : 'Nữ'}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 truncate">{student.Hoten}</h3>
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400 font-bold">
                     <span className="flex items-center gap-1"><Calendar size={12} /> {student.NgaySinh}</span>
                     <span className="flex items-center gap-1"><Phone size={12} /> {student.SDT_LinkHe}</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-1">
                   <span className="text-[10px] font-bold text-slate-400 uppercase">Điểm TB:</span>
                   <span className="text-xs font-black text-indigo-600">{avg || '--'}</span>
                </div>
                <button onClick={() => onDeleteStudent(student.MaHS)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all">
                  <Trash2 size={16}/>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StudentList;
