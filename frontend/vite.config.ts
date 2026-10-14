import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Em desenvolvimento, /api é repassado ao FastAPI: mesma origem -> cookie de sessão funciona sem CORS.
export default defineConfig({
  // Na demo do GitHub Pages o site fica em /ProcJus/
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
