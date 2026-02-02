<template>
  <RemixIcon :iconName="platformId" :size="size" :color="color" />
</template>

<script setup>
import RemixIcon from './RemixIcon.vue'

const props = defineProps({
  platformId: {
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
</script>

<style scoped>
/* 平台图标组件样式 */
</style>
