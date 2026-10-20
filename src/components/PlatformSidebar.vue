<template>
  <aside class="sidebar">
    <div class="sidebar-brand">
      <span class="brand-logo"><Flame :size="13" color="#ffffff" /></span>
      <span class="brand-name">摸鱼热搜</span>
    </div>

    <nav class="sidebar-nav">
      <!-- 快捷入口 -->
      <button
        class="side-item quick"
        :class="{ on: currentView === 'home' }"
        @click="$emit('select', 'home')"
      >
        <LayoutDashboard class="side-ico" :size="14" />
        <span>我的热榜</span>
      </button>
      <button
        class="side-item quick"
        :class="{ on: currentView === 'favorites' }"
        @click="$emit('select', 'favorites')"
        title="P1 版本开放"
      >
        <Star class="side-ico" :size="14" />
        <span>我的收藏</span>
        <span v-if="favoriteCount > 0" class="side-count mrs-tnum">{{ favoriteCount }}</span>
      </button>

      <!-- 钉住组 -->
      <div v-if="pinnedPlatforms.length > 0" class="side-group-label">
        <Pin class="side-ico" :size="12" />我的钉住
      </div>
      <template v-for="p in pinnedPlatforms" :key="'pin-' + p.id">
        <button
          class="side-item"
          :class="{ on: currentView === p.id }"
          @click="$emit('select', p.id)"
        >
          <span class="side-dot" :style="{ background: dotColor(p.category) }"></span>
          <span class="side-name">{{ p.name }}</span>
          <span
            class="pin-btn pinned"
            role="button"
            tabindex="-1"
            title="取消钉住（常用区将移除，分类里仍可找到）"
            aria-label="取消钉住"
            @click.stop="$emit('pin-toggle', p.id)"
          >
            <Pin :size="14" />
          </span>
        </button>
      </template>

      <!-- 分类折叠组（平台永远留在分类原位，不因浏览/钉住而消失） -->
      <template v-for="group in categoryGroups" :key="group.name">
        <button class="side-group-label toggle" @click="settingsStore.toggleGroupCollapse(group.name)">
          <component :is="group.collapsed ? ChevronRight : ChevronDown" class="side-ico" :size="12" />
          {{ group.name }}
          <span class="side-count mrs-tnum">{{ group.platforms.length }}</span>
        </button>
        <template v-if="!group.collapsed">
          <button
            v-for="p in group.platforms"
            :key="group.name + '-' + p.id"
            class="side-item"
            :class="{ on: currentView === p.id }"
            @click="$emit('select', p.id)"
          >
            <span class="side-dot" :style="{ background: dotColor(p.category) }"></span>
            <span class="side-name">{{ p.name }}</span>
            <span
              class="pin-btn"
              :class="{ pinned: settingsStore.isPinned(p.id) }"
              role="button"
              tabindex="-1"
              title="钉住：固定到侧栏最前，并加入聚合首页"
              aria-label="钉住平台"
              @click.stop="$emit('pin-toggle', p.id)"
            >
              <Pin :size="14" />
            </span>
          </button>
        </template>
      </template>
    </nav>

    <!-- 底部操作 -->
    <div class="sidebar-foot">
      <button
        v-if="showTranslate"
        class="foot-btn"
        :class="{ active: translating }"
        :disabled="translating"
        :title="translateTip"
        @click="$emit('translate')"
      >
        <Languages class="side-ico" :size="13" />
        <span>翻译</span>
        <span v-if="translateProgress" class="side-count mrs-tnum">{{ translateProgress }}</span>
      </button>
      <button class="foot-btn" :disabled="loading" title="刷新数据" @click="$emit('refresh')">
        <RefreshCw class="side-ico" :size="13" :class="{ spinning: loading }" />
        <span>刷新</span>
      </button>
      <button class="foot-btn" title="设置" @click="$emit('settings')">
        <Settings2 class="side-ico" :size="13" />
        <span>设置</span>
      </button>
      <button class="foot-btn" title="打赏" @click="$emit('donate')">
        <Heart class="side-ico heart" :size="13" />
      </button>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { PLATFORMS } from '../services/hotSearchApi.js'
import { useSettingsStore } from '../stores/settingsStore.js'
import {
  LayoutDashboard, Star, Pin, ChevronDown, ChevronRight,
  Languages, RefreshCw, Settings2, Heart, Flame
} from 'lucide-vue-next'

const props = defineProps({
  currentView: { type: String, required: true }, // 'home' | 'favorites' | platformId
  favoriteCount: { type: Number, default: 0 },
  showTranslate: { type: Boolean, default: false },
  translating: { type: Boolean, default: false },
  translateTip: { type: String, default: '翻译' },
  translateProgress: { type: String, default: '' },
  loading: { type: Boolean, default: false }
})

defineEmits(['select', 'pin-toggle', 'translate', 'refresh', 'settings', 'donate'])

const settingsStore = useSettingsStore()

// 分类显示顺序：常用在前，未列出的追加在后
const CATEGORY_ORDER = ['资讯', '科技', '视频', '社交', '娱乐', '游戏', '生活', '阅读', '艺术', '金融', '综合']

