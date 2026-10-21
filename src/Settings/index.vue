<script setup>
import { onMounted, onUnmounted, computed, ref } from 'vue'
import { useSettingsStore } from '../stores/settingsStore.js'
import { PLATFORMS } from '../services/hotSearchApi.js'
import { FISH_WINDOW_SIZES, STORAGE_KEYS } from '../config.js'
import { getStorage } from '../utils/storage.js'
import { SITE_RULES } from '../utils/siteRules.js'
import PlatformIcon from '../components/PlatformIcon.vue'
import { ChevronDown, ChevronRight } from 'lucide-vue-next'

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

// 平台按分类分组（全部 58 个平台，显隐管理；顺序由侧栏"钉住"决定）
const CATEGORY_ORDER = ['资讯', '科技', '视频', '社交', '娱乐', '游戏', '生活', '阅读', '艺术', '金融', '综合']
const platformGroups = computed(() => {
  const groups = new Map()
  PLATFORMS.forEach(p => {
    const cat = p.category || '综合'
    if (!groups.has(cat)) groups.set(cat, [])
    groups.get(cat).push(p)
  })
  const names = [...groups.keys()].sort((a, b) => {
    const ia = CATEGORY_ORDER.indexOf(a)
    const ib = CATEGORY_ORDER.indexOf(b)
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
  })
  return names.map(name => ({ name, platforms: groups.get(name) }))
})

// 切换平台可见性
const handleToggleVisibility = (platformId) => {
  settingsStore.togglePlatformVisibility(platformId)
}

// 分组展开状态（会话态，默认全部收起，与侧栏交互一致）
const expandedGroups = ref(new Set())
const toggleGroup = (name) => {
  if (expandedGroups.value.has(name)) {
    expandedGroups.value.delete(name)
  } else {
    expandedGroups.value.add(name)
  }
}

// 分组内已隐藏平台数（收起时也能看到该分类有隐藏项）
const hiddenCountInGroup = (platforms) => {
  return platforms.filter(p => !settingsStore.isPlatformVisible(p.id)).length
}

// ========== 摸鱼小窗（P1：内置浏览器窗口参数） ==========
const fishWindow = computed(() => settingsStore.fishWindow)

const setFish = (key, value) => {
  settingsStore.setFishWindow({ [key]: value })
  // 切尺寸档位 = 抛弃旧位置记忆，按新档位生效
  if (key === 'size') {
    try { getStorage()?.removeItem(STORAGE_KEYS.FISH_WINDOW_POS) } catch (e) { /* 忽略 */ }
  }
}

// 滑块拖动只更新内存（滑块值实时回显），松手 change 时才落盘
const onOpacityInput = (e) => {
  settingsStore.setFishWindow({ opacity: Number(e.target.value) }, false)
}
const onOpacityCommit = (e) => {
  settingsStore.setFishWindow({ opacity: Number(e.target.value) })
}

// 已滑过部分用主色填充（0.5-1 映射到 0-100%）
const opacityTrack = computed(() => {
  const percent = Math.round(((fishWindow.value.opacity - 0.5) / 0.5) * 100)
  return {
    background: `linear-gradient(to right, var(--color-primary) ${percent}%, var(--color-surface-muted-hover) ${percent}%)`
  }
})

