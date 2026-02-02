/*
 * @Author: fjyu9 fjyu9@iflytek.com
 * @Date: 2026-01-29 15:38:01
 * @LastEditors: fjyu9 fjyu9@iflytek.com
 * @LastEditTime: 2026-01-30 09:05:53
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

  // 极简模式主流平台ID列表
  SIMPLE_MODE_PLATFORMS: [
    'baidu',        // 百度
    'zhihu',        // 知乎
    'weibo',        // 微博
    'genshin',      // 原神
    'douyin',       // 抖音
    'bilibili',     // B站
    'toutiao',      // 今日头条
    '36kr',         // 36氪
    'sspai',        // 少数派
    'douban-movie', // 豆瓣电影
    'weread',       // 微信读书
    'zhuishu'       // 追书神器
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
    'zhuishu': 20000  // 追书神器使用CORS代理，需要更长时间（20秒）
  },
  // 是否显示调试日志（开发环境可设为 true，生产环境设为 false）
  DEBUG: false
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
  CUSTOM_PLATFORM_ORDER: 'customPlatformOrder'
}

// 导出默认配置对象
export default {
  DISPLAY_MODE,
  PAGINATION,
  UI,
  AUTO_REFRESH,
  HOT_LEVELS,
  STORAGE_KEYS
}
