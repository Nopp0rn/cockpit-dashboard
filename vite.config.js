import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  publicDir: 'public',   // explicit — copies public/ → dist/
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
})
