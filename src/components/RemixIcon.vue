<template>
  <component :is="iconComponent" :style="iconStyle" />
</template>

<script setup>
import { computed, shallowRef, watch } from 'vue'
import { getPlatformIconImport } from '../config/icons.js'

const props = defineProps({
  // 图标名称（如 'ri-bilibili-line'）或平台 ID
  iconName: {
    type: String,
    required: true
  },
  size: {
    type: String,
    default: '1.2em'
  },
  color: {
    type: String,
    default: ''
  }
})

// 使用 shallowRef 存储组件，避免深度响应式
const iconComponent = shallowRef(null)

// 使用 Map 缓存已加载的组件，避免重复创建
const componentCache = new Map()

// 加载图标组件
const loadIcon = async (iconName) => {
  if (!iconName) {
    iconComponent.value = null
    return
  }

  // 检查缓存
  if (componentCache.has(iconName)) {
    iconComponent.value = componentCache.get(iconName)
    return
  }

  try {
    // 获取图标导入函数
    const loader = getPlatformIconImport(iconName)

    if (!loader) {
      console.warn(`[RemixIcon] 未找到图标: ${iconName}`)
      iconComponent.value = null
      return
    }

    // 动态导入组件
    const module = await loader()
    const component = module.default || module

    // 缓存组件
    componentCache.set(iconName, component)
    iconComponent.value = component
  } catch (error) {
    console.error(`[RemixIcon] 加载图标失败: ${iconName}`, error)
    iconComponent.value = null
  }
}

// 监听 iconName 变化
watch(() => props.iconName, (newName) => {
  loadIcon(newName)
}, { immediate: true })

const iconStyle = computed(() => {
  const style = {
    fontSize: props.size,
    width: props.size,
    height: props.size
  }
  if (props.color) {
    style.color = props.color
  }
  return style
})
</script>

<style scoped>
/* Remix Icon 组件样式 */
</style>
