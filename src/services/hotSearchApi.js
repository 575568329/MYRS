/**
 * 热搜数据服务 API
 * 通过 uTools preload 脚本获取各平台热搜
 */

import { DISPLAY_MODE, API } from '../config.js'
import cacheManager from '../utils/cacheManager.js'

// 调试工具函数 - 只在 DEBUG 模式下输出日志
const debug = {
  log: (...args) => {
    if (API.DEBUG) {
      console.log(...args)
    }
  },
  warn: (...args) => {
    if (API.DEBUG) {
      console.warn(...args)
    }
  },
  error: (...args) => {
    // 错误日志始终显示
    console.error(...args)
  }
}


// 调试：验证 API 配置是否正确加载
debug.log('✅ API 配置已加载:', {
  REQUEST_TIMEOUT: API.REQUEST_TIMEOUT,
  MIN_REQUEST_INTERVAL: API.MIN_REQUEST_INTERVAL,
  PLATFORM_TIMEOUT: API.PLATFORM_TIMEOUT,
  DEBUG: API.DEBUG
})

// 支持的热搜平台配置
export const PLATFORMS = [
  // 视频/社区
  { id: 'bilibili', name: 'B站', icon: 'ri-bilibili-line', category: '视频' },
  { id: 'acfun', name: 'AcFun', icon: 'ri-movie-line', category: '视频' },
  { id: 'weibo', name: '微博', icon: 'ri-weibo-line', category: '社交' },
  { id: 'zhihu', name: '知乎', icon: 'ri-zhihu-line', category: '社交' },
  { id: 'zhihu-daily', name: '知乎日报', icon: 'ri-newspaper-line', category: '社交' },
  { id: 'douyin', name: '抖音', icon: 'ri-music-2-line', category: '视频' },
  { id: 'kuaishou', name: '快手', icon: 'ri-camera-lens-line', category: '视频' },
  { id: 'douban-movie', name: '豆瓣电影', icon: 'ri-movie-2-line', category: '娱乐' },
  { id: 'movie-box', name: '电影票房榜', icon: 'ri-film-line', category: '娱乐' },
  { id: 'douban-group', name: '豆瓣小组', icon: 'ri-team-line', category: '娱乐' },
  { id: 'tieba', name: '贴吧', icon: 'ri-group-line', category: '社交' },
  { id: 'hupu', name: '虎扑', icon: 'ri-basketball-line', category: '生活' },
  // { id: 'miyoushe', name: '米游社', icon: 'ri-game-line', category: '游戏' },
  { id: 'ngabbs', name: 'NGA', icon: 'ri-gamepad-line', category: '游戏' },
  { id: 'v2ex', name: 'V2EX', icon: 'ri-chat-smile-2-line', category: '科技' },
  { id: '52pojie', name: '吾爱破解', icon: 'ri-lock-2-line', category: '科技' },
  { id: 'hostloc', name: '主机交流', icon: 'ri-server-line', category: '科技' },
  { id: 'coolapk', name: '酷安', icon: 'ri-android-line', category: '科技' },

  // 新闻/资讯
  { id: 'baidu', name: '百度', icon: 'ri-search-2-line', category: '综合' },
  { id: '60s-news', name: '60秒早报', icon: 'ri-newspaper-line', category: '资讯' },
  { id: 'thepaper', name: '澎湃新闻', icon: 'ri-article-line', category: '资讯' },
  { id: 'toutiao', name: '今日头条', icon: 'ri-fire-line', category: '资讯' },
  { id: 'qq-news', name: '腾讯新闻', icon: 'ri-qq-line', category: '资讯' },
  { id: 'sina', name: '新浪热搜', icon: 'ri-rss-line', category: '资讯' },
  { id: 'sina-news', name: '新浪新闻', icon: 'ri-rss-line', category: '资讯' },
  { id: 'netease-news', name: '网易新闻', icon: 'ri-news-line', category: '资讯' },
  { id: 'huxiu', name: '虎嗅', icon: 'ri-lightbulb-line', category: '资讯' },
  { id: 'ifanr', name: '爱范儿', icon: 'ri-magic-line', category: '资讯' },

  // 技术/IT
  { id: 'sspai', name: '少数派', icon: 'ri-tools-line', category: '科技' },
  { id: 'ithome', name: 'IT之家', icon: 'ri-computer-line', category: '科技' },
  { id: 'ithome-xijiayi', name: 'IT之家·喜加一', icon: 'ri-gamepad-line', category: '科技' },
  { id: 'juejin', name: '掘金', icon: 'ri-code-s-slash-line', category: '科技' },
  { id: 'jianshu', name: '简书', icon: 'ri-quill-pen-line', category: '综合' },
  { id: 'guokr', name: '果壳', icon: 'ri-flask-line', category: '科技' },
  { id: '36kr', name: '36氪', icon: 'ri-money-dollar-circle-line', category: '科技' },
  { id: '51cto', name: '51CTO', icon: 'ri-terminal-line', category: '科技' },
  { id: 'csdn', name: 'CSDN', icon: 'ri-code-box-line', category: '科技' },
  { id: 'nodeseek', name: 'NodeSeek', icon: 'ri-nodejs-line', category: '科技' },

  // 游戏
  { id: 'lol', name: '英雄联盟', icon: 'ri-sword-line', category: '游戏' },
  { id: 'epic-free', name: 'Epic免费游戏', icon: 'ri-gamepad-line', category: '游戏' },
  { id: 'genshin', name: '原神', icon: 'ri-star-smile-line', category: '游戏' },
  { id: 'honkai', name: '崩坏3', icon: 'ri-planet-line', category: '游戏' },
  { id: 'starrail', name: '星穹铁道', icon: 'ri-rocket-line', category: '游戏' },

  // 金融/股票
  { id: 'stock-hot', name: '热门股票', icon: 'ri-stock-line', category: '金融' },
  { id: 'stock-sh', name: '上证指数', icon: 'ri-funds-line', category: '金融' },
  { id: 'stock-tech', name: '科技股', icon: 'ri-cpu-line', category: '金融' },

  // 其他
  { id: 'weread', name: '微信读书', icon: 'ri-book-read-line', category: '阅读' },
  { id: 'hellogithub', name: 'HelloGitHub', icon: 'ri-github-line', category: '科技' },
  { id: 'jianshu', name: '简书', icon: 'ri-quill-pen-line', category: '综合' },
  { id: 'zhuishu', name: '追书排行', icon: 'ri-bookmark-line', category: '阅读' },
  { id: 'artic', name: '芝加哥艺术学院', icon: 'ri-building-2-line', category: '艺术' },
  { id: 'metmuseum', name: '大都会博物馆', icon: 'ri-gallery-line', category: '艺术' }
]

/**
 * 获取极简模式的平台列表
 * @param {Array<string>} customOrder - 自定义平台ID顺序（可选）
 * @returns {Array} 平台列表
 */
