/**
 * 图片懒加载指令
 * 使用 Intersection Observer API 实现
 */
import { useIntersectionObserver } from '@vueuse/core'

export const lazyLoad = {
  mounted(el, binding) {
    // 图片地址
    const imageUrl = binding.value

    // 如果已经有 src 属性，直接返回
    if (el.src) {
      return
    }

    // 创建占位图
    const placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PC9zdmc+'

    // 设置占位图
    el.src = placeholder

    // 添加加载中的样式
    el.classList.add('lazy-loading')

    // 使用 Intersection Observer 监听元素
    const { stop } = useIntersectionObserver(
      el,
      ([{ isIntersecting }]) => {
        if (isIntersecting) {
          // 元素进入视口，开始加载图片
          loadImage(el, imageUrl)
          // 停止观察
          stop()
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px'
      }
    )
  },

  updated(el, binding) {
    // 如果图片地址变化，重新加载
    if (binding.value !== binding.oldValue) {
      loadImage(el, binding.value)
    }
  }
}

/**
 * 加载图片
 * @param {HTMLImageElement} el - 图片元素
 * @param {string} src - 图片地址
 */
function loadImage(el, src) {
  // 创建新的 Image 对象预加载
  const img = new Image()

  img.onload = () => {
    // 图片加载成功
    el.src = src
    el.classList.remove('lazy-loading')
    el.classList.add('lazy-loaded')
  }

  img.onerror = () => {
    // 图片加载失败
    el.classList.remove('lazy-loading')
    el.classList.add('lazy-error')
    // 使用占位图
    const errorPlaceholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZWVlIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7liqDovb3kuK08L3RleHQ+PC9zdmc+'
    el.src = errorPlaceholder
  }

  // 开始加载
  img.src = src
}

/**
 * 注册懒加载指令
 * @param {Object} app - Vue 应用实例
 */
export function setupLazyLoad(app) {
  app.directive('lazy', lazyLoad)
}
