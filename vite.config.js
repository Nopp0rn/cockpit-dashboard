import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  publicDir: 'public',
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1400,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'xlsx':         ['xlsx'],
          'supabase':     ['@supabase/supabase-js'],
          // recharts ต้องไม่ split เพราะมี circular dependency ภายใน
        }
      }
    }
  }
})