export function getPlatformsByMode(customOrder = null) {
  // 如果提供了自定义顺序，使用自定义顺序
  if (customOrder && Array.isArray(customOrder) && customOrder.length > 0) {
    return customOrder.map(id => PLATFORMS.find(p => p.id === id)).filter(Boolean)
  }

  // 否则从配置文件读取极简模式的平台列表
  const platformIds = DISPLAY_MODE.SIMPLE_MODE_PLATFORMS

  // 过滤出对应的平台
  return PLATFORMS.filter(p => platformIds.includes(p.id))
}

/**
 * 获取指定平台的热搜数据
 * @param {string} platformId - 平台ID
 * @param {Object} options - 选项
 * @param {number} options.page - 页码（默认1）
 * @param {number} options.pageSize - 每页条数（默认50）
 * @param {string} options.geoLocation - 地理位置筛选（仅大都会博物馆使用，如 "China"）
 * @returns {Promise<Object>} 热搜数据列表
 */
export async function getHotData(platformId, options = {}) {
  const { page = 1, pageSize = 50, geoLocation } = options

  debug.log(`🌐 正在获取 ${platformId} 热搜数据...`)
  debug.log(`📄 第 ${page} 页，每页 ${pageSize} 条`)
  if (geoLocation) {
    debug.log(`🌍 地理位置: ${geoLocation}`)
  }
  debug.log(`🔧 运行环境: ${window.utools ? 'uTools' : '浏览器'}`)

  // 直接调用热搜 API（支持 uTools 和浏览器环境）
  return await getHotDataViaFetch(platformId, page, pageSize, geoLocation)
}

/**
 * 通过 fetch 获取数据（支持 uTools 和浏览器环境）
 * @param {string} platformId - 平台ID
 * @param {number} page - 页码
 * @param {number} pageSize - 每页数量
 * @param {string} geoLocation - 地理位置筛选（可选）
 * @returns {Promise<Object>} 热搜数据
 */
async function getHotDataViaFetch(platformId, page, pageSize, geoLocation) {
  // 特殊处理60秒早报
  if (platformId === '60s-news') {
    return await get60sNewsData(page, pageSize)
  }

  // 特殊处理电影票房榜
  if (platformId === 'movie-box') {
    return await getMovieBoxData(page, pageSize)
  }

  // 特殊处理追书神器（需要解析HTML）
  if (platformId === 'zhuishu') {
    return await getZhuishuData(page, pageSize)
  }

  // 特殊处理芝加哥艺术学院（艺术品API）
  if (platformId === 'artic') {
    return await getArticData(page, pageSize)
  }

  // 特殊处理大都会博物馆（艺术品API）
  if (platformId === 'metmuseum') {
    return await getMetMuseumData(page, pageSize, { geoLocation })
  }

  // 特殊处理 Epic 免费游戏
  if (platformId === 'epic-free') {
    return await getEpicFreeData(page, pageSize)
  }

  // 特殊处理股票平台
  if (platformId.startsWith('stock-')) {
    return await getStockData(platformId, page, pageSize)
  }

  // uapis.cn 支持的所有平台（根据官方文档）
  const uapisPlatforms = [
    'baidu', 'weibo', 'zhihu', 'douyin', 'bilibili', 'kuaishou',
    'toutiao', 'tieba', 'hupu', 'douban-movie', 'douban-group', 'juejin', 'jianshu',
    'ithome', 'ithome-xijiayi', 'csdn', 'v2ex', 'sspai', 'coolapk',
    'thepaper', 'qq-news', 'sina', 'sina-news', 'netease-news', 'huxiu', 'ifanr',
    'acfun', 'miyoushe', 'genshin', 'honkai', 'starrail', 'lol', 'guokr', '51cto',
    'nodeseek', '52pojie', 'hostloc', 'weread', 'hellogithub', 'zhihu-daily'
  ]

  // 使用 api-hot.imsyy.com 的平台
  const imsyyPlatforms = [
    '36kr'
  ]

  // 选择 API 源
  let apiUrl
  // Epic 免费游戏使用特殊端点
  if (platformId === 'epic-free') {
    apiUrl = `https://uapis.cn/api/v1/game/epic-free`
  } else if (uapisPlatforms.includes(platformId)) {
    apiUrl = `https://uapis.cn/api/v1/misc/hotboard?type=${platformId}`
  } else if (imsyyPlatforms.includes(platformId)) {
    apiUrl = `https://api-hot.imsyy.com/${platformId}?cache=true`
  } else {
    apiUrl = `https://api-hot.imsyy.com/${platformId}?cache=true`
  }

  debug.log(`📡 正在请求 API: ${apiUrl}`)

  // 获取平台特定的超时配置,如果没有则使用默认超时
  const timeout = API.PLATFORM_TIMEOUT[platformId] || API.REQUEST_TIMEOUT
  debug.log(`⏱️ 超时配置:`, {
    platform: platformId,
    platformTimeout: API.PLATFORM_TIMEOUT[platformId],
    defaultTimeout: API.REQUEST_TIMEOUT,
    finalTimeout: timeout
  })

  try {
    // 使用 AbortController 实现超时控制
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
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
      hotList = data.list.map(item => {
        // 豆瓣电影平台使用豆瓣搜索链接
        const url = (platformId === 'douban-movie')
          ? `https://search.douban.com/movie/subject_search?search_text=${encodeURIComponent(item.title)}`
          : (item.url || '')

        // 调试日志
        if (platformId === 'douban-movie') {
          debug.log(`🎬 豆瓣电影: ${item.title} -> ${url}`)
        }

        return {
          index: item.index,
          title: item.title,
          desc: item.extra?.desc || '',
          img: item.extra?.img || '',
          url: url,
          hot: item.hot_value || ''
        }
      })
      debug.log(`✅ 成功从 uapis.cn 获取 ${hotList.length} 条热搜数据`)
    }
    // uapis.cn 旧格式: { code: 200, data: [...], message: "success" }
    else if (data.code === 200 && Array.isArray(data.data)) {
      hotList = data.data.map(item => {
        // 豆瓣电影平台使用豆瓣搜索链接
        if (platformId === 'douban-movie' && item.title) {
          const url = `https://search.douban.com/movie/subject_search?search_text=${encodeURIComponent(item.title)}`
          debug.log(`🎬 豆瓣电影(旧格式): ${item.title} -> ${url}`)
          return {
            ...item,
            url: url
          }
        }
        return item
      })
      debug.log(`✅ 成功从 uapis.cn 获取 ${hotList.length} 条热搜数据`)
    }
    // imsyy.top 格式: { data: [...], success: true }
    else if (data && data.data && Array.isArray(data.data)) {
      hotList = data.data.map(item => {
        // 豆瓣电影平台使用豆瓣搜索链接
        if (platformId === 'douban-movie' && item.title) {
          const url = `https://search.douban.com/movie/subject_search?search_text=${encodeURIComponent(item.title)}`
          debug.log(`🎬 豆瓣电影(imsyy): ${item.title} -> ${url}`)
          return {
            ...item,
            url: url
          }
        }
        return item
      })
      debug.log(`✅ 成功从 imsyy.top 获取 ${hotList.length} 条热搜数据`)
    } else {
      throw new Error('API 返回数据格式不正确')
    }

    // 简单分页处理
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const paginatedData = hotList.slice(start, end)

    const result = {
      data: paginatedData,
      total: hotList.length,
      hasMore: end < hotList.length
    }

    return result
  } catch (error) {
    console.error('❌ 请求失败:', error)

    // 超时错误处理
    if (error.name === 'AbortError') {
      throw new Error('请求超时')
    }
    // 网络错误处理
    else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      throw new Error('网络请求失败，请检查网络连接')
    } else if (error.message.includes('CORS')) {
      throw new Error('跨域请求被阻止（建议在uTools中使用）')
    } else {
      throw error
    }
  }
}

