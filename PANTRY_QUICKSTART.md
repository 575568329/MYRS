# Pantry 埋点系统 - 快速启动指南

## ✅ 已完成的配置

### 1. 配置文件
- [x] [src/config/pantryConfig.js](src/config/pantryConfig.js) - Pantry API 配置
  - API 基础地址：`https://getpantry.cloud/apiv1`
  - 调试模式：已启用
  - 上传策略：**20条批量或10分钟强制上传**（优化后）
  - 速率限制处理：智能重试机制

### 2. 核心文件
- [x] [src/services/analytics/eventTypes.js](src/services/analytics/eventTypes.js) - 事件类型定义
  - 支持驼峰和下划线式参数名
  - 数据清洗和序列化
- [x] [src/services/analytics/pantryClient.js](src/services/analytics/pantryClient.js) - Pantry API 客户端
  - 自动合并现有数据
  - 429 速率限制智能处理
- [x] [src/services/analytics/analyticsCollector.js](src/services/analytics/analyticsCollector.js) - 埋点收集器
  - 优先级队列管理
  - 上传冷却机制
- [x] [src/services/analytics/index.js](src/services/analytics/index.js) - 统一导出

### 3. UI 组件
- [x] [src/components/AnalyticsDebugPanel.vue](src/components/AnalyticsDebugPanel.vue) - 调试面板
  - 📊 **统计分析可视化**（事件分布、热门平台、活动趋势）
  - 🌐 远程数据加载和展示
  - 📥 数据导出功能

### 4. 集成
- [x] [src/main.js](src/main.js) - 自动初始化埋点系统
- [x] [src/HotSearch/index.vue](src/HotSearch/index.vue) - 已集成埋点追踪
  - 平台切换、链接点击、刷新、加载更多等

## 🚀 使用步骤

### 第一步：获取 Pantry Key

