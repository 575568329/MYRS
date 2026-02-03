/**
 * 埋点收集器服务
 * 负责收集、缓存和上传埋点数据
 */

import { ANALYTICS_ENABLED, UPLOAD_STRATEGY, RETENTION_POLICY, DEBUG, PANTRY_CONFIG } from '../../config/pantryConfig.js'
import { pantryClient } from './pantryClient.js'
import { createEvent, EventPriority } from './eventTypes.js'

// 从环境变量读取配置（优先级高于配置文件）
const ANALYTICS_ENABLED_ENV = import.meta.env.VITE_ANALYTICS_ENABLED !== 'false'
const DEBUG_MODE = import.meta.env.VITE_DEBUG_MODE === 'true' || DEBUG.ENABLED
const PANTRY_KEY = import.meta.env.VITE_PANTRY_KEY || PANTRY_CONFIG.KEY

/**
 * 埋点收集器类
 */
class AnalyticsCollector {
  constructor() {
    // 事件缓存队列
    this.eventQueue = []

    // 按优先级分组的队列
    this.highPriorityQueue = []
    this.mediumPriorityQueue = []
    this.lowPriorityQueue = []

    // 上传定时器
    this.uploadTimer = null
    this.forceUploadTimer = null

    // 上传冷却时间戳
    this.lastUploadTime = 0
    this.uploadCooldown = 3000 // 3秒冷却时间，避免频繁上传

    // 是否正在上传
    this.isUploading = false

    // 是否已初始化
    this.isInitialized = false

    // 用户标识（匿名）
    this.userId = this.getUserId()

    // 会话 ID
    this.sessionId = this.generateSessionId()
  }

  /**
   * 初始化收集器
   * @param {Object} options - 初始化选项
   * @returns {Promise<boolean>} 是否成功初始化
   */
  async initialize(options = {}) {
    if (this.isInitialized) {
      if (DEBUG_MODE) console.log('[Analytics] 收集器已初始化')
      return true
    }

    if (!ANALYTICS_ENABLED_ENV) {
      console.log('[Analytics] 埋点功能未启用')
      return false
    }

    try {
      // 合并环境变量和传入的选项
      const initOptions = {
        key: options.key || PANTRY_KEY,
        ...options
      }

      // 初始化 Pantry 客户端
      await pantryClient.initialize(initOptions)

      // 加载本地缓存的事件
      this.loadCachedEvents()

      // 设置定时上传
      this.startUploadTimer()

      // 记录应用启动事件
      this.track('app_start', {
        user_id: this.userId,
        session_id: this.sessionId,
        timestamp: Date.now()
      })

      this.isInitialized = true

      if (DEBUG_MODE) {
        console.log('[Analytics] 收集器初始化成功')
        console.log('[Analytics] 用户ID:', this.userId)
        console.log('[Analytics] 会话ID:', this.sessionId)
      }

      return true
    } catch (error) {
      console.error('[Analytics] 收集器初始化失败:', error)
      return false
    }
  }

