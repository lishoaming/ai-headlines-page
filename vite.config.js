import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],

  // 路径别名
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  // 开发服务器
  server: {
    host: '0.0.0.0',
    port: 5173,
    open: true,
    // 代理配置（按需开启）
    // proxy: {
    //   '/api': {
    //     target: 'https://your-api-server.com',
    //     changeOrigin: true,
    //     rewrite: (path) => path.replace(/^\/api/, ''),
    //   },
    // },
  },

  // 构建配置
  build: {
    target: 'es2015',
    cssTarget: 'chrome61',
    outDir: 'dist',
    assetsDir: 'assets',
    // 代码分割
    rollupOptions: {
      output: {
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router', 'pinia'],
          'ui-vendor': ['vant'],
          'utils-vendor': ['axios', 'marked', 'dompurify'],
        },
      },
    },
  },

  // CSS 预处理器配置
  css: {
    preprocessorOptions: {
      scss: {
        // additionalData: `@use "@/styles/variables.scss" as *;`,
      },
    },
  },
})