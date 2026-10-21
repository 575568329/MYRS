import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './main.css'
import App from './App.vue'
import { initAnalytics, trackEvent } from './services/analytics/index.js'

// 创建 Vue 应用
const app = createApp(App)

// 创建 Pinia 实例
const pinia = createPinia()

app.use(pinia)

// 会话开始埋点（ao）：在 mount 之前注册，避免冷启动挂载慢于进入动作时丢失首条事件
if (window.utools) {
  window.utools.onPluginEnter((action) => {
    try {
      localStorage.setItem('myrs_session_start', String(Date.now()))
      trackEvent('app_open', { from: (action && (action.from || action.type)) || 'main' })
    } catch (e) {
      /* 埋点失败不影响功能 */
    }
  })
}

// 挂载应用
app.mount('#app')

// ========== 初始化埋点系统（个人数据后台，替代 pantry） ==========
async function initPantryAnalytics() {
  try {
    await initAnalytics()
    console.log('✅ 埋点系统已启用（个人数据后台）')
  } catch (error) {
    console.warn('⚠️ 埋点系统初始化失败:', error)
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
  console.log('📊 埋点系统:', import.meta.env.VITE_COLLECT_DEV ? 'DEV 已启用 -> ' + import.meta.env.VITE_COLLECT_DEV : '开发环境下已禁用')
}