/**
 * 获取追书神器小说排行榜数据
 * @param {number} page - 页码
 * @param {number} pageSize - 每页数量
 * @returns {Promise<Object>} 小说排行榜数据
 */
async function getZhuishuData(page, pageSize) {
  const cacheKey = `page_${page}`
  const cacheTTL = 2 * 60 * 60 * 1000 // 缓存2小时

  // 1. 先检查缓存
  const cachedData = cacheManager.get('zhuishu', cacheKey)
  if (cachedData) {
    debug.log(`📦 [缓存命中] 追书排行返回缓存数据`)
    return cachedData
  }

  // 使用多个 CORS 代理作为备选
  const proxies = [
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?',
    'https://api.codetabs.com/v1/proxy?quest='
  ]

  const targetUrl = 'http://zhuishushenqi.com/ranking'
  const timeout = API.PLATFORM_TIMEOUT['zhuishu'] || API.REQUEST_TIMEOUT

  debug.log(`📚 正在获取追书神器小说排行榜...`)
  debug.log(`⏱️ 超时配置:`, {
    platform: 'zhuishu',
    platformTimeout: API.PLATFORM_TIMEOUT['zhuishu'],
    defaultTimeout: API.REQUEST_TIMEOUT,
    finalTimeout: timeout
  })

  // 尝试多个代理
  for (let i = 0; i < proxies.length; i++) {
    const proxyUrl = proxies[i]
    const fullUrl = proxyUrl + encodeURIComponent(targetUrl)

    debug.log(`🔄 尝试代理 ${i + 1}/${proxies.length}: ${proxyUrl}`)

    try {
      // 使用 AbortController 实现超时控制
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        debug.warn(`⚠️ 代理 ${i + 1} 返回错误: ${response.status}`)
        continue // 尝试下一个代理
      }

      const html = await response.text()

      // 检查是否返回了有效内容
      if (!html || html.length < 100) {
        debug.warn(`⚠️ 代理 ${i + 1} 返回内容无效`)
        continue
      }

      // 解析 HTML 提取小说数据
      const books = parseZhuishuHTML(html)

      if (!books || books.length === 0) {
        debug.warn(`⚠️ 代理 ${i + 1} 未能解析到小说数据`)
        continue
      }

      debug.log(`✅ 代理 ${i + 1} 成功获取 ${books.length} 本小说`)

      // 分页处理
      const start = (page - 1) * pageSize
      const end = start + pageSize
      const paginatedData = books.slice(start, end)

      const resultData = {
        data: paginatedData,
        total: books.length,
        hasMore: end < books.length
      }

      // 缓存数据
      cacheManager.set('zhuishu', cacheKey, resultData, cacheTTL)
      return resultData
    } catch (error) {
      debug.warn(`⚠️ 代理 ${i + 1} 请求失败:`, error.message)

      // 超时错误特殊处理
      if (error.name === 'AbortError') {
        debug.warn(`⏰ 代理 ${i + 1} 请求超时`)
        // 如果是最后一个代理，抛出超时错误
        if (i === proxies.length - 1) {
          throw new Error('请求超时')
        }
        // 否则继续尝试下一个代理
        continue
      }

      // 如果是最后一个代理,抛出错误
      if (i === proxies.length - 1) {
        throw new Error('追书神器接口暂时无法访问,请稍后重试')
      }

      // 否则继续尝试下一个代理
      continue
    }
  }

  // 如果所有代理都失败了，显示暂无数据
  throw new Error('请求超时')
}

/**
 * 解析追书神器 HTML 提取小说数据
 * @param {string} html - HTML 文本
 * @returns {Array} 小说列表
 */
function parseZhuishuHTML(html) {
  const books = []

  // 使用正则表达式提取每本书的信息
  // 匹配模式：<a href="/book/..." class="book" target="_blank">
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

    // 提取人气和读者留存
    const popularityMatch = /<p\s+class="popularity">([\s\S]*?)<\/p>/.exec(bookHtml)
    let hot = ''
    if (popularityMatch) {
      const popularityText = popularityMatch[1]
      // 提取第一个红色数字（人气值）
      const hotMatch = /<span\s+class="c-red">([^<]+)<\/span>/.exec(popularityText)
      hot = hotMatch ? hotMatch[1].trim() : ''
    }

    if (title) {
      books.push({
        index: books.length + 1,
        title: title,
        desc: `${author} · ${desc}`,
        url: `http://zhuishushenqi.com/book/${bookId}`,
        hot: hot
      })
    }
  }

  return books
}


/**
 * 获取电影票房榜数据
 * @param {number} page - 页码
 * @param {number} pageSize - 每页数量
 * @returns {Promise<Object>} 电影票房榜数据
 */
async function getMovieBoxData(page, pageSize) {
  const cacheKey = `page_${page}`
  const cacheTTL = 60 * 60 * 1000 // 缓存1小时

  // 1. 先检查缓存
  const cachedData = cacheManager.get('movie-box', cacheKey)
  if (cachedData) {
    debug.log(`📦 [缓存命中] 电影票房榜返回缓存数据`)
    return cachedData
  }

  const timeout = API.PLATFORM_TIMEOUT['movie-box'] || 10000 // 默认 10 秒超时

  try {
    // 使用 AbortController 实现超时控制
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const apiUrl = 'https://api.52vmy.cn/api/wl/top/movie?type=text'

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'text/plain'
      },
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const text = await response.text()

    if (!text) {
      throw new Error('返回数据为空')
    }

    // 解析文本数据
    const hotList = parseMovieBoxText(text)

    // 分页处理
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const paginatedData = hotList.slice(start, end)

    const resultData = {
      data: paginatedData,
      total: hotList.length,
      hasMore: end < hotList.length
    }

    // 缓存数据
    cacheManager.set('movie-box', cacheKey, resultData, cacheTTL)
    return resultData
  } catch (error) {
    debug.warn(`⚠️ 获取电影票房榜失败:`, error.message)

    // 超时错误处理
    if (error.name === 'AbortError') {
      throw new Error('请求超时')
    }
    // 网络错误处理
    else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      throw new Error('网络请求失败，请检查网络连接')
    } else if (error.message.includes('CORS')) {
      throw new Error('跨域请求被阻止（建议在uTools中使用）')
    } else {
      throw error
    }
  }
}

/**
 * 解析电影票房榜文本数据
 * @param {string} text - 文本数据
 * @returns {Array} 电影列表
 */