  /**
   * 追踪事件
   * @param {string} type - 事件类型
   * @param {Object} data - 事件数据
   */
  track(type, data = {}) {
    if (!this.isInitialized && type !== 'app_start') {
      if (DEBUG_MODE) console.warn('[Analytics] 收集器未初始化，跳过事件:', type)
      return
    }

    try {
      // 创建事件对象
      const event = createEvent(type, {
        ...data,
        user_id: this.userId,
        session_id: this.sessionId
      })

      // 根据优先级添加到相应队列
      switch (event.priority) {
        case EventPriority.HIGH:
          this.highPriorityQueue.push(event)
          if (DEBUG_MODE) {
            console.log(`[Analytics] ➕ 添加高优先级事件: ${event.type} (立即上传)`)
          }
          // 高优先级事件立即上传
          this.uploadHighPriorityEvents()
          break
        case EventPriority.MEDIUM:
          this.mediumPriorityQueue.push(event)
          if (DEBUG_MODE) {
            console.log(`[Analytics] ➕ 添加中优先级事件: ${event.type} (队列车: ${this.mediumPriorityQueue.length})`)
          }
          break
        case EventPriority.LOW:
          this.lowPriorityQueue.push(event)
          if (DEBUG_MODE) {
            console.log(`[Analytics] ➕ 添加低优先级事件: ${event.type} (队列车: ${this.lowPriorityQueue.length})`)
          }
          break
      }

      // 添加到总队列
      this.eventQueue.push(event)

      // 打印日志
      if (DEBUG.LOG_EVENTS) {
        console.log('[Analytics] 追踪事件:', event.toJSON())
      }

      // 检查是否达到批量上传阈值
      this.checkUploadThreshold()

      // 保存到本地缓存
      this.saveCachedEvents()
    } catch (error) {
      console.error('[Analytics] 追踪事件失败:', error)
    }
  }

  /**
   * 上传高优先级事件
   */
  async uploadHighPriorityEvents() {
    if (this.highPriorityQueue.length === 0) return

    // 如果正在上传，跳过
    if (this.isUploading) {
      if (DEBUG_MODE) {
        console.log('[Analytics] ⏳ 正在上传中，高优先级事件等待下次上传')
      }
      return
    }

    const eventsToUpload = [...this.highPriorityQueue]
    this.highPriorityQueue = []

    // 标记正在上传
    this.isUploading = true

    if (DEBUG_MODE) {
      console.log(`[Analytics] 上传 ${eventsToUpload.length} 个高优先级事件`)
    }

    try {
      const result = await pantryClient.uploadAnalyticsData(eventsToUpload)

      if (result.success) {
        if (DEBUG_MODE) {
          console.log('[Analytics] ✅ 高优先级事件上传成功')
        }
        // 从总队列中移除已上传的事件
        this.removeUploadedEvents(eventsToUpload)
        this.lastUploadTime = Date.now()
      } else {
        console.error('[Analytics] 高优先级事件上传失败:', result.error)
        // 失败时重新加入队列
        this.highPriorityQueue.unshift(...eventsToUpload)
      }
    } finally {
      this.isUploading = false
    }
  }

  /**
   * 检查是否达到上传阈值
   */
  checkUploadThreshold() {
    const totalEvents = this.mediumPriorityQueue.length + this.lowPriorityQueue.length

    if (DEBUG_MODE) {
      console.log(`[Analytics] 📊 检查上传阈值: ${totalEvents}/${UPLOAD_STRATEGY.BATCH_SIZE}`)
      console.log(`[Analytics]   - 中优先级队列: ${this.mediumPriorityQueue.length}`)
      console.log(`[Analytics]   - 低优先级队列: ${this.lowPriorityQueue.length}`)
      console.log(`[Analytics]   - 高优先级队列: ${this.highPriorityQueue.length}`)
    }

    // 检查是否正在上传
    if (this.isUploading) {
      if (DEBUG_MODE) {
        console.log('[Analytics] ⏳ 正在上传中，跳过本次检查')
      }
      return
    }

    // 检查冷却时间
    const timeSinceLastUpload = Date.now() - this.lastUploadTime
    if (timeSinceLastUpload < this.uploadCooldown && totalEvents < UPLOAD_STRATEGY.BATCH_SIZE) {
      if (DEBUG_MODE) {
        console.log(`[Analytics] ⏸️ 冷却中，${Math.ceil((this.uploadCooldown - timeSinceLastUpload) / 1000)}秒后可再次上传`)
      }
      return
    }

    if (totalEvents >= UPLOAD_STRATEGY.BATCH_SIZE) {
      if (DEBUG_MODE) {
        console.log(`[Analytics] ✅ 达到批量上传阈值 (${totalEvents}/${UPLOAD_STRATEGY.BATCH_SIZE})，准备上传...`)
      }
      this.uploadPendingEvents()
    }
  }

