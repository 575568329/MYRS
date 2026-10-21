/**
 * 设置状态管理 Store
 * 管理用户UI偏好设置
 */
import { defineStore, acceptHMRUpdate } from 'pinia'
import { ref, watch } from 'vue'
import { UI, STORAGE_KEYS, DISPLAY_MODE, FISH_WINDOW_DEFAULTS, FISH_WINDOW_SIZES } from '../config.js'
import { PLATFORMS } from '../services/hotSearchApi.js'
import { getStorage } from '../utils/storage.js'
import { trackEvent } from '../services/analytics/index.js'

export const useSettingsStore = defineStore('settings', () => {
  // ========== 状态 ==========
  const showHotValue = ref(UI.SHOW_HOT_VALUE)
  const showDescription = ref(UI.SHOW_DESCRIPTION)
  const showThumbnails = ref(UI.SHOW_THUMBNAILS)
  const themeMode = ref(UI.THEME_MODE)
  const showSettings = ref(false)

  // 平台顺序管理
  const customPlatformOrder = ref([])
  const draggedItem = ref(null)
  const draggedIndex = ref(null)

  // 隐藏的平台ID集合
  const hiddenPlatforms = ref(new Set())

  // 钉住的平台ID列表（P0.2 侧栏钉住组）
  const pinnedPlatforms = ref([])

  // 侧栏分类展开状态（默认全部收起，仅记录用户主动展开的组）
  const expandedGroups = ref(new Set())

  // 摸鱼小窗配置（P1：内置浏览器窗口参数，openUrl.js 每次打开链接时读取）
  const fishWindow = ref({ ...FISH_WINDOW_DEFAULTS })

  // 系统主题监听器
  let darkModeQuery = null

  // ========== Getters ==========

  /**
   * 应用当前主题
   */
  function applyTheme(mode) {
    const root = document.documentElement

    if (mode === 'auto') {
      // 自动模式：根据系统主题
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark-mode')
      } else {
        root.classList.remove('dark-mode')
      }
    } else if (mode === 'dark') {
      root.classList.add('dark-mode')
    } else {
      root.classList.remove('dark-mode')
    }
  }

  // ========== Actions ==========

  // 统一持久化（utools dbStorage 优先，浏览器降级 localStorage）
  function persist(key, value) {
    const s = getStorage()
    if (!s) return
    try {
      s.setItem(key, value)
    } catch (e) {
      console.warn('⚠️ 保存设置失败:', key, e)
    }
  }

  /**
   * 从本地存储加载设置
   */
  function loadSettings() {
    // 首先初始化默认的平台顺序
    customPlatformOrder.value = DISPLAY_MODE.SIMPLE_MODE_PLATFORMS.map(id =>
      PLATFORMS.find(p => p.id === id)
    ).filter(Boolean)

    const storage = getStorage()
    if (storage) {
      try {
        const savedShowHotValue = storage.getItem(STORAGE_KEYS.SHOW_HOT_VALUE)
        const savedShowDescription = storage.getItem(STORAGE_KEYS.SHOW_DESCRIPTION)
        const savedShowThumbnails = storage.getItem(STORAGE_KEYS.SHOW_THUMBNAILS)
        const savedThemeMode = storage.getItem(STORAGE_KEYS.THEME_MODE)
        const savedPlatformOrder = storage.getItem(STORAGE_KEYS.CUSTOM_PLATFORM_ORDER)
        const savedHiddenPlatforms = storage.getItem(STORAGE_KEYS.HIDDEN_PLATFORMS)

        if (savedShowHotValue !== null) {
          showHotValue.value = savedShowHotValue === 'true'
        }
        if (savedShowDescription !== null) {
          showDescription.value = savedShowDescription === 'true'
        }
        if (savedShowThumbnails !== null) {
          showThumbnails.value = savedShowThumbnails === 'true'
        }
        if (savedThemeMode) {
          themeMode.value = savedThemeMode
        }
        if (savedPlatformOrder) {
          try {
            const parsedOrder = JSON.parse(savedPlatformOrder)
            if (Array.isArray(parsedOrder) && parsedOrder.length > 0) {
              const defaultPlatforms = DISPLAY_MODE.SIMPLE_MODE_PLATFORMS
              const newPlatforms = defaultPlatforms.filter(id => !parsedOrder.includes(id))

              if (newPlatforms.length > 0) {
                const mergedOrder = [...parsedOrder, ...newPlatforms]
                customPlatformOrder.value = mergedOrder.map(id =>
                  PLATFORMS.find(p => p.id === id)
                ).filter(Boolean)
                storage.setItem(
                  STORAGE_KEYS.CUSTOM_PLATFORM_ORDER,
                  JSON.stringify(mergedOrder)
                )
                console.log('🔄 设置面板发现新平台，已自动合并:', newPlatforms)
              } else {
                customPlatformOrder.value = parsedOrder.map(id =>
                  PLATFORMS.find(p => p.id === id)
                ).filter(Boolean)
              }
            }
          } catch (e) {
            console.log('⚠️ 解析平台顺序失败，使用默认顺序:', e)
          }
        }
        if (savedHiddenPlatforms) {
          try {
            const parsedHidden = JSON.parse(savedHiddenPlatforms)
            if (Array.isArray(parsedHidden)) {
              hiddenPlatforms.value = new Set(parsedHidden)
              console.log('📋 加载隐藏平台列表:', Array.from(hiddenPlatforms.value))
            }
          } catch (e) {
            console.log('⚠️ 解析隐藏平台列表失败')
          }
        }
        // 钉住平台（P0.2）
        const savedPinned = storage.getItem(STORAGE_KEYS.PINNED_PLATFORMS)
        if (savedPinned) {
          try {
            const parsedPinned = JSON.parse(savedPinned)
            if (Array.isArray(parsedPinned)) {
              pinnedPlatforms.value = parsedPinned.filter(id =>
                PLATFORMS.some(p => p.id === id)
              )
            }
          } catch (e) {
            console.log('⚠️ 解析钉住平台失败')
          }
        }
        // 摸鱼小窗配置（P1，逐字段校验，坏数据回退默认）
        const savedFishWindow = storage.getItem(STORAGE_KEYS.FISH_WINDOW_CONFIG)
        if (savedFishWindow) {
          try {
            const parsedFish = JSON.parse(savedFishWindow)
            if (parsedFish && typeof parsedFish === 'object') {
              if (parsedFish.openIn === 'ubrowser' || parsedFish.openIn === 'system') {
                fishWindow.value.openIn = parsedFish.openIn
              }
              if (FISH_WINDOW_SIZES[parsedFish.size]) {
                fishWindow.value.size = parsedFish.size
              }
              if (typeof parsedFish.opacity === 'number') {
                fishWindow.value.opacity = Math.min(1, Math.max(0.5, parsedFish.opacity))
              }
              if (typeof parsedFish.alwaysOnTop === 'boolean') {
                fishWindow.value.alwaysOnTop = parsedFish.alwaysOnTop
              }
              if (typeof parsedFish.autoMute === 'boolean') {
                fishWindow.value.autoMute = parsedFish.autoMute
              }
              if (typeof parsedFish.rememberPosition === 'boolean') {
                fishWindow.value.rememberPosition = parsedFish.rememberPosition
              }
              if (typeof parsedFish.cleanMode === 'boolean') {
                fishWindow.value.cleanMode = parsedFish.cleanMode
              }
            }
          } catch (e) {
            console.log('⚠️ 解析摸鱼小窗配置失败')
          }
        }
      } catch (e) {
        console.log('⚠️ 读取设置失败:', e)
      }
    }

    console.log('📋 初始化平台顺序:', customPlatformOrder.value.map(p => p.name))

    applyTheme(themeMode.value)

    // 监听系统主题变化
    if (window.matchMedia) {
      darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)')
      darkModeQuery.addEventListener('change', handleSystemThemeChange)
    }
  }

  /**
   * 处理系统主题变化
   */
  function handleSystemThemeChange(e) {
    if (themeMode.value === 'auto') {
      applyTheme('auto')
    }
  }

  /**
   * 保存设置到本地存储
   */
  function saveSettings() {
    persist(STORAGE_KEYS.SHOW_HOT_VALUE, showHotValue.value.toString())
    persist(STORAGE_KEYS.SHOW_DESCRIPTION, showDescription.value.toString())
    persist(STORAGE_KEYS.SHOW_THUMBNAILS, showThumbnails.value.toString())
    persist(STORAGE_KEYS.THEME_MODE, themeMode.value)
    persist(STORAGE_KEYS.HIDDEN_PLATFORMS, JSON.stringify(Array.from(hiddenPlatforms.value)))
    persist(STORAGE_KEYS.PINNED_PLATFORMS, JSON.stringify(pinnedPlatforms.value))
    persist(STORAGE_KEYS.FISH_WINDOW_CONFIG, JSON.stringify(fishWindow.value))
  }

  /**
   * 切换热度值显示
   */
  function toggleShowHotValue() {
    showHotValue.value = !showHotValue.value
    saveSettings()
  }

  /**
   * 切换描述显示
   */
  function toggleShowDescription() {
    showDescription.value = !showDescription.value
    saveSettings()
  }

  /**
   * 切换缩略图显示
   */
  function toggleShowThumbnails() {
    showThumbnails.value = !showThumbnails.value
    saveSettings()
  }

  /**
   * 设置主题模式
   * @param {string} mode - 主题模式 ('auto', 'light', 'dark')
   */
  function setThemeMode(mode) {
    themeMode.value = mode
    applyTheme(mode)
    saveSettings()
  }

  /**
   * 打开设置面板
   */
  function openSettings() {
    showSettings.value = true
  }

  /**
   * 关闭设置面板
   */
  function closeSettings() {
    showSettings.value = false
  }

  /**
   * 重置为默认设置
   */
  function resetToDefaults() {
    showHotValue.value = UI.SHOW_HOT_VALUE
    showDescription.value = UI.SHOW_DESCRIPTION
    themeMode.value = UI.THEME_MODE
    customPlatformOrder.value = DISPLAY_MODE.SIMPLE_MODE_PLATFORMS.map(id =>
      PLATFORMS.find(p => p.id === id)
    ).filter(Boolean)
    hiddenPlatforms.value.clear()
    fishWindow.value = { ...FISH_WINDOW_DEFAULTS }

    applyTheme(themeMode.value)
    saveSettings()
  }

  /**
   * 开始拖拽平台
   * @param {Object} item - 平台对象
   * @param {number} index - 索引
   */
  function startDrag(item, index) {
    draggedItem.value = item
    draggedIndex.value = index
  }

  /**
   * 拖拽放置
   * @param {number} index - 目标索引
   */
  function onDrop(index) {
    if (draggedIndex.value === null || draggedIndex.value === index) return

    const newOrder = [...customPlatformOrder.value]
    const [removed] = newOrder.splice(draggedIndex.value, 1)
    newOrder.splice(index, 0, removed)

    customPlatformOrder.value = newOrder
    persist(STORAGE_KEYS.CUSTOM_PLATFORM_ORDER, JSON.stringify(newOrder.map(p => p.id)))

    draggedItem.value = null
    draggedIndex.value = null
  }

  /**
   * 切换平台可见性
   * @param {string} platformId - 平台ID
   */
  function togglePlatformVisibility(platformId) {
    if (hiddenPlatforms.value.has(platformId)) {
      hiddenPlatforms.value.delete(platformId)
      console.log('👁️ 显示平台:', platformId)
    } else {
      hiddenPlatforms.value.add(platformId)
      console.log('👁️‍🗨️ 隐藏平台:', platformId)
    }
    saveSettings()
  }

  /**
   * 检查平台是否可见
   * @param {string} platformId - 平台ID
   * @returns {boolean}
   */
  function isPlatformVisible(platformId) {
    return !hiddenPlatforms.value.has(platformId)
  }

  /**
   * 钉住/取消钉住平台（P0.2 侧栏，立即持久化）
   * 钉住直接决定聚合首页形态，纳入埋点
   */
  function togglePin(platformId) {
    const idx = pinnedPlatforms.value.indexOf(platformId)
    let action = 'pin'
    if (idx > -1) {
      pinnedPlatforms.value.splice(idx, 1)
      action = 'unpin'
    } else {
      pinnedPlatforms.value.unshift(platformId)
    }
    persist(STORAGE_KEYS.PINNED_PLATFORMS, JSON.stringify(pinnedPlatforms.value))
    try {
      trackEvent('pin_toggle', { platform: platformId, action })
    } catch (e) {
      /* 埋点失败不影响功能 */
    }
  }

  function isPinned(platformId) {
    return pinnedPlatforms.value.includes(platformId)
  }

  /**
   * 调整钉住平台顺序（聚合首页排序用）
   * @param {string} platformId
   * @param {number} delta -1 上移 / 1 下移
   */
  function movePinned(platformId, delta) {
    const idx = pinnedPlatforms.value.indexOf(platformId)
    const target = idx + delta
    if (idx === -1 || target < 0 || target >= pinnedPlatforms.value.length) return
    const list = [...pinnedPlatforms.value]
    const [moved] = list.splice(idx, 1)
    list.splice(target, 0, moved)
    pinnedPlatforms.value = list
    persist(STORAGE_KEYS.PINNED_PLATFORMS, JSON.stringify(list))
  }

  /**
   * 拖拽排序：把 draggedId 插入到 targetId 的位置（插入逻辑，非互换）
   * 向下拖：落在目标原位置（目标及之后顺延）
   * 向上拖：落在目标前一个位置
   */
  function movePinnedTo(draggedId, targetId) {
    if (draggedId === targetId) return
    const list = [...pinnedPlatforms.value]
    const from = list.indexOf(draggedId)
    const to = list.indexOf(targetId)
    if (from === -1 || to === -1) return
    list.splice(from, 1)
    // 拖拽方向不同，移除后目标索引偏移不同：向下拖时目标已左移一位
    const insertAt = from < to ? to - 1 : to
    list.splice(insertAt, 0, draggedId)
    pinnedPlatforms.value = list
    persist(STORAGE_KEYS.PINNED_PLATFORMS, JSON.stringify(list))
  }

  /**
   * 切换分类展开（P0.2 侧栏：默认收起，展开状态持久化）
   */
  function toggleGroupExpand(category) {
    if (expandedGroups.value.has(category)) {
      expandedGroups.value.delete(category)
    } else {
      expandedGroups.value.add(category)
    }
  }

  /**
   * 更新摸鱼小窗配置（P1）
   * @param {Object} patch - 要合并的字段
   * @param {boolean} persistNow - 透明度滑块拖动中传 false，松手（change）后再落盘
   */
  function setFishWindow(patch, persistNow = true) {
    fishWindow.value = { ...fishWindow.value, ...patch }
    if (persistNow) {
      persist(STORAGE_KEYS.FISH_WINDOW_CONFIG, JSON.stringify(fishWindow.value))
    }
  }

  /**
   * 清理监听器
   */
  function cleanup() {
    if (darkModeQuery) {
      darkModeQuery.removeEventListener('change', handleSystemThemeChange)
      darkModeQuery = null
    }
  }

  // ========== Watchers ==========

  // 监听热度值显示变化，发送事件通知
  watch(showHotValue, (newValue) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('settingChange', {
        detail: {
          key: 'showHotValue',
          value: newValue
        }
      }))
    }
  })

  // 监听描述显示变化，发送事件通知
  watch(showDescription, (newValue) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('settingChange', {
        detail: {
          key: 'showDescription',
          value: newValue
        }
      }))
    }
  })

  // 监听主题变化，自动应用并发送事件通知
  watch(themeMode, (newMode) => {
    applyTheme(newMode)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('settingChange', {
        detail: {
          key: 'themeMode',
          value: newMode
        }
      }))
    }
  })

  // 监听隐藏平台列表变化，发送事件通知
  watch(hiddenPlatforms, (newSet) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('settingChange', {
        detail: {
          key: 'hiddenPlatforms',
          value: Array.from(newSet)
        }
      }))
    }
  }, { deep: true })

  // 监听自定义平台顺序变化，发送事件通知
  watch(customPlatformOrder, (newOrder) => {
    if (typeof window !== 'undefined') {
      const orderIds = newOrder.map(p => p.id)
      window.dispatchEvent(new CustomEvent('settingChange', {
        detail: {
          key: 'customPlatformOrder',
          value: orderIds
        }
      }))
    }
  }, { deep: true })

  return {
    // 状态
    showHotValue,
    showDescription,
    showThumbnails,
    themeMode,
    showSettings,
    customPlatformOrder,
    draggedItem,
    draggedIndex,
    hiddenPlatforms,
    pinnedPlatforms,
    expandedGroups,
    fishWindow,

    // Actions
    loadSettings,
    saveSettings,
    toggleShowHotValue,
    toggleShowDescription,
    toggleShowThumbnails,
    setThemeMode,
    openSettings,
    closeSettings,
    resetToDefaults,
    startDrag,
    onDrop,
    togglePlatformVisibility,
    isPlatformVisible,
    togglePin,
    isPinned,
    movePinned,
    movePinnedTo,
    toggleGroupExpand,
    setFishWindow,
    cleanup
  }
})

// Pinia 官方 HMR：热更时保留 state 并替换 actions，避免"组件新 store 旧"的调用缺口
if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate('settings', useSettingsStore))
}
