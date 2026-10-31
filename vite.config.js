import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Relative base so the build works on github.io/<repo>/ and on a custom domain
export default defineConfig({
  plugins: [react()],
  base: './',
})
