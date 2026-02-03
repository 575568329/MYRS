/**
 * 通用热搜 API
 * 支持 uapis.cn 和 imsyy.com 两个数据源
 */
import { retryRequest, shouldRetryError } from '../../utils/requestHelper.js'
import { API } from '../../config.js'

// uapis.cn 支持的平台列表
const UAPIS_PLATFORMS = [
  'baidu', 'weibo', 'zhihu', 'douyin', 'bilibili', 'kuaishou',
  'toutiao', 'tieba', 'hupu', 'douban-movie', 'douban-group', 'juejin', 'jianshu',
  'ithome', 'ithome-xijiayi', '36kr', 'csdn', 'v2ex', 'sspai', 'coolapk',
  'thepaper', 'qq-news', 'sina', 'sina-news', 'netease-news', 'huxiu', 'ifanr',
  'acfun', 'genshin', 'honkai', 'starrail', 'lol', 'guokr', '51cto',
  'nodeseek', '52pojie', 'hostloc', 'weread', 'hellogithub', 'zhihu-daily'
]

/**
 * 获取热搜数据
 * @param {string} platformId - 平台ID
 * @param {number} page - 页码
 * @param {number} pageSize - 每页数量
 * @returns {Promise<Object>} 热搜数据
 */
export async function getHotBoardData(platformId, page = 1, pageSize = 50) {
  // 选择 API 源
  const apiUrl = UAPIS_PLATFORMS.includes(platformId)
    ? `https://uapis.cn/api/v1/misc/hotboard?type=${platformId}`
    : `https://api-hot.imsyy.com/${platformId}?cache=true`

  return await retryRequest(
    () => fetchHotBoard(apiUrl, page, pageSize),
    {
      retries: 3,
      delay: 1000,
      shouldRetry: shouldRetryError
    }
  )
}

/**
 * 获取热搜数据（具体实现）
 * @param {string} apiUrl - API地址
 * @param {number} page - 页码
 * @param {number} pageSize - 每页数量
 * @returns {Promise<Object>} 热搜数据
 */
async function fetchHotBoard(apiUrl, page, pageSize) {
  const timeout = API.REQUEST_TIMEOUT || 5000
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()

    // 处理不同 API 的返回格式
    let hotList = []

    // uapis.cn 新格式: { type: "...", list: [...], update_time: "..." }
    if (data.list && Array.isArray(data.list)) {
      hotList = data.list.map(item => ({
        index: item.index,
        title: item.title,
        desc: item.extra?.desc || '',
        img: item.extra?.img || '',
        url: item.url || '',
        hot: item.hot_value || ''
      }))
    }
    // uapis.cn 旧格式: { code: 200, data: [...], message: "success" }
    else if (data.code === 200 && Array.isArray(data.data)) {
      hotList = data.data
    }
    // imsyy.top 格式: { data: [...], success: true }
    else if (data && data.data && Array.isArray(data.data)) {
      hotList = data.data
    } else {
      throw new Error('API 返回数据格式不正确')
    }

    // 简单分页处理
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const paginatedData = hotList.slice(start, end)

    return {
      data: paginatedData,
      total: hotList.length,
      hasMore: end < hotList.length
    }
  } catch (error) {
    clearTimeout(timeoutId)

    if (error.name === 'AbortError') {
      throw new Error('请求超时')
    }

    if (error.message.includes('Failed to fetch')) {
      throw new Error('网络请求失败，请检查网络连接')
    }

    throw error
  }
}

/**
 * 检查平台是否支持
 * @param {string} platformId - 平台ID
 * @returns {boolean} 是否支持
 */
export function isPlatformSupported(platformId) {
  return UAPIS_PLATFORMS.includes(platformId)
}
