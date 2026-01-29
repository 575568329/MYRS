<!--
 * @Author: fjyu9 fjyu9@iflytek.com
 * @Date: 2026-01-29 13:48:21
 * @LastEditors: fjyu9 fjyu9@iflytek.com
 * @LastEditTime: 2026-01-29 13:57:12
 * @FilePath: \摸鱼热搜\src\App.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import HotSearch from './HotSearch/index.vue'

// 热搜插件，始终显示热搜页面
const enterAction = ref({ code: 'hotsearch' })

onMounted(() => {
  console.log('🚀 摸鱼热搜插件已启动')

  // 如果在 uTools 环境中
  if (window.utools) {
    // 监听插件进入事件
    window.utools.onPluginEnter((action) => {
      console.log('📌 插件进入:', action)
      enterAction.value = { ...action, code: 'hotsearch' }
    })

    window.utools.onPluginOut((isKill) => {
      console.log('👋 插件退出:', isKill)
    })
  }
})
</script>

<template>
  <!-- 始终显示热搜页面 -->
  <HotSearch :enterAction="enterAction"></HotSearch>
</template>
