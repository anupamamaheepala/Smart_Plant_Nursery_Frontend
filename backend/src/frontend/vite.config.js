import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    proxy: {
      '/auth': 'http://localhost:8000',
      '/sensor': 'http://localhost:8000',
      '/users': 'http://localhost:8000',
      '/api': 'http://localhost:8000',
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
})