function parseMovieBoxText(text) {
  const movies = []
  const lines = text.split('\n').filter(line => line.trim())


  let currentMovie = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // 匹配 "Top X -> 电影名"
    const topMatch = line.match(/^Top\s*(\d+)\s*->\s*(.+)$/)
    if (topMatch) {
      // 保存上一部电影
      if (currentMovie) {
        movies.push(currentMovie)
      }

      // 提取电影名称
      const movieTitle = topMatch[2].trim()

      // 生成豆瓣搜索链接
      const doubanSearchUrl = `https://search.douban.com/movie/subject_search?search_text=${encodeURIComponent(movieTitle)}`

      // 开始新电影，url 设置为豆瓣搜索链接
      currentMovie = {
        index: parseInt(topMatch[1]),
        title: movieTitle,
        desc: '',
        url: doubanSearchUrl,
        hot: ''
      }
      continue
    }

    // 解析电影详情
    if (currentMovie) {
      // 上映天数和总票房
      const daysMatch = line.match(/^上映(\d+)天\s+(.+)$/)
      if (daysMatch) {
        currentMovie.desc = `上映${daysMatch[1]}天 · 总票房${daysMatch[2]}`
        continue
      }

      // 综合票房
      const boxMatch = line.match(/^综合票房\s+(.+)$/)
      if (boxMatch) {
        currentMovie.hot = boxMatch[1]
        currentMovie.desc += ` · 当日${boxMatch[1]}`
        continue
      }

      // 票房占比（可选显示）
      // const percentMatch = line.match(/^综合票房占比\s+(.+)$/)
      // if (percentMatch) {
      //   currentMovie.desc += ` · 占比${percentMatch[1]}`
      //   continue
      // }
    }
  }

  // 保存最后一部电影
  if (currentMovie) {
    movies.push(currentMovie)
  }
  return movies
}


/**
 * 获取60秒早报数据
 * @param {number} page - 页码
 * @param {number} pageSize - 每页数量
 * @returns {Promise<Object>} 早报数据
 */
async function get60sNewsData(page, pageSize) {
  const cacheKey = `page_${page}`
  const cacheTTL = 60 * 60 * 1000 // 缓存1小时

  // 1. 先检查缓存
  const cachedData = cacheManager.get('60s-news', cacheKey)
  if (cachedData) {
    debug.log(`📦 [缓存命中] 60秒早报返回缓存数据`)
    return cachedData
  }

  const timeout = API.PLATFORM_TIMEOUT['60s-news'] || 10000 // 默认 10 秒超时

  try {
    // 使用 AbortController 实现超时控制
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const apiUrl = 'https://api.zxki.cn/api/mrzb'

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()

    if (data.code !== 200 || !data.data) {
      throw new Error('API 返回数据格式不正确')
    }

    const newsData = data.data

    // 解析新闻内容
    const hotList = parse60sNewsData(newsData)

    debug.log(`✅ 成功获取60秒早报 ${hotList.length} 条数据`)

    // 分页处理
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const paginatedData = hotList.slice(start, end)

    const resultData = {
      data: paginatedData,
      total: hotList.length,
      hasMore: end < hotList.length
    }

    // 缓存数据
    cacheManager.set('60s-news', cacheKey, resultData, cacheTTL)
    return resultData
  } catch (error) {
    debug.warn(`⚠️ 获取60秒早报失败:`, error.message)

    // 超时错误处理
    if (error.name === 'AbortError') {
      throw new Error('请求超时')
    }
    // 网络错误处理
    else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      throw new Error('网络请求失败，请检查网络连接')
    } else {
      throw error
    }
  }
}

/**
 * 解析60秒早报数据
 * @param {Object} newsData - API返回的新闻数据
 * @returns {Array} 新闻列表
 */
function parse60sNewsData(newsData) {
  const items = []

  // 添加日期信息作为第一条
  if (newsData.date) {
    const dateText = newsData.date
    if (dateText) {
      items.push({
        index: 0,
        title: `📅 ${dateText}`,
        desc: '每天60秒读懂世界',
        url: 'https://www.baidu.com/s?wd=60秒早报',
        hot: ''
      })
    }
  }

  // 解析新闻内容 - 酷酷API返回的是 news 数组
  if (newsData.news && Array.isArray(newsData.news)) {
    newsData.news.forEach((content) => {
      if (!content || content.trim() === '') {
        return
      }

      // 提取新闻标题（去掉序号）
      const title = content.replace(/^\d+、/, '').trim()

      // 生成百度搜索链接
      const searchQuery = title.split('；')[0].split('；')[0].split('。')[0].trim()
      const baiduSearchUrl = `https://www.baidu.com/s?wd=${encodeURIComponent(searchQuery)}`

      items.push({
        index: items.length,
        title: title,
        desc: '',
        url: baiduSearchUrl,
        hot: ''
      })
    })
  }

  // 添加微语作为最后一条
  if (newsData.weiyu) {
    items.push({
      index: items.length,
      title: newsData.weiyu,
      desc: '每日微语',
      url: 'https://www.baidu.com/s?wd=每日微语',
      hot: ''
    })
  }

  return items
}


/**
 * 获取芝加哥艺术学院艺术品数据(带缓存优化)
 * @param {number} page - 页码
 * @param {number} pageSize - 每页数量
 * @returns {Promise<Object>} 艺术品数据
 */
