/**
 * 埋点数据调试面板组件
 * 用于在开发环境中查看和导出埋点数据
 */
<script setup>
import { ref, computed, onMounted } from 'vue'
import { analyticsCollector, getAnalyticsStats } from '../services/analytics'
import { pantryClient } from '../services/analytics/pantryClient.js'
import { PLATFORMS } from '../services/hotSearchApi.js'

// 显示状态
const show = ref(false)

// 统计信息
const stats = ref(null)

// 事件队列
const events = ref([])

// 上传记录
const uploadRecords = ref([])

// 远程数据
const remoteData = ref(null)
const isLoadingRemote = ref(false)

// 是否正在导出
const isExporting = ref(false)

// 统计分析
const analytics = ref(null)
const showAnalytics = ref(false)

// 切换显示
function toggle() {
  show.value = !show.value
  if (show.value) {
    loadData()
  }
}

// 加载数据
function loadData() {
  // 获取统计信息
  stats.value = getAnalyticsStats()

  // 获取事件队列（通过访问内部属性）
  const collector = analyticsCollector
  events.value = [...collector.eventQueue]

  // 获取上传记录（从 Pantry 客户端）
  uploadRecords.value = pantryClient.getUploadRecords() || []
}

// 刷新数据
function refresh() {
  loadData()
}

// 清空事件队列
function clearEvents() {
  if (confirm('确定要清空所有缓存的埋点事件吗？')) {
    analyticsCollector.eventQueue = []
    analyticsCollector.highPriorityQueue = []
    analyticsCollector.mediumPriorityQueue = []
    analyticsCollector.lowPriorityQueue = []
    analyticsCollector.saveCachedEvents()
    loadData()
  }
}

