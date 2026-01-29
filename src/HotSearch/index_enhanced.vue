<script setup>
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { getHotData, PLATFORMS, getPlatformsByCategory, getCategories, getPlatformsByMode } from '../services/hotSearchApi.js'
import { DISPLAY_MODE, STORAGE_KEYS, UI, AUTO_REFRESH, HOT_LEVELS } from '../config.js'

const props = defineProps({
  enterAction: {
    type: Object,
    required: true
  }
})

// 响应式数据
const selectedPlatform = ref('baidu')
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
const updateTime = ref(null)
const recentPlatforms = ref([])
const favoriteItems = ref(new Set())
const autoRefreshTimer = ref(null)

const categories = getCategories()

// 判断是否为极简模式
const isSimpleMode = computed(() => {
  return DISPLAY_MODE.DEFAULT_MODE === 'simple'
})

// 根据选中的分类过滤平台
const filteredPlatforms = computed(() => {
  if (DISPLAY_MODE.DEFAULT_MODE === 'simple') {
    return getPlatformsByMode('simple')
  }

  if (!selectedCategory.value || selectedCategory.value === '全部') {
    return getPlatformsByMode('simple')
  }

  return getPlatformsByCategory(selectedCategory.value)
})

// 获取最近使用的平台
const getRecentPlatforms = () => {
  if (!UI.SHOW_RECENT_PLATFORMS) return []

  const recent = recentPlatforms.value.filter(id =>
    id !== selectedPlatform.value &&
    getPlatformsByMode('simple').find(p => p.id === id)
  )

  return recent.slice(0, UI.MAX_RECENT_PLATFORMS).map(id =>
    PLATFORMS.find(p => p.id === id)
  ).filter(Boolean)
}

// 添加到最近使用
const addToRecentPlatforms = (platformId) => {
  if (!UI.SHOW_RECENT_PLATFORMS) return

  recentPlatforms.value = recentPlatforms.value.filter(id => id !== platformId)
  recentPlatforms.value.unshift(platformId)

  if (recentPlatforms.value.length > UI.MAX_RECENT_PLATFORMS) {
    recentPlatforms.value = recentPlatforms.value.slice(0, UI.MAX_RECENT_PLATFORMS)
  }

  if (window.utools && window.utools.dbStorage) {
    try {
      window.utools.dbStorage.setItem(STORAGE_KEYS.RECENT_PLATFORMS, recentPlatforms.value)
    } catch (e) {
      console.log('⚠️ 保存最近平台失败:', e)
    }
  }
}

// 切换收藏
const toggleFav = (item) => {
  const favId = `${selectedPlatform.value}_${item.title}`

  if (favoriteItems.value.has(favId)) {
    favoriteItems.value.delete(favId)
  } else {
    favoriteItems.value.add(favId)
  }

  if (window.utools && window.utools.dbStorage) {
    try {
      window.utools.dbStorage.setItem(STORAGE_KEYS.FAVORITE_ITEMS, Array.from(favoriteItems.value))
    } catch (e) {
      console.log('⚠️ 保存收藏失败:', e)
    }
  }
}

// 检查是否已收藏
const isFav = (item) => {
  const favId = `${selectedPlatform.value}_${item.title}`
  return favoriteItems.value.has(favId)
}

// 格式化更新时间
const formatUpdateTime = (date) => {
  if (!date) return ''
  const now = new Date()
  const diff = now - date
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)

  if (seconds < 60) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (minutes < 1440) return `${Math.floor(minutes / 60)}小时前`
  return date.toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 获取热度等级
const getHotLevel = (value) => {
  if (!value) return { icon: '', label: '', level: 0 }

  let numValue = 0

  if (typeof value === 'number') {
    numValue = value
  } else if (typeof value === 'string') {
    const match = value.match(/(\d+\.?\d*)[万亿]?/)
    if (match) {
      numValue = parseFloat(match[1])
      if (value.includes('万')) numValue *= 10000
      if (value.includes('亿')) numValue *= 100000000
    }
  } else if (typeof value === 'object' && value.num) {
    numValue = parseFloat(value.num)
    if (value.text && value.text.includes('万')) numValue *= 10000
  }

  for (const level of HOT_LEVELS) {
    if (numValue >= level.threshold) {
      return {
        icon: level.icon,
        label: level.label,
        level: level.level
      }
    }
  }

  return HOT_LEVELS[HOT_LEVELS.length - 1]
}

