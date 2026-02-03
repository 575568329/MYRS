/**
 * Pantry 客户端封装
 * 提供与 Pantry API 交互的接口
 * 文档: https://documenter.getpostman.com/view/3281832/SzmZeMLC
 */

import { PANTRY_CONFIG, RETRY_CONFIG, DEBUG } from '../../config/pantryConfig.js'

// 从环境变量读取调试模式
const DEBUG_MODE = import.meta.env.VITE_DEBUG_MODE === 'true' || DEBUG.ENABLED

/**
 * Pantry 客户端类
 */
export class PantryClient {
  constructor() {
    this.baseUrl = PANTRY_CONFIG.BASE_URL
    this.key = PANTRY_CONFIG.KEY
    this.isInitialized = false
    this.uploadRecords = this.loadUploadRecords()
  }

  /**
   * 初始化客户端
   * @param {Object} options - 初始化选项
   * @returns {Promise<boolean>} 是否成功初始化
   */
  async initialize(options = {}) {
    if (this.isInitialized) {
      if (DEBUG_MODE) console.log('[Pantry] 客户端已初始化')
      return true
    }

    try {
      // 检查是否配置了 Pantry Key
      const key = options.key || this.key || this.loadPantryKey()

      if (!key || key === 'YOUR_PANTRY_KEY_HERE') {
        console.warn('[Pantry] ⚠️ 未配置 Pantry Key')
        console.warn('[Pantry] 请访问 https://getpantry.cloud 注册获取免费的 Pantry Key')
        console.warn('[Pantry] 获取后设置环境变量 VITE_PANTRY_KEY 或在配置文件中设置')
        this.isInitialized = false
        return false
      }

      this.key = key
      this.isInitialized = true

      // 测试连接
      await this.testConnection()

      if (DEBUG_MODE) {
        console.log('[Pantry] ✅ 客户端初始化成功')
        console.log('[Pantry] Pantry Key:', this.key.substring(0, 10) + '...')
      }

      return true
    } catch (error) {
      console.error('[Pantry] ❌ 客户端初始化失败:', error.message)
      this.isInitialized = false
      return false
    }
  }

  /**
   * 测试连接
   */
  async testConnection() {
    try {
      const response = await this.getPantry()
      if (DEBUG_MODE) {
        console.log('[Pantry] 连接测试成功')
      }
      return true
    } catch (error) {
      if (DEBUG_MODE) {
        console.log('[Pantry] 连接测试失败（可能是新的 Pantry Key）:', error.message)
      }
      // 新的 Pantry Key 返回 404 是正常的
      return true
    }
  }

  /**
   * 获取完整的 Pantry 信息
   * GET https://getpantry.cloud/apiv1/pantry/{key}
   */
  async getPantry() {
    const url = `${this.baseUrl}/pantry/${this.key}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok && response.status !== 404) {
      throw new Error(`获取 Pantry 信息失败: ${response.status}`)
    }

    return await response.json()
  }

  /**
   * 获取指定 Basket 的数据
   * GET https://getpantry.cloud/apiv1/pantry/{key}/basket/{basketName}
   * @param {string} basketName - Basket 名称
   */
  async getBasket(basketName) {
    const url = `${this.baseUrl}/pantry/${this.key}/basket/${basketName}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok && response.status !== 404) {
      throw new Error(`获取 Basket 失败: ${response.status}`)
    }

