/**
 * 埋点事件类型定义
 * 定义所有可追踪的用户行为事件
 */

// 事件类型枚举
export const EventType = {
  // ========== 平台相关 ==========
  /** 平台切换 */
  PLATFORM_SWITCH: 'platform_switch',
  /** 平台数据加载开始 */
  PLATFORM_LOAD_START: 'platform_load_start',
  /** 平台数据加载成功 */
  PLATFORM_LOAD_SUCCESS: 'platform_load_success',
  /** 平台数据加载失败 */
  PLATFORM_LOAD_ERROR: 'platform_load_error',

  // ========== 数据交互 ==========
  /** 加载更多 */
  LOAD_MORE: 'load_more',
  /** 刷新数据 */
  REFRESH: 'refresh',
  /** 滚动到底部 */
  SCROLL_TO_BOTTOM: 'scroll_to_bottom',

  // ========== 用户交互 ==========
  /** 点击热搜项目 */
  ITEM_CLICK: 'item_click',
  /** 收藏/取消收藏 */
  FAVORITE_TOGGLE: 'favorite_toggle',
  /** 复制内容 */
  COPY_CONTENT: 'copy_content',
  /** 打开链接 */
  OPEN_LINK: 'open_link',

  // ========== 搜索相关 ==========
  /** 搜索操作 */
  SEARCH: 'search',
  /** 搜索结果点击 */
  SEARCH_RESULT_CLICK: 'search_result_click',

  // ========== 筛选相关 ==========
  /** 分类切换 */
  CATEGORY_SWITCH: 'category_switch',
  /** 筛选器变更 */
  FILTER_CHANGE: 'filter_change',

  // ========== UI 交互 ==========
  /** 设置页面打开 */
  SETTINGS_OPEN: 'settings_open',
  /** 设置变更 */
  SETTINGS_CHANGE: 'settings_change',
  /** 主题切换 */
  THEME_SWITCH: 'theme_switch',

  // ========== 应用生命周期 ==========
  /** 应用启动 */
  APP_START: 'app_start',
  /** 应用进入前台 */
  APP_FOREGROUND: 'app_foreground',
  /** 应用进入后台 */
  APP_BACKGROUND: 'app_background',
  /** 应用关闭 */
  APP_CLOSE: 'app_close',

  // ========== 错误追踪 ==========
  /** 错误发生 */
  ERROR: 'error',
  /** 性能警告 */
  PERFORMANCE_WARNING: 'performance_warning'
}

// 事件优先级
export const EventPriority = {
  HIGH: 'high',     // 高优先级：立即上传（错误、关键操作）
  MEDIUM: 'medium', // 中优先级：批量上传（常规交互）
  LOW: 'low'        // 低优先级：延迟上传（浏览行为）
}

// 事件类型与优先级映射
const EventPriorityMap = {
  [EventType.PLATFORM_SWITCH]: EventPriority.MEDIUM,
  [EventType.PLATFORM_LOAD_START]: EventPriority.LOW,
  [EventType.PLATFORM_LOAD_SUCCESS]: EventPriority.LOW,
  [EventType.PLATFORM_LOAD_ERROR]: EventPriority.HIGH,
  [EventType.LOAD_MORE]: EventPriority.MEDIUM,
  [EventType.REFRESH]: EventPriority.MEDIUM,
  [EventType.SCROLL_TO_BOTTOM]: EventPriority.LOW,
  [EventType.ITEM_CLICK]: EventPriority.MEDIUM,
  [EventType.FAVORITE_TOGGLE]: EventPriority.MEDIUM,
  [EventType.COPY_CONTENT]: EventPriority.LOW,
  [EventType.OPEN_LINK]: EventPriority.MEDIUM,
  [EventType.SEARCH]: EventPriority.MEDIUM,
  [EventType.SEARCH_RESULT_CLICK]: EventPriority.MEDIUM,
  [EventType.CATEGORY_SWITCH]: EventPriority.LOW,
  [EventType.FILTER_CHANGE]: EventPriority.LOW,
  [EventType.SETTINGS_OPEN]: EventPriority.LOW,
  [EventType.SETTINGS_CHANGE]: EventPriority.LOW,
  [EventType.THEME_SWITCH]: EventPriority.LOW,
  [EventType.APP_START]: EventPriority.HIGH,
  [EventType.APP_FOREGROUND]: EventPriority.HIGH,
  [EventType.APP_BACKGROUND]: EventPriority.MEDIUM,
  [EventType.APP_CLOSE]: EventPriority.MEDIUM,
  [EventType.ERROR]: EventPriority.HIGH,
  [EventType.PERFORMANCE_WARNING]: EventPriority.MEDIUM
}

/**
 * 获取事件优先级
 * @param {string} eventType - 事件类型
 * @returns {string} 优先级
 */
export function getEventPriority(eventType) {
  return EventPriorityMap[eventType] || EventPriority.MEDIUM
}

/**
 * 埋点事件基类
 */
export class AnalyticsEvent {
  constructor(type, data = {}) {
    this.type = type
    this.timestamp = Date.now()
    this.priority = getEventPriority(type)
    this.data = this.sanitizeData(data)
  }