// 获取热搜数据
const fetchHotData = async (platformId, loadMore = false) => {
  if (loadMore) {
    loadingMore.value = true
  } else {
    loading.value = true
    error.value = null
    currentPage.value = 1
  }

  try {
    console.log(`🎯 开始获取 ${platformId} 的热搜数据`)
    const result = await getHotData(platformId, {
      page: currentPage.value,
      pageSize: 50
    })

    if (result && typeof result === 'object' && result.data) {
      if (result.error) {
        throw new Error(result.error)
      }

      if (loadMore) {
        hotList.value = [...hotList.value, ...result.data]
      } else {
        hotList.value = result.data
        updateTime.value = new Date()

        if (window.utools && window.utools.dbStorage) {
          try {
            window.utools.dbStorage.setItem(STORAGE_KEYS.LAST_UPDATE_TIME, updateTime.value.toISOString())
          } catch (e) {
            console.log('⚠️ 保存更新时间失败:', e)
          }
        }
      }
      hasMore.value = result.hasMore
      totalCount.value = result.total
      console.log(`✅ 成功获取 ${result.data.length} 条热搜数据`)
    } else if (Array.isArray(result)) {
      hotList.value = result
      if (!loadMore) {
        updateTime.value = new Date()
      }
      hasMore.value = false
      totalCount.value = result.length
    } else {
      hotList.value = []
      hasMore.value = false
      totalCount.value = 0
    }

  } catch (err) {
    console.error('❌ 获取热搜失败:', err)

    if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
      error.value = '网络请求失败，请检查网络连接'
    } else if (err.message.includes('404')) {
      error.value = '该平台暂不支持或接口已更新'
    } else if (err.message.includes('CORS')) {
      error.value = '跨域请求被阻止（建议在uTools中使用）'
    } else {
      error.value = err.message || '获取数据失败'
    }

    hotList.value = []
    hasMore.value = false
    totalCount.value = 0
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

// 加载更多
const loadMore = () => {
  if (!hasMore.value || loadingMore.value) return
  currentPage.value++
  fetchHotData(selectedPlatform.value, true)
}

// 切换平台
const switchPlatform = (platformId) => {
  if (selectedPlatform.value === platformId) return
  selectedPlatform.value = platformId
  addToRecentPlatforms(platformId)
  fetchHotData(platformId)
}

// 切换分类
const switchCategory = (category) => {
  if (selectedCategory.value === category) return

  selectedCategory.value = category
  const platformsInCategory = filteredPlatforms.value
  const currentPlatformInCategory = platformsInCategory.find(p => p.id === selectedPlatform.value)

  if (currentPlatformInCategory) {
    console.log(`📂 切换到分类 "${category}"，当前平台 "${selectedPlatform.value}" 仍在该分类中`)
  } else if (platformsInCategory.length > 0) {
    const firstPlatform = platformsInCategory[0]
    selectedPlatform.value = firstPlatform.id
    fetchHotData(firstPlatform.id)
  }
}

// 打开链接
const openUrl = (url) => {
  if (!url || url === '#') return

  if (window.utools) {
    window.utools.shellOpenExternal(url)
  } else {
    window.open(url, '_blank')
  }
}

// 刷新
const refresh = () => {
  fetchHotData(selectedPlatform.value)
}

// 获取排名样式
const getRankStyle = (index) => {
  if (index <= 3) return { backgroundColor: '#ff6600', fontWeight: 'bold' }
  return { backgroundColor: '#999' }
}

// 格式化热度数值
const formatHotValue = (value) => {
  if (!value) return ''

  if (typeof value === 'object' && value.metrics) {
    return value.metrics
  }
  if (typeof value === 'object' && value.num) {
    return `${value.num} ${value.text || ''}`
  }

  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'number') {
    if (value >= 10000) {
      return (value / 10000).toFixed(1) + '万'
    }
    return value.toString()
  }

  return value.toString()
}

// 启动自动刷新
const startAutoRefresh = () => {
  if (!AUTO_REFRESH.ENABLED) return

  stopAutoRefresh()
  autoRefreshTimer.value = setInterval(() => {
    console.log('🔄 自动刷新触发')
    refresh()
  }, AUTO_REFRESH.INTERVAL)
}

// 停止自动刷新
const stopAutoRefresh = () => {
  if (autoRefreshTimer.value) {
    clearInterval(autoRefreshTimer.value)
    autoRefreshTimer.value = null
  }
}

// 处理滚动事件
const handleScroll = (event) => {
  const { scrollTop, scrollHeight, clientHeight } = event.target

  if (scrollHeight - scrollTop - clientHeight < 100) {
    if (hasMore.value && !loading.value && !loadingMore.value) {
      loadMore()
    }
  }
}

