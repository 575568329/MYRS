<script setup>
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { getHotData, PLATFORMS } from '../services/hotSearchApi.js'
import { STORAGE_KEYS, UI, AUTO_REFRESH, HOT_LEVELS, API } from '../config.js'
import { trackEvent, EventType } from '../services/analytics/index.js'
import { enterView, flushView } from '../services/analytics/viewTracker.js'
import { useSettingsStore } from '../stores/settingsStore.js'
import Settings from '../Settings/index.vue'
import ArtworkListItem from '../components/ArtworkListItem.vue'
import ArtworkCard from '../components/ArtworkCard.vue'
import AnalyticsDebugPanel from '../components/AnalyticsDebugPanel.vue'
import PlatformSidebar from '../components/PlatformSidebar.vue'
import AggregateHome from '../components/AggregateHome.vue'
import FavoritesView from '../components/FavoritesView.vue'
import ErrorState from '../components/ErrorState.vue'
import { RefreshCw, Star, Copy, Link, Flame, ArrowUpDown, Pin, Fish, Shield, Keyboard } from 'lucide-vue-next'
import { openUrl } from '../utils/openUrl.js'
import { toggleBossKey } from '../utils/bossKey.js'
import { saveMirror, peekMirror, mirrorAgeText } from '../utils/dataMirror.js'
import { useFavorites } from '../utils/favorites.js'
import { getStorage } from '../utils/storage.js'

// 使用 settingsStore
const settingsStore = useSettingsStore()

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

const props = defineProps({
  enterAction: {
    type: Object,
    required: true
  }
})

// 响应式数据
const selectedPlatform = ref('baidu')
// 当前视图：'home'（聚合首页，默认）| 'favorites'（P1）| 平台ID（单平台列表）
const currentView = ref('home')
// 平台停留埋点（pv）：视图切换即结算上一个平台；插件退出由 App.vue 的 finalizeViewTracking 收尾
watch(currentView, (v) => enterView(v))
// 老板键全局入口：uTools 全局快捷键（plugin.json code="boss"）进入即触发 toggle
watch(() => props.enterAction, (action) => {
  if (action && action.code === 'boss') handleBossKey('global')
})
const hotList = ref([])
const loading = ref(false)
const error = ref(null)
const loadingMore = ref(false)
const hasMore = ref(false)
const currentPage = ref(1)
const totalCount = ref(0)
const updateTime = ref('')
const autoRefreshTimer = ref(null)

// P0.1 镜像滞后提示：{ ts } 非空时显示"缓存 N分钟前"角标
const staleInfo = ref(null)

// P0.3 Toast
const toastMsg = ref('')
let toastTimer = null

// 聚合视图
const aggregateRef = ref(null)
const aggregateLoading = ref(false)
// 聚合卡片排序模式（拖拽调整钉住顺序）
const aggregateSorting = ref(false)

// 当前视图是否处于加载中（驱动顶部进度条）
const isLoadingView = computed(() => {
  if (currentView.value === 'home') return aggregateLoading.value
  return loading.value && currentView.value === selectedPlatform.value
})

// 平台更新时间记录
const platformUpdateTimes = ref({})

// 加载超时控制
const loadingTimeout = ref(null)
const lastRequestTime = ref(0)

// 键盘导航 - 当前选中的热搜索引
const selectedHotIndex = ref(-1)

// UI 设置
const showRatingDialog = ref(false) // 五星好评提醒（每周最多一次）
const showOnboarding = ref(false) // 首次进入操作引导
const autoTranslate = ref(false) // 自动翻译开关（仅对芝加哥艺术学院有效）
const translateOffset = ref(0) // 翻译偏移量（用于分页翻译）

// 开发环境标志
const isDev = import.meta.env.DEV

// 判断是否为芝加哥艺术学院平台（使用卡片式布局）
const isArticPlatform = computed(() => {
  return selectedPlatform.value === 'artic'
})

// 判断是否为 Epic 免费游戏平台（使用卡片式布局）
const isEpicFreePlatform = computed(() => {
  return selectedPlatform.value === 'epic-free'
})

// 判断是否为 GitHub Trending 平台
const isGithubTrendingPlatform = computed(() => {
  return selectedPlatform.value === 'github-trending'
})

// 判断是否为 Hacker News 平台
const isHackerNewsPlatform = computed(() => {
  return selectedPlatform.value === 'hacker-news'
})

// 判断是否为艺术品平台（使用卡片式布局）
const isArtworkPlatform = computed(() => {
  return isArticPlatform.value
})

// 判断是否为游戏平台（使用卡片式布局，类似于艺术品）
const isGamePlatform = computed(() => {
  return isEpicFreePlatform.value
})

// 判断是否为支持翻译的平台（芝加哥艺术学院、GitHub Trending、Hacker News）
const isTranslatablePlatform = computed(() => {
  return isArticPlatform.value ||
         isGithubTrendingPlatform.value ||
         isHackerNewsPlatform.value
})

// 芝加哥艺术学院 - 艺术品列表
const filteredArtworks = computed(() => {
  return hotList.value
})

// 键盘 ←→ 导航用的平台序列（全部可见平台，按定义顺序）
const navigablePlatforms = computed(() => {
  return PLATFORMS.filter(p => !settingsStore.hiddenPlatforms.has(p.id))
})

// 今日文案（聚合首页头部）
const todayText = computed(() => {
  const d = new Date()
  return `${d.getMonth() + 1}月${d.getDate()}日 ${['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()]}`
})

// 收藏（P0.3 数据模型 v2）
const { favorites: favoriteList, load: loadFavorites, isFavorited, toggleFavorite } = useFavorites()
const favoriteCount = computed(() => favoriteList.value.length)
const isFav = (item) => isFavorited(selectedPlatform.value, item.title)

// 获取当前选中的平台对象
const currentPlatformObj = computed(() => {
  return PLATFORMS.find(p => p.id === selectedPlatform.value)
})

// 数据新鲜度计算
const dataFreshness = computed(() => {
  const platformId = selectedPlatform.value
  const lastUpdate = platformUpdateTimes.value[platformId]

  if (!lastUpdate) {
    return { status: 'unknown', text: '加载中...', icon: '⚪', minutes: 0 }
  }

  const now = Date.now()
  const elapsed = now - lastUpdate
  const minutes = Math.floor(elapsed / (1000 * 60))

  // 获取平台缓存时间配置
  const cacheTime = API.PLATFORM_CACHE_TIME[platformId] || API.PLATFORM_CACHE_TIME['default']
  const cacheMinutes = Math.floor(cacheTime / (1000 * 60))

  // 计算新鲜度（基于5分钟缓存）
  if (minutes <= 5) {
    return { status: 'fresh', text: '刚刚更新', icon: '🟢', minutes }
  } else if (minutes <= 15) {
    return { status: 'good', text: `${minutes}分钟前`, icon: '🟡', minutes }
  } else if (minutes <= 30) {
    return { status: 'okay', text: `${minutes}分钟前`, icon: '🟠', minutes }
  } else {
    return { status: 'stale', text: `${minutes}分钟前`, icon: '🔴', minutes }
  }
})

// 是否需要刷新提示
const shouldRefresh = computed(() => {
  return dataFreshness.value.status === 'stale'
})