async function getArticData(page, pageSize) {
  const cacheKey = `page_${page}`
  const cacheTTL = 60 * 60 * 1000 // 缓存1小时

  // 1. 先检查缓存
  const cachedData = cacheManager.get('artic', cacheKey)
  if (cachedData) {
    // 检查缓存数据是否包含旧的 www.artic.edu URL
    const hasOldData = cachedData.data && cachedData.data.some(item =>
      item.img && item.img.includes('www.artic.edu/iiif')
    )

    // 由于添加了公有领域筛选，需要清除旧缓存以确保符合版权要求
    if (hasOldData) {
      // 清除旧缓存
      console.log(`🗑️ [清除旧缓存] 芝加哥艺术学院第 ${page} 页(包含旧的 www.artic.edu URL 或未筛选版权)`)
      cacheManager.clearPlatform('artic')
    } else {
      debug.log(`📦 [缓存命中] 芝加哥艺术学院第 ${page} 页(仅公有领域)`)
      return cachedData
    }
  }

  // 2. 请求节流检查(每秒最多1次请求)
  if (!cacheManager.canRequest('artic', 1000)) {
    throw new Error('请求过于频繁,请稍后再试')
  }

  // 3. 使用防重复请求机制
  return cacheManager.deduplicateRequest(`artic_${cacheKey}`, async () => {
    const timeout = API.PLATFORM_TIMEOUT['artic'] || 10000 // 默认 10 秒超时

    debug.log(`🎨 正在获取芝加哥艺术学院艺术品(第${page}页)...`)
    debug.log(`⏱️ 超时配置:`, {
      platform: 'artic',
      platformTimeout: API.PLATFORM_TIMEOUT['artic'],
      defaultTimeout: API.REQUEST_TIMEOUT,
      finalTimeout: timeout
    })

    try {
      // 使用 AbortController 实现超时控制
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      // 使用普通的listing端点（只获取公有领域艺术品，避免版权问题）
      const apiUrl = 'https://api.artic.edu/api/v1/artworks'

      // 请求参数:一次性获取更多数据以减少API调用
      // 每次请求pageSize*2的数据,缓存起来供分页使用
      const params = new URLSearchParams({
        limit: (pageSize * 2).toString(), // 获取2倍数据以支持下一页
        page: page.toString(),
        fields: 'id,title,image_id,artist_display,date_display,medium_display,place_of_origin,dimensions,iiif_url,thumbnail',
        query: JSON.stringify({
          term: { is_public_domain: true } // 只获取公有领域艺术品
        })
      })

      debug.log(`📋 使用listing端点(仅公有领域): ${apiUrl}?${params}`)

      const response = await fetch(`${apiUrl}?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()

      // 从响应中获取数据
      const artworks = result.data || []
      const config = result.config || {}

      // 使用 API 返回的 iiif_url (支持 CORS,无需代理)
      const iiifBaseUrl = config.iiif_url

      debug.log(`✅ 成功获取 ${artworks.length} 件艺术品`)
      debug.log(`🖼️ IIIF Base URL: ${iiifBaseUrl}`)

      // 转换为统一格式
      let transformedList = artworks
        .filter(artwork => artwork.image_id) // 只保留有图片的艺术品
        .map((artwork, index) => {
          // 使用官方推荐的 IIIF URL 格式和尺寸 (843px - 缓存命中率最高)
          // 参考: https://api.artic.edu/docs/#iiif-image-api
          const imageUrl = `${iiifBaseUrl}/${artwork.image_id}/full/843,/0/default.jpg`

          // 构建描述信息
          const descParts = []
          if (artwork.artist_display) descParts.push(artwork.artist_display)
          if (artwork.date_display) descParts.push(artwork.date_display)
          if (artwork.medium_display) descParts.push(artwork.medium_display)
          if (artwork.place_of_origin) descParts.push(artwork.place_of_origin)

          return {
            id: artwork.id, // 添加ID用于key
            index: (page - 1) * pageSize + index + 1,
            title: artwork.title || 'Untitled',
            desc: descParts.join(' · '),
            img: imageUrl,
            url: `https://www.artic.edu/artworks/${artwork.id}/${encodeURIComponent(artwork.title || 'Untitled').toLowerCase().replace(/\s+/g, '-')}`,
            hot: ''
          }
        })

      // 分页处理
      const total = result.pagination?.total || transformedList.length
      const hasMore = page * pageSize < total

      // listing端点，只返回当前页数据
      transformedList = transformedList.slice(0, pageSize)

      const resultData = {
        data: transformedList,
        total: total,
        hasMore: hasMore
      }

      // 4. 缓存完整数据
      cacheManager.set('artic', cacheKey, resultData, cacheTTL)

      // 5. 预加载下一页
      if (page < 3) {
        const nextPageKey = `page_${page + 1}`
        if (!cacheManager.get('artic', nextPageKey)) {
          // 异步预加载下一页,不阻塞当前请求
          setTimeout(async () => {
            try {
              const nextPageData = await fetchArticPage(page + 1, pageSize)
              cacheManager.set('artic', nextPageKey, nextPageData, cacheTTL)
              debug.log(`🚀 [预加载] 第 ${page + 1} 页`)
            } catch (error) {
              debug.warn(`⚠️ [预加载失败] 第 ${page + 1} 页:`, error.message)
            }
          }, 500)
        }
      }

      return resultData
    } catch (error) {
      debug.warn(`⚠️ 获取芝加哥艺术学院数据失败:`, error.message)

      // 超时错误处理
      if (error.name === 'AbortError') {
        throw new Error('请求超时')
      }
      // 网络错误处理
      else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error('网络请求失败,请检查网络连接')
      } else if (error.message.includes('CORS')) {
        throw new Error('跨域请求被阻止(建议在uTools中使用)')
      } else {
        throw error
      }
    }
  })
}

/**
 * 获取芝加哥艺术学院指定页码的原始数据
 * @param {number} page - 页码
 * @param {number} pageSize - 每页数量
 * @returns {Promise<Object>} 艺术品数据
 */
