import { createApp } from 'vue'
import './main.css'
import App from './App.vue'

// 创建 Vue 应用
const app = createApp(App)

// 挂载应用
app.mount('#app')

// 开发环境日志
if (import.meta.env.DEV) {
  console.log('🚀 摸鱼热搜插件已启动')
  console.log('📦 当前环境:', import.meta.env.MODE)
  console.log('🔧 uTools API:', window.utools ? '已加载' : '未加载')
}
