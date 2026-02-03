/**
 * 无限滚动 composable
 * 使用 Intersection Observer API 优化性能
 */
import { ref, onMounted, onUnmounted } from 'vue'

/**
 * 无限滚动钩子
 * @param {Function} callback - 触发加载更多的回调函数
 * @param {Object} options - 配置选项
 * @param {number} options.threshold - 触发阈值 (0-1)
 * @param {string} options.rootMargin - 根边距
 * @param {boolean} options.disabled - 是否禁用
 * @returns {Object} { target, observer }
 */
export function useInfiniteScroll(callback, options = {}) {
  const {
    threshold = 0.1,
    rootMargin = '100px',
    disabled = false
  } = options

  const target = ref(null)
  const observer = ref(null)
  const isEnabled = ref(!disabled)

  /**
   * 启用无限滚动
   */
  const enable = () => {
    isEnabled.value = true
    if (observer.value) {
      observer.value.observe(target.value)
    }
  }

  /**
   * 禁用无限滚动
   */
  const disable = () => {
    isEnabled.value = false
    if (observer.value) {
      observer.value.unobserve(target.value)
    }
  }

  onMounted(() => {
    if (!window.IntersectionObserver) {
      console.warn('IntersectionObserver not supported, falling back to scroll event')
      return
    }

    observer.value = new IntersectionObserver(
      (entries) => {
        if (!isEnabled.value) return

        const [entry] = entries
        if (entry.isIntersecting) {
          callback()
        }
      },
      {
        threshold,
        rootMargin
      }
    )

    if (target.value) {
      observer.value.observe(target.value)
    }
  })

  onUnmounted(() => {
    if (observer.value) {
      observer.value.disconnect()
    }
  })

  return {
    target,
    observer,
    enable,
    disable
  }
}

/**
 * 传统滚动事件监听方案（降级处理）
 * @param {Function} callback - 回调函数
 * @param {number} threshold - 距离底部的像素阈值
 * @returns {Object} { onScroll, cleanup }
 */
export function useScrollEvent(callback, threshold = 100) {
  let scrollElement = null
  let isScrolling = false
  let scrollTimeout = null

  const handleScroll = (event) => {
    if (isScrolling) return

    const { scrollTop, scrollHeight, clientHeight } = event.target

    // 距离底部小于阈值时触发
    if (scrollHeight - scrollTop - clientHeight < threshold) {
      isScrolling = true

      callback().finally(() => {
        // 防抖处理
        scrollTimeout = setTimeout(() => {
          isScrolling = false
        }, 200)
      })
    }
  }

  const setup = (element) => {
    scrollElement = element
    scrollElement.addEventListener('scroll', handleScroll, { passive: true })
  }

  const cleanup = () => {
    if (scrollElement) {
      scrollElement.removeEventListener('scroll', handleScroll)
      if (scrollTimeout) {
        clearTimeout(scrollTimeout)
      }
    }
  }

  return {
    setup,
    cleanup
  }
}
