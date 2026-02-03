/**
 * 埋点系统统一导出
 * 提供便捷的导入接口
 */

// 导出配置
export * from '../../config/pantryConfig.js'

// 导出事件类型
export * from './eventTypes.js'

// 导出 Pantry 客户端
export { PantryClient, pantryClient } from './pantryClient.js'

// 导出收集器和便捷函数
export {
  analyticsCollector,
  initAnalytics,
  trackEvent,
  getAnalyticsStats,
  destroyAnalytics
} from './analyticsCollector.js'

// 默认导出收集器
export { default } from './analyticsCollector.js'
