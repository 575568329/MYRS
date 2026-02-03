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
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],

  base: './', // 使用相对路径，适配 uTools

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },

  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    minify: 'terser', // 使用 terser 压缩（更好的压缩效果）
    target: 'es2015',

    // uTools 插件构建配置
    rollupOptions: {
      output: {
        // 代码分割优化
        manualChunks: {
          'vue-vendor': ['vue', 'pinia'],
          'ui-library': ['vue-remix-icons']
        },
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },

    // chunk 大小警告的限制（kb）
    chunkSizeWarningLimit: 1000,

    // 生产环境不生成 sourcemap
    sourcemap: false,

    // terser 压缩配置
    terserOptions: {
      compress: {
        // 生产环境移除 console
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug']
      }
    }
  },

  // 优化依赖预构建
  optimizeDeps: {
    include: ['vue', 'pinia', 'vue-remix-icons']
  },

  server: {
    port: 5173,
    open: true,
    cors: true
  }
})
