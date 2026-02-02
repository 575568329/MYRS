/**
 * 缓存管理器
 * 用于管理API数据缓存,减少对外部API的请求次数
 *
 * 功能:
 * - 基于localStorage的持久化缓存
 * - 支持TTL(Time To Live)过期机制
 * - 智能预加载和批量缓存
 * - 请求节流防止频繁调用
 */

const CACHE_PREFIX = 'hotsearch_cache_'
const DEFAULT_TTL = 60 * 60 * 1000 // 默认缓存1小时

class CacheManager {
  constructor() {
    this.memoryCache = new Map() // 内存缓存,用于快速访问
    this.requestQueue = new Map() // 请求队列,防止重复请求
    this.requestTimestamps = new Map() // 记录请求时间戳,用于节流
  }

  /**
   * 生成缓存键
   * @param {string} platformId - 平台ID
   * @param {string} key - 缓存键(如: 'page_1', 'config')
   * @returns {string} 完整缓存键
   */
  getCacheKey(platformId, key = 'default') {
    return `${CACHE_PREFIX}${platformId}_${key}`
  }

  /**
   * 获取缓存数据
   * @param {string} platformId - 平台ID
   * @param {string} key - 缓存键
   * @returns {Object|null} 缓存的数据,如果不存在或已过期则返回null
   */
  get(platformId, key = 'default') {
    const cacheKey = this.getCacheKey(platformId, key)

    // 先检查内存缓存
    if (this.memoryCache.has(cacheKey)) {
      const cached = this.memoryCache.get(cacheKey)
      if (!this.isExpired(cached)) {
        console.log(`📦 [内存缓存] 命中: ${cacheKey}`)
        return cached.data
      } else {
        this.memoryCache.delete(cacheKey)
      }
    }

    // 再检查localStorage
    try {
      const cachedStr = localStorage.getItem(cacheKey)
      if (cachedStr) {
        const cached = JSON.parse(cachedStr)
        if (!this.isExpired(cached)) {
          console.log(`💾 [本地缓存] 命中: ${cacheKey}`)
          // 同步到内存缓存
          this.memoryCache.set(cacheKey, cached)
          return cached.data
        } else {
          // 已过期,删除
          localStorage.removeItem(cacheKey)
          console.log(`⏰ [缓存过期] ${cacheKey}`)
        }
      }
    } catch (error) {
      console.error('❌ 读取缓存失败:', error)
    }

    return null
  }

  /**
   * 设置缓存数据
   * @param {string} platformId - 平台ID
   * @param {string} key - 缓存键
   * @param {any} data - 要缓存的数据
   * @param {number} ttl - 缓存有效期(毫秒),默认1小时
   */
  set(platformId, key = 'default', data, ttl = DEFAULT_TTL) {
    const cacheKey = this.getCacheKey(platformId, key)
    const cacheData = {
      data,
      timestamp: Date.now(),
      ttl
    }

    // 写入内存缓存
    this.memoryCache.set(cacheKey, cacheData)

    // 写入localStorage
    try {
      localStorage.setItem(cacheKey, JSON.stringify(cacheData))
      console.log(`✅ [缓存写入] ${cacheKey} (TTL: ${ttl}ms)`)
    } catch (error) {
      console.error('❌ 写入缓存失败:', error)
      // 如果localStorage满了,清理旧缓存
      if (error.name === 'QuotaExceededError') {
        this.clearOldCache()
        try {
          localStorage.setItem(cacheKey, JSON.stringify(cacheData))
        } catch (retryError) {
          console.error('❌ 清理后仍无法写入缓存:', retryError)
        }
      }
    }
  }

  /**
   * 检查缓存是否过期
   * @param {Object} cached - 缓存对象
   * @returns {boolean} 是否已过期
   */
  isExpired(cached) {
    if (!cached || !cached.timestamp) return true
    return Date.now() - cached.timestamp > cached.ttl
  }

  /**
   * 清理过期缓存
   */
  clearExpiredCache() {
    const now = Date.now()
    let clearedCount = 0

    // 清理内存缓存
    for (const [key, cached] of this.memoryCache.entries()) {
      if (this.isExpired(cached)) {
        this.memoryCache.delete(key)
        clearedCount++
      }
    }

    // 清理localStorage缓存
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(CACHE_PREFIX)) {
          const cachedStr = localStorage.getItem(key)
          if (cachedStr) {
            try {
              const cached = JSON.parse(cachedStr)
              if (this.isExpired(cached)) {
                localStorage.removeItem(key)
                clearedCount++
              }
            } catch (error) {
              // 解析失败,删除无效缓存
              localStorage.removeItem(key)
              clearedCount++
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ 清理缓存失败:', error)
    }

    if (clearedCount > 0) {
      console.log(`🧹 清理了 ${clearedCount} 个过期缓存`)
    }

    return clearedCount
  }

  /**
   * 清理最旧的缓存(当存储空间不足时)
   */
  clearOldCache() {
    const cacheEntries = []

    // 收集所有缓存条目
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(CACHE_PREFIX)) {
        try {
          const cachedStr = localStorage.getItem(key)
          if (cachedStr) {
            const cached = JSON.parse(cachedStr)
            cacheEntries.push({ key, timestamp: cached.timestamp || 0 })
          }
        } catch (error) {
          // 忽略解析失败的条目
        }
      }
    }

