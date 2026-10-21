<template>
  <div class="agg-grid">
    <div v-for="(card, order) in cards" :key="card.id" class="agg-card" :class="{ sorting }">
      <div class="agg-head">
        <span class="agg-dot" :style="{ background: card.color }"></span>
        <span class="agg-name">{{ card.name }}</span>
        <span v-if="sorting" class="agg-order mrs-tnum">{{ order + 1 }}</span>
        <button
          v-if="sorting"
          class="agg-move"
          :disabled="order === 0"
          title="上移"
          @click.stop="move(card.id, -1)"
        >
          <ChevronUp :size="13" />
        </button>
        <button
          v-if="sorting"
          class="agg-move"
          :disabled="order === cards.length - 1"
          title="下移"
          @click.stop="move(card.id, 1)"
        >
          <ChevronDown :size="13" />
        </button>
        <button v-else class="agg-more" @click="$emit('open-platform', card.id)">
          全部<ChevronRight :size="11" />
        </button>
      </div>

      <!-- 骨架 -->
      <template v-if="card.status === 'loading'">
        <div v-for="n in 5" :key="'sk' + n" class="agg-row">
          <span class="skeleton agg-sk-rank"></span>
          <span class="skeleton agg-sk-title" :style="{ width: (72 - n * 6) + '%' }"></span>
        </div>
      </template>

      <!-- 失败（单卡降级不拖垮整页） -->
      <ErrorState
        v-else-if="card.status === 'error'"
        :message="card.error"
        compact
        @retry="loadCard(card.id)"
      />

      <!-- 数据 -->
      <template v-else>
        <div
          v-for="(item, i) in card.items"
          :key="card.id + '-' + i"
          class="agg-row"
          @click="!sorting && $emit('open-item', { platform: card.id, item })"
        >
          <span class="agg-rank mrs-tnum" :class="'top-' + Math.min(i + 1, 4)">{{ i + 1 }}</span>
          <span class="agg-title">{{ item.title }}</span>
          <span v-if="item.hot && showHotValue" class="agg-hot mrs-tnum">
            <Flame :size="10" />{{ shortHot(item.hot) }}
          </span>
        </div>
      </template>
    </div>

    <!-- 未钉住引导 -->
    <div v-if="cards.length === 0" class="agg-empty">
      <Pin :size="22" class="agg-empty-ico" />
      <p>还没有钉住的平台</p>
      <p class="agg-empty-tip">在左侧平台列表上「右键」即可钉住，聚合首页会汇总你常看的热榜</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { getHotData, PLATFORMS } from '../services/hotSearchApi.js'
import ErrorState from './ErrorState.vue'
import { ChevronRight, ChevronUp, ChevronDown, Flame, Pin } from 'lucide-vue-next'
import { useSettingsStore } from '../stores/settingsStore.js'

const settingsStore = useSettingsStore()

const props = defineProps({
  pinnedIds: { type: Array, default: () => [] },
  showHotValue: { type: Boolean, default: true },
  sorting: { type: Boolean, default: false }
})

defineEmits(['open-platform', 'open-item'])

// 排序：上移/下移（store 持久化，卡片顺序实时跟随 pinnedIds）
function move(platformId, delta) {
  settingsStore.movePinned(platformId, delta)
}

// 卡片数据：id -> { name, color, items, status, error }
const cardMap = ref({})

const cards = computed(() =>
  props.pinnedIds
    .map(id => {
      const meta = PLATFORMS.find(p => p.id === id)
      if (!meta) return null
      return {
        id,
        name: meta.name,
        color: dotColor(meta.category),
        ...(cardMap.value[id] || { items: [], status: 'loading', error: '' })
      }
    })
    .filter(Boolean)
    .slice(0, 8) // 聚合卡片上限 8（超出滚动）
)

