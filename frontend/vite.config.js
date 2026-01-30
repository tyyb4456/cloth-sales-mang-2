import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  
  // PWA Configuration
  build: {
    rollupOptions: {
      output: {
        // Ensure service worker is copied to build
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'service-worker.js') {
            return '[name][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    }
  },
  
  // Copy public files including manifest and service worker
  publicDir: 'public',
})