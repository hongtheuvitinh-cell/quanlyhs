
import { createClient } from '@supabase/supabase-js';

// Lấy giá trị an toàn, tránh lỗi null/undefined
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

// Cờ kiểm tra cấu hình
export const isSupabaseConfigured = 
  supabaseUrl.startsWith('https://') && 
  supabaseAnonKey.length > 0;

// Chỉ khởi tạo nếu URL hợp lệ
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : (null as any);
