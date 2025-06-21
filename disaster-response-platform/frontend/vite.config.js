import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      include: "**/*.{jsx,js}",
    }),
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://soumya.outlfy.com',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'https://soumya.outlfy.com',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
