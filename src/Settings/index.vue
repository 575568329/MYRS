<script setup>
import { ref, onMounted, watch, onUnmounted } from 'vue'
import { UI, STORAGE_KEYS, DISPLAY_MODE } from '../config.js'
import { PLATFORMS } from '../services/hotSearchApi.js'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

// 设置状态
const showHotValue = ref(UI.SHOW_HOT_VALUE)
const showDescription = ref(UI.SHOW_DESCRIPTION)
const themeMode = ref(UI.THEME_MODE)

// 平台顺序管理
const customPlatformOrder = ref([])
const draggedItem = ref(null)
const draggedIndex = ref(null)

// 系统主题变化的媒体查询监听器
let darkModeQuery = null

// 从本地存储读取设置
onMounted(() => {
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
          // 验证解析的顺序是否有效
          if (Array.isArray(parsedOrder) && parsedOrder.length > 0) {
            // 增量合并：保留用户顺序，添加配置文件中的新平台
            const defaultPlatforms = DISPLAY_MODE.SIMPLE_MODE_PLATFORMS
            const newPlatforms = defaultPlatforms.filter(id => !parsedOrder.includes(id))

            // 如果有新平台，合并并保存
            if (newPlatforms.length > 0) {
              const mergedOrder = [...parsedOrder, ...newPlatforms]
              customPlatformOrder.value = mergedOrder.map(id =>
                PLATFORMS.find(p => p.id === id)
              ).filter(Boolean)
              // 自动保存合并后的顺序
              window.utools.dbStorage.setItem(STORAGE_KEYS.CUSTOM_PLATFORM_ORDER, JSON.stringify(mergedOrder))
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
    } catch (e) {
      console.log('⚠️ 读取设置失败:', e)
    }
  }

  console.log('📋 初始化平台顺序:', customPlatformOrder.value.map(p => p.name))

  // 应用主题
  applyTheme(themeMode.value)

  // 监听系统主题变化（仅当选择自动模式时）
  if (window.matchMedia) {
    darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)')
    darkModeQuery.addEventListener('change', handleSystemThemeChange)
  }
})

// 组件卸载时移除监听
onUnmounted(() => {
  if (darkModeQuery) {
    darkModeQuery.removeEventListener('change', handleSystemThemeChange)
  }
})

// 处理系统主题变化
const handleSystemThemeChange = (e) => {
  if (themeMode.value === 'auto') {
    const html = document.documentElement
    if (e.matches) {
      html.setAttribute('class', 'dark-mode')
    } else {
      html.removeAttribute('class')
    }
    console.log('🌙 系统主题已切换:', e.matches ? '暗色' : '亮色')
  }
}

// 监听设置变化，保存到本地存储
watch(showHotValue, (newValue) => {
  if (window.utools && window.utools.dbStorage) {
    try {
      window.utools.dbStorage.setItem(STORAGE_KEYS.SHOW_HOT_VALUE, newValue.toString())
    } catch (e) {
      console.log('⚠️ 保存设置失败:', e)
    }
  }
  // 触发设置更新事件
  emitSettingChange('showHotValue', newValue)
})

watch(showDescription, (newValue) => {
  if (window.utools && window.utools.dbStorage) {
    try {
      window.utools.dbStorage.setItem(STORAGE_KEYS.SHOW_DESCRIPTION, newValue.toString())
    } catch (e) {
      console.log('⚠️ 保存设置失败:', e)
    }
  }
  emitSettingChange('showDescription', newValue)
})

watch(themeMode, (newValue) => {
  if (window.utools && window.utools.dbStorage) {
    try {
      window.utools.dbStorage.setItem(STORAGE_KEYS.THEME_MODE, newValue)
    } catch (e) {
      console.log('⚠️ 保存设置失败:', e)
    }
  }
  applyTheme(newValue)
  emitSettingChange('themeMode', newValue)
})

// 触发设置更新事件
const emitSettingChange = (key, value) => {
  // 通过自定义事件通知父组件
  const event = new CustomEvent('settingChange', { detail: { key, value } })
  window.dispatchEvent(event)
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

  console.log('🎨 主题已应用:', mode, '当前类:', html.className)
}

// 关闭设置面板
const close = () => {
  // 保存自定义平台顺序
  saveCustomPlatformOrder()
  emit('close')
}

