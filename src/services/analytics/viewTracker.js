/**
 * 平台视图停留追踪（pv 事件）
 *
 * HotSearch 的 currentView 是唯一切换漏斗（'home' | 'favorites' | 平台ID），
 * watch(currentView) 调 enterView；插件退出（App.vue onPluginOut）调
 * finalizeViewTracking 收尾最后一个平台，解决跨组件收尾问题。
 */
import { trackEvent } from './index.js'

let current = null // { p, start }

// 进入视图：切换时先结算上一个平台的停留时长；home/favorites 不是平台，仅结算
export function enterView(view) {
  if (current && current.p === view) return
  flushView()
  if (view && view !== 'home' && view !== 'favorites') {
    current = { p: view, start: Date.now() }
  }
}

// 结算当前平台停留并上报
export function flushView() {
  if (!current) return
  const { p, start } = current
  current = null
  try {
    trackEvent('platform_view', { platform: p, duration_ms: Date.now() - start })
  } catch (e) {
    /* 埋点失败不影响功能 */
  }
}

// 插件退出时的最终收尾（同步上报 + collector 同步落本地缓存，下次启动补传）
export function finalizeViewTracking() {
  flushView()
}