  /**
   * 上传待处理事件
   */
  async uploadPendingEvents() {
    const eventsToUpload = [
      ...this.mediumPriorityQueue,
      ...this.lowPriorityQueue
    ]

    if (eventsToUpload.length === 0) return

    // 标记正在上传
    this.isUploading = true

    // 清空队列（上传失败时会重新加入）
    this.mediumPriorityQueue = []
    this.lowPriorityQueue = []

    if (DEBUG_MODE) {
      console.log(`[Analytics] 上传 ${eventsToUpload.length} 个待处理事件`)
    }

    try {
      const result = await pantryClient.uploadAnalyticsData(eventsToUpload)

      if (result.success) {
        if (DEBUG_MODE) {
          console.log('[Analytics] ✅ 待处理事件上传成功')
        }
        this.removeUploadedEvents(eventsToUpload)
        this.saveCachedEvents()
        this.lastUploadTime = Date.now()
      } else {
        console.error('[Analytics] 待处理事件上传失败:', result.error)
        // 失败时重新加入队列
        eventsToUpload.forEach(event => {
          if (event.priority === EventPriority.MEDIUM) {
            this.mediumPriorityQueue.push(event)
          } else {
            this.lowPriorityQueue.push(event)
          }
        })
      }
    } finally {
      // 无论成功或失败，都重置上传状态
      this.isUploading = false
    }
  }

  /**
   * 上传所有事件
   */
  async uploadAllEvents() {
    await this.uploadHighPriorityEvents()
    await this.uploadPendingEvents()
  }

  /**
   * 从总队列中移除已上传的事件
   * @param {Array} events - 已上传的事件数组
   */
  removeUploadedEvents(events) {
    const uploadedIds = new Set(events.map(e => `${e.type}_${e.timestamp}`))
    this.eventQueue = this.eventQueue.filter(
      e => !uploadedIds.has(`${e.type}_${e.timestamp}`)
    )
  }

  /**
   * 启动定时上传
   */
  startUploadTimer() {
    // 清除旧的定时器
    if (this.uploadTimer) {
      clearInterval(this.uploadTimer)
    }
    if (this.forceUploadTimer) {
      clearTimeout(this.forceUploadTimer)
    }

    // 定时上传（每分钟检查一次）
    this.uploadTimer = setInterval(() => {
      this.uploadPendingEvents()
    }, 60 * 1000)

    // 强制上传定时器（达到最大间隔时强制上传）
    this.forceUploadTimer = setTimeout(() => {
      if (DEBUG_MODE) {
        console.log('[Analytics] 达到最大上传间隔，强制上传')
      }
      this.uploadAllEvents()
    }, UPLOAD_STRATEGY.MAX_INTERVAL)
  }

  /**
   * 停止定时上传
   */
  stopUploadTimer() {
    if (this.uploadTimer) {
      clearInterval(this.uploadTimer)
      this.uploadTimer = null
    }
    if (this.forceUploadTimer) {
      clearTimeout(this.forceUploadTimer)
      this.forceUploadTimer = null
    }
  }

  /**
   * 保存事件到本地缓存
   */
  saveCachedEvents() {
    try {
      if (window.utools && window.utools.dbStorage) {
        const cache = {
          events: this.eventQueue.map(e => e.toJSON()),
          timestamp: Date.now()
        }
        window.utools.dbStorage.setItem(
          'analytics_cache',
          JSON.stringify(cache)
        )
      }
    } catch (error) {
      console.warn('[Analytics] 保存缓存失败:', error)
    }
  }

