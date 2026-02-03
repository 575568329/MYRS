<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useSettingsStore } from '../stores/settingsStore.js'
import { PLATFORMS } from '../services/hotSearchApi.js'
import { DISPLAY_MODE } from '../config.js'
import PlatformIcon from '../components/PlatformIcon.vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

const settingsStore = useSettingsStore()

// 组件挂载时加载设置
onMounted(() => {
  settingsStore.loadSettings()
})

// 组件卸载时清理
onUnmounted(() => {
  settingsStore.cleanup()
})

// 关闭设置
const handleClose = () => {
  emit('close')
}

// 重置为默认设置
const handleReset = () => {
  if (confirm('确定要重置为默认设置吗？')) {
    settingsStore.resetToDefaults()
  }
}

// 开始拖拽
const handleDragStart = (item, index) => {
  settingsStore.startDrag(item, index)
}

// 放置
const handleDrop = (index) => {
  settingsStore.onDrop(index)
}

// 拖拽结束
const handleDragEnd = () => {
  // Pinia store 的 onDrop 中已经清理了状态，这里不需要重复清理
}

// 切换平台可见性
const handleToggleVisibility = (platformId, event) => {
  // 阻止事件冒泡，避免触发拖拽
  event.stopPropagation()
  settingsStore.togglePlatformVisibility(platformId)
}
</script>

<template>
  <div v-if="props.show" class="settings-modal-overlay" @click="handleClose">
    <div class="settings-modal" @click.stop>
      <div class="settings-header">
        <h2>⚙️ 设置</h2>
        <button class="close-btn" @click="handleClose">×</button>
      </div>

      <div class="settings-content">
        <!-- 显示设置 -->
        <section class="settings-section">
          <h3>显示选项</h3>

          <div class="setting-item">
            <div class="setting-label">
              <span class="setting-name">显示热度值</span>
              <span class="setting-desc">在热搜列表中显示热度或排名</span>
            </div>
            <label class="toggle-switch">
              <input
                type="checkbox"
                :checked="settingsStore.showHotValue"
                @change="settingsStore.toggleShowHotValue"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="setting-item">
            <div class="setting-label">
              <span class="setting-name">显示描述</span>
              <span class="setting-desc">显示热搜内容简介或详情</span>
            </div>
            <label class="toggle-switch">
              <input
                type="checkbox"
                :checked="settingsStore.showDescription"
                @change="settingsStore.toggleShowDescription"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </section>

        <!-- 主题设置 -->
        <section class="settings-section">
          <h3>主题</h3>

          <div class="setting-item">
            <div class="setting-label">
              <span class="setting-name">主题模式</span>
            </div>
            <div class="theme-options">
              <button
                :class="['theme-btn', { active: settingsStore.themeMode === 'auto' }]"
                @click="settingsStore.setThemeMode('auto')"
              >
                🌓 自动
              </button>
              <button
                :class="['theme-btn', { active: settingsStore.themeMode === 'light' }]"
                @click="settingsStore.setThemeMode('light')"
              >
                ☀️ 亮色
              </button>
              <button
                :class="['theme-btn', { active: settingsStore.themeMode === 'dark' }]"
                @click="settingsStore.setThemeMode('dark')"
              >
                🌙 暗色
              </button>
            </div>
          </div>
        </section>

        <!-- 平台顺序设置 -->
        <section class="settings-section">
          <h3>平台顺序</h3>
          <p class="section-desc">拖拽调整平台显示顺序</p>

          <div class="platform-list">
            <div
              v-for="(platform, index) in settingsStore.customPlatformOrder"
              :key="platform.id"
              :class="['platform-item', {
                'dragging': settingsStore.draggedIndex === index,
                'hidden': !settingsStore.isPlatformVisible(platform.id)
              }]"
              draggable="true"
              @dragstart="handleDragStart(platform, index)"
              @dragover.prevent
              @drop="handleDrop(index)"
              @dragend="handleDragEnd"
            >
              <div class="platform-item-handle">⋮⋮</div>
              <PlatformIcon :icon="platform.icon" :size="20" />
              <span class="platform-item-name">{{ platform.name }}</span>
              <button
                class="visibility-toggle"
                :class="{ hidden: !settingsStore.isPlatformVisible(platform.id) }"
                @click="handleToggleVisibility(platform.id, $event)"
                :title="settingsStore.isPlatformVisible(platform.id) ? '隐藏此平台' : '显示此平台'"
              >
                {{ settingsStore.isPlatformVisible(platform.id) ? '👁️' : '👁️‍🗨️' }}
              </button>
            </div>
          </div>
        </section>

        <!-- 其他操作 -->
        <section class="settings-section">
          <h3>其他</h3>

          <div class="setting-item">
            <button class="action-btn reset-btn" @click="handleReset">
              🔄 重置为默认设置
            </button>
          </div>
        </section>

        <!-- API 信息 & 版权 -->
        <section class="settings-section">
          <h3>📡 数据来源 & API 信息</h3>

          <div class="api-info-list">
            <!-- 主要热搜 API -->
            <div class="api-info-item">
              <div class="api-info-header">
                <span class="api-name">热搜聚合 API</span>
                <span class="api-tag primary">主要</span>
              </div>
              <div class="api-info-details">
                <p><strong>API 地址：</strong><code>https://uapis.cn/api/v1/misc/hotboard</code></p>
                <p><strong>备用 API：</strong><code>https://api-hot.imsyy.com</code></p>
                <p><strong>支持平台：</strong>微博、知乎、抖音、B站、百度、今日头条等 40+ 个平台</p>
                <p><strong>数据说明：</strong>实时聚合各平台热搜数据，仅用于展示</p>
              </div>
            </div>

            <!-- 芝加哥艺术学院 API -->
            <div class="api-info-item highlight">
              <div class="api-info-header">
                <span class="api-name">芝加哥艺术学院 API</span>
                <span class="api-tag success">公有领域</span>
              </div>
              <div class="api-info-details">
                <p><strong>API 地址：</strong><code>https://api.artic.edu/api/v1/artworks</code></p>
                <p><strong>官网文档：</strong><a href="https://api.artic.edu/docs/" target="_blank">https://api.artic.edu/docs/</a></p>
                <p><strong>版权说明：</strong>仅展示公有领域（Public Domain）艺术品，可免费使用</p>
                <p><strong>筛选条件：</strong><code>is_public_domain: true</code></p>
                <p class="api-note">ℹ️ 根据 API 官方文档建议，我们只使用标注为公有领域的艺术作品图片，避免版权问题</p>
              </div>
            </div>

            <!-- 免责声明 -->
            <div class="api-disclaimer">
              <p><strong>⚠️ 免责声明：</strong></p>
              <ul>
                <li>本应用仅作为数据展示工具，所有数据版权归原平台所有</li>
                <li>热搜数据实时抓取自各公开平台，可能存在延迟或差异</li>
                <li>芝加哥艺术学院艺术品均为公有领域作品，可自由使用</li>
                <li>如有任何版权问题，请联系原平台或 API 提供商</li>
              </ul>
            </div>
          </div>
        </section>

        <!-- 关于 -->
        <section class="settings-section">
          <h3>关于</h3>
          <div class="about-info">
            <p><strong>摸鱼热搜</strong> v1.0.0</p>
            <p>一个简洁高效的热搜聚合插件</p>
            <p>支持 40+ 热搜平台，包括艺术品展示</p>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.settings-modal {
  background: #ffffff;
  border-radius: 16px;
  width: 90%;
  max-width: 600px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e0e0e0;
}

