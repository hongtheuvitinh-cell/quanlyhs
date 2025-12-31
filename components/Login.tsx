
import React, { useState } from 'react';
import { GraduationCap, Users, UserCircle, Key, ArrowRight, ShieldCheck, Sparkles, HelpCircle, X, ChevronRight, Check } from 'lucide-react';
import { Role, Teacher, Student } from '../types';

interface Props {
  onLogin: (role: Role, id: string) => void;
  teachers: Teacher[];
  students: Student[];
}

const Login: React.FC<Props> = ({ onLogin, teachers, students }) => {
  const [role, setRole] = useState<Role>(Role.STUDENT);
  const [id, setId] = useState('');
  const [error, setError] = useState('');
  const [showHelper, setShowHelper] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id.trim()) {
      setError('Vui lòng nhập mã định danh của bạn');
      return;
    }
    onLogin(role, id);
  };

  const copyId = (val: string) => {
    setId(val);
    setShowHelper(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* BACKGROUND DECORATION */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-100/40 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-100/40 rounded-full blur-[120px]"></div>
      </div>

      <div className="bg-white w-full max-w-lg rounded-[48px] shadow-2xl shadow-indigo-100/50 overflow-hidden border border-white relative z-10 transition-all">
        <div className="bg-indigo-600 p-12 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12"><GraduationCap size={160} /></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md"><Sparkles size={24} /></div>
              <h1 className="text-3xl font-black tracking-tight">EduManager Cloud</h1>
            </div>
            <p className="text-indigo-100 font-medium">Hệ thống quản lý học tập thông minh 4.0</p>
          </div>
        </div>

        <div className="p-12">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Bạn là ai?</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => { setRole(Role.STUDENT); setId(''); }}
                  className={`flex flex-col items-center gap-3 p-6 rounded-3xl border-2 transition-all ${role === Role.STUDENT ? 'bg-indigo-50 border-indigo-600 text-indigo-700 shadow-md' : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'}`}
                >
                  <UserCircle size={32} />
                  <span className="font-bold text-sm">Học sinh</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setRole(Role.CHU_NHIEM); setId(''); }}
                  className={`flex flex-col items-center gap-3 p-6 rounded-3xl border-2 transition-all ${role !== Role.STUDENT ? 'bg-indigo-50 border-indigo-600 text-indigo-700 shadow-md' : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'}`}
                >
                  <Users size={32} />
                  <span className="font-bold text-sm">Giáo viên</span>
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 flex justify-between items-center">
                  <span>{role === Role.STUDENT ? 'Mã số Học sinh' : 'Mã số Giáo viên'}</span>
                  <button type="button" onClick={() => setShowHelper(true)} className="text-indigo-600 hover:underline flex items-center gap-1"><HelpCircle size={10}/> Quên ID?</button>
                </label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                  <input
                    type="text"
                    value={id}
                    onChange={(e) => { setId(e.target.value); setError(''); }}
                    placeholder={role === Role.STUDENT ? "VD: HS001" : "VD: GV001"}
                    className="w-full pl-12 pr-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-gray-700 outline-none focus:ring-4 ring-indigo-500/10 focus:border-indigo-600 transition-all"
                  />
                </div>
                {error && <p className="text-xs font-bold text-rose-500 mt-2 px-1 flex items-center gap-1"><ShieldCheck size={14} /> {error}</p>}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black shadow-xl shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              Đăng nhập Cloud <ArrowRight size={20} />
            </button>
          </form>
        </div>
      </div>

      {/* HELPER MODAL */}
      {showHelper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-indigo-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-8 border-b flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-gray-800 tracking-tight">Hỗ trợ Cloud</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Danh sách tài khoản hiện có</p>
              </div>
              <button onClick={() => setShowHelper(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={24} className="text-gray-400"/></button>
            </div>
            <div className="p-6 max-h-[400px] overflow-y-auto custom-scrollbar space-y-4">
              <div className="space-y-2">
                <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2"><Users size={12}/> Giáo viên ({teachers.length})</h4>
                <div className="space-y-1">
                  {teachers.map(t => (
                    <button key={t.MaGV} onClick={() => copyId(t.MaGV)} className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-indigo-50 rounded-xl transition-all group">
                       <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center font-black text-[10px] text-gray-400 group-hover:text-indigo-600 border border-gray-100">ID</div>
                         <div className="text-left"><p className="text-xs font-bold text-gray-800">{t.Hoten}</p><p className="text-[10px] text-gray-400 font-black">{t.MaGV}</p></div>
                       </div>
                       <ChevronRight size={14} className="text-gray-300 group-hover:text-indigo-600" />
                    </button>
                  ))}
                  {teachers.length === 0 && <p className="text-xs italic text-gray-400 p-2">Chưa có giáo viên nào trên Cloud.</p>}
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2"><UserCircle size={12}/> Học sinh ({students.length})</h4>
                <div className="space-y-1">
                  {students.slice(0, 10).map(s => (
                    <button key={s.MaHS} onClick={() => copyId(s.MaHS)} className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-emerald-50 rounded-xl transition-all group">
                       <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center font-black text-[10px] text-gray-400 group-hover:text-emerald-600 border border-gray-100">HS</div>
                         <div className="text-left"><p className="text-xs font-bold text-gray-800">{s.Hoten}</p><p className="text-[10px] text-gray-400 font-black">{s.MaHS}</p></div>
                       </div>
                       <ChevronRight size={14} className="text-gray-300 group-hover:text-emerald-600" />
                    </button>
                  ))}
                  {students.length > 10 && <p className="text-[10px] text-gray-400 text-center italic mt-2">...và {students.length - 10} học sinh khác</p>}
                  {students.length === 0 && <p className="text-xs italic text-gray-400 p-2">Chưa có học sinh nào trên Cloud.</p>}
                </div>
              </div>
            </div>
            <div className="p-6 bg-gray-50 text-center border-t">
              <p className="text-[10px] font-black text-indigo-400 uppercase leading-relaxed">Nhấn vào một tài khoản để tự động điền mã đăng nhập</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
