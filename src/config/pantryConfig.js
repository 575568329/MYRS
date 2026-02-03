/**
 * Pantry 存储配置文件
 * 用于配置埋点数据的云端存储
 * 文档: https://documenter.getpostman.com/view/3281832/SzmZeMLC
 */

// 是否启用埋点功能
export const ANALYTICS_ENABLED = true

// Pantry API 基础配置
export const PANTRY_CONFIG = {
  // API 基础地址
  BASE_URL: 'https://getpantry.cloud/apiv1',

  // Pantry Key (需要到 https://getpantry.cloud 注册获取)
  // 每个项目/用户都有一个唯一的 Pantry Key
  KEY: import.meta.env.VITE_PANTRY_KEY || 'YOUR_PANTRY_KEY_HERE',

  // Basket 名称 (用于存储埋点数据的容器)
  BASKET: {
    // 主埋点数据 basket
    ANALYTICS: import.meta.env.VITE_PANTRY_BASKET_ANALYTICS || 'newBasket88',

    // 用户会话 basket
    SESSIONS: import.meta.env.VITE_PANTRY_BASKET_SESSIONS || 'user_sessions',

    // 错误日志 basket
    ERRORS: import.meta.env.VITE_PANTRY_BASKET_ERRORS || 'error_logs'
  }
}

// 本地存储键名
export const STORAGE_KEYS = {
  // Pantry Key
  PANTRY_KEY: 'pantry_key',
  // 埋点数据缓存（本地暂存，批量上传）
  ANALYTICS_CACHE: 'analytics_cache',
  // 上传记录
  UPLOAD_RECORDS: 'upload_records'
}

// 上传策略配置
export const UPLOAD_STRATEGY = {
  // 批量上传：收集多少条埋点后上传
  BATCH_SIZE: 20,  // 增加到 20 条以减少上传频率，避免 API 速率限制
  // 时间间隔：最长等待时间后强制上传（毫秒）
  MAX_INTERVAL: 10 * 60 * 1000, // 改为 10 分钟，减少上传频率
  // 单次上传最大数据大小（字符数）
  MAX_SIZE: 100 * 1024, // 100KB
}

// 重试配置
export const RETRY_CONFIG = {
  // 最大重试次数
  MAX_RETRIES: 5,  // 增加到 5 次重试，应对速率限制
  // 重试延迟（毫秒）
  RETRY_DELAY: 1000,
  // 指数退避因子
  BACKOFF_FACTOR: 2
}

// 数据保留策略
export const RETENTION_POLICY = {
  // 本地缓存保留天数
  LOCAL_CACHE_DAYS: 7,
  // 远程保留天数（Pantry 会自动清理不活跃的数据）
  REMOTE_DAYS: 30
}

// 调试配置
export const DEBUG = {
  // 是否启用调试日志
  ENABLED: true,
  // 是否在控制台打印埋点数据
  LOG_EVENTS: true,
  // 是否打印上传详情
  LOG_UPLOAD: true
}

export default {
  ANALYTICS_ENABLED,
  PANTRY_CONFIG,
  STORAGE_KEYS,
  UPLOAD_STRATEGY,
  RETRY_CONFIG,
  RETENTION_POLICY,
  DEBUG
}
