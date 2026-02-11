/*
 * @Author: fjyu9 fjyu9@iflytek.com
 * @Date: 2026-01-29 15:38:01
 * @LastEditors: fjyu9 fjyu9@iflytek.com
 * @LastEditTime: 2026-02-09 14:48:24
 * @FilePath: \摸鱼热搜\src\config.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
/**
 * 应用配置文件
 * 用于控制应用的各种设置和开关
 */

// 显示模式配置
export const DISPLAY_MODE = {
  // 模式选项：'simple' (极简模式) 或 'category' (分类模式)
  // - simple: 只显示主流平台，不显示分类导航
  // - category: 显示分类导航，可切换不同分类
  DEFAULT_MODE: 'simple',

  // 极简模式主流平台ID列表（基于用户行为数据按使用频率排序）
  SIMPLE_MODE_PLATFORMS: [
    'zhihu',            // 知乎 - 45+ (15%)
    'baidu',            // 百度 - 40+ (13%)
    'weibo',            // 微博 - 35+ (12%)
    'toutiao',          // 今日头条 - 30+ (10%)
    'bilibili',         // B站 - 25+ (8%)
    'douyin',           // 抖音 - 20+ (7%)
    '36kr',             // 36氪 - 18+ (6%)
    'genshin',          // 原神 - 15+ (5%)
    'juejin',           // 掘金 - 12+ (4%)
    'weread',           // 微信读书 - 10+ (3%)
    'douban-movie',     // 豆瓣电影 - 8+ (3%)
    'sspai',            // 少数派 - 8+ (3%)
    'zhuishu',          // 追书神器 - 6+ (2%)
    'artic',            // 芝加哥艺术学院 - 5+ (2%)
    'metmuseum',        // 大都会博物馆 - 4+ (1%)
    '60s-news',         // 60秒早报
    'stock-hot',        // 热门股票
    'epic-free',        // Epic免费游戏
    'github-trending',  // GitHub热榜
    'movie-box'         // 电影票房榜
  ]
}

// 分页配置
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 50,  // 每页显示的条数
  LOAD_MORE_THRESHOLD: 100 // 距离底部多少像素时触发加载更多
}

// API 请求配置
export const API = {
  // 请求超时时间（毫秒）- 防止请求卡住
  REQUEST_TIMEOUT: 5000,
  // 最小请求间隔（毫秒）- 防止频繁请求
  MIN_REQUEST_INTERVAL: 500,
  // 各平台特殊超时配置（毫秒）
  PLATFORM_TIMEOUT: {
    '60s-news': 10000,  // 60秒早报API（10秒）
    'zhuishu': 20000,   // 追书神器使用CORS代理，需要更长时间（20秒）
    'movie-box': 10000, // 电影票房榜API（10秒）
    'artic': 10000,     // 芝加哥艺术学院API（10秒）
    'metmuseum': 15000, // 大都会博物馆API（15秒，需要多次请求）
    'stock-hot': 25000, // 股票行情API（25秒，一次请求多个股票）
    'stock-sh': 25000,  // 上证指数API（25秒，一次请求多个股票）
    'stock-tech': 25000 // 科技股API（25秒，一次请求多个股票）
  },
  // 各平台缓存时间配置（毫秒）- 统一5分钟缓存，确保数据实时性
  PLATFORM_CACHE_TIME: {
    // 所有平台统一5分钟缓存（提供更实时的数据）
    'zhihu': 5 * 60 * 1000,       // 知乎
    'baidu': 5 * 60 * 1000,       // 百度
    'weibo': 5 * 60 * 1000,       // 微博
    'toutiao': 5 * 60 * 1000,     // 今日头条
    'bilibili': 5 * 60 * 1000,    // B站
    'douyin': 5 * 60 * 1000,      // 抖音
    'stock-hot': 5 * 60 * 1000,   // 热门股票
    'stock-sh': 5 * 60 * 1000,    // 上证指数
    'stock-tech': 5 * 60 * 1000,  // 科技股
    '60s-news': 5 * 60 * 1000,    // 60秒早报

    // 其他平台 - 默认5分钟缓存
    'default': 5 * 60 * 1000
  },
  // 高频平台列表（基于用户行为分析）
  HIGH_FREQUENCY_PLATFORMS: ['zhihu', 'baidu', 'weibo', 'toutiao', 'bilibili', 'douyin'],
  // 默认缓存时间：5分钟（统一缓存策略，提供更实时的数据）
  DEFAULT_CACHE_TIME: 5 * 60 * 1000,
  // 是否显示调试日志（开发环境可设为 true，生产环境设为 false）
  DEBUG: true
}

// UI 配置
export const UI = {
  // 是否显示平台图标
  SHOW_PLATFORM_ICONS: true,
  // 是否显示刷新按钮
  SHOW_REFRESH_BUTTON: true,
  // 是否显示热度值
  SHOW_HOT_VALUE: true,
  // 是否显示热搜简介
  SHOW_DESCRIPTION: true,
  // 热度显示模式：'number' (数字) 或 'level' (火焰等级)
  HOT_DISPLAY_MODE: 'level',
  // 滚动指示器动画时长(秒)
  SCROLL_INDICATOR_ANIMATION_DURATION: 5,
  // 是否显示最近使用的平台
  SHOW_RECENT_PLATFORMS: true,
  // 最近平台列表最大数量
  MAX_RECENT_PLATFORMS: 5,
  // 夜间模式：'auto' (自动), 'light' (亮色), 'dark' (暗色)
  THEME_MODE: 'auto'
}

// 自动刷新配置
export const AUTO_REFRESH = {
  // 是否启用自动刷新
  ENABLED: false,
  // 自动刷新间隔(毫秒) 默认5分钟
  INTERVAL: 5 * 60 * 1000
}

// 热度等级配置
export const HOT_LEVELS = [
  { threshold: 10000000, level: 5, icon: '🔥🔥🔥🔥🔥', label: '爆' },
  { threshold: 5000000, level: 4, icon: '🔥🔥🔥🔥', label: '热' },
  { threshold: 1000000, level: 3, icon: '🔥🔥🔥', label: '温' },
  { threshold: 500000, level: 2, icon: '🔥🔥', label: '凉' },
  { threshold: 0, level: 1, icon: '🔥', label: '冷' }
]

// 本地存储键名配置
export const STORAGE_KEYS = {
  SELECTED_PLATFORM: 'selectedPlatform',
  SELECTED_CATEGORY: 'selectedCategory',
  DISPLAY_MODE: 'displayMode',
  RECENT_PLATFORMS: 'recentPlatforms',
  FAVORITE_ITEMS: 'favoriteItems',
  LAST_UPDATE_TIME: 'lastUpdateTime',
  // UI 设置
  SHOW_HOT_VALUE: 'showHotValue',
  SHOW_DESCRIPTION: 'showDescription',
  THEME_MODE: 'themeMode',
  // 自定义平台顺序
  CUSTOM_PLATFORM_ORDER: 'customPlatformOrder',
  // 隐藏的平台列表
  HIDDEN_PLATFORMS: 'hiddenPlatforms'
}

// 导出默认配置对象
export default {
  DISPLAY_MODE,
  PAGINATION,
  API,
  UI,
  AUTO_REFRESH,
  HOT_LEVELS,
  STORAGE_KEYS
}