async function fetchArticPage(page, pageSize) {
  const apiUrl = 'https://api.artic.edu/api/v1/artworks'
  const timeout = API.PLATFORM_TIMEOUT['artic'] || 10000

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  const params = new URLSearchParams({
    limit: pageSize.toString(),
    page: page.toString(),
    fields: 'id,title,image_id,artist_display,date_display,medium_display,place_of_origin,dimensions,iiif_url,thumbnail',
    query: JSON.stringify({
      term: { is_public_domain: true } // 只获取公有领域艺术品
    })
  })

  const response = await fetch(`${apiUrl}?${params}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
    signal: controller.signal
  })

  clearTimeout(timeoutId)

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  const result = await response.json()
  const artworks = result.data || []
  const config = result.config || {}

  // 使用 API 返回的 iiif_url (支持 CORS,无需代理)
  const iiifBaseUrl = config.iiif_url

  const transformedList = artworks
    .filter(artwork => artwork.image_id)
    .map((artwork, index) => {
      // 使用官方推荐的 IIIF URL 格式和尺寸 (843px - 缓存命中率最高)
      const imageUrl = `${iiifBaseUrl}/${artwork.image_id}/full/843,/0/default.jpg`

      const descParts = []
      if (artwork.artist_display) descParts.push(artwork.artist_display)
      if (artwork.date_display) descParts.push(artwork.date_display)
      if (artwork.medium_display) descParts.push(artwork.medium_display)
      if (artwork.place_of_origin) descParts.push(artwork.place_of_origin)

      return {
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

  return {
    data: transformedList,
    total: total,
    hasMore: hasMore
  }
}

/**
 * 获取大都会博物馆艺术品数据
 * @param {number} page - 页码
 * @param {number} pageSize - 每页数量
 * @param {Object} options - 额外选项
 * @param {string} options.geoLocation - 地理位置筛选（可选，如 "China" 搜索中国艺术品）
 * @returns {Promise<Object>} 艺术品数据
 */
async function getMetMuseumData(page, pageSize, options = {}) {
  const { geoLocation } = options // 地理位置筛选（如 "China"）

  const timeout = API.PLATFORM_TIMEOUT['metmuseum'] || 10000 // 默认 10 秒超时

  debug.log(`🏛️ 正在获取大都会博物馆艺术品(第${page}页, 地区: ${geoLocation || '全部'})...`)
  debug.log(`⏱️ 超时配置:`, {
    platform: 'metmuseum',
    platformTimeout: API.PLATFORM_TIMEOUT['metmuseum'],
    defaultTimeout: API.REQUEST_TIMEOUT,
    finalTimeout: timeout
  })

  try {
    // 使用 AbortController 实现超时控制
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    // 大都会博物馆API: https://collectionapi.metmuseum.org/public/collection/v1/search
    const apiUrl = 'https://collectionapi.metmuseum.org/public/collection/v1/search'

    // 请求参数:根据地理位置筛选艺术品
    const params = new URLSearchParams({
      q: '*', // 始终使用通配符
      hasImages: 'true' // 只获取有图片的
    })

    // 如果指定了地理位置，添加geoLocation参数
    if (geoLocation) {
      params.set('geoLocation', geoLocation)
    }

    debug.log(`📋 使用搜索端点: ${apiUrl}?${params}`)

  const searchResponse = await fetch(`${apiUrl}?${params}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
    signal: controller.signal
  })

  clearTimeout(timeoutId)

  if (!searchResponse.ok) {
    throw new Error(`HTTP ${searchResponse.status}: ${searchResponse.statusText}`)
  }

  const searchResult = await searchResponse.json()

  // 获取艺术品ID列表
  const objectIds = searchResult.objectIDs || []
  const total = searchResult.total || 0

  debug.log(`✅ 成功获取 ${total} 件艺术品，使用 ${objectIds.length} 个ID`)

  // 计算分页范围
  const start = (page - 1) * pageSize
  const end = Math.min(start + pageSize, objectIds.length)
  const pageObjectIds = objectIds.slice(start, end)

  debug.log(`📄 第 ${page} 页: ${start}-${end} (共 ${pageObjectIds.length} 件)`)

    // 批量获取艺术品详细信息(并发请求)
    const artworkPromises = pageObjectIds.map(async (objectId, idx) => {
        try {
          const detailController = new AbortController()
          const detailTimeoutId = setTimeout(() => detailController.abort(), 5000) // 单个请求5秒超时

          const detailResponse = await fetch(
            `https://collectionapi.metmuseum.org/public/collection/v1/objects/${objectId}`,
            {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json'
              },
              signal: detailController.signal
            }
          )

          clearTimeout(detailTimeoutId)

          if (!detailResponse.ok) {
            debug.warn(`⚠️ 获取艺术品 ${objectId} 详情失败: ${detailResponse.status}`)
            return null
          }

          const artwork = await detailResponse.json()

          // 只返回有主图片且是公有领域的艺术品
          if (!artwork.primaryImage || !artwork.isPublicDomain) {
            return null
          }

          // 构建描述信息
          const descParts = []
          if (artwork.artistDisplayName) descParts.push(artwork.artistDisplayName)
          if (artwork.objectDate) descParts.push(artwork.objectDate)
          if (artwork.country) descParts.push(artwork.country) // 添加国家信息
          if (artwork.medium) descParts.push(artwork.medium)
          if (artwork.department) descParts.push(artwork.department)
          if (artwork.culture) descParts.push(artwork.culture)

          return {
            id: artwork.objectID,
            index: start + idx + 1,
            title: artwork.title || 'Untitled',
            desc: descParts.join(' · '),
            img: artwork.primaryImageSmall || artwork.primaryImage, // 优先使用小图
            url: artwork.objectURL || `https://www.metmuseum.org/art/collection/search/${artwork.objectID}`,
            hot: artwork.isHighlight ? '⭐ 精选' : ''
          }
        } catch (error) {
          debug.warn(`⚠️ 获取艺术品 ${objectId} 失败:`, error.message)
          return null
        }
    })

    // 等待所有请求完成
    const artworkResults = await Promise.all(artworkPromises)

    // 过滤掉失败的请求
    let validArtworks = artworkResults.filter(artwork => artwork !== null)

    debug.log(`✅ 成功获取 ${validArtworks.length}/${pageObjectIds.length} 件艺术品详情`)

    // 根据标题去重（保留第一次出现的作品）
    const seenTitles = new Set()
    const beforeDedupCount = validArtworks.length
    validArtworks = validArtworks.filter(artwork => {
      const title = artwork.title.toLowerCase().trim()
      if (seenTitles.has(title)) {
        debug.log(`🔄 去重: ${artwork.title} (已存在)`)
        return false
      }
      seenTitles.add(title)
      return true
    })

    if (beforeDedupCount !== validArtworks.length) {
      debug.log(`🎯 去重过滤: ${beforeDedupCount} → ${validArtworks.length}`)
    }

    // 计算实际的总数（考虑去重）
    // 由于我们无法预测去重数量，使用实际的 objectIds.length 作为基准
    // 但至少要确保 hasMore 的判断正确
    const hasMore = end < objectIds.length

    const resultData = {
      data: validArtworks,
      total: objectIds.length, // 使用原始总数作为基准
      hasMore: hasMore,
      dedupCount: beforeDedupCount - validArtworks.length // 记录去重数量
    }

    return resultData
  } catch (error) {
    debug.warn(`⚠️ 获取大都会博物馆数据失败:`, error.message)

    // 超时错误处理
    if (error.name === 'AbortError') {
      throw new Error('请求超时')
    }
    // 网络错误处理
    else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      throw new Error('网络请求失败,请检查网络连接')
    } else if (error.message.includes('CORS')) {
      throw new Error('跨域请求被阻止(建议在uTools中使用)')
    } else {
      throw error
    }
  }
}

/**
 * 获取 Epic Games 免费游戏数据
 * @param {number} page - 页码
 * @param {number} pageSize - 每页数量
 * @returns {Promise<Object>} 免费游戏数据
 */
async function getEpicFreeData(page, pageSize) {
  const cacheKey = `page_${page}`
  const cacheTTL = 30 * 60 * 1000 // 缓存30分钟

  // 1. 先检查缓存
  const cachedData = cacheManager.get('epic-free', cacheKey)
  if (cachedData) {
    debug.log(`📦 [缓存命中] Epic免费游戏返回缓存数据`)
    return cachedData
  }

  const timeout = API.REQUEST_TIMEOUT

  debug.log(`🎮 正在获取 Epic Games 免费游戏...`)

  try {
    // 使用 AbortController 实现超时控制
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const apiUrl = 'https://uapis.cn/api/v1/game/epic-free'

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const result = await response.json()

    if (result.message !== '获取成功' || !Array.isArray(result.data)) {
      throw new Error('API 返回数据格式不正确')
    }

    const games = result.data

    // 转换为统一格式
    const hotList = games.map((game, index) => {
      // 构建描述信息
      const descParts = []
      if (game.seller) descParts.push(game.developer || game.seller)
      if (game.description) descParts.push(game.description.substring(0, 100) + (game.description.length > 100 ? '...' : ''))

      // 构建价格和免费时间信息
      let priceInfo = ''
      if (game.is_free_now) {
        priceInfo = '🎁 现免费'
      } else {
        priceInfo = `即将免费 · ${game.free_start} - ${game.free_end}`
      }

      if (game.original_price_desc) {
        priceInfo += ` (原价${game.original_price_desc})`
      }

      return {
        id: game.id,
        index: index + 1,
        title: game.title,
        desc: descParts.join(' · ') || priceInfo,
        img: game.cover || '',
        url: game.link || '',
        hot: priceInfo,
        extra: {
          is_free_now: game.is_free_now,
          free_start: game.free_start,
          free_end: game.free_end,
          original_price: game.original_price
        }
      }
    })

    debug.log(`✅ 成功获取 ${hotList.length} 款 Epic 免费游戏`)

    // 分页处理
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const paginatedData = hotList.slice(start, end)

    const resultData = {
      data: paginatedData,
      total: hotList.length,
      hasMore: end < hotList.length
    }

    // 缓存数据
    cacheManager.set('epic-free', cacheKey, resultData, cacheTTL)
    return resultData
  } catch (error) {
    debug.warn(`⚠️ 获取 Epic 免费游戏失败:`, error.message)

    // 超时错误处理
    if (error.name === 'AbortError') {
      throw new Error('请求超时')
    }
    // 网络错误处理
    else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      throw new Error('网络请求失败，请检查网络连接')
    } else {
      throw error
    }
  }
}