// mini 预览卡：按档位等比缩放（视觉示意，非精确像素）
const FISH_PREVIEW_SIZES = {
  compact: { w: 172, h: 124 },
  standard: { w: 196, h: 140 },
  wide: { w: 228, h: 147 }
}
const previewSize = computed(() => FISH_PREVIEW_SIZES[fishWindow.value.size] || FISH_PREVIEW_SIZES.standard)
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

          <div class="setting-item">
            <div class="setting-label">
              <span class="setting-name">显示缩略图</span>
              <span class="setting-desc">展示视频封面、文章配图、电影海报等（无图平台不受影响）</span>
            </div>
            <label class="toggle-switch">
              <input
                type="checkbox"
                :checked="settingsStore.showThumbnails"
                @change="settingsStore.toggleShowThumbnails"
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

        <!-- 摸鱼小窗（P1：内置浏览器窗口参数） -->
        <section class="settings-section">
          <h3>🪟 摸鱼小窗</h3>
          <p class="section-desc">热搜链接在内置浏览器小窗打开，不占用任务栏、不留浏览器历史</p>

          <div class="setting-item">
            <div class="setting-label">
              <span class="setting-name">打开方式</span>
              <span class="setting-desc">内置小窗摸鱼无痕，或交给系统浏览器</span>
            </div>
            <div class="theme-options">
              <button
                :class="['theme-btn', { active: fishWindow.openIn === 'ubrowser' }]"
                @click="setFish('openIn', 'ubrowser')"
              >
                🪟 内置小窗
              </button>
              <button
                :class="['theme-btn', { active: fishWindow.openIn === 'system' }]"
                @click="setFish('openIn', 'system')"
              >
                🌐 系统浏览器
              </button>
            </div>
          </div>

          <template v-if="fishWindow.openIn === 'ubrowser'">
            <!-- mini 预览卡：透明度/尺寸/置顶实时联动（所见即所得） -->
            <div class="fish-preview-stage">
              <div
                class="fish-preview-win"
                :style="{ width: previewSize.w + 'px', height: previewSize.h + 'px', opacity: fishWindow.opacity }"
              >
                <div class="fp-bar">
                  <span class="fp-dots"><i></i><i></i><i></i></span>
                  <span class="fp-title">🐟 {{ (FISH_WINDOW_SIZES[fishWindow.size] || {}).label || '标准' }}摸鱼小窗</span>
                  <span v-if="fishWindow.alwaysOnTop" class="fp-pin">置顶</span>
                </div>
                <div class="fp-body">
                  <span class="fp-row" style="width: 88%"></span>
                  <span class="fp-row" style="width: 62%"></span>
                  <span class="fp-row" style="width: 74%"></span>
                </div>
              </div>
              <span class="fish-preview-tip">实时预览 · 拖动透明度滑块、切换尺寸查看效果</span>
            </div>

            <div class="setting-item">
              <div class="setting-label">
                <span class="setting-name">窗口尺寸</span>
                <span class="setting-desc">下次打开链接时生效</span>
              </div>
              <div class="theme-options">
                <button
                  v-for="(preset, key) in FISH_WINDOW_SIZES"
                  :key="key"
                  :class="['theme-btn', { active: fishWindow.size === key }]"
                  @click="setFish('size', key)"
                >
                  {{ preset.label }}
                </button>
              </div>
            </div>

            <div class="setting-item setting-item-block">
              <div class="setting-label">
                <span class="setting-name">
                  窗口透明度
                  <span class="range-value mrs-tnum">{{ Math.round(fishWindow.opacity * 100) }}%</span>
                </span>
                <span class="setting-desc">数值越低越透，边看视频边干活（下次打开生效）</span>
              </div>
              <input
                type="range"
                class="setting-range"
                min="0.5"
                max="1"
                step="0.05"
                :value="fishWindow.opacity"
                :style="opacityTrack"
                @input="onOpacityInput"
                @change="onOpacityCommit"
              />
            </div>

            <div class="setting-item">
              <div class="setting-label">
                <span class="setting-name">窗口置顶</span>
                <span class="setting-desc">小窗始终显示在其他窗口上方</span>
              </div>
              <label class="toggle-switch">
                <input
                  type="checkbox"
                  :checked="fishWindow.alwaysOnTop"
                  @change="setFish('alwaysOnTop', $event.target.checked)"
                />
                <span class="toggle-slider"></span>
              </label>
            </div>

            <div class="setting-item">
              <div class="setting-label">
                <span class="setting-name">打开自动静音</span>
                <span class="setting-desc">小窗打开后自动静音视频/音频，防止摸鱼出声</span>
              </div>
              <label class="toggle-switch">
                <input
                  type="checkbox"
                  :checked="fishWindow.autoMute"
                  @change="setFish('autoMute', $event.target.checked)"
                />
                <span class="toggle-slider"></span>
              </label>
            </div>

            <div class="setting-item">
              <div class="setting-label">
                <span class="setting-name">记住窗口位置</span>
                <span class="setting-desc">记住上次位置和手动调整的大小；切换尺寸档位后重新生效</span>
              </div>
              <label class="toggle-switch">
                <input
                  type="checkbox"
                  :checked="fishWindow.rememberPosition"
                  @change="setFish('rememberPosition', $event.target.checked)"
                />
                <span class="toggle-slider"></span>
              </label>
            </div>

            <!-- 站点净化（M2）：小窗内注入沉浸阅读样式 -->
            <div class="setting-item">
              <div class="setting-label">
                <span class="setting-name">站点净化</span>
                <span class="setting-desc">打开文章类站点时自动隐藏侧栏推荐、加宽正文，沉浸阅读</span>
              </div>
              <label class="toggle-switch">
                <input
                  type="checkbox"
                  :checked="fishWindow.cleanMode"
                  @change="setFish('cleanMode', $event.target.checked)"
                />
                <span class="toggle-slider"></span>
              </label>
            </div>

            <details v-if="fishWindow.cleanMode" class="site-rules-details">
              <summary>已适配站点（{{ SITE_RULES.length }}）</summary>
              <div class="site-rules-list">
                <div v-for="rule in SITE_RULES" :key="rule.domain" class="site-rule-item">
                  <span class="site-rule-name">{{ rule.name }}</span>
                  <span class="site-rule-note">{{ rule.note }}</span>
                  <span
                    :class="['site-rule-badge', rule.verified ? 'ok' : 'todo']"
                    :title="rule.verified ? '选择器已实测命中' : '规则待真机复核，失效自动回到原样'"
                  >{{ rule.verified ? '已验证' : '适配中' }}</span>
                </div>
              </div>
              <p class="site-rules-hint">站点改版后规则可能失效，届时自动回到原始页面，不影响使用</p>
            </details>
          </template>
        </section>

        <!-- 平台显示管理（v4：顺序由侧栏钉住决定，此处只管显隐；分组默认收起） -->
        <section class="settings-section">
          <h3>平台显示</h3>
          <p class="section-desc">
            隐藏不常用的平台让侧栏更清爽；排序请用左侧栏的钉住按钮，常用平台会固定在最前
          </p>

          <div v-for="group in platformGroups" :key="group.name" class="platform-group">
            <button class="platform-group-label toggle" @click="toggleGroup(group.name)">
              <component :is="expandedGroups.has(group.name) ? ChevronDown : ChevronRight" :size="12" />
              {{ group.name }}
              <span class="platform-group-count">{{ group.platforms.length }}</span>
              <span
                v-if="hiddenCountInGroup(group.platforms) > 0"
                class="platform-group-hidden"
                :title="'该分类有 ' + hiddenCountInGroup(group.platforms) + ' 个已隐藏平台'"
              >已隐 {{ hiddenCountInGroup(group.platforms) }}</span>
            </button>
            <div v-if="expandedGroups.has(group.name)" class="platform-list">
              <button
                v-for="platform in group.platforms"
                :key="platform.id"
                :class="['platform-item', { 'hidden': !settingsStore.isPlatformVisible(platform.id) }]"
                @click="handleToggleVisibility(platform.id)"
                :title="settingsStore.isPlatformVisible(platform.id) ? '点击隐藏此平台' : '点击显示此平台'"
              >
                <PlatformIcon :icon="platform.icon" :size="18" />
                <span class="platform-item-name">{{ platform.name }}</span>
                <span class="visibility-mark" :class="{ hidden: !settingsStore.isPlatformVisible(platform.id) }">
                  {{ settingsStore.isPlatformVisible(platform.id) ? '👁️' : '🚫' }}
                </span>
              </button>
            </div>
          </div>
        </section>

        <!-- 键盘快捷键 -->
        <section class="settings-section">
          <h3>⌨️ 键盘快捷键</h3>

          <div class="keyboard-shortcuts-list">
            <div class="shortcut-item">
              <div class="shortcut-desc">
                <span class="shortcut-name">切换平台</span>
                <span class="shortcut-detail">上一个/下一个平台</span>
              </div>
              <div class="shortcut-keys"><kbd>←</kbd><kbd>→</kbd></div>
            </div>
            <div class="shortcut-item">
              <div class="shortcut-desc">
                <span class="shortcut-name">选择热搜</span>
                <span class="shortcut-detail">上一条/下一条 · 翻页</span>
              </div>
              <div class="shortcut-keys"><kbd>↑</kbd><kbd>↓</kbd><kbd>PageUp</kbd><kbd>PageDown</kbd></div>
            </div>
            <div class="shortcut-item">
              <div class="shortcut-desc">
                <span class="shortcut-name">快速跳转</span>
                <span class="shortcut-detail">选中第 1-9 条热搜</span>
              </div>
              <div class="shortcut-keys"><kbd>1</kbd> - <kbd>9</kbd></div>
            </div>
            <div class="shortcut-item">
              <div class="shortcut-desc">
                <span class="shortcut-name">复制 / 收藏</span>
                <span class="shortcut-detail">复制选中标题 / 收藏选中条目</span>
              </div>
              <div class="shortcut-keys"><kbd>c</kbd><kbd>f</kbd></div>
            </div>
            <div class="shortcut-item">
              <div class="shortcut-desc">
                <span class="shortcut-name">打开链接</span>
                <span class="shortcut-detail">内置浏览器打开选中热搜</span>
              </div>
              <div class="shortcut-keys"><kbd>Enter</kbd></div>
            </div>
            <div class="shortcut-item">
              <div class="shortcut-desc">
                <span class="shortcut-name">老板键</span>
                <span class="shortcut-detail">隐藏/恢复所有摸鱼小窗与主窗口（任何界面可用，也可在 uTools 中绑定全局快捷键）</span>
              </div>
              <div class="shortcut-keys"><kbd>Ctrl</kbd>+<kbd>`</kbd></div>
            </div>
            <div class="shortcut-item">
              <div class="shortcut-desc">
                <span class="shortcut-name">退出</span>
                <span class="shortcut-detail">关闭弹层 / 退出插件</span>
              </div>
              <div class="shortcut-keys"><kbd>Esc</kbd></div>
            </div>
            <div class="shortcut-item">
              <div class="shortcut-desc">
                <span class="shortcut-name">刷新 / 翻译</span>
                <span class="shortcut-detail">刷新当前平台（翻译仅艺术类平台）</span>
              </div>
              <div class="shortcut-keys"><kbd>F5</kbd><kbd>Ctrl</kbd>+<kbd>R</kbd> / <kbd>Ctrl</kbd>+<kbd>T</kbd></div>
            </div>
          </div>

          <p class="section-hint">💡 输入框聚焦时快捷键不会触发</p>
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

        <!-- API 信息（默认折叠） -->
        <section class="settings-section">
          <details class="api-details">
            <summary>📡 数据来源 & 免责声明</summary>
            <div class="api-info-list">
              <div class="api-info-item">
                <div class="api-info-header">
                  <span class="api-name">热搜数据</span>
                  <span class="api-tag primary">三级回退</span>
                </div>
                <div class="api-info-details">
                  <p><strong>本地服务：</strong>插件内置 DailyHotApi（56 源，默认）</p>
                  <p><strong>远程备用：</strong><code>uapis.cn</code> → <code>api-hot.imsyy.com</code></p>
                  <p><strong>支持平台：</strong>58 个平台，覆盖资讯/科技/视频/游戏/金融等</p>
                </div>
              </div>
              <div class="api-info-item">
                <div class="api-info-header">
                  <span class="api-name">专用 API</span>
                  <span class="api-tag info">直连官方</span>
                </div>
                <div class="api-info-details">
                  <p>• 艺术品：芝加哥艺术学院 / 大都会博物馆（仅公有领域）</p>
                  <p>• 开发者：GitHub Trending（官方 API）/ Hacker News</p>
                  <p>• 股票：腾讯实时行情（仅供参考，不构成投资建议）</p>
                </div>
              </div>
              <div class="api-disclaimer">
                <p><strong>⚠️ 免责声明：</strong>本应用仅作为数据展示工具，所有数据版权归原平台所有；热搜数据实时聚合自各公开平台，可能存在延迟或差异。</p>
              </div>
            </div>
          </details>
        </section>

        <!-- 关于 -->
        <section class="settings-section">
          <h3>关于</h3>
          <div class="about-info">
            <p><strong>摸鱼热搜</strong> v2.1.0</p>
            <p>一个简洁高效的热搜聚合插件 · 58 平台 · 内置数据服务</p>
            <p>支持 AI 智能翻译（Ctrl+T，艺术与开发者平台）</p>
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
  background-color: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
}

.settings-modal {
  width: 600px;
  max-width: 94vw;
  max-height: 86vh;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 12px;
  border-bottom: 1px solid var(--color-border-light);
  flex-shrink: 0;
}

.settings-header h2 {
  font-size: var(--font-lg);
  font-weight: 600;
  color: var(--color-text);
}

.close-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--color-surface-muted);
  color: var(--color-text-2);
  font-size: var(--font-lg);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.close-btn:hover {
  background: var(--color-surface-muted-hover);
  color: var(--color-text);
}

.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

/* 滚动条：统一走 main.css 全局令牌化样式 */

.settings-section {
  margin-bottom: 24px;
}

.settings-section h3 {
  font-size: var(--font-base);
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 12px;
}

.section-desc {
  font-size: var(--font-sm);
  color: var(--color-text-muted);
  margin-bottom: 12px;
  line-height: 1.6;
}

.section-hint {
  font-size: var(--font-sm);
  color: var(--color-text-muted);
  margin-top: 10px;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
}

.setting-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.setting-name {
  font-size: var(--font-base);
  color: var(--color-text);
}

.setting-desc {
  font-size: var(--font-sm);
  color: var(--color-text-muted);
}

/* 开关 */
.toggle-switch {
  position: relative;
  width: 42px;
  height: 24px;
  flex-shrink: 0;
  cursor: pointer;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  inset: 0;
  background: var(--color-surface-muted-hover);
  border-radius: var(--radius-pill);
  transition: background 0.2s;
}

.toggle-slider::before {
  content: "";
  position: absolute;
  width: 18px;
  height: 18px;
  left: 3px;
  top: 3px;
  background: #ffffff;
  border-radius: 50%;
  transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
}

.toggle-switch input:checked + .toggle-slider {
  background: var(--color-primary);
}

.toggle-switch input:checked + .toggle-slider::before {
  transform: translateX(18px);
}

/* 主题按钮 */
.theme-options {
  display: flex;
  gap: 8px;
}

.theme-btn {
  padding: 6px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-2);
  font-size: var(--font-sm);
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.theme-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.theme-btn.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #ffffff;
}

/* 摸鱼小窗：透明度滑块（整行堆叠，滑轨已滑过部分用主色填充） */
.setting-item-block {
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
}

.range-value {
  margin-left: 6px;
  font-size: var(--font-sm);
  font-weight: 600;
  color: var(--color-primary);
}

.setting-range {
  width: 100%;
  height: 4px;
  appearance: none;
  -webkit-appearance: none;
  border-radius: var(--radius-pill);
  outline: none;
  cursor: pointer;
}

.setting-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--color-primary);
  border: 2px solid #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
  cursor: pointer;
}

.setting-range::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--color-primary);
  border: 2px solid #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
  cursor: pointer;
}

/* mini 预览卡：仿真桌面网格垫底，小窗透明度/尺寸/置顶实时联动 */
.fish-preview-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 10px 10px;
  margin-bottom: 8px;
  border-radius: var(--radius-md);
  border: 1px dashed var(--color-border);
  background:
    repeating-linear-gradient(0deg, transparent 0 11px, var(--color-border) 11px 12px),
    repeating-linear-gradient(90deg, transparent 0 11px, var(--color-border) 11px 12px),
    var(--color-surface-muted);
  overflow: hidden;
}

.fish-preview-win {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-btn);
  display: flex;
  flex-direction: column;
  transition: width 0.2s, height 0.2s, opacity 0.15s;
  overflow: hidden;
}

.fp-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  border-bottom: 1px solid var(--color-border-light);
  background: var(--color-surface-muted);
  font-size: var(--font-xs);
  color: var(--color-text-2);
  flex: none;
}

.fp-dots {
  display: inline-flex;
  gap: 3px;
}

.fp-dots i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-border);
}

.fp-title {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fp-pin {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: var(--radius-pill);
  background: var(--color-primary);
  color: #ffffff;
}

.fp-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 10px;
  justify-content: center;
}

.fp-row {
  height: 7px;
  border-radius: 4px;
  background: var(--color-surface-muted-hover);
}

.fish-preview-tip {
  font-size: var(--font-xs);
  color: var(--color-text-muted);
}

/* 站点净化清单（M2） */
.site-rules-details {
  margin-top: 4px;
}

.site-rules-details summary {
  font-size: var(--font-sm);
  color: var(--color-text-2);
  cursor: pointer;
  padding: 6px 0;
  user-select: none;
}

.site-rules-details summary:hover {
  color: var(--color-primary);
}

.site-rules-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 6px;
}

.site-rule-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: var(--radius-sm);
  background: var(--color-surface-muted);
  font-size: var(--font-sm);
}

.site-rule-name {
  font-weight: 500;
  color: var(--color-text);
  flex: none;
}

.site-rule-note {
  flex: 1;
  min-width: 0;
  font-size: var(--font-xs);
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.site-rule-badge {
  flex: none;
  font-size: var(--font-xs);
  padding: 1px 8px;
  border-radius: var(--radius-pill);
}

.site-rule-badge.ok {
  background: var(--color-success, #00b578);
  color: #ffffff;
}

.site-rule-badge.todo {
  background: var(--color-surface-muted-hover);
  color: var(--color-text-muted);
}

.site-rules-hint {
  margin-top: 8px;
  font-size: var(--font-xs);
  color: var(--color-text-muted);
}

/* 平台显示管理（分组可展开/收起，默认收起） */
.platform-group {
  margin-bottom: 6px;
}

.platform-group-label {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 7px 6px;
  border: none;
  background: none;
  font-size: var(--font-xs);
  color: var(--color-text-muted);
  letter-spacing: 0.05em;
  cursor: pointer;
  font-family: inherit;
  border-radius: var(--radius-sm);
}

.platform-group-label:hover {
  background: var(--color-surface-muted);
  color: var(--color-text-2);
}

.platform-group-count {
  font-size: var(--font-xs);
  color: var(--color-text-muted);
  letter-spacing: 0;
}

.platform-group-hidden {
  margin-left: auto;
  font-size: var(--font-xs);
  color: var(--color-hot);
  letter-spacing: 0;
}

.platform-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(158px, 1fr));
  gap: 6px;
}

.platform-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}

.platform-item:hover {
  border-color: var(--color-primary);
}

.platform-item.hidden {
  opacity: 0.45;
}

.platform-item-name {
  flex: 1;
  min-width: 0;
  font-size: var(--font-sm);
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: left;
}

.visibility-mark {
  font-size: var(--font-sm);
  flex-shrink: 0;
}

/* 快捷键 */
.keyboard-shortcuts-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.shortcut-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  background: var(--color-surface-muted);
}

.shortcut-desc {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.shortcut-name {
  font-size: var(--font-sm);
  color: var(--color-text);
  font-weight: 500;
}

.shortcut-detail {
  font-size: var(--font-xs);
  color: var(--color-text-muted);
}

.shortcut-keys {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--font-xs);
  color: var(--color-text-muted);
}

kbd {
  padding: 2px 7px;
  border-radius: 5px;
  border: 1px solid var(--color-border);
  border-bottom-width: 2px;
  background: var(--color-surface);
  color: var(--color-text-2);
  font-size: var(--font-xs);
  font-family: inherit;
}

/* 其他 */
.action-btn {
  padding: 8px 18px;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--color-btn-primary);
  color: #ffffff;
  font-size: var(--font-sm);
  cursor: pointer;
  font-family: inherit;
  transition: background 0.2s;
}

.action-btn:hover {
  background: var(--color-btn-primary-hover);
}

/* API 信息（折叠） */
.api-details summary {
  font-size: var(--font-base);
  font-weight: 600;
  color: var(--color-text);
  cursor: pointer;
  padding: 4px 0;
  user-select: none;
}

.api-details summary:hover {
  color: var(--color-primary);
}

.api-info-list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.api-info-item {
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: var(--color-surface-muted);
}

.api-info-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.api-name {
  font-size: var(--font-sm);
  font-weight: 600;
  color: var(--color-text);
}

.api-tag {
  font-size: var(--font-xs);
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  background: var(--color-primary);
  color: #fff;
}

.api-tag.info {
  background: var(--color-info);
}

.api-info-details p {
  font-size: var(--font-sm);
  color: var(--color-text-3);
  line-height: 1.7;
}

.api-info-details code {
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--color-surface-muted-hover);
  font-size: var(--font-xs);
}

.api-info-details a {
  color: var(--color-primary);
}

.api-disclaimer {
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: var(--color-surface-muted);
  font-size: var(--font-sm);
  color: var(--color-text-muted);
  line-height: 1.7;
}

/* 关于 */
.about-info {
  padding: 12px;
  border-radius: var(--radius-sm);
  background: var(--color-surface-muted);
}

.about-info p {
  font-size: var(--font-sm);
  color: var(--color-text-3);
  line-height: 1.8;
}
</style>
