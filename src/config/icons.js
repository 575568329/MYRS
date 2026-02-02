/**
 * 图标配置
 * 使用 Remix Icon 图标库（Vue 组件方式）
 * 图标文档: https://remixicon.com/
 */

/**
 * 图标导入映射表
 * 将平台 ID 映射到 vue-remix-icons 图标的动态导入函数
 * 这样可以实现按需加载，优化打包体积
 */
export const ICON_IMPORTS = {
  // 视频/社区
  'bilibili': () => import('vue-remix-icons/icons/ri-bilibili-line.vue'),
  'acfun': () => import('vue-remix-icons/icons/ri-movie-line.vue'),
  'weibo': () => import('vue-remix-icons/icons/ri-weibo-line.vue'),
  'zhihu': () => import('vue-remix-icons/icons/ri-zhihu-line.vue'),
  'zhihu-daily': () => import('vue-remix-icons/icons/ri-newspaper-line.vue'),
  'douyin': () => import('vue-remix-icons/icons/ri-music-2-line.vue'),
  'kuaishou': () => import('vue-remix-icons/icons/ri-camera-lens-line.vue'),
  'douban-movie': () => import('vue-remix-icons/icons/ri-movie-2-line.vue'),
  'douban-group': () => import('vue-remix-icons/icons/ri-team-line.vue'),
  'tieba': () => import('vue-remix-icons/icons/ri-group-line.vue'),
  'hupu': () => import('vue-remix-icons/icons/ri-basketball-line.vue'),
  'ngabbs': () => import('vue-remix-icons/icons/ri-gamepad-line.vue'),
  'v2ex': () => import('vue-remix-icons/icons/ri-chat-smile-2-line.vue'),
  '52pojie': () => import('vue-remix-icons/icons/ri-lock-2-line.vue'),
  'hostloc': () => import('vue-remix-icons/icons/ri-server-line.vue'),
  'coolapk': () => import('vue-remix-icons/icons/ri-android-line.vue'),

  // 新闻/资讯
  'baidu': () => import('vue-remix-icons/icons/ri-search-2-line.vue'),
  'thepaper': () => import('vue-remix-icons/icons/ri-article-line.vue'),
  'toutiao': () => import('vue-remix-icons/icons/ri-fire-line.vue'),
  'qq-news': () => import('vue-remix-icons/icons/ri-qq-line.vue'),
  'sina': () => import('vue-remix-icons/icons/ri-rss-line.vue'),
  'sina-news': () => import('vue-remix-icons/icons/ri-rss-line.vue'),
  'netease-news': () => import('vue-remix-icons/icons/ri-news-line.vue'),
  'huxiu': () => import('vue-remix-icons/icons/ri-lightbulb-line.vue'),
  'ifanr': () => import('vue-remix-icons/icons/ri-magic-line.vue'),

  // 技术/IT
  'sspai': () => import('vue-remix-icons/icons/ri-tools-line.vue'),
  'ithome': () => import('vue-remix-icons/icons/ri-computer-line.vue'),
  'ithome-xijiayi': () => import('vue-remix-icons/icons/ri-gamepad-line.vue'),
  'juejin': () => import('vue-remix-icons/icons/ri-code-s-slash-line.vue'),
  'jianshu': () => import('vue-remix-icons/icons/ri-quill-pen-line.vue'),
  'guokr': () => import('vue-remix-icons/icons/ri-flask-line.vue'),
  '36kr': () => import('vue-remix-icons/icons/ri-money-dollar-circle-line.vue'),
  '51cto': () => import('vue-remix-icons/icons/ri-terminal-line.vue'),
  'csdn': () => import('vue-remix-icons/icons/ri-code-box-line.vue'),
  'nodeseek': () => import('vue-remix-icons/icons/ri-nodejs-line.vue'),
  'hellogithub': () => import('vue-remix-icons/icons/ri-github-line.vue'),

  // 游戏
  'lol': () => import('vue-remix-icons/icons/ri-sword-line.vue'),
  'genshin': () => import('vue-remix-icons/icons/ri-star-smile-line.vue'),
  'honkai': () => import('vue-remix-icons/icons/ri-planet-line.vue'),
  'starrail': () => import('vue-remix-icons/icons/ri-rocket-line.vue'),
  'miyoushe': () => import('vue-remix-icons/icons/ri-game-line.vue'),

  // 阅读类
  'weread': () => import('vue-remix-icons/icons/ri-book-read-line.vue'),
  'zhuishu': () => import('vue-remix-icons/icons/ri-bookmark-line.vue'),

  // 艺术类
  'artic': () => import('vue-remix-icons/icons/ri-building-2-line.vue'),

  // 默认图标（当找不到对应图标时使用）
  'default': () => import('vue-remix-icons/icons/ri-apps-line.vue')
}

