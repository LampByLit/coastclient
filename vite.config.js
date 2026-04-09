import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    define: {
      'import.meta.env.GEOAPIFY_API_KEY': JSON.stringify(env.GEOAPIFY_API_KEY ?? ''),
      'import.meta.env.APIFY_TOKEN': JSON.stringify(env.APIFY_TOKEN ?? ''),
    },
  }
})