// 保存自定义平台顺序
const saveCustomPlatformOrder = () => {
  if (window.utools && window.utools.dbStorage) {
    try {
      const platformIds = customPlatformOrder.value.map(p => p.id)
      window.utools.dbStorage.setItem(STORAGE_KEYS.CUSTOM_PLATFORM_ORDER, JSON.stringify(platformIds))
      console.log('✅ 自定义平台顺序已保存 (ID数组):', platformIds)
      console.log('✅ 对应的平台名称:', customPlatformOrder.value.map(p => p.name))
      // 触发设置更新事件，通知主组件刷新
      emitSettingChange('customPlatformOrder', platformIds)
    } catch (e) {
      console.log('⚠️ 保存平台顺序失败:', e)
    }
  } else {
    // 如果不在 uTools 环境，仍然触发事件以更新主组件
    const platformIds = customPlatformOrder.value.map(p => p.id)
    console.log('✅ 非uTools环境，触发更新事件:', platformIds)
    emitSettingChange('customPlatformOrder', platformIds)
  }
}

// 拖拽开始
const handleDragStart = (event, index) => {
  draggedIndex.value = index
  draggedItem.value = customPlatformOrder.value[index]
  event.dataTransfer.effectAllowed = 'move'
  // 设置拖拽时的样式
  event.target.style.opacity = '0.5'
}

// 拖拽结束
const handleDragEnd = (event) => {
  event.target.style.opacity = '1'
  draggedItem.value = null
  draggedIndex.value = null
}

// 拖拽经过
const handleDragOver = (event) => {
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
}

// 拖拽进入
const handleDragEnter = (event, index) => {
  event.preventDefault()
  if (draggedIndex.value === null || draggedIndex.value === index) return

  // 重新排列数组
  const newOrder = [...customPlatformOrder.value]
  const [removed] = newOrder.splice(draggedIndex.value, 1)
  newOrder.splice(index, 0, removed)

  customPlatformOrder.value = newOrder
  draggedIndex.value = index
}

// 放置
const handleDrop = (event, index) => {
  event.preventDefault()
  // 拖拽进入时已经处理了重新排序，这里只需要清理状态
  draggedItem.value = null
  draggedIndex.value = null
}

// 重置为默认顺序
const resetToDefault = () => {
  console.log('🔄 重置平台顺序')
  console.log('DISPLAY_MODE.SIMPLE_MODE_PLATFORMS:', DISPLAY_MODE.SIMPLE_MODE_PLATFORMS)
  console.log('PLATFORMS:', PLATFORMS)

  customPlatformOrder.value = DISPLAY_MODE.SIMPLE_MODE_PLATFORMS.map(id =>
    PLATFORMS.find(p => p.id === id)
  ).filter(Boolean)

  console.log('重置后的平台顺序:', customPlatformOrder.value)
  saveCustomPlatformOrder()
}

// 清除所有缓存
const clearAllCache = () => {
  if (!window.utools || !window.utools.dbStorage) {
    console.log('⚠️ 当前环境不支持清除缓存')
    return
  }

  if (confirm('确定要清除所有缓存吗？这将重置所有设置为默认值。')) {
    try {
      // 清除平台顺序缓存
      window.utools.dbStorage.removeItem(STORAGE_KEYS.CUSTOM_PLATFORM_ORDER)
      // 也可以清除其他设置（可选）
      // window.utools.dbStorage.removeItem(STORAGE_KEYS.SELECTED_PLATFORM)
      // window.utools.dbStorage.removeItem(STORAGE_KEYS.SELECTED_CATEGORY)

      console.log('✅ 缓存已清除')
      alert('缓存已清除！应用将重新加载配置。')

      // 重新加载默认配置
      customPlatformOrder.value = DISPLAY_MODE.SIMPLE_MODE_PLATFORMS.map(id =>
        PLATFORMS.find(p => p.id === id)
      ).filter(Boolean)

      saveCustomPlatformOrder()
    } catch (e) {
      console.error('❌ 清除缓存失败:', e)
      alert('清除缓存失败: ' + e.message)
    }
  }
}
</script>