// 导出数据为 JSON
async function exportData() {
  isExporting.value = true
  try {
    const collector = analyticsCollector
    const allEvents = [...collector.eventQueue]

    const data = {
      export_time: new Date().toISOString(),
      total_events: allEvents.length,
      user_id: collector.userId,
      session_id: collector.sessionId,
      events: allEvents
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = `analytics_${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    console.log('✅ 埋点数据已导出')
  } catch (error) {
    console.error('导出失败:', error)
  } finally {
    isExporting.value = false
  }
}

// 导出为 JSONL（用于上传）
async function exportAsJSONL() {
  isExporting.value = true
  try {
    const collector = analyticsCollector
    const allEvents = [...collector.eventQueue]

    const jsonlContent = allEvents
      .map(event => JSON.stringify(event))
      .join('\n')

    const blob = new Blob([jsonlContent], { type: 'application/jsonl' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = `analytics_${new Date().toISOString().split('T')[0]}_${Date.now()}.jsonl`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    console.log('✅ 埋点数据已导出为 JSONL 格式')
  } catch (error) {
    console.error('导出失败:', error)
  } finally {
    isExporting.value = false
  }
}

// 手动触发上传
async function forceUpload() {
  try {
    console.log('📤 手动触发上传...')
    await analyticsCollector.uploadAllEvents()
    loadData()
    console.log('✅ 上传完成')
  } catch (error) {
    console.error('❌ 上传失败:', error)
  }
}

// 加载远程数据
async function loadRemoteData() {
  isLoadingRemote.value = true
  try {
    console.log('📥 从 Pantry 加载远程数据...')
    const data = await pantryClient.getAnalyticsData()
    remoteData.value = data

    // 自动生成统计分析
    if (data?.events) {
      generateAnalytics(data.events)
    }

    console.log('✅ 远程数据加载成功:', data)
  } catch (error) {
    console.error('❌ 加载远程数据失败:', error)
    remoteData.value = null
  } finally {
    isLoadingRemote.value = false
  }
}

// 生成统计分析
function generateAnalytics(eventsData) {
  if (!eventsData || eventsData.length === 0) {
    analytics.value = null
    return
  }

  const analysis = {
    total: eventsData.length,
    eventTypeStats: {},
    platformStats: {},
    clickStats: {},
    timeDistribution: {},
    userActivity: new Set(),
    dailyActivity: {}
  }

  // 调试：打印前几个事件的样本
  console.log('📊 生成统计分析，事件总数:', eventsData.length)
  console.log('🔍 前3个事件样本:', eventsData.slice(0, 3).map(e => ({
    type: e.type,
    hasData: !!e.data,
    dataKeys: e.data ? Object.keys(e.data) : [],
    data: e.data
  })))

  eventsData.forEach(event => {
    // 事件类型统计
    analysis.eventTypeStats[event.type] = (analysis.eventTypeStats[event.type] || 0) + 1

    // 用户活动统计
    if (event.data?.user_id) {
      analysis.userActivity.add(event.data.user_id)
    }

    // 日期统计（按天）
    const date = new Date(event.timestamp).toLocaleDateString()
    analysis.dailyActivity[date] = (analysis.dailyActivity[date] || 0) + 1

    // 平台切换统计
    if (event.type === 'platform_switch') {
      const toPlatform = event.data?.to_platform || event.data?.toPlatform || 'unknown'
      // 调试：如果是 unknown，打印详细信息
      if (toPlatform === 'unknown' && import.meta.env.VITE_DEBUG_MODE === 'true') {
        console.log('⚠️ 发现 unknown 平台切换事件:', {
          event: event,
          data: event.data,
          dataKeys: event.data ? Object.keys(event.data) : 'no data'
        })
      }
      analysis.platformStats[toPlatform] = (analysis.platformStats[toPlatform] || 0) + 1
    }

    // 链接点击统计
    if (event.type === 'open_link') {
      const platform = event.data?.platform || 'unknown'
      analysis.clickStats[platform] = (analysis.clickStats[platform] || 0) + 1
    }
  })

  // 转换 Set 为数量
  analysis.userActivity = analysis.userActivity.size

  // 计算百分比
  analysis.eventTypePercentages = {}
  Object.entries(analysis.eventTypeStats).forEach(([type, count]) => {
    analysis.eventTypePercentages[type] = ((count / analysis.total) * 100).toFixed(1)
  })

  console.log('📊 统计分析完成:', {
    platformStats: analysis.platformStats,
    clickStats: analysis.clickStats
  })

  analytics.value = analysis
}

// 格式化时间戳
function formatTime(timestamp) {
  return new Date(timestamp).toLocaleString()
}

// 获取事件类型标签颜色
function getEventColor(type) {
  const colors = {
    'app_start': '#10b981',
    'platform_switch': '#3b82f6',
    'platform_load_start': '#6366f1',
    'platform_load_success': '#22c55e',
    'platform_load_error': '#ef4444',
    'item_click': '#f59e0b',
    'favorite_toggle': '#ec4899',
    'error': '#dc2626'
  }
  return colors[type] || '#6b7280'
}

// 挂载时自动刷新
onMounted(() => {
  if (show.value) {
    loadData()
  }
})

// 暴露切换方法给外部使用
defineExpose({ toggle })

// 计算属性
const sortedEventTypeStats = computed(() => {
  if (!analytics.value?.eventTypeStats) return []
  return Object.entries(analytics.value.eventTypeStats)
    .sort((a, b) => b[1] - a[1])
})

const sortedPlatformStats = computed(() => {
  if (!analytics.value?.platformStats) return []
  return Object.entries(analytics.value.platformStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10) // 只显示前 10
})

const sortedClickStats = computed(() => {
  if (!analytics.value?.clickStats) return []
  return Object.entries(analytics.value.clickStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
})

const dailyActivityData = computed(() => {
  if (!analytics.value?.dailyActivity) return []
  return Object.entries(analytics.value.dailyActivity)
    .sort((a, b) => new Date(a[0]) - new Date(b[0]))
    .slice(-7) // 最近 7 天
})

// 事件类型中文名称映射
const eventTypeNames = {
  'platform_switch': '平台切换',
  'platform_load_start': '平台加载开始',
  'platform_load_success': '平台加载成功',
  'platform_load_error': '平台加载错误',
  'load_more': '加载更多',
  'refresh': '刷新',
  'scroll_to_bottom': '滚动到底部',
  'item_click': '项目点击',
  'favorite_toggle': '收藏切换',
  'copy_content': '复制内容',
  'open_link': '打开链接',
  'search': '搜索',
  'search_result_click': '搜索结果点击',
  'category_switch': '分类切换',
  'filter_change': '筛选器变更',
  'settings_open': '打开设置',
  'settings_change': '设置变更',
  'theme_switch': '主题切换',
  'app_start': '应用启动',
  'app_foreground': '应用前台',
  'app_background': '应用后台',
  'app_close': '应用关闭',
  'error': '错误',
  'performance_warning': '性能警告'
}

function getEventTypeName(type) {
  return eventTypeNames[type] || type
}

// 创建平台ID到中文名称的映射
const platformNameMap = computed(() => {
  const map = {}
  PLATFORMS.forEach(platform => {
    map[platform.id] = platform.name
  })
  return map
})

// 获取平台中文名称
function getPlatformName(platformId) {
  return platformNameMap.value[platformId] || platformId
}

// 获取进度条颜色
function getProgressColor(percent) {
  if (percent >= 50) return '#ef4444'
  if (percent >= 20) return '#f59e0b'
  return '#10b981'
}
</script>

<template>
  <!-- 调试按钮 -->
  <!-- <button
    @click="toggle"
    class="debug-btn"
    title="打开埋点调试面板"
  >
    📊 埋点调试
  </button> -->

  <!-- 调试面板 -->
  <Teleport to="body">
    <div v-if="show" class="debug-modal" @click.self="toggle">
      <div class="debug-content">
        <!-- 头部 -->
        <div class="debug-header">
          <h2>📊 埋点数据调试面板</h2>
          <button @click="toggle" class="close-btn">✕</button>
        </div>

        <!-- 统计信息 -->
        <div class="stats-section">
          <h3>统计信息</h3>
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-label">总事件数</span>
              <span class="stat-value">{{ stats?.totalEvents || 0 }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">高优先级</span>
              <span class="stat-value high">{{ stats?.highPriority || 0 }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">中优先级</span>
              <span class="stat-value medium">{{ stats?.mediumPriority || 0 }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">低优先级</span>
              <span class="stat-value low">{{ stats?.lowPriority || 0 }}</span>
            </div>
          </div>
        </div>

        <!-- 用户信息 -->
        <div class="user-section">
          <h3>用户信息</h3>
          <div class="user-info">
            <div class="info-item">
              <span class="info-label">用户 ID:</span>
              <code class="info-value">{{ stats?.userId || 'N/A' }}</code>
            </div>
            <div class="info-item">
              <span class="info-label">会话 ID:</span>
              <code class="info-value">{{ stats?.sessionId || 'N/A' }}</code>
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="actions-section">
          <h3>操作</h3>
          <div class="actions-grid">
            <button @click="refresh" class="action-btn primary">🔄 刷新</button>
            <button @click="exportData" class="action-btn" :disabled="isExporting || events.length === 0">
              {{ isExporting ? '导出中...' : '📥 导出JSON' }}
            </button>
            <button @click="exportAsJSONL" class="action-btn" :disabled="isExporting || events.length === 0">
              {{ isExporting ? '导出中...' : '📄 导出JSONL' }}
            </button>
            <button @click="forceUpload" class="action-btn success" :disabled="events.length === 0">
              📤 立即上传
            </button>
            <button @click="clearEvents" class="action-btn danger" :disabled="events.length === 0">
              🗑️ 清空队列
            </button>
            <button @click="loadRemoteData" class="action-btn" :disabled="isLoadingRemote">
              {{ isLoadingRemote ? '加载中...' : '🌐 加载远程数据' }}
            </button>
          </div>
        </div>

        <!-- 上传记录 -->
        <div v-if="uploadRecords.length > 0" class="uploads-section">
          <h3>上传记录</h3>
          <div class="uploads-list">
            <div v-for="(record, index) in uploadRecords" :key="index" class="upload-item">
              <span class="upload-time">{{ formatTime(record.timestamp) }}</span>
              <span class="upload-type">{{ record.type }}</span>
              <template v-if="record.basket">
                <code class="upload-cid">Basket: {{ record.basket }}</code>
                <span class="event-count">{{ record.eventCount }} events</span>
              </template>
            </div>
          </div>
        </div>

        <!-- 远程数据 -->
        <div v-if="remoteData" class="remote-section">
          <h3>🌐 远程数据 (Pantry)</h3>
          <div class="remote-info">
            <div class="info-item">
              <span class="info-label">事件总数:</span>
              <span class="info-value">{{ remoteData.events?.length || 0 }} 条</span>
            </div>
            <div v-if="analytics" class="info-item">
              <span class="info-label">活跃用户:</span>
              <span class="info-value">{{ analytics.userActivity }} 人</span>
            </div>
          </div>

          <!-- 统计分析开关 -->
          <button
            @click="showAnalytics = !showAnalytics"
            class="action-btn analytics-toggle"
          >
            {{ showAnalytics ? '📊 隐藏统计分析' : '📊 显示统计分析' }}
          </button>

          <!-- 统计分析内容 -->
          <div v-if="showAnalytics && analytics" class="analytics-content">
            <!-- 事件类型统计 -->
            <div class="analytics-section">
              <h4>📈 事件类型分布</h4>
              <div class="stats-list">
                <div
                  v-for="[type, count] in sortedEventTypeStats"
                  :key="type"
                  class="stat-row"
                >
                  <div class="stat-info">
                    <span class="stat-name">{{ getEventTypeName(type) }}</span>
                    <span class="stat-count">{{ count }} 次</span>
                  </div>
                  <div class="progress-bar">
                    <div
                      class="progress-fill"
                      :style="{
                        width: analytics.eventTypePercentages[type] + '%',
                        backgroundColor: getProgressColor(parseFloat(analytics.eventTypePercentages[type]))
                      }"
                    ></div>
                  </div>
                  <span class="stat-percent">{{ analytics.eventTypePercentages[type] }}%</span>
                </div>
              </div>
            </div>

            <!-- 热门平台统计 -->
            <div v-if="sortedPlatformStats.length > 0" class="analytics-section">
              <h4>🔥 热门平台排行</h4>
              <div class="platform-ranking">
                <div
                  v-for="[platform, count], index in sortedPlatformStats"
                  :key="platform"
                  class="platform-item"
                >
                  <span class="platform-rank" :class="'rank-' + (index + 1)">
                    {{ index + 1 }}
                  </span>
                  <span class="platform-name">{{ getPlatformName(platform) }}</span>
                  <span class="platform-count">{{ count }} 次切换</span>
                </div>
              </div>
            </div>

            <!-- 链接点击统计 -->
            <div v-if="sortedClickStats.length > 0" class="analytics-section">
              <h4>🔗 平台点击排行</h4>
              <div class="click-ranking">
                <div
                  v-for="[platform, count], index in sortedClickStats"
                  :key="platform"
                  class="click-item"
                >
                  <span class="click-rank" :class="'rank-' + (index + 1)">
                    {{ index + 1 }}
                  </span>
                  <span class="click-name">{{ getPlatformName(platform) }}</span>
                  <span class="click-count">{{ count }} 次点击</span>
                </div>
              </div>
            </div>

            <!-- 每日活动趋势 -->
            <div v-if="dailyActivityData.length > 0" class="analytics-section">
              <h4>📅 最近 7 天活动趋势</h4>
              <div class="daily-chart">
                <div
                  v-for="[date, count] in dailyActivityData"
                  :key="date"
                  class="daily-bar"
                >
                  <div class="bar-wrapper">
                    <div
                      class="bar-fill"
                      :style="{
                        height: (count / Math.max(...dailyActivityData.map(d => d[1])) * 100) + '%'
                      }"
                    ></div>
                    <span class="bar-label">{{ count }}</span>
                  </div>
                  <span class="bar-date">{{ date.slice(5) }}</span>
                </div>
              </div>
            </div>
          </div>

          <div v-if="remoteData.events && remoteData.events.length > 0" class="remote-events">
            <details>
              <summary>查看远程事件详情 ({{ remoteData.events.length }} 条)</summary>
              <div class="events-list">
                <div
                  v-for="(event, index) in remoteData.events.slice(-10)"
                  :key="index"
                  class="event-item"
                >
                  <div class="event-header">
                    <span
                      class="event-type"
                      :style="{ color: getEventColor(event.type) }"
                    >
                      {{ event.type }}
                    </span>
                    <span class="event-priority" :class="event.priority">
                      {{ event.priority }}
                    </span>
                    <span class="event-time">{{ formatTime(event.timestamp) }}</span>
                  </div>
                  <div class="event-details">
                    <pre>{{ JSON.stringify(event.data, null, 2) }}</pre>
                  </div>
                </div>
              </div>
            </details>
          </div>
        </div>

        <!-- 事件列表 -->
        <div class="events-section">
          <div class="events-header">
            <h3>事件队列</h3>
            <span class="events-count">({{ events.length }} 条)</span>
          </div>

          <div v-if="events.length > 0" class="events-list">
            <div
              v-for="(event, index) in events"
              :key="index"
              class="event-item"
            >
              <div class="event-header">
                <span
                  class="event-type"
                  :style="{ color: getEventColor(event.type) }"
                >
                  {{ event.type }}
                </span>
                <span class="event-priority" :class="event.priority">
                  {{ event.priority }}
                </span>
                <span class="event-time">{{ formatTime(event.timestamp) }}</span>
              </div>
              <div class="event-details">
                <pre>{{ JSON.stringify(event.data, null, 2) }}</pre>
              </div>
            </div>
          </div>
          <div v-else class="empty-state">
            <p>暂无埋点事件</p>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.debug-btn {
  position: fixed;
  bottom: 24px;
  left: 24px;
  z-index: 9999;
  padding: 12px 20px;
  background: linear-gradient(135deg, #8b5cf6, #6366f1);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s;
}

.debug-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.debug-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(4px);
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.debug-content {
  background-color: #ffffff;
  border-radius: 16px;
  max-width: 900px;
  width: 90%;
  max-height: 85vh;
  overflow: auto;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.debug-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
  background: linear-gradient(135deg, #f9fafb, #f3f4f6);
}

.debug-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background-color: #f3f4f6;
  border-radius: 50%;
  font-size: 18px;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background-color: #e5e7eb;
  color: #1f2937;
}

.debug-content > div {
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.debug-content > div:last-child {
  border-bottom: none;
}

h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #374151;
}

/* 统计信息 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.stat-item {
  background: #f9fafb;
  padding: 16px;
  border-radius: 8px;
  text-align: center;
}

.stat-label {
  display: block;
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 4px;
}

.stat-value {
  display: block;
  font-size: 24px;
  font-weight: bold;
  color: #1f2937;
}

.stat-value.high { color: #ef4444; }
.stat-value.medium { color: #f59e0b; }
.stat-value.low { color: #10b981; }

/* 用户信息 */
.user-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  font-size: 12px;
  color: #6b7280;
}

.info-value {
  font-size: 13px;
  font-family: monospace;
  background: #f3f4f6;
  padding: 6px 10px;
  border-radius: 4px;
  word-break: break-all;
}

/* 操作按钮 */
.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
}

.action-btn {
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn.primary {
  background-color: #3b82f6;
  color: white;
}
.action-btn.primary:hover:not(:disabled) {
  background-color: #2563eb;
}

.action-btn.success {
  background-color: #10b981;
  color: white;
}
.action-btn.success:hover:not(:disabled) {
  background-color: #059669;
}

.action-btn.danger {
  background-color: #ef4444;
  color: white;
}
.action-btn.danger:hover:not(:disabled) {
  background-color: #dc2626;
}

.action-btn:not(.primary):not(.success):not(.danger) {
  background-color: #6b7280;
  color: white;
}
.action-btn:not(.primary):not(.success):not(.danger):hover:not(:disabled) {
  background-color: #4b5563;
}

/* 上传记录 */
.uploads-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 150px;
  overflow-y: auto;
}

.upload-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f9fafb;
  border-radius: 6px;
  font-size: 12px;
}

.upload-time {
  color: #6b7280;
}

.upload-type {
  background: #dbeafe;
  color: #1e40af;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 500;
}

.upload-cid {
  flex: 1;
  font-family: monospace;
  background: #f3f4f6;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
}

.event-count {
  color: #6b7280;
  font-size: 11px;
  font-weight: 500;
}

/* 远程数据 */
.remote-section {
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
  background: #f0fdf4;
}

.remote-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.analytics-toggle {
  width: 100%;
  margin-top: 12px;
  background: linear-gradient(135deg, #8b5cf6, #6366f1);
  color: white;
  font-weight: 600;
}

.analytics-toggle:hover {
  background: linear-gradient(135deg, #7c3aed, #4f46e5);
}

/* 统计分析内容 */
.analytics-content {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.analytics-section h4 {
  margin: 0 0 12px 0;
  font-size: 15px;
  font-weight: 600;
  color: #374151;
  display: flex;
  align-items: center;
  gap: 6px;
}

/* 事件类型统计 */
.stats-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.stat-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.stat-info {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-width: 180px;
}

.stat-name {
  font-size: 13px;
  font-weight: 500;
  color: #374151;
}

.stat-count {
  font-size: 12px;
  color: #6b7280;
  font-weight: 600;
}

.progress-bar {
  flex: 1;
  height: 24px;
  background: #f3f4f6;
  border-radius: 4px;
  overflow: hidden;
  min-width: 100px;
}

.progress-fill {
  height: 100%;
  transition: width 0.5s ease;
  border-radius: 4px;
}

.stat-percent {
  min-width: 50px;
  text-align: right;
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
}

/* 平台排行 */
.platform-ranking,
.click-ranking {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.platform-item,
.click-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  transition: all 0.2s;
}

.platform-item:hover,
.click-item:hover {
  border-color: #d1d5db;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.platform-rank,
.click-rank {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 13px;
  font-weight: bold;
  background: #f3f4f6;
  color: #6b7280;
}

.platform-rank.rank-1,
.click-rank.rank-1 {
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  color: white;
}

.platform-rank.rank-2,
.click-rank.rank-2 {
  background: linear-gradient(135deg, #d1d5db, #9ca3af);
  color: white;
}

.platform-rank.rank-3,
.click-rank.rank-3 {
  background: linear-gradient(135deg, #f97316, #ea580c);
  color: white;
}

.platform-name,
.click-name {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.platform-count,
.click-count {
  font-size: 13px;
  color: #6b7280;
  font-weight: 600;
}

/* 每日活动趋势 */
.daily-chart {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  padding: 20px 12px 0;
  height: 180px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.daily-bar {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.bar-wrapper {
  flex: 1;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  position: relative;
}

.bar-fill {
  width: 100%;
  max-width: 40px;
  background: linear-gradient(180deg, #8b5cf6, #6366f1);
  border-radius: 4px 4px 0 0;
  transition: height 0.5s ease;
  min-height: 4px;
}

.bar-label {
  position: absolute;
  top: -20px;
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
}

.bar-date {
  font-size: 11px;
  color: #9ca3af;
  text-align: center;
}

.remote-events details {
  margin-top: 12px;
}

.remote-events summary {
  cursor: pointer;
  padding: 8px 12px;
  background: #dcfce7;
  border-radius: 6px;
  font-weight: 500;
  color: #166534;
  user-select: none;
}

.remote-events summary:hover {
  background: #bbf7d0;
}

/* 事件列表 */
.events-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.events-count {
  font-size: 14px;
  color: #6b7280;
}

.events-list {
  max-height: 400px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 4px;
}

.event-item {
  background: #f9fafb;
  border-radius: 8px;
  overflow: hidden;
}

.event-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
}

.event-type {
  font-weight: 600;
  font-size: 13px;
}

.event-priority {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  text-transform: uppercase;
}

.event-priority.high {
  background: #fecaca;
  color: #991b1b;
}

.event-priority.medium {
  background: #fed7aa;
  color: #9a3412;
}

.event-priority.low {
  background: #d1fae5;
  color: #065f46;
}

.event-time {
  margin-left: auto;
  font-size: 11px;
  color: #9ca3af;
}

.event-details {
  padding: 12px;
  background: #ffffff;
}

.event-details pre {
  margin: 0;
  font-size: 12px;
  color: #4b5563;
  white-space: pre-wrap;
  word-break: break-all;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #9ca3af;
}

.empty-state p {
  margin: 0;
}

/* 滚动条：统一走 main.css 全局令牌化样式 */
</style>