// 获取热搜数据
const fetchHotData = async (platformId, loadMore = false) => {
  // 防止频繁请求（防抖）
  const now = Date.now()
  if (!loadMore && now - lastRequestTime.value < API.MIN_REQUEST_INTERVAL) {
    debug.log('⚠️ 请求过于频繁，已忽略')
    return
  }

  // 防止重复请求
  if ((loading.value && !loadMore) || loadingMore.value) {
    debug.log('⚠️ 正在加载中，跳过重复请求')
    return
  }

  // 更新最后请求时间
  lastRequestTime.value = now

  if (loadMore) {
    loadingMore.value = true
  } else {
    // P0.1 秒开：先渲染上次成功的数据镜像，再后台刷新（stale-while-revalidate）
    const mirror = peekMirror(platformId)
    if (mirror && mirror.data.length > 0) {
      hotList.value = mirror.data
      totalCount.value = mirror.total || mirror.data.length
      hasMore.value = !!mirror.hasMore
      staleInfo.value = { ts: mirror.ts }
      // 新鲜度指示按镜像时间显示
      platformUpdateTimes.value[platformId] = mirror.ts
      debug.log(`🪞 命中数据镜像：${mirror.data.length} 条，先渲染后刷新`)
    } else {
      // 无镜像：立即清空旧平台数据并显示骨架屏（避免"点了新标签还显示旧内容"）
      staleInfo.value = null
      hotList.value = []
      hasMore.value = false
      totalCount.value = 0
    }
    loading.value = true
    error.value = null
    currentPage.value = 1
    // 重置翻译偏移量
    translateOffset.value = 0
    // 切换平台时自动滚动到顶部
    scrollToTop()
  }

  // 设置超时定时器（使用平台特定的超时配置）
  if (loadingTimeout.value) {
    clearTimeout(loadingTimeout.value)
  }

  // 获取平台特定的超时时间
  const platformTimeout = API.PLATFORM_TIMEOUT[platformId] || API.REQUEST_TIMEOUT

  // 数据源质量埋点（pl）的计时起点
  const fetchStart = Date.now()

  loadingTimeout.value = setTimeout(() => {
    if (loading.value || loadingMore.value) {
      debug.warn(`⏰ 请求超时（${platformTimeout}ms），强制关闭加载状态`)
      loading.value = false
      loadingMore.value = false
    }
  }, platformTimeout)

  try {
    debug.log(`🎯 开始获取 ${platformId} 的热搜数据`)

    // 构建请求参数
    const requestParams = {
      page: currentPage.value,
      pageSize: 50
    }

    const result = await getHotData(platformId, requestParams)

    // 数据源质量埋点（pl）：成功（src 标识三级回退用了哪级 / direct / cache）
    if (!(result && result.error)) {
      trackEvent(EventType.PLATFORM_LOAD_SUCCESS, {
        platform: platformId,
        ms: Date.now() - fetchStart,
        src: (result && result.source) || 'direct'
      })
    }

    // 清除超时定时器
    if (loadingTimeout.value) {
      clearTimeout(loadingTimeout.value)
      loadingTimeout.value = null
    }

    // 处理分页数据
    if (result && typeof result === 'object' && result.data) {
      // 检查是否有错误字段
      if (result.error) {
        throw new Error(result.error)
      }

      // 新的分页格式
      if (loadMore) {
        hotList.value = [...hotList.value, ...result.data]
      } else {
        hotList.value = result.data
        // 记录平台更新时间（仅在首次加载时）
        platformUpdateTimes.value[platformId] = Date.now()
        // P0.1 保存数据镜像（下次秒开）+ 清除滞后角标
        saveMirror(platformId, {
          data: result.data,
          total: result.total,
          hasMore: result.hasMore
        })
        staleInfo.value = null
        // 保存到localStorage
        try {
          localStorage.setItem(`platform_update_${platformId}`, Date.now())
        } catch (e) {
          debug.warn('保存更新时间失败:', e)
        }
      }
      hasMore.value = result.hasMore
      totalCount.value = result.total
      debug.log(`✅ 成功获取 ${result.data.length} 条热搜数据`)
      debug.log(`📊 总数据量: ${result.total}，还有更多: ${result.hasMore}`)

      // 加载翻译缓存（仅对支持翻译的平台）
      if (isTranslatablePlatform.value && !loadMore) {
        loadTranslationCache()
      }
    } else if (Array.isArray(result)) {
      // 兼容旧格式（直接是数组）
      hotList.value = result
      hasMore.value = false
      totalCount.value = result.length
      debug.log(`✅ 成功获取 ${result.length} 条热搜数据`)
      // 记录平台更新时间
      if (!loadMore) {
        platformUpdateTimes.value[platformId] = Date.now()
        try {
          localStorage.setItem(`platform_update_${platformId}`, Date.now())
        } catch (e) {
          debug.warn('保存更新时间失败:', e)
        }
      }
    } else {
      // 空数据或其他格式
      hotList.value = []
      hasMore.value = false
      totalCount.value = 0
      debug.warn('⚠️ 未获取到有效数据')
    }

  } catch (err) {
    console.error('❌ 获取热搜失败:', err)

    // 数据源质量埋点（pl）：失败
    trackEvent(EventType.PLATFORM_LOAD_ERROR, {
      platform: platformId,
      ms: Date.now() - fetchStart,
      src: 'unknown'
    })

    // 清除超时定时器
    if (loadingTimeout.value) {
      clearTimeout(loadingTimeout.value)
      loadingTimeout.value = null
    }

    // 超时错误直接显示暂无数据（有镜像时保留镜像数据）
    // AbortError 是由 AbortController 触发的标准超时错误
    if (err.name === 'AbortError' || err.message === '请求超时') {
      debug.log('⏰ 请求超时，显示暂无数据')
      error.value = null
      if (!staleInfo.value) {
        hotList.value = []
        hasMore.value = false
        totalCount.value = 0
      }
    }
    // 其他错误显示友好的错误信息
    else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
      error.value = '网络请求失败，请检查网络连接'
    } else if (err.message.includes('404')) {
      error.value = '该平台暂不支持或接口已更新'
    } else if (err.message.includes('CORS')) {
      error.value = '跨域请求被阻止（建议在uTools中使用）'
    } else if (err.message.includes('不支持的平台')) {
      error.value = err.message
    } else {
      error.value = err.message || '获取数据失败'
    }

    // 如果有错误信息：有镜像数据时保留（角标提示滞后），否则清空列表
    if (error.value && !staleInfo.value) {
      hotList.value = []
      hasMore.value = false
      totalCount.value = 0
    }
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

// 滚动到顶部
const scrollToTop = () => {
  const contentSection = document.querySelector('.content-section')
  if (contentSection) {
    contentSection.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }
}

// 加载更多
const loadMore = () => {
  if (!hasMore.value || loadingMore.value) return

  currentPage.value++
  debug.log(`📄 加载第 ${currentPage.value} 页`)

  // 追踪加载更多事件
  trackEvent(EventType.LOAD_MORE, {
    platform: selectedPlatform.value,
    page: currentPage.value
  })

  fetchHotData(selectedPlatform.value, true)
}

// 视图切换（P0.2 双视图）：'home' | 'favorites' | 平台ID
// origin：'pinned'（钉住组入口）| 'cat'（分类组入口）| 缺省（键盘/聚合卡片）
// 钉住组与分类组的选中高亮各自独立，互不联动
const pinnedActive = ref(null)
const categoryActive = ref(null)

function setActiveEntry(view, origin, cat) {
  if (origin === 'pinned') {
    pinnedActive.value = view
    categoryActive.value = null
  } else if (origin === 'cat') {
    categoryActive.value = { id: view, cat }
    pinnedActive.value = null
  } else {
    // 键盘/聚合卡片进入：优先亮钉住组入口，未钉住则亮分类组入口
    if (settingsStore.isPinned(view)) {
      pinnedActive.value = view
      categoryActive.value = null
    } else {
      const meta = PLATFORMS.find(p => p.id === view)
      categoryActive.value = { id: view, cat: meta ? meta.category : '' }
      pinnedActive.value = null
    }
  }
}

const switchView = (view, origin, cat) => {
  if (view === 'home') {
    currentView.value = 'home'
    pinnedActive.value = null
    categoryActive.value = null
    trackEvent(EventType.PLATFORM_SWITCH, { to_view: 'home', source: 'sidebar' })
    return
  }

  if (view === 'favorites') {
    currentView.value = 'favorites'
    pinnedActive.value = null
    categoryActive.value = null
    return
  }

  // 已在该平台视图：仅切换高亮入口（钉住↔分类），不重新拉数据
  if (view === selectedPlatform.value && currentView.value === view) {
    setActiveEntry(view, origin, cat)
    return
  }

  const fromView = currentView.value
  const fromPlatform = selectedPlatform.value
  selectedPlatform.value = view
  currentView.value = view
  selectedHotIndex.value = -1
  setActiveEntry(view, origin, cat)
  trackEvent(EventType.PLATFORM_SWITCH, {
    from_platform: fromPlatform,
    to_platform: view,
    source: origin === 'pinned' ? 'pin' : origin === 'cat' ? 'sidebar' : fromView === 'home' ? 'card' : 'keyboard'
  })
  fetchHotData(view)
}

// 聚合首页刷新
const refreshAggregate = () => {
  aggregateLoading.value = true
  if (aggregateRef.value && aggregateRef.value.reload) {
    aggregateRef.value.reload()
  }
  // reload 是异步的，简单起见用固定时长收起旋转态
  setTimeout(() => { aggregateLoading.value = false }, 1200)
}

// 打开链接（P0.3 统一入口：默认 ubrowser 摸鱼小窗）
const openItem = (item) => {
  const url = item.url || item.mobileUrl
  if (!url || url === '#') {
    debug.log('⚠️ 无效链接:', url)
    return
  }
  // 热搜点击埋点（键盘 Enter 也走这里，自动覆盖）
  trackEvent(EventType.ITEM_CLICK, {
    platform: selectedPlatform.value,
    item_title: item.title,
    item_position: item.index ?? -1
  })
  openUrl(url, { platform: selectedPlatform.value })
}

// 聚合卡片上的条目直接打开
const openFromCard = ({ platform, item }) => {
  const url = (item && (item.url || item.mobileUrl)) || ''
  if (!url || url === '#') return
  trackEvent(EventType.ITEM_CLICK, {
    platform,
    item_title: (item && item.title) || '',
    item_position: (item && item.index) ?? -1
  })
  openUrl(url, { platform })
}

// 收藏条目打开（favorites 数据模型：{ platform, title, url }）
const openFavItem = (fav) => {
  if (!fav || !fav.url) {
    showToast('该收藏没有可打开的链接')
    return
  }
  openUrl(fav.url, { platform: fav.platform })
}

// Toast（P0.3，替代弹窗反馈）
function showToast(msg) {
  toastMsg.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastMsg.value = '' }, 2000)
}