  /**
   * 数据清洗，移除敏感信息
   * @param {Object} data - 原始数据
   * @returns {Object} 清洗后的数据
   */
  sanitizeData(data) {
    const sanitized = { ...data }

    // 移除敏感字段
    const sensitiveKeys = ['password', 'token', 'secret', 'authorization']
    sensitiveKeys.forEach(key => {
      delete sanitized[key]
    })

    return sanitized
  }

  /**
   * 转换为 JSON 格式
   * @returns {Object} JSON 对象
   */
  toJSON() {
    const json = {
      type: this.type,
      timestamp: this.timestamp,
      priority: this.priority,
      data: this.data
    }

    // 调试日志
    if (import.meta.env.VITE_DEBUG_MODE === 'true') {
      console.log(`[AnalyticsEvent] 🔍 序列化事件:`, {
        type: this.type,
        hasData: !!this.data,
        dataKeys: this.data ? Object.keys(this.data) : [],
        data: this.data
      })
    }

    return json
  }
}

/**
 * 平台切换事件
 */
export class PlatformSwitchEvent extends AnalyticsEvent {
  constructor(fromPlatform, toPlatform) {
    super(EventType.PLATFORM_SWITCH, {
      from_platform: fromPlatform,
      to_platform: toPlatform
    })
  }
}

/**
 * 平台加载事件
 */
export class PlatformLoadEvent extends AnalyticsEvent {
  constructor(platform, status, extra = {}) {
    const type = status === 'error'
      ? EventType.PLATFORM_LOAD_ERROR
      : status === 'success'
        ? EventType.PLATFORM_LOAD_SUCCESS
        : EventType.PLATFORM_LOAD_START

    super(type, {
      platform,
      status,
      ...extra
    })
  }
}

/**
 * 项目点击事件
 */
export class ItemClickEvent extends AnalyticsEvent {
  constructor(platform, itemTitle, itemPosition, extra = {}) {
    super(EventType.ITEM_CLICK, {
      platform,
      item_title: itemTitle,
      item_position: itemPosition,
      ...extra
    })
  }
}

/**
 * 收藏切换事件
 */
export class FavoriteToggleEvent extends AnalyticsEvent {
  constructor(platform, itemTitle, isFavorite) {
    super(EventType.FAVORITE_TOGGLE, {
      platform,
      item_title: itemTitle,
      action: isFavorite ? 'add' : 'remove'
    })
  }
}

/**
 * 搜索事件
 */
export class SearchEvent extends AnalyticsEvent {
  constructor(platform, query, resultCount) {
    super(EventType.SEARCH, {
      platform,
      query,
      result_count: resultCount
    })
  }
}

/**
 * 错误事件
 */
export class ErrorEvent extends AnalyticsEvent {
  constructor(errorType, errorMessage, errorContext = {}) {
    super(EventType.ERROR, {
      error_type: errorType,
      error_message: errorMessage,
      context: errorContext
    })
  }
}

/**
 * 应用生命周期事件
 */
export class AppLifecycleEvent extends AnalyticsEvent {
  constructor(lifecycleType, extra = {}) {
    const typeMap = {
      'start': EventType.APP_START,
      'foreground': EventType.APP_FOREGROUND,
      'background': EventType.APP_BACKGROUND,
      'close': EventType.APP_CLOSE
    }

    super(typeMap[lifecycleType] || EventType.APP_START, {
      lifecycle: lifecycleType,
      ...extra
    })
  }
}

/**
 * 创建事件的工厂函数
 * @param {string} type - 事件类型
 * @param {Object} data - 事件数据
 * @returns {AnalyticsEvent} 事件实例
 */
export function createEvent(type, data = {}) {
  switch (type) {
    case EventType.PLATFORM_SWITCH:
      return new PlatformSwitchEvent(
        data.fromPlatform || data.from_platform,
        data.toPlatform || data.to_platform
      )
    case EventType.PLATFORM_LOAD_START:
    case EventType.PLATFORM_LOAD_SUCCESS:
    case EventType.PLATFORM_LOAD_ERROR:
      return new PlatformLoadEvent(
        data.platform,
        data.status,
        data.extra
      )
    case EventType.ITEM_CLICK:
      return new ItemClickEvent(
        data.platform,
        data.itemTitle || data.item_title,
        data.itemPosition || data.item_position,
        data.extra
      )
    case EventType.FAVORITE_TOGGLE:
      return new FavoriteToggleEvent(
        data.platform,
        data.itemTitle || data.item_title,
        data.isFavorite || data.is_favorite
      )
    case EventType.SEARCH:
      return new SearchEvent(
        data.platform,
        data.query,
        data.resultCount || data.result_count
      )
    case EventType.ERROR:
      return new ErrorEvent(
        data.errorType || data.error_type,
        data.errorMessage || data.error_message,
        data.errorContext || data.error_context
      )
    case EventType.APP_START:
    case EventType.APP_FOREGROUND:
    case EventType.APP_BACKGROUND:
    case EventType.APP_CLOSE:
      return new AppLifecycleEvent(
        data.lifecycle,
        data.extra
      )
    default:
      return new AnalyticsEvent(type, data)
  }
}

export default {
  EventType,
  EventPriority,
  getEventPriority,
  AnalyticsEvent,
  PlatformSwitchEvent,
  PlatformLoadEvent,
  ItemClickEvent,
  FavoriteToggleEvent,
  SearchEvent,
  ErrorEvent,
  AppLifecycleEvent,
  createEvent
}
