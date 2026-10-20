/**
 * 设置状态管理 Store
 * 管理用户UI偏好设置
 */
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { UI, STORAGE_KEYS, DISPLAY_MODE } from '../config.js'
import { PLATFORMS } from '../services/hotSearchApi.js'

export const useSettingsStore = defineStore('settings', () => {
  // ========== 状态 ==========
  const showHotValue = ref(UI.SHOW_HOT_VALUE)
  const showDescription = ref(UI.SHOW_DESCRIPTION)
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

  // 侧栏分类折叠状态（P0.2）
  const collapsedGroups = ref(new Set())

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

  /**
   * 从本地存储加载设置
   */
  function loadSettings() {
    // 首先初始化默认的平台顺序
    customPlatformOrder.value = DISPLAY_MODE.SIMPLE_MODE_PLATFORMS.map(id =>
      PLATFORMS.find(p => p.id === id)
    ).filter(Boolean)

    if (window.utools && window.utools.dbStorage) {
      try {
        const savedShowHotValue = window.utools.dbStorage.getItem(STORAGE_KEYS.SHOW_HOT_VALUE)
        const savedShowDescription = window.utools.dbStorage.getItem(STORAGE_KEYS.SHOW_DESCRIPTION)
        const savedThemeMode = window.utools.dbStorage.getItem(STORAGE_KEYS.THEME_MODE)
        const savedPlatformOrder = window.utools.dbStorage.getItem(STORAGE_KEYS.CUSTOM_PLATFORM_ORDER)
        const savedHiddenPlatforms = window.utools.dbStorage.getItem(STORAGE_KEYS.HIDDEN_PLATFORMS)

        if (savedShowHotValue !== null) {
          showHotValue.value = savedShowHotValue === 'true'
        }
        if (savedShowDescription !== null) {
          showDescription.value = savedShowDescription === 'true'
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
                window.utools.dbStorage.setItem(
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
        const savedPinned = window.utools.dbStorage.getItem(STORAGE_KEYS.PINNED_PLATFORMS)
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
        // 分类折叠状态（P0.2）
        const savedCollapsed = window.utools.dbStorage.getItem(STORAGE_KEYS.COLLAPSED_GROUPS)
        if (savedCollapsed) {
          try {
            const parsedCollapsed = JSON.parse(savedCollapsed)
            if (Array.isArray(parsedCollapsed)) {
              collapsedGroups.value = new Set(parsedCollapsed)
            }
          } catch (e) {
            console.log('⚠️ 解析折叠状态失败')
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
    if (window.utools && window.utools.dbStorage) {
      try {
        window.utools.dbStorage.setItem(STORAGE_KEYS.SHOW_HOT_VALUE, showHotValue.value.toString())
        window.utools.dbStorage.setItem(STORAGE_KEYS.SHOW_DESCRIPTION, showDescription.value.toString())
        window.utools.dbStorage.setItem(STORAGE_KEYS.THEME_MODE, themeMode.value)
        window.utools.dbStorage.setItem(
          STORAGE_KEYS.HIDDEN_PLATFORMS,
          JSON.stringify(Array.from(hiddenPlatforms.value))
        )

        console.log('✅ 设置已保存')
      } catch (e) {
        console.warn('⚠️ 保存设置失败:', e)
      }
    }
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

    // 保存到本地存储
    if (window.utools && window.utools.dbStorage) {
      try {
        const orderIds = newOrder.map(p => p.id)
        window.utools.dbStorage.setItem(
          STORAGE_KEYS.CUSTOM_PLATFORM_ORDER,
          JSON.stringify(orderIds)
        )
        console.log('✅ 平台顺序已更新:', orderIds)
      } catch (e) {
        console.warn('⚠️ 保存平台顺序失败:', e)
      }
    }

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
   * 钉住/取消钉住平台（P0.2 侧栏）
   */
  function togglePin(platformId) {
    const idx = pinnedPlatforms.value.indexOf(platformId)
    if (idx > -1) {
      pinnedPlatforms.value.splice(idx, 1)
    } else {
      pinnedPlatforms.value.unshift(platformId)
    }
    if (window.utools && window.utools.dbStorage) {
      try {
        window.utools.dbStorage.setItem(
          STORAGE_KEYS.PINNED_PLATFORMS,
          JSON.stringify(pinnedPlatforms.value)
        )
      } catch (e) {
        console.warn('⚠️ 保存钉住平台失败')
      }
    }
  }

  function isPinned(platformId) {
    return pinnedPlatforms.value.includes(platformId)
  }

  /**
   * 切换分类折叠（P0.2 侧栏）
   */
  function toggleGroupCollapse(category) {
    if (collapsedGroups.value.has(category)) {
      collapsedGroups.value.delete(category)
    } else {
      collapsedGroups.value.add(category)
    }
    if (window.utools && window.utools.dbStorage) {
      try {
        window.utools.dbStorage.setItem(
          STORAGE_KEYS.COLLAPSED_GROUPS,
          JSON.stringify(Array.from(collapsedGroups.value))
        )
      } catch (e) {
        /* 忽略 */
      }
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
    themeMode,
    showSettings,
    customPlatformOrder,
    draggedItem,
    draggedIndex,
    hiddenPlatforms,
    pinnedPlatforms,
    collapsedGroups,

    // Actions
    loadSettings,
    saveSettings,
    toggleShowHotValue,
    toggleShowDescription,
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
    toggleGroupCollapse,
    cleanup
  }
})