// 老板键（FISH-WINDOW-2.0 M1）：隐藏/恢复所有摸鱼小窗与主窗口
// trigger: 'hotkey'（Ctrl+`）| 'global'（uTools 全局快捷键入口）| 'button'（侧栏按钮）
async function handleBossKey(trigger) {
  const res = await toggleBossKey()
  if (res.action === 'show') {
    showToast('欢迎回来，继续摸鱼 🐟')
  } else if (res.action === 'none') {
    showToast('浏览器环境无小窗，仅 uTools 内可用')
  }
  // hide / main-only：主窗口已隐藏，Toast 不可见，不打扰
  try {
    trackEvent(EventType.BOSS_KEY, { trigger, action: res.action, count: res.count })
  } catch (e) {
    /* 埋点失败不影响功能 */
  }
}

// 复制文本（utools 优先，浏览器降级 clipboard API）
function copyText(text) {
  if (window.utools && window.utools.copyText) {
    window.utools.copyText(text)
    return true
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => {})
    return true
  }
  return false
}

const copyTitle = (item) => {
  if (!item.title) return
  copyText(item.title)
  showToast('已复制标题')
  trackEvent(EventType.OPEN_LINK, { kind: 'copy_title', platform: selectedPlatform.value })
}

const copyLink = (item) => {
  const url = item.url || item.mobileUrl
  if (!url) {
    showToast('该条目没有链接')
    return
  }
  copyText(url)
  showToast('已复制链接')
  trackEvent(EventType.OPEN_LINK, { kind: 'copy_link', platform: selectedPlatform.value })
}

// 收藏切换（P0.3）
const toggleFav = (item) => {
  const on = toggleFavorite(selectedPlatform.value, item)
  showToast(on ? '已收藏 ★' : '已取消收藏')
  trackEvent(EventType.FAVORITE_TOGGLE, {
    platform: selectedPlatform.value,
    on
  })
}

// 刷新当前平台
const refresh = () => {
  // 追踪刷新事件
  trackEvent(EventType.REFRESH, {
    platform: selectedPlatform.value
  })
  fetchHotData(selectedPlatform.value)
}

// 打开设置面板
const openSettings = () => {
  // 追踪设置打开事件
  trackEvent(EventType.SETTINGS_OPEN, {
    platform: selectedPlatform.value
  })
  settingsStore.openSettings()
}

// 关闭设置面板
const closeSettings = () => {
  settingsStore.closeSettings()
}

// ===== 首次进入操作引导 =====

// 检查是否首次进入（未完成过引导即弹）
const checkOnboarding = () => {
  const storage = getStorage()
  let done = '1'
  try {
    done = storage?.getItem(STORAGE_KEYS.ONBOARDING_DONE) || ''
  } catch (e) { /* 读不到视为首次 */ }
  if (done !== '1') {
    showOnboarding.value = true
  }
}

// 完成引导（按钮或 Esc 关闭均走这里）
const finishOnboarding = () => {
  showOnboarding.value = false
  const storage = getStorage()
  try {
    storage?.setItem(STORAGE_KEYS.ONBOARDING_DONE, '1')
  } catch (e) { /* 写失败下次还会看到引导 */ }
  trackEvent('onboarding_done', {})
}

// ===== 五星好评提醒（每周最多一次，替代打赏入口） =====
const RATING_INTERVAL = 7 * 24 * 60 * 60 * 1000
let ratingTimer = null

// 启动后延迟 8 秒检查：距上次提醒超过一周才弹，不打扰刚打开的用户
const scheduleRatingReminder = () => {
  if (!window.utools) return // 浏览器开发环境无插件市场可跳
  if (!settingsStore.ratingReminderEnabled) return // 用户已关闭提醒
  if (showOnboarding.value) return // 首次引导会话不弹好评，避免连环打扰
  clearTimeout(ratingTimer)
  ratingTimer = setTimeout(() => {
    // 设置面板开着就顺延 1 分钟，避免叠加弹层
    if (settingsStore.showSettings) {
      ratingTimer = setTimeout(scheduleRatingReminder, 60 * 1000)
      return
    }
    const storage = getStorage()
    let last = 0
    try {
      last = parseInt(storage?.getItem(STORAGE_KEYS.RATING_REMINDER) || '0', 10) || 0
    } catch (e) { /* 读不到按从未提醒处理 */ }
    if (Date.now() - last < RATING_INTERVAL) return
    try {
      storage?.setItem(STORAGE_KEYS.RATING_REMINDER, String(Date.now()))
    } catch (e) { /* 写失败仅影响本周不重复的精度 */ }
    showRatingDialog.value = true
    trackEvent('rating_prompt', { action: 'show' })
  }, 8 * 1000)
}

// 下次再说（提醒时间已在弹出时记录，下周同一节奏再提醒）
const dismissRatingPrompt = () => {
  showRatingDialog.value = false
  trackEvent('rating_prompt', { action: 'dismiss' })
}

// 不再提醒（弹窗入口 / 设置页开关均可恢复）
const neverRatePrompt = () => {
  showRatingDialog.value = false
  settingsStore.setRatingReminderEnabled(false)
  trackEvent('rating_prompt', { action: 'never' })
}

// 去好评：跳转 uTools 插件市场本插件详情页
const goRate = () => {
  showRatingDialog.value = false
  trackEvent('rating_prompt', { action: 'rate' })
  try {
    if (window.utools?.openMarketPage) {
      window.utools.openMarketPage('摸鱼热搜')
    } else {
      showToast('请在 uTools 插件市场搜索「摸鱼热搜」评价')
    }
  } catch (e) {
    showToast('请在 uTools 插件市场搜索「摸鱼热搜」评价')
  }
}

