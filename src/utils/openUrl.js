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

    // 完整体验链：净化 + 静音（仅新导航构建一次）
    let task = window.utools.ubrowser.goto(url)
    const rule = cfg.cleanMode ? matchSiteRule(url) : null
    if (rule && rule.css) {
      task = task.css(rule.css)
      try { trackEvent(EventType.RULES_APPLIED, { domain: rule.domain }) } catch (e) { /* 埋点不阻塞 */ }
    }
    if (cfg.autoMute) {
      task = task.wait(2000).evaluate(() => {
        const media = document.querySelectorAll('video,audio')
        if (media.length === 0) return
        media.forEach(m => { m.muted = true })
        const bubble = document.createElement('div')
        bubble.textContent = '🔇 已自动静音 · 点击恢复声音'
        Object.assign(bubble.style, {
          position: 'fixed', right: '16px', bottom: '16px', zIndex: '2147483647',
          background: 'rgba(28,28,30,0.92)', color: '#ffffff',
          padding: '8px 14px', borderRadius: '8px',
          font: '13px/1.4 system-ui, -apple-system, sans-serif',
          cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
          transition: 'opacity 0.4s', userSelect: 'none'
        })
        bubble.addEventListener('click', () => {
          document.querySelectorAll('video,audio').forEach(m => { m.muted = false })
          bubble.remove()
        })
        document.body.appendChild(bubble)
        setTimeout(() => {
          bubble.style.opacity = '0'
          setTimeout(() => bubble.remove(), 500)
        }, 8000)
      })
    }

    let result = null
    try {
      // 一级：完整参数（可能复用窗口）；失败不抛出，进入兼容模式
      result = reuseId ? await task.run(reuseId, opts) : await task.run(opts)
    } catch (e1) {
      console.warn('[摸鱼小窗] 完整参数打开失败，尝试兼容模式:', e1)
      try {
        // 二级：新窗口 + 最小参数（不依赖 opacity/位置/静音链等较新特性，覆盖旧版 uTools 或失效复用 id）
        result = await window.utools.ubrowser.goto(url).run({
          width: size.width,
          height: size.height,
          show: !background
        })
      } catch (e2) {
        console.warn('[摸鱼小窗] 兼容模式也失败:', e2)
        throw e2
      }
    }

    // run 返回实例数组，记录最后窗口 id 供下次复用/老板键收集
    if (Array.isArray(result) && result.length > 0 && result[result.length - 1] && result[result.length - 1].id) {
      lastUbrowserId = result[result.length - 1].id
      if (cfg.rememberPosition) savePositionSoon(lastUbrowserId)
    }
    track(platform, 'ubrowser', Boolean(reuseId))
  } catch (e) {
    // 三级兜底：系统浏览器，保证链接永远能打开；上浮原因让用户知道为什么
    console.error('[摸鱼小窗] 打开失败，降级系统浏览器:', e)
    notifyFallback()
    try {
      window.utools.shellOpenExternal(url)
      track(platform, 'system', false)
    } catch (e2) {
      console.error('打开链接失败:', e2)
    }
  }
}

/**
 * 小窗失败降级提示（主窗口 Toast，用户能看到"为什么用了系统浏览器"）
 */
function notifyFallback() {
  try {
    window.dispatchEvent(new CustomEvent('fish-window-fallback'))
  } catch (e) {
    /* 提示失败不影响功能 */
  }
}

function track(platform, mode, reused) {
  try {
    trackEvent(EventType.OPEN_LINK, { platform, mode, reused })
  } catch (e) {
    /* 埋点失败不影响功能 */
  }
}