/**
 * 获取平台图标导入函数
 * @param {string} platformId - 平台 ID
 * @returns {Function} 图标导入函数
 */
export function getPlatformIconImport(platformId) {
  return ICON_IMPORTS[platformId] || ICON_IMPORTS['default']
}

/**
 * 获取平台图标名称（用于调试或显示）
 * @param {string} platformId - 平台 ID
 * @returns {string} 图标名称
 */
export function getPlatformIconName(platformId) {
  const nameMap = {
    'bilibili': 'ri-bilibili-line',
    'acfun': 'ri-movie-line',
    'weibo': 'ri-weibo-line',
    'zhihu': 'ri-zhihu-line',
    'zhihu-daily': 'ri-newspaper-line',
    'douyin': 'ri-music-2-line',
    'kuaishou': 'ri-camera-lens-line',
    'douban-movie': 'ri-movie-2-line',
    'douban-group': 'ri-team-line',
    'tieba': 'ri-group-line',
    'hupu': 'ri-basketball-line',
    'ngabbs': 'ri-gamepad-line',
    'v2ex': 'ri-chat-smile-2-line',
    '52pojie': 'ri-lock-2-line',
    'hostloc': 'ri-server-line',
    'coolapk': 'ri-android-line',
    'baidu': 'ri-search-2-line',
    'thepaper': 'ri-article-line',
    'toutiao': 'ri-fire-line',
    'qq-news': 'ri-qq-line',
    'sina': 'ri-rss-line',
    'sina-news': 'ri-rss-line',
    'netease-news': 'ri-news-line',
    'huxiu': 'ri-lightbulb-line',
    'ifanr': 'ri-magic-line',
    'sspai': 'ri-tools-line',
    'ithome': 'ri-computer-line',
    'ithome-xijiayi': 'ri-gamepad-line',
    'juejin': 'ri-code-s-slash-line',
    'jianshu': 'ri-quill-pen-line',
    'guokr': 'ri-flask-line',
    '36kr': 'ri-money-dollar-circle-line',
    '51cto': 'ri-terminal-line',
    'csdn': 'ri-code-box-line',
    'nodeseek': 'ri-nodejs-line',
    'hellogithub': 'ri-github-line',
    'lol': 'ri-sword-line',
    'genshin': 'ri-star-smile-line',
    'honkai': 'ri-planet-line',
    'starrail': 'ri-rocket-line',
    'miyoushe': 'ri-game-line',
    'weread': 'ri-book-read-line',
    'zhuishu': 'ri-bookmark-line',
    'artic': 'ri-building-2-line'
  }
  return nameMap[platformId] || 'ri-apps-line'
}

/**
 * 获取平台图标（别名，用于向后兼容）
 * @param {string} platformId - 平台 ID
 * @returns {string} 图标名称
 */
export function getPlatformIcon(platformId) {
  return getPlatformIconName(platformId)
}

/**
 * 图标组件使用示例
 *
 * 在 Vue 组件中使用 RemixIcon 组件：
 * <RemixIcon :iconName="getPlatformIconName(platformId)" size="1.2em" />
 *
 * 或者使用 PlatformIcon 组件（推荐）：
 * <PlatformIcon :platformId="platformId" size="1.2em" />
 */