// 批量翻译多个文本（一次性请求）
const batchTranslate = async (texts) => {
  if (!texts.length || !window.utools || !window.utools.ai) {
    return texts.map(t => ({ original: t, translated: t }))
  }

  try {
    // 构建批量翻译提示
    const prompt = texts.map((text, index) =>
      `${index + 1}. ${text}`
    ).join('\n\n')

    const result = await window.utools.ai({
      messages: [
        {
          role: 'system',
          content: '你是一个专业的翻译助手。请将用户输入的英文内容翻译成中文。用户会提供多个编号的文本，请按相同格式返回翻译结果，每行一个编号和翻译。只返回翻译结果，不要添加任何解释。对于专业术语（如编程语言、技术框架、项目名称等），请保持原文或提供通用的中文翻译。\n\n返回格式示例：\n1. 翻译结果1\n2. 翻译结果2\n3. 翻译结果3'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    })

    // 解析翻译结果
    const translatedText = result?.content || prompt
    const lines = translatedText.split('\n').filter(line => line.trim())
    const translations = []

    for (let i = 0; i < texts.length; i++) {
      const expectedPrefix = `${i + 1}.`
      const translatedLine = lines.find(line => line.trim().startsWith(expectedPrefix))
      translations.push({
        original: texts[i],
        translated: translatedLine
          ? translatedLine.replace(/^\d+\.\s*/, '').trim()
          : texts[i]
      })
    }

    return translations
  } catch (error) {
    console.error('批量翻译失败:', error)
    return texts.map(t => ({ original: t, translated: t }))
  }
}

// 翻译列表中的所有项目（智能分批，每次最多200个）
const translateAllArtworks = async () => {
  if (!window.utools || !window.utools.ai) {
    console.error('utools AI 功能不可用')
    alert('翻译功能需要 utools 的 AI 支持，请确保已在 utools 中配置了 AI 模型')
    return
  }

  // 获取平台类型名称
  const getPlatformTypeName = () => {
    if (isGithubTrendingPlatform.value) return '开源项目'
    if (isHackerNewsPlatform.value) return '科技资讯'
    
    if (isArticPlatform.value) return '艺术品'
    return '项目'
  }

  const platformTypeName = getPlatformTypeName()

  const total = hotList.value.length
  const startIndex = translateOffset.value
  const remainingCount = total - startIndex
  const batchSize = Math.min(200, remainingCount) // 每批最多200个
  const endIndex = startIndex + batchSize

  const itemsToTranslate = hotList.value.slice(startIndex, endIndex)
  const textsCount = itemsToTranslate.reduce((count, item) => {
    return count + (item.title ? 1 : 0) + (item.desc ? 1 : 0)
  }, 0)

  console.log(`🎯 准备翻译第 ${startIndex + 1}-${endIndex} 个${platformTypeName}（共 ${itemsToTranslate.length} 个，${textsCount} 个文本，总共 ${total} 个）`)

  // 保存原文
  itemsToTranslate.forEach(item => {
    if (item._originalTitle === undefined) {
      item._originalTitle = item.title
      item._originalDesc = item.desc
    }
  })

  // 收集所有需要翻译的文本（标题和描述）
  const textsToTranslate = []
  itemsToTranslate.forEach(item => {
    if (item._originalTitle) textsToTranslate.push(item._originalTitle)
    if (item._originalDesc) textsToTranslate.push(item._originalDesc)
  })

  if (textsToTranslate.length === 0) {
    console.log('⚠️ 没有需要翻译的内容')
    autoTranslate.value = false
    return
  }

  try {
    console.log(`📝 开始一次性翻译 ${textsToTranslate.length} 个文本（${itemsToTranslate.length} 个${platformTypeName}）...`)

    // 一次性翻译所有文本
    const translatedTexts = await batchTranslate(textsToTranslate)

    // 将翻译结果分配回项目
    let textIndex = 0
    itemsToTranslate.forEach((item, index) => {
      // 翻译标题
      if (item._originalTitle && textIndex < translatedTexts.length) {
        const translated = translatedTexts[textIndex++]
        if (translated && translated.translated) {
          // 直接赋值以确保 Vue 响应式更新
          item.title = translated.translated
          console.log(`✓ [${startIndex + index + 1}] 标题: ${item._originalTitle} → ${item.title}`)
        }
      }

      // 翻译描述
      if (item._originalDesc && textIndex < translatedTexts.length) {
        const translated = translatedTexts[textIndex++]
        if (translated && translated.translated) {
          // 直接赋值以确保 Vue 响应式更新
          item.desc = translated.translated
          console.log(`✓ [${startIndex + index + 1}] 描述已翻译`)
        }
      }
    })

    console.log(`✅ 已完成第 ${startIndex + 1}-${endIndex} 个${platformTypeName}的翻译`)

    // 保存翻译到缓存
    saveTranslationCache()

    // 更新偏移量
    translateOffset.value = endIndex

    // 翻译完成后自动关闭翻译按钮状态
    autoTranslate.value = false
  } catch (error) {
    console.error('批量翻译失败:', error)
    alert('翻译失败，请重试')
    autoTranslate.value = false
  }
}

// 获取翻译缓存的 key
const getTranslationCacheKey = () => {
  return `hot_search_translation_${selectedPlatform.value}`
}

// 保存翻译到 localStorage
const saveTranslationCache = () => {
  try {
    const cacheData = {}
    hotList.value.forEach(item => {
      if (item._originalTitle !== undefined || item._originalDesc !== undefined) {
        cacheData[item.id] = {
          title: item._originalTitle,
          desc: item._originalDesc,
          translatedTitle: item.title,
          translatedDesc: item.desc
        }
      }
    })

    const cacheKey = getTranslationCacheKey()
    localStorage.setItem(cacheKey, JSON.stringify(cacheData))
    console.log(`💾 已保存翻译缓存 (${Object.keys(cacheData).length} 条)`)
  } catch (error) {
    console.warn('保存翻译缓存失败:', error)
  }
}

// 从 localStorage 加载翻译缓存
const loadTranslationCache = () => {
  try {
    const cacheKey = getTranslationCacheKey()
    const cached = localStorage.getItem(cacheKey)

    if (!cached) {
      console.log('📦 没有翻译缓存')
      return 0
    }

    const cacheData = JSON.parse(cached)
    let appliedCount = 0

    hotList.value.forEach(item => {
      const cachedItem = cacheData[item.id]
      if (cachedItem) {
        // 保存原文
        if (item._originalTitle === undefined) {
          item._originalTitle = cachedItem.title
        }
        if (item._originalDesc === undefined) {
          item._originalDesc = cachedItem.desc
        }

        // 应用翻译
        if (cachedItem.translatedTitle && cachedItem.translatedTitle !== cachedItem.title) {
          item.title = cachedItem.translatedTitle
          appliedCount++
        }
        if (cachedItem.translatedDesc && cachedItem.translatedDesc !== cachedItem.desc) {
          item.desc = cachedItem.translatedDesc
          appliedCount++
        }
      }
    })

    // 更新翻译偏移量
    if (Object.keys(cacheData).length > 0) {
      translateOffset.value = hotList.value.filter(item =>
        item._originalTitle !== undefined || item._originalDesc !== undefined
      ).length
    }

    console.log(`📦 已加载翻译缓存 (${appliedCount} 条翻译)`)
    return appliedCount
  } catch (error) {
    console.warn('加载翻译缓存失败:', error)
    return 0
  }
}

// 清除翻译缓存
const clearTranslationCache = () => {
  try {
    const cacheKey = getTranslationCacheKey()
    localStorage.removeItem(cacheKey)
    console.log('🗑️ 已清除翻译缓存')
  } catch (error) {
    console.warn('清除翻译缓存失败:', error)
  }
}

// 切换翻译状态
const toggleTranslate = async () => {
  const total = hotList.value.length
  const startIndex = translateOffset.value

  // 获取平台类型名称
  const getPlatformTypeName = () => {
    if (isGithubTrendingPlatform.value) return '开源项目'
    if (isHackerNewsPlatform.value) return '科技资讯'
    
    if (isArticPlatform.value) return '艺术品'
    return '项目'
  }

  const platformTypeName = getPlatformTypeName()

  // 如果所有数据都已翻译，直接提示
  if (startIndex >= total) {
    const shouldRestart = confirm(
      `✅ 所有 ${total} 个${platformTypeName}已翻译完成！\n\n` +
      `单击"确定"重新开始翻译，单击"取消"返回。`
    )

    if (!shouldRestart) {
      console.log('❌ 用户取消重新翻译')
      return
    }

    // 重新开始翻译，重置所有进度
    restoreOriginalText()
    console.log('🔄 重新开始翻译')
    return
  }

  const remainingCount = total - startIndex
  const batchSize = Math.min(200, remainingCount)

  // 计算本次翻译的文本数量
  const itemsToTranslate = hotList.value.slice(startIndex, startIndex + batchSize)
  const textsCount = itemsToTranslate.reduce((count, item) => {
    return count + (item.title ? 1 : 0) + (item.desc ? 1 : 0)
  }, 0)

  // 确认对话框
  const confirmed = confirm(
    `即将使用 utools AI 翻译 ${itemsToTranslate.length} 个${platformTypeName}（约 ${textsCount} 个文本），会消耗一定的 AI 能量。\n\n` +
    `当前进度：${startIndex}/${total}\n` +
    `本次翻译：第 ${startIndex + 1}-${startIndex + batchSize} 个\n\n` +
    `是否继续？`
  )

  if (!confirmed) {
    console.log('❌ 用户取消翻译')
    return
  }

  console.log(`✅ 用户确认翻译 ${itemsToTranslate.length} 个艺术品`)
  autoTranslate.value = true
  await translateAllArtworks()
}

// 恢复原文（双击翻译按钮触发）
const restoreOriginalText = () => {
  hotList.value.forEach(item => {
    if (item._originalTitle !== undefined) {
      item.title = item._originalTitle
      item.desc = item._originalDesc
      delete item._originalTitle
      delete item._originalDesc
    }
  })
  // 重置翻译偏移量
  translateOffset.value = 0
  // 清除翻译缓存
  clearTranslationCache()
  console.log('🔄 已恢复原文并重置翻译进度')
}

// 获取翻译按钮的提示文本
const translateButtonText = computed(() => {
  if (autoTranslate.value) return '翻译中...'

  const translated = hotList.value.filter(item => item._originalTitle !== undefined).length
  const total = hotList.value.length
  const remaining = total - translateOffset.value
  const nextBatch = Math.min(200, remaining)

  if (translated === 0) {
    return `翻译前${nextBatch}个 (0/${total}) - 单击开始`
  } else if (translateOffset.value >= total) {
    return `已完成 (${translated}/${total}) - 单击重新开始`
  } else {
    return `继续翻译${nextBatch}个 (${translateOffset.value}/${total})`
  }
})

// 处理设置变更
const handleSettingChange = (event) => {
  const { key, value } = event.detail
  debug.log('⚙️ 设置变更:', key, value)

  if (key === 'showHotValue' || key === 'showDescription' || key === 'themeMode') {
    // settingsStore 已经自动更新了，首页直接使用 settingsStore 的状态
    debug.log(`✅ ${key} 已通过 settingsStore 自动更新`)
  } else if (key === 'customPlatformOrder') {
    // settingsStore 已经自动更新了，这里只需要记录日志
    debug.log('✅ 自定义平台顺序已更新 (ID数组):', value)
  } else if (key === 'hiddenPlatforms') {
    // settingsStore 已经自动更新了，这里只需要记录日志
    debug.log('✅ 隐藏平台列表已更新:', Array.from(settingsStore.hiddenPlatforms))
  }
}

// 系统主题变化的处理
let darkModeQuery = null
const handleSystemThemeChange = (e) => {
  const storage = getStorage()
  const savedThemeMode = storage ? storage.getItem(STORAGE_KEYS.THEME_MODE) : null

  if (savedThemeMode === 'auto' || UI.THEME_MODE === 'auto') {
    const html = document.documentElement
    if (e.matches) {
      html.setAttribute('class', 'dark-mode')
    } else {
      html.removeAttribute('class')
    }
    debug.log('🌙 系统主题已切换:', e.matches ? '暗色' : '亮色')
  }
}

// 键盘流（P0.3 终版：←→ 切平台、↑↓/PageUp/Down 移动、1-9 跳条、c 复制、f 收藏、Esc 分层退出）
const handleKeyPress = (event) => {
  // IME 组合态（中文输入法候选期）不触发任何快捷键
  if (event.isComposing) return

  // 老板键：任何状态（含弹层、输入框聚焦）都要响应（FISH-WINDOW-2.0 M1）
  if (event.ctrlKey && !event.shiftKey && !event.altKey && (event.key === '`' || event.code === 'Backquote')) {
    event.preventDefault()
    handleBossKey('hotkey')
    return
  }

  // 输入框聚焦时不触发
  if (event.target.tagName === 'INPUT' ||
      event.target.tagName === 'TEXTAREA' ||
      event.target.isContentEditable) {
    return
  }

  // 引导/弹层打开时：仅 Esc 关闭，其余快捷键失效
  const overlayOpen = settingsStore.showSettings || showRatingDialog.value || showOnboarding.value
  if (overlayOpen) {
    if (event.key === 'Escape') {
      event.preventDefault()
      if (showOnboarding.value) {
        finishOnboarding()
      } else {
        settingsStore.closeSettings()
        showRatingDialog.value = false
      }
    }
    return
  }

  // Esc 分层退出（无弹层 → 退出插件）
  if (event.key === 'Escape') {
    event.preventDefault()
    if (window.utools && window.utools.outPlugin) {
      window.utools.outPlugin()
    }
    return
  }

  // 聚合首页视图：仅支持 ←→ 进入平台
  const inListView = currentView.value === selectedPlatform.value

  // ← → 切换平台
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault()
    const platforms = navigablePlatforms.value
    if (platforms.length === 0) return
    const currentIndex = platforms.findIndex(p => p.id === selectedPlatform.value)
    const base = currentIndex === -1 ? 0 : currentIndex
    const nextIndex = event.key === 'ArrowRight'
      ? (base + 1) % platforms.length
      : (base - 1 + platforms.length) % platforms.length
    switchView(platforms[nextIndex].id)
    return
  }

  if (!inListView) return

  // ↑ ↓ 选择热搜
  if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    event.preventDefault()
    if (hotList.value.length === 0) return
    if (event.key === 'ArrowDown') {
      if (selectedHotIndex.value < hotList.value.length - 1) {
        selectedHotIndex.value++
      }
    } else if (selectedHotIndex.value > 0) {
      selectedHotIndex.value--
    } else if (selectedHotIndex.value === -1) {
      selectedHotIndex.value = 0
    }
    scrollToHotItem(selectedHotIndex.value)
    return
  }

  // PageUp / PageDown 翻页滚动
  if (event.key === 'PageUp' || event.key === 'PageDown') {
    event.preventDefault()
    const el = document.querySelector('.content-section')
    if (el) {
      el.scrollBy({
        top: (event.key === 'PageDown' ? 1 : -1) * el.clientHeight * 0.85,
        behavior: 'smooth'
      })
    }
    return
  }

  // 1-9 跳到第 N 条并选中（排除 Ctrl/Alt/Meta 组合，避免误吞 Ctrl+数字 等系统组合键）
  if (/^[1-9]$/.test(event.key)) {
    if (event.ctrlKey || event.altKey || event.metaKey) return
    const idx = parseInt(event.key, 10) - 1
    if (idx < hotList.value.length) {
      selectedHotIndex.value = idx
      scrollToHotItem(idx)
    }
    return
  }

  // c 复制标题 / f 收藏当前选中条（仅无修饰键时触发，Ctrl+C 复制选中文本不被拦截）
  if ((event.key === 'c' || event.key === 'f') && !event.ctrlKey && !event.altKey && !event.metaKey) {
    const item = hotList.value[selectedHotIndex.value]
    if (!item) return
    event.preventDefault()
    if (event.key === 'c') {
      copyTitle(item)
    } else {
      toggleFav(item)
    }
    return
  }

  // Enter 打开选中条目
  if (event.key === 'Enter') {
    const item = hotList.value[selectedHotIndex.value]
    if (item) {
      event.preventDefault()
      openItem(item)
    }
    return
  }

  // F5 / Ctrl+R 刷新
  if (event.key === 'F5' || ((event.ctrlKey || event.metaKey) && event.key === 'r')) {
    event.preventDefault()
    refresh()
    return
  }

  // Ctrl+T 翻译
  if ((event.ctrlKey || event.metaKey) && event.key === 't') {
    if (isTranslatablePlatform.value) {
      event.preventDefault()
      toggleTranslate()
    }
  }
}