  /**
   * 加载本地缓存的事件
   */
  loadCachedEvents() {
    try {
      if (window.utools && window.utools.dbStorage) {
        const saved = window.utools.dbStorage.getItem('analytics_cache')
        if (saved) {
          const cache = JSON.parse(saved)

          // 检查缓存是否过期
          const cacheAge = Date.now() - cache.timestamp
          const maxAge = RETENTION_POLICY.LOCAL_CACHE_DAYS * 24 * 60 * 60 * 1000

          if (cacheAge < maxAge && cache.events && cache.events.length > 0) {
            // 重新加入队列
            cache.events.forEach(eventData => {
              const event = createEvent(eventData.type, eventData.data)
              event.timestamp = eventData.timestamp
              event.priority = eventData.priority

              this.eventQueue.push(event)
              if (event.priority === EventPriority.MEDIUM) {
                this.mediumPriorityQueue.push(event)
              } else if (event.priority === EventPriority.LOW) {
                this.lowPriorityQueue.push(event)
              }
            })

            if (DEBUG_MODE) {
              console.log(`[Analytics] 从缓存加载 ${cache.events.length} 个事件`)
            }
          } else {
            // 清除过期缓存
            this.clearCachedEvents()
          }
        }
      }
    } catch (error) {
      console.warn('[Analytics] 加载缓存失败:', error)
    }
  }

  /**
   * 清除缓存的事件
   */
  clearCachedEvents() {
    this.eventQueue = []
    this.highPriorityQueue = []
    this.mediumPriorityQueue = []
    this.lowPriorityQueue = []

    try {
      if (window.utools && window.utools.dbStorage) {
        window.utools.dbStorage.removeItem('analytics_cache')
      }
    } catch (error) {
      console.warn('[Analytics] 清除缓存失败:', error)
    }
  }

  /**
   * 生成或获取用户 ID
   * @returns {string} 用户 ID
   */
  getUserId() {
    try {
      if (window.utools && window.utools.dbStorage) {
        let userId = window.utools.dbStorage.getItem('analytics_user_id')
        if (!userId) {
          userId = this.generateUserId()
          window.utools.dbStorage.setItem('analytics_user_id', userId)
        }
        return userId
      }
      return this.generateUserId()
    } catch (error) {
      return this.generateUserId()
    }
  }

  /**
   * 生成用户 ID
   * @returns {string} 用户 ID
   */
  generateUserId() {
    return `user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  }

  /**
   * 生成会话 ID
   * @returns {string} 会话 ID
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  }

  /**
   * 刷新会话 ID
   */
  refreshSession() {
    this.sessionId = this.generateSessionId()
    if (DEBUG_MODE) {
      console.log('[Analytics] 会话已刷新:', this.sessionId)
    }
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      totalEvents: this.eventQueue.length,
      highPriority: this.highPriorityQueue.length,
      mediumPriority: this.mediumPriorityQueue.length,
      lowPriority: this.lowPriorityQueue.length,
      userId: this.userId,
      sessionId: this.sessionId,
      isInitialized: this.isInitialized
    }
  }

  /**
   * 销毁收集器
   */
  async destroy() {
    // 上传剩余事件
    await this.uploadAllEvents()

    // 停止定时器
    this.stopUploadTimer()

    // 记录应用关闭事件
    this.track('app_close', {
      session_id: this.sessionId,
      session_duration: Date.now() - parseInt(this.sessionId.split('_')[1])
    })

    // 最后上传一次
    await this.uploadAllEvents()

    this.isInitialized = false

    if (DEBUG_MODE) {
      console.log('[Analytics] 收集器已销毁')
    }
  }
}

// 创建单例实例
export const analyticsCollector = new AnalyticsCollector()

// 导出便捷函数
export function initAnalytics(options) {
  return analyticsCollector.initialize(options)
}

export function trackEvent(type, data) {
  if (DEBUG_MODE) {
    console.log(`[Analytics] 📝 trackEvent 被调用: ${type}`, data)
  }
  analyticsCollector.track(type, data)
}

export function getAnalyticsStats() {
  return analyticsCollector.getStats()
}

export function destroyAnalytics() {
  return analyticsCollector.destroy()
}

export default analyticsCollector
