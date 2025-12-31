
import React, { useState } from 'react';
import { GraduationCap, Users, UserCircle, Key, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { Role } from '../types';

interface Props {
  onLogin: (role: Role, id: string) => void;
}

const Login: React.FC<Props> = ({ onLogin }) => {
  const [role, setRole] = useState<Role>(Role.STUDENT);
  const [id, setId] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id.trim()) {
      setError('Vui lòng nhập mã định danh của bạn');
      return;
    }
    onLogin(role, id);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-100/50 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-100/50 rounded-full blur-3xl"></div>
      </div>

      <div className="bg-white w-full max-w-lg rounded-[48px] shadow-2xl shadow-indigo-100/50 overflow-hidden border border-white relative z-10">
        <div className="bg-indigo-600 p-12 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
            <GraduationCap size={160} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                <Sparkles size={24} />
              </div>
              <h1 className="text-3xl font-black tracking-tight">EduManager AI</h1>
            </div>
            <p className="text-indigo-100 font-medium">Hệ thống quản lý học tập thông minh thế hệ mới</p>
          </div>
        </div>

        <div className="p-12">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Bạn là ai?</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole(Role.STUDENT)}
                  className={`flex flex-col items-center gap-3 p-6 rounded-3xl border-2 transition-all ${role === Role.STUDENT ? 'bg-indigo-50 border-indigo-600 text-indigo-700' : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'}`}
                >
                  <UserCircle size={32} />
                  <span className="font-bold text-sm">Học sinh</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole(Role.CHU_NHIEM)}
                  className={`flex flex-col items-center gap-3 p-6 rounded-3xl border-2 transition-all ${role !== Role.STUDENT ? 'bg-indigo-50 border-indigo-600 text-indigo-700' : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'}`}
                >
                  <Users size={32} />
                  <span className="font-bold text-sm">Giáo viên</span>
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
                  {role === Role.STUDENT ? 'Mã số Học sinh' : 'Mã số Giáo viên'}
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
              Đăng nhập hệ thống <ArrowRight size={20} />
            </button>

            <div className="text-center">
              <p className="text-xs text-gray-400 font-medium">Quên mật mã? Liên hệ phòng đào tạo để được cấp lại.</p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
