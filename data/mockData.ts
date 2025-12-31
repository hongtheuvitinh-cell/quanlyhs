
import { AcademicYear, Teacher, Class, Student, Assignment, Grade, Discipline, LearningLog, Role, ViolationRule } from '../types';

export const mockAcademicYears: AcademicYear[] = [
  { MaNienHoc: 1, TenNienHoc: '2023-2024' },
  { MaNienHoc: 2, TenNienHoc: '2024-2025' },
  { MaNienHoc: 3, TenNienHoc: '2025-2026' }
];

export const mockTeachers: Teacher[] = [
  { MaGV: 'GV001', Hoten: 'Nguyễn Văn A', MaMonChinh: 'TOAN' },
  { MaGV: 'GV002', Hoten: 'Trần Thị B', MaMonChinh: 'VAN' }
];

export const mockClasses: Class[] = [
  { MaLop: '12A1', TenLop: 'Lớp 12A1', Khoi: 12 },
  { MaLop: '12A2', TenLop: 'Lớp 12A2', Khoi: 12 },
  { MaLop: '11B1', TenLop: 'Lớp 11B1', Khoi: 11 },
  { MaLop: '10C1', TenLop: 'Lớp 10C1', Khoi: 10 }
];

export const mockViolationRules: ViolationRule[] = [
  { MaLoi: 'MUON', TenLoi: 'Đi học muộn', DiemTru: 2 },
  { MaLoi: 'DONGPHUC', TenLoi: 'Sai đồng phục', DiemTru: 3 },
  { MaLoi: 'LAMVIECRIENG', TenLoi: 'Làm việc riêng/Sử dụng ĐT', DiemTru: 5 },
  { MaLoi: 'NGHIVANG', TenLoi: 'Nghỉ học không phép', DiemTru: 10 },
  { MaLoi: 'BAOLUC', TenLoi: 'Gây gổ/Bạo lực học đường', DiemTru: 30 },
  { MaLoi: 'GIANLAN', TenLoi: 'Gian lận trong thi cử', DiemTru: 20 },
];

export const mockStudents: Student[] = [
  { MaHS: 'HS001', Hoten: 'Lê Văn Cường', NgaySinh: '2006-05-12', GioiTinh: true, DiaChi: '123 Nguyễn Huệ, Quận 1', HotenChame: 'Lê Văn Dũng', SDT_LinkHe: '0901234567', MaLopHienTai: '12A1', MaNienHoc: 1 },
  { MaHS: 'HS002', Hoten: 'Phạm Thị Diệu', NgaySinh: '2006-08-20', GioiTinh: false, DiaChi: '456 Lê Lợi, Quận 1', HotenChame: 'Phạm Văn Hùng', SDT_LinkHe: '0907654321', MaLopHienTai: '12A1', MaNienHoc: 1 },
  { MaHS: 'HS003', Hoten: 'Trần Minh Tâm', NgaySinh: '2007-02-15', GioiTinh: true, DiaChi: '789 CMT8, Quận 3', HotenChame: 'Trần Quốc Bảo', SDT_LinkHe: '0911223344', MaLopHienTai: '11B1', MaNienHoc: 1 },
  { MaHS: 'HS004', Hoten: 'Nguyễn Hoàng Nam', NgaySinh: '2009-11-30', GioiTinh: true, DiaChi: '101 Phố Huế, Hà Nội', HotenChame: 'Nguyễn Hoàng Long', SDT_LinkHe: '0988776655', MaLopHienTai: '10C1', MaNienHoc: 3 }
];

export const mockAssignments: Assignment[] = [
  { MaPhanCong: 1, MaGV: 'GV001', MaLop: '12A1', MaNienHoc: 1, LoaiPhanCong: Role.CHU_NHIEM, MaMonHoc: null },
  { MaPhanCong: 2, MaGV: 'GV001', MaLop: '11B1', MaNienHoc: 1, LoaiPhanCong: Role.GIANG_DAY, MaMonHoc: 'TOAN' },
  { MaPhanCong: 3, MaGV: 'GV002', MaLop: '12A1', MaNienHoc: 1, LoaiPhanCong: Role.GIANG_DAY, MaMonHoc: 'VAN' },
  { MaPhanCong: 4, MaGV: 'GV001', MaLop: '10C1', MaNienHoc: 3, LoaiPhanCong: Role.CHU_NHIEM, MaMonHoc: null }
];

export const mockGrades: Grade[] = [
  { MaDiem: 1, MaHS: 'HS001', MaMonHoc: 'TOAN', MaNienHoc: 1, HocKy: 1, LoaiDiem: '15p', DiemSo: 8.5 },
  { MaDiem: 2, MaHS: 'HS001', MaMonHoc: 'TOAN', MaNienHoc: 1, HocKy: 1, LoaiDiem: '1 tiết', DiemSo: 7.0 },
  { MaDiem: 3, MaHS: 'HS002', MaMonHoc: 'TOAN', MaNienHoc: 1, HocKy: 1, LoaiDiem: '15p', DiemSo: 9.5 },
  { MaDiem: 4, MaHS: 'HS001', MaMonHoc: 'VAN', MaNienHoc: 1, HocKy: 1, LoaiDiem: '15p', DiemSo: 6.5 }
];

export const mockDiscipline: Discipline[] = [
  { MaKyLuat: 1, MaHS: 'HS001', NgayViPham: '2023-10-05', MaLoi: 'MUON', NoiDungChiTiet: 'Đi học muộn 3 lần trong tuần', DiemTruTaiThoiDiemDo: 2, HinhThucXL: 'Nhắc nhở', MaNienHoc: 1 }
];

export const mockLearningLogs: LearningLog[] = [
  { MaTheoDoi: 1, MaHS: 'HS001', MaPhanCong: 1, NgayGhiChep: '2023-11-10', NhanXet: 'Hăng hái phát biểu', TrangThai: 'CO_MAT' }
];
