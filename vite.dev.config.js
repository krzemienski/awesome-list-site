import { defineConfig } from 'vite'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'

// Read the original config
const originalConfigPath = fileURLToPath(new URL('./vite.config.ts', import.meta.url))

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: [
      'all', // Allow all hosts - this disables the host check completely
    ]
  },
})