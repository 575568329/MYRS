<script setup>
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { getHotData, PLATFORMS, getPlatformsByCategory, getCategories, getPlatformsByMode } from '../services/hotSearchApi.js'
import { DISPLAY_MODE, STORAGE_KEYS, UI, AUTO_REFRESH, HOT_LEVELS } from '../config.js'
import Settings from '../Settings/index.vue'

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

// UI 设置
const showSettings = ref(false)
const showHotValue = ref(UI.SHOW_HOT_VALUE)
const showDescription = ref(UI.SHOW_DESCRIPTION)

// 自定义平台顺序
const customPlatformOrder = ref(null)

const categories = getCategories()

// 判断是否为极简模式（基于配置文件）
const isSimpleMode = computed(() => {
  return DISPLAY_MODE.DEFAULT_MODE === 'simple'
})

// 根据选中的分类过滤平台（与配置联动）
const filteredPlatforms = computed(() => {
  // 极简模式：始终显示主流平台
  if (DISPLAY_MODE.DEFAULT_MODE === 'simple') {
    return getPlatformsByMode(customPlatformOrder.value)
  }

  // 分类模式：根据选中的分类显示平台
  if (!selectedCategory.value || selectedCategory.value === '全部') {
    // "全部"分类下显示所有平台
    return PLATFORMS
  }

  // 具体分类：显示该分类下的所有平台
  return getPlatformsByCategory(selectedCategory.value)
})

// 获取当前选中的平台对象
const currentPlatformObj = computed(() => {
  return PLATFORMS.find(p => p.id === selectedPlatform.value)
})

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
      console.log(`✅ 成功获取 ${result.data.length} 条热搜数据`)
      console.log(`📊 总数据量: ${result.total}，还有更多: ${result.hasMore}`)
    } else if (Array.isArray(result)) {
      // 兼容旧格式（直接是数组）
      hotList.value = result
      hasMore.value = false
      totalCount.value = result.length
      console.log(`✅ 成功获取 ${result.length} 条热搜数据`)
    } else {
      // 空数据或其他格式
      hotList.value = []
      hasMore.value = false
      totalCount.value = 0
      console.warn('⚠️ 未获取到有效数据')
    }

  } catch (err) {
    console.error('❌ 获取热搜失败:', err)

    // 显示友好的错误信息
    if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
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
  console.log(`📄 加载第 ${currentPage.value} 页`)
  fetchHotData(selectedPlatform.value, true)
}

// 切换平台
const switchPlatform = (platformId) => {
  if (selectedPlatform.value === platformId) return
  selectedPlatform.value = platformId
  fetchHotData(platformId)
}

// 切换分类
const switchCategory = (category) => {
  if (selectedCategory.value === category) return

  selectedCategory.value = category

  // 获取新分类下的平台列表
  const platformsInCategory = filteredPlatforms.value

  // 检查当前选中的平台是否在新分类中
  const currentPlatformInCategory = platformsInCategory.find(p => p.id === selectedPlatform.value)

  if (currentPlatformInCategory) {
    // 当前平台在新分类中，保持不变
    console.log(`📂 切换到分类 "${category}"，当前平台 "${selectedPlatform.value}" 仍在该分类中`)
  } else if (platformsInCategory.length > 0) {
    // 当前平台不在新分类中，自动切换到该分类的第一个平台
    const firstPlatform = platformsInCategory[0]
    console.log(`📂 切换到分类 "${category}"，自动切换到平台 "${firstPlatform.name}"`)
    selectedPlatform.value = firstPlatform.id
    fetchHotData(firstPlatform.id)
  } else {
    console.warn(`⚠️ 分类 "${category}" 下没有可用平台`)
  }
}


// 打开链接
const openUrl = (url) => {
  if (!url || url === '#') {
    console.log('⚠️ 无效链接:', url)
    return
  }

  if (window.utools) {
    window.utools.shellOpenExternal(url)
  } else {
    window.open(url, '_blank')
  }
}

// 刷新当前平台
const refresh = () => {
  fetchHotData(selectedPlatform.value)
}

// 打开设置面板
const openSettings = () => {
  showSettings.value = true
}

// 关闭设置面板
const closeSettings = () => {
  showSettings.value = false
}

// 处理设置变更
const handleSettingChange = (event) => {
  const { key, value } = event.detail
  console.log('⚙️ 设置变更:', key, value)

  if (key === 'showHotValue') {
    showHotValue.value = value
  } else if (key === 'showDescription') {
    showDescription.value = value
  } else if (key === 'themeMode') {
    applyTheme(value)
  } else if (key === 'customPlatformOrder') {
    // 更新自定义平台顺序
    customPlatformOrder.value = value
    console.log('✅ 自定义平台顺序已更新 (ID数组):', value)
    // 验证顺序是否正确
    const platforms = getPlatformsByMode(value)
    console.log('✅ 实际显示的平台顺序:', platforms.map(p => `${p.icon} ${p.name}`))
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
    console.log('🌙 系统主题已切换:', e.matches ? '暗色' : '亮色')
  }
}

