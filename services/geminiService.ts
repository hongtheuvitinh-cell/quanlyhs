
import { GoogleGenAI, Type } from "@google/genai";
import { Student, Grade, LearningLog, Role } from "../types";

const cleanJsonResponse = (text: string) => {
  if (!text) return "[]";
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
      model: "gemini-3-pro-preview",
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
  const prompt = `Bạn là chuyên gia số hóa bảng điểm Việt Nam.
    NHIỆM VỤ: Đọc bảng điểm từ ảnh. 
    LƯU Ý QUAN TRỌNG:
    1. Một hàng có thể chứa nhiều loại điểm (ví dụ: ĐGTX1, ĐGTX2, ĐGTX3, ĐGTX4, ĐGGK). 
    2. Bạn phải tách (unpivot) mỗi ô điểm thành một đối tượng JSON riêng biệt.
    3. Nhận diện tiêu đề thông minh: "Mã Học Sir" hoặc "Mã HS" đều là MaHS. "Họ và Tên" là Hoten.
    4. Trả về một mảng phẳng các đối tượng.
    Ví dụ: Nếu Nguyễn Văn A có điểm ĐGTX1=8 và ĐGGK=9, bạn phải trả về 2 đối tượng cho Nguyễn Văn A.`;

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
              MaHS: { type: Type.STRING, description: "Mã học sinh nếu có" },
              Hoten: { type: Type.STRING, description: "Họ tên đầy đủ" },
              DiemSo: { type: Type.NUMBER, description: "Điểm số" },
              LoaiDiem: { type: Type.STRING, description: "Loại điểm (ĐGTX1, ĐGTX2, ĐGGK, ĐGCK...)" },
              MaMonHoc: { type: Type.STRING, description: "Mã môn học nếu có" }
            },
            required: ["Hoten", "DiemSo", "LoaiDiem"]
          }
        }
      }
    });
    
    const rawText = response.text || "[]";
    console.log("Dữ liệu gốc từ AI:", rawText);
    return JSON.parse(cleanJsonResponse(rawText));
  } catch (error) {
    console.error("Lỗi Gemini:", error);
    throw error;
  }
};
