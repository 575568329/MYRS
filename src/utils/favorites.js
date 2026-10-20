/**
 * 收藏条目（P0.3 数据模型 v2）
 * 对象数组 {platform, title, url, savedAt}，localStorage/dbStorage 持久化；
 * 自动迁移旧版字符串数组（hotSearchStore 的 `platform_title` 格式）。
 */
import { ref } from 'vue'
import { STORAGE_KEYS } from '../config.js'

const favorites = ref([])
let loaded = false

function storage() {
  if (typeof window !== 'undefined' && window.utools && window.utools.dbStorage) {
    return window.utools.dbStorage
  }
  try {
    return window.localStorage
  } catch (e) {
    return null
  }
}

const itemKey = (platform, title) => `${platform}_${title}`

export function useFavorites() {
  function load() {
    if (loaded) return
    loaded = true
    const s = storage()
    if (!s) return
    try {
      const raw = s.getItem(STORAGE_KEYS.FAVORITES_V2)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          favorites.value = parsed
          return
        }
      }
      // v2 无数据 → 尝试迁移旧格式（旧键 favoriteItems 存字符串数组）
      const legacy = s.getItem(STORAGE_KEYS.FAVORITE_ITEMS)
      if (legacy) {
        const legacyList = JSON.parse(legacy)
        if (Array.isArray(legacyList)) {
          favorites.value = legacyList
            .filter(k => typeof k === 'string' && k.includes('_'))
            .map(k => {
              const sep = k.indexOf('_')
              return {
                platform: k.slice(0, sep),
                title: k.slice(sep + 1),
                url: '',
                savedAt: null
              }
            })
          persist()
        }
      }
    } catch (e) {
      favorites.value = []
    }
  }

  function persist() {
    const s = storage()
    if (!s) return
    try {
      s.setItem(STORAGE_KEYS.FAVORITES_V2, JSON.stringify(favorites.value))
    } catch (e) {
      /* 忽略 */
    }
  }

  function isFavorited(platform, title) {
    const key = itemKey(platform, title)
    return favorites.value.some(f => itemKey(f.platform, f.title) === key)
  }

  /**
   * 切换收藏
   * @returns {boolean} 切换后的收藏状态
   */
  function toggleFavorite(platform, item) {
    const title = item.title
    if (!title) return false
    const key = itemKey(platform, title)
    const idx = favorites.value.findIndex(f => itemKey(f.platform, f.title) === key)
    if (idx > -1) {
      favorites.value.splice(idx, 1)
      persist()
      return false
    }
    favorites.value.unshift({
      platform,
      title,
      url: item.url || item.mobileUrl || '',
      savedAt: Date.now()
    })
    persist()
    return true
  }

  return { favorites, load, isFavorited, toggleFavorite }
}
