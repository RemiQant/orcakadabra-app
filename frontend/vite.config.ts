import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true, // fail loudly if 5173 is already in use instead of silently switching ports
  },
  resolve: {
    alias: {
      // ESM-safe path — __dirname is not available in ESM modules
      "@": fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
