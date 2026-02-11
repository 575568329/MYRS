import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './main.css'
import App from './App.vue'

// 创建 Vue 应用
const app = createApp(App)

// 创建 Pinia 实例
const pinia = createPinia()

app.use(pinia)

// 挂载应用
app.mount('#app')

// ========== 初始化 Pantry 埋点系统 ==========
async function initPantryAnalytics() {
  try {
    const { initAnalytics } = await import('./services/analytics/analyticsCollector.js')

    // 初始化埋点系统（会自动从配置读取 Pantry Key）
    await initAnalytics()

    console.log('✅ Pantry 埋点系统已启用')
  } catch (error) {
    console.warn('⚠️ Pantry 埋点系统初始化失败:', error)
    // 埋点初始化失败不影响应用正常运行
  }
}

// 启动埋点系统（不阻塞应用启动）
initPantryAnalytics()

// 开发环境日志
if (import.meta.env.DEV) {
  console.log('🚀 摸鱼热搜插件已启动')
  console.log('📦 当前环境:', import.meta.env.MODE)
  console.log('🔧 uTools API:', window.utools ? '已加载' : '未加载')
  console.log('📊 埋点系统: 开发环境下已禁用')
}
