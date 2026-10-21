<template>
  <div class="agg-grid" :class="{ 'agg-grid-sorting': sorting }">
    <div
      v-for="(card, order) in cards"
      :key="card.id"
      class="agg-card"
      :class="{
        sorting,
        dragging: sorting && dragId === card.id,
        'drag-over': sorting && overId === card.id && dragId !== card.id
      }"
      :draggable="sorting"
      @dragstart="onDragStart(card.id)"
      @dragend="onDragEnd"
      @dragover.prevent="sorting && (overId = card.id)"
      @dragleave.prevent="sorting && overId === card.id && (overId = null)"
      @drop.prevent="onDrop(card.id)"
    >
      <div class="agg-head">
        <span class="agg-dot" :style="{ background: card.color }"></span>
        <span class="agg-name">{{ card.name }}</span>
        <template v-if="sorting">
          <span class="agg-order mrs-tnum">{{ order + 1 }}</span>
          <GripVertical class="agg-grip" :size="14" />
        </template>
        <button v-else class="agg-more" @click="$emit('open-platform', card.id)">
          全部<ChevronRight :size="11" />
        </button>
      </div>

      <!-- 排序模式：只显示标题，不渲染条目 -->
      <template v-if="!sorting">
        <template v-if="card.status === 'loading'">
          <div v-for="n in 5" :key="'sk' + n" class="agg-row">
            <span class="skeleton agg-sk-rank"></span>
            <span class="skeleton agg-sk-title" :style="{ width: (72 - n * 6) + '%' }"></span>
          </div>
        </template>
        <ErrorState
          v-else-if="card.status === 'error'"
          :message="card.error"
          compact
          @retry="loadCard(card.id)"
        />
        <template v-else>
          <div
            v-for="(item, i) in card.items"
            :key="card.id + '-' + i"
            class="agg-row"
            @click="$emit('open-item', { platform: card.id, item })"
          >
            <span class="agg-rank mrs-tnum" :class="'top-' + Math.min(i + 1, 4)">{{ i + 1 }}</span>
            <span class="agg-title">{{ item.title }}</span>
            <span v-if="item.hot && showHotValue" class="agg-hot mrs-tnum">
              <Flame :size="10" />{{ shortHot(item.hot) }}
            </span>
          </div>
        </template>
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
import { ChevronRight, Flame, Pin, GripVertical } from 'lucide-vue-next'
import { useSettingsStore } from '../stores/settingsStore.js'

const settingsStore = useSettingsStore()

const props = defineProps({
  pinnedIds: { type: Array, default: () => [] },
  showHotValue: { type: Boolean, default: true },
  sorting: { type: Boolean, default: false }
})

defineEmits(['open-platform', 'open-item'])

// 拖拽排序状态
const dragId = ref(null)
const overId = ref(null)

function onDragStart(id) {
  if (!props.sorting) return
  dragId.value = id
}

function onDragEnd() {
  dragId.value = null
  overId.value = null
}

function onDrop(targetId) {
  if (!props.sorting || !dragId.value) return
  settingsStore.movePinnedTo(dragId.value, targetId)
  dragId.value = null
  overId.value = null
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

/* 排序模式：只显示标题（紧凑单列），拖拽调序 */
.agg-grid-sorting {
  grid-template-columns: minmax(0, 1fr) !important;
  gap: 8px;
}

.agg-card.sorting {
  border-color: var(--color-border);
  cursor: grab;
  padding: 12px 14px;
  user-select: none;
}

.agg-card.sorting:active {
  cursor: grabbing;
}

.agg-card.sorting:hover {
  transform: none;
}

.agg-card.dragging {
  opacity: 0.45;
  border-style: dashed;
}

/* 插入指示线：悬停卡片顶边显示品牌渐变横线（插入到该卡之前），
   替代整卡高亮——整卡高亮会被误读为"替换这张卡" */
.agg-card.drag-over {
  position: relative;
}

.agg-card.drag-over::before {
  content: "";
  position: absolute;
  top: -6px; /* 居中于 8px 网格间隙 */
  left: 0;
  right: 0;
  height: 3px;
  border-radius: 2px;
  background: var(--gradient-brand);
  box-shadow: 0 0 8px rgba(255, 90, 31, 0.55);
  z-index: 2;
}

/* 插入线两端小圆点，强化"落点"感 */
.agg-card.drag-over::after {
  content: "";
  position: absolute;
  top: -8px;
  left: -3px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--color-brand-text);
  z-index: 3;
}

.agg-grip {
  color: var(--color-text-muted);
  margin-left: 2px;
  flex: none;
}

.agg-order {
  margin-left: auto;
  font-size: var(--font-xs);
  color: var(--color-brand-text);
  font-weight: 600;
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
