/*
 * @Author: fjyu9 fjyu9@iflytek.com
 * @Date: 2026-01-29 10:18:43
 * @LastEditors: fjyu9 fjyu9@iflytek.com
 * @LastEditTime: 2026-01-29 10:52:32
 * @FilePath: \摸鱼热搜\vite.config.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: './', // 使用相对路径，适配 uTools
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    minify: 'esbuild',
    target: 'es2015',
    // uTools 插件构建配置
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    },
    // chunk 大小警告的限制（kb）
    chunkSizeWarningLimit: 1000,
    // 生产环境不生成 sourcemap
    sourcemap: false,
    // esbuild 配置：移除 console.log
    esbuild: {
      drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
      pure: ['console.log', 'console.info', 'console.debug', 'console.warn', 'console.error'],
    }
  },
  server: {
    port: 5173,
    open: true,
    cors: true,
    // 开发服务器代理配置（可选）
    proxy: {
      '/api': {
        target: 'https://api-hot.imsyy.top',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
