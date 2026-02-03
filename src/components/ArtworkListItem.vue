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
      // 兼容有 img 字段（艺术品）或有 url 字段（小说等）的数据
      return value.title && (value.img || value.url)
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
  // 优先使用 img，如果没有则使用 url
  const link = props.artwork.img || props.artwork.url
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
.artwork-list-item {
  background: #ffffff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  cursor: pointer;
  margin-bottom: 12px;
}

.artwork-list-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

/* 主要信息区域 */
.artwork-main {
  display: flex;
  align-items: center;
  padding: 16px;
  gap: 16px;
}

/* 排名标记 */
.artwork-rank {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff6b6b, #ee5a52);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* 内容区域 */
.artwork-content {
  flex: 1;
  min-width: 0;
}

.artwork-title {
  font-size: 16px;
  font-weight: 600;
  color: #333333;
  line-height: 1.4;
  margin-bottom: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.artwork-desc {
  font-size: 13px;
  color: #666666;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 国家标签 */
.artwork-country {
  display: inline-block;
  margin-top: 6px;
  padding: 2px 10px;
  font-size: 12px;
  color: #667eea;
  background: linear-gradient(135deg, #f0f2ff, #e8ebff);
  border-radius: 12px;
  border: 1px solid #dde1ff;
  font-weight: 500;
}

/* 查看图片按钮 */
.show-image-btn {
  flex-shrink: 0;
  padding: 8px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background: #ffffff;
  color: #666666;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 6px;
}

.show-image-btn:hover {
  border-color: #667eea;
  color: #667eea;
  background: #f8f9ff;
}

.btn-icon {
  font-size: 12px;
}

/* 暗色模式 */
:global(.dark-mode) .artwork-list-item {
  background: #2c2c2c;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

:global(.dark-mode) .artwork-list-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}

:global(.dark-mode) .artwork-title {
  color: #e0e0e0;
}

:global(.dark-mode) .artwork-desc {
  color: #a0a0a0;
}

:global(.dark-mode) .show-image-btn {
  background: #3c3c3c;
  border-color: #4a4a4a;
  color: #a0a0a0;
}

:global(.dark-mode) .show-image-btn:hover {
  border-color: #667eea;
  color: #667eea;
  background: #2c2c2c;
}

/* 暗色模式 - 国家标签 */
:global(.dark-mode) .artwork-country {
  color: #8b9dff;
  background: linear-gradient(135deg, #1e2230, #252a3d);
  border-color: #3d4460;
}
</style>
