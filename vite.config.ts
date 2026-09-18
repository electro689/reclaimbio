import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // Mirrors the "@/*" path mapping in tsconfig.app.json.
      // import.meta.dirname (not __dirname) for native config-loader support.
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
