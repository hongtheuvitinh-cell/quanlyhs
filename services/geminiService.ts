
import { GoogleGenAI, Type } from "@google/genai";
import { Student, Grade, LearningLog, Role } from "../types";

/**
 * Hàm hỗ trợ làm sạch chuỗi JSON từ AI
 * Loại bỏ các ký tự ```json và ``` nếu AI trả về định dạng markdown
 */
const cleanJsonResponse = (text: string) => {
  if (!text) return "[]";
  // Xóa các khối mã markdown nếu có
  let cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
  return cleaned;
};

export const analyzeStudentPerformance = async (
  student: Student,
  grades: Grade[],
  logs: LearningLog[]
) => {
  if (!process.env.API_KEY) return "Lỗi: Chưa cấu hình API Key cho AI.";
  
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
    return response.text || "AI không trả về kết quả.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Không thể phân tích dữ liệu học sinh lúc này.";
  }
};

export const parseStudentListFromImage = async (base64Image: string, mimeType: string, role: Role) => {
  if (!process.env.API_KEY) throw new Error("API_KEY_MISSING");

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Bạn là một chuyên gia số hóa dữ liệu giáo dục tại Việt Nam.
    Hãy trích xuất danh sách học sinh từ tài liệu này sang định dạng JSON.
    Yêu cầu:
    - Nhận diện chính xác các cột: STT, Họ và tên (Hoten), Ngày sinh (NgaySinh), Giới tính (GioiTinh), Địa chỉ (DiaChi), Số điện thoại (SDT_LinkHe).
    - NgaySinh phải có định dạng YYYY-MM-DD. Nếu chỉ có năm, hãy giả định là 01-01.
    - GioiTinh: Nếu là "Nam" trả về true, "Nữ" trả về false.
    Lưu ý: Chỉ trả về mảng JSON, không giải thích gì thêm.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
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
            required: ["Hoten"]
          }
        }
      }
    });
    
    const rawText = response.text || "[]";
    const cleanedText = cleanJsonResponse(rawText);
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error("Lỗi trích xuất danh sách HS:", error);
    throw error;
  }
};

export const parseGradesFromImage = async (base64Image: string, mimeType: string) => {
  if (!process.env.API_KEY) throw new Error("API_KEY_MISSING");

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Bạn là chuyên gia đọc bảng điểm học sinh Việt Nam. 
    Nhiệm vụ: Trích xuất điểm số từ ảnh/PDF.
    Các cột thường gặp: "Họ và tên", "Kiểm tra thường xuyên" (ĐGTX), "Giữa kỳ" (ĐGGK), "Cuối kỳ" (ĐGCK).
    Quy tắc chuyển đổi:
    - Nếu cột là "Thường xuyên 1" hoặc "TX1" -> LoaiDiem: "ĐGTX1"
    - Nếu cột là "Thường xuyên 2" hoặc "TX2" -> LoaiDiem: "ĐGTX2"
    - Nếu cột là "Giữa kỳ" hoặc "GK" -> LoaiDiem: "ĐGGK"
    - Nếu cột là "Cuối kỳ" hoặc "CK" -> LoaiDiem: "ĐGCK"
    - DiemSo: Phải là số thực (ví dụ 8.5).
    - MaMonHoc: Nếu ảnh có tên môn học, hãy điền mã môn (TOAN, VAN, ANH, ...). Nếu không rõ hãy để trống.
    Lưu ý quan trọng: Chỉ trả về mảng JSON, không thêm văn bản rác.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
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
              Hoten: { type: Type.STRING, description: "Họ và tên học sinh" },
              DiemSo: { type: Type.NUMBER, description: "Giá trị điểm số" },
              LoaiDiem: { type: Type.STRING, description: "Mã loại điểm: ĐGTX1, ĐGTX2, ĐGGK, ĐGCK..." },
              MaMonHoc: { type: Type.STRING, description: "Mã môn học nếu có" }
            },
            required: ["Hoten", "DiemSo", "LoaiDiem"]
          }
        }
      }
    });
    
    const rawText = response.text || "[]";
    console.log("Raw AI Response (Grades):", rawText); // Ghi log để kiểm tra nếu lỗi parse
    const cleanedText = cleanJsonResponse(rawText);
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error("Lỗi trích xuất bảng điểm Gemini:", error);
    throw error;
  }
};
