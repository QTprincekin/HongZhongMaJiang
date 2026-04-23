import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],

  // 路径别名
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },

  // 开发服务器
  server: {
    port: 5173,
    strictPort: false,
  },

  // 构建
  build: {
    target: 'esnext',
    minify: 'esbuild',
  },

  // Tauri 兼容
  clearScreen: false,
  envPrefix: ['VITE_', 'TAURI_'],
})
