/**
 * 统一打开入口（P0.3 → P1 设置化 → FISH-WINDOW-2.0 M1）
 * 默认用 uTools 内置浏览器 ubrowser（摸鱼小窗：任务栏无痕），
 * 打开方式 / 尺寸 / 透明度 / 置顶 / 自动静音 / 位置记忆由设置页「摸鱼小窗」控制；
 * 浏览器开发环境降级 window.open。
 */
import { FISH_WINDOW_DEFAULTS, FISH_WINDOW_SIZES, STORAGE_KEYS } from '../config.js'
import { getStorage } from './storage.js'
import { matchSiteRule } from './siteRules.js'
import { trackEvent, EventType } from '../services/analytics/index.js'

let lastUbrowserId = null

/** 供老板键模块读取最后打开的小窗实例（FISH-WINDOW-2.0 M1） */
export function getLastUbrowserId() {
  return lastUbrowserId
}

/**
 * 读取摸鱼小窗配置（逐字段校验，坏数据回退默认值）
 * 不走 Pinia：工具模块与组件解耦，每次打开链接时现读现用
 */
export function loadFishConfig() {
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
        if (typeof saved.autoMute === 'boolean') cfg.autoMute = saved.autoMute
        if (typeof saved.rememberPosition === 'boolean') cfg.rememberPosition = saved.rememberPosition
        if (typeof saved.cleanMode === 'boolean') cfg.cleanMode = saved.cleanMode
      }
    }
  } catch (e) {
    /* 坏配置回退默认 */
  }
  return cfg
}

// ========== 位置记忆（M1-③） ==========

function loadPosition() {
  try {
    const raw = getStorage()?.getItem(STORAGE_KEYS.FISH_WINDOW_POS)
    if (!raw) return null
    const p = JSON.parse(raw)
    if (p && [p.x, p.y, p.width, p.height].every(Number.isFinite)) return p
  } catch (e) {
    /* 坏数据忽略 */
  }
  return null
}

/**
 * 打开成功 3 秒后回读空闲实例的位置尺寸并持久化。
 * 局限：只能读到"空闲"实例；3 秒延迟基本规避刚 run 完的忙窗口。
 */
function savePositionSoon(id) {
  setTimeout(() => {
    try {
      const idle = window.utools.getIdleUBrowsers() || []
      const hit = idle.find(w => w.id === id)
      if (hit && [hit.x, hit.y, hit.width, hit.height].every(Number.isFinite)) {
        getStorage()?.setItem(
          STORAGE_KEYS.FISH_WINDOW_POS,
          JSON.stringify({ x: hit.x, y: hit.y, width: hit.width, height: hit.height })
        )
      }
    } catch (e) {
      /* 读不到就下次再记 */
    }
  }, 3000)
}

// ========== 品牌底色（消除加载白闪，M1 顺手项） ==========

function windowBackgroundColor() {
  try {
    const mode = (getStorage()?.getItem(STORAGE_KEYS.THEME_MODE)) || 'auto'
    const dark = mode === 'dark' ||
      (mode === 'auto' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
    return dark ? '#1c1c1e' : '#faf9f7'
  } catch (e) {
    return '#faf9f7'
  }
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
    // 位置记忆优先于尺寸档位（记住的是用户实际用过的位置和大小）
    const pos = cfg.rememberPosition ? loadPosition() : null
    if (pos) {
      try { trackEvent(EventType.POS_RESTORED, {}) } catch (e) { /* 埋点不阻塞 */ }
    }
    const size = FISH_WINDOW_SIZES[cfg.size] || FISH_WINDOW_SIZES.standard
    const opts = {
      width: pos ? pos.width : size.width,
      height: pos ? pos.height : size.height,
      ...(pos ? { x: pos.x, y: pos.y } : {}),
      skipTaskbar: true,
      show: !background,
      opacity: cfg.opacity,
      alwaysOnTop: cfg.alwaysOnTop,
      backgroundColor: windowBackgroundColor()
    }
    // 窗口复用：优先上次实例，其次空闲窗口（API 为复数、返回数组）
    let reuseId = lastUbrowserId
    if (!reuseId && typeof window.utools.getIdleUBrowsers === 'function') {
      const idle = window.utools.getIdleUBrowsers()
      reuseId = Array.isArray(idle) && idle.length > 0 ? idle[0].id : null
    }

    let task = window.utools.ubrowser.goto(url)
    // 站点净化（M2）：命中规则即注入沉浸阅读样式
    const rule = cfg.cleanMode ? matchSiteRule(url) : null
    if (rule && rule.css) {
      task = task.css(rule.css)
      try { trackEvent(EventType.RULES_APPLIED, { domain: rule.domain }) } catch (e) { /* 埋点不阻塞 */ }
    }
    // 自动静音（M1-②）：仅静音本次加载，用户在小窗内的后续操作不受影响
    if (cfg.autoMute) {
      task = task.wait(2000).evaluate(() => {
        document.querySelectorAll('video,audio').forEach(m => { m.muted = true })
      })
    }
    const result = reuseId
      ? await task.run(reuseId, opts)
      : await task.run(opts)

    // run 返回实例数组，记录最后窗口 id 供下次复用/老板键收集
    if (Array.isArray(result) && result.length > 0 && result[result.length - 1] && result[result.length - 1].id) {
      lastUbrowserId = result[result.length - 1].id
      if (cfg.rememberPosition) savePositionSoon(lastUbrowserId)
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
