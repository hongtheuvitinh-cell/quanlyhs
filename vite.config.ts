
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    
    // Polyfill process.env cho code hiện tại
    define: {
      'process.env': env
    },

    server: {
      port: 3000,
      open: true,
      host: true
    },

    // Sử dụng esbuild để nén code (mặc định, cực nhanh và không cần cài thêm gói)
    esbuild: {
      // Tự động xóa console và debugger khi build bản production
      drop: mode === 'production' ? ['console', 'debugger'] : [],
    },

    build: {
      outDir: 'dist',
      sourcemap: false,
      minify: 'esbuild', // Thay terser bằng esbuild
      rollupOptions: {
        output: {
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
