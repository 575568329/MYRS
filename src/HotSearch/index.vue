<script setup>
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { getHotData, PLATFORMS, getPlatformsByCategory, getCategories, getPlatformsByMode } from '../services/hotSearchApi.js'
import { DISPLAY_MODE, STORAGE_KEYS, UI, AUTO_REFRESH, HOT_LEVELS, API } from '../config.js'
import { trackEvent, EventType } from '../services/analytics/index.js'
import { useSettingsStore } from '../stores/settingsStore.js'
import Settings from '../Settings/index.vue'
import ArtworkListItem from '../components/ArtworkListItem.vue'
import ArtworkCard from '../components/ArtworkCard.vue'
import AnalyticsDebugPanel from '../components/AnalyticsDebugPanel.vue'

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
// 从配置文件读取默认模式：如果是 'simple' 则默认显示 '全部'，如果是 'category' 则可以显示其他分类
const selectedCategory = ref(DISPLAY_MODE.DEFAULT_MODE === 'simple' ? '全部' : '全部')
const hotList = ref([])
const loading = ref(false)
const error = ref(null)
const loadingMore = ref(false)
const hasMore = ref(false)
const currentPage = ref(1)
const totalCount = ref(0)
const canScrollLeft = ref(false)
const canScrollRight = ref(false)
const platformTabsRef = ref(null)
const updateTime = ref('')
const recentPlatforms = ref([])
const favoriteItems = ref(new Set())
const autoRefreshTimer = ref(null)

// 加载超时控制
const loadingTimeout = ref(null)
const lastRequestTime = ref(0)

// UI 设置
const showDonate = ref(false)
const autoTranslate = ref(false) // 自动翻译开关（仅对芝加哥艺术学院有效）
const translateOffset = ref(0) // 翻译偏移量（用于分页翻译）

// 大都会博物馆筛选选项
const metMuseumFilter = ref('all') // 'all' 或 'china'

// 开发环境标志
const isDev = import.meta.env.DEV

const categories = getCategories()

// 判断是否为极简模式（基于配置文件）
const isSimpleMode = computed(() => {
  return DISPLAY_MODE.DEFAULT_MODE === 'simple'
})

// 判断是否为芝加哥艺术学院平台（使用卡片式布局）
const isArticPlatform = computed(() => {
  return selectedPlatform.value === 'artic'
})

// 判断是否为大都会博物馆平台（使用卡片式布局）
const isMetMuseumPlatform = computed(() => {
  return selectedPlatform.value === 'metmuseum'
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
  return isArticPlatform.value || isMetMuseumPlatform.value
})

// 判断是否为游戏平台（使用卡片式布局，类似于艺术品）
const isGamePlatform = computed(() => {
  return isEpicFreePlatform.value
})

// 判断是否为支持翻译的平台（芝加哥艺术学院、大都会博物馆、GitHub Trending、Hacker News）
const isTranslatablePlatform = computed(() => {
  return isArticPlatform.value ||
         isMetMuseumPlatform.value ||
         isGithubTrendingPlatform.value ||
         isHackerNewsPlatform.value
})

// 芝加哥艺术学院 - 艺术品列表
const filteredArtworks = computed(() => {
  return hotList.value
})

// 根据选中的分类过滤平台（与配置联动）
const filteredPlatforms = computed(() => {
  let platforms = []

  // 极简模式：始终显示主流平台
  if (DISPLAY_MODE.DEFAULT_MODE === 'simple') {
    // 将 store 中的平台对象数组转换为 ID 数组传给 getPlatformsByMode
    const orderIds = settingsStore.customPlatformOrder.map(p => p.id)
    platforms = getPlatformsByMode(orderIds)
  } else if (!selectedCategory.value || selectedCategory.value === '全部') {
    // "全部"分类下显示所有平台
    platforms = PLATFORMS
  } else {
    // 具体分类：显示该分类下的所有平台
    platforms = getPlatformsByCategory(selectedCategory.value)
  }

  // 过滤掉隐藏的平台
  return platforms.filter(p => !settingsStore.hiddenPlatforms.has(p.id))
})