<template>
  <div v-if="show" class="settings-overlay" @click.self="close">
    <div class="settings-panel">
      <div class="settings-header">
        <h3>⚙️ 设置</h3>
        <button @click="close" class="close-btn">✕</button>
      </div>

      <div class="settings-content">
        <!-- 显示设置 -->
        <div class="setting-group">
          <h4>显示设置</h4>

          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">显示热度值</span>
              <span class="setting-desc">在热搜列表中显示热度信息</span>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" v-model="showHotValue">
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">显示简介</span>
              <span class="setting-desc">在热搜列表中显示内容简介</span>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" v-model="showDescription">
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <!-- 主题设置 -->
        <div class="setting-group">
          <h4>主题设置</h4>

          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">夜间模式</span>
            </div>
            <div class="theme-options">
              <label class="theme-option" :class="{ active: themeMode === 'auto' }">
                <input type="radio" value="auto" v-model="themeMode">
                <span>自动</span>
              </label>
              <label class="theme-option" :class="{ active: themeMode === 'light' }">
                <input type="radio" value="light" v-model="themeMode">
                <span>亮色</span>
              </label>
              <label class="theme-option" :class="{ active: themeMode === 'dark' }">
                <input type="radio" value="dark" v-model="themeMode">
                <span>暗色</span>
              </label>
            </div>
          </div>
        </div>

        <!-- 平台顺序设置 -->
        <div class="setting-group">
          <div class="setting-group-header">
            <h4>极简模式平台顺序</h4>
            <div class="header-buttons">
              <button @click="clearAllCache" class="clear-cache-btn">清除缓存</button>
              <button @click="resetToDefault" class="reset-btn">重置</button>
            </div>
          </div>
          <div class="setting-group-header-info">
            <p class="setting-group-desc">拖动调整极简模式下显示的平台顺序</p>
            <p class="platform-count">共 {{ customPlatformOrder.length }} 个平台</p>
          </div>

          <div v-if="customPlatformOrder.length === 0" class="empty-platforms">
            <p>⚠️ 未找到平台列表</p>
            <p class="empty-tip">请点击"重置"按钮重新加载</p>
          </div>

          <div v-else class="platform-order-list">
            <div
              v-for="(platform, index) in customPlatformOrder"
              :key="platform.id"
              class="platform-order-item"
              draggable="true"
              @dragstart="handleDragStart($event, index)"
              @dragend="handleDragEnd"
              @dragover="handleDragOver"
              @dragenter="handleDragEnter($event, index)"
              @drop="handleDrop($event, index)"
            >
              <span class="drag-handle">⋮⋮</span>
              <span class="platform-index">{{ index + 1 }}</span>
              <span class="platform-icon">{{ platform.icon }}</span>
              <span class="platform-name">{{ platform.name }}</span>
              <span class="drag-indicator">⋮⋮</span>
            </div>
          </div>
        </div>
      </div>

      <div class="settings-footer">
        <button @click="close" class="btn-primary">完成</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.settings-panel {
  background-color: #ffffff;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  animation: slideUp 0.3s;
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

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #eee;
}

.settings-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #999;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s;
}

.close-btn:hover {
  background-color: #f5f5f5;
  color: #333;
}

.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}

.setting-group {
  margin-bottom: 24px;
}

.setting-group:last-child {
  margin-bottom: 0;
}

.setting-group h4 {
  margin: 0 0 16px;
  font-size: 14px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #f5f5f5;
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-info {
  flex: 1;
}

.setting-label {
  display: block;
  font-size: 15px;
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.setting-desc {
  display: block;
  font-size: 13px;
  color: #999;
}

/* 开关样式 */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 26px;
  flex-shrink: 0;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: 0.3s;
  border-radius: 26px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

.toggle-switch input:checked + .toggle-slider {
  background-color: #007bff;
}

.toggle-switch input:checked + .toggle-slider:before {
  transform: translateX(22px);
}

/* 主题选项 */
.theme-options {
  display: flex;
  gap: 8px;
}

.theme-option {
  position: relative;
  cursor: pointer;
}

.theme-option input {
  position: absolute;
  opacity: 0;
}

.theme-option span {
  display: block;
  padding: 8px 16px;
  border: 2px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  color: #666;
  transition: all 0.2s;
}

.theme-option:hover span {
  border-color: #007bff;
  color: #007bff;
}

.theme-option.active span {
  border-color: #007bff;
  background-color: #007bff;
  color: #ffffff;
}

.settings-footer {
  padding: 16px 24px;
  border-top: 1px solid #eee;
  text-align: right;
}

.btn-primary {
  padding: 10px 24px;
  border: none;
  border-radius: 6px;
  background-color: #007bff;
  color: #ffffff;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover {
  background-color: #0056b3;
}

/* 暗色模式 */
:global(.dark-mode) .settings-panel {
  background-color: #2c2c2c;
}

:global(.dark-mode) .settings-header {
  border-bottom-color: #444;
}

:global(.dark-mode) .settings-header h3 {
  color: #e0e0e0;
}

:global(.dark-mode) .close-btn {
  color: #999;
}

:global(.dark-mode) .close-btn:hover {
  background-color: #444;
  color: #e0e0e0;
}

:global(.dark-mode) .setting-group h4 {
  color: #999;
}

:global(.dark-mode) .setting-item {
  border-bottom-color: #444;
}

:global(.dark-mode) .setting-label {
  color: #e0e0e0;
}

:global(.dark-mode) .setting-desc {
  color: #999;
}

:global(.dark-mode) .settings-footer {
  border-top-color: #444;
}

:global(.dark-mode) .toggle-slider {
  background-color: #555;
}

:global(.dark-mode) .theme-option span {
  border-color: #555;
  color: #999;
}

:global(.dark-mode) .theme-option:hover span {
  border-color: #007bff;
  color: #007bff;
}

/* 平台顺序设置 */
.setting-group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.setting-group-header h4 {
  margin: 0;
}

.setting-group-header-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  gap: 12px;
}

.header-buttons {
  display: flex;
  gap: 8px;
}

.reset-btn,
.clear-cache-btn {
  padding: 4px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: #fff;
  color: #666;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.reset-btn:hover,
.clear-cache-btn:hover {
  border-color: #007bff;
  color: #007bff;
  background-color: #f0f8ff;
}

.clear-cache-btn {
  border-color: #ff9800;
  color: #ff9800;
}

.clear-cache-btn:hover {
  border-color: #f57c00;
  color: #f57c00;
  background-color: #fff3e0;
}

.setting-group-desc {
  margin: 0;
  font-size: 12px;
  color: #999;
  flex: 1;
}

.platform-count {
  margin: 0;
  font-size: 12px;
  color: #666;
  font-weight: 500;
  flex-shrink: 0;
}

.platform-order-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 400px;
  overflow-y: auto;
  padding: 6px;
  /* 自定义滚动条样式 */
  scrollbar-width: thin;
  scrollbar-color: #ccc #f0f0f0;
}

.platform-order-list::-webkit-scrollbar {
  width: 6px;
}

.platform-order-list::-webkit-scrollbar-track {
  background: #f0f0f0;
  border-radius: 3px;
}

.platform-order-list::-webkit-scrollbar-thumb {
  background-color: #ccc;
  border-radius: 3px;
  transition: background-color 0.2s;
}

.platform-order-list::-webkit-scrollbar-thumb:hover {
  background-color: #999;
}

.platform-order-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background-color: #f9f9f9;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  cursor: move;
  transition: all 0.2s;
  user-select: none;
  min-height: 40px;
}

