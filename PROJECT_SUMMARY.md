# 摸鱼热搜 - 项目总结

> **最后更新时间**: 2026-10-23
> **当前版本**: 2.1.0

---

## 📋 项目概述

**摸鱼热搜** 是一个专为 uTools 设计的热搜聚合插件：52 平台一站式浏览，配合内置浏览器小窗（无痕摸鱼）、老板键一键隐藏、站点净化、自动静音、跨平台收藏与 AI 翻译。

### 核心特性
- 🏠 **聚合首页**：左侧平台栏 + 钉住平台聚合卡片，一屏看遍
- 🐟 **摸鱼小窗**：内置 ubrowser 打开热搜，不占任务栏、不留历史，尺寸/透明度/置顶/静音可调
- 🛡️ **老板键**：`` Ctrl+` `` / uTools 全局快捷键，一键隐藏所有摸鱼窗口
- 🧹 **站点净化**：知乎/微信公众号/GitHub/掘金等 10 站自动去侧栏、加宽正文
- ⭐ **我的收藏**：跨平台收藏流
- 🤖 **AI 翻译**：芝加哥艺术学院、GitHub热榜、Hacker News（utools AI + 本地缓存）
- ⌨️ **完整键盘流**：←→ 切平台、↑↓/1-9 选条、Enter 打开、c 复制、f 收藏
- 🌙 **暗色主题**：自动 / 亮色 / 暗色
- 🏗️ **模块化架构**：Vue 3 组合式 API + Pinia + Composables

---

## 🛠️ 技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| Vue.js | ^3.5.13 | 渐进式 JavaScript 框架 |
| Vite | ^6.0.11 | 构建工具 |
| Pinia | ^3.0.4 | 状态管理 |
| vue-remix-icons | ^3.5.0 | 图标库（按需加载） |
| DailyHotApi | 打包内置 | 热搜数据源（preload 中启动本地服务 :6688） |
| uTools API | - | ubrowser / AI / 全局快捷键 / 本地存储 |

---

## 🏗️ 架构设计

### 视图层

| 模块 | 职责 |
|------|------|
| `src/HotSearch/index.vue` | 主视图：聚合首页 / 平台榜单 / 收藏切换、键盘流、翻译、老板键入口 |
| `src/components/AggregateHome.vue` | 聚合首页卡片（常显 5 条、悬停滚轮、展开 50 条、拖拽排序） |
| `src/components/PlatformSidebar.vue` | 左侧平台栏（分类、钉住、老板键/翻译/刷新/设置/打赏按钮） |
| `src/components/FavoritesView.vue` | 跨平台收藏流 |
| `src/Settings/index.vue` | 设置面板（显示选项 / 主题 / 摸鱼小窗 / 平台显示 / 快捷键说明） |
| `src/components/ArtworkCard.vue` 等 | 芝加哥艺术学院、Epic 等特殊平台的卡片式渲染 |

### 状态管理（Pinia Stores）

- `stores/settingsStore.js` - 设置项持久化（utools dbStorage 优先，localStorage 降级）、设置变更事件总线（当前唯一接入的 store）
- `stores/hotSearchStore.js` - 热搜数据状态（预留，与 `composables/usePlatform.js`、`useInfiniteScroll.js` 一样尚未接入视图，主视图自管理状态）

### 数据层（三级回退）

`services/hotSearchApi.js` 数据源链：

1. **本地 DailyHotApi** - `public/preload/hot-api.cjs`（esbuild 打包的 DailyHotApi）在 preload Node 环境启动，`http://localhost:6688`
2. **uapis.cn** - 远程热榜聚合
3. **api-hot.imsyy.com** - DailyHotApi 公共实例

任一环节失败自动降级；`services/platforms/` 下是艺术、Epic 等平台的自定义抓取（官方 API / 多代理）。

### 关键工具（src/utils/）

| 模块 | 职责 |
|------|------|
| `bossKey.js` | 老板键：收集所有小窗实例，hide/show 链式调用 + 主窗口隐藏 |
| `openUrl.js` | 小窗打开三级降级（ubrowser → 系统浏览器）+ 小窗配置 |
| `siteRules.js` | 站点净化规则（10 站：去侧栏、加宽正文、自动静音注入） |
| `favorites.js` | 收藏读写 |
| `cacheManager.js` | 平台级数据缓存（高频平台缓存更短） |
| `dataMirror.js` | 镜像降级提示（缓存滞后角标） |
| `storage.js` | 统一存储层（utools 优先） |

