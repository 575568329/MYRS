/**
 * 热搜数据状态管理 Store
 * 使用 Pinia 管理热搜相关的所有状态
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getHotData, PLATFORMS, getPlatformsByCategory, getCategories, getPlatformsByMode } from '../services/hotSearchApi.js'
import { DISPLAY_MODE, STORAGE_KEYS, UI, API } from '../config.js'
// 埋点追踪导入（可选）
import { trackEvent } from '../services/analytics/analyticsCollector.js'
import { EventType } from '../services/analytics/eventTypes.js'

export const useHotSearchStore = defineStore('hotSearch', () => {
  // ========== 状态 ==========
  const selectedPlatform = ref('baidu')
  const selectedCategory = ref(DISPLAY_MODE.DEFAULT_MODE === 'simple' ? '全部' : '全部')
  const hotList = ref([])
  const loading = ref(false)
  const error = ref(null)
  const loadingMore = ref(false)
  const hasMore = ref(false)
  const currentPage = ref(1)
  const totalCount = ref(0)
  const updateTime = ref('')
  const recentPlatforms = ref([])
  const favoriteItems = ref(new Set())
  const autoRefreshTimer = ref(null)

  // 加载超时控制
  const loadingTimeout = ref(null)
  const lastRequestTime = ref(0)

  // 大都会博物馆筛选选项
  const metMuseumFilter = ref('all')

  // 自定义平台顺序
  const customPlatformOrder = ref(null)

  const categories = getCategories()

  // ========== 计算属性 ==========
  const isSimpleMode = computed(() => {
    return DISPLAY_MODE.DEFAULT_MODE === 'simple'
  })

  const isArticPlatform = computed(() => {
    return selectedPlatform.value === 'artic'
  })

  const isMetMuseumPlatform = computed(() => {
    return selectedPlatform.value === 'metmuseum'
  })

  const isArtworkPlatform = computed(() => {
    return isArticPlatform.value || isMetMuseumPlatform.value
  })

  const isTranslatablePlatform = computed(() => {
    return isArticPlatform.value || isMetMuseumPlatform.value
  })

  const filteredArtworks = computed(() => {
    return hotList.value
  })

  const filteredPlatforms = computed(() => {
    if (DISPLAY_MODE.DEFAULT_MODE === 'simple') {
      return getPlatformsByMode(customPlatformOrder.value)
    }

    if (!selectedCategory.value || selectedCategory.value === '全部') {
      return PLATFORMS
    }

    return getPlatformsByCategory(selectedCategory.value)
  })

  const currentPlatformObj = computed(() => {
    return PLATFORMS.find(p => p.id === selectedPlatform.value)
  })

  // ========== Actions ==========

  /**
   * 获取热搜数据
   * @param {string} platformId - 平台ID
   * @param {boolean} loadMore - 是否加载更多
   */
  async function fetchHotData(platformId, loadMore = false) {
    // 追踪埋点：平台数据加载开始
    if (!loadMore) {
      trackEvent(EventType.PLATFORM_LOAD_START, {
        platform: platformId
      })
    }

    // 防止频繁请求（防抖）
    const now = Date.now()
    if (!loadMore && now - lastRequestTime.value < API.MIN_REQUEST_INTERVAL) {
      console.log('⚠️ 请求过于频繁，已忽略')
      return
    }

    // 防止重复请求
    if ((loading.value && !loadMore) || loadingMore.value) {
      console.log('⚠️ 正在加载中，跳过重复请求')
      return
    }

    lastRequestTime.value = now

    if (loadMore) {
      loadingMore.value = true
    } else {
      loading.value = true
      error.value = null
      currentPage.value = 1
    }

    // 设置超时定时器
    if (loadingTimeout.value) {
      clearTimeout(loadingTimeout.value)
    }

    const platformTimeout = API.PLATFORM_TIMEOUT[platformId] || API.REQUEST_TIMEOUT

    loadingTimeout.value = setTimeout(() => {
      if (loading.value || loadingMore.value) {
        console.warn(`⏰ 请求超时（${platformTimeout}ms），强制关闭加载状态`)
        loading.value = false
        loadingMore.value = false
      }
    }, platformTimeout)

    try {
      console.log(`🎯 开始获取 ${platformId} 的热搜数据`)

      const requestParams = {
        page: currentPage.value,
        pageSize: 50
      }

      if (platformId === 'metmuseum' && metMuseumFilter.value === 'china') {
        requestParams.geoLocation = 'China'
      }

      const result = await getHotData(platformId, requestParams)

      if (loadingTimeout.value) {
        clearTimeout(loadingTimeout.value)
        loadingTimeout.value = null
      }

      if (result && typeof result === 'object' && result.data) {
        if (result.error) {
          throw new Error(result.error)
        }

        if (loadMore) {
          hotList.value = [...hotList.value, ...result.data]
        } else {
          hotList.value = result.data
        }

        totalCount.value = result.total || 0
        hasMore.value = result.hasMore || false
        updateTime.value = new Date().toLocaleString()

        // 添加到最近使用平台
        addToRecentPlatforms(platformId)

        // 追踪埋点：平台数据加载成功
        trackEvent(EventType.PLATFORM_LOAD_SUCCESS, {
          platform: platformId,
          data_count: result.data.length,
          load_more: loadMore
        })

        console.log(`✅ 成功获取 ${result.data.length} 条热搜数据`)
      }
    } catch (err) {
      console.error('❌ 获取热搜数据失败:', err)

      // 追踪埋点：平台数据加载失败
      trackEvent(EventType.PLATFORM_LOAD_ERROR, {
        platform: platformId,
        error_message: err.message
      })

      if (loadingTimeout.value) {
        clearTimeout(loadingTimeout.value)
        loadingTimeout.value = null
      }

      error.value = err.message || '获取数据失败'
      hotList.value = []
      totalCount.value = 0
      hasMore.value = false
    } finally {
      loading.value = false
      loadingMore.value = false
    }
  }

  /**
   * 加载更多数据
   */
  function loadMore() {
    if (!hasMore.value || loadingMore.value) return

    currentPage.value++

    // 追踪埋点：加载更多
    trackEvent(EventType.LOAD_MORE, {
      platform: selectedPlatform.value,
      page: currentPage.value
    })

    fetchHotData(selectedPlatform.value, true)
  }

  /**
   * 刷新当前平台数据
   */
  function refresh() {
    // 追踪埋点：刷新数据
    trackEvent(EventType.REFRESH, {
      platform: selectedPlatform.value
    })

    fetchHotData(selectedPlatform.value, false)
  }

  /**
   * 切换平台
   * @param {string} platformId - 平台ID
   */
  function switchPlatform(platformId) {
    console.log(`[Store] 🔄 switchPlatform 被调用: ${platformId}`)

    if (selectedPlatform.value === platformId) {
      console.log(`[Store] ⏭️  跳过，已经是当前平台`)
      return
    }

    const fromPlatform = selectedPlatform.value
    selectedPlatform.value = platformId
    currentPage.value = 1

    // 追踪埋点：平台切换
    console.log(`[Store] 📊 准备追踪平台切换事件: ${fromPlatform} -> ${platformId}`)
    trackEvent(EventType.PLATFORM_SWITCH, {
      from_platform: fromPlatform,
      to_platform: platformId
    })

    fetchHotData(platformId, false)
  }

  /**
   * 切换分类
   * @param {string} category - 分类名称
   */
  function switchCategory(category) {
    if (selectedCategory.value === category) return

    selectedCategory.value = category

    // 追踪埋点：分类切换
    trackEvent(EventType.CATEGORY_SWITCH, {
      category: category
    })

    // 切换分类后，重置为默认平台（如果当前平台不在新分类中）
    const platformsInCategory = getPlatformsByCategory(category)
    const currentPlatformInCategory = platformsInCategory.find(p => p.id === selectedPlatform.value)

    if (!currentPlatformInCategory && platformsInCategory.length > 0) {
      // 如果当前平台不在新分类中，切换到该分类的第一个平台
      selectedPlatform.value = platformsInCategory[0].id
      fetchHotData(platformsInCategory[0].id, false)
    }
  }

  /**
   * 添加到最近使用平台
   * @param {string} platformId - 平台ID
   */
  function addToRecentPlatforms(platformId) {
    const platforms = [...recentPlatforms.value]
    const index = platforms.indexOf(platformId)

    if (index > -1) {
      platforms.splice(index, 1)
    }

    platforms.unshift(platformId)

    if (platforms.length > UI.MAX_RECENT_PLATFORMS) {
      platforms.pop()
    }

    recentPlatforms.value = platforms

    // 持久化到本地存储
    if (window.utools && window.utools.dbStorage) {
      try {
        window.utools.dbStorage.setItem(
          STORAGE_KEYS.RECENT_PLATFORMS,
          JSON.stringify(platforms)
        )
      } catch (e) {
        console.warn('保存最近使用平台失败:', e)
      }
    }
  }

  /**
   * 从本地存储加载最近使用平台
   */
  function loadRecentPlatforms() {
    if (window.utools && window.utools.dbStorage) {
      try {
        const saved = window.utools.dbStorage.getItem(STORAGE_KEYS.RECENT_PLATFORMS)
        if (saved) {
          recentPlatforms.value = JSON.parse(saved)
        }
      } catch (e) {
        console.warn('加载最近使用平台失败:', e)
      }
    }
  }

  /**
   * 收藏/取消收藏项目
   * @param {Object} item - 热搜项目
   */
  function toggleFavorite(item) {
    const key = `${selectedPlatform.value}_${item.title}`
    const isAdding = !favoriteItems.value.has(key)

    if (favoriteItems.value.has(key)) {
      favoriteItems.value.delete(key)
    } else {
      favoriteItems.value.add(key)
    }

    // 追踪埋点：收藏切换
    trackEvent(EventType.FAVORITE_TOGGLE, {
      platform: selectedPlatform.value,
      item_title: item.title,
      is_favorite: isAdding
    })

    // 持久化到本地存储 - 将 Set 转换为数组
    if (window.utools && window.utools.dbStorage) {
      try {
        const favoritesArray = Array.from(favoriteItems.value)
        window.utools.dbStorage.setItem(
          STORAGE_KEYS.FAVORITE_ITEMS,
          JSON.stringify(favoritesArray)
        )
      } catch (e) {
        console.warn('保存收藏失败:', e)
      }
    }
  }

  /**
   * 检查项目是否已收藏
   * @param {Object} item - 热搜项目
   * @returns {boolean}
   */
  function isFavorite(item) {
    const key = `${selectedPlatform.value}_${item.title}`
    return favoriteItems.value.has(key)
  }

  /**
   * 从本地存储加载收藏
   */
  function loadFavorites() {
    if (window.utools && window.utools.dbStorage) {
      try {
        const saved = window.utools.dbStorage.getItem(STORAGE_KEYS.FAVORITE_ITEMS)
        if (saved) {
          // 将数组转换回 Set
          const favoritesArray = JSON.parse(saved)
          favoriteItems.value = new Set(favoritesArray)
        }
      } catch (e) {
        console.warn('加载收藏失败:', e)
        // 加载失败时，初始化为空 Set
        favoriteItems.value = new Set()
      }
    }
  }

  /**
   * 滚动到顶部
   */
  function scrollToTop() {
    const listElement = document.querySelector('.hot-list-wrapper')
    if (listElement) {
      listElement.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  /**
   * 更新平台顺序
   * @param {Array<string>} order - 平台ID顺序
   */
  function updatePlatformOrder(order) {
    customPlatformOrder.value = order

    if (window.utools && window.utools.dbStorage) {
      try {
        window.utools.dbStorage.setItem(
          STORAGE_KEYS.CUSTOM_PLATFORM_ORDER,
          JSON.stringify(order)
        )
      } catch (e) {
        console.warn('保存平台顺序失败:', e)
      }
    }
  }

  /**
   * 从本地存储加载平台顺序
   */
  function loadPlatformOrder() {
    if (window.utools && window.utools.dbStorage) {
      try {
        const saved = window.utools.dbStorage.getItem(STORAGE_KEYS.CUSTOM_PLATFORM_ORDER)
        if (saved) {
          const parsedOrder = JSON.parse(saved)
          if (Array.isArray(parsedOrder) && parsedOrder.length > 0) {
            // 增量合并：保留用户顺序，添加配置文件中的新平台
            const defaultPlatforms = DISPLAY_MODE.SIMPLE_MODE_PLATFORMS
            const newPlatforms = defaultPlatforms.filter(id => !parsedOrder.includes(id))

            if (newPlatforms.length > 0) {
              const mergedOrder = [...parsedOrder, ...newPlatforms]
              customPlatformOrder.value = mergedOrder
              // 自动保存合并后的顺序
              window.utools.dbStorage.setItem(
                STORAGE_KEYS.CUSTOM_PLATFORM_ORDER,
                JSON.stringify(mergedOrder)
              )
              console.log('🔄 发现新平台，已自动合并:', newPlatforms)
            } else {
              customPlatformOrder.value = parsedOrder
            }
          }
        }
      } catch (e) {
        console.warn('加载平台顺序失败:', e)
      }
    }
  }

  /**
   * 设置大都会博物馆筛选
   * @param {string} filter - 筛选值 ('all' 或 'china')
   */
  function setMetMuseumFilter(filter) {
    metMuseumFilter.value = filter

    // 追踪埋点：筛选变更
    trackEvent(EventType.FILTER_CHANGE, {
      platform: 'metmuseum',
      filter_type: 'geo_location',
      filter_value: filter
    })
  }

  /**
   * 初始化埋点系统
   * @param {Object} options - 初始化选项
   */
  async function initAnalytics(options = {}) {
    try {
      const { initAnalytics } = await import('../services/analytics/analyticsCollector.js')
      await initAnalytics(options)
    } catch (error) {
      console.warn('埋点系统初始化失败:', error)
    }
  }

  /**
   * 追踪项目点击事件
   * @param {Object} item - 热搜项目
   * @param {number} position - 项目位置
   */
  function trackItemClick(item, position = 0) {
    trackEvent(EventType.ITEM_CLICK, {
      platform: selectedPlatform.value,
      item_title: item.title,
      item_position: position
    })
  }

  return {
    // 状态
    selectedPlatform,
    selectedCategory,
    hotList,
    loading,
    error,
    loadingMore,
    hasMore,
    currentPage,
    totalCount,
    updateTime,
    recentPlatforms,
    favoriteItems,
    metMuseumFilter,
    customPlatformOrder,
    categories,

    // 计算属性
    isSimpleMode,
    isArticPlatform,
    isMetMuseumPlatform,
    isArtworkPlatform,
    isTranslatablePlatform,
    filteredArtworks,
    filteredPlatforms,
    currentPlatformObj,

    // Actions
    fetchHotData,
    loadMore,
    refresh,
    switchPlatform,
    switchCategory,
    addToRecentPlatforms,
    loadRecentPlatforms,
    toggleFavorite,
    isFavorite,
    loadFavorites,
    scrollToTop,
    updatePlatformOrder,
    loadPlatformOrder,
    setMetMuseumFilter,

    // 埋点相关
    initAnalytics,
    trackItemClick
  }
})
