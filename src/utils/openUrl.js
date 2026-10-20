/**
 * 统一打开入口（P0.3）
 * 默认用 uTools 内置浏览器 ubrowser（摸鱼小窗：任务栏无痕），
 * 浏览器开发环境降级 window.open；后续 P1 接设置项"打开方式"。
 */
import { trackEvent, EventType } from '../services/analytics/index.js'

// 摸鱼窗口固定参数（P0.3 无设置 UI；P1 打包为"无痕模式"预设）
const FISH_WINDOW = { width: 900, height: 640, skipTaskbar: true }

let lastUbrowserId = null

export async function openUrl(url, { platform = '', background = false } = {}) {
  if (!url || url === '#') return

  // 浏览器开发环境降级
  if (!window.utools) {
    window.open(url, '_blank')
    track(platform, 'system', false)
    return
  }

  // 用户选择系统浏览器（P1 设置项，暂默认内置）
  const openIn =
    (window.utools.dbStorage && window.utools.dbStorage.getItem('openIn')) || 'ubrowser'
  if (openIn === 'system') {
    window.utools.shellOpenExternal(url)
    track(platform, 'system', false)
    return
  }

  try {
    const opts = { ...FISH_WINDOW, show: !background }
    // 窗口复用：优先上次实例，其次空闲窗口（API 为复数、返回数组）
    let reuseId = lastUbrowserId
    if (!reuseId && typeof window.utools.getIdleUBrowsers === 'function') {
      const idle = window.utools.getIdleUBrowsers()
      reuseId = Array.isArray(idle) && idle.length > 0 ? idle[0].id : null
    }

    const task = window.utools.ubrowser.goto(url)
    const result = reuseId
      ? await task.run(reuseId, opts)
      : await task.run(opts)

    // run 返回实例数组，记录最后窗口 id 供下次复用
    if (Array.isArray(result) && result.length > 0 && result[result.length - 1] && result[result.length - 1].id) {
      lastUbrowserId = result[result.length - 1].id
    }
    track(platform, 'ubrowser', Boolean(reuseId))
  } catch (e) {
    // ubrowser 失败兜底：退回系统浏览器，保证链接永远能打开
    try {
      window.utools.shellOpenExternal(url)
      track(platform, 'system', false)
    } catch (e2) {
      console.error('打开链接失败:', e2)
    }
  }
}

function track(platform, mode, reused) {
  try {
    trackEvent(EventType.OPEN_LINK, { platform, mode, reused })
  } catch (e) {
    /* 埋点失败不影响功能 */
  }
}
