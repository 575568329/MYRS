/**
 * 网络请求辅助工具
 * 包含重试、超时、取消等功能
 */

/**
 * 请求重试函数
 * @param {Function} fn - 需要重试的异步函数
 * @param {Object} options - 配置选项
 * @param {number} options.retries - 重试次数（默认3次）
 * @param {number} options.delay - 初始延迟时间（默认1000ms）
 * @param {number} options.backoff - 退避系数（默认2）
 * @param {Function} options.shouldRetry - 判断是否应该重试的函数
 * @returns {Promise} 请求结果
 */
export async function retryRequest(
  fn,
  { retries = 3, delay = 1000, backoff = 2, shouldRetry } = {}
) {
  let lastError

  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // 如果提供了 shouldRetry 函数且返回 false，则不再重试
      if (shouldRetry && !shouldRetry(error)) {
        throw error
      }

      // 如果是最后一次尝试，直接抛出错误
      if (i === retries - 1) {
        throw error
      }

      // 计算等待时间（指数退避）
      const waitTime = delay * Math.pow(backoff, i)

      console.warn(`请求失败，${waitTime}ms 后进行第 ${i + 1} 次重试...`, error.message)

      await new Promise((resolve) => setTimeout(resolve, waitTime))
    }
  }

  throw lastError
}

/**
 * 带超时的请求
 * @param {Function} fn - 异步函数
 * @param {number} timeout - 超时时间（毫秒）
 * @returns {Promise} 请求结果
 */
export function withTimeout(fn, timeout = 5000) {
  return Promise.race([
    fn(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('请求超时')), timeout)
    )
  ])
}

/**
 * 创建可取消的请求
 * @returns {Object} { request, cancel }
 */
export function createCancellableRequest() {
  let controller = null

  const request = async (url, options = {}) => {
    // 取消之前的请求
    if (controller) {
      controller.abort()
    }

    // 创建新的 AbortController
    controller = new AbortController()

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('请求已取消')
      }
      throw error
    } finally {
      controller = null
    }
  }

  const cancel = () => {
    if (controller) {
      controller.abort()
      controller = null
    }
  }

  return {
    request,
    cancel
  }
}

/**
 * 请求节流（防止短时间内重复请求）
 * @param {Function} fn - 需要节流的函数
 * @param {number} delay - 节流时间（毫秒）
 * @returns {Function} 节流后的函数
 */
export function throttleRequest(fn, delay = 500) {
  let lastCall = 0
  let timer = null
  let lastArgs = null

  return function (...args) {
    const now = Date.now()
    const timeSinceLastCall = now - lastCall

    // 保存最新的参数
    lastArgs = args

    // 如果距离上次调用时间超过延迟时间，立即执行
    if (timeSinceLastCall >= delay) {
      lastCall = now
      return fn.apply(this, args)
    }

    // 否则，在延迟时间后执行（使用最新的参数）
    if (timer) {
      clearTimeout(timer)
    }

    return new Promise((resolve) => {
      timer = setTimeout(async () => {
        lastCall = Date.now()
        try {
          const result = await fn.apply(this, lastArgs)
          resolve(result)
        } catch (error) {
          // 不在这里抛出错误，让调用者处理
          console.error('节流请求执行失败:', error)
        }
      }, delay - timeSinceLastCall)
    })
  }
}

/**
 * 请求防抖（在短时间内多次触发时，只执行最后一次）
 * @param {Function} fn - 需要防抖的函数
 * @param {number} delay - 防抖时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
export function debounceRequest(fn, delay = 300) {
  let timer = null

  return function (...args) {
    if (timer) {
      clearTimeout(timer)
    }

    return new Promise((resolve, reject) => {
      timer = setTimeout(async () => {
        try {
          const result = await fn.apply(this, args)
          resolve(result)
        } catch (error) {
          reject(error)
        }
      }, delay)
    })
  }
}

/**
 * 判断错误是否应该重试
 * @param {Error} error - 错误对象
 * @returns {boolean} 是否应该重试
 */
export function shouldRetryError(error) {
  // 网络错误可以重试
  if (
    error.message.includes('Failed to fetch') ||
    error.message.includes('NetworkError') ||
    error.message.includes('请求超时') ||
    error.name === 'AbortError'
  ) {
    return true
  }

  // HTTP 5xx 错误可以重试
  if (error.message.includes('HTTP 5')) {
    return true
  }

  // HTTP 4xx 错误（除了 429）不应重试
  if (error.message.includes('HTTP 4') && !error.message.includes('429')) {
    return false
  }

  // 其他错误默认不重试
  return false
}

/**
 * 并发请求控制（限制同时进行的请求数量）
 * @param {Array} tasks - 任务数组
 * @param {number} concurrency - 并发数
 * @returns {Promise} 所有任务的结果
 */
export async function concurrentRequest(tasks, concurrency = 3) {
  const results = []
  const executing = []

  for (const task of tasks) {
    const promise = task().then((result) => {
      executing.splice(executing.indexOf(promise), 1)
      return result
    })

    results.push(promise)
    executing.push(promise)

    if (executing.length >= concurrency) {
      await Promise.race(executing)
    }
  }

  return Promise.all(results)
}
