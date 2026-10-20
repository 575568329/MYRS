/**
 * 数据镜像（P0.1 stale-while-revalidate）
 * 上次成功加载的榜单快照，localStorage 持久化 + LRU（最近 8 个平台）。
 * 用途：切平台/进插件时先渲染镜像（秒开），后台静默刷新真实数据；
 *       断网时保留镜像并显示"滞后 N 分钟"。
 */
import { STORAGE_KEYS } from '../config.js'

const MIRROR_PREFIX = 'hotsearch_mirror_'
const MIRROR_LIMIT = 8

function storage() {
  // uTools 环境用 dbStorage，浏览器开发用 localStorage
  if (typeof window !== 'undefined' && window.utools && window.utools.dbStorage) {
    return window.utools.dbStorage
  }
  try {
    return window.localStorage
  } catch (e) {
    return null
  }
}

function readIndex() {
  const s = storage()
  if (!s) return []
  try {
    const raw = s.getItem(STORAGE_KEYS.MIRROR_INDEX)
    return raw ? JSON.parse(raw) : []
  } catch (e) {
    return []
  }
}

function writeIndex(list) {
  const s = storage()
  if (!s) return
  try {
    s.setItem(STORAGE_KEYS.MIRROR_INDEX, JSON.stringify(list))
  } catch (e) {
    /* 容量满时静默失败，镜像仅是加速手段 */
  }
}

/**
 * 保存某平台的数据镜像
 * @param {string} platformId
 * @param {{data: Array, total: number, hasMore: boolean}} payload
 */
export function saveMirror(platformId, payload) {
  const s = storage()
  if (!s || !payload || !Array.isArray(payload.data)) return
  try {
    s.setItem(
      MIRROR_PREFIX + platformId,
      JSON.stringify({ ...payload, ts: Date.now() })
    )
    // LRU：该平台移到最前，超限淘汰最旧
    const index = readIndex().filter(id => id !== platformId)
    index.unshift(platformId)
    const evicted = index.splice(MIRROR_LIMIT)
    evicted.forEach(id => {
      try {
        s.removeItem(MIRROR_PREFIX + id)
      } catch (e) {
        /* 忽略 */
      }
    })
    writeIndex(index)
  } catch (e) {
    /* 忽略序列化失败 */
  }
}

/**
 * 读取某平台的数据镜像（不过期判断，永远可读）
 * @param {string} platformId
 * @returns {{data: Array, total: number, hasMore: boolean, ts: number}|null}
 */
export function peekMirror(platformId) {
  const s = storage()
  if (!s) return null
  try {
    const raw = s.getItem(MIRROR_PREFIX + platformId)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed.data) ? parsed : null
  } catch (e) {
    return null
  }
}

/**
 * 镜像滞后描述
 * @param {number} ts 镜像时间戳
 * @returns {string} 如 "12分钟前" / "3小时前"
 */
export function mirrorAgeText(ts) {
  if (!ts) return ''
  const minutes = Math.floor((Date.now() - ts) / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`
  return `${Math.floor(hours / 24)}天前`
}
