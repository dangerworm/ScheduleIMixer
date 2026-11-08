import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// The game data JSON files live in the repository root, shared with the WinForms app.
const dataDir = fileURLToPath(new URL('..', import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: { '@data': dataDir },
  },
  server: {
    fs: { allow: ['.', dataDir] },
  },
})
