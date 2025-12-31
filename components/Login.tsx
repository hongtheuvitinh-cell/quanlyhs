
import React, { useState } from 'react';
import { GraduationCap, Users, UserCircle, Key, ArrowRight, ShieldCheck, Sparkles, HelpCircle, X, ChevronRight, Eye, EyeOff, Lock, Shield } from 'lucide-react';
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
      setError('Vui lòng nhập đầy đủ thông tin xác thực');
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
      {/* HIỆU ỨNG NỀN HIỆN ĐẠI */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-500 rounded-full blur-[150px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-indigo-600 rounded-full blur-[150px]"></div>
      </div>

      <div className="bg-white/95 backdrop-blur-xl w-full max-w-lg rounded-[48px] shadow-2xl overflow-hidden border border-white/20 relative z-10 flex flex-col">
        {/* HEADER ĐĂNG NHẬP */}
        <div className="bg-indigo-600 p-10 text-white relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12"><GraduationCap size={160} /></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md border border-white/30"><Shield size={24} /></div>
              <h1 className="text-3xl font-black tracking-tighter uppercase italic">EduManager Cloud</h1>
            </div>
            <p className="text-indigo-100 font-bold text-xs uppercase tracking-widest opacity-80">Hệ thống quản lý giáo dục bảo mật cao</p>
          </div>
        </div>

        <div className="p-10 flex-1">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Xác nhận vai trò</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => { setRole(Role.STUDENT); setError(''); }}
                  className={`flex flex-col items-center gap-2 p-5 rounded-[24px] border-2 transition-all duration-300 ${role === Role.STUDENT ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-200' : 'bg-gray-50 border-gray-100 text-gray-400 hover:border-gray-200'}`}
                >
                  <UserCircle size={28} />
                  <span className="font-black text-[10px] uppercase">Học sinh</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setRole(Role.CHU_NHIEM); setError(''); }}
                  className={`flex flex-col items-center gap-2 p-5 rounded-[24px] border-2 transition-all duration-300 ${role !== Role.STUDENT ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-200' : 'bg-gray-50 border-gray-100 text-gray-400 hover:border-gray-200'}`}
                >
                  <Users size={28} />
                  <span className="font-black text-[10px] uppercase">Giáo viên</span>
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 flex justify-between items-center">
                  <span>Mã số định danh</span>
                  <button type="button" onClick={() => setShowHelper(true)} className="text-indigo-600 hover:underline flex items-center gap-1 font-black text-[9px]"><HelpCircle size={10}/> TRA CỨU ID</button>
                </label>
                <div className="relative group">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-indigo-600 transition-colors" size={18} />
                  <input
                    type="text"
                    value={id}
                    onChange={(e) => { setId(e.target.value); setError(''); }}
                    placeholder={role === Role.STUDENT ? "VD: HS001" : "VD: GV001"}
                    className="w-full pl-12 pr-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl font-black text-gray-700 outline-none focus:ring-4 ring-indigo-500/10 focus:border-indigo-600 transition-all placeholder:text-gray-300"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Mật khẩu truy cập</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-indigo-600 transition-colors" size={18} />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    placeholder="Nhập mật khẩu..."
                    className="w-full pl-12 pr-12 py-4 bg-gray-50 border border-gray-200 rounded-2xl font-black text-gray-700 outline-none focus:ring-4 ring-indigo-500/10 focus:border-indigo-600 transition-all placeholder:text-gray-300"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-indigo-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-xs font-black animate-in fade-in slide-in-from-top-2">
                  <ShieldCheck size={16} /> {error}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black shadow-xl shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-3 mt-4 uppercase tracking-widest text-sm"
            >
              Xác thực & Vào hệ thống <ArrowRight size={20} />
            </button>
          </form>
        </div>
        
        <div className="p-6 bg-gray-50 text-center border-t border-gray-100">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed">
            Mật khẩu mặc định: <span className="text-indigo-600 font-black">123456</span> <br/>
            Dành cho tài khoản mới được đăng ký trên Cloud.
          </p>
        </div>
      </div>

      {/* MODAL TRA CỨU - CHỈ HIỂN THỊ ID, KHÔNG HIỂN THỊ PASS */}
      {showHelper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b flex items-center justify-between bg-white">
              <div>
                <h3 className="text-xl font-black text-gray-800 tracking-tighter">Tra cứu tài khoản</h3>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Dữ liệu công khai từ Cloud</p>
              </div>
              <button onClick={() => setShowHelper(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={24} className="text-gray-400"/></button>
            </div>
            <div className="p-6 max-h-[400px] overflow-y-auto custom-scrollbar space-y-6 bg-gray-50/30">
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2"><Users size={14}/> Danh sách Giáo viên</h4>
                <div className="grid grid-cols-1 gap-2">
                  {teachers.map(t => (
                    <button key={t.MaGV} onClick={() => handleSelectAccount(t.MaGV)} className="w-full flex items-center justify-between p-4 bg-white hover:bg-indigo-50 border border-gray-100 rounded-2xl transition-all group shadow-sm">
                       <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs group-hover:bg-indigo-600 group-hover:text-white transition-colors">GV</div>
                         <div className="text-left">
                            <p className="text-sm font-black text-gray-800">{t.Hoten}</p>
                            <p className="text-[10px] text-indigo-600 font-black uppercase tracking-tighter">ID: {t.MaGV}</p>
                         </div>
                       </div>
                       <ChevronRight size={18} className="text-gray-300 group-hover:text-indigo-600 transition-colors" />
                    </button>
                  ))}
                  {teachers.length === 0 && <p className="text-xs italic text-gray-400 p-4 text-center">Chưa có dữ liệu giáo viên.</p>}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2"><UserCircle size={14}/> Danh sách Học sinh</h4>
                <div className="grid grid-cols-1 gap-2">
                  {students.map(s => (
                    <button key={s.MaHS} onClick={() => handleSelectAccount(s.MaHS)} className="w-full flex items-center justify-between p-4 bg-white hover:bg-emerald-50 border border-gray-100 rounded-2xl transition-all group shadow-sm">
                       <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-xs group-hover:bg-emerald-600 group-hover:text-white transition-colors">HS</div>
                         <div className="text-left">
                            <p className="text-sm font-black text-gray-800">{s.Hoten}</p>
                            <p className="text-[10px] text-emerald-600 font-black uppercase tracking-tighter">ID: {s.MaHS}</p>
                         </div>
                       </div>
                       <ChevronRight size={18} className="text-gray-300 group-hover:text-emerald-600 transition-colors" />
                    </button>
                  ))}
                  {students.length === 0 && <p className="text-xs italic text-gray-400 p-4 text-center">Chưa có dữ liệu học sinh.</p>}
                </div>
              </div>
            </div>
            <div className="p-6 bg-indigo-600 text-center text-white">
              <p className="text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                <ShieldCheck size={14} /> Bảo mật 2 lớp bởi Gemini AI
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
