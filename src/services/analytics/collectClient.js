/**
 * 个人数据后台传输客户端（替代 pantryClient）
 *
 * - 端点：POST {API}/collect/{TOKEN}/{PROJECT}，服务端纯追加，无需 GET-merge
 * - 缩写序列化只发生在本层；AnalyticsEvent.toJSON / 本地缓存 / 调试面板保持完整格式
 * - 与 analyticsCollector 的耦合面：uploadAnalyticsData(events) => {success, error}
 *   （失败重入队由 collector 处理，本层单次尝试即可）
 *
 * 缩写映射（与服务端 buildSummary 对齐）：
 *   app_open/app_start        -> ao {from}
 *   app_close                 -> ac {dur, killed}
 *   platform_view             -> pv {p, dur}
 *   platform_load_success/error -> pl {p, ok, ms, src}（platform_load_start 视为噪音丢弃）
 *   其余交互事件              -> ua {a: 动作名, ...}（item_click 额外做标题截断）
 */
import { COLLECT_CONFIG } from '../../config/collectConfig.js'

// import.meta.env 兼容（Vite 构建时替换；node 单测直连时为空对象）
const env = (typeof import.meta !== 'undefined' && import.meta.env) || {}
const DEBUG = env.VITE_DEBUG_MODE === 'true'

// 交互事件 -> ua.a 动作名
const UA_ACTIONS = {
  item_click: 'item_click',
  open_link: 'open_link',
  favorite_toggle: 'favorite',
  refresh: 'refresh',
  load_more: 'load_more',
  platform_switch: 'platform_switch',
  category_switch: 'category_switch',
  settings_open: 'settings_open',
  pin_toggle: 'pin',
  error: 'error'
}

/**
 * 完整格式事件 -> 缩写线上格式 {t,u,ts,d}
 */
export function toWireEvent(e) {
  if (!e) return null
  const src = e.data || {}
  const d = { ...src }
  const u = d.user_id || null
  delete d.user_id

  const type = e.type
  if (type === 'platform_load_start') return null

  if (type === 'app_open' || type === 'app_start') {
    return { t: 'ao', u, ts: e.timestamp, d: { from: d.from || 'main' } }
  }
  if (type === 'app_close') {
    return { t: 'ac', u, ts: e.timestamp, d: { dur: d.dur || 0, killed: d.killed || 0 } }
  }
  if (type === 'platform_view') {
    return { t: 'pv', u, ts: e.timestamp, d: { p: d.platform, dur: d.duration_ms || 0 } }
  }
  if (type === 'platform_load_success' || type === 'platform_load_error') {
    return {
      t: 'pl', u, ts: e.timestamp,
      d: { p: d.platform, ok: type === 'platform_load_success' ? 1 : 0, ms: d.ms || 0, src: d.src || 'unknown' }
    }
  }
  if (type === 'item_click') {
    return {
      t: 'ua', u, ts: e.timestamp,
      d: { a: 'item_click', p: d.platform, t: String(d.item_title || '').slice(0, 80), pos: d.item_position ?? -1 }
    }
  }
  if (UA_ACTIONS[type]) {
    return { t: 'ua', u, ts: e.timestamp, d: { a: UA_ACTIONS[type], ...d } }
  }
  // 未知类型透传
  return { t: type, u, ts: e.timestamp, d }
}

/**
 * 上传埋点事件（collector 调用的唯一入口）
 * @param {Array} events - AnalyticsEvent 实例数组
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function uploadAnalyticsData(events) {
  if (!events || events.length === 0) {
    return { success: false, error: '没有数据可上传' }
  }

  const wired = events.map(toWireEvent).filter(Boolean)
  if (wired.length === 0) return { success: true } // 全部被过滤（如 platform_load_start）

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 15000)
  try {
    if (DEBUG) console.log(`[Collect] 🚀 上传 ${wired.length} 个事件 -> ${COLLECT_CONFIG.PROJECT}`)
    const res = await fetch(
      `${COLLECT_CONFIG.API}/collect/${COLLECT_CONFIG.TOKEN}/${COLLECT_CONFIG.PROJECT}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: wired }),
        signal: ctrl.signal
      }
    )
    if (!res.ok) throw new Error(`collect ${res.status}`)
    if (DEBUG) console.log('[Collect] ✅ 上传成功')
    return { success: true }
  } catch (err) {
    if (DEBUG) console.warn('[Collect] ❌ 上传失败:', err.message)
    return { success: false, error: err.message }
  } finally {
    clearTimeout(timer)
  }
}

export default { uploadAnalyticsData, toWireEvent }
