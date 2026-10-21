<template>
  <div class="artwork-list-item" @click="handleClick">
    <!-- 主要信息区域 -->
    <div class="artwork-main">
      <div class="artwork-rank">{{ index }}</div>
      <div class="artwork-content">
        <div class="artwork-title">{{ artwork.title }}</div>
        <div v-if="showDescription && artwork.desc" class="artwork-desc">{{ artwork.desc }}</div>
      </div>
      <button class="show-image-btn" @click.stop="openImage">
        {{ artwork.img ? '查看图片' : '查看详情' }}
        <span class="btn-icon">↗</span>
      </button>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  artwork: {
    type: Object,
    required: true,
    validator: (value) => {
      // 验证必须有 title
      if (!value.title) return false

      // 允许 img 或 url 为空字符串，只要至少有一个字段存在即可
      // 这样可以兼容 API 返回的不完整数据
      return 'img' in value || 'url' in value || 'mobileUrl' in value
    }
  },
  index: {
    type: Number,
    required: true
  },
  showDescription: {
    type: Boolean,
    default: true
  },
  lazy: {
    type: Boolean,
    default: true
  },
  autoTranslate: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['click'])

// 打开链接（图片或详情页）
const openImage = () => {
  // 优先使用 img，如果没有则使用 url 或 mobileUrl
  const link = props.artwork.img || props.artwork.url || props.artwork.mobileUrl

  // 如果所有链接都为空，则不执行任何操作
  if (!link) {
    console.warn('[ArtworkListItem] 没有可用的链接:', props.artwork)
    return
  }

  if (window.utools) {
    window.utools.shellOpenExternal(link)
  } else {
    window.open(link, '_blank')
  }
}

// 处理列表项点击
const handleClick = () => {
  emit('click', props.artwork)
}
</script>

<style scoped>
/* 全量令牌化：跟随明暗主题自动切换（原 :global(.dark-mode) 写法在 scoped 中无效，
   导致暗色下白底——与旧设置页同病，此处根治） */
.artwork-list-item {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  transition: box-shadow 0.2s ease;
  cursor: pointer;
  margin-bottom: 10px;
}

.artwork-list-item:hover {
  box-shadow: var(--shadow-btn-hover);
}

/* 主要信息区域 */
.artwork-main {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  gap: 14px;
}

/* 排名标记（品牌渐变，与热搜 Top 徽章同源） */
.artwork-rank {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  background: var(--gradient-brand);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-base);
  font-weight: bold;
  font-variant-numeric: tabular-nums;
}

/* 内容区域 */
.artwork-content {
  flex: 1;
  min-width: 0;
}

.artwork-title {
  font-size: var(--font-lg);
  font-weight: 600;
  color: var(--color-text);
  line-height: 1.4;
  margin-bottom: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.artwork-desc {
  font-size: var(--font-md);
  color: var(--color-text-3);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 查看图片按钮 */
.show-image-btn {
  flex-shrink: 0;
  padding: 6px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-2);
  font-size: var(--font-md);
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 5px;
}

.show-image-btn:hover {
  border-color: var(--color-brand-text);
  color: var(--color-brand-text);
  background: var(--color-surface-hover);
}

.btn-icon {
  font-size: var(--font-sm);
}
</style>