// 组件卸载时移除事件监听
onUnmounted(() => {
  window.removeEventListener('settingChange', handleSettingChange)
  if (darkModeQuery) {
    darkModeQuery.removeEventListener('change', handleSystemThemeChange)
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
  console.log('🔥 热搜组件已挂载')
  console.log('📍 当前平台:', selectedPlatform.value)
  console.log('📂 当前分类:', selectedCategory.value)

  // 从本地存储读取保存的分类和平台设置
  if (window.utools && window.utools.dbStorage) {
    try {
      const savedCategory = window.utools.dbStorage.getItem(STORAGE_KEYS.SELECTED_CATEGORY)
      const savedPlatform = window.utools.dbStorage.getItem(STORAGE_KEYS.SELECTED_PLATFORM)
      const savedShowHotValue = window.utools.dbStorage.getItem(STORAGE_KEYS.SHOW_HOT_VALUE)
      const savedShowDescription = window.utools.dbStorage.getItem(STORAGE_KEYS.SHOW_DESCRIPTION)
      const savedThemeMode = window.utools.dbStorage.getItem(STORAGE_KEYS.THEME_MODE)
      const savedCustomPlatformOrder = window.utools.dbStorage.getItem(STORAGE_KEYS.CUSTOM_PLATFORM_ORDER)

      if (savedCategory) {
        console.log('💾 从本地存储读取分类:', savedCategory)
        selectedCategory.value = savedCategory
      }

      if (savedPlatform) {
        console.log('💾 从本地存储读取平台:', savedPlatform)
        selectedPlatform.value = savedPlatform
      }

      if (savedShowHotValue !== null) {
        showHotValue.value = savedShowHotValue === 'true'
      }

      if (savedShowDescription !== null) {
        showDescription.value = savedShowDescription === 'true'
      }

      // 应用保存的主题
      if (savedThemeMode) {
        applyTheme(savedThemeMode)
      }

      // 读取自定义平台顺序 - 如果没有保存的顺序，使用默认顺序
      if (savedCustomPlatformOrder) {
        try {
          customPlatformOrder.value = JSON.parse(savedCustomPlatformOrder)
          console.log('💾 从本地存储读取自定义平台顺序:', customPlatformOrder.value)
        } catch (e) {
          console.log('⚠️ 解析自定义平台顺序失败，使用默认顺序:', e)
          customPlatformOrder.value = DISPLAY_MODE.SIMPLE_MODE_PLATFORMS
        }
      } else {
        // 没有保存的自定义顺序，使用配置文件中的默认顺序
        customPlatformOrder.value = DISPLAY_MODE.SIMPLE_MODE_PLATFORMS
        console.log('💾 使用默认平台顺序:', customPlatformOrder.value)
      }
    } catch (e) {
      console.log('⚠️ 读取本地存储失败:', e)
      // 读取失败时使用默认顺序
      customPlatformOrder.value = DISPLAY_MODE.SIMPLE_MODE_PLATFORMS
    }
  } else {
    // 如果不在 uTools 环境，应用默认主题和默认平台顺序
    applyTheme(UI.THEME_MODE)
    customPlatformOrder.value = DISPLAY_MODE.SIMPLE_MODE_PLATFORMS
  }

  // 确保 customPlatformOrder 不为 null
  if (!customPlatformOrder.value || customPlatformOrder.value.length === 0) {
    customPlatformOrder.value = DISPLAY_MODE.SIMPLE_MODE_PLATFORMS
    console.log('📋 初始化默认平台顺序:', customPlatformOrder.value)
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
      console.log('📜 触发加载更多')
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
      console.log('⚠️ 保存平台失败:', e)
    }
  }
})

// 监听分类变化，保存到本地存储并重新检测滚动状态
watch(selectedCategory, (newCategory) => {
  if (window.utools && window.utools.dbStorage) {
    try {
      window.utools.dbStorage.setItem(STORAGE_KEYS.SELECTED_CATEGORY, newCategory)
    } catch (e) {
      console.log('⚠️ 保存分类失败:', e)
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
          <span class="current-platform-icon">{{ currentPlatformObj.icon }}</span>
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
              <span class="platform-icon">{{ platform.icon }}</span>
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
        <div
          v-for="(item, index) in hotList"
          :key="index"
          @click="openUrl(item.url || item.mobileUrl)"
          :class="['hot-item', { 'no-desc': !showDescription || !item.desc }]"
        >
          <div class="hot-rank" :style="getRankStyle(index + 1)">
            {{ index + 1 }}
          </div>
          <div class="hot-content">
            <div class="hot-title">{{ item.title }}</div>
            <div v-if="item.desc && showDescription" class="hot-desc">{{ item.desc }}</div>
          </div>
          <div v-if="item.hot && showHotValue" class="hot-value">
            🔥 {{ formatHotValue(item.hot) }}
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

    <!-- 设置面板 -->
    <Settings :show="showSettings" @close="closeSettings"></Settings>

    <!-- 悬浮按钮组 - 右下角 -->
    <div class="floating-buttons">
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
  font-size: 18px;
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
  font-size: 16px;
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

.hot-item {
  display: flex;
  align-items: center;
  padding: 12px 10px;
  border-bottom: 1px solid #f5f5f5;
  cursor: pointer;
  transition: all 0.2s;
}

/* 没有简介时的高度更紧凑 */
.hot-item.no-desc {
  padding: 8px 10px;
}

.hot-item:last-child {
  border-bottom: none;
}

.hot-item:hover {
  background-color: #f9f9f9;
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
  border-bottom-color: #3a3a3a !important;
}

html.dark-mode .hot-item:hover {
  background-color: #3a3a3a !important;
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

/* 暗色模式下没有简介时的样式保持一致 */
html.dark-mode .hot-item.no-desc {
  padding: 8px 10px;
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

html.dark-mode .settings-btn {
  background: linear-gradient(135deg, #495057, #343a40);
}

html.dark-mode .settings-btn:hover {
  background: linear-gradient(135deg, #343a40, #212529);
}
</style>
