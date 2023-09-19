import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'


export default defineConfig({
  plugins: [react()],
  optimizeDeps:{
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'] // para que o vite não exclua arquivos necessários
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