/**
 * 股票代码配置
 * 定义不同平台需要查询的股票列表
 */
const STOCK_CONFIGS = {
  'stock-hot': {
    name: '热门股票',
    // 热门股票代码列表
    stocks: [
      { code: 'sh600519', name: '贵州茅台' },
      { code: 'sz000858', name: '五粮液' },
      { code: 'sh601318', name: '中国平安' },
      { code: 'sz000333', name: '美的集团' },
      { code: 'sh600036', name: '招商银行' },
      { code: 'sz002594', name: '比亚迪' },
      { code: 'sh601012', name: '隆基绿能' },
      { code: 'sz300059', name: '东方财富' },
      { code: 'sh600887', name: '伊利股份' },
      { code: 'sz000651', name: '格力电器' },
      { code: 'sh601888', name: '中国中免' },
      { code: 'sz002475', name: '立讯精密' },
      { code: 'sh600276', name: '恒瑞医药' },
      { code: 'sz300750', name: '宁德时代' },
      { code: 'sh601919', name: '中远海控' }
    ]
  },
  'stock-sh': {
    name: '上证指数',
    // 上证指数和权重股
    stocks: [
      { code: 'sh000001', name: '上证指数' },
      { code: 'sh600519', name: '贵州茅台' },
      { code: 'sh601318', name: '中国平安' },
      { code: 'sh600036', name: '招商银行' },
      { code: 'sh601012', name: '隆基绿能' },
      { code: 'sh600887', name: '伊利股份' },
      { code: 'sh601888', name: '中国中免' },
      { code: 'sh600276', name: '恒瑞医药' },
      { code: 'sh601919', name: '中远海控' },
      { code: 'sh600900', name: '长江电力' }
    ]
  },
  'stock-tech': {
    name: '科技股',
    // 科技类股票
    stocks: [
      { code: 'sz000063', name: '中兴通讯' },
      { code: 'sz002415', name: '海康威视' },
      { code: 'sz300059', name: '东方财富' },
      { code: 'sz002475', name: '立讯精密' },
      { code: 'sz300750', name: '宁德时代' },
      { code: 'sz002594', name: '比亚迪' },
      { code: 'sh688981', name: '中芯国际' },
      { code: 'sz000725', name: '京东方A' },
      { code: 'sz002371', name: '北方华创' },
      { code: 'sh688008', name: '澜起科技' }
    ]
  }
}

/**
 * 获取新浪股票实时行情数据
 * @param {string} platformId - 平台ID
 * @param {number} page - 页码
 * @param {number} pageSize - 每页数量
 * @returns {Promise<Object>} 股票行情数据
 */
