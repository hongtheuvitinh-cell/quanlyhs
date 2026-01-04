
export enum Role {
  CHU_NHIEM = 'ChuNhiem',
  GIANG_DAY = 'GiangDay',
  STUDENT = 'Student',
  ADMIN = 'Admin'
}

export type AttendanceStatus = 'CO_MAT' | 'VANG_CP' | 'VANG_KP' | 'TRE';

export interface AcademicYear {
  MaNienHoc: number;
  TenNienHoc: string;
}

export interface Teacher {
  MaGV: string;
  Hoten: string;
  MaMonChinh: string;
  MatKhau?: string;
}

export interface Class {
  MaLop: string;
  TenLop: string;
  Khoi: number;
}

export interface Student {
  MaHS: string;
  Hoten: string;
  NgaySinh: string;
  GioiTinh: boolean; 
  DiaChi: string;
  TenCha?: string;
  NgheNghiepCha?: string;
  TenMe?: string;
  NgheNghiepMe?: string;
  SDT_LinkHe: string;
  Email?: string;
  MaLopHienTai: string;
  MaNienHoc: number; 
  Anh?: string; 
  GhiChuKhac?: string;
  MatKhau?: string;
}

export interface Assignment {
  MaPhanCong: number;
  MaGV: string;
  MaLop: string;
  MaNienHoc: number;
  LoaiPhanCong: Role;
  MaMonHoc: string | null;
}

export interface Grade {
  MaDiem: number;
  MaHS: string;
  MaMonHoc: string;
  MaNienHoc: number;
  HocKy: number;
  LoaiDiem: string; 
  DiemSo: number;
}

export interface SchoolPlan {
  MaKeHoach: number;
  TieuDe: string;
  NoiDung: string;
  Tuan: number;
  TuNgay: string;
  DenNgay: string;
  MaNienHoc: number;
  DoiTuong: string[] | null; // Null means All classes
  DinhKem?: string;
  Created_at?: string;
}

export interface AssignmentTask {
  MaNhiemVu: number;
  TieuDe: string;
  MoTa: string;
  MaLop: string;
  MaMonHoc: string;
  MaGV: string;
  HanChot: string;
  MaNienHoc: number;
  DanhSachGiao: string[]; 
  DanhSachHoanThanh: string[]; 
  BaoCaoNhiemVu?: Record<string, string>; 
}

export interface ViolationRule {
  MaLoi: string;
  TenLoi: string;
  DiemTru: number;
}

export interface Discipline {
  MaKyLuat: number;
  MaHS: string;
  NgayViPham: string;
  MaLoi: string; 
  NoiDungChiTiet: string;
  DiemTruTaiThoiDiemDo: number;
  HinhThucXL: string; 
  MaNienHoc: number;
}

export interface LearningLog {
  MaTheoDoi: number;
  MaHS: string;
  MaPhanCong: number;
  NgayGhiChep: string;
  NhanXet: string;
  TrangThai: AttendanceStatus;
}

export interface AppState {
  currentUser: Teacher | Student | null;
  currentRole: Role;
  selectedClass: string;
  selectedYear: number;
  selectedSubject: string | null;
}
