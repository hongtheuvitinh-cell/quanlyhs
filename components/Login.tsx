
import React, { useState } from 'react';
import { GraduationCap, Users, UserCircle, Key, ArrowRight, ShieldCheck, X, ChevronRight, Eye, EyeOff, Lock, Shield } from 'lucide-react';
import { Role, Teacher, Student } from '../types';

interface Props {
  onLogin: (role: Role, id: string, pass: string) => void;
  teachers: Teacher[];
  students: Student[];
}

const Login: React.FC<Props> = ({ onLogin, teachers, students }) => {
  const [role, setRole] = useState<Role>(Role.STUDENT);
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [showHelper, setShowHelper] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id.trim() || !password.trim()) {
      setError('Vui lòng nhập ID và mật khẩu');
      return;
    }
    onLogin(role, id, password);
  };

  const handleSelectAccount = (val: string) => {
    setId(val);
    setShowHelper(false);
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600 rounded-full blur-[120px]"></div>
      </div>

      <div className="bg-white w-full max-w-[380px] rounded-[32px] shadow-2xl overflow-hidden border border-white/20 relative z-10 flex flex-col">
        <div className="bg-indigo-600 p-6 text-white relative overflow-hidden shrink-0">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <Shield size={20} />
              <h1 className="text-xl font-black tracking-tight uppercase italic">EduManager</h1>
            </div>
            <p className="text-indigo-100 font-bold text-[9px] uppercase tracking-widest opacity-70 text-center md:text-left">Hệ thống quản lý thông minh</p>
          </div>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex p-1 bg-gray-100 rounded-xl">
              <button
                type="button"
                onClick={() => setRole(Role.STUDENT)}
                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${role === Role.STUDENT ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}
              >
                Học sinh
              </button>
              <button
                type="button"
                onClick={() => setRole(Role.CHU_NHIEM)}
                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${role !== Role.STUDENT ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}
              >
                Giáo viên
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Mã định danh</label>
                  <button type="button" onClick={() => setShowHelper(true)} className="text-indigo-600 font-black text-[9px] uppercase hover:underline">Tra cứu</button>
                </div>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                  <input
                    type="text"
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    placeholder={role === Role.STUDENT ? "HS001" : "GV001"}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-600 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Mật khẩu</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-600 transition-all"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && <p className="text-[10px] font-bold text-rose-500 bg-rose-50 p-2 rounded-lg border border-rose-100">{error}</p>}
            </div>

            <button type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black shadow-lg hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest mt-2">
              Đăng nhập <ArrowRight size={16} />
            </button>
          </form>
        </div>
        
        <div className="p-4 bg-gray-50 text-center border-t border-gray-100">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Mật khẩu mặc định: <span className="text-indigo-600">123456</span></p>
        </div>
      </div>

      {showHelper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-[340px] rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-5 border-b flex items-center justify-between">
              <h3 className="font-black text-sm uppercase">Danh sách ID</h3>
              <button onClick={() => setShowHelper(false)} className="p-1 hover:bg-gray-100 rounded-full"><X size={20}/></button>
            </div>
            <div className="p-4 overflow-y-auto space-y-4 bg-gray-50/50">
              <div className="space-y-2">
                <p className="text-[9px] font-black text-indigo-500 uppercase px-1">Giáo viên</p>
                {teachers.map(t => (
                  <button key={t.MaGV} onClick={() => handleSelectAccount(t.MaGV)} className="w-full flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl hover:bg-indigo-50 transition-all text-left">
                    <div><p className="text-xs font-black">{t.Hoten}</p><p className="text-[9px] text-gray-400">{t.MaGV}</p></div>
                    <ChevronRight size={14} className="text-gray-300" />
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                <p className="text-[9px] font-black text-emerald-500 uppercase px-1">Học sinh</p>
                {students.map(s => (
                  <button key={s.MaHS} onClick={() => handleSelectAccount(s.MaHS)} className="w-full flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl hover:bg-emerald-50 transition-all text-left">
                    <div><p className="text-xs font-black">{s.Hoten}</p><p className="text-[9px] text-gray-400">{s.MaHS}</p></div>
                    <ChevronRight size={14} className="text-gray-300" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