    return await response.json()
  }

  /**
   * 更新 Basket 数据
   * POST https://getpantry.cloud/apiv1/pantry/{key}/basket/{basketName}
   * @param {string} basketName - Basket 名称
   * @param {Object} data - 要存储的 JSON 数据
   * @param {Object} options - 选项
   */
  async updateBasket(basketName, data, options = {}) {
    const { merge = true, skipGetOn429 = false } = options

    let finalData = data

    // 如果启用合并，先获取现有数据再合并
    if (merge) {
      try {
        // 如果之前遇到 429 错误，跳过 GET 请求直接 POST
        if (!skipGetOn429) {
          const existing = await this.getBasket(basketName)

          if (typeof existing === 'object' && typeof data === 'object') {
            if (Array.isArray(existing) && Array.isArray(data)) {
              // 如果都是数组，直接追加
              finalData = [...existing, ...data]
              if (DEBUG_MODE) {
                console.log(`[Pantry] 🔀 合并数组数据: ${existing.length} + ${data.length} = ${finalData.length}`)
              }
            } else if (Array.isArray(data)) {
              // 如果新数据是数组，添加到现有对象的 events 字段
              const existingEvents = existing.events || []
              finalData = {
                ...existing,
                events: [...existingEvents, ...data]
              }
              if (DEBUG_MODE) {
                console.log(`[Pantry] 🔀 追加 events 到对象: ${existingEvents.length} + ${data.length} = ${finalData.events.length}`)
              }
            } else if (existing.events && data.events && Array.isArray(existing.events) && Array.isArray(data.events)) {
              // 特殊处理：如果两个对象都有 events 数组字段，合并它们
              const existingCount = existing.events.length
              const newCount = data.events.length
              finalData = {
                ...existing,
                ...data,
                events: [...existing.events, ...data.events]
              }
              if (DEBUG_MODE) {
                console.log(`[Pantry] 🔀 合并 events 字段: ${existingCount} + ${newCount} = ${finalData.events.length}`)
              }
            } else {
              // 否则合并对象
              finalData = { ...existing, ...data }
              if (DEBUG_MODE) {
                console.log('[Pantry] 🔀 合并对象数据')
              }
            }
          }
        } else {
          if (DEBUG_MODE) {
            console.log('[Pantry] ⏭️ 跳过 GET 请求，直接使用 POST（避免速率限制）')
          }
        }
      } catch (error) {
        if (DEBUG_MODE) {
          console.log('[Pantry] Basket 不存在或获取失败，将创建新 Basket:', error.message)
        }
        // Basket 不存在，直接使用新数据
        finalData = data
      }
    }

    const url = `${this.baseUrl}/pantry/${this.key}/basket/${basketName}`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(finalData)
    })

    if (!response.ok) {
      throw new Error(`更新 Basket 失败: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()

    if (DEBUG_MODE) {
      console.log('[Pantry] ✅ Basket 更新成功:', basketName)
    }

    return result
  }

  /**
   * 上传埋点事件数据
   * @param {Array} events - 事件数组
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async uploadAnalyticsData(events) {
    if (!events || events.length === 0) {
      return { success: false, error: '没有数据可上传' }
    }

    if (!this.isInitialized) {
      return { success: false, error: '客户端未初始化' }
    }

    let retries = 0
    let skipGetOn429 = false // 遇到 429 后跳过 GET 请求

    while (retries < RETRY_CONFIG.MAX_RETRIES) {
      try {
        if (DEBUG_MODE) {
          console.log(`[Pantry] 🚀 准备上传 ${events.length} 个埋点事件到 basket "${PANTRY_CONFIG.BASKET.ANALYTICS}"`)
          console.log(`[Pantry] 📦 事件类型统计:`, this.getEventTypesSummary(events))

          // 检查第一个事件的完整性
          if (events.length > 0) {
            const firstEvent = events[0]
            console.log(`[Pantry] 🔍 第一个事件样本:`, {
              type: firstEvent.type,
              timestamp: firstEvent.timestamp,
              priority: firstEvent.priority,
              hasData: !!firstEvent.data,
              dataKeys: firstEvent.data ? Object.keys(firstEvent.data) : [],
              data: firstEvent.data
            })
          }
        }

        // 准备数据 - 只上传 events 数组，不需要额外的元数据
        const data = { events }

        // 上传到 analytics basket（会自动合并现有数据）
        const result = await this.updateBasket(
          PANTRY_CONFIG.BASKET.ANALYTICS,
          data,
          { merge: true, skipGetOn429 }
        )

        if (DEBUG_MODE) {
          console.log('[Pantry] ✅ 埋点数据上传成功')
          if (result && result.events) {
            console.log(`[Pantry] 📊 Pantry 中当前总事件数: ${result.events.length}`)
          }
        }

        // 记录上传
        this.recordUpload({
          type: 'analytics',
          basket: PANTRY_CONFIG.BASKET.ANALYTICS,
          eventCount: events.length,
          timestamp: Date.now()
        })

        return { success: true }
      } catch (error) {
        retries++

        // 检查是否是 429 错误
        const isRateLimited = error.message.includes('429')

        let delay
        if (isRateLimited) {
          // 429 错误使用更长的延迟：5秒、10秒、20秒
          delay = 5000 * Math.pow(2, retries - 1)
          skipGetOn429 = true // 后续重试跳过 GET
          console.warn(`[Pantry] ⚠️ API 速率限制 (429)，第 ${retries} 次重试，${delay}ms 后重试`)
        } else {
          // 其他错误使用正常延迟
          delay = RETRY_CONFIG.RETRY_DELAY * Math.pow(RETRY_CONFIG.BACKOFF_FACTOR, retries - 1)
          console.warn(`[Pantry] ❌ 上传失败，第 ${retries} 次重试，${delay}ms 后重试:`, error.message)
        }

        if (retries < RETRY_CONFIG.MAX_RETRIES) {
          await this.sleep(delay)
        } else {
          return { success: false, error: error.message }
        }
      }
    }
  }

  /**
   * 获取事件类型统计摘要
   * @param {Array} events - 事件数组
   * @returns {Object} 事件类型统计
   */
  getEventTypesSummary(events) {
    const summary = {}
    events.forEach(event => {
      const type = event.type || 'unknown'
      summary[type] = (summary[type] || 0) + 1
    })
    return summary
  }

  /**
   * 获取所有埋点数据
   * @returns {Promise<Object>} 埋点数据
   */
  async getAnalyticsData() {
    try {
      const data = await this.getBasket(PANTRY_CONFIG.BASKET.ANALYTICS)
      return data
    } catch (error) {
      console.error('[Pantry] 获取埋点数据失败:', error)
      return null
    }
  }

  /**
   * 清空 Basket 数据
   * @param {string} basketName - Basket 名称
   */
  async clearBasket(basketName) {
    try {
      await this.updateBasket(basketName, {}, { merge: false })
      if (DEBUG_MODE) {
        console.log('[Pantry] ✅ Basket 已清空:', basketName)
      }
      return { success: true }
    } catch (error) {
      console.error('[Pantry] 清空 Basket 失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 记录上传信息
   * @param {Object} record - 上传记录
   */
  recordUpload(record) {
    this.uploadRecords.push(record)
    this.saveUploadRecords()

    if (DEBUG.LOG_UPLOAD) {
      console.log('[Pantry] 记录上传:', record)
    }
  }

  /**
   * 获取上传记录
   * @returns {Array} 上传记录数组
   */
  getUploadRecords() {
    return this.uploadRecords
  }

  /**
   * 加载上传记录
   * @returns {Array} 上传记录数组
   */
  loadUploadRecords() {
    try {
      if (window.utools && window.utools.dbStorage) {
        const saved = window.utools.dbStorage.getItem('upload_records')
        return saved ? JSON.parse(saved) : []
      }
      return []
    } catch (error) {
      console.warn('[Pantry] 加载上传记录失败:', error)
      return []
    }
  }

  /**
   * 保存上传记录
   */
  saveUploadRecords() {
    try {
      if (window.utools && window.utools.dbStorage) {
        window.utools.dbStorage.setItem(
          'upload_records',
          JSON.stringify(this.uploadRecords)
        )
      }
    } catch (error) {
      console.warn('[Pantry] 保存上传记录失败:', error)
    }
  }

  /**
   * 加载 Pantry Key
   * @returns {string|null} Pantry Key
   */
  loadPantryKey() {
    try {
      // 优先从环境变量读取
      if (import.meta.env.VITE_PANTRY_KEY) {
        return import.meta.env.VITE_PANTRY_KEY
      }

      // 其次从本地存储读取
      if (window.utools && window.utools.dbStorage) {
        return window.utools.dbStorage.getItem('pantry_key')
      }

      return null
    } catch (error) {
      console.warn('[Pantry] 加载 Pantry Key 失败:', error)
      return null
    }
  }

  /**
   * 保存 Pantry Key
   * @param {string} key - Pantry Key
   */
  savePantryKey(key) {
    try {
      if (window.utools && window.utools.dbStorage) {
        window.utools.dbStorage.setItem('pantry_key', key)
      }
    } catch (error) {
      console.warn('[Pantry] 保存 Pantry Key 失败:', error)
    }
  }

  /**
   * 睡眠指定时间
   * @param {number} ms - 毫秒
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 检查客户端是否已初始化
   * @returns {boolean}
   */
  isReady() {
    return this.isInitialized
  }
}

// 创建单例实例
export const pantryClient = new PantryClient()

export default pantryClient