1. 访问 [https://getpantry.cloud](https://getpantry.cloud)
2. 点击 **"Get Started"** 或 **"Sign Up"** 注册账号（支持 Google/GitHub 登录）
3. 注册后会自动创建一个 Pantry，复制你的 **Pantry Key**

示例 Pantry Key 格式：
```
a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6
```

### 第二步：配置 Pantry Key

**方式一：使用环境变量（推荐）**

在项目根目录创建 `.env` 文件：
```bash
VITE_PANTRY_KEY=你的Pantry_Key
VITE_ANALYTICS_ENABLED=true
VITE_DEBUG_MODE=true
```

**方式二：直接修改配置文件**

编辑 [src/config/pantryConfig.js](src/config/pantryConfig.js)：
```javascript
export const PANTRY_CONFIG = {
  KEY: '你的Pantry_Key', // 替换这里
  BASKET: {
    ANALYTICS: 'newBasket88',  // 你的 basket 名称
    // ...
  }
}
```

### 第三步：启动应用

```bash
npm run dev
```

### 第四步：使用调试面板

1. 在 uTools 中打开应用
2. 在设置中打开 **埋点调试面板**
3. 可以：
   - 📊 查看统计分析（事件分布、热门平台排行、活动趋势）
   - 🌐 加载远程数据并查看
   - 📤 手动上传缓存的事件
   - 🗑️ 清空本地队列
   - 📥 导出数据为 JSON

### 第五步：在 Pantry 网站查看数据

1. 访问 [https://getpantry.cloud](https://getpantry.cloud)
2. 登录你的账号
3. 找到你的 Pantry
4. 查看 `newBasket88` basket 中的数据

或者直接访问：
```
https://getpantry.cloud/apiv1/pantry/你的Pantry_Key/basket/newBasket88
```

## 📊 新增功能

### 统计分析可视化

调试面板现在包含完整的统计分析：

#### 1️⃣ 事件类型分布
- 显示所有事件类型的数量和百分比
- 可视化进度条展示占比
- 自动按频率排序

#### 2️⃣ 热门平台排行
- 用户切换最多的平台 TOP 10
- 金银铜牌样式
- 平台名称中文显示

#### 3️⃣ 平台点击排行
- 用户点击链接最多的平台
- 了解用户最感兴趣的内容来源

#### 4️⃣ 最近 7 天活动趋势
- 柱状图展示每日活跃度
- 直观查看用户使用频率

### 数据自动合并

- 多用户数据自动叠加到同一个 JSON
- 智能合并 `events` 数组
- 不会覆盖或丢失历史数据

### 速率限制优化

- **智能重试**：遇到 429 错误自动延长重试间隔
- **跳过 GET**：429 后后续重试直接 POST，减少请求
- **上传冷却**：3秒冷却时间，避免频繁请求
- **批量优化**：20条批量上传，减少 API 调用

## 📖 API 使用说明

### Pantry API 端点

#### 1. 获取 Pantry 信息
```http
GET https://getpantry.cloud/apiv1/pantry/{key}
```

#### 2. 获取 Basket 数据
```http
GET https://getpantry.cloud/apiv1/pantry/{key}/basket/{basketName}
```

#### 3. 更新/创建 Basket
```http
POST https://getpantry.cloud/apiv1/pantry/{key}/basket/{basketName}
Content-Type: application/json

{
  "events": [
    {
      "type": "platform_switch",
      "timestamp": 1706942400000,
      "priority": "medium",
      "data": {
        "from_platform": "weibo",
        "to_platform": "baidu",
        "user_id": "user_123",
        "session_id": "session_456"
      }
    }
  ]
}
```

### 数据格式示例

上传到 Pantry 的数据格式：
```json
{
  "events": [
    {
      "type": "platform_switch",
      "timestamp": 1706942400000,
      "priority": "medium",
      "data": {
        "from_platform": "weibo",
        "to_platform": "baidu",
        "user_id": "user_1234567890_abc123",
        "session_id": "session_1234567890_def456"
      }
    },
    {
      "type": "open_link",
      "timestamp": 1706942410000,
      "priority": "medium",
      "data": {
        "platform": "baidu",
        "url": "https://example.com"
      }
    }
  ]
}
```

## 📦 自动追踪的事件

| 事件 | 触发时机 | 优先级 |
|------|----------|--------|
| `app_start` | 应用启动 | HIGH |
| `app_foreground` | 应用进入前台 | HIGH |
| `app_background` | 应用进入后台 | MEDIUM |
| `app_close` | 应用关闭 | MEDIUM |
| `platform_switch` | 切换热搜平台 | MEDIUM |
| `platform_load_start` | 平台数据加载开始 | LOW |
| `platform_load_success` | 平台数据加载成功 | LOW |
| `platform_load_error` | 平台数据加载失败 | HIGH |
| `load_more` | 加载更多数据 | MEDIUM |
| `refresh` | 刷新当前平台 | MEDIUM |
| `item_click` | 点击热搜项 | MEDIUM |
| `favorite_toggle` | 收藏/取消收藏 | MEDIUM |
| `open_link` | 打开链接 | MEDIUM |
| `copy_content` | 复制内容 | LOW |
| `search` | 搜索操作 | MEDIUM |
| `category_switch` | 切换分类 | LOW |
| `filter_change` | 筛选器变更 | LOW |
| `settings_open` | 打开设置 | LOW |
| `error` | 发生错误 | HIGH |

## 🔧 配置选项

### 上传策略

在 [src/config/pantryConfig.js](src/config/pantryConfig.js) 中配置：

```javascript
export const UPLOAD_STRATEGY = {
  BATCH_SIZE: 20,               // 批量上传：收集20条埋点后上传
  MAX_INTERVAL: 10 * 60 * 1000, // 时间间隔：最长等待10分钟
  MAX_SIZE: 100 * 1024          // 单次上传最大数据大小（100KB）
}

export const RETRY_CONFIG = {
  MAX_RETRIES: 5,        // 最大重试次数（应对速率限制）
  RETRY_DELAY: 1000,     // 基础重试延迟（1秒）
  BACKOFF_FACTOR: 2      // 指数退避因子
}
```

### Basket 配置

```javascript
BASKET: {
  ANALYTICS: 'newBasket88',      // 主埋点数据 basket
  SESSIONS: 'user_sessions',     // 用户会话 basket
  ERRORS: 'error_logs'           // 错误日志 basket
}
```

## 🎯 高级用法

### 手动追踪事件

```javascript
import { trackEvent, EventType } from './services/analytics'

// 追踪平台切换
trackEvent(EventType.PLATFORM_SWITCH, {
  from_platform: '微博',
  to_platform: '百度'
})

// 追踪自定义事件
trackEvent('custom_event', {
  custom_param: 'value',
  user_action: 'clicked_button'
})
```

### 获取统计信息

```javascript
import { getAnalyticsStats } from './services/analytics'

const stats = getAnalyticsStats()
console.log(stats)
// {
//   totalEvents: 150,
//   highPriority: 5,
//   mediumPriority: 45,
//   lowPriority: 100,
//   userId: "user_123",
//   sessionId: "session_456",
//   isInitialized: true
// }
```

### 直接访问 Pantry 客户端

```javascript
import { pantryClient } from './services/analytics/pantryClient.js'

// 获取所有埋点数据
const data = await pantryClient.getAnalyticsData()

// 手动上传数据
await pantryClient.uploadAnalyticsData(events)

// 清空 basket
await pantryClient.clearBasket('newBasket88')
```

## ⚠️ 注意事项

### API 速率限制

- **免费限制**：Pantry 免费版有请求频率限制
- **429 错误处理**：系统已实现智能重试机制
  - 遇到 429 时延迟增加（5秒、10秒、20秒）
  - 后续重试会跳过 GET 请求，直接 POST
  - 最多重试 5 次
- **避免频繁请求**：
  - 批量大小设为 20 条
  - 最长间隔 10 分钟
  - 上传冷却 3 秒

### 数据限制

- **存储限制**：Pantry 免费版有存储限制，建议定期清理旧数据
- **不活跃删除**：Pantry 会自动删除长期不活跃的数据
- **单次请求大小**：建议单次上传不超过 100KB

### 隐私保护

- 用户 ID 是匿名生成的（UUID 格式）
- 不包含任何个人身份信息（PII）
- 数据仅用于行为分析
- `sanitizeData()` 会自动过滤敏感字段

### 错误处理

- 上传失败时事件会保留在本地队列中
- 自动重试机制（最多 5 次）
- 本地数据持久化到 utools 存储

## 🐛 调试技巧

### 查看详细日志

1. 打开浏览器控制台（F12）
2. 所有埋点操作都会以 `[Analytics]` 或 `[Pantry]` 前缀输出
3. 关键日志：
   ```
   [Analytics] 📝 trackEvent 被调用: platform_switch
   [Analytics] ➕ 添加中优先级事件: platform_switch (队列车: 10)
   [Analytics] ✅ 达到批量上传阈值 (20/20)，准备上传...
   [Pantry] 🚀 准备上传 20 个埋点事件
   [Pantry] ✅ 埋点数据上传成功
   ```

### 测试上传流程

1. 打开埋点调试面板
2. 切换 20 次平台（产生 20 个事件）
3. 观察控制台日志，看到 "达到批量上传阈值"
4. 确认上传成功
5. 点击 **🌐 加载远程数据**
6. 点击 **📊 显示统计分析** 查看统计图表

### 清空数据

在调试面板中：
- **🗑️ 清空队列**：清空本地缓存的事件
- 或使用控制台：
  ```javascript
  // 清空远程数据
  await pantryClient.clearBasket('newBasket88')
  ```

## 📚 相关文档

- [Pantry 官方文档](https://documenter.getpostman.com/view/3281832/SzmZeMLC)
- [Pantry GitHub](https://github.com/imRohan/Pantry)
- [项目配置文件](src/config/pantryConfig.js)

## 🆘 常见问题

### Q: unknown 为什么排名第一？

A: 这通常是因为：
1. 之前上传的事件数据为空（`data` 字段缺失）
2. 查看控制台日志确认事件数据结构
3. 新生成的事件会正确包含平台信息

**解决方法**：
- 清空远程数据（`clearBasket`）
- 重新产生一些埋点事件
- 等待自动上传后重新查看统计

### Q: 上传失败怎么办？

A: 检查以下几点：
1. Pantry Key 是否正确配置
2. 网络连接是否正常
3. 是否频繁触发导致 API 速率限制

系统会自动重试，无需手动干预。

### Q: 如何清空所有数据？

A:
1. 在调试面板点击 **🗑️ 清空队列** 清空本地缓存
2. 在浏览器控制台执行：
   ```javascript
   await pantryClient.clearBasket('newBasket88')
   ```
3. 或直接在 Pantry 网站删除 basket

### Q: 数据会丢失吗？

A:
1. 本地队列会持久化到 utools 存储
2. 上传失败会自动重试（最多 5 次）
3. 建议定期导出备份重要数据

### Q: 如何添加新的埋点事件？

A:
1. 在 [src/services/analytics/eventTypes.js](src/services/analytics/eventTypes.js) 中定义事件类型
2. 在代码中使用 `trackEvent()` 追踪事件
3. 如果是高频事件，使用 `LOW` 优先级
4. 如果是关键事件，使用 `HIGH` 优先级

## 🎉 完成！

现在你的项目已经成功集成了 Pantry 埋点系统！

✨ **主要特性**：
- 📊 可视化统计分析
- 🌐 云端数据存储
- 🔄 智能数据合并
- ⚡ 自动批量上传
- 🛡️ 速率限制保护

开始收集用户行为数据，优化你的应用吧！
