<template>
  <div class="artwork-list-item" @click="handleClick">
    <!-- 主要信息区域 -->
    <div class="artwork-main">
      <div class="artwork-rank">{{ index }}</div>
      <div class="artwork-content">
        <div class="artwork-title">{{ artwork.title }}</div>
        <div v-if="showDescription && artwork.desc" class="artwork-desc">{{ artwork.desc }}</div>
      </div>
      <button
        class="show-image-btn"
        @click.stop="toggleIframe"
        :class="{ active: isIframeVisible }"
      >
        {{ isIframeVisible ? '收起图片' : '查看图片' }}
        <span class="btn-icon">{{ isIframeVisible ? '▲' : '▼' }}</span>
      </button>
    </div>

    <!-- Iframe 嵌入展示区域 -->
    <transition name="expand">
      <div v-if="isIframeVisible" class="iframe-container">
        <div class="iframe-toolbar">
          <span class="toolbar-title">{{ artwork.title }}</span>
          <button class="toolbar-close" @click.stop="toggleIframe">✕</button>
        </div>
        <iframe
          :src="iframeUrl"
          class="artwork-iframe"
          frameborder="0"
          allowfullscreen
        ></iframe>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

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

const isIframeVisible = ref(false)

// 生成 iframe 的 HTML 内容
const iframeUrl = computed(() => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${props.artwork.title}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: #f5f5f5;
          padding: 20px;
        }
        .img-container {
          max-width: 100%;
          max-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        img {
          max-width: 100%;
          max-height: 100vh;
          object-fit: contain;
          display: block;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }
      </style>
    </head>
    <body>
      <div class="img-container">
        <img src="${props.artwork.img}" alt="${props.artwork.title}" />
      </div>
    </body>
    </html>
  `
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`
})

// 切换 iframe 显示
const toggleIframe = () => {
  isIframeVisible.value = !isIframeVisible.value
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
  transition: transform 0.3s ease;
}

.show-image-btn.active .btn-icon {
  transform: rotate(180deg);
}

/* Iframe 容器 */
.iframe-container {
  width: 100%;
  background: #f5f5f5;
  border-top: 1px solid #e0e0e0;
  overflow: hidden;
}

.iframe-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #ffffff;
  border-bottom: 1px solid #e0e0e0;
}

.toolbar-title {
  font-size: 14px;
  font-weight: 600;
  color: #333333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  margin-right: 16px;
}

.toolbar-close {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border: none;
  background: #f0f0f0;
  color: #666666;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.toolbar-close:hover {
  background: #e0e0e0;
  color: #333333;
}

.artwork-iframe {
  width: 100%;
  height: 600px;
  border: none;
  display: block;
}

/* 展开动画 */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  max-height: 660px;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
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

:global(.dark-mode) .show-image-btn.active {
  border-color: #667eea;
  color: #667eea;
  background: #1e1e2e;
}

/* Iframe 容器暗色模式 */
:global(.dark-mode) .iframe-container {
  background: #1a1a1a;
  border-top-color: #3a3a3a;
}

:global(.dark-mode) .iframe-toolbar {
  background: #2c2c2c;
  border-bottom-color: #3a3a3a;
}

:global(.dark-mode) .toolbar-title {
  color: #e0e0e0;
}

:global(.dark-mode) .toolbar-close {
  background: #3a3a3a;
  color: #a0a0a0;
}

:global(.dark-mode) .toolbar-close:hover {
  background: #4a4a4a;
  color: #e0e0e0;
}
</style>
