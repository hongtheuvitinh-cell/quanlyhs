
import React, { useState, useMemo } from 'react';
import { 
  Users, UserPlus, Search, ShieldCheck, Shield, Trash2, Edit2, 
  X, Save, Eye, EyeOff, Loader2, BookOpen, Key
} from 'lucide-react';
import { Teacher } from '../types';
import { supabase } from '../services/supabaseClient';

interface Props {
  teachers: Teacher[];
  onUpdate: () => Promise<void>;
}

const subjects = [
  { id: 'TOAN', name: 'Toán Học' }, { id: 'VAN', name: 'Ngữ Văn' }, { id: 'ANH', name: 'Tiếng Anh' },
  { id: 'LY', name: 'Vật Lý' }, { id: 'HOA', name: 'Hóa Học' }, { id: 'SINH', name: 'Sinh Học' },
  { id: 'DIA', name: 'Địa Lý' }, { id: 'SU', name: 'Lịch Sử' }, { id: 'GDCD', name: 'GDCD' },
  { id: 'TIN', name: 'Tin Học' }, { id: 'CONGNGHE', name: 'Công Nghệ' }, { id: 'GDTC', name: 'Thể Dục' }
];

const TeacherList: React.FC<Props> = ({ teachers, onUpdate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [editingTeacher, setEditingTeacher] = useState<Partial<Teacher> | null>(null);

  const filteredTeachers = useMemo(() => {
    return teachers.filter(t => 
      t.Hoten.toLowerCase().includes(searchTerm.toLowerCase()) || 
      t.MaGV.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => a.MaGV.localeCompare(b.MaGV));
  }, [teachers, searchTerm]);

  const togglePassword = (maGV: string) => {
    setShowPasswords(prev => ({ ...prev, [maGV]: !prev[maGV] }));
  };

  const handleOpenAdd = () => {
    setEditingTeacher({
      MaGV: `GV${Date.now().toString().slice(-4)}`,
      Hoten: '',
      MaMonChinh: 'TOAN',
      MatKhau: '123456',
      quanly: false
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t: Teacher) => {
    setEditingTeacher({ ...t });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!editingTeacher?.MaGV || !editingTeacher?.Hoten) {
      alert("Vui lòng nhập Mã GV và Họ tên!");
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('teachers')
        .upsert([{
          MaGV: editingTeacher.MaGV,
          Hoten: editingTeacher.Hoten,
          MaMonChinh: editingTeacher.MaMonChinh,
          MatKhau: editingTeacher.MatKhau,
          quanly: editingTeacher.quanly
        }]);

      if (error) throw error;
      await onUpdate();
      setIsModalOpen(false);
      setEditingTeacher(null);
    } catch (e: any) {
      alert("Lỗi: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (maGV: string) => {
    if (!confirm(`Bạn có chắc muốn xóa giáo viên ${maGV}?`)) return;
    try {
      const { error } = await supabase.from('teachers').delete().eq('MaGV', maGV);
      if (error) throw error;
      await onUpdate();
    } catch (e: any) {
      alert("Lỗi xóa: " + e.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-20">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-100">
            <Users size={24} />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Danh sách giáo viên hiện hành</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
              Quản lý tài khoản hệ thống • Tổng cộng: {teachers.length} giáo viên
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Tìm giáo viên..." 
              className="pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none w-64 text-xs font-bold focus:bg-white focus:border-indigo-400 transition-all shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={handleOpenAdd}
            className="px-8 py-3 bg-indigo-600 text-white rounded-2xl shadow-xl hover:bg-indigo-700 transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
          >
            <UserPlus size={18} /> Thêm Giáo Viên
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">
                <th className="px-8 py-6">Mã GV</th>
                <th className="px-8 py-6">Họ và Tên</th>
                <th className="px-8 py-6">Chuyên môn</th>
                <th className="px-8 py-6">Mật khẩu</th>
                <th className="px-8 py-6">Quyền hạn</th>
                <th className="px-8 py-6 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredTeachers.map((t) => (
                <tr key={t.MaGV} className="hover:bg-indigo-50/20 transition-colors group">
                  <td className="px-8 py-5 text-xs font-black text-indigo-600 uppercase tracking-tight">{t.MaGV}</td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-[10px]">
                        {t.Hoten.charAt(0)}
                      </div>
                      <span className="text-[13px] font-bold text-slate-800 uppercase tracking-tight">{t.Hoten}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[9px] font-black uppercase tracking-widest border border-slate-200">
                      {subjects.find(s => s.id === t.MaMonChinh)?.name || t.MaMonChinh}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2 group/pass cursor-pointer" onClick={() => togglePassword(t.MaGV)}>
                      <span className="text-xs font-mono font-bold text-slate-600 tracking-widest">
                        {showPasswords[t.MaGV] ? t.MatKhau : '••••••'}
                      </span>
                      {showPasswords[t.MaGV] ? <EyeOff size={14} className="text-slate-300" /> : <Eye size={14} className="text-slate-300" />}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                      {t.quanly ? (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 rounded-xl border border-amber-100 text-[9px] font-black uppercase tracking-widest">
                          <ShieldCheck size={12} /> Quản trị
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 text-slate-400 rounded-xl border border-slate-200 text-[9px] font-black uppercase tracking-widest">
                          Giáo viên
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={() => handleOpenEdit(t)}
                        className="p-2 text-indigo-600 hover:bg-white rounded-xl shadow-sm border border-transparent hover:border-indigo-100"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(t.MaGV)}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredTeachers.length === 0 && (
            <div className="py-20 text-center opacity-30 flex flex-col items-center">
              <Users size={48} className="text-slate-300 mb-4" />
              <p className="text-[10px] font-black uppercase tracking-widest">Không tìm thấy giáo viên</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Add/Edit */}
      {isModalOpen && editingTeacher && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-[40px] p-8 shadow-2xl animate-in zoom-in-95 my-auto border border-white/20">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg">
                  <UserPlus size={24}/>
                </div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest">
                  {editingTeacher.MaGV ? 'Hồ sơ giáo viên' : 'Thêm giáo viên mới'}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X size={24} className="text-slate-400" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase px-2 tracking-widest">Mã Giáo Viên</label>
                <input 
                  type="text" 
                  value={editingTeacher.MaGV} 
                  onChange={e => setEditingTeacher({...editingTeacher, MaGV: e.target.value})}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:border-indigo-400 transition-all shadow-inner"
                  placeholder="VD: GV001"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase px-2 tracking-widest">Họ và Tên</label>
                <input 
                  type="text" 
                  value={editingTeacher.Hoten} 
                  onChange={e => setEditingTeacher({...editingTeacher, Hoten: e.target.value})}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:border-indigo-400 transition-all shadow-inner uppercase"
                  placeholder="Nhập tên giáo viên..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-2 tracking-widest">Chuyên môn</label>
                  <select 
                    value={editingTeacher.MaMonChinh} 
                    onChange={e => setEditingTeacher({...editingTeacher, MaMonChinh: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black outline-none focus:bg-white transition-all shadow-sm"
                  >
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase px-2 tracking-widest">Mật khẩu</label>
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input 
                      type="text" 
                      value={editingTeacher.MatKhau} 
                      onChange={e => setEditingTeacher({...editingTeacher, MatKhau: e.target.value})}
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-mono font-bold outline-none focus:bg-white transition-all shadow-inner"
                    />
                  </div>
                </div>
              </div>

              <div className="p-5 bg-indigo-50/50 rounded-3xl border border-indigo-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
                    <Shield size={20} />
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-indigo-800 uppercase leading-none">Quyền quản trị</p>
                    <p className="text-[9px] text-indigo-500 font-bold mt-1 uppercase">Toàn quyền truy cập hệ thống</p>
                  </div>
                </div>
                <button 
                  onClick={() => setEditingTeacher({...editingTeacher, quanly: !editingTeacher.quanly})}
                  className={`w-14 h-8 rounded-full transition-all relative ${editingTeacher.quanly ? 'bg-indigo-600' : 'bg-slate-200'}`}
                >
                  <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all ${editingTeacher.quanly ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
            </div>

            <div className="mt-10 flex gap-4">
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="flex-1 py-4 bg-slate-50 border border-slate-200 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={handleSave}
                disabled={isSubmitting}
                className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18}/>}
                Lưu hồ sơ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherList;
