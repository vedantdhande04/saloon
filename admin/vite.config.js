import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, root, '')
  const socketTarget =
    env.VITE_SOCKET_URL || 'https://saloon-production-9871.up.railway.app'

  return {
    root,
    envDir: root,
    plugins: [react(), tailwindcss()],
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
    server: {
      port: 5174,
      strictPort: true,
      proxy: {
        '/socket.io': {
          target: socketTarget,
          ws: true,
          changeOrigin: true,
          secure: true,
        },
      },
    },
  }
})