// 滚动到指定热搜条目
const scrollToHotItem = (index) => {
  const contentSection = document.querySelector('.content-section')
  if (!contentSection) return

  const items = contentSection.querySelectorAll('.hot-item')
  if (!items || items.length === 0) return

  const targetItem = items[index]
  if (!targetItem) return

  // 计算滚动位置，使目标条目居中显示
  const containerHeight = contentSection.clientHeight
  const itemTop = targetItem.offsetTop
  const itemHeight = targetItem.offsetHeight
  const scrollTop = itemTop - (containerHeight - itemHeight) / 2

  contentSection.scrollTo({
    top: scrollTop,
    behavior: 'smooth'
  })
}

// 组件卸载时移除事件监听
onUnmounted(() => {
  window.removeEventListener('settingChange', handleSettingChange)
  window.removeEventListener('keydown', handleKeyPress)
  if (darkModeQuery) {
    darkModeQuery.removeEventListener('change', handleSystemThemeChange)
  }
  // 清除超时定时器
  if (loadingTimeout.value) {
    clearTimeout(loadingTimeout.value)
  }
  if (ratingTimer) {
    clearTimeout(ratingTimer)
  }
  // 结算未上报的平台停留（pv）
  flushView()
})

// 获取排名样式类（Top3 渐变高亮）
const getRankClass = (index) => {
  return index <= 3 ? 'rank-top top-' + index : ''
}

// 格式化热度数值
const formatHotValue = (value) => {
  if (!value) return ''

  // 处理对象格式（如知乎的热度）
  if (typeof value === 'object' && value.metrics) {
    return value.metrics
  }
  if (typeof value === 'object' && value.num) {
    return `${value.num} ${value.text || ''}`
  }

  // 处理字符串格式（如抖音）
  if (typeof value === 'string') {
    return value
  }

  // 处理数字格式
  if (typeof value === 'number') {
    if (value >= 10000) {
      return (value / 10000).toFixed(1) + '万'
    }
    return value.toString()
  }

  return value.toString()
}

