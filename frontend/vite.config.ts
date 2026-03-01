import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from "path"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true, // fail loudly if 5173 is already in use instead of silently switching ports
  },
  optimizeDeps: {
    include: ['framer-motion', 'react/jsx-runtime'],
  },
  ssr: {
    noExternal: ['framer-motion'],
  },
  resolve: {
    alias: {
      // ESM-safe path — __dirname is not available in ESM modules
      "@": fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
