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

/**
 * 格式化数字显示
 * @param {number} num - 要格式化的数字
 * @returns {string} 格式化后的字符串
 * @example
 * formatNumber(1000) // "1K"
 * formatNumber(1500) // "1.5K"
 * formatNumber(1000000) // "1M"
 * formatNumber(1500000) // "1.5M"
 */
function formatNumber(num) {
  if (num === undefined || num === null || isNaN(num)) {
    return '0'
  }

  if (num < 1000) {
    return num.toString()
  } else if (num < 1000000) {
    return (num / 1000).toFixed(num % 1000 !== 0 ? 1 : 0) + 'K'
  } else if (num < 1000000000) {
    return (num / 1000000).toFixed(num % 1000000 !== 0 ? 1 : 0) + 'M'
  } else {
    return (num / 1000000000).toFixed(num % 1000000000 !== 0 ? 1 : 0) + 'B'
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
  { id: 'bilibili', name: 'B站', icon: 'ri-bilibili-line', category: '视频', alias: ["bz","bili","bilibili"] },
  { id: 'acfun', name: 'AcFun', icon: 'ri-movie-line', category: '视频', alias: ["ac"] },
  { id: 'weibo', name: '微博', icon: 'ri-weibo-line', category: '社交', alias: ["wb","weibo"] },
  { id: 'zhihu', name: '知乎', icon: 'ri-zhihu-line', category: '社交', alias: ["zh","zhihu"] },
  { id: 'zhihu-daily', name: '知乎日报', icon: 'ri-newspaper-line', category: '社交', alias: ["zhrb","daily"] },
  { id: 'douyin', name: '抖音', icon: 'ri-music-2-line', category: '视频', alias: ["dy","douyin"] },
  { id: 'kuaishou', name: '快手', icon: 'ri-camera-lens-line', category: '视频', alias: ["ks"] },
  { id: 'xiaohongshu', name: '小红书', icon: 'ri-heart-line', category: '社交', alias: ["xhs","rednote"] },
  { id: 'douban-movie', name: '豆瓣电影', icon: 'ri-movie-2-line', category: '娱乐', alias: ["db","douban"] },
  { id: 'douban-group', name: '豆瓣小组', icon: 'ri-team-line', category: '娱乐', alias: ["dbxz"] },
  { id: 'tieba', name: '贴吧', icon: 'ri-group-line', category: '社交', alias: ["tb","tieba"] },
  { id: 'hupu', name: '虎扑', icon: 'ri-basketball-line', category: '生活', alias: ["hupu","hp"] },
  { id: 'newsmth', name: '水木社区', icon: 'ri-chat-3-line', category: '社交', alias: ["smth","shuimu"] },
  { id: 'v2ex', name: 'V2EX', icon: 'ri-chat-smile-2-line', category: '科技', alias: ["v2ex"] },
  { id: '52pojie', name: '吾爱破解', icon: 'ri-lock-2-line', category: '科技', alias: ["52","pojie"] },
  { id: 'coolapk', name: '酷安', icon: 'ri-android-line', category: '科技', alias: ["coolapk","kuan"] },

  // 音乐
  { id: 'qq-music', name: 'QQ音乐', icon: 'ri-disc-line', category: '音乐', alias: ["qqyy","gequ"] },
  { id: 'netease-music', name: '网易云热歌', icon: 'ri-album-line', category: '音乐', alias: ["wyy","wangyiyun"] },

  // 新闻/资讯
  { id: 'baidu', name: '百度', icon: 'ri-search-2-line', category: '综合', alias: ["bd","baidu"] },
  { id: 'thepaper', name: '澎湃新闻', icon: 'ri-article-line', category: '资讯', alias: ["paper","pengpai"] },
  { id: 'toutiao', name: '今日头条', icon: 'ri-fire-line', category: '资讯', alias: ["tt","toutiao"] },
  { id: 'qq-news', name: '腾讯新闻', icon: 'ri-qq-line', category: '资讯', alias: ["qq"] },
  { id: 'sina', name: '新浪热搜', icon: 'ri-rss-line', category: '资讯', alias: ["xl","sina"] },
  { id: 'sina-news', name: '新浪新闻', icon: 'ri-rss-line', category: '资讯', alias: ["xlxw"] },
  { id: 'netease-news', name: '网易新闻', icon: 'ri-news-line', category: '资讯', alias: ["wy","wangyi"] },
  // { id: 'nytimes', name: '纽约时报', icon: 'ri-newspaper-line', category: '资讯', alias: ["nyt","niuyue"] },
  { id: 'huxiu', name: '虎嗅', icon: 'ri-lightbulb-line', category: '资讯', alias: ["huxiu","hx"] },
  { id: 'ifanr', name: '爱范儿', icon: 'ri-magic-line', category: '资讯', alias: ["ifanr","afr"] },

  // 技术/IT
  { id: 'sspai', name: '少数派', icon: 'ri-tools-line', category: '科技', alias: ["sspai","sp"] },
  { id: 'ithome', name: 'IT之家', icon: 'ri-computer-line', category: '科技', alias: ["ithome","it"] },
  { id: 'ithome-xijiayi', name: 'IT之家·喜加一', icon: 'ri-gamepad-line', category: '科技', alias: ["xjy","xijiayi"] },
  { id: 'juejin', name: '掘金', icon: 'ri-code-s-slash-line', category: '科技', alias: ["jj","juejin"] },
  { id: 'jianshu', name: '简书', icon: 'ri-quill-pen-line', category: '综合', alias: ["js","jianshu"] },
  { id: 'guokr', name: '果壳', icon: 'ri-flask-line', category: '科技', alias: ["gk","guokr"] },
  { id: '36kr', name: '36氪', icon: 'ri-money-dollar-circle-line', category: '科技', alias: ["kr","36kr"] },
  { id: '51cto', name: '51CTO', icon: 'ri-terminal-line', category: '科技', alias: ["cto"] },
  { id: 'csdn', name: 'CSDN', icon: 'ri-code-box-line', category: '科技', alias: ["csdn"] },
  { id: 'nodeseek', name: 'NodeSeek', icon: 'ri-nodejs-line', category: '科技', alias: ["ns","nodeseek"] },
  { id: 'geekpark', name: '极客公园', icon: 'ri-rocket-2-line', category: '科技', alias: ["geekpark","jike"] },
  // 以下平台本地 DailyHotApi 上游源当前网络环境不可用（拒连/超时/证书过期），恢复后取消注释即可
  // { id: 'linuxdo', name: 'LinuxDo', icon: 'ri-terminal-box-line', category: '科技', alias: ["ld","linuxdo"] },
  // { id: 'hostloc', name: 'HostLoc', icon: 'ri-server-line', category: '科技', alias: ["hostloc"] },
  { id: 'dgtle', name: '数字尾巴', icon: 'ri-smartphone-line', category: '科技', alias: ["dgtle","shuzi"] },

  // 游戏
  { id: 'lol', name: '英雄联盟', icon: 'ri-sword-line', category: '游戏', alias: ["lol","yx"] },
  { id: 'ngabbs', name: 'NGA', icon: 'ri-gamepad-line', category: '游戏', alias: ["nga"] },
  // 以下游戏社区上游源当前不可用（同上，网络环境原因）
  // { id: 'miyoushe', name: '米游社', icon: 'ri-game-line', category: '游戏', alias: ["mys","miyou"] },
  // { id: 'yystv', name: '游研社', icon: 'ri-sword-line', category: '游戏', alias: ["yys","youyan"] },
  // { id: 'gameres', name: '游资网', icon: 'ri-game-line', category: '游戏', alias: ["yzw","gameres"] },
  { id: 'epic-free', name: 'Epic免费游戏', icon: 'ri-gamepad-line', category: '游戏', alias: ["epic","free"] },
  { id: 'genshin', name: '原神', icon: 'ri-star-smile-line', category: '游戏', alias: ["ys","yuanshen"] },
  { id: 'honkai', name: '崩坏3', icon: 'ri-planet-line', category: '游戏', alias: ["bh3","benghuai"] },
  { id: 'starrail', name: '星穹铁道', icon: 'ri-rocket-line', category: '游戏', alias: ["sr","xingqiong"] },

  // 金融/股票
  { id: 'stock-hot', name: '热门股票', icon: 'ri-stock-line', category: '金融', alias: ["gp","gupiao"] },
  { id: 'stock-sh', name: '上证指数', icon: 'ri-funds-line', category: '金融', alias: ["szzs","shangzheng"] },
  { id: 'stock-tech', name: '科技股', icon: 'ri-cpu-line', category: '金融', alias: ["kjg","tech"] },
  { id: 'cls-telegraph', name: '财联社电报', icon: 'ri-broadcast-line', category: '金融', alias: ["cls","dianbao"] },

  // 开发者工具
  { id: 'github-trending', name: 'GitHub热榜', icon: 'ri-github-fill', category: '科技', alias: ["gh","github"] },
  { id: 'hacker-news', name: 'Hacker News', icon: 'ri-hacker-news-line', category: '科技', alias: ["hn","hackernews"] },
  { id: 'product-hunt', name: 'Product Hunt', icon: 'ri-lightbulb-flash-line', category: '科技', alias: ["ph"] },

  // 其他
  { id: 'weread', name: '微信读书', icon: 'ri-book-read-line', category: '阅读', alias: ["weread","wxds"] },
  { id: 'smzdm', name: '什么值得买', icon: 'ri-shopping-bag-3-line', category: '生活', alias: ["smzdm","zdm"] },
  { id: 'history', name: '历史上的今天', icon: 'ri-calendar-line', category: '综合', alias: ["ls","lishi"] },
  // { id: 'earthquake', name: '地震速报', icon: 'ri-alert-line', category: '综合', alias: ["dizhen","earthquake"] },
  { id: 'weatheralarm', name: '气象预警', icon: 'ri-cloudy-line', category: '综合', alias: ["qxyj","tianqi"] },
  { id: 'hellogithub', name: 'HelloGitHub', icon: 'ri-github-line', category: '科技', alias: ["hg","hellogithub"] },
  { id: 'artic', name: '芝加哥艺术学院', icon: 'ri-building-2-line', category: '艺术', alias: ["artic","meishu"] },
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
 * 平台ID → 本地 DailyHotApi 路由名的映射（绝大多数平台两者一致）
 */
const LOCAL_API_ROUTE_ALIAS = {
  'hacker-news': 'hackernews',
  'product-hunt': 'producthunt'
}

/**
 * 描述清洗管线：处理各源返回的富文本脏数据
 * - HTML 标签（爱范儿/AcFun：<p>、<a> 等）
 * - HTML 实体（吾爱破解/水木社区/爱范儿：&gt; &quot; &amp; 等）
 * - BBCode（吾爱破解：[md][/md][hr][mw_shl_code=...] 等）
 * - Markdown 语法（吾爱破解：#### 标题、> 引用、**加粗**、[文本](链接)、--- 分隔线）
 * 不用 v-html 渲染：外部内容有 XSS 风险，且这些源码本就不是可渲染的 HTML
 */
function stripHtml(s) {
  if (typeof s !== 'string') return s || ''
  return s
    // 1. HTML 标签
    .replace(/<[^>]+>/g, ' ')
    // 2. HTML 实体解码
    .replace(/&nbsp;/g, ' ')
    .replace(/&gt;/g, '>').replace(/&lt;/g, '<')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
    // 3. Markdown 链接保文本（先于 BBCode，避免链接文字被误删）
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '$1')
    // 4. BBCode 标签（ASCII 字母开头的方括号标记）
    .replace(/\[\/?[a-zA-Z][^\]]*\]/g, ' ')
    // 5. Markdown 标题符（##+ 开头的标题，单个 # 保留给话题标签）
    .replace(/#{2,6}\s*/g, '')
    // 6. Markdown 引用符（解码后的 "> "）
    .replace(/(^|\s)>\s?/g, '$1')
    // 7. 分隔线
    .replace(/(^|\s)-{3,}(\s|$)/g, ' ')
    // 8. 加粗/斜体标记
    .replace(/\*{1,2}([^*\n]{1,120}?)\*{1,2}/g, '$1')
    // 9. 空白折叠
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * 归一化 DailyHotApi 格式：{ code: 200, data: [{ id, title, desc, hot, url, mobileUrl, cover? }] }
 * 适用于本地服务与 api-hot.imsyy.com 公共实例（同源项目）
 * @param {Object} data - API 返回的原始数据
 * @param {string} platformId - 平台ID
 * @returns {Array} 统一格式的热搜列表
 */
function normalizeDailyHotData(data, platformId) {
  if (!data || !Array.isArray(data.data)) {
    throw new Error('API 返回数据格式不正确')
  }
  // 平台中文名：作者等于平台名时（如果壳恒为"果壳"）无信息量，不并入描述
  const platformName = (PLATFORMS.find(p => p.id === platformId) || {}).name
  return data.data.map((item, index) => {
    // 标题清洗：部分源（如 uapis 酷安）的 title 混入 HTML 话题标签
    const title = stripHtml(item.title || '')
    // url 兜底：主链接缺失时回退移动版链接
    let url = item.url || item.mobileUrl || ''
    // 豆瓣电影平台使用豆瓣搜索链接
    if (platformId === 'douban-movie' && title) {
      url = `https://search.douban.com/movie/subject_search?search_text=${encodeURIComponent(title)}`
    }
    // 作者有区分度才并入（B站UP主/36氪作者等）；等于平台名的丢弃
    const author = item.author && item.author !== platformName ? item.author : ''
    return {
      index: index + 1,
      title: title,
      // 作者并入描述前缀，与简介一起展示；HTML 标签清洗
      desc: stripHtml([author, item.desc].filter(Boolean).join(' · ')),
      img: item.cover || '',
      url: url,
      mobileUrl: item.mobileUrl || url,
      hot: item.hot ?? ''
    }
  })
}

/**
 * 归一化 uapis.cn 格式（兼容新旧两种返回结构）
 * @param {Object} data - API 返回的原始数据
 * @param {string} platformId - 平台ID
 * @returns {Array} 统一格式的热搜列表
 */
function normalizeUapisData(data, platformId) {
  // 新格式: { type: "...", list: [...], update_time: "..." }
  if (data && Array.isArray(data.list)) {
    return data.list.map(item => {
      // 标题清洗：uapis 部分源（如酷安）title 混入 HTML 话题标签
      const title = stripHtml(item.title || '')
      const url = (platformId === 'douban-movie')
        ? `https://search.douban.com/movie/subject_search?search_text=${encodeURIComponent(title)}`
        : (item.url || '')
      // 封面兜底：部分源封面在 extra.cover / 顶层 cover
      let img = item.extra?.img || item.extra?.cover || item.cover || ''
      // 小红书热榜的封面统一是官方"热"字角标占位图，无信息量，不展示（真封面来自笔记图床时不在此列）
      if (platformId === 'xiaohongshu' && img.includes('picasso-static.xiaohongshu.com')) {
        img = ''
      }
      return {
        index: item.index,
        title: title,
        // 歌曲类源（QQ音乐）歌手名在 extra.artist_names，无独立 desc
        desc: stripHtml(item.extra?.desc || item.extra?.artist_names || ''),
        // 封面兜底：部分源封面在 extra.cover / 顶层 cover
        img: img,
        url: url,
        hot: item.hot_value || ''
      }
    })
  }
  // 旧格式: { code: 200, data: [...], message: "success" }
  if (data && data.code === 200 && Array.isArray(data.data)) {
    return data.data.map(item => {
      const cleaned = { ...item, desc: stripHtml(item.desc || '') }
      if (platformId === 'douban-movie' && item.title) {
        return {
          ...cleaned,
          url: `https://search.douban.com/movie/subject_search?search_text=${encodeURIComponent(item.title)}`
        }
      }
      return cleaned
    })
  }
  throw new Error('API 返回数据格式不正确')
}

/**
 * 获取网易云音乐热歌榜（官方歌单老接口，热歌榜 id 3778678，无需签名）
 * @param {number} page - 页码
 * @param {number} pageSize - 每页条数
 * @returns {Promise<Object>} 热歌数据
 */
async function getNeteaseMusicData(page, pageSize) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API.REQUEST_TIMEOUT + 4000)
  try {
    const response = await fetch('https://music.163.com/api/playlist/detail?id=3778678', {
      method: 'GET',
      signal: controller.signal
    })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    const result = await response.json()
    const tracks = result?.result?.tracks
    if (!Array.isArray(tracks) || tracks.length === 0) {
      throw new Error('网易云返回数据格式不正确')
    }
    const hotList = tracks.map((track, index) => ({
      index: index + 1,
      title: track.name || '',
      desc: [
        Array.isArray(track.artists) ? track.artists.map(a => a.name).join('/') : '',
        track.album?.name || ''
      ].filter(Boolean).join(' · '),
      img: track.album?.picUrl || '',
      url: track.id ? `https://music.163.com/song?id=${track.id}` : 'https://music.163.com/',
      mobileUrl: track.id ? `https://music.163.com/song?id=${track.id}` : 'https://music.163.com/',
      hot: ''
    }))
    debug.log(`✅ 成功获取网易云热歌榜 ${hotList.length} 首`)
    const start = (page - 1) * pageSize
    const end = start + pageSize
    return {
      data: hotList.slice(start, end),
      total: hotList.length,
      hasMore: end < hotList.length,
      source: 'netease'
    }
  } catch (error) {
    // 与财联社/股票平台一致：区分跨域失败给出明确提示
    if (error.message && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
      throw new Error('跨域请求被阻止（建议在uTools中使用）')
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * 纯 JS SHA1 / MD5（财联社 sign 用；渲染进程拿不到 node:crypto，Web Crypto 又无 MD5）
 * 输入经 UTF-8 编码，返回小写 hex
 */
function jsSha1(str) {
  const msg = unescape(encodeURIComponent(str))
  const ml = msg.length
  const words = []
  for (let i = 0; i < ml; i++) words[i >> 2] = (words[i >> 2] || 0) | msg.charCodeAt(i) << (24 - (i % 4) * 8)
  words[ml >> 2] = (words[ml >> 2] || 0) | 0x80 << (24 - (ml % 4) * 8)
  const n = (((ml + 8) >> 6) + 1) * 16
  for (let i = 0; i < n; i++) words[i] = words[i] || 0
  words[n - 1] = ml * 8
  let h0 = 0x67452301, h1 = 0xEFCDAB89, h2 = 0x98BADCFE, h3 = 0x10325476, h4 = 0xC3D2E1F0
  const w = new Array(80)
  for (let i = 0; i < n; i += 16) {
    for (let j = 0; j < 16; j++) w[j] = words[i + j]
    for (let j = 16; j < 80; j++) {
      const x = w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16]
      w[j] = (x << 1) | (x >>> 31)
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4
    for (let j = 0; j < 80; j++) {
      let f, k
      if (j < 20) { f = (b & c) | (~b & d); k = 0x5A827999 }
      else if (j < 40) { f = b ^ c ^ d; k = 0x6ED9EBA1 }
      else if (j < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8F1BBCDC }
      else { f = b ^ c ^ d; k = 0xCA62C1D6 }
      const t = (((a << 5) | (a >>> 27)) + f + e + k + (w[j] | 0)) | 0
      e = d; d = c; c = (b << 30) | (b >>> 2); b = a; a = t
    }
    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0; h4 = (h4 + e) | 0
  }
  return [h0, h1, h2, h3, h4].map(x => (x >>> 0).toString(16).padStart(8, '0')).join('')
}

function jsMd5(str) {
  // 经典紧凑实现（Joseph Myers 公共域版本改写），按小端字节序输出 hex
  const rl = (n, c) => (n << c) | (n >>> (32 - c))
  const ad = (x, y) => (x + y) | 0
  const cmn = (q, a, b, x, s, t) => rl(ad(ad(a, q), ad(x, t)), s) + b | 0
  const ff = (a, b, c, d, x, s, t) => cmn((b & c) | (~b & d), a, b, x, s, t)
  const gg = (a, b, c, d, x, s, t) => cmn((b & d) | (c & ~d), a, b, x, s, t)
  const hh = (a, b, c, d, x, s, t) => cmn(b ^ c ^ d, a, b, x, s, t)
  const ii = (a, b, c, d, x, s, t) => cmn(c ^ (b | ~d), a, b, x, s, t)
  const md5cycle = (x, k) => {
    let [a, b, c, d] = x
    a = ff(a, b, c, d, k[0], 7, -680876936); d = ff(d, a, b, c, k[1], 12, -389564586); c = ff(c, d, a, b, k[2], 17, 606105819); b = ff(b, c, d, a, k[3], 22, -1044525330)
    a = ff(a, b, c, d, k[4], 7, -176418897); d = ff(d, a, b, c, k[5], 12, 1200080426); c = ff(c, d, a, b, k[6], 17, -1473231341); b = ff(b, c, d, a, k[7], 22, -45705983)
    a = ff(a, b, c, d, k[8], 7, 1770035416); d = ff(d, a, b, c, k[9], 12, -1958414417); c = ff(c, d, a, b, k[10], 17, -42063); b = ff(b, c, d, a, k[11], 22, -1990404162)
    a = ff(a, b, c, d, k[12], 7, 1804603682); d = ff(d, a, b, c, k[13], 12, -40341101); c = ff(c, d, a, b, k[14], 17, -1502002290); b = ff(b, c, d, a, k[15], 22, 1236535329)
    a = gg(a, b, c, d, k[1], 5, -165796510); d = gg(d, a, b, c, k[6], 9, -1069501632); c = gg(c, d, a, b, k[11], 14, 643717713); b = gg(b, c, d, a, k[0], 20, -373897302)
    a = gg(a, b, c, d, k[5], 5, -701558691); d = gg(d, a, b, c, k[10], 9, 38016083); c = gg(c, d, a, b, k[15], 14, -660478335); b = gg(b, c, d, a, k[4], 20, -405537848)
    a = gg(a, b, c, d, k[9], 5, 568446438); d = gg(d, a, b, c, k[14], 9, -1019803690); c = gg(c, d, a, b, k[3], 14, -187363961); b = gg(b, c, d, a, k[8], 20, 1163531501)
    a = gg(a, b, c, d, k[13], 5, -1444681467); d = gg(d, a, b, c, k[2], 9, -51403784); c = gg(c, d, a, b, k[7], 14, 1735328473); b = gg(b, c, d, a, k[12], 20, -1926607734)
    a = hh(a, b, c, d, k[5], 4, -378558); d = hh(d, a, b, c, k[8], 11, -2022574463); c = hh(c, d, a, b, k[11], 16, 1839030562); b = hh(b, c, d, a, k[14], 23, -35309556)
    a = hh(a, b, c, d, k[1], 4, -1530992060); d = hh(d, a, b, c, k[4], 11, 1272893353); c = hh(c, d, a, b, k[7], 16, -155497632); b = hh(b, c, d, a, k[10], 23, -1094730640)
    a = hh(a, b, c, d, k[13], 4, 681279174); d = hh(d, a, b, c, k[0], 11, -358537222); c = hh(c, d, a, b, k[3], 16, -722521979); b = hh(b, c, d, a, k[6], 23, 76029189)
    a = hh(a, b, c, d, k[9], 4, -640364487); d = hh(d, a, b, c, k[12], 11, -421815835); c = hh(c, d, a, b, k[15], 16, 530742520); b = hh(b, c, d, a, k[2], 23, -995338651)
    a = ii(a, b, c, d, k[0], 6, -198630844); d = ii(d, a, b, c, k[7], 10, 1126891415); c = ii(c, d, a, b, k[14], 15, -1416354905); b = ii(b, c, d, a, k[5], 21, -57434055)
    a = ii(a, b, c, d, k[12], 6, 1700485571); d = ii(d, a, b, c, k[3], 10, -1894986606); c = ii(c, d, a, b, k[10], 15, -1051523); b = ii(b, c, d, a, k[1], 21, -2054922799)
    a = ii(a, b, c, d, k[8], 6, 1873313359); d = ii(d, a, b, c, k[15], 10, -30611744); c = ii(c, d, a, b, k[6], 15, -1560198380); b = ii(b, c, d, a, k[13], 21, 1309151649)
    a = ii(a, b, c, d, k[4], 6, -145523070); d = ii(d, a, b, c, k[11], 10, -1120210379); c = ii(c, d, a, b, k[2], 15, 718787259); b = ii(b, c, d, a, k[9], 21, -343485551)
    x[0] = ad(a, x[0]); x[1] = ad(b, x[1]); x[2] = ad(c, x[2]); x[3] = ad(d, x[3])
  }
  const md5blk = (s) => {
    const blks = []
    for (let i = 0; i < 64; i += 4) {
      blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24)
    }
    return blks
  }
  const md51 = (s) => {
    const n = s.length
    const state = [1732584193, -271733879, -1732584194, 271733878]
    let i
    for (i = 64; i <= n; i += 64) md5cycle(state, md5blk(s.substring(i - 64, i)))
    s = s.substring(i - 64)
    const tail = new Array(16).fill(0)
    for (i = 0; i < s.length; i++) tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3)
    tail[i >> 2] |= 0x80 << ((i % 4) << 3)
    if (i > 55) {
      md5cycle(state, tail)
      for (i = 0; i < 16; i++) tail[i] = 0
    }
    tail[14] = n * 8
    md5cycle(state, tail)
    return state
  }
  const rhex = (n) => {
    let s = ''
    for (let j = 0; j < 4; j++) {
      s += ((n >> (j * 8 + 4)) & 0x0F).toString(16) + ((n >> (j * 8)) & 0x0F).toString(16)
    }
    return s
  }
  return md51(unescape(encodeURIComponent(str))).map(rhex).join('')
}

/**
 * 获取财联社电报（cls.cn 新接口 /v1/roll/get_roll_list，需 sign 签名）
 * 签名算法逆向自 cls.cn 前端：参数按 key 字典序拼接 query string → sha1 → md5
 * 注意：接口无 CORS 头，uTools 可直连；纯浏览器 dev 会跨域失败（与股票平台行为一致）
 * @param {number} page - 页码
 * @param {number} pageSize - 每页条数
 * @returns {Promise<Object>} 电报数据
 */
async function getClsTelegraphData(page, pageSize) {
  const buildSign = (params) => {
    const qs = Object.keys(params).sort().map(k => `${k}=${params[k] ?? ''}`).join('&')
    return jsMd5(jsSha1(qs))
  }
  const baseParams = { app: 'CailianpressWeb', category: '', last_time: '', os: 'web', refresh_type: 1, rn: 20, sv: '8.7.9' }
  // 翻页：以当前页最后一条的 ctime 作为 last_time 向前翻（第 1 页 last_time 为空）
  // 最多翻 30 页（600 条）防接口异常时死循环；游标不推进也立即停止
  const collectPages = async (targetEnd) => {
    const items = []
    let lastTime = ''
    for (let round = 0; round < 30 && items.length < targetEnd; round++) {
      const params = { ...baseParams, last_time: lastTime }
      const query = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&')
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), API.REQUEST_TIMEOUT + 4000)
      try {
        const response = await fetch(`https://www.cls.cn/v1/roll/get_roll_list?${query}&sign=${buildSign(params)}`, {
          method: 'GET',
          signal: controller.signal
        })
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        const result = await response.json()
        const roll = result?.data?.roll_data
        if (!Array.isArray(roll) || roll.length === 0) break
        items.push(...roll)
        const nextTime = roll[roll.length - 1].ctime
        if (!nextTime || nextTime === lastTime) break
        lastTime = nextTime
      } finally {
        clearTimeout(timeoutId)
      }
    }
    return items
  }

  try {
    const targetEnd = page * pageSize
    const roll = await collectPages(targetEnd)
    if (roll.length === 0) {
      throw new Error('财联社返回数据格式不正确')
    }
    const hotList = roll.map((item, index) => {
      const title = stripHtml(item.title || '')
      const content = stripHtml(item.content || item.brief || '')
      return {
        index: index + 1,
        title: title || content.slice(0, 50),
        desc: content,
        img: item.img || '',
        url: item.shareurl || (item.id ? `https://www.cls.cn/detail/${item.id}` : 'https://www.cls.cn/telegraph'),
        mobileUrl: item.shareurl || (item.id ? `https://www.cls.cn/detail/${item.id}` : 'https://www.cls.cn/telegraph'),
        hot: item.reading_num || ''
      }
    })
    debug.log(`✅ 成功获取财联社电报 ${hotList.length} 条`)
    const start = (page - 1) * pageSize
    const end = start + pageSize
    return {
      data: hotList.slice(start, end),
      total: hotList.length,
      hasMore: end < hotList.length,
      source: 'cls'
    }
  } catch (error) {
    // 区分跨域失败与接口失败，给出和股票平台一致的提示
    if (error.message && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
      throw new Error('跨域请求被阻止（建议在uTools中使用）')
    }
    throw error
  }
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
  // 特殊处理芝加哥艺术学院（艺术品API）
  if (platformId === 'artic') {
    return await getArticData(page, pageSize)
  }

  // 特殊处理 Epic 免费游戏
  if (platformId === 'epic-free') {
    return await getEpicFreeData(page, pageSize)
  }

  // 特殊处理股票平台
  if (platformId.startsWith('stock-')) {
    return await getStockData(platformId, page, pageSize)
  }

  // 特殊处理开发者工具平台
  if (platformId === 'github-trending') {
    return await getGitHubTrendingData(page, pageSize)
  }
  if (platformId === 'hacker-news') {
    return await getHackerNewsData(page, pageSize)
  }
  if (platformId === 'product-hunt') {
    return await getProductHuntData(page, pageSize)
  }

  // 特殊处理网易云热歌榜（music.163.com 老接口无 CORS 头：uTools 可直连，纯浏览器 dev 会跨域失败，与股票平台行为一致）
  if (platformId === 'netease-music') {
    return await getNeteaseMusicData(page, pageSize)
  }

  // 特殊处理财联社电报（接口需 sign 签名：md5(sha1(参数字典序拼接))，逆向自 cls.cn 前端；无 CORS 头，行为同上）
  if (platformId === 'cls-telegraph') {
    return await getClsTelegraphData(page, pageSize)
  }

  // uapis.cn 支持的平台（根据官方文档）
  const uapisPlatforms = [
    'baidu', 'weibo', 'zhihu', 'douyin', 'bilibili', 'kuaishou', 'xiaohongshu', 'qq-music',
    'toutiao', 'tieba', 'hupu', 'douban-movie', 'douban-group', 'juejin', 'jianshu',
    'ithome', 'ithome-xijiayi', 'csdn', 'v2ex', 'sspai', 'coolapk',
    'thepaper', 'qq-news', 'sina', 'sina-news', 'netease-news', 'huxiu', 'ifanr',
    'acfun', 'miyoushe', 'genshin', 'honkai', 'starrail', 'lol', 'guokr', '51cto',
    'nodeseek', '52pojie', 'weread', 'hellogithub', 'zhihu-daily', 'ngabbs', 'dgtle', 'weatheralarm'
  ]

  // 数据源链：本地 DailyHotApi → uapis.cn → api-hot.imsyy.com 公共实例
  // 本地服务由 preload 启动（uTools 环境）；纯浏览器开发环境下不可用会自动跳过
  const platformTimeout = API.PLATFORM_TIMEOUT[platformId] || API.REQUEST_TIMEOUT
  const sources = [
    {
      name: 'local',
      available: true,
      url: `${API.LOCAL_API_BASE}/${LOCAL_API_ROUTE_ALIAS[platformId] || platformId}?cache=true`,
      // 本地服务命中冷缓存时会实时请求上游站点，超时留出额外余量
      timeout: platformTimeout + 4000,
      normalize: normalizeDailyHotData
    },
    {
      name: 'uapis',
      available: uapisPlatforms.includes(platformId),
      url: `https://uapis.cn/api/v1/misc/hotboard?type=${platformId}`,
      timeout: platformTimeout,
      normalize: normalizeUapisData
    },
    {
      name: 'imsyy',
      available: true,
      url: `https://api-hot.imsyy.com/${platformId}?cache=true`,
      timeout: platformTimeout + 4000,
      normalize: normalizeDailyHotData
    }
  ]

  debug.log(`⏱️ 超时配置:`, {
    platform: platformId,
    platformTimeout: API.PLATFORM_TIMEOUT[platformId],
    defaultTimeout: API.REQUEST_TIMEOUT,
    finalTimeout: platformTimeout
  })

  let hotList = null
  let usedSource = null
  let lastError = null

  for (const source of sources) {
    if (source.available === false) continue
    debug.log(`📡 正在请求 API (${source.name}): ${source.url}`)
    try {
      // 使用 AbortController 实现超时控制
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), source.timeout)

      const response = await fetch(source.url, {
        method: 'GET',
        // 注意：GET 请求不携带 Content-Type —— 该头会把跨域请求升级为 CORS 预检，
        // 大量第三方接口（腾讯股票/60s早报等）不支持 OPTIONS 预检会直接失败
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      hotList = source.normalize(data, platformId)
      usedSource = source.name
      debug.log(`✅ 成功从 ${source.name} 获取 ${hotList.length} 条热搜数据`)
      break
    } catch (error) {
      lastError = error
      debug.warn(`⚠️ 数据源 ${source.name} 请求失败: ${error.message}，尝试下一个数据源...`)
    }
  }

  // 所有数据源均失败
  if (!hotList) {
    console.error('❌ 请求失败(所有数据源):', lastError)
    if (lastError && lastError.name === 'AbortError') {
      throw new Error('请求超时')
    } else if (lastError && (lastError.message.includes('Failed to fetch') || lastError.message.includes('NetworkError'))) {
      throw new Error('网络请求失败，请检查网络连接')
    } else if (lastError && lastError.message.includes('CORS')) {
      throw new Error('跨域请求被阻止（建议在uTools中使用）')
    } else {
      throw lastError || new Error('所有数据源均请求失败')
    }
  }

  // 简单分页处理
  const start = (page - 1) * pageSize
  const end = start + pageSize
  const paginatedData = hotList.slice(start, end)

  return {
    data: paginatedData,
    total: hotList.length,
    hasMore: end < hotList.length,
    source: usedSource
  }
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

      // 构建价格和免费时间信息（始终显示）
      let priceInfo = ''
      if (game.is_free_now) {
        priceInfo = '🎁 现免费'
      } else {
        // 提取日期部分（月-日）并简化显示
        const startDate = game.free_start ? game.free_start.substring(5, 10).replace(/\//g, '/') : ''
        const endDate = game.free_end ? game.free_end.substring(5, 10).replace(/\//g, '/') : ''
        if (startDate && endDate) {
          priceInfo = `${startDate}起免费`
        }
      }

      if (game.original_price_desc) {
        priceInfo += ` (原价${game.original_price_desc})`
      }

      // 将免费时间信息添加到描述的末尾
      if (descParts.length > 0) {
        descParts.push(priceInfo)
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
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
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
 * 获取 GitHub Trending 数据
 * @param {number} page - 页码
 * @param {number} pageSize - 每页数量
 * @returns {Promise<Object>} GitHub热榜数据
 */
async function getGitHubTrendingData(page, pageSize) {
  const cacheKey = `page_${page}`
  const cacheTTL = 60 * 60 * 1000 // 缓存1小时

  // 1. 先检查缓存
  const cachedData = cacheManager.get('github-trending', cacheKey)
  if (cachedData) {
    debug.log(`📦 [缓存命中] GitHub Trending返回缓存数据`)
    return cachedData
  }

  const timeout = API.REQUEST_TIMEOUT

  debug.log(`🐙 正在获取 GitHub Trending...`)

  try {
    // 使用 AbortController 实现超时控制
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    // 获取今天的日期(最近7天)
    const today = new Date()
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const dateStr = sevenDaysAgo.toISOString().split('T')[0]

    // 使用 GitHub 官方 Search API(按stars排序的最近项目)
    const apiUrl = `https://api.github.com/search/repositories?q=created:>${dateStr}&sort=stars&order=desc&per_page=50`

    debug.log(`📡 正在请求 GitHub API: ${apiUrl}`)

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/vnd.github.v3+json'
      },
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const result = await response.json()

    if (!result.items || !Array.isArray(result.items)) {
      throw new Error('API 返回数据格式不正确')
    }

    // 转换为统一格式
    const hotList = result.items.map((repo, index) => {
      // 构建描述信息
      const descParts = []

      // 添加描述(如果有)
      if (repo.description) {
        descParts.push(repo.description.substring(0, 100))
      }

      // 添加语言信息
      if (repo.language) {
        descParts.push(`💻 ${repo.language}`)
      }

      // 添加 stars 数量
      descParts.push(`⭐ ${formatNumber(repo.stargazers_count)}`)

      // 添加 forks 数量(如果有)
      if (repo.forks_count > 0) {
        descParts.push(`🍴 ${formatNumber(repo.forks_count)}`)
      }

      // 添加 license 信息(如果有)
      if (repo.license && repo.license.name) {
        descParts.push(`📄 ${repo.license.name}`)
      }

      // 添加 topics 标签(如果有)
      if (repo.topics && repo.topics.length > 0) {
        const topTopics = repo.topics.slice(0, 3).map(t => `#${t}`).join(' ')
        descParts.push(`🏷️ ${topTopics}`)
      }

      return {
        id: repo.id || `github_${index}`,
        index: index + 1,
        title: repo.full_name || repo.name || '未知项目',
        desc: descParts.join(' · ') || '暂无描述',
        url: repo.html_url || `https://github.com/${repo.full_name}`,
        img: repo.owner?.avatar_url || 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
        hot: `🌟 ${formatNumber(repo.stargazers_count)}`,
        extra: {
          fullName: repo.full_name,
          name: repo.name,
          language: repo.language,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          description: repo.description,
          license: repo.license?.name || null,
          topics: repo.topics || [],
          openIssues: repo.open_issues_count || 0,
          createdAt: repo.created_at,
          updatedAt: repo.updated_at,
          ownerLogin: repo.owner?.login,
          ownerType: repo.owner?.type
        }
      }
    })

    debug.log(`✅ 成功获取 ${hotList.length} 个 GitHub 热门项目`)

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
    cacheManager.set('github-trending', cacheKey, resultData, cacheTTL)
    return resultData
  } catch (error) {
    debug.warn(`⚠️ 获取 GitHub Trending 失败:`, error.message)

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
 * 获取 Hacker News 数据
 * @param {number} page - 页码
 * @param {number} pageSize - 每页数量
 * @returns {Promise<Object>} Hacker News数据
 */
async function getHackerNewsData(page, pageSize) {
  const cacheKey = `page_${page}`
  const cacheTTL = 30 * 60 * 1000 // 缓存30分钟

  // 1. 先检查缓存
  const cachedData = cacheManager.get('hacker-news', cacheKey)
  if (cachedData) {
    debug.log(`📦 [缓存命中] Hacker News返回缓存数据`)
    return cachedData
  }

  const timeout = API.REQUEST_TIMEOUT

  debug.log(`📰 正在获取 Hacker News...`)

  try {
    // 使用 AbortController 实现超时控制
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    // 使用 Hacker News 官方 API
    const apiUrl = 'https://hacker-news.firebaseio.com/v0/topstories.json'

    debug.log(`📡 正在请求 API: ${apiUrl}`)

    const response = await fetch(apiUrl, {
      method: 'GET',
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const storyIds = await response.json()

    if (!Array.isArray(storyIds)) {
      throw new Error('API 返回数据格式不正确')
    }

    // 获取前50个故事的详细信息
    const ids = storyIds.slice(0, 50)
    const storyPromises = ids.map(id =>
      fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)
        .then(res => res.json())
        .catch(() => null)
    )

    const stories = await Promise.all(storyPromises)
    const validStories = stories.filter(s => s && s.title)

    // 转换为统一格式
    const hotList = validStories.map((story, index) => {
      // 构建描述信息
      const descParts = []

      // 添加文章文本内容（如果有）- 限制在200字符内
      if (story.text) {
        // 移除 HTML 标签
        const textContent = story.text
          .replace(/<[^>]*>/g, '')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&#x27;/g, "'")
          .trim()

        if (textContent.length > 0) {
          descParts.push(textContent.substring(0, 200) + (textContent.length > 200 ? '...' : ''))
        }
      }

      // 添加作者信息
      if (story.by) descParts.push(`👤 ${story.by}`)

      // 添加分数
      if (story.score) descParts.push(`👍 ${story.score}`)

      // 添加评论数
      if (story.descendants) descParts.push(`💬 ${story.descendants}`)

      // 添加域名（如果有外部链接）
      if (story.url) {
        try {
          const urlObj = new URL(story.url)
          descParts.push(`🔗 ${urlObj.hostname}`)
        } catch (e) {
          // URL 解析失败，忽略
        }
      }

      return {
        id: `hn_${story.id}`,
        index: index + 1,
        title: story.title || '未知标题',
        desc: descParts.join(' · ') || '',
        url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
        img: 'https://news.ycombinator.com/y18.svg',
        hot: `👍 ${story.score || 0}`,
        extra: {
          by: story.by,
          score: story.score,
          descendants: story.descendants,
          time: story.time,
          text: story.text, // 保存原始文本
          url: story.url
        }
      }
    })

    debug.log(`✅ 成功获取 ${hotList.length} 条 Hacker News`)

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
    cacheManager.set('hacker-news', cacheKey, resultData, cacheTTL)
    return resultData
  } catch (error) {
    debug.warn(`⚠️ 获取 Hacker News 失败:`, error.message)

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
 * 获取 Product Hunt 数据
 * @param {number} page - 页码
 * @param {number} pageSize - 每页数量
 * @returns {Promise<Object>} Product Hunt数据
 */
async function getProductHuntData(page, pageSize) {
  const cacheKey = `page_${page}`
  const cacheTTL = 60 * 60 * 1000 // 缓存1小时

  // 1. 先检查缓存
  const cachedData = cacheManager.get('product-hunt', cacheKey)
  if (cachedData) {
    debug.log(`📦 [缓存命中] Product Hunt返回缓存数据`)
    return cachedData
  }

  const timeout = API.REQUEST_TIMEOUT

  debug.log(`🚀 正在获取 Product Hunt...`)

  try {
    // 使用 AbortController 实现超时控制
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    // Product Hunt API 需要授权，我们返回引导信息
    debug.log(`📡 Product Hunt 需要API密钥，返回引导信息`)

    clearTimeout(timeoutId)

    // 返回引导信息
    const hotList = [
      {
        id: 'ph_1',
        index: 1,
        title: '🎯 Product Hunt',
        desc: '发现最新的科技产品和创业项目 · 每日更新',
        url: 'https://www.producthunt.com',
        img: 'https://ph-static.imgix.net/product-hunt-logo.png',
        hot: '🔥 热门',
        extra: {
          tagline: '发现最新的科技产品',
          votesCount: 1000
        }
      },
      {
        id: 'ph_2',
        index: 2,
        title: '💡 如何使用 Product Hunt？',
        desc: '访问 producthunt.com 发现今日最热门的新产品',
        url: 'https://www.producthunt.com',
        img: 'https://ph-static.imgix.net/product-hunt-logo.png',
        hot: '💡 提示',
        extra: {}
      }
    ]

    debug.log(`✅ 成功获取 Product Hunt 数据`)

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
    cacheManager.set('product-hunt', cacheKey, resultData, cacheTTL)
    return resultData
  } catch (error) {
    debug.warn(`⚠️ 获取 Product Hunt 失败:`, error.message)

    // 返回默认数据
    const hotList = [
      {
        id: 'ph_default',
        index: 1,
        title: 'Product Hunt',
        desc: '发现最新的科技产品和创业项目',
        url: 'https://www.producthunt.com',
        img: 'https://ph-static.imgix.net/product-hunt-logo.png',
        hot: '🔥',
        extra: {}
      }
    ]

    const resultData = {
      data: hotList,
      total: hotList.length,
      hasMore: false
    }

    return resultData
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
