import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  publicDir: 'public',
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'recharts':     ['recharts'],
          'xlsx':         ['xlsx'],
          'supabase':     ['@supabase/supabase-js'],
        }
      }
    }
  }
})
