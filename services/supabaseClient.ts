
import { createClient } from '@supabase/supabase-js';

// Lưu ý: Trong môi trường Vercel, bạn sẽ set những biến này trong Project Settings > Environment Variables
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
