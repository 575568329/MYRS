/**
 * 热搜数据服务 API
 * 通过 uTools preload 脚本获取各平台热搜
 */

import { DISPLAY_MODE } from '../config.js'

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
  { id: 'jianshu', name: '简书', icon: '✍️', category: '综合' }
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

  console.log(`🌐 正在获取 ${platformId} 热搜数据...`)
  console.log(`📄 第 ${page} 页，每页 ${pageSize} 条`)
  console.log(`🔧 运行环境: ${window.utools ? 'uTools' : '浏览器'}`)

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

  console.log(`📡 正在请求 API: ${apiUrl}`)

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

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
      console.log(`✅ 成功从 uapis.cn 获取 ${hotList.length} 条热搜数据`)
    }
    // uapis.cn 旧格式: { code: 200, data: [...], message: "success" }
    else if (data.code === 200 && Array.isArray(data.data)) {
      hotList = data.data
      console.log(`✅ 成功从 uapis.cn 获取 ${hotList.length} 条热搜数据`)
    }
    // imsyy.top 格式: { data: [...], success: true }
    else if (data && data.data && Array.isArray(data.data)) {
      hotList = data.data
      console.log(`✅ 成功从 imsyy.top 获取 ${hotList.length} 条热搜数据`)
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

    // 网络错误处理
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      throw new Error('网络请求失败，请检查网络连接')
    } else if (error.message.includes('CORS')) {
      throw new Error('跨域请求被阻止（建议在uTools中使用）')
    } else {
      throw error
    }
  }
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
