/**
 * 追书神器 API
 * 需要通过 CORS 代理访问
 */
import { retryRequest } from '../../utils/requestHelper.js'
import { API } from '../../config.js'

// CORS 代理列表（按优先级排序）
const PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
  'https://api.codetabs.com/v1/proxy?quest='
]

/**
 * 获取追书神器小说排行榜
 * @param {number} page - 页码
 * @param {number} pageSize - 每页数量
 * @returns {Promise<Object>} 小说排行榜数据
 */
export async function getZhuishuData(page, pageSize) {
  return await retryRequest(
    () => fetchZhuishuWithProxy(page, pageSize),
    {
      retries: 2,
      delay: 2000,
      shouldRetry: () => true // 总是尝试重试（使用不同的代理）
    }
  )
}

/**
 * 使用代理获取追书神器数据
 * @param {number} page - 页码
 * @param {number} pageSize - 每页数量
 * @returns {Promise<Object>} 小说数据
 */
async function fetchZhuishuWithProxy(page, pageSize) {
  const targetUrl = 'http://zhuishushenqi.com/ranking'
  const timeout = API.PLATFORM_TIMEOUT['zhuishu'] || 20000

  // 尝试每个代理
  for (let i = 0; i < PROXIES.length; i++) {
    const proxyUrl = PROXIES[i]
    const fullUrl = proxyUrl + encodeURIComponent(targetUrl)

    try {
      const result = await fetchWithTimeout(fullUrl, timeout)

      if (!result.html || result.html.length < 100) {
        continue
      }

      const books = parseZhuishuHTML(result.html)

      if (!books || books.length === 0) {
        continue
      }

      console.log(`✅ 代理 ${i + 1} 成功获取 ${books.length} 本小说`)

      // 分页处理
      const start = (page - 1) * pageSize
      const end = start + pageSize
      const paginatedData = books.slice(start, end)

      return {
        data: paginatedData,
        total: books.length,
        hasMore: end < books.length
      }
    } catch (error) {
      console.warn(`⚠️ 代理 ${i + 1} 请求失败:`, error.message)

      if (i === PROXIES.length - 1) {
        throw new Error('请求超时')
      }
    }
  }

  throw new Error('请求超时')
}

/**
 * 带超时的请求
 * @param {string} url - 请求URL
 * @param {number} timeout - 超时时间
 * @returns {Promise<Object>} { html, status }
 */
async function fetchWithTimeout(url, timeout) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const html = await response.text()
    return { html, status: response.status }
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

/**
 * 解析追书神器 HTML 提取小说数据
 * @param {string} html - HTML文本
 * @returns {Array} 小说列表
 */
function parseZhuishuHTML(html) {
  const books = []

  // 匹配每本书的信息
  const bookRegex = /<a\s+href="\/book\/([^"]+)"\s+class="book"\s+target="_blank">([\s\S]*?)<\/a>/g
  let match

  while ((match = bookRegex.exec(html)) !== null) {
    const bookHtml = match[0]
    const bookId = match[1]

    // 提取书名
    const titleMatch = /<h4\s+class="name">\s*<span>([^<]+)<\/span>\s*<\/h4>/.exec(bookHtml)
    const title = titleMatch ? titleMatch[1].trim() : ''

    // 提取作者
    const authorMatch = /<p\s+class="author">\s*<span>([^<]+)<\/span>\s*<\/p>/.exec(bookHtml)
    const author = authorMatch ? authorMatch[1].trim() : ''

    // 提取描述
    const descMatch = /<p\s+class="desc">([^<]*)<\/p>/.exec(bookHtml)
    const desc = descMatch ? descMatch[1].trim() : ''

    // 提取人气值
    const popularityMatch = /<p\s+class="popularity">([\s\S]*?)<\/p>/.exec(bookHtml)
    let hot = ''
    if (popularityMatch) {
      const hotMatch = /<span\s+class="c-red">([^<]+)<\/span>/.exec(popularityMatch[1])
      hot = hotMatch ? hotMatch[1].trim() : ''
    }

    if (title) {
      books.push({
        index: books.length + 1,
        title,
        desc: `${author} · ${desc}`,
        url: `http://zhuishushenqi.com/book/${bookId}`,
        hot
      })
    }
  }

  return books
}
