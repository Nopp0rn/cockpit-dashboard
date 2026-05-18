import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  build: {
    target: 'esnext',

    chunkSizeWarningLimit: 2000,

    rollupOptions: {
      output: {
        manualChunks(id) {

          // React
          if (
            id.includes('react') ||
            id.includes('react-dom')
          ) {
            return 'react-vendor'
          }

          // Charts
          if (id.includes('recharts')) {
            return 'charts'
          }

          // Excel
          if (id.includes('xlsx')) {
            return 'excel'
          }

          // Supabase
          if (id.includes('@supabase')) {
            return 'supabase'
          }

          // node_modules อื่น
          if (id.includes('node_modules')) {
            return 'vendor'
          }
        }
      }
    }
  },

  server: {
    host: true,
    port: 5173
  }
})
