import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// GitHub Pages: 저장소 이름과 맞추세요 (username.github.io/repo-name/)
export default defineConfig({
  plugins: [vue()],
  base: '/portfolio-site/',
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
})
