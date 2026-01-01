
import React, { useState } from 'react';
// Added ChevronRight to the imports from lucide-react
import { Search, User, Users, Calendar, Phone, Trash2, Plus, Sparkles, X, Save, Edit2, MapPin, Mail, Info, Loader2, ChevronRight } from 'lucide-react';
import { AppState, Student, Grade } from '../types';
import { analyzeStudentPerformance } from '../services/geminiService';

interface Props {
  state: AppState;
  students: Student[];
  grades: Grade[];
  onUpdateStudent: (student: Student) => void;
  onDeleteStudent: (maHS: string) => void;
}

const StudentList: React.FC<Props> = ({ state, students, grades, onUpdateStudent, onDeleteStudent }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
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

  const handleAnalyze = async (student: Student) => {
    setIsAnalyzing(true);
    setAiResult(null);
    try {
      const studentGrades = grades.filter(g => g.MaHS === student.MaHS);
      const analysis = await analyzeStudentPerformance(student, studentGrades, []);
      setAiResult(analysis);
    } catch (err) {
      setAiResult("Không thể phân tích lúc này.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-md"><Users size={20} /></div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Quản lý Học sinh & SYLL</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Lớp {state.selectedClass} • {students.length} học sinh</p>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input 
            type="text" 
            placeholder="Tìm theo tên hoặc mã..." 
            className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none w-full sm:w-64 text-xs focus:bg-white transition-all shadow-inner" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredStudents.map((student) => {
          const avg = getStudentAvg(student.MaHS);
          return (
            <div 
              key={student.MaHS} 
              onClick={() => setSelectedStudent(student)}
              className="bg-white p-5 rounded-[32px] border border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-50/50 transition-all group cursor-pointer relative overflow-hidden"
            >
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100 overflow-hidden shadow-sm group-hover:scale-105 transition-transform">
                  {student.Anh ? <img src={student.Anh} className="w-full h-full object-cover" /> : <User size={28} className="text-indigo-300" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">{student.MaHS}</span>
                    <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase ${student.GioiTinh ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>
                      {student.GioiTinh ? 'Nam' : 'Nữ'}
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-slate-800 truncate group-hover:text-indigo-600 transition-colors uppercase">{student.Hoten}</h3>
                  <div className="flex flex-col gap-1 mt-2">
                     <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold"><Calendar size={12} className="text-indigo-300" /> {student.NgaySinh}</div>
                     <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold"><Phone size={12} className="text-indigo-300" /> {student.SDT_LinkHe}</div>
                  </div>
                </div>
              </div>
              
              <div className="mt-5 pt-4 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                   <div className="p-1 bg-indigo-50 rounded-md"><Sparkles size={10} className="text-indigo-600" /></div>
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Điểm TB:</span>
                   <span className={`text-xs font-black ${Number(avg) >= 8 ? 'text-emerald-600' : 'text-indigo-600'}`}>{avg || '--'}</span>
                </div>
                <div className="flex items-center gap-1">
                   <button onClick={(e) => { e.stopPropagation(); onDeleteStudent(student.MaHS); }} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
                   <ChevronRight size={14} className="text-slate-300" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
             <div className="p-6 border-b flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg"><Info size={20} /></div>
                   <div>
                     <h3 className="font-black text-slate-800 text-sm uppercase tracking-tight">Sơ yếu lý lịch chi tiết</h3>
                     <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Học sinh: {selectedStudent.Hoten}</p>
                   </div>
                </div>
                <button onClick={() => { setSelectedStudent(null); setAiResult(null); }} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={24} className="text-slate-400"/></button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/30">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                   <div className="lg:col-span-4 space-y-6">
                      <div className="aspect-square bg-white rounded-[40px] border border-slate-200 p-2 shadow-sm overflow-hidden group">
                         {selectedStudent.Anh ? <img src={selectedStudent.Anh} className="w-full h-full object-cover rounded-[32px]" /> : <div className="w-full h-full bg-slate-50 rounded-[32px] flex items-center justify-center text-slate-200"><User size={64}/></div>}
                      </div>
                      <div className="bg-indigo-600 p-6 rounded-[32px] text-white shadow-xl shadow-indigo-200 relative overflow-hidden">
                         <div className="relative z-10">
                            <h4 className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Xếp loại học lực</h4>
                            <div className="flex items-baseline gap-2">
                               <span className="text-3xl font-black">{getStudentAvg(selectedStudent.MaHS) || '--'}</span>
                               <span className="text-xs font-bold opacity-80 uppercase">Điểm TB</span>
                            </div>
                            <button 
                              onClick={() => handleAnalyze(selectedStudent)}
                              disabled={isAnalyzing}
                              className="mt-4 w-full py-3 bg-white/20 hover:bg-white/30 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest backdrop-blur-md transition-all border border-white/10"
                            >
                               {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                               {isAnalyzing ? "Đang phân tích..." : "AI Phân tích học tập"}
                            </button>
                         </div>
                         <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                      </div>
                   </div>

                   <div className="lg:col-span-8 space-y-8">
                      {aiResult && (
                        <div className="p-6 bg-white border border-indigo-200 rounded-[32px] shadow-sm animate-in slide-in-from-top-4">
                           <div className="flex items-center gap-2 mb-3 text-indigo-600">
                              <Sparkles size={18} />
                              <h5 className="text-[11px] font-black uppercase tracking-widest">Nhận xét từ Trợ lý AI</h5>
                           </div>
                           <p className="text-[12px] text-slate-600 font-medium leading-relaxed italic">"{aiResult}"</p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="space-y-4">
                            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Thông tin cá nhân</h5>
                            <div className="space-y-3">
                               <div className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                  <div className="p-2 bg-slate-50 rounded-lg text-slate-400"><Calendar size={14}/></div>
                                  <div><p className="text-[9px] text-slate-400 uppercase font-bold">Ngày sinh</p><p className="text-xs font-bold text-slate-700">{selectedStudent.NgaySinh}</p></div>
                               </div>
                               <div className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                  <div className="p-2 bg-slate-50 rounded-lg text-slate-400"><Phone size={14}/></div>
                                  <div><p className="text-[9px] text-slate-400 uppercase font-bold">Số điện thoại</p><p className="text-xs font-bold text-slate-700">{selectedStudent.SDT_LinkHe}</p></div>
                               </div>
                               <div className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                  <div className="p-2 bg-slate-50 rounded-lg text-slate-400"><MapPin size={14}/></div>
                                  <div><p className="text-[9px] text-slate-400 uppercase font-bold">Địa chỉ</p><p className="text-xs font-bold text-slate-700 truncate max-w-[150px]">{selectedStudent.DiaChi}</p></div>
                                </div>
                            </div>
                         </div>
                         <div className="space-y-4">
                            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Gia đình & Liên hệ</h5>
                            <div className="space-y-3">
                               <div className="p-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                  <p className="text-[9px] text-slate-400 uppercase font-bold">Thông tin Cha</p>
                                  <p className="text-xs font-bold text-slate-700 mt-0.5">{selectedStudent.TenCha || '---'}</p>
                                  <p className="text-[9px] text-slate-400 italic">{selectedStudent.NgheNghiepCha}</p>
                               </div>
                               <div className="p-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                  <p className="text-[9px] text-slate-400 uppercase font-bold">Thông tin Mẹ</p>
                                  <p className="text-xs font-bold text-slate-700 mt-0.5">{selectedStudent.TenMe || '---'}</p>
                                  <p className="text-[9px] text-slate-400 italic">{selectedStudent.NgheNghiepMe}</p>
                               </div>
                            </div>
                         </div>
                      </div>
                      
                      <div className="p-6 bg-slate-900 rounded-[32px] text-white">
                         <h5 className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-4 px-1">Ghi chú từ giáo viên</h5>
                         <p className="text-xs font-medium leading-relaxed italic text-slate-300">"{selectedStudent.GhiChuKhac || 'Chưa có ghi chú đặc biệt cho học sinh này.'}"</p>
                      </div>
                   </div>
                </div>
             </div>
             
             <div className="p-6 bg-slate-50 border-t flex justify-end gap-3 shrink-0">
                <button onClick={() => setSelectedStudent(null)} className="px-8 py-3 bg-white border border-slate-200 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all">Đóng</button>
                <button className="px-10 py-3 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-2 text-[10px] uppercase tracking-widest"><Edit2 size={16}/> Chỉnh sửa SYLL</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentList;
