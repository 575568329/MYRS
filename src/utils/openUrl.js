/**
 * 统一打开入口（P0.3 → P1 设置化）
 * 默认用 uTools 内置浏览器 ubrowser（摸鱼小窗：任务栏无痕），
 * 打开方式 / 尺寸 / 透明度 / 置顶由设置页「摸鱼小窗」控制；
 * 浏览器开发环境降级 window.open。
 */
import { FISH_WINDOW_DEFAULTS, FISH_WINDOW_SIZES, STORAGE_KEYS } from '../config.js'
import { getStorage } from './storage.js'
import { trackEvent, EventType } from '../services/analytics/index.js'

let lastUbrowserId = null

/**
 * 读取摸鱼小窗配置（逐字段校验，坏数据回退默认值）
 * 不走 Pinia：工具模块与组件解耦，每次打开链接时现读现用
 */
function loadFishConfig() {
  const cfg = { ...FISH_WINDOW_DEFAULTS }
  try {
    const storage = getStorage()
    const raw = storage && storage.getItem(STORAGE_KEYS.FISH_WINDOW_CONFIG)
    if (raw) {
      const saved = JSON.parse(raw)
      if (saved && typeof saved === 'object') {
        if (saved.openIn === 'ubrowser' || saved.openIn === 'system') cfg.openIn = saved.openIn
        if (FISH_WINDOW_SIZES[saved.size]) cfg.size = saved.size
        if (typeof saved.opacity === 'number') cfg.opacity = Math.min(1, Math.max(0.5, saved.opacity))
        if (typeof saved.alwaysOnTop === 'boolean') cfg.alwaysOnTop = saved.alwaysOnTop
      }
    }
  } catch (e) {
    /* 坏配置回退默认 */
  }
  return cfg
}

export async function openUrl(url, { platform = '', background = false } = {}) {
  if (!url || url === '#') return

  const cfg = loadFishConfig()

  // 浏览器开发环境降级
  if (!window.utools) {
    window.open(url, '_blank')
    track(platform, 'system', false)
    return
  }

  // 用户选择系统浏览器
  if (cfg.openIn === 'system') {
    window.utools.shellOpenExternal(url)
    track(platform, 'system', false)
    return
  }

  try {
    const size = FISH_WINDOW_SIZES[cfg.size] || FISH_WINDOW_SIZES.standard
    const opts = {
      width: size.width,
      height: size.height,
      skipTaskbar: true,
      show: !background,
      opacity: cfg.opacity,
      alwaysOnTop: cfg.alwaysOnTop
    }
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
