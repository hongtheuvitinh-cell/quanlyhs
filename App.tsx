-- Xóa bảng cũ để làm mới cấu trúc (CẨN THẬN: Mất dữ liệu cũ)
DROP TABLE IF EXISTS assignments, learning_logs, grades, disciplines, tasks, violation_rules, students, teachers, classes, academic_years CASCADE;

-- 1. Niên học
CREATE TABLE academic_years (
  "MaNienHoc" SERIAL PRIMARY KEY,
  "TenNienHoc" TEXT NOT NULL UNIQUE
);

-- 2. Giáo viên (Đảm bảo có MatKhau)
CREATE TABLE teachers (
  "MaGV" TEXT PRIMARY KEY,
  "Hoten" TEXT NOT NULL,
  "MaMonChinh" TEXT,
  "MatKhau" TEXT DEFAULT '123456'
);

-- 3. Lớp học
CREATE TABLE classes (
  "MaLop" TEXT PRIMARY KEY,
  "TenLop" TEXT NOT NULL,
  "Khoi" INTEGER
);

-- 4. Học sinh (Đảm bảo có MatKhau)
CREATE TABLE students (
  "MaHS" TEXT PRIMARY KEY,
  "Hoten" TEXT NOT NULL,
  "MatKhau" TEXT DEFAULT '123456',
  "MaLopHienTai" TEXT REFERENCES classes("MaLop"),
  "MaNienHoc" INTEGER REFERENCES academic_years("MaNienHoc"),
  "NgaySinh" DATE,
  "GioiTinh" BOOLEAN DEFAULT true,
  "DiaChi" TEXT,
  "HotenChame" TEXT,
  "SDT_LinkHe" TEXT
);

-- 5. PHÂN CÔNG (Bảng này cực kỳ quan trọng)
CREATE TABLE assignments (
  "MaPhanCong" SERIAL PRIMARY KEY,
  "MaGV" TEXT REFERENCES teachers("MaGV") ON DELETE CASCADE,
  "MaLop" TEXT REFERENCES classes("MaLop") ON DELETE CASCADE,
  "MaNienHoc" INTEGER REFERENCES academic_years("MaNienHoc"),
  "LoaiPhanCong" TEXT NOT NULL, -- 'ChuNhiem' hoặc 'GiangDay'
  "MaMonHoc" TEXT -- NULL nếu là chủ nhiệm
);

-- 6. Các bảng khác
CREATE TABLE violation_rules ("MaLoi" TEXT PRIMARY KEY, "TenLoi" TEXT NOT NULL, "DiemTru" INTEGER);
CREATE TABLE grades ("MaDiem" SERIAL PRIMARY KEY, "MaHS" TEXT REFERENCES students("MaHS"), "MaMonHoc" TEXT, "MaNienHoc" INTEGER, "HocKy" INTEGER, "LoaiDiem" TEXT, "DiemSo" DECIMAL);
CREATE TABLE disciplines ("MaKyLuat" SERIAL PRIMARY KEY, "MaHS" TEXT REFERENCES students("MaHS"), "NgayViPham" DATE, "MaLoi" TEXT, "NoiDungChiTiet" TEXT, "DiemTruTaiThoiDiemDo" INTEGER, "HinhThucXL" TEXT, "MaNienHoc" INTEGER);
CREATE TABLE learning_logs ("MaTheoDoi" SERIAL PRIMARY KEY, "MaHS" TEXT REFERENCES students("MaHS"), "MaPhanCong" INTEGER REFERENCES assignments("MaPhanCong"), "NgayGhiChep" DATE, "NhanXet" TEXT, "TrangThai" TEXT);
CREATE TABLE tasks ("MaNhiemVu" SERIAL PRIMARY KEY, "TieuDe" TEXT, "MoTa" TEXT, "MaLop" TEXT, "MaMonHoc" TEXT, "MaGV" TEXT, "HanChot" DATE, "MaNienHoc" INTEGER, "DanhSachHoanThanh" TEXT[] DEFAULT '{}');

-- Dữ liệu mẫu khởi tạo
INSERT INTO academic_years ("TenNienHoc") VALUES ('2024-2025');
INSERT INTO teachers ("MaGV", "Hoten", "MaMonChinh", "MatKhau") VALUES ('GV001', 'Admin Teacher', 'TOAN', '123456');
