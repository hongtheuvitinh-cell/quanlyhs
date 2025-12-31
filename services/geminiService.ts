
import { GoogleGenAI, Type } from "@google/genai";
import { Student, Grade, LearningLog, Role } from "../types";

const cleanJsonResponse = (text: string) => {
  if (!text) return "[]";
  // Loại bỏ các khối mã markdown json nếu có
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
    Phân tích tình hình học tập của học sinh sau đây và đưa ra nhận xét:
    Học sinh: ${student.Hoten}
    Điểm số: ${JSON.stringify(grades.map(g => ({ mon: g.MaMonHoc, loai: g.LoaiDiem, diem: g.DiemSo })))}
    Nhận xét giáo viên: ${JSON.stringify(logs.map(l => l.NhanXet))}
    Viết ngắn gọn, súc tích (Ưu điểm và Cần cố gắng).
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
  const prompt = `Trích xuất danh sách học sinh sang JSON. Định dạng NgaySinh: YYYY-MM-DD. GioiTinh: true (Nam)/false (Nữ).`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [{ inlineData: { data: base64Image, mimeType: mimeType } }, { text: prompt }]
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
              SDT_LinkHe: { type: Type.STRING }
            },
            required: ["Hoten"]
          }
        }
      }
    });
    return JSON.parse(cleanJsonResponse(response.text || "[]"));
  } catch (error) {
    throw error;
  }
};

export const parseGradesFromImage = async (base64Image: string, mimeType: string) => {
  if (!process.env.API_KEY) throw new Error("API_KEY_MISSING");

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Bạn là chuyên gia trích xuất dữ liệu bảng điểm học sinh Việt Nam. 
    Trong ảnh có bảng gồm các cột: STT, Mã Học Sir (đây là Mã HS), Họ và Tên (Hoten), và các cột điểm (ĐGTX1, ĐGTX2, ĐGTX3, ĐGTX4, ĐGGK).
    
    YÊU CẦU:
    1. Trả về một mảng JSON phẳng.
    2. Mỗi phần tử trong mảng là MỘT ĐẦU ĐIỂM duy nhất của một học sinh.
    3. Ví dụ: Nếu học sinh 'NGUYỄN ĐĂNG KHOA' có 5 cột điểm, bạn phải tạo ra 5 đối tượng JSON riêng biệt cho học sinh này.
    
    QUY TẮC ĐỊNH DANH:
    - MaHS: Lấy từ cột "Mã Học Sir" (Ví dụ: HS1B11).
    - Hoten: Lấy từ cột "Họ và Tên".
    - DiemSo: Là giá trị số trong các ô điểm (Ví dụ: 6.8, 7, 8.8).
    - LoaiDiem: Tên của cột điểm đó (ĐGTX1, ĐGTX2, ĐGTX3, ĐGTX4, hoặc ĐGGK).
    
    Lưu ý: Chỉ trả về JSON, không giải thích gì thêm.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
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
              MaHS: { type: Type.STRING, description: "Mã học sinh lấy từ cột Mã Học Sir" },
              Hoten: { type: Type.STRING, description: "Họ và tên đầy đủ" },
              DiemSo: { type: Type.NUMBER, description: "Giá trị điểm số" },
              LoaiDiem: { type: Type.STRING, description: "Loại điểm: ĐGTX1, ĐGTX2, ĐGTX3, ĐGTX4, ĐGGK" },
              MaMonHoc: { type: Type.STRING, description: "Mã môn học nếu có" }
            },
            required: ["Hoten", "DiemSo", "LoaiDiem"]
          }
        }
      }
    });
    
    const rawText = response.text || "[]";
    return JSON.parse(cleanJsonResponse(rawText));
  } catch (error) {
    console.error("Lỗi Gemini Grade Parsing:", error);
    throw error;
  }
};
