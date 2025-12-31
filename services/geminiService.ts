
import { GoogleGenAI, Type } from "@google/genai";
import { Student, Grade, LearningLog, Role } from "../types";

export const analyzeStudentPerformance = async (
  student: Student,
  grades: Grade[],
  logs: LearningLog[]
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    Phân tích tình hình học tập của học sinh sau đây và đưa ra nhận xét, lời khuyên:
    Học sinh: ${student.Hoten}
    Điểm số: ${JSON.stringify(grades.map(g => ({ mon: g.MaMonHoc, loai: g.LoaiDiem, diem: g.DiemSo })))}
    Nhận xét giáo viên: ${JSON.stringify(logs.map(l => l.NhanXet))}
    Chuyên cần: ${logs.filter(l => l.TrangThai === 'VANG_CP' || l.TrangThai === 'VANG_KP').length} buổi vắng.
    Hãy viết nhận xét bằng tiếng Việt, ngắn gọn, súc tích, chia thành 2 phần: Ưu điểm và Cần cố gắng.
  `;

  try {
    const response = await ai.models.generateContent({ 
      model: "gemini-3-flash-preview", 
      contents: prompt 
    });
    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Không thể phân tích dữ liệu học sinh lúc này.";
  }
};

export const parseStudentListFromImage = async (base64Image: string, mimeType: string, role: Role) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Bạn là một chuyên gia số hóa dữ liệu giáo dục tại Việt Nam.
    Hãy trích xuất danh sách học sinh từ bảng trong tài liệu này (đây có thể là ảnh hoặc tệp PDF nhiều trang) sang định dạng JSON.
    CẤU TRÚC JSON CẦN TRẢ VỀ:
    - MaHS: Mã học sinh (nếu không có thì tự tạo theo format HSxxx)
    - Hoten: Họ và tên đầy đủ
    - NgaySinh: Ngày sinh định dạng YYYY-MM-DD
    - GioiTinh: Boolean (Nam là true, Nữ là false)
    - DiaChi: Địa chỉ thường trú
    - TenCha: Họ tên của Cha (nếu có)
    - TenMe: Họ tên của Mẹ (nếu có)
    - SDT_LinkHe: Số điện thoại liên lạc
    
    Lưu ý quan trọng: Chỉ trích xuất vào TenCha hoặc TenMe riêng biệt. Không sử dụng cột gộp.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { data: base64Image, mimeType: mimeType } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              MaHS: { type: Type.STRING },
              Hoten: { type: Type.STRING },
              NgaySinh: { type: Type.STRING },
              GioiTinh: { type: Type.BOOLEAN },
              DiaChi: { type: Type.STRING },
              TenCha: { type: Type.STRING },
              TenMe: { type: Type.STRING },
              SDT_LinkHe: { type: Type.STRING }
            },
            required: ["MaHS", "Hoten"]
          }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Gemini Parsing Error:", error);
    throw error;
  }
};

export const parseGradesFromImage = async (base64Image: string, mimeType: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Trích xuất bảng điểm từ tài liệu (đây có thể là ảnh hoặc tệp PDF).
    Bảng có các cột: STT, Lớp, Họ, Tên, ĐGTX (1,2,3,4), ĐGGK, ĐGCK.
    Hãy gộp cột Họ và Tên thành Hoten.
    Trả về mảng JSON các đối tượng học sinh với các đầu điểm tương ứng.
    Mỗi học sinh có thể có nhiều loại điểm: ĐGTX1, ĐGTX2, ĐGTX3, ĐGTX4, ĐGGK, ĐGCK.
    Trả về mảng các bản ghi Grade: { Hoten, DiemSo, LoaiDiem, MaMonHoc }.
    LoaiDiem phải là một trong: 'ĐGTX1', 'ĐGTX2', 'ĐGTX3', 'ĐGTX4', 'ĐGGK', 'ĐGCK'.
    Chú ý: Nếu là PDF, hãy đọc toàn bộ danh sách ở tất cả các trang.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { data: base64Image, mimeType: mimeType } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              Hoten: { type: Type.STRING },
              DiemSo: { type: Type.NUMBER },
              LoaiDiem: { type: Type.STRING },
              MaMonHoc: { type: Type.STRING }
            },
            required: ["Hoten", "DiemSo", "LoaiDiem"]
          }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Gemini Grade Parsing Error:", error);
    throw error;
  }
};