// 处理平台标签的鼠标滚轮横向滚动
const handlePlatformWheel = (event) => {
  const container = event.currentTarget
  if (event.deltaY !== 0) {
    event.preventDefault()
    container.scrollLeft += event.deltaY
  }
  updateScrollState(container)
}

// 更新滚动状态
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

// 组件挂载
onMounted(() => {
  console.log('🔥 热搜组件已挂载')

  if (window.utools && window.utools.dbStorage) {
    try {
      const savedCategory = window.utools.dbStorage.getItem(STORAGE_KEYS.SELECTED_CATEGORY)
      const savedPlatform = window.utools.dbStorage.getItem(STORAGE_KEYS.SELECTED_PLATFORM)
      const savedRecent = window.utools.dbStorage.getItem(STORAGE_KEYS.RECENT_PLATFORMS)
      const savedFavorites = window.utools.dbStorage.getItem(STORAGE_KEYS.FAVORITE_ITEMS)
      const savedUpdateTime = window.utools.dbStorage.getItem(STORAGE_KEYS.LAST_UPDATE_TIME)

      if (savedCategory) selectedCategory.value = savedCategory
      if (savedPlatform) selectedPlatform.value = savedPlatform
      if (savedRecent) recentPlatforms.value = savedRecent
      if (savedFavorites) favoriteItems.value = new Set(savedFavorites)
      if (savedUpdateTime) updateTime.value = new Date(savedUpdateTime)
    } catch (e) {
      console.log('⚠️ 读取本地存储失败:', e)
    }
  }

  fetchHotData(selectedPlatform.value)
  startAutoRefresh()

  const contentSection = document.querySelector('.content-section')
  if (contentSection) {
    contentSection.addEventListener('scroll', handleScroll)
  }

  setTimeout(() => {
    if (platformTabsRef.value) {
      updateScrollState(platformTabsRef.value)
    }
  }, 100)
})

// 组件卸载
onUnmounted(() => {
  stopAutoRefresh()
})

// 监听平台变化
watch(selectedPlatform, (newPlatform) => {
  if (window.utools && window.utools.dbStorage) {
    try {
      window.utools.dbStorage.setItem(STORAGE_KEYS.SELECTED_PLATFORM, newPlatform)
    } catch (e) {
      console.log('⚠️ 保存平台失败:', e)
    }
  }
})

