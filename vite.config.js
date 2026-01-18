import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // Enable polyfills for specific globals and modules
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  server: {
    proxy: {
      '/api/mbta': {
        target: 'https://api-v3.mbta.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/mbta/, ''),
      },
    },
  },
})