    // 按时间戳排序,删除最旧的30%
    cacheEntries.sort((a, b) => a.timestamp - b.timestamp)
    const deleteCount = Math.ceil(cacheEntries.length * 0.3)

    for (let i = 0; i < deleteCount; i++) {
      localStorage.removeItem(cacheEntries[i].key)
    }

    console.log(`🗑️ 清理了 ${deleteCount} 个最旧的缓存`)
  }

  /**
   * 清除指定平台的所有缓存
   * @param {string} platformId - 平台ID
   */
  clearPlatform(platformId) {
    const prefix = this.getCacheKey(platformId, '')

    // 清理内存缓存
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(prefix)) {
        this.memoryCache.delete(key)
      }
    }

    // 清理localStorage缓存
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i)
        if (key && key.startsWith(prefix)) {
          localStorage.removeItem(key)
        }
      }
      console.log(`🧹 清除平台 ${platformId} 的所有缓存`)
    } catch (error) {
      console.error('❌ 清除平台缓存失败:', error)
    }
  }

  /**
   * 清除所有缓存
   */
  clearAll() {
    // 清理内存缓存
    this.memoryCache.clear()

    // 清理localStorage缓存
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i)
        if (key && key.startsWith(CACHE_PREFIX)) {
          localStorage.removeItem(key)
        }
      }
      console.log('🧹 清除所有缓存')
    } catch (error) {
      console.error('❌ 清除所有缓存失败:', error)
    }
  }

  /**
   * 请求节流检查
   * @param {string} key - 请求键
   * @param {number} interval - 最小请求间隔(毫秒)
   * @returns {boolean} 是否允许请求
   */
  canRequest(key, interval = 1000) {
    const now = Date.now()
    const lastRequest = this.requestTimestamps.get(key) || 0

    if (now - lastRequest < interval) {
      console.log(`⏳ [请求节流] ${key} 需要等待 ${interval - (now - lastRequest)}ms`)
      return false
    }

    this.requestTimestamps.set(key, now)
    return true
  }

  /**
   * 防止重复请求
   * @param {string} key - 请求键
   * @param {Function} requestFn - 请求函数
   * @returns {Promise} 请求结果
   */
  async deduplicateRequest(key, requestFn) {
    // 如果已有相同请求正在进行,返回该请求的Promise
    if (this.requestQueue.has(key)) {
      console.log(`🔄 [请求去重] ${key} 正在等待已有请求`)
      return this.requestQueue.get(key)
    }

    // 创建新请求
    const requestPromise = requestFn()
      .finally(() => {
        // 请求完成后从队列中移除
        this.requestQueue.delete(key)
      })

    this.requestQueue.set(key, requestPromise)
    return requestPromise
  }

  /**
   * 批量预加载缓存
   * @param {string} platformId - 平台ID
   * @param {Function} fetchFn - 数据获取函数
   * @param {number} totalPages - 要预加载的页数
   */
  async preloadPages(platformId, fetchFn, totalPages = 3) {
    const preloadPromises = []

    for (let page = 1; page <= totalPages; page++) {
      const cacheKey = `page_${page}`

      // 检查是否已有缓存
      if (this.get(platformId, cacheKey)) {
        console.log(`⏭️ [预加载] 跳过已缓存页面: ${page}`)
        continue
      }

      // 添加预加载任务
      const promise = fetchFn(page).then(data => {
        this.set(platformId, cacheKey, data, DEFAULT_TTL)
        console.log(`✅ [预加载] 完成第 ${page} 页`)
      })

      preloadPromises.push(promise)
    }

    // 并行加载所有页面
    await Promise.all(preloadPromises)
    console.log(`🎉 [预加载] 完成 ${platformId} 的 ${totalPages} 页预加载`)
  }

  /**
   * 获取缓存统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    let totalCache = 0
    let memoryCacheSize = 0
    let expiredCache = 0

    // 统计内存缓存
    memoryCacheSize = this.memoryCache.size

    // 统计localStorage缓存
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(CACHE_PREFIX)) {
          totalCache++
          const cachedStr = localStorage.getItem(key)
          if (cachedStr) {
            try {
              const cached = JSON.parse(cachedStr)
              if (this.isExpired(cached)) {
                expiredCache++
              }
            } catch (error) {
              // 忽略解析失败
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ 统计缓存失败:', error)
    }

    return {
      memoryCache: memoryCacheSize,
      localStorageCache: totalCache,
      expiredCache,
      activeRequests: this.requestQueue.size
    }
  }
}

// 创建单例实例
const cacheManager = new CacheManager()

// 应用启动时清理过期缓存
if (typeof window !== 'undefined') {
  setTimeout(() => {
    cacheManager.clearExpiredCache()
  }, 1000)
}

export default cacheManager
