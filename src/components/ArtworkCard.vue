<template>
  <div class="artwork-card" @click="handleClick">
    <div class="artwork-image-wrapper">
      <img
        :src="artwork.img"
        :alt="artwork.title"
        class="artwork-image"
        @error="handleImageError"
        :loading="lazy ? 'lazy' : 'eager'"
      />
      <div class="artwork-rank">{{ index }}</div>
    </div>
    <div class="artwork-info">
      <div class="artwork-title">{{ artwork.title }}</div>
      <div v-if="artwork.desc && showDescription" class="artwork-desc">{{ artwork.desc }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  artwork: {
    type: Object,
    required: true,
    validator: (value) => {
      return value.title && value.img
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
  }
})

const emit = defineEmits(['click'])

// 处理图片加载错误
const handleImageError = (event) => {
  const img = event.target
  const artwork = props.artwork

  // 如果有备用图片 URL,尝试使用备用图片
  if (artwork.imgFallback && img.src !== artwork.imgFallback) {
    console.log(`🔄 [图片降级] 尝试使用备用图片: ${artwork.title}`)
    img.src = artwork.imgFallback
    return
  }

  // 如果备用图片也失败了,显示占位符
  console.warn(`⚠️ [图片加载失败] ${artwork.title}`)
  img.style.display = 'none' // 隐藏失败的图片

  // 创建占位符元素
  const wrapper = img.closest('.artwork-image-wrapper')
  if (wrapper && !wrapper.querySelector('.image-error-placeholder')) {
    const placeholder = document.createElement('div')
    placeholder.className = 'image-error-placeholder'
    placeholder.innerHTML = `
      <div class="placeholder-content">
        <div class="placeholder-icon">🎨</div>
        <div class="placeholder-title">${artwork.title}</div>
        <div class="placeholder-text">
          图片加载失败<br>点击查看详情
        </div>
      </div>
    `
    wrapper.insertBefore(placeholder, img)
  }
}

// 处理卡片点击
const handleClick = () => {
  emit('click', props.artwork)
}
</script>

<style scoped>
.artwork-card {
  position: relative;
  background: #ffffff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  cursor: pointer;
}

.artwork-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

/* 图片容器 */
.artwork-image-wrapper {
  position: relative;
  width: 100%;
  padding-bottom: 100%; /* 1:1 宽高比 */
  overflow: hidden;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.artwork-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.artwork-card:hover .artwork-image {
  transform: scale(1.05);
}

/* 排名标记 */
.artwork-rank {
  position: absolute;
  top: 8px;
  left: 8px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff6b6b, #ee5a52);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  z-index: 2;
}

/* 信息区域 */
.artwork-info {
  padding: 12px;
}

.artwork-title {
  font-size: 15px;
  font-weight: 600;
  color: #333333;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 8px;
}

.artwork-desc {
  font-size: 13px;
  color: #666666;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 图片加载失败占位符 */
.artwork-image-wrapper .image-error-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.image-error-placeholder .placeholder-content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  text-align: center;
  padding: 20px;
  transition: transform 0.3s ease;
}

.image-error-placeholder .placeholder-content:hover {
  transform: scale(1.02);
}

.placeholder-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.placeholder-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
}

.placeholder-text {
  font-size: 12px;
  opacity: 0.9;
  line-height: 1.5;
}

/* 暗色模式 */
:global(.dark-mode) .artwork-card {
  background: #2c2c2c;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

:global(.dark-mode) .artwork-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}

:global(.dark-mode) .artwork-title {
  color: #e0e0e0;
}

:global(.dark-mode) .artwork-desc {
  color: #a0a0a0;
}
</style>