async function getStockData(platformId, page, pageSize) {
  const cacheKey = `page_${page}`
  const cacheTTL = 60 * 1000 // 缓存1分钟（股票数据需要实时更新）

  // 1. 先检查缓存
  const cachedData = cacheManager.get(platformId, cacheKey)
  if (cachedData) {
    debug.log(`📦 [缓存命中] ${platformId} 返回缓存数据`)
    return cachedData
  }

  const config = STOCK_CONFIGS[platformId]
  if (!config) {
    throw new Error(`未知的股票平台: ${platformId}`)
  }

  // 获取平台特定的超时配置,如果没有则使用默认超时
  const timeout = API.PLATFORM_TIMEOUT[platformId] || API.REQUEST_TIMEOUT

  debug.log(`📈 正在获取 ${config.name} 实时行情...`)
  debug.log(`⏱️ 超时配置:`, {
    platform: platformId,
    platformTimeout: API.PLATFORM_TIMEOUT[platformId],
    defaultTimeout: API.REQUEST_TIMEOUT,
    finalTimeout: timeout
  })

  // 重试机制：最多重试2次
  const maxRetries = 2

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // 使用 AbortController 实现超时控制
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      // 腾讯股票接口：支持一次查询多个股票，用逗号分隔
      // 接口格式：http://qt.gtimg.cn/q=sh600519,sz000858
      const stockCodes = config.stocks.map(s => s.code).join(',')
      const apiUrl = `https://qt.gtimg.cn/q=${stockCodes}`

      debug.log(`📡 正在请求 API: ${apiUrl}${attempt > 1 ? ` (重试 ${attempt}/${maxRetries})` : ''}`)

        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Accept': 'text/plain, */*; q=0.01',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Cache-Control': 'no-cache'
          },
          signal: controller.signal,
          cache: 'no-store'
        })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      // 新浪返回的是文本数据
      const text = await response.text()

      // 检查是否为空数据
      if (!text || text.trim() === '') {
        throw new Error('返回数据为空')
      }

      // 解析新浪股票数据
      const hotList = parseSinaStockData(text, config.stocks)

      if (hotList.length === 0) {
        throw new Error('未能解析到股票数据')
      }

      debug.log(`✅ 成功获取 ${hotList.length} 只股票行情`)

      // 分页处理
      const start = (page - 1) * pageSize
      const end = start + pageSize
      const paginatedData = hotList.slice(start, end)

      const resultData = {
        data: paginatedData,
        total: hotList.length,
        hasMore: end < hotList.length
      }

      // 缓存数据
      cacheManager.set(platformId, cacheKey, resultData, cacheTTL)
      return resultData
    } catch (error) {
      debug.warn(`⚠️ 获取 ${config.name} 失败 (尝试 ${attempt}/${maxRetries}):`, error.message)

      // 如果是最后一次尝试，抛出错误
      if (attempt === maxRetries) {
        // 超时错误处理
        if (error.name === 'AbortError') {
          throw new Error('请求超时，请检查网络连接或稍后重试')
        }
        // 网络错误处理
        else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          throw new Error('网络请求失败，请检查网络连接')
        } else {
          throw error
        }
      }

      // 等待一段时间后重试（指数退避）
      const retryDelay = attempt * 1000
      debug.log(`⏳ 等待 ${retryDelay}ms 后重试...`)
      await new Promise(resolve => setTimeout(resolve, retryDelay))
    }
  }
}

/**
 * 解析腾讯股票数据
 * @param {string} text - 腾讯API返回的文本数据
 * @param {Array} stocks - 股票配置列表
 * @returns {Array} 解析后的股票数据
 */
function parseSinaStockData(text, stocks) {
  const stockList = []

  // 腾讯返回格式：v_sh600519="51~贵州茅台~600519~1675.00~1680.00~1670.00~..."
  // 按行分割
  const lines = text.split('\n')

  for (const line of lines) {
    // 提取股票代码和数据（腾讯格式）
    const tencentMatch = line.match(/v_(.+?)="(.+?)"/)
    if (tencentMatch) {
      const code = tencentMatch[1]
      const dataStr = tencentMatch[2]

      if (!dataStr || dataStr === '') continue

      // 查找股票名称
      const stockConfig = stocks.find(s => s.code === code)
      const name = stockConfig?.name || code

      // 腾讯数据格式：以~分隔
      // 0:未知, 1:股票名称, 2:股票代码, 3:当前价格, 4:昨收, 5:今开, 6:成交量（手）,
      // 7:外盘, 8:内盘, 9:买一, 10:买一量（手）, 11-18:买二-买五, 19:卖一, 20:卖一量,
      // 21-28:卖二-卖五, 29:最近逐笔成交, 30:时间, 31:涨跌, 32:涨跌%, 33:最高, 34:最低,
      // 35:价格/成交量（手）/成交额, 36:成交量（手）, 37:成交额（万）
      const data = dataStr.split('~')

      if (data.length < 38) continue

      // 使用配置的名称，避免API返回的中文乱码问题
      const nameInData = name // 优先使用配置的名称
      const price = parseFloat(data[3]) || 0 // 当前价格
      const closePrev = parseFloat(data[4]) || 0 // 昨收
      const open = parseFloat(data[5]) || 0 // 今开
      const volume = parseInt(data[6]) || 0 // 成交量（手）
      const high = parseFloat(data[33]) || 0 // 最高
      const low = parseFloat(data[34]) || 0 // 最低
      const buyPrice = parseFloat(data[9]) || 0 // 买一价
      const sellPrice = parseFloat(data[19]) || 0 // 卖一价
      const amount = parseFloat(data[37]) || 0 // 成交额（万）
      const time = data[30] || '' // 时间

      // 计算涨跌幅
      const change = price - closePrev
      const changePercent = closePrev > 0 ? ((change / closePrev) * 100).toFixed(2) : '0.00'

      // 判断涨跌
      const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'flat'

      // 构建描述信息
      const descParts = []
      if (high > 0) descParts.push(`最高:¥${high.toFixed(2)}`)
      if (low > 0) descParts.push(`最低:¥${low.toFixed(2)}`)
      if (volume > 0) descParts.push(`成交量:${(volume / 10000).toFixed(0)}万手`)
      if (amount > 0) descParts.push(`成交额:${(amount / 100000000).toFixed(2)}亿`)

      // 热度值：涨跌幅
      const hot = `${change > 0 ? '+' : ''}${changePercent}%`

      stockList.push({
        id: code,
        index: stockList.length + 1,
        title: `${nameInData} (${code.toUpperCase().replace('SH', 'SH').replace('SZ', 'SZ')})`,
        desc: descParts.join(' · ') || time,
        url: `https://gu.qq.com/${code}`,
        hot: hot,
        extra: {
          code: code,
          name: nameInData,
          price: price,
          open: open,
          closePrev: closePrev,
          high: high,
          low: low,
          change: change,
          changePercent: parseFloat(changePercent),
          volume: volume,
          amount: amount,
          buyPrice: buyPrice,
          sellPrice: sellPrice,
          date: time,
          time: time,
          trend: trend
        }
      })

      continue
    }

    // 兼容新浪格式（备用）
    const match = line.match(/hq_str_(.+?)="(.+?)"/)
    if (!match) continue

    const code = match[1]
    const dataStr = match[2]

    if (!dataStr || dataStr === '') continue

    // 查找股票名称
    const stockConfig = stocks.find(s => s.code === code)
    const name = stockConfig?.name || code

    // 新浪数据格式：股票名称,今日开盘价,昨日收盘价,当前价格,今日最高价,今日最低价,
    // 竞买价,竞卖价,成交股数,成交金额,买1手,买1报价,买2手,买2报价,...,卖5报价,日期,时间
    const data = dataStr.split(',')

    if (data.length < 32) continue

    const nameInData = data[0] || name
    const open = parseFloat(data[1]) || 0 // 今日开盘价
    const closePrev = parseFloat(data[2]) || 0 // 昨日收盘价
    const price = parseFloat(data[3]) || 0 // 当前价格
    const high = parseFloat(data[4]) || 0 // 今日最高价
    const low = parseFloat(data[5]) || 0 // 今日最低价
    const buyPrice = parseFloat(data[6]) || 0 // 竞买价
    const sellPrice = parseFloat(data[7]) || 0 // 竞卖价
    const volume = parseInt(data[8]) || 0 // 成交股数
    const amount = parseFloat(data[9]) || 0 // 成交金额（元）
    const date = data[30] || '' // 日期
    const time = data[31] || '' // 时间

    // 计算涨跌幅
    const change = price - closePrev
    const changePercent = closePrev > 0 ? ((change / closePrev) * 100).toFixed(2) : '0.00'

    // 判断涨跌
    const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'flat'

    // 构建描述信息
    const descParts = []
    if (high > 0) descParts.push(`最高:¥${high.toFixed(2)}`)
    if (low > 0) descParts.push(`最低:¥${low.toFixed(2)}`)
    if (volume > 0) descParts.push(`成交量:${(volume / 10000).toFixed(0)}万手`)
    if (amount > 0) descParts.push(`成交额:${(amount / 100000000).toFixed(2)}亿`)

    // 热度值：涨跌幅
    const hot = `${change > 0 ? '+' : ''}${changePercent}%`

    stockList.push({
      id: code,
      index: stockList.length + 1,
      title: `${nameInData} (${code.toUpperCase().replace('SH', 'SH').replace('SZ', 'SZ')})`,
      desc: descParts.join(' · ') || `${date} ${time}`,
      url: `https://finance.sina.com.cn/realstock/company/${code}/nc.shtml`,
      hot: hot,
      extra: {
        code: code,
        name: nameInData,
        price: price,
        open: open,
        closePrev: closePrev,
        high: high,
        low: low,
        change: change,
        changePercent: parseFloat(changePercent),
        volume: volume,
        amount: amount,
        buyPrice: buyPrice,
        sellPrice: sellPrice,
        date: date,
        time: time,
        trend: trend
      }
    })
  }

  return stockList
}

/**
 * 根据分类获取平台列表
 * @param {string} category - 分类名称
 * @returns {Array} 该分类下的平台列表
 */
export function getPlatformsByCategory(category) {
  if (!category || category === '全部') {
    return PLATFORMS
  }
  return PLATFORMS.filter(p => p.category === category)
}

/**
 * 获取所有分类
 * @returns {Array<string>} 分类列表
 */
export function getCategories() {
  const categories = new Set(PLATFORMS.map(p => p.category))
  return ['全部', ...Array.from(categories).sort()]
}
