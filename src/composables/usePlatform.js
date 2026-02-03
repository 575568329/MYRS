/**
 * 平台切换相关逻辑 composable
 */
import { ref, computed } from 'vue'
import { useHotSearchStore } from '../stores/hotSearchStore.js'
import { useSettingsStore } from '../stores/settingsStore.js'

export function usePlatform() {
  const hotSearchStore = useHotSearchStore()
  const settingsStore = useSettingsStore()

  const platformTabsRef = ref(null)
  const canScrollLeft = ref(false)
  const canScrollRight = ref(false)

  /**
   * 切换平台
   */
  const switchPlatform = (platformId) => {
    hotSearchStore.switchPlatform(platformId)
  }

  /**
   * 切换分类
   */
  const switchCategory = (category) => {
    hotSearchStore.switchCategory(category)
  }

  /**
   * 滚动平台标签
   */
  const scrollPlatformTabs = (direction) => {
    if (!platformTabsRef.value) return

    const scrollAmount = 200
    const scrollLeft = platformTabsRef.value.scrollLeft

    platformTabsRef.value.scrollTo({
      left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
      behavior: 'smooth'
    })

    updateScrollButtons()
  }

  /**
   * 更新滚动按钮状态
   */
  const updateScrollButtons = () => {
    if (!platformTabsRef.value) return

    const { scrollLeft, scrollWidth, clientWidth } = platformTabsRef.value

    canScrollLeft.value = scrollLeft > 0
    canScrollRight.value = scrollLeft < scrollWidth - clientWidth
  }

  return {
    platformTabsRef,
    canScrollLeft,
    canScrollRight,
    switchPlatform,
    switchCategory,
    scrollPlatformTabs,
    updateScrollButtons
  }
}