// 监听分类变化
watch(selectedCategory, (newCategory) => {
  if (window.utools && window.utools.dbStorage) {
    try {
      window.utools.dbStorage.setItem(STORAGE_KEYS.SELECTED_CATEGORY, newCategory)
    } catch (e) {
      console.log('⚠️ 保存分类失败:', e)
    }
  }

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
      <!-- 分类导航 -->
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
            <span class="platform-icon">{{ platform.icon }}</span>
            <span class="platform-name">{{ platform.name }}</span>
            <span v-if="selectedPlatform === platform.id && loading" class="refresh-icon spinning">🔄</span>
            <span v-else-if="selectedPlatform === platform.id" @click.stop="refresh" class="refresh-icon">🔄</span>
          </button>
        </div>

        <!-- 右侧渐变遮罩和箭头 -->
        <div v-if="canScrollRight" class="scroll-indicator scroll-indicator-right" @click="scrollRight">
          <span class="scroll-arrow">›</span>
        </div>
      </div>
    </div>

    <!-- 热搜列表区域 -->
    <div class="content-section" ref="contentSection">
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
        <div class="hot-list-header">
          <div class="header-left">
            <h3 class="hot-list-title">
              {{ PLATFORMS.find(p => p.id === selectedPlatform)?.name || '热搜' }}
            </h3>
            <span class="hot-count">{{ totalCount }} 条</span>
          </div>
          <div class="header-right">
            <!-- 更新时间 -->
            <div v-if="updateTime" class="update-time">
              更新于 {{ formatUpdateTime(updateTime) }}
            </div>
            <!-- 刷新按钮 -->
            <button @click="refresh" class="refresh-btn-sm" :disabled="loading">
              🔄
            </button>
          </div>
        </div>

        <div
          v-for="(item, index) in hotList"
          :key="index"
          @click="openUrl(item.url || item.mobileUrl)"
          class="hot-item"
        >
          <div class="hot-rank" :style="getRankStyle(index + 1)">
            {{ index + 1 }}
          </div>
          <div class="hot-content">
            <div class="hot-title">{{ item.title }}</div>
            <div v-if="item.desc" class="hot-desc">{{ item.desc }}</div>
            <div class="hot-metrics">
              <!-- 热度等级显示 -->
              <div v-if="item.hot && UI.HOT_DISPLAY_MODE === 'level'" class="hot-level">
                {{ getHotLevel(item.hot).icon }}
                <span class="hot-label">{{ getHotLevel(item.hot).label }}</span>
              </div>
              <!-- 原始热度显示 -->
              <div v-else-if="item.hot && UI.HOT_DISPLAY_MODE === 'number'" class="hot-value">
                🔥 {{ formatHotValue(item.hot) }}
              </div>
            </div>
          </div>
          <div class="hot-actions">
            <!-- 收藏按钮 -->
            <button
              @click.stop="toggleFav(item)"
              class="fav-btn"
              :class="{ active: isFav(item) }"
            >
              {{ isFav(item) ? '⭐' : '☆' }}
            </button>
            <div class="hot-arrow">→</div>
          </div>
        </div>

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

/* 平台标签容器 */
.platform-tabs-wrapper {
  position: relative;
  padding: 8px 16px 12px;
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

/* 滚动指示器 */
.scroll-indicator {
  position: absolute;
  top: 8px;
  bottom: 12px;
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

.scroll-indicator-left {
  left: 0;
  background: linear-gradient(to right, rgba(255, 255, 255, 1), rgba(255, 255, 255, 0));
  padding-right: 30px;
}

.scroll-indicator-right {
  right: 0;
  background: linear-gradient(to left, rgba(255, 255, 255, 1), rgba(255, 255, 255, 0));
  padding-left: 30px;
}

/* 箭头样式 - 调整动画时长为5秒 */
.scroll-arrow {
  font-size: 24px;
  color: #007bff;
  font-weight: bold;
  text-shadow: 0 0 3px rgba(255, 255, 255, 0.8);
  pointer-events: none;
  animation: scrollHint 5s ease-in-out infinite;
}

@keyframes scrollHint {
  0%, 100% {
    opacity: 0.5;
    transform: translateX(0);
  }
  50% {
    opacity: 1;
    transform: translateX(-3px);
  }
}

.scroll-indicator-right .scroll-arrow {
  animation: scrollHintRight 5s ease-in-out infinite;
}

@keyframes scrollHintRight {
  0%, 100% {
    opacity: 0.5;
    transform: translateX(0);
  }
  50% {
    opacity: 1;
    transform: translateX(3px);
  }
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
  font-size: 16px;
}

.refresh-icon {
  font-size: 14px;
  margin-left: 4px;
  transition: transform 0.3s;
}

.refresh-icon.spinning {
  animation: spin 0.8s linear infinite;
  display: inline-block;
}

/* 内容区域 */
.content-section {
  flex: 1;
  overflow-y: auto;
  padding: 5px;
  position: relative;
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
  background-color: #ffffff;
  border-radius: 8px;
  overflow: hidden;
}

.hot-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #eee;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.hot-list-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin: 0;
}

.hot-count {
  font-size: 14px;
  color: #999;
}

.update-time {
  font-size: 13px;
  color: #666;
  display: flex;
  align-items: center;
}

.refresh-btn-sm {
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: #fff;
  cursor: pointer;
  transition: all 0.2s;
}

.refresh-btn-sm:hover:not(:disabled) {
  background-color: #f0f0f0;
  border-color: #007bff;
}

.refresh-btn-sm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.hot-item {
  display: flex;
  align-items: center;
  padding: 10px 10px;
  border-bottom: 1px solid #f5f5f5;
  cursor: pointer;
  transition: all 0.2s;
}

.hot-item:last-child {
  border-bottom: none;
}

.hot-item:hover {
  background-color: #f9f9f9;
}

.hot-rank {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background-color: #999;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
  flex-shrink: 0;
  margin-right: 12px;
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

.hot-metrics {
  display: flex;
  align-items: center;
  gap: 8px;
}

.hot-value {
  font-size: 12px;
  color: #ff6600;
}

.hot-level {
  font-size: 13px;
  color: #ff6600;
  display: flex;
  align-items: center;
  gap: 4px;
}

.hot-label {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 3px;
  background-color: #fff3e0;
  font-weight: normal;
}

.hot-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.fav-btn {
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: #fff;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 16px;
}

.fav-btn:hover {
  background-color: #fff9e6;
  border-color: #ffd700;
}

.fav-btn.active {
  background-color: #fff9e6;
  border-color: #ffd700;
  color: #ffd700;
}

.hot-arrow {
  font-size: 18px;
  color: #999;
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
</style>
