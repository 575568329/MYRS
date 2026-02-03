/**
 * 芝加哥艺术学院 API
 * https://api.artic.edu/docs/
 */
import { retryRequest, shouldRetryError } from '../../utils/requestHelper.js'
import cacheManager from '../../utils/cacheManager.js'
import { API } from '../../config.js'

const CACHE_TTL = 60 * 60 * 1000 // 1小时

/**
 * 获取芝加哥艺术学院艺术品数据
 * @param {number} page - 页码
 * @param {number} pageSize - 每页数量
 * @returns {Promise<Object>} 艺术品数据
 */
export async function getArticData(page, pageSize) {
  const cacheKey = `page_${page}`

  // 1. 检查缓存
  const cachedData = cacheManager.get('artic', cacheKey)
  if (cachedData) {
    // 检查是否包含旧数据
    const hasOldData = cachedData.data?.some(item =>
      item.img && item.img.includes('www.artic.edu/iiif')
    )

    if (hasOldData) {
      cacheManager.clearPlatform('artic')
    } else {
      console.log(`📦 [缓存命中] 芝加哥艺术学院第 ${page} 页`)
      return cachedData
    }
  }

  // 2. 请求节流
  if (!cacheManager.canRequest('artic', 1000)) {
    throw new Error('请求过于频繁，请稍后再试')
  }

  // 3. 防重复请求
  return cacheManager.deduplicateRequest(`artic_${cacheKey}`, async () => {
    return await retryRequest(
      () => fetchArticPage(page, pageSize),
      {
        retries: 3,
        delay: 1000,
        shouldRetry: shouldRetryError
      }
    )
  })
}

/**
 * 获取指定页码的艺术品数据
 * @param {number} page - 页码
 * @param {number} pageSize - 每页数量
 * @returns {Promise<Object>} 艺术品数据
 */
async function fetchArticPage(page, pageSize) {
  const timeout = API.PLATFORM_TIMEOUT['artic'] || 10000
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const apiUrl = 'https://api.artic.edu/api/v1/artworks'
    const params = new URLSearchParams({
      limit: Math.min(pageSize * 2, 100).toString(),
      page: page.toString(),
      fields: 'id,title,image_id,artist_display,date_display,medium_display,place_of_origin,dimensions,iiif_url,thumbnail',
      query: JSON.stringify({
        term: { is_public_domain: true }
      })
    })

    const response = await fetch(`${apiUrl}?${params}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const result = await response.json()
    const artworks = result.data || []
    const config = result.config || {}
    const iiifBaseUrl = config.iiif_url

    // 转换数据格式
    const transformedList = artworks
      .filter(artwork => artwork.image_id)
      .map((artwork, index) => {
        const imageUrl = `${iiifBaseUrl}/${artwork.image_id}/full/843,/0/default.jpg`
        const descParts = [
          artwork.artist_display,
          artwork.date_display,
          artwork.medium_display,
          artwork.place_of_origin
        ].filter(Boolean)

        return {
          id: artwork.id,
          index: (page - 1) * pageSize + index + 1,
          title: artwork.title || 'Untitled',
          desc: descParts.join(' · '),
          img: imageUrl,
          url: `https://www.artic.edu/artworks/${artwork.id}/${encodeURIComponent(artwork.title || 'Untitled').toLowerCase().replace(/\s+/g, '-')}`,
          hot: ''
        }
      })

    const total = result.pagination?.total || transformedList.length
    const hasMore = page * pageSize < total

    // 只返回当前页数据
    const paginatedList = transformedList.slice(0, pageSize)

    const resultData = {
      data: paginatedList,
      total,
      hasMore
    }

    // 缓存数据
    cacheManager.set('artic', cacheKey, resultData, CACHE_TTL)

    // 预加载下一页（仅在前3页）
    if (page < 3) {
      preloadNextPage(page + 1, pageSize)
    }

    return resultData
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
 * 预加载下一页数据
 * @param {number} page - 页码
 * @param {number} pageSize - 每页数量
 */
function preloadNextPage(page, pageSize) {
  const nextPageKey = `page_${page}`

  if (cacheManager.get('artic', nextPageKey)) {
    return
  }

  setTimeout(async () => {
    try {
      const nextPageData = await fetchArticPage(page, pageSize)
      cacheManager.set('artic', nextPageKey, nextPageData, CACHE_TTL)
      console.log(`🚀 [预加载] 第 ${page} 页`)
    } catch (error) {
      console.warn(`⚠️ [预加载失败] 第 ${page} 页:`, error.message)
    }
  }, 500)
}