// 获取当前选中的平台对象
const currentPlatformObj = computed(() => {
  return PLATFORMS.find(p => p.id === selectedPlatform.value)
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

    // 如果是大都会博物馆且有筛选条件，添加地理位置筛选
    if (platformId === 'metmuseum' && metMuseumFilter.value === 'china') {
      requestParams.geoLocation = 'China'
    }

    const result = await getHotData(platformId, requestParams)

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
    } else {
      // 空数据或其他格式
      hotList.value = []
      hasMore.value = false
      totalCount.value = 0
      debug.warn('⚠️ 未获取到有效数据')
    }

  } catch (err) {
    console.error('❌ 获取热搜失败:', err)

    // 清除超时定时器
    if (loadingTimeout.value) {
      clearTimeout(loadingTimeout.value)
      loadingTimeout.value = null
    }

    // 超时错误直接显示暂无数据
    // AbortError 是由 AbortController 触发的标准超时错误
    if (err.name === 'AbortError' || err.message === '请求超时') {
      debug.log('⏰ 请求超时，显示暂无数据')
      error.value = null
      hotList.value = []
      hasMore.value = false
      totalCount.value = 0
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

    // 如果有错误信息，清空列表
    if (error.value) {
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

// 切换平台
const switchPlatform = (platformId) => {
  if (selectedPlatform.value === platformId) return

  const fromPlatform = selectedPlatform.value
  selectedPlatform.value = platformId
  // 重置翻译偏移量
  translateOffset.value = 0
  // 如果不是艺术品平台，重置筛选
  if (platformId !== 'metmuseum') {
    metMuseumFilter.value = 'all'
  }

  // 追踪平台切换事件
  trackEvent(EventType.PLATFORM_SWITCH, {
    from_platform: fromPlatform,
    to_platform: platformId
  })

  fetchHotData(platformId)
}

// 切换大都会博物馆筛选
const switchMetMuseumFilter = (filter) => {
  if (metMuseumFilter.value === filter) return
  metMuseumFilter.value = filter
  // 重置页码
  currentPage.value = 1
  // 重置翻译偏移量（因为筛选条件变了）
  translateOffset.value = 0

  // 追踪筛选器变更事件
  trackEvent(EventType.FILTER_CHANGE, {
    platform: 'metmuseum',
    filter_type: 'region',
    filter_value: filter
  })

  // 重新获取数据
  fetchHotData('metmuseum')
}

// 切换分类
const switchCategory = (category) => {
  if (selectedCategory.value === category) return

  selectedCategory.value = category

  // 追踪分类切换事件
  trackEvent(EventType.CATEGORY_SWITCH, {
    from_category: selectedCategory.value,
    to_category: category
  })

  // 获取新分类下的平台列表
  const platformsInCategory = filteredPlatforms.value

  // 检查当前选中的平台是否在新分类中
  const currentPlatformInCategory = platformsInCategory.find(p => p.id === selectedPlatform.value)

  if (currentPlatformInCategory) {
    // 当前平台在新分类中，保持不变
    debug.log(`📂 切换到分类 "${category}"，当前平台 "${selectedPlatform.value}" 仍在该分类中`)
  } else if (platformsInCategory.length > 0) {
    // 当前平台不在新分类中，自动切换到该分类的第一个平台
    const firstPlatform = platformsInCategory[0]
    debug.log(`📂 切换到分类 "${category}"，自动切换到平台 "${firstPlatform.name}"`)
    selectedPlatform.value = firstPlatform.id
    fetchHotData(firstPlatform.id)
  } else {
    debug.warn(`⚠️ 分类 "${category}" 下没有可用平台`)
  }
}

// 打开链接
const openUrl = (url) => {
  if (!url || url === '#') {
    debug.log('⚠️ 无效链接:', url)
    return
  }

  // 追踪打开链接事件
  trackEvent(EventType.OPEN_LINK, {
    platform: selectedPlatform.value,
    url: url
  })

  if (window.utools) {
    window.utools.shellOpenExternal(url)
  } else {
    window.open(url, '_blank')
  }
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

// 打开打赏弹窗
const openDonate = () => {
  showDonate.value = true
}

// 关闭打赏弹窗
const closeDonate = () => {
  showDonate.value = false
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
    if (isMetMuseumPlatform.value) return '艺术品'
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
    if (isMetMuseumPlatform.value) return '艺术品'
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
    // 验证顺序是否正确
    const platforms = getPlatformsByMode(value)
    debug.log('✅ 实际显示的平台顺序:', platforms.map(p => `${p.icon} ${p.name}`))
  } else if (key === 'hiddenPlatforms') {
    // settingsStore 已经自动更新了，这里只需要记录日志
    debug.log('✅ 隐藏平台列表已更新:', Array.from(settingsStore.hiddenPlatforms))
  }
}

// 系统主题变化的处理
let darkModeQuery = null
const handleSystemThemeChange = (e) => {
  const savedThemeMode = window.utools && window.utools.dbStorage
    ? window.utools.dbStorage.getItem(STORAGE_KEYS.THEME_MODE)
    : UI.THEME_MODE

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

// 组件卸载时移除事件监听
onUnmounted(() => {
  window.removeEventListener('settingChange', handleSettingChange)
  if (darkModeQuery) {
    darkModeQuery.removeEventListener('change', handleSystemThemeChange)
  }
  // 清除超时定时器
  if (loadingTimeout.value) {
    clearTimeout(loadingTimeout.value)
  }
})

// 获取排名样式
const getRankStyle = (index) => {
  if (index <= 3) return { backgroundColor: '#ff6600', fontWeight: 'bold' }
  return { backgroundColor: '#999' }
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
  debug.log('📍 当前平台:', selectedPlatform.value)
  debug.log('📂 当前分类:', selectedCategory.value)

  // 加载设置（包括平台顺序、隐藏平台、主题等）
  settingsStore.loadSettings()

  // 从本地存储读取保存的分类和平台设置
  if (window.utools && window.utools.dbStorage) {
    try {
      const savedCategory = window.utools.dbStorage.getItem(STORAGE_KEYS.SELECTED_CATEGORY)
      const savedPlatform = window.utools.dbStorage.getItem(STORAGE_KEYS.SELECTED_PLATFORM)
      const savedThemeMode = window.utools.dbStorage.getItem(STORAGE_KEYS.THEME_MODE)

      if (savedCategory) {
        debug.log('💾 从本地存储读取分类:', savedCategory)
        selectedCategory.value = savedCategory
      }

      if (savedPlatform) {
        debug.log('💾 从本地存储读取平台:', savedPlatform)
        selectedPlatform.value = savedPlatform
      }

      // 应用保存的主题
      if (savedThemeMode) {
        applyTheme(savedThemeMode)
      }

      debug.log('✅ settingsStore 已初始化')
      debug.log('  - 平台顺序:', settingsStore.customPlatformOrder.map(p => p.name))
      debug.log('  - 隐藏平台:', Array.from(settingsStore.hiddenPlatforms))
      debug.log('  - 显示热度值:', settingsStore.showHotValue)
      debug.log('  - 显示描述:', settingsStore.showDescription)
      debug.log('  - 主题模式:', settingsStore.themeMode)
    } catch (e) {
      debug.log('⚠️ 读取本地存储失败:', e)
    }
  }

  // 监听设置变更事件
  window.addEventListener('settingChange', handleSettingChange)

  // 监听系统主题变化
  if (window.matchMedia) {
    darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)')
    darkModeQuery.addEventListener('change', handleSystemThemeChange)
  }

  // 加载热搜数据
  fetchHotData(selectedPlatform.value)

  // 设置滚动监听
  const contentSection = document.querySelector('.content-section')
  if (contentSection) {
    contentSection.addEventListener('scroll', handleScroll)
  }

  // 检测平台标签的初始滚动状态
  setTimeout(() => {
    if (platformTabsRef.value) {
      updateScrollState(platformTabsRef.value)
    }
  }, 100)
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

// 处理平台标签的鼠标滚轮横向滚动
const handlePlatformWheel = (event) => {
  const container = event.currentTarget
  // 将垂直滚动转换为水平滚动
  if (event.deltaY !== 0) {
    event.preventDefault()
    container.scrollLeft += event.deltaY
  }
  updateScrollState(container)
}

// 更新滚动状态（检测是否可以左右滚动）
const updateScrollState = (container) => {
  canScrollLeft.value = container.scrollLeft > 0
  canScrollRight.value = container.scrollLeft < (container.scrollWidth - container.clientWidth - 1)
}

// 监听平台标签的滚动事件
const handlePlatformScroll = (event) => {
  updateScrollState(event.currentTarget)
}

// 点击左箭头滚动
const scrollLeft = () => {
  if (!platformTabsRef.value) return
  const scrollAmount = platformTabsRef.value.clientWidth * 0.7
  platformTabsRef.value.scrollBy({ left: -scrollAmount, behavior: 'smooth' })
}

// 点击右箭头滚动
const scrollRight = () => {
  if (!platformTabsRef.value) return
  const scrollAmount = platformTabsRef.value.clientWidth * 0.7
  platformTabsRef.value.scrollBy({ left: scrollAmount, behavior: 'smooth' })
}

// 监听平台变化，保存到本地存储
watch(selectedPlatform, (newPlatform) => {
  if (window.utools && window.utools.dbStorage) {
    try {
      window.utools.dbStorage.setItem(STORAGE_KEYS.SELECTED_PLATFORM, newPlatform)
    } catch (e) {
      debug.log('⚠️ 保存平台失败:', e)
    }
  }
})

// 监听分类变化，保存到本地存储并重新检测滚动状态
watch(selectedCategory, (newCategory) => {
  if (window.utools && window.utools.dbStorage) {
    try {
      window.utools.dbStorage.setItem(STORAGE_KEYS.SELECTED_CATEGORY, newCategory)
    } catch (e) {
      debug.log('⚠️ 保存分类失败:', e)
    }
  }

  // 延迟检测滚动状态
  setTimeout(() => {
    if (platformTabsRef.value) {
      updateScrollState(platformTabsRef.value)
    }
  }, 100)
})
</script>

<template>
  <div class="hot-search-container">
    <!-- 平台选择区域 -->
    <div class="platform-section">
      <!-- 分类导航（仅在非极简模式下显示） -->
      <div v-if="!isSimpleMode" class="category-tabs">
        <button
          v-for="category in categories"
          :key="category"
          @click="switchCategory(category)"
          :class="['category-tab', { active: selectedCategory === category }]"
        >
          {{ category }}
        </button>
      </div>

      <div class="platform-tabs-wrapper">
        <!-- 当前选中平台 - 独立显示在最左侧 -->
        <div v-if="currentPlatformObj" class="current-platform">
          <span class="current-platform-name">{{ currentPlatformObj.name }}</span>
        </div>

        <!-- 平台标签容器 -->
        <div class="platform-tabs-container">
          <!-- 左侧渐变遮罩和箭头 -->
          <div v-if="canScrollLeft" class="scroll-indicator scroll-indicator-left" @click="scrollLeft">
            <span class="scroll-arrow">‹</span>
          </div>

          <div
            class="platform-tabs"
            @wheel="handlePlatformWheel"
            @scroll="handlePlatformScroll"
            ref="platformTabsRef"
          >
            <button
              v-for="platform in filteredPlatforms"
              :key="platform.id"
              @click="switchPlatform(platform.id)"
              :class="['platform-tab', { active: selectedPlatform === platform.id }]"
            >
              <span class="platform-name">{{ platform.name }}</span>
            </button>
          </div>

          <!-- 右侧渐变遮罩和箭头 -->
          <div v-if="canScrollRight" class="scroll-indicator scroll-indicator-right" @click="scrollRight">
            <span class="scroll-arrow">›</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 热搜列表区域 -->
    <div class="content-section" ref="contentSection">
      <!-- 加载蒙版 -->
      <div v-if="loading && hotList.length > 0" class="loading-overlay">
        <div class="loading-overlay-content">
          <div class="loading-spinner"></div>
          <p>请稍等...</p>
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading && hotList.length === 0" class="loading-state">
        <div class="loading-spinner"></div>
        <p>加载中...</p>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="error && hotList.length === 0" class="error-state">
        <p class="error-icon">⚠️</p>
        <p class="error-message">{{ error }}</p>
        <button @click="refresh" class="retry-btn">重试</button>
      </div>

      <!-- 空数据状态 -->
      <div v-else-if="!loading && hotList.length === 0" class="empty-state">
        <p class="empty-icon">📭</p>
        <p>暂无热搜数据</p>
        <p class="empty-tip">请尝试切换其他平台</p>
      </div>

      <!-- 热搜列表 -->
      <div v-else class="hot-list">
        <!-- 艺术品平台 - 卡片式布局（大都会博物馆） -->
        <template v-if="isMetMuseumPlatform">
          <!-- 筛选按钮组 -->
          <div class="metmuseum-filters">
            <button
              @click="switchMetMuseumFilter('all')"
              :class="['filter-btn', { active: metMuseumFilter === 'all' }]"
            >
              🌍 全部作品
            </button>
            <button
              @click="switchMetMuseumFilter('china')"
              :class="['filter-btn', { active: metMuseumFilter === 'china' }]"
            >
              🏮 中国作品
            </button>
          </div>

          <div class="artwork-grid">
            <ArtworkCard
              v-for="(item, index) in hotList"
              :key="item.id || index"
              :artwork="item"
              :index="item.index || index + 1"
              :showDescription="settingsStore.showDescription"
              @click="openUrl(item.url || item.mobileUrl)"
            />
          </div>
        </template>

        <!-- Epic 免费游戏 - 游戏卡片布局 -->
        <template v-else-if="isGamePlatform">
          <div class="artwork-grid">
            <ArtworkCard
              v-for="(item, index) in hotList"
              :key="item.id || index"
              :artwork="item"
              :index="item.index || index + 1"
              :showDescription="settingsStore.showDescription"
              @click="openUrl(item.url || item.mobileUrl)"
            />
          </div>
        </template>

        <!-- 芝加哥艺术学院 - 艺术品列表布局 -->
        <template v-else-if="isArticPlatform">
          <ArtworkListItem
            v-for="(item, index) in filteredArtworks"
            :key="item.id || index"
            :artwork="item"
            :index="item.index"
            :showDescription="settingsStore.showDescription"
            :autoTranslate="autoTranslate"
            @click="openUrl(item.url || item.mobileUrl)"
          />
        </template>

        <!-- 其他平台 - 普通热搜布局 -->
        <template v-else>
          <div
            v-for="(item, index) in hotList"
            :key="index"
            @click="openUrl(item.url || item.mobileUrl)"
            :class="['hot-item', { 'no-desc': !settingsStore.showDescription || !item.desc }]"
          >
            <div class="hot-rank" :style="getRankStyle(index + 1)">
              {{ index + 1 }}
            </div>
            <div class="hot-content">
              <div class="hot-title">{{ item.title }}</div>
              <div v-if="item.desc && settingsStore.showDescription" class="hot-desc">{{ item.desc }}</div>
            </div>
            <div v-if="item.hot && settingsStore.showHotValue" class="hot-value">
              🔥 {{ formatHotValue(item.hot) }}
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

        <!-- 没有更多 -->
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

    <!-- 设置面板 -->
    <Settings :show="settingsStore.showSettings" @close="closeSettings"></Settings>

    <!-- 埋点调试面板 - 仅在开发环境显示 -->
    <AnalyticsDebugPanel v-if="isDev" />

    <!-- 悬浮按钮组 - 右下角 -->
    <div class="floating-buttons">
      <!-- 翻译按钮 - 在芝加哥艺术学院和大都会博物馆平台显示 -->
      <button
        v-if="isTranslatablePlatform"
        @click="toggleTranslate"
        class="floating-btn translate-btn"
        :class="{ active: autoTranslate }"
        :title="translateButtonText"
        :disabled="autoTranslate"
      >
        <span class="floating-icon" :class="{ spinning: autoTranslate }">
          {{ autoTranslate ? '⏳' : '🌐' }}
        </span>
        <span v-if="translateOffset > 0 || autoTranslate" class="translate-progress">
          {{ translateOffset }}/{{ hotList.length }}
        </span>
      </button>

      <!-- 打赏按钮 -->
      <button
        @click="openDonate"
        class="floating-btn donate-btn"
        title="打赏"
      >
        <span class="floating-icon">❤️</span>
      </button>

      <!-- 刷新按钮 -->
      <button
        @click="refresh"
        class="floating-btn refresh-btn"
        :disabled="loading"
        :title="loading ? '加载中...' : '刷新数据'"
      >
        <span :class="['floating-icon', { spinning: loading }]">🔄</span>
      </button>

      <!-- 设置按钮 -->
      <button
        @click="openSettings"
        class="floating-btn settings-btn"
        title="设置"
      >
        <span class="floating-icon">⚙️</span>
      </button>
    </div>

    <!-- 打赏弹窗 -->
    <div v-if="showDonate" class="donate-modal" @click="closeDonate">
      <div class="donate-content" @click.stop>
        <button class="donate-close" @click="closeDonate">✕</button>
        <h3 class="donate-title">感谢打赏</h3>
        <p class="donate-desc">如果您觉得这个插件对您有帮助，欢迎打赏支持</p>
        <div class="donate-qr-container">
          <img src="/img/zs.png" alt="打赏二维码" class="donate-qr" />
        </div>
        <p class="donate-tip">扫码打赏，感谢您的支持！</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hot-search-container {
  width: 100%;
  height: 100vh;
  background-color: #f5f5f5;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 平台选择区域 */
.platform-section {
  background-color: #ffffff;
  border-bottom: 1px solid #eee;
  flex-shrink: 0;
}

.category-tabs {
  display: flex;
  gap: 8px;
  padding: 12px 16px 8px;
  overflow-x: auto;
  scrollbar-width: none;
}

.category-tabs::-webkit-scrollbar {
  display: none;
}

.category-tab {
  padding: 6px 16px;
  border: none;
  border-radius: 20px;
  background-color: #f0f0f0;
  color: #666;
  font-size: 14px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.category-tab:hover {
  background-color: #e0e0e0;
}

.category-tab.active {
  background-color: #007bff;
  color: #ffffff;
}

/* 平台标签容器（用于定位渐变和箭头） */
.platform-tabs-wrapper {
  position: relative;
  padding: 8px 16px 12px;
  display: flex;
  gap: 12px;
  align-items: center;
}

/* 当前选中平台 - 独立显示 */
.current-platform {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #007bff, #0056b3);
  color: #ffffff;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.3);
  flex-shrink: 0;
}

.current-platform-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.current-platform-name {
  flex: 1;
}

/* 平台标签容器（包含可滚动的标签） */
.platform-tabs-container {
  position: relative;
  flex: 1;
  overflow: hidden;
}

.platform-tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;
  scroll-behavior: smooth;
}

.platform-tabs::-webkit-scrollbar {
  display: none;
}

/* 滚动指示器容器 */
.scroll-indicator {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  transition: opacity 0.3s;
  cursor: pointer;
}

.scroll-indicator:hover {
  opacity: 0.8;
}

.scroll-indicator:active {
  opacity: 0.6;
}

/* 左侧指示器 */
.scroll-indicator-left {
  left: 0;
  background: linear-gradient(to right, rgba(255, 255, 255, 1), rgba(255, 255, 255, 0));
  padding-right: 30px;
}

/* 右侧指示器 */
.scroll-indicator-right {
  right: 0;
  background: linear-gradient(to left, rgba(255, 255, 255, 1), rgba(255, 255, 255, 0));
  padding-left: 30px;
}

/* 箭头样式 */
.scroll-arrow {
  font-size: 24px;
  color: #007bff;
  font-weight: bold;
  text-shadow: 0 0 3px rgba(255, 255, 255, 0.8);
  pointer-events: none;
}

.platform-tab {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background-color: #ffffff;
  color: #333;
  font-size: 14px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.platform-tab:hover {
  background-color: #f9f9f9;
  border-color: #007bff;
}

.platform-tab.active {
  background-color: #007bff;
  color: #ffffff;
  border-color: #007bff;
}

.platform-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* 刷新图标动画 */
.refresh-icon {
  font-size: 14px;
  margin-left: 4px;
  transition: transform 0.3s;
  cursor: pointer;
}

.refresh-icon.spinning {
  animation: spin 0.8s linear infinite;
  display: inline-block;
}

.settings-icon {
  font-size: 16px;
  margin-left: 6px;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.settings-icon:hover {
  opacity: 1;
}

/* 内容区域 */
.content-section {
  flex: 1;
  overflow-y: auto;
  padding: 5px;
  position: relative;
}

/* 加载蒙版 */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  backdrop-filter: blur(2px);
  animation: fadeIn 0.2s ease;
}

.loading-overlay-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.loading-overlay p {
  font-size: 14px;
  color: #666;
  margin: 0;
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
  color: #ff4444;
  margin-bottom: 12px;
  font-size: 14px;
}

.empty-tip {
  color: #999;
  font-size: 13px;
  margin-top: 8px;
}

.retry-btn,
.load-more-btn {
  padding: 8px 24px;
  border: none;
  border-radius: 6px;
  background-color: #007bff;
  color: #ffffff;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.retry-btn:hover,
.load-more-btn:hover:not(:disabled) {
  background-color: #0056b3;
}

.retry-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f0f0f0;
  border-top-color: #007bff;
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

/* 艺术品网格布局（大都会博物馆） */
.metmuseum-filters {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  margin-bottom: 16px;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.filter-btn {
  flex: 1;
  padding: 10px 20px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  background: #ffffff;
  color: #666;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.filter-btn:hover {
  border-color: #007bff;
  color: #007bff;
  background: #f8f9fa;
}

.filter-btn.active {
  border-color: #007bff;
  background: linear-gradient(135deg, #007bff, #0056b3);
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.3);
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
  padding: 5px 8px;
  margin-bottom: 0;
  background: #ffffff;
  border: none;
  border-radius: 0;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background-color 0.2s ease;
  box-shadow: none;
}

/* 没有简介时的高度更紧凑 */
.hot-item.no-desc {
  padding: 8px 16px;
}

.hot-item:last-child {
  border-bottom: none;
}

.hot-item:hover {
  background-color: #f8f9fa;
}

.hot-rank {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background-color: #999;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  flex-shrink: 0;
  margin-right: 10px;
}

.hot-content {
  flex: 1;
  min-width: 0;
}

.hot-title {
  font-size: 15px;
  color: #007bff;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hot-desc {
  font-size: 13px;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 4px;
}

.hot-value {
  font-size: 12px;
  color: #ff6600;
  flex-shrink: 0;
  margin-left: 12px;
  white-space: nowrap;
}

/* 加载更多 */
.load-more-container {
  padding: 16px;
  text-align: center;
}

.no-more-tip {
  padding: 16px;
  text-align: center;
  color: #999;
  font-size: 13px;
}

.loading-more {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  color: #999;
}

.loading-more p {
  margin-top: 8px;
  font-size: 13px;
}

/* 滚动条样式 */
.content-section::-webkit-scrollbar,
.category-tabs::-webkit-scrollbar,
.platform-tabs::-webkit-scrollbar {
  height: 6px;
  width: 6px;
}

.content-section::-webkit-scrollbar-track,
.category-tabs::-webkit-scrollbar-track,
.platform-tabs::-webkit-scrollbar-track {
  background: #f0f0f0;
}

.content-section::-webkit-scrollbar-thumb,
.category-tabs::-webkit-scrollbar-thumb,
.platform-tabs::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 3px;
}

.content-section::-webkit-scrollbar-thumb:hover,
.category-tabs::-webkit-scrollbar-thumb:hover,
.platform-tabs::-webkit-scrollbar-thumb:hover {
  background: #999;
}

/* 夜间模式样式 */
html.dark-mode .hot-search-container {
  background-color: #1a1a1a;
}

html.dark-mode .platform-section {
  background-color: #2c2c2c;
  border-bottom-color: #444;
}

html.dark-mode .category-tab {
  background-color: #3a3a3a;
  color: #e0e0e0;
  border-color: #555;
}

html.dark-mode .category-tab:hover {
  background-color: #4a4a4a;
}

html.dark-mode .category-tab.active {
  background-color: #007bff;
  color: #ffffff;
}

html.dark-mode .platform-tab {
  background-color: #3a3a3a;
  color: #e0e0e0;
  border-color: #555;
}

html.dark-mode .platform-tab:hover {
  background-color: #4a4a4a;
  border-color: #007bff;
}

html.dark-mode .platform-tab.active {
  background-color: #007bff;
  color: #ffffff;
  border-color: #007bff;
}

html.dark-mode .hot-list {
  background-color: #2c2c2c;
}

html.dark-mode .hot-item {
  border-bottom-color: #3a3a3a;
}

html.dark-mode .hot-item:hover {
  background-color: #3a3a3a;
}

html.dark-mode .hot-title {
  color: #4dabf7;
}

html.dark-mode .hot-desc {
  color: #999;
}

html.dark-mode .hot-value {
  color: #ff8c42;
}

html.dark-mode .hot-list-header {
  border-bottom-color: #444;
}

html.dark-mode .hot-list-title {
  color: #e0e0e0;
}

html.dark-mode .hot-count {
  color: #999;
}

html.dark-mode .error-message {
  color: #ff6b6b;
}

html.dark-mode .empty-tip {
  color: #999;
}

html.dark-mode .loading-more p {
  color: #999;
}

html.dark-mode .no-more-tip {
  color: #999;
}

html.dark-mode .content-section::-webkit-scrollbar-track,
html.dark-mode .category-tabs::-webkit-scrollbar-track,
html.dark-mode .platform-tabs::-webkit-scrollbar-track {
  background: #2c2c2c;
}

html.dark-mode .content-section::-webkit-scrollbar-thumb,
html.dark-mode .category-tabs::-webkit-scrollbar-thumb,
html.dark-mode .platform-tabs::-webkit-scrollbar-thumb {
  background: #555;
}

html.dark-mode .content-section::-webkit-scrollbar-thumb:hover,
html.dark-mode .category-tabs::-webkit-scrollbar-thumb:hover,
html.dark-mode .platform-tabs::-webkit-scrollbar-thumb:hover {
  background: #777;
}
</style>

<style>
/* 全局暗色模式样式 */
html.dark-mode .hot-search-container {
  background-color: #1a1a1a !important;
}

html.dark-mode .platform-section {
  background-color: #2c2c2c !important;
  border-bottom-color: #444 !important;
}

html.dark-mode .category-tab {
  background-color: #3a3a3a !important;
  color: #e0e0e0 !important;
  border-color: #555 !important;
}

html.dark-mode .category-tab:hover {
  background-color: #4a4a4a !important;
}

html.dark-mode .category-tab.active {
  background-color: #007bff !important;
  color: #ffffff !important;
}

html.dark-mode .platform-tab {
  background-color: #3a3a3a !important;
  color: #e0e0e0 !important;
  border-color: #555 !important;
}

html.dark-mode .platform-tab:hover {
  background-color: #4a4a4a !important;
  border-color: #007bff !important;
}

html.dark-mode .platform-tab.active {
  background-color: #007bff !important;
  color: #ffffff !important;
  border-color: #007bff !important;
}

html.dark-mode .hot-list {
  background-color: #2c2c2c !important;
}

html.dark-mode .hot-item {
  background: #2c2c2c !important;
  border: none !important;
  border-bottom: 1px solid #3a3a3a !important;
}

html.dark-mode .hot-item:last-child {
  border-bottom: none !important;
}

html.dark-mode .hot-item:hover {
  background: #3a3a3a !important;
}

html.dark-mode .hot-title {
  color: #4dabf7 !important;
}

html.dark-mode .hot-desc {
  color: #999 !important;
}

html.dark-mode .hot-value {
  color: #ff8c42 !important;
}

html.dark-mode .hot-list-header {
  border-bottom-color: #444 !important;
}

html.dark-mode .hot-list-title {
  color: #e0e0e0 !important;
}

html.dark-mode .hot-count {
  color: #999 !important;
}

html.dark-mode .error-message {
  color: #ff6b6b !important;
}

html.dark-mode .empty-tip {
  color: #999 !important;
}

html.dark-mode .loading-more p {
  color: #999 !important;
}

html.dark-mode .no-more-tip {
  color: #999 !important;
}

html.dark-mode .content-section::-webkit-scrollbar-track,
html.dark-mode .category-tabs::-webkit-scrollbar-track,
html.dark-mode .platform-tabs::-webkit-scrollbar-track {
  background: #2c2c2c !important;
}

html.dark-mode .content-section::-webkit-scrollbar-thumb,
html.dark-mode .category-tabs::-webkit-scrollbar-thumb,
html.dark-mode .platform-tabs::-webkit-scrollbar-thumb {
  background: #555 !important;
}

html.dark-mode .content-section::-webkit-scrollbar-thumb:hover,
html.dark-mode .category-tabs::-webkit-scrollbar-thumb:hover,
html.dark-mode .platform-tabs::-webkit-scrollbar-thumb:hover {
  background: #777 !important;
}

html.dark-mode .scroll-arrow {
  color: #4dabf7 !important;
  text-shadow: 0 0 3px rgba(0, 0, 0, 0.5) !important;
}

html.dark-mode .current-platform {
  background: linear-gradient(135deg, #0056b3, #003d82) !important;
}

html.dark-mode .loading-state p,
html.dark-mode .error-state p,
html.dark-mode .empty-state p {
  color: #e0e0e0 !important;
}

html.dark-mode .retry-btn,
html.dark-mode .load-more-btn {
  background-color: #0056b3 !important;
}

html.dark-mode .retry-btn:hover,
html.dark-mode .load-more-btn:hover:not(:disabled) {
  background-color: #004494 !important;
}

html.dark-mode .loading-spinner {
  border-color: #3a3a3a !important;
  border-top-color: #4dabf7 !important;
}

html.dark-mode .hot-rank {
  background-color: #666 !important;
}

html.dark-mode .hot-rank[style*="ff6600"] {
  background-color: #cc5200 !important;
}

/* 大都会博物馆筛选按钮暗色模式 */
html.dark-mode .metmuseum-filters {
  background: #2c2c2c;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

html.dark-mode .filter-btn {
  background: #3a3a3a;
  border-color: #555;
  color: #e0e0e0;
}

html.dark-mode .filter-btn:hover {
  border-color: #4dabf7;
  color: #4dabf7;
  background: #4a4a4a;
}

html.dark-mode .filter-btn.active {
  border-color: #0056b3;
  background: linear-gradient(135deg, #0056b3, #003d82);
  color: #ffffff;
}

/* 暗色模式下没有简介时的样式保持一致 */
html.dark-mode .hot-item.no-desc {
  padding: 10px 16px !important;
}

/* 滚动指示器夜间模式 */
html.dark-mode .scroll-indicator-left {
  background: linear-gradient(to right, rgba(42, 42, 42, 1), rgba(42, 42, 42, 0)) !important;
}

html.dark-mode .scroll-indicator-right {
  background: linear-gradient(to left, rgba(42, 42, 42, 1), rgba(42, 42, 42, 0)) !important;
}

/* ========== 悬浮按钮样式 ========== */

/* 悬浮按钮组容器 */
.floating-buttons {
  position: fixed;
  bottom: 24px;
  right: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 1000;
  pointer-events: none;
}

/* 悬浮按钮 */
.floating-btn {
  pointer-events: auto;
  width: 48px;
  height: 48px;
  border: none;
  border-radius: 50%;
  background-color: #ffffff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 悬浮按钮悬停效果 */
.floating-btn:hover {
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

/* 悬浮按钮点击效果 */
.floating-btn:active {
  transform: translateY(0) scale(0.95);
}

/* 悬浮按钮禁用状态 */
.floating-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* 悬浮按钮图标 */
.floating-icon {
  font-size: 20px;
  line-height: 1;
  transition: transform 0.3s;
}

/* 刷新按钮旋转动画 */
.floating-icon.spinning {
  animation: floatSpin 0.8s linear infinite;
}

@keyframes floatSpin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 刷新按钮 - 蓝色 */
.refresh-btn {
  background: linear-gradient(135deg, #007bff, #0056b3);
}

.refresh-btn:hover {
  background: linear-gradient(135deg, #0056b3, #004494);
}

.refresh-btn:disabled {
  background: linear-gradient(135deg, #6c757d, #5a6268);
}

/* 设置按钮 - 灰色 */
.settings-btn {
  background: linear-gradient(135deg, #6c757d, #5a6268);
}

.settings-btn:hover {
  background: linear-gradient(135deg, #5a6268, #495057);
}

/* 翻译按钮 */
.translate-btn {
  background: linear-gradient(135deg, #17a2b8, #138496);
  position: relative;
}

.translate-btn:hover {
  background: linear-gradient(135deg, #138496, #117a8b);
}

.translate-btn.active {
  background: linear-gradient(135deg, #28a745, #218838);
  box-shadow: 0 0 0 3px rgba(40, 167, 69, 0.3);
}

.translate-progress {
  position: absolute;
  bottom: -2px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 10px;
  font-weight: bold;
  color: white;
  background: rgba(0, 0, 0, 0.6);
  padding: 2px 6px;
  border-radius: 8px;
  white-space: nowrap;
  pointer-events: none;
}

/* ========== 夜间模式悬浮按钮样式 ========== */

html.dark-mode .floating-btn {
  background-color: #2c2c2c;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

html.dark-mode .floating-btn:hover {
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
}

html.dark-mode .refresh-btn {
  background: linear-gradient(135deg, #0056b3, #003d82);
}

html.dark-mode .refresh-btn:hover {
  background: linear-gradient(135deg, #004494, #003366);
}

html.dark-mode .translate-btn {
  background: linear-gradient(135deg, #117a8b, #0e616e);
}

html.dark-mode .translate-btn:hover {
  background: linear-gradient(135deg, #0e616e, #0b515b);
}

html.dark-mode .translate-btn.active {
  background: linear-gradient(135deg, #218838, #1e7e34);
}

html.dark-mode .settings-btn {
  background: linear-gradient(135deg, #495057, #343a40);
}

html.dark-mode .settings-btn:hover {
  background: linear-gradient(135deg, #343a40, #212529);
}

/* ========== 打赏按钮样式 ========== */

/* 打赏按钮 - 红色渐变 */
.donate-btn {
  background: linear-gradient(135deg, #ff6b6b, #ee5a52);
}

.donate-btn:hover {
  background: linear-gradient(135deg, #ee5a52, #dc4c47);
}

/* 夜间模式打赏按钮 */
html.dark-mode .donate-btn {
  background: linear-gradient(135deg, #ee5a52, #dc4c47);
}

html.dark-mode .donate-btn:hover {
  background: linear-gradient(135deg, #dc4c47, #c9453f);
}

/* ========== 打赏弹窗样式 ========== */

/* 打赏弹窗遮罩 */
.donate-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* 打赏内容容器 */
.donate-content {
  background-color: #ffffff;
  border-radius: 16px;
  padding: 32px;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  animation: slideUp 0.3s ease;
  position: relative;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* 关闭按钮 */
.donate-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border: none;
  background-color: #f5f5f5;
  border-radius: 50%;
  font-size: 18px;
  color: #666;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.donate-close:hover {
  background-color: #e0e0e0;
  color: #333;
}

/* 打赏标题 */
.donate-title {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  margin: 0 0 12px 0;
  text-align: center;
}

/* 打赏描述 */
.donate-desc {
  font-size: 14px;
  color: #666;
  text-align: center;
  margin: 0 0 24px 0;
  line-height: 1.5;
}

/* 二维码容器 */
.donate-qr-container {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

/* 二维码图片 */
.donate-qr {
  width: 250px;
  height: 250px;
  object-fit: contain;
  border-radius: 8px;
  border: 2px solid #f0f0f0;
}

/* 打赏提示 */
.donate-tip {
  font-size: 13px;
  color: #999;
  text-align: center;
  margin: 0;
}

/* ========== 夜间模式打赏弹窗样式 ========== */

html.dark-mode .donate-content {
  background-color: #2c2c2c;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

html.dark-mode .donate-close {
  background-color: #3a3a3a;
  color: #e0e0e0;
}

html.dark-mode .donate-close:hover {
  background-color: #4a4a4a;
  color: #ffffff;
}

html.dark-mode .donate-title {
  color: #e0e0e0;
}

html.dark-mode .donate-desc {
  color: #999;
}

html.dark-mode .donate-qr {
  border-color: #444;
}

html.dark-mode .donate-tip {
  color: #777;
}

/* ========== 暗色模式加载蒙版 ========== */

html.dark-mode .loading-overlay {
  background-color: rgba(42, 42, 42, 0.8);
}

html.dark-mode .loading-overlay p {
  color: #e0e0e0;
}
</style>