// 应用主题
const applyTheme = (mode) => {
  const html = document.documentElement

  if (mode === 'auto') {
    // 自动模式：根据系统设置
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      html.setAttribute('class', 'dark-mode')
    } else {
      html.removeAttribute('class')
    }
  } else if (mode === 'dark') {
    html.setAttribute('class', 'dark-mode')
  } else {
    html.removeAttribute('class')
  }
}

// 监听滚动事件（实现下拉加载更多）
onMounted(() => {
  debug.log('🔥 热搜组件已挂载')

  // 小窗打开失败降级提示（openUrl 三级降级的最终一级会派发此事件）
  window.addEventListener('fish-window-fallback', () => {
    showToast('小窗打开失败，已用系统浏览器打开（详见控制台）')
  })

  // 加载设置（包括钉住平台、隐藏平台、主题等）
  settingsStore.loadSettings()
  loadFavorites()

  // 恢复上次平台 + 主题（统一存储层：utools 优先，浏览器降级 localStorage）
  const storage = getStorage()
  if (storage) {
    try {
      const savedPlatform = storage.getItem(STORAGE_KEYS.SELECTED_PLATFORM)
      const savedThemeMode = storage.getItem(STORAGE_KEYS.THEME_MODE)

      if (savedPlatform && PLATFORMS.some(p => p.id === savedPlatform)) {
        selectedPlatform.value = savedPlatform
      }
      if (savedThemeMode) {
        applyTheme(savedThemeMode)
      }
    } catch (e) {
      debug.log('⚠️ 读取本地存储失败:', e)
    }
  }

  // 监听设置变更事件
  window.addEventListener('settingChange', handleSettingChange)

  // 加载各平台的更新时间
  try {
    PLATFORMS.forEach(platform => {
      const saved = localStorage.getItem(`platform_update_${platform.id}`)
      if (saved) {
        platformUpdateTimes.value[platform.id] = parseInt(saved)
      }
    })
  } catch (e) {
    debug.warn('加载平台更新时间失败:', e)
  }

  // 监听系统主题变化
  if (window.matchMedia) {
    darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)')
    darkModeQuery.addEventListener('change', handleSystemThemeChange)
  }

  // 默认进入聚合首页；仅在恢复到平台视图时直接拉数据
  if (currentView.value !== 'home') {
    fetchHotData(selectedPlatform.value)
  }

  // 键盘流（P0.3）
  window.addEventListener('keydown', handleKeyPress)
  debug.log('⌨️ 键盘流已启用：←→ 平台 · ↑↓/1-9 选择 · Enter 打开 · c 复制 · f 收藏 · Esc 退出')

  // 首次进入操作引导（先于好评提醒检查，首次会话不弹好评）
  checkOnboarding()

  // 五星好评提醒（每周最多一次，延迟 8 秒弹出）
  scheduleRatingReminder()
})

// 处理滚动事件
const handleScroll = (event) => {
  const { scrollTop, scrollHeight, clientHeight } = event.target

  // 滚动到底部时加载更多
  if (scrollHeight - scrollTop - clientHeight < 100) {
    if (hasMore.value && !loading.value && !loadingMore.value) {
      debug.log('📜 触发加载更多')
      loadMore()
    }
  }
}

// 监听平台变化，保存到本地存储
watch(selectedPlatform, (newPlatform) => {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.setItem(STORAGE_KEYS.SELECTED_PLATFORM, newPlatform)
  } catch (e) {
    debug.log('⚠️ 保存平台失败:', e)
  }
})
</script>