const visiblePlatforms = computed(() =>
  PLATFORMS.filter(p => !settingsStore.hiddenPlatforms.has(p.id))
)

const byId = id => PLATFORMS.find(p => p.id === id)

const pinnedPlatforms = computed(() =>
  settingsStore.pinnedPlatforms.map(byId).filter(Boolean)
)

const categoryGroups = computed(() => {
  const groups = new Map()
  // 已钉住的平台仍保留在分类组中（钉住 = 额外置顶展示，原位不消失）
  visiblePlatforms.value.forEach(p => {
    if (!groups.has(p.category)) groups.set(p.category, [])
    groups.get(p.category).push(p)
  })
  const names = [...groups.keys()].sort((a, b) => {
    const ia = CATEGORY_ORDER.indexOf(a)
    const ib = CATEGORY_ORDER.indexOf(b)
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
  })
  return names.map(name => ({
    name,
    platforms: groups.get(name),
    collapsed: settingsStore.collapsedGroups.has(name)
  }))
})

// 分类点颜色（稳定哈希到暖橙系+蓝绿辅助色）
const DOT_PALETTE = ['#ff6b35', '#0084ff', '#fb7299', '#2932e1', '#00b578', '#ff9f1c', '#9254de', '#e91e4c', '#0ea5e9', '#d48806']
function dotColor(category) {
  let h = 0
  for (const c of String(category || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return DOT_PALETTE[h % DOT_PALETTE.length]
}
</script>

<style scoped>
.sidebar {
  width: 188px;
  flex: none;
  border-right: 1px solid var(--color-border-light);
  background-color: var(--color-bg);
  display: flex;
  flex-direction: column;
  height: 100%;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 14px 10px;
  font-weight: 600;
  font-size: var(--font-lg);
  color: var(--color-text);
}

.brand-logo {
  width: 22px;
  height: 22px;
  border-radius: 7px;
  background: var(--gradient-brand);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
}

.brand-name {
  letter-spacing: 0.02em;
}

.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px 10px;
}

.side-group-label {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  font-size: var(--font-xs);
  color: var(--color-text-muted);
  padding: 12px 8px 5px;
  letter-spacing: 0.05em;
  background: none;
  border: none;
  cursor: default;
}

.side-group-label.toggle {
  cursor: pointer;
}

.side-group-label.toggle:hover {
  color: var(--color-text-2);
}

.side-count {
  margin-left: auto;
  font-size: var(--font-xs);
  color: var(--color-text-muted);
  letter-spacing: 0;
}

.side-item {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 7px 9px;
  border: none;
  background: none;
  border-radius: var(--radius-sm);
  font-size: var(--font-base);
  color: var(--color-text-2);
  text-align: left;
  cursor: pointer;
  position: relative;
  transition: background 0.15s, color 0.15s;
  font-family: inherit;
}

.side-item:hover {
  background: var(--color-surface-muted-hover);
  color: var(--color-text);
}

.side-item.on {
  background: var(--color-brand-selected-bg);
  color: var(--color-brand-text);
  font-weight: 500;
}

.side-item.on::before {
  content: "";
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 3px;
  border-radius: 3px;
  background: var(--gradient-brand);
}

.side-item.quick .side-ico {
  color: var(--color-brand-text);
}

.side-item.quick.on .side-ico {
  color: var(--color-brand-text);
}

.side-dot {
  width: 8px;
  height: 8px;
  border-radius: 4px;
  flex: none;
}

.side-name {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 钉住按钮：hover 浮现，24px 热区 + 提示文案 */
.pin-btn {
  width: 24px;
  height: 24px;
  margin-right: -5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  border-radius: 6px;
  color: var(--color-text-muted);
  opacity: 0;
  cursor: pointer;
  transition: opacity 0.15s, color 0.15s, background 0.15s;
}

.side-item:hover .pin-btn {
  opacity: 0.9;
}

.pin-btn:hover {
  background: var(--color-surface-muted-hover);
  color: var(--color-brand-text);
  opacity: 1;
}

/* 已钉住：常显 + 品牌色 + 实心 */
.pin-btn.pinned {
  opacity: 1;
  color: var(--color-brand-text);
}

.pin-btn.pinned svg {
  fill: currentColor;
}

.sidebar-foot {
  border-top: 1px solid var(--color-border-light);
  padding: 8px;
  display: flex;
  gap: 4px;
}

.foot-btn {
  flex: 1;
  height: 30px;
  border: none;
  background: none;
  border-radius: var(--radius-sm);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  font-size: var(--font-sm);
  color: var(--color-text-muted);
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s, color 0.15s;
}

.foot-btn:hover:not(:disabled) {
  background: var(--color-surface-muted-hover);
  color: var(--color-text);
}

.foot-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.foot-btn.active {
  color: var(--color-brand-text);
}

.foot-btn .heart {
  color: #ef5b5b;
}

.spinning {
  animation: sideSpin 0.8s linear infinite;
}

@keyframes sideSpin {
  to {
    transform: rotate(360deg);
  }
}

.side-ico {
  flex: none;
}
</style>
