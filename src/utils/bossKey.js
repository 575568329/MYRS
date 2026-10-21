/**
 * 老板键（FISH-WINDOW-2.0 M1-①）
 * 一键隐藏所有摸鱼小窗 + 主窗口；再按一次原样恢复。
 * 触发入口：插件内 Ctrl+` / uTools 全局快捷键（plugin.json code="boss"）/ 侧栏按钮
 */
import { loadFishConfig, getLastUbrowserId } from './openUrl.js'

// 已隐藏的小窗实例（内存态：uTools 重启后丢失，重新打开同链接即复用原窗口）
const hiddenIds = new Set()

/**
 * 收集当前所有小窗实例：空闲实例 ∪ 最近打开的实例
 */
function collectIds() {
  const ids = new Set()
  if (getLastUbrowserId()) ids.add(getLastUbrowserId())
  try {
    const idle = window.utools.getIdleUBrowsers() || []
    idle.forEach(w => ids.add(w.id))
  } catch (e) {
    /* 枚举失败仅影响收集面，lastId 仍在 */
  }
  return ids
}

/**
 * 对一组实例逐个执行链式方法，返回成功的 id 列表
 * @param {Set<string>} ids
 * @param {'hide'|'show'} method
 */
async function runEach(ids, method) {
  const entries = [...ids]
  const results = await Promise.allSettled(
    entries.map(id => window.utools.ubrowser[method]().run(id))
  )
  return entries.filter((_, i) => results[i].status === 'fulfilled')
}

/**
 * 老板键开关（toggle 语义）
 * @returns {{ action: 'hide'|'show'|'main-only'|'none', count: number }}
 *   hide     隐藏了 count 个小窗 + 主窗口
 *   show     恢复了 count 个小窗（主窗口此时已可见，不动作）
 *   main-only 无小窗可藏（system 模式或无实例），仅隐藏了主窗口
 *   none     浏览器开发环境，无 utools
 */
export async function toggleBossKey() {
  if (!window.utools || !window.utools.ubrowser) return { action: 'none', count: 0 }

  // 恢复分支：之前藏过，这次是"回来"
  if (hiddenIds.size > 0) {
    const restored = await runEach(hiddenIds, 'show')
    hiddenIds.clear()
    return { action: 'show', count: restored.length }
  }

  // 隐藏分支
  const cfg = loadFishConfig()
  const ids = collectIds()
  if (cfg.openIn === 'system' || ids.size === 0) {
    try { window.utools.hideMainWindow() } catch (e) { /* 已隐藏则忽略 */ }
    return { action: 'main-only', count: 0 }
  }
  const hidden = await runEach(ids, 'hide')
  hidden.forEach(id => hiddenIds.add(id))
  try { window.utools.hideMainWindow() } catch (e) { /* 已隐藏则忽略 */ }
  return { action: 'hide', count: hidden.length }
}

/**
 * 当前是否处于隐藏态（供 UI 提示）
 */
export function isBossHidden() {
  return hiddenIds.size > 0
}
