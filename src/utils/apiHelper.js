/**
 * API 请求通用工具
 * 抽象通用的请求逻辑，减少代码重复
 */

import { API } from '../config.js'
import cacheManager from './cacheManager.js'

/**
 * 通用请求错误类
 */
export class ApiError extends Error {
  constructor(message, code, details) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.details = details
  }
}

/**
 * 带重试和超时的通用请求函数
 * @param {string} url - 请求URL
 * @param {Object} options - 请求选项
 * @param {number} options.timeout - 超时时间（毫秒）
 * @param {number} options.retries - 重试次数
 * @param {Function} options.transform - 数据转换函数
 * @param {Object} options.headers - 请求头
 * @returns {Promise<any>} 响应数据
 */
export async function fetchWithTimeout(url, options = {}) {
  const {
    timeout = API.REQUEST_TIMEOUT,
    transform = null,
    headers = { 'Content-Type': 'application/json' },
    method = 'GET'
  } = options

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      method,
      headers,
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new ApiError(
        `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        { url }
      )
    }

    const data = await response.json()

    return transform ? transform(data) : data
  } catch (error) {
    clearTimeout(timeoutId)

    // 处理不同类型的错误
    if (error.name === 'AbortError') {
      throw new ApiError('请求超时', 'TIMEOUT', { url, timeout })
    } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      throw new ApiError('网络请求失败，请检查网络连接', 'NETWORK_ERROR', { url })
    } else if (error instanceof ApiError) {
      throw error
    } else {
      throw new ApiError(error.message || '未知错误', 'UNKNOWN', { url })
    }
  }
}

/**
 * 带缓存的请求函数
 * @param {string} platformId - 平台ID
 * @param {string} cacheKey - 缓存键
 * @param {Function} fetchFn - 数据获取函数
 * @param {Object} options - 选项
 * @param {number} options.ttl - 缓存时间（毫秒）
 * @param {number} options.throttle - 请求节流时间（毫秒）
 * @returns {Promise<any>} 数据
 */
export async function fetchWithCache(platformId, cacheKey, fetchFn, options = {}) {
  const { ttl = 60 * 60 * 1000, throttle = 1000 } = options

  // 1. 检查缓存
  const cachedData = cacheManager.get(platformId, cacheKey)
  if (cachedData) {
    console.log(`📦 [缓存命中] ${platformId} - ${cacheKey}`)
    return cachedData
  }

  // 2. 请求节流检查
  if (!cacheManager.canRequest(platformId, throttle)) {
    throw new ApiError('请求过于频繁，请稍后再试', 'THROTTLE', { platformId })
  }

  // 3. 防重复请求
  return cacheManager.deduplicateRequest(`${platformId}_${cacheKey}`, async () => {
    const data = await fetchFn()

    // 4. 写入缓存
    cacheManager.set(platformId, cacheKey, data, ttl)

    return data
  })
}

/**
 * 分页数据处理器
 * @param {Array} data - 原始数据数组
 * @param {number} page - 当前页码
 * @param {number} pageSize - 每页大小
 * @param {Function} transform - 数据转换函数
 * @returns {Object} 分页结果
 */
export function paginateData(data, page, pageSize, transform = null) {
  const start = (page - 1) * pageSize
  const end = start + pageSize
  const paginatedData = data.slice(start, end)

  const result = {
    data: transform ? paginatedData.map(transform) : paginatedData,
    total: data.length,
    hasMore: end < data.length
  }

  return result
}

/**
 * 批量并发请求处理器
 * @param {Array} items - 待请求的项目列表
 * @param {Function} requestFn - 请求函数（接收单个item作为参数）
 * @param {Object} options - 选项
 * @param {number} options.concurrency - 并发数
 * @param {number} options.timeout - 单个请求超时时间
 * @returns {Promise<Array>} 请求结果数组
 */
export async function batchRequest(items, requestFn, options = {}) {
  const { concurrency = 5, timeout = 5000 } = options
  const results = []
  const errors = []

  // 分批处理
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency)

    const batchPromises = batch.map(async (item, index) => {
      try {
        const result = await Promise.race([
          requestFn(item),
          new Promise((_, reject) =>
            setTimeout(() => reject(new ApiError('请求超时', 'TIMEOUT')), timeout)
          )
        ])
        return { success: true, data: result, index: i + index }
      } catch (error) {
        return { success: false, error, index: i + index }
      }
    })

    const batchResults = await Promise.all(batchPromises)

    batchResults.forEach(result => {
      if (result.success) {
        results.push(result.data)
      } else {
        errors.push(result.error)
        results.push(null) // 保持索引对应
      }
    })
  }

  return { results, errors }
}

/**
 * 数据去重工具
 * @param {Array} data - 数据数组
 * @param {string|Function} key - 去重键或函数
 * @returns {Array} 去重后的数组
 */
export function deduplicateData(data, key) {
  const seen = new Set()

  return data.filter(item => {
    const duplicateKey = typeof key === 'function' ? key(item) : item[key]

    if (seen.has(duplicateKey)) {
      return false
    }

    seen.add(duplicateKey)
    return true
  })
}

/**
 * HTML 解析工具 - 用于追书神器
 * @param {string} html - HTML字符串
 * @param {RegExp} pattern - 匹配模式
 * @param {Function} extractor - 提取函数
 * @returns {Array} 解析结果
 */
export function parseHTML(html, pattern, extractor) {
  const results = []
  let match

  while ((match = pattern.exec(html)) !== null) {
    const extracted = extractor(match, results.length)
    if (extracted) {
      results.push(extracted)
    }
  }

  return results
}

/**
 * 预加载下一页数据
 * @param {string} platformId - 平台ID
 * @param {number} nextPage - 下一页页码
 * @param {number} pageSize - 每页大小
 * @param {Function} fetchFn - 数据获取函数
 * @param {number} ttl - 缓存时间
 * @param {number} delay - 延迟时间（毫秒）
 */
export function preloadNextPage(platformId, nextPage, pageSize, fetchFn, ttl, delay = 500) {
  const nextPageKey = `page_${nextPage}`

  if (cacheManager.get(platformId, nextPageKey)) {
    console.log(`⏭️ [预加载] 第 ${nextPage} 页已缓存`)
    return
  }

  setTimeout(async () => {
    try {
      const data = await fetchFn(nextPage, pageSize)
      cacheManager.set(platformId, nextPageKey, data, ttl)
      console.log(`🚀 [预加载] 第 ${nextPage} 页完成`)
    } catch (error) {
      console.warn(`⚠️ [预加载失败] 第 ${nextPage} 页:`, error.message)
    }
  }, delay)
}

/**
 * 格式化错误消息
 * @param {Error} error - 错误对象
 * @returns {string} 用户友好的错误消息
 */
export function formatErrorMessage(error) {
  if (error instanceof ApiError) {
    return error.message
  }

  if (error.name === 'AbortError' || error.code === 'TIMEOUT') {
    return '请求超时，请稍后重试'
  }

  if (error.message.includes('CORS')) {
    return '跨域请求被阻止（建议在uTools中使用）'
  }

  return error.message || '发生未知错误，请稍后重试'
}
