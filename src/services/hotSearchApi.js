/**
 * 热搜数据服务 API
 * 通过 uTools preload 脚本获取各平台热搜
 */

import { DISPLAY_MODE, API } from '../config.js'

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
  { id: 'bilibili', name: 'B站', icon: '📺', category: '视频' },
  { id: 'acfun', name: 'AcFun', icon: '🎭', category: '视频' },
  { id: 'weibo', name: '微博', icon: '📱', category: '社交' },
  { id: 'zhihu', name: '知乎', icon: '🎓', category: '社交' },
  { id: 'zhihu-daily', name: '知乎日报', icon: '📰', category: '社交' },
  { id: 'douyin', name: '抖音', icon: '🎵', category: '视频' },
  { id: 'kuaishou', name: '快手', icon: '🎬', category: '视频' },
  { id: 'douban-movie', name: '豆瓣电影', icon: '🎬', category: '娱乐' },
  { id: 'douban-group', name: '豆瓣小组', icon: '👥', category: '娱乐' },
  { id: 'tieba', name: '贴吧', icon: '📝', category: '社交' },
  { id: 'hupu', name: '虎扑', icon: '🏀', category: '生活' },
  // { id: 'miyoushe', name: '米游社', icon: '🎮', category: '游戏' },
  { id: 'ngabbs', name: 'NGA', icon: '🎮', category: '游戏' },
  { id: 'v2ex', name: 'V2EX', icon: '💬', category: '科技' },
  { id: '52pojie', name: '吾爱破解', icon: '🔧', category: '科技' },
  { id: 'hostloc', name: '主机交流', icon: '🖥️', category: '科技' },
  { id: 'coolapk', name: '酷安', icon: '📲', category: '科技' },

  // 新闻/资讯
  { id: 'baidu', name: '百度', icon: '🔍', category: '综合' },
  { id: 'thepaper', name: '澎湃新闻', icon: '📰', category: '资讯' },
  { id: 'toutiao', name: '今日头条', icon: '📰', category: '资讯' },
  { id: 'qq-news', name: '腾讯新闻', icon: '📊', category: '资讯' },
  { id: 'sina', name: '新浪热搜', icon: '📰', category: '资讯' },
  { id: 'sina-news', name: '新浪新闻', icon: '📰', category: '资讯' },
  { id: 'netease-news', name: '网易新闻', icon: '📰', category: '资讯' },
  { id: 'huxiu', name: '虎嗅', icon: '🐯', category: '资讯' },
  { id: 'ifanr', name: '爱范儿', icon: '🔔', category: '资讯' },

  // 技术/IT
  { id: 'sspai', name: '少数派', icon: '🎯', category: '科技' },
  { id: 'ithome', name: 'IT之家', icon: '💻', category: '科技' },
  { id: 'ithome-xijiayi', name: 'IT之家·喜加一', icon: '🎮', category: '科技' },
  { id: 'juejin', name: '掘金', icon: '⛏️', category: '科技' },
  { id: 'jianshu', name: '简书', icon: '✍️', category: '综合' },
  { id: 'guokr', name: '果壳', icon: '🔬', category: '科技' },
  { id: '36kr', name: '36氪', icon: '💰', category: '科技' },
  { id: '51cto', name: '51CTO', icon: '👨‍💻', category: '科技' },
  { id: 'csdn', name: 'CSDN', icon: '👨‍💻', category: '科技' },
  { id: 'nodeseek', name: 'NodeSeek', icon: '🌐', category: '科技' },

  // 游戏
  { id: 'lol', name: '英雄联盟', icon: '🎮', category: '游戏' },
  { id: 'genshin', name: '原神', icon: '🌟', category: '游戏' },
  { id: 'honkai', name: '崩坏3', icon: '⚔️', category: '游戏' },
  { id: 'starrail', name: '星穹铁道', icon: '🌠', category: '游戏' },

  // 其他
  { id: 'weread', name: '微信读书', icon: '📖', category: '阅读' },
  { id: 'hellogithub', name: 'HelloGitHub', icon: '🐱', category: '科技' },
  { id: 'jianshu', name: '简书', icon: '✍️', category: '综合' },
  { id: 'zhuishu', name: '追书排行', icon: '📚', category: '阅读' }
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
 * @returns {Promise<Object>} 热搜数据列表
 */
export async function getHotData(platformId, options = {}) {
  const { page = 1, pageSize = 50 } = options

  debug.log(`🌐 正在获取 ${platformId} 热搜数据...`)
  debug.log(`📄 第 ${page} 页，每页 ${pageSize} 条`)
  debug.log(`🔧 运行环境: ${window.utools ? 'uTools' : '浏览器'}`)

  // 直接调用热搜 API（支持 uTools 和浏览器环境）
  return await getHotDataViaFetch(platformId, page, pageSize)
}

/**
 * 通过 fetch 获取数据（支持 uTools 和浏览器环境）
 * @param {string} platformId - 平台ID
 * @param {number} page - 页码
 * @param {number} pageSize - 每页数量
 * @returns {Promise<Object>} 热搜数据
 */
async function getHotDataViaFetch(platformId, page, pageSize) {
  // 特殊处理追书神器（需要解析HTML）
  if (platformId === 'zhuishu') {
    return await getZhuishuData(page, pageSize)
  }

  // uapis.cn 支持的所有平台（根据官方文档）
  const uapisPlatforms = [
    'baidu', 'weibo', 'zhihu', 'douyin', 'bilibili', 'kuaishou',
    'toutiao', 'tieba', 'hupu', 'douban-movie', 'douban-group', 'juejin', 'jianshu',
    'ithome', 'ithome-xijiayi', '36kr', 'csdn', 'v2ex', 'sspai', 'coolapk',
    'thepaper', 'qq-news', 'sina', 'sina-news', 'netease-news', 'huxiu', 'ifanr',
    'acfun', 'miyoushe', 'genshin', 'honkai', 'starrail', 'lol', 'guokr', '51cto',
    'nodeseek', '52pojie', 'hostloc', 'weread', 'hellogithub', 'zhihu-daily'
  ]

  // 选择 API 源
  const apiUrl = uapisPlatforms.includes(platformId)
    ? `https://uapis.cn/api/v1/misc/hotboard?type=${platformId}`
    : `https://api-hot.imsyy.com/${platformId}?cache=true`

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
      hotList = data.list.map(item => ({
        index: item.index,
        title: item.title,
        desc: item.extra?.desc || '',
        img: item.extra?.img || '',
        url: item.url || '',
        hot: item.hot_value || ''
      }))
      debug.log(`✅ 成功从 uapis.cn 获取 ${hotList.length} 条热搜数据`)
    }
    // uapis.cn 旧格式: { code: 200, data: [...], message: "success" }
    else if (data.code === 200 && Array.isArray(data.data)) {
      hotList = data.data
      debug.log(`✅ 成功从 uapis.cn 获取 ${hotList.length} 条热搜数据`)
    }
    // imsyy.top 格式: { data: [...], success: true }
    else if (data && data.data && Array.isArray(data.data)) {
      hotList = data.data
      debug.log(`✅ 成功从 imsyy.top 获取 ${hotList.length} 条热搜数据`)
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

      return {
        data: paginatedData,
        total: books.length,
        hasMore: end < books.length
      }
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