.platform-order-item:hover {
  background-color: #f0f8ff;
  border-color: #007bff;
  transform: translateX(4px);
}

.platform-order-item:active {
  cursor: grabbing;
}

.drag-handle,
.drag-indicator {
  color: #ccc;
  font-size: 16px;
  line-height: 1;
  flex-shrink: 0;
}

.platform-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  font-size: 11px;
  font-weight: 600;
  color: #999;
  background-color: #f0f0f0;
  border-radius: 50%;
  flex-shrink: 0;
}

.platform-order-item .platform-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.platform-order-item .platform-name {
  flex: 1;
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

/* 暗色模式 - 平台顺序 */
:global(.dark-mode) .reset-btn,
:global(.dark-mode) .clear-cache-btn {
  background-color: #3a3a3a;
  border-color: #555;
  color: #999;
}

:global(.dark-mode) .reset-btn:hover,
:global(.dark-mode) .clear-cache-btn:hover {
  border-color: #007bff;
  color: #007bff;
  background-color: #2a3a4a;
}

:global(.dark-mode) .clear-cache-btn {
  border-color: #ff9800;
  color: #ff9800;
}

:global(.dark-mode) .clear-cache-btn:hover {
  border-color: #ffb74d;
  color: #ffb74d;
  background-color: #3a2a1a;
}

:global(.dark-mode) .platform-count {
  color: #999;
}

:global(.dark-mode) .platform-order-item {
  background-color: #3a3a3a;
  border-color: #555;
}

:global(.dark-mode) .platform-order-item:hover {
  background-color: #2a3a4a;
  border-color: #007bff;
}

:global(.dark-mode) .platform-order-item .platform-name {
  color: #e0e0e0;
}

:global(.dark-mode) .drag-handle,
:global(.dark-mode) .drag-indicator {
  color: #666;
}

:global(.dark-mode) .platform-index {
  background-color: #4a4a4a;
  color: #999;
}

:global(.dark-mode) .platform-order-list {
  scrollbar-color: #555 #3a3a3a;
}

:global(.dark-mode) .platform-order-list::-webkit-scrollbar-track {
  background: #3a3a3a;
}

:global(.dark-mode) .platform-order-list::-webkit-scrollbar-thumb {
  background-color: #555;
}

:global(.dark-mode) .platform-order-list::-webkit-scrollbar-thumb:hover {
  background-color: #777;
}

/* 空状态样式 */
.empty-platforms {
  padding: 32px 16px;
  text-align: center;
  color: #999;
}

.empty-platforms p {
  margin: 0 0 8px;
  font-size: 14px;
}

.empty-tip {
  font-size: 12px !important;
  color: #ccc !important;
}

:global(.dark-mode) .empty-platforms {
  color: #666;
}

:global(.dark-mode) .empty-tip {
  color: #555 !important;
}
</style>
