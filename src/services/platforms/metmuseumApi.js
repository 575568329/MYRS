/**
 * 大都会博物馆 API
 * https://collectionapi.metmuseum.org/public/collection/v1
 */
import { retryRequest, shouldRetryError, concurrentRequest } from '../../utils/requestHelper.js'
import { API } from '../../config.js'

/**
 * 获取大都会博物馆艺术品数据
 * @param {number} page - 页码
 * @param {number} pageSize - 每页数量
 * @param {Object} options - 额外选项
 * @param {string} options.geoLocation - 地理位置筛选
 * @returns {Promise<Object>} 艺术品数据
 */
export async function getMetMuseumData(page, pageSize, options = {}) {
  const { geoLocation } = options

  return await retryRequest(
    () => fetchMetMuseumPage(page, pageSize, geoLocation),
    {
      retries: 2,
      delay: 1000,
      shouldRetry: shouldRetryError
    }
  )
}

/**
 * 获取指定页的艺术品数据
 * @param {number} page - 页码
 * @param {number} pageSize - 每页数量
 * @param {string} geoLocation - 地理位置筛选
 * @returns {Promise<Object>} 艺术品数据
 */
async function fetchMetMuseumPage(page, pageSize, geoLocation) {
  const timeout = API.PLATFORM_TIMEOUT['metmuseum'] || 15000
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    // 1. 搜索获取艺术品ID列表
    const searchParams = new URLSearchParams({
      q: '*',
      hasImages: 'true'
    })

    if (geoLocation) {
      searchParams.set('geoLocation', geoLocation)
    }

    const searchResponse = await fetch(
      `https://collectionapi.metmuseum.org/public/collection/v1/search?${searchParams}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      }
    )

    if (!searchResponse.ok) {
      throw new Error(`HTTP ${searchResponse.status}: ${searchResponse.statusText}`)
    }

    const searchResult = await searchResponse.json()
    const objectIds = searchResult.objectIDs || []
    const total = searchResult.total || 0

    // 2. 计算分页范围
    const start = (page - 1) * pageSize
    const end = Math.min(start + pageSize, objectIds.length)
    const pageObjectIds = objectIds.slice(start, end)

    if (pageObjectIds.length === 0) {
      return {
        data: [],
        total: 0,
        hasMore: false
      }
    }

    clearTimeout(timeoutId)

    // 3. 批量获取详情（并发控制）
    const artworkResults = await concurrentRequest(
      pageObjectIds.map((objectId, idx) => () =>
        fetchArtworkDetail(objectId, start + idx + 1)
      ),
      5 // 同时最多5个请求
    )

    // 4. 过滤有效数据
    let validArtworks = artworkResults.filter(artwork => artwork !== null)

    // 5. 去重（按标题）
    const seenTitles = new Set()
    const beforeDedupCount = validArtworks.length
    validArtworks = validArtworks.filter(artwork => {
      const title = artwork.title.toLowerCase().trim()
      if (seenTitles.has(title)) {
        return false
      }
      seenTitles.add(title)
      return true
    })

    const hasMore = end < objectIds.length

    return {
      data: validArtworks,
      total: objectIds.length,
      hasMore,
      dedupCount: beforeDedupCount - validArtworks.length
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
 * 获取单个艺术品详情
 * @param {number} objectId - 艺术品ID
 * @param {number} index - 索引
 * @returns {Promise<Object|null>} 艺术品详情
 */
async function fetchArtworkDetail(objectId, index) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)

  try {
    const response = await fetch(
      `https://collectionapi.metmuseum.org/public/collection/v1/objects/${objectId}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      }
    )

    clearTimeout(timeoutId)

    if (!response.ok) {
      return null
    }

    const artwork = await response.json()

    // 只返回有主图片且是公有领域的艺术品
    if (!artwork.primaryImage || !artwork.isPublicDomain) {
      return null
    }

    // 构建描述信息
    const descParts = [
      artwork.artistDisplayName,
      artwork.objectDate,
      artwork.country,
      artwork.medium,
      artwork.department,
      artwork.culture
    ].filter(Boolean)

    return {
      id: artwork.objectID,
      index,
      title: artwork.title || 'Untitled',
      desc: descParts.join(' · '),
      img: artwork.primaryImageSmall || artwork.primaryImage,
      url: artwork.objectURL || `https://www.metmuseum.org/art/collection/search/${artwork.objectID}`,
      hot: artwork.isHighlight ? '⭐ 精选' : ''
    }
  } catch (error) {
    clearTimeout(timeoutId)
    return null
  }
}