.settings-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: #f5f5f5;
  border-radius: 50%;
  cursor: pointer;
  font-size: 18px;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #e8e8e8;
  color: #333;
}

.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.settings-content::-webkit-scrollbar {
  width: 6px;
}

.settings-content::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 3px;
}

.settings-section {
  margin-bottom: 28px;
}

.settings-section:last-child {
  margin-bottom: 0;
}

.settings-section h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.section-desc {
  margin: 0 0 12px 0;
  font-size: 13px;
  color: #999;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0;
  border-bottom: 1px solid #f0f0f0;
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-label {
  flex: 1;
}

.setting-name {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.setting-desc {
  display: block;
  font-size: 12px;
  color: #999;
}

/* 开关组件 */
.toggle-switch {
  position: relative;
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
  background: #ccc;
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
  background: white;
  transition: 0.3s;
  border-radius: 50%;
}

.toggle-switch input:checked + .toggle-slider {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.toggle-switch input:checked + .toggle-slider:before {
  transform: translateX(22px);
}

/* 主题选项 */
.theme-options {
  display: flex;
  gap: 8px;
}

.theme-btn {
  padding: 8px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #f5f5f5;
  color: #666;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.theme-btn:hover {
  background: #e8e8e8;
}

.theme-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #ffffff;
  border-color: transparent;
}

/* 平台列表 */
.platform-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.platform-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #f8f9fa;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  cursor: move;
  transition: all 0.2s;
}

.platform-item:hover {
  background: #f0f1f2;
  border-color: #667eea;
}

.platform-item.dragging {
  opacity: 0.5;
  transform: scale(0.98);
}

.platform-item-handle {
  color: #ccc;
  font-size: 16px;
  cursor: grab;
  user-select: none;
}

.platform-item-name {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

/* 平台可见性切换按钮 */
.visibility-toggle {
  padding: 4px 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 16px;
  opacity: 0.7;
  transition: all 0.2s;
  border-radius: 4px;
}

.visibility-toggle:hover {
  opacity: 1;
  background: rgba(0, 0, 0, 0.05);
}

.visibility-toggle.hidden {
  opacity: 0.5;
}

/* 隐藏的平台项 */
.platform-item.hidden {
  opacity: 0.5;
  background: #fafafa;
}

.platform-item.hidden .platform-item-name {
  text-decoration: line-through;
  color: #999;
}

/* 操作按钮 */
.action-btn {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.reset-btn {
  background: #f5f5f5;
  color: #666;
  border: 1px solid #e0e0e0;
}

.reset-btn:hover {
  background: #ffe8e8;
  color: #ff6b6b;
  border-color: #ff6b6b;
}

/* 关于信息 */
.about-info {
  padding: 16px;
  background: #f8f9fa;
  border-radius: 10px;
}

.about-info p {
  margin: 0 0 8px 0;
  font-size: 13px;
  color: #666;
}

.about-info p:last-child {
  margin-bottom: 0;
}

.about-info strong {
  color: #333;
  font-size: 15px;
}

/* 暗色模式 */
:global(.dark-mode) .settings-modal {
  background: #2c2c2c;
}

:global(.dark-mode) .settings-header {
  border-color: #444;
}

:global(.dark-mode) .settings-header h2 {
  color: #e0e0e0;
}

:global(.dark-mode) .settings-section h3 {
  color: #e0e0e0;
}

:global(.dark-mode) .setting-name {
  color: #e0e0e0;
}

:global(.dark-mode) .close-btn {
  background: #3a3a3a;
  color: #a0a0a0;
}

:global(.dark-mode) .close-btn:hover {
  background: #4a4a4a;
}

:global(.dark-mode) .setting-item {
  border-color: #3a3a3a;
}

:global(.dark-mode) .platform-item,
:global(.dark-mode) .about-info {
  background: #3a3a3a;
  border-color: #444;
}

:global(.dark-mode) .platform-item-name {
  color: #e0e0e0;
}

:global(.dark-mode) .visibility-toggle:hover {
  background: rgba(255, 255, 255, 0.1);
}

:global(.dark-mode) .platform-item.hidden {
  opacity: 0.5;
  background: #2a2a2a;
}

:global(.dark-mode) .platform-item.hidden .platform-item-name {
  color: #666;
}

:global(.dark-mode) .about-info p {
  color: #a0a0a0;
}

:global(.dark-mode) .about-info strong {
  color: #e0e0e0;
}

:global(.dark-mode) .theme-btn,
:global(.dark-mode) .reset-btn {
  background: #3a3a3a;
  border-color: #555;
  color: #e0e0e0;
}

:global(.dark-mode) .theme-btn:hover {
  background: #4a4a4a;
}

:global(.dark-mode) .toggle-slider {
  background: #555;
}

/* API 信息样式 */
.api-info-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.api-info-item {
  padding: 16px;
  background-color: #f9f9f9;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  transition: all 0.2s;
}

.api-info-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.api-info-item.highlight {
  background: #f0f8ff;
  border-color: #007bff;
  border-left-width: 4px;
}

.api-info-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.api-name {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.api-tag {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.api-tag.primary {
  background-color: #007bff;
  color: #ffffff;
}

.api-tag.success {
  background-color: #28a745;
  color: #ffffff;
}

.api-info-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.api-info-details p {
  margin: 0;
  font-size: 13px;
  color: #555;
  line-height: 1.6;
}

.api-info-details code {
  padding: 2px 6px;
  background-color: #f0f0f0;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  color: #d63384;
}

.api-info-details a {
  color: #007bff;
  text-decoration: none;
}

.api-info-details a:hover {
  text-decoration: underline;
}

.api-note {
  padding: 8px 12px;
  background-color: #fff3cd;
  border-left: 3px solid #ffc107;
  border-radius: 4px;
  font-size: 12px !important;
  color: #856404 !important;
}

.api-disclaimer {
  padding: 16px;
  background-color: #fff5f5;
  border: 1px solid #fed7d7;
  border-radius: 8px;
}

.api-disclaimer p {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #c53030;
  font-weight: 600;
}

.api-disclaimer ul {
  margin: 0;
  padding-left: 20px;
  list-style-type: disc;
}

.api-disclaimer li {
  margin-bottom: 8px;
  font-size: 13px;
  color: #555;
  line-height: 1.6;
}

.api-disclaimer li:last-child {
  margin-bottom: 0;
}

/* 暗色模式 - API 信息 */
:global(.dark-mode) .api-info-item {
  background-color: #2a2a2a;
  border-color: #444;
}

:global(.dark-mode) .api-info-item.highlight {
  background: #1a3a5a;
  border-color: #007bff;
}

:global(.dark-mode) .api-name {
  color: #e0e0e0;
}

:global(.dark-mode) .api-info-details p {
  color: #b0b0b0;
}

:global(.dark-mode) .api-info-details code {
  background-color: #1a1a1a;
  color: #ff6b9d;
}

:global(.dark-mode) .api-info-details a {
  color: #4dabf7;
}

:global(.dark-mode) .api-note {
  background-color: #3a3a1a;
  border-left-color: #ffc107;
  color: #ffd54f !important;
}

:global(.dark-mode) .api-disclaimer {
  background-color: #3a1a1a;
  border-color: #5c2b2b;
}

:global(.dark-mode) .api-disclaimer p {
  color: #fc8181;
}

:global(.dark-mode) .api-disclaimer li {
  color: #b0b0b0;
}
</style>
