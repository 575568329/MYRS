<template>
  <div class="fav-list">
    <!-- 空状态 -->
    <div v-if="items.length === 0" class="fav-empty">
      <Star :size="24" class="fav-empty-ico" />
      <p>还没有收藏</p>
      <p class="fav-empty-tip">在热搜条目上点 ★ 或按 f 键收藏，跨平台汇总在这里</p>
    </div>

    <!-- 收藏列表 -->
    <template v-else>
      <div
        v-for="(fav, i) in items"
        :key="(fav.platform || '') + '_' + fav.title"
        class="fav-item"
        @click="$emit('open-item', fav)"
      >
        <span class="fav-dot" :style="{ background: dotColor(fav.platform) }"></span>
        <div class="fav-main">
          <div class="fav-title" :title="fav.title">{{ fav.title }}</div>
          <div class="fav-meta">
            <span class="fav-platform">{{ platformName(fav.platform) }}</span>
            <span class="fav-time">{{ timeAgo(fav.savedAt) }}</span>
          </div>
        </div>
        <button class="fav-remove" title="移除收藏" @click.stop="removeAt(i)">
          <X :size="13" />
        </button>
      </div>
    </template>

    <!-- 底部清理 -->
    <div v-if="items.length > 0" class="fav-foot">
      <button v-if="confirming" class="fav-clear confirm" @click="confirmClear">
        确认清空 {{ items.length }} 条？
      </button>
      <button v-else class="fav-clear" @click="confirming = true">清空收藏</button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { PLATFORMS } from '../services/hotSearchApi.js'
import { useFavorites } from '../utils/favorites.js'
import { Star, X } from 'lucide-vue-next'

const emit = defineEmits(['open-item'])

const { favorites, removeAt, clearAll } = useFavorites()

const items = computed(() => favorites.value)

const confirming = ref(false)
function confirmClear() {
  clearAll()
  confirming.value = false
}

function platformName(id) {
  const p = PLATFORMS.find(x => x.id === id)
  return p ? p.name : id || '未知'
}

// 分类点颜色（与侧栏同款哈希）
const DOT_PALETTE = ['#ff6b35', '#0084ff', '#fb7299', '#2932e1', '#00b578', '#ff9f1c', '#9254de', '#e91e4c', '#0ea5e9', '#d48806']
function dotColor(platformId) {
  const p = PLATFORMS.find(x => x.id === platformId)
  let h = 0
  for (const c of String((p && p.category) || platformId || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return DOT_PALETTE[h % DOT_PALETTE.length]
}

function timeAgo(ts) {
  if (!ts) return ''
  const m = Math.floor((Date.now() - ts) / 60000)
  if (m < 1) return '刚刚'
  if (m < 60) return `${m}分钟前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}小时前`
  return `${Math.floor(h / 24)}天前`
}
</script>

<style scoped>
.fav-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 14px 14px;
}

.fav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 10px;
  border-radius: var(--radius-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border-light);
  margin-bottom: 8px;
  cursor: pointer;
  transition: box-shadow 0.15s;
  min-width: 0;
}

.fav-item:hover {
  box-shadow: var(--shadow-sm);
}

.fav-dot {
  width: 8px;
  height: 8px;
  border-radius: 4px;
  flex: none;
}

.fav-main {
  flex: 1;
  min-width: 0;
}

.fav-title {
  font-size: var(--font-base);
  color: var(--color-text);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fav-meta {
  display: flex;
  gap: 10px;
  margin-top: 3px;
  font-size: var(--font-xs);
}

.fav-platform {
  color: var(--color-brand-text);
}

.fav-time {
  color: var(--color-text-muted);
}

.fav-remove {
  width: 26px;
  height: 26px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex: none;
  opacity: 0;
  transition: opacity 0.15s, color 0.15s, background 0.15s;
}

.fav-item:hover .fav-remove {
  opacity: 1;
}

.fav-remove:hover {
  background: var(--color-surface-muted-hover);
  color: var(--color-danger);
}

.fav-foot {
  padding: 10px 0 4px;
  text-align: center;
}

.fav-clear {
  padding: 6px 18px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: none;
  color: var(--color-text-muted);
  font-size: var(--font-sm);
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
}

.fav-clear:hover {
  color: var(--color-danger);
  border-color: var(--color-danger);
}

.fav-clear.confirm {
  color: #fff;
  background: var(--color-danger);
  border-color: var(--color-danger);
}

.fav-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 80px 20px;
  text-align: center;
  color: var(--color-text-muted);
}

.fav-empty-ico {
  opacity: 0.5;
}

.fav-empty-tip {
  font-size: var(--font-sm);
  max-width: 300px;
  line-height: 1.6;
}
</style>