// 与侧栏一致的颜色哈希（简化版：重复实现避免循环依赖）
const DOT_PALETTE = ['#ff6b35', '#0084ff', '#fb7299', '#2932e1', '#00b578', '#ff9f1c', '#9254de', '#e91e4c', '#0ea5e9', '#d48806']
function dotColor(category) {
  let h = 0
  for (const c of String(category || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return DOT_PALETTE[h % DOT_PALETTE.length]
}

function shortHot(v) {
  if (typeof v === 'number') {
    if (v >= 100000000) return (v / 100000000).toFixed(1) + '亿'
    if (v >= 10000) return (v / 10000).toFixed(0) + '万'
    return String(v)
  }
  return String(v || '')
}

async function loadCard(platformId) {
  const entry = cardMap.value[platformId] || {}
  cardMap.value[platformId] = { ...entry, status: 'loading', error: '' }
  try {
    const result = await getHotData(platformId, { page: 1, pageSize: 5 })
    cardMap.value[platformId] = {
      items: (result && result.data) || [],
      status: 'ok',
      error: ''
    }
  } catch (e) {
    cardMap.value[platformId] = {
      items: [],
      status: 'error',
      error: (e && e.message) || '数据源暂时不可用'
    }
  }
}

function loadAll() {
  props.pinnedIds.slice(0, 8).forEach(id => {
    const cur = cardMap.value[id]
    // 已有数据不重复加载（stale-while-revalidate 由镜像层负责），首次/失败才拉
    if (!cur || cur.status === 'error' || (!cur.items || cur.items.length === 0)) {
      loadCard(id)
    }
  })
}

watch(() => props.pinnedIds.join(','), () => loadAll(), { immediate: true })

defineExpose({ reload: loadAll })
</script>

<style scoped>
.agg-grid {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden; /* 禁止横向拖动 */
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); /* minmax(0) 防内容撑宽产生横滚 */
  gap: 10px;
  padding: 4px 14px 14px;
  align-content: start;
}

.agg-card {
  min-width: 0; /* grid 子项默认 min-width:auto 会撑破列宽 */
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-light);
  background: var(--color-surface);
  padding: 10px 12px 6px;
  transition: transform 0.15s, box-shadow 0.15s;
}

/* 排序模式：卡片高亮边框，禁跳转 */
.agg-card.sorting {
  border-color: var(--color-brand-text);
}

.agg-card.sorting:hover {
  transform: none;
}

.agg-order {
  margin-left: auto;
  font-size: var(--font-xs);
  color: var(--color-brand-text);
  font-weight: 600;
}

.agg-move {
  width: 24px;
  height: 24px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-2);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex: none;
  font-family: inherit;
  transition: all 0.15s;
}

.agg-move:hover:not(:disabled) {
  border-color: var(--color-brand-text);
  color: var(--color-brand-text);
}

.agg-move:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.agg-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.agg-head {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 2px 0 8px;
}

.agg-dot {
  width: 8px;
  height: 8px;
  border-radius: 4px;
  flex: none;
}

.agg-name {
  font-size: var(--font-base);
  font-weight: 600;
  color: var(--color-text);
}

.agg-more {
  margin-left: auto;
  border: none;
  background: none;
  font-size: var(--font-xs);
  color: var(--color-hot);
  display: inline-flex;
  align-items: center;
  gap: 3px;
  cursor: pointer;
  font-family: inherit;
  padding: 2px 4px;
  border-radius: 4px;
}

.agg-more:hover {
  background: var(--color-surface-muted-hover);
}

.agg-row {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 5.5px 4px;
  border-radius: var(--radius-sm);
  font-size: var(--font-md);
  cursor: pointer;
}

.agg-row:hover {
  background: var(--color-surface-muted);
}

.agg-rank {
  width: 17px;
  height: 17px;
  border-radius: 6px;
  font-size: var(--font-xs);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  background: var(--color-surface-muted);
  color: var(--color-text-muted);
}

.agg-rank.top-1 {
  background: linear-gradient(135deg, var(--brand-fire-2), var(--brand-fire-3));
  color: #fff;
}

.agg-rank.top-2 {
  background: var(--brand-fire-2);
  color: #fff;
}

.agg-rank.top-3 {
  background: var(--brand-fire-1);
  color: #fff;
}

.agg-title {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--color-text);
  word-break: break-all; /* 长连续串（URL等）不撑破列宽 */
}

.agg-hot {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: var(--font-xs);
  color: var(--color-hot);
}

.agg-sk-rank {
  width: 17px;
  height: 17px;
  border-radius: 6px;
  flex: none;
}

.agg-sk-title {
  height: 12px;
}

.agg-empty {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 60px 20px;
  text-align: center;
  color: var(--color-text-muted);
}

.agg-empty-ico {
  opacity: 0.5;
}

.agg-empty-tip {
  font-size: var(--font-sm);
  max-width: 320px;
  line-height: 1.6;
}

.mrs-tnum {
  font-variant-numeric: tabular-nums;
}
</style>