### 埋点系统（src/services/analytics/）

- `analyticsCollector.js` - 优先级队列 + 批量上传（20 条或 10 分钟）
- `pantryClient.js` - Pantry 云端 API 客户端（429 智能重试）
- `viewTracker.js` - 平台停留时长（pv）
- `eventTypes.js` - 事件类型定义（含老板键 trigger/action 维度）
- 退出时本地缓存兜底，下次启动补传；仅聚合统计，无个人身份信息

### Preload（public/preload/）

- `services.js` - 注入 `window.services`（文件读写、下载）+ 启动本地热榜 API
- `hot-api.cjs` - DailyHotApi 打包版（本地数据源）

---

## 📁 项目结构

```
├── src/
│   ├── HotSearch/              # 主视图
│   ├── Settings/               # 设置面板
│   ├── components/             # 聚合首页 / 侧栏 / 收藏 / 卡片组件
│   ├── composables/            # usePlatform / useInfiniteScroll（预留未接入）
│   ├── config/                 # icons / pantry / collect 配置
│   ├── directives/             # 图片懒加载
│   ├── services/
│   │   ├── hotSearchApi.js     # 三级回退数据源
│   │   ├── analytics/          # 埋点
│   │   └── platforms/          # 自定义平台抓取
│   ├── stores/                 # Pinia
│   └── utils/                  # bossKey / openUrl / siteRules 等
├── public/
│   ├── preload/                # uTools preload（含本地 DailyHotApi）
│   └── plugin.json             # uTools 插件配置（hotsearch / boss 双入口）
├── docs/                       # 设计文档（UX-REDESIGN / FISH-WINDOW-2.0 / IMPLEMENTATION）
└── dist/                       # 构建产物（gitignore）
```

---

## 🚀 快速开始

```bash
npm install        # 安装依赖
npm run dev        # 开发模式（http://localhost:5173，uTools 开发者模式接入）
npm run build      # 生产构建（dist/）
npm run format     # Prettier 格式化
```

uTools 本地调试：设置 → 开发者模式 → 安装本地插件 → 选择项目目录（`plugin.json` 已配置 `development.main` 指向 localhost:5173）。

### 代码风格

- 单引号、无分号、2 空格缩进，Prettier 统一格式化（`npm run format`）
- 变量/函数 camelCase，组件 PascalCase
- 生产构建自动移除调试日志（`API.DEBUG` 跟随 `import.meta.env.DEV`）

---

### 版权与合规 📜

#### 芝加哥艺术学院平台
- **数据来源**：芝加哥艺术学院 API
- **版权状态**：仅展示公有领域（Public Domain）艺术品
- **筛选条件**：`is_public_domain: true`
- **官方文档**：[https://api.artic.edu/docs/](https://api.artic.edu/docs/)

#### 热搜数据聚合
- **数据来源**：内置本地 DailyHotApi / uapis.cn / api-hot.imsyy.com 三级回退
- **数据性质**：实时聚合各公开平台热搜
- **使用限制**：仅用于展示，版权归原作者平台

所有 API 信息可在 设置页 → 数据来源 & 免责声明 中查看。

---

## 🐛 已知问题

1. **API 依赖**：部分平台依赖第三方 API，可能不稳定（三级回退缓解）
2. **翻译功能**：需要用户在 uTools 中配置 AI 模型
3. **网络限制**：部分平台可能存在网络访问限制

---

## 📝 最近更新

- **2026-10-21 - v2.1.0**：全新界面（侧栏 + 聚合首页 + 钉住）、摸鱼小窗体系、老板键、站点净化、我的收藏、键盘流，详见 [CHANGELOG.md](CHANGELOG.md)
- **2026-10-23**：快捷键修复（单字母/数字键排除修饰键组合，不再误吞 Ctrl+C 等系统快捷键）

---

## 🔗 相关链接

- [uTools 官方文档](https://www.u-tools.cn/docs/developer/welcome.html)
- [Vue 3 文档](https://vuejs.org/) / [Vite](https://vitejs.dev/) / [Pinia](https://pinia.vuejs.org/)
- [DailyHotApi](https://github.com/imsyy/DailyHotApi)
- [芝加哥艺术学院 API](https://api.artic.edu/docs/)

---

## 📄 许可证

MIT License
