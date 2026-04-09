import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const apiProxy = { target: 'http://localhost:3001', changeOrigin: true }

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/api': apiProxy },
  },
  preview: {
    proxy: { '/api': apiProxy },
  },
})
