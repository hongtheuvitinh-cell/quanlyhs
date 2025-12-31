
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all envs regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    
    // Polyfill process.env for compatibility with existing code
    define: {
      'process.env': env
    },

    server: {
      port: 3000,
      open: true, // Tự động mở trình duyệt khi chạy dev
      host: true  // Cho phép truy cập qua mạng nội bộ
    },

    build: {
      outDir: 'dist', // Thư mục xuất bản cho Vercel
      sourcemap: false, // Tắt sourcemap để bảo mật code trên production
      minify: 'terser', // Sử dụng terser để tối ưu hóa dung lượng file tốt nhất
      terserOptions: {
        compress: {
          drop_console: true, // Xóa console.log khi build bản chính thức
          drop_debugger: true
        }
      },
      rollupOptions: {
        output: {
          // Chia nhỏ các thư viện lớn thành các file riêng để trình duyệt cache tốt hơn
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'supabase-vendor': ['@supabase/supabase-js'],
            'gemini-vendor': ['@google/genai'],
            'ui-vendor': ['lucide-react', 'recharts']
          }
        }
      }
    }
  };
});