<template>
  <div class="hot-search-container">
    <!-- 左侧栏（P0.2 定稿布局） -->
    <PlatformSidebar
      :current-view="currentView"
      :pinned-active="pinnedActive"
      :category-active="categoryActive"
      :favorite-count="favoriteCount"
      :show-translate="currentView !== 'home' && isTranslatablePlatform"
      :translating="autoTranslate"
      :translate-tip="translateButtonText"
      :translate-progress="translateOffset > 0 && currentView !== 'home' ? `${translateOffset}/${hotList.length}` : ''"
      :loading="loading"
      @select="switchView"
      @pin-toggle="settingsStore.togglePin"
      @translate="toggleTranslate"
      @refresh="refresh"
      @boss-key="handleBossKey('button')"
      @settings="openSettings"
    />

    <!-- 主区 -->
    <main class="main-area">
      <div class="main-head">
        <template v-if="currentView === 'home'">
          <span class="main-title">我的热榜</span>
          <span class="main-sub">{{ todayText }} · 钉住平台聚合</span>
          <button
            class="head-btn push-right"
            :class="{ 'on-brand': aggregateSorting }"
            :title="aggregateSorting ? '完成排序' : '调整卡片顺序'"
            @click="aggregateSorting = !aggregateSorting"
          >
            <ArrowUpDown :size="14" />
          </button>
          <button class="head-btn" title="刷新聚合数据" @click="refreshAggregate">
            <RefreshCw :size="14" :class="{ spinning: aggregateLoading }" />
          </button>
        </template>
        <template v-else-if="currentView === 'favorites'">
          <span class="main-title">我的收藏</span>
          <span class="main-sub mrs-tnum" v-if="favoriteCount > 0">{{ favoriteCount }} 条</span>
        </template>
        <template v-else-if="currentPlatformObj">
          <span class="main-title">{{ currentPlatformObj.name }}</span>
          <span
            v-if="dataFreshness && currentView === selectedPlatform"
            :class="['freshness-indicator', `freshness-${dataFreshness.status}`]"
            :title="`数据更新于 ${dataFreshness.text}`"
          >
            {{ dataFreshness.icon }} {{ dataFreshness.text }}
          </span>
          <span v-if="staleInfo" class="stale-badge" title="网络异常，正在展示缓存数据">
            缓存 {{ mirrorAgeText(staleInfo.ts) }}
          </span>
          <button class="head-btn push-right" :disabled="loading" :title="loading ? '加载中...' : '刷新数据'" @click="refresh">
            <RefreshCw :size="14" :class="{ spinning: loading }" />
          </button>
        </template>
      </div>

      <!-- 加载进度条：切平台/刷新期间（无镜像时配合骨架屏，有镜像时提示后台更新中） -->
      <div v-if="isLoadingView" class="loading-bar" aria-hidden="true"><span></span></div>

      <div class="main-body">
        <!-- 聚合首页（默认视图） -->
        <AggregateHome
          v-if="currentView === 'home'"
          ref="aggregateRef"
          :pinned-ids="settingsStore.pinnedPlatforms"
          :show-hot-value="settingsStore.showHotValue"
          :sorting="aggregateSorting"
          @open-platform="switchView"
          @open-item="openFromCard"
        />

        <!-- 我的收藏（跨平台收藏流） -->
        <FavoritesView
          v-else-if="currentView === 'favorites'"
          @open-item="openFavItem"
        />

        <!-- 单平台列表视图 -->
        <div v-else class="content-section" @scroll="handleScroll">
          <!-- 骨架屏（无镜像时的加载态） -->
          <div v-if="loading && hotList.length === 0" class="skeleton-list">
            <div v-for="n in 8" :key="'sk' + n" class="skeleton-item">
              <span class="skeleton sk-rank"></span>
              <span class="skeleton sk-line" :style="{ width: (68 - n * 4) + '%' }"></span>
              <span class="skeleton sk-hot"></span>
            </div>
          </div>

          <!-- 错误状态 -->
          <ErrorState
            v-else-if="error && hotList.length === 0"
            :message="error"
            @retry="refresh"
          />

          <!-- 空数据状态 -->
          <div v-else-if="!loading && hotList.length === 0" class="empty-state">
            <p class="empty-icon">📭</p>
            <p>暂无热搜数据</p>
            <p class="empty-tip">请尝试切换其他平台</p>
          </div>

          <!-- 列表 -->
          <div v-else class="hot-list">
            <!-- Epic 免费游戏 - 卡片布局 -->
            <template v-if="isGamePlatform">
              <div class="artwork-grid">
                <ArtworkCard
                  v-for="(item, index) in hotList"
                  :key="item.id || index"
                  :artwork="item"
                  :index="item.index || index + 1"
                  :showDescription="settingsStore.showDescription"
                  @click="openItem(item)"
                />
              </div>
            </template>

            <!-- 芝加哥艺术学院 - 列表布局 -->
            <template v-else-if="isArticPlatform">
              <ArtworkListItem
                v-for="(item, index) in filteredArtworks"
                :key="item.id || index"
                :artwork="item"
                :index="item.index"
                :showDescription="settingsStore.showDescription"
                :autoTranslate="autoTranslate"
                @click="openItem(item)"
              />
            </template>

            <!-- 普通热搜布局（含 P0.3 行内操作） -->
            <template v-else>
              <div
                v-for="(item, index) in hotList"
                :key="index"
                @click="openItem(item)"
                @mouseenter="selectedHotIndex = index"
                :class="['hot-item', {
                  'no-desc': !settingsStore.showDescription || !item.desc,
                  'selected': selectedHotIndex === index
                }]"
              >
                <div class="hot-rank" :class="getRankClass(index + 1)">
                  {{ index + 1 }}
                </div>
                <div class="hot-content">
                  <div class="hot-title" :title="item.title">{{ item.title }}</div>
                  <div v-if="item.desc && settingsStore.showDescription" class="hot-desc">{{ item.desc }}</div>
                </div>
                <div class="item-acts" @click.stop>
                  <button
                    class="act-btn"
                    :class="{ on: isFav(item) }"
                    :title="isFav(item) ? '取消收藏' : '收藏'"
                    @click="toggleFav(item)"
                  >
                    <Star :size="13" />
                  </button>
                  <button class="act-btn" title="复制标题" @click="copyTitle(item)">
                    <Copy :size="13" />
                  </button>
                  <button class="act-btn" title="复制链接" @click="copyLink(item)">
                    <Link :size="13" />
                  </button>
                </div>
                <div v-if="item.hot && settingsStore.showHotValue" class="hot-value">
                  <Flame :size="12" class="hot-flame" />{{ formatHotValue(item.hot) }}
                </div>
                <!-- 缩略图（B站封面/知乎配图/电影海报等，no-referrer 绕过图床防盗链，失败自动隐藏） -->
                <div v-if="item.img && settingsStore.showThumbnails" class="hot-thumb" :title="item.title">
                  <img :src="item.img" loading="lazy" alt="" referrerpolicy="no-referrer" @error="item.img = ''" />
                </div>
              </div>
            </template>

            <!-- 加载更多 -->
            <div v-if="hasMore" class="load-more-container">
              <button
                @click="loadMore"
                :disabled="loadingMore"
                class="load-more-btn"
              >
                <span v-if="loadingMore">加载中...</span>
                <span v-else>加载更多</span>
              </button>
            </div>

            <div v-else-if="hotList.length > 0 && !hasMore" class="no-more-tip">
              <p>— 已经到底了 —</p>
            </div>
          </div>

          <!-- 加载更多时的加载状态 -->
          <div v-if="loadingMore" class="loading-more">
            <div class="loading-spinner small"></div>
            <p>加载更多...</p>
          </div>
        </div>
      </div>
    </main>

    <!-- 设置面板 -->
    <Settings :show="settingsStore.showSettings" @close="closeSettings"></Settings>

    <!-- 埋点调试面板 - 仅在开发环境显示 -->
    <AnalyticsDebugPanel v-if="isDev" />

    <!-- 首次进入操作引导 -->
    <div v-if="showOnboarding" class="onboard-modal" @click="finishOnboarding">
      <div class="onboard-content" @click.stop>
        <img src="/logo.svg" alt="摸鱼热搜" class="onboard-logo-img" />
        <h3 class="onboard-title">欢迎来到摸鱼热搜</h3>
        <p class="onboard-sub">52 个平台的热搜，摸鱼姿势一次学会</p>

        <div class="onboard-steps">
          <div class="onboard-step">
            <span class="step-ico"><Pin :size="18" /></span>
            <div class="step-text">
              <b>钉住常用平台</b>
              <span>左侧栏点击平台看榜单，悬停点 📌 钉住，聚合首页一屏看遍</span>
            </div>
          </div>
          <div class="onboard-step">
            <span class="step-ico"><Fish :size="18" /></span>
            <div class="step-text">
              <b>无痕小窗摸鱼</b>
              <span>点击热搜条目在内置小窗打开：不占任务栏、不留浏览历史</span>
            </div>
          </div>
          <div class="onboard-step">
            <span class="step-ico"><Shield :size="18" /></span>
            <div class="step-text">
              <b>老板键一键隐身</b>
              <span>Ctrl + ` 隐藏所有摸鱼窗口，再按一次恢复；可在 uTools 绑定全局快捷键</span>
            </div>
          </div>
          <div class="onboard-step">
            <span class="step-ico"><Keyboard :size="18" /></span>
            <div class="step-text">
              <b>键盘流</b>
              <span>← → 切平台 · ↑ ↓ / 1-9 选条目 · Enter 打开 · c 复制 · f 收藏</span>
            </div>
          </div>
        </div>

        <p class="onboard-hint">小窗透明度、自动静音、站点净化等更多玩法在「设置」里</p>
        <button class="onboard-btn" @click="finishOnboarding">开始摸鱼</button>
      </div>
    </div>

    <!-- 五星好评提醒（每周最多一次） -->
    <div v-if="showRatingDialog" class="rate-modal" @click="dismissRatingPrompt">
      <div class="rate-content" @click.stop>
        <button class="rate-close" @click="dismissRatingPrompt">✕</button>
        <div class="rate-stars">⭐⭐⭐⭐⭐</div>
        <h3 class="rate-title">喜欢摸鱼热搜吗？</h3>
        <p class="rate-desc">如果觉得好用，欢迎去 uTools 插件市场给我们一个五星好评，让更多人发现它～</p>
        <div class="rate-actions">
          <button class="rate-btn ghost" @click="dismissRatingPrompt">下次再说</button>
          <button class="rate-btn primary" @click="goRate">⭐ 去好评</button>
        </div>
        <button class="rate-never" @click="neverRatePrompt">不再提醒</button>
      </div>
    </div>

    <!-- Toast（P0.3 轻提示） -->
    <Transition name="fade">
      <div v-if="toastMsg" class="toast">{{ toastMsg }}</div>
    </Transition>
  </div>
</template>

<style scoped>
.hot-search-container {
  width: 100%;
  height: 100vh;
  background-color: var(--color-bg);
  display: flex;
  flex-direction: row;
  overflow: hidden;
}

/* 主区（P0.2 侧栏右侧） */
.main-area {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.main-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 13px 16px 9px;
  flex-shrink: 0;
}

/* 头部按钮组推到最右（聚合首页：排序+刷新紧挨成组，不挤在标题中间） */
.main-head .head-btn.push-right {
  margin-left: auto;
}

.main-title {
  font-size: var(--font-xl);
  font-weight: 600;
  color: var(--color-text);
}

.main-sub {
  font-size: var(--font-sm);
  color: var(--color-text-muted);
}

.head-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: var(--radius-sm);
  background: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
  cursor: pointer;
}

.head-btn:hover:not(:disabled) {
  background: var(--color-surface-muted-hover);
  color: var(--color-text);
}

.head-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.head-btn .spinning {
  animation: spin 0.8s linear infinite;
}

/* 排序按钮激活态（品牌色） */
.head-btn.on-brand {
  color: var(--color-brand-text);
  background: var(--color-brand-selected-bg);
}

/* 加载进度条（主区头部下方，2px 品牌渐变滑动） */
.loading-bar {
  height: 2px;
  flex-shrink: 0;
  overflow: hidden;
}

.loading-bar span {
  display: block;
  height: 100%;
  width: 40%;
  border-radius: 2px;
  background: var(--gradient-brand);
  animation: loadingSlide 1.1s ease-in-out infinite;
}

@keyframes loadingSlide {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(350%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .loading-bar span {
    animation-duration: 3s;
  }
}

/* 镜像滞后角标（P0.1） */
.stale-badge {
  font-size: var(--font-xs);
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  background: var(--color-surface-muted);
  color: var(--color-text-3);
}

.main-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* 数据新鲜度指示器 */
.freshness-indicator {
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  padding: 2px 6px;
  margin-left: 8px;
  border-radius: 10px;
  white-space: nowrap;
  animation: fadeIn 0.3s ease;
  font-weight: 500;
}

.freshness-fresh {
  background: rgba(76, 175, 80, 0.2);
  color: #fff;
}

.freshness-good {
  background: rgba(255, 193, 7, 0.2);
  color: #fff;
}

.freshness-okay {
  background: rgba(255, 152, 0, 0.2);
  color: #fff;
}

.freshness-stale {
  background: rgba(244, 67, 54, 0.2);
  color: #fff;
  animation: pulse 2s infinite;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-2px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* 在小窗口中优化显示 */
@media (max-height: 600px) {
  .freshness-indicator {
    font-size: 10px;
    padding: 1px 4px;
    margin-left: 4px;
  }
}

/* 内容区域 */
.content-section {
  flex: 1;
  overflow-y: auto;
  padding: 5px;
  position: relative;
}

/* 骨架屏列表（P0.1 无镜像时的加载态） */
.skeleton-list {
  padding: 6px 16px;
}

.skeleton-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 0;
}

.sk-rank {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  flex: none;
}

.sk-line {
  height: 14px;
  flex: 1;
}

.sk-hot {
  width: 52px;
  height: 12px;
  flex: none;
}

.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.error-icon,
.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.error-message {
  color: var(--color-error);
  margin-bottom: 12px;
  font-size: 14px;
}

.empty-tip {
  color: var(--color-text-muted);
  font-size: 13px;
  margin-top: 8px;
}

.retry-btn,
.load-more-btn {
  padding: 8px 24px;
  border: none;
  border-radius: 6px;
  background-color: var(--color-btn-primary);
  color: #ffffff;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.retry-btn:hover,
.load-more-btn:hover:not(:disabled) {
  background-color: var(--color-btn-primary-hover);
}

.retry-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-border-light);
  border-top-color: var(--color-accent-text);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.loading-spinner.small {
  width: 24px;
  height: 24px;
  border-width: 2px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 热搜列表 */
.hot-list {
  background-color: transparent;
  border-radius: 8px;
  overflow: hidden;
}

.artwork-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  padding: 8px;
}

@media (max-width: 768px) {
  .artwork-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 12px;
  }
}

@media (max-width: 480px) {
  .artwork-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
}

.hot-item {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  margin-bottom: 0;
  background: var(--color-surface);
  border: none;
  border-radius: 0;
  border-bottom: 1px solid var(--color-border-light);
  cursor: pointer;
  transition: background-color 0.2s ease;
  box-shadow: none;
}

.hot-item:last-child {
  border-bottom: none;
}

.hot-item:hover {
  background-color: var(--color-surface-hover);
}

/* 键盘选中状态 */
.hot-item.selected {
  background-color: var(--color-selected-bg);
  border-left: 3px solid var(--color-accent-text);
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.15);
}

.hot-item.selected .hot-title {
  color: var(--color-accent-text-hover);
  font-weight: 500;
}

.hot-rank {
  width: 21px;
  height: 21px;
  border-radius: 7px;
  background-color: var(--color-rank);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  line-height: 1;
  flex-shrink: 0;
  margin-right: 10px;
  font-variant-numeric: tabular-nums;
}

/* 有简介时编号对齐标题首行，而不是对整个「标题+简介」块垂直居中 */
.hot-item:not(.no-desc) .hot-rank {
  align-self: flex-start;
  margin-top: 1px;
}

/* Top3 排名高亮（getRankClass 输出，§11.2 色阶） */
.hot-rank.rank-top.top-1 {
  background: linear-gradient(135deg, var(--brand-fire-2), var(--brand-fire-3));
}

.hot-rank.rank-top.top-2 {
  background: var(--brand-fire-2);
}

.hot-rank.rank-top.top-3 {
  background: var(--brand-fire-1);
}

.hot-content {
  flex: 1;
  min-width: 0;
}

.hot-title {
  font-size: 15px;
  color: var(--color-text);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hot-desc {
  font-size: 13px;
  color: var(--color-text-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 4px;
}

.hot-value {
  font-size: 12px;
  color: var(--color-hot);
  flex-shrink: 0;
  margin-left: 12px;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-variant-numeric: tabular-nums;
}

.hot-flame {
  color: var(--color-hot);
}

/* 条目缩略图（右侧，视频封面/配图/海报） */
.hot-thumb {
  width: 76px;
  height: 42px;
  flex: none;
  margin-left: 12px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--color-surface-muted);
  align-self: center;
}

.hot-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* 行内操作（P0.3：hover/选中浮现，不与热度值重叠） */
.item-acts {
  display: none;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.hot-item:hover .item-acts,
.hot-item.selected .item-acts,
.hot-item:focus-within .item-acts {
  display: inline-flex;
}

.act-btn {
  width: 26px;
  height: 26px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.act-btn:hover {
  background: var(--color-surface-muted-hover);
  color: var(--color-text);
}

.act-btn.on {
  color: #f0a800;
}

.act-btn.on svg {
  fill: currentColor;
}

/* 加载更多 */
.load-more-container {
  padding: 16px;
  text-align: center;
}

.no-more-tip {
  padding: 16px;
  text-align: center;
  color: var(--color-text-muted);
  font-size: 13px;
}

.loading-more {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  color: var(--color-text-muted);
}

.loading-more p {
  margin-top: 8px;
  font-size: 13px;
}

/* ========== 暗色特例（无法变量化的渐变，仅保留以下几条） ========== */
html.dark-mode .filter-btn.active {
  border-color: #0056b3;
  background: linear-gradient(135deg, #0056b3, #003d82);
  color: #ffffff;
}

/* ========== 五星好评提醒弹窗（每周最多一次） ========== */

.rate-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
  animation: donateFadeIn 0.3s ease;
}

@keyframes donateFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.rate-content {
  background-color: var(--color-surface);
  border-radius: var(--radius-xl);
  padding: 32px;
  max-width: 400px;
  width: 90%;
  box-shadow: var(--shadow-lg);
  animation: slideUp 0.3s ease;
  position: relative;
  text-align: center;
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.rate-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border: none;
  background-color: var(--color-bg);
  border-radius: 50%;
  font-size: 18px;
  color: var(--color-text-2);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.rate-close:hover {
  background-color: var(--color-surface-muted-hover);
  color: var(--color-text);
}

.rate-stars {
  font-size: 28px;
  letter-spacing: 4px;
  margin-bottom: 12px;
}

.rate-title {
  font-size: var(--font-xxl);
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 12px 0;
}

.rate-desc {
  font-size: var(--font-base);
  color: var(--color-text-3);
  margin: 0 0 24px 0;
  line-height: 1.6;
}

.rate-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 16px;
}

.rate-btn {
  flex: 1;
  max-width: 150px;
  padding: 10px 16px;
  border-radius: var(--radius-md);
  font-size: var(--font-base);
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.rate-btn.ghost {
  background-color: var(--color-bg);
  color: var(--color-text-2);
  border-color: var(--color-border-light);
}

.rate-btn.ghost:hover {
  color: var(--color-text);
  border-color: var(--color-border);
}

.rate-btn.primary {
  background: linear-gradient(135deg, #ff9f1c, #ff6b35);
  color: #ffffff;
  font-weight: 600;
}

.rate-btn.primary:hover {
  filter: brightness(1.05);
  transform: translateY(-1px);
}

.rate-never {
  border: none;
  background: none;
  padding: 0;
  font-size: var(--font-sm, 12px);
  color: var(--color-text-muted);
  text-decoration: underline;
  cursor: pointer;
}

.rate-never:hover {
  color: var(--color-text-2);
}

/* ========== 首次进入操作引导 ========== */

.onboard-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
  animation: donateFadeIn 0.3s ease;
}

.onboard-content {
  background-color: var(--color-surface);
  border-radius: var(--radius-xl);
  padding: 28px 32px;
  max-width: 460px;
  width: 92%;
  max-height: 86vh;
  overflow-y: auto;
  box-shadow: var(--shadow-lg);
  animation: slideUp 0.3s ease;
  text-align: center;
}

.onboard-logo-img {
  width: 60px;
  height: 60px;
  border-radius: 15px;
  margin-bottom: 12px;
}

.onboard-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 6px 0;
}

.onboard-sub {
  font-size: var(--font-sm, 13px);
  color: var(--color-text-3);
  margin: 0 0 20px 0;
}

.onboard-steps {
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.onboard-step {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  background-color: var(--color-bg);
  border-radius: var(--radius-md);
  padding: 12px 14px;
}

.step-ico {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 9px;
  background: var(--gradient-brand);
  color: #ffffff;
  flex: none;
}

.step-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.step-text b {
  font-size: var(--font-base);
  color: var(--color-text);
}

.step-text span {
  font-size: var(--font-sm, 12px);
  color: var(--color-text-3);
  line-height: 1.5;
}

.onboard-hint {
  font-size: var(--font-sm, 12px);
  color: var(--color-text-muted);
  margin: 0 0 16px 0;
}

.onboard-btn {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, #ff9f1c, #ff6b35);
  color: #ffffff;
  font-size: var(--font-lg, 15px);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.onboard-btn:hover {
  filter: brightness(1.05);
  transform: translateY(-1px);
}
</style>

