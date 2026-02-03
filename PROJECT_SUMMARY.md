# 摸鱼热搜 - 项目总结

> **最后更新时间**: 2026-02-03
> **当前版本**: 1.0.0

---

## 📋 项目概述

**摸鱼热搜** 是一个专为 uTools 设计的热搜聚合插件，支持多个热门平台的一站式查看，包括微博、知乎、抖音、B站等主流平台，以及芝加哥艺术学院、大都会博物馆等特色平台。

### 核心特性
- 🎯 **一站式聚合**：50+ 热门平台，一个插件全掌握
- ⚡ **实时更新**：支持手动刷新和自动刷新
- 🌙 **深色模式**：跟随系统主题自动切换
- 🎨 **极简/分类模式**：两种显示模式自由切换
- 🤖 **AI翻译**：集成 utools AI，支持智能翻译
- 📱 **响应式设计**：完美适配各种屏幕尺寸
- 🏗️ **模块化架构**：Pinia 状态管理 + Composables 代码复用

---

## 🛠️ 技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| Vue.js | ^3.5.13 | 渐进式JavaScript框架 |
| Vite | ^6.0.11 | 下一代前端构建工具 |
| Pinia | ^3.0.4 | Vue 官方状态管理库 |
| @vueuse/core | ^11.0.0 | Vue Composition API 工具集 |
| vue-remix-icons | ^3.16.0 | Remix Icon 图标库 |
| utools-api-types | ^7.5.1 | uTools API 类型定义 |
| ESLint | ^9.0.0 | 代码检查工具 |
| Prettier | ^3.2.0 | 代码格式化工具 |
| Terser | ^5.30.0 | JavaScript 代码压缩工具 |

---

## 📊 支持平台列表

### 🎬 视频/社区 (7个)
- B站、AcFun、抖音、快手
- 微博、知乎、知乎日报

### 🎮 游戏 (4个)
- 英雄联盟、原神、崩坏3、星穹铁道

### 💻 科技/IT (10个)
- IT之家、IT之家·喜加一、少数派、掘金、36氪
- V2EX、CSDN、51CTO、NodeSeek、吾爱破解、主机交流、酷安

### 📰 新闻/资讯 (7个)
- 百度、澎湃新闻、今日头条、腾讯新闻
- 新浪热搜、新浪新闻、网易新闻、虎嗅、爱范儿

### 📚 阅读 (2个)
- 微信读书、追书排行

### 🎭 艺术 (2个)
- **芝加哥艺术学院** - 艺术品浏览平台（公有领域）
- **大都会博物馆** - 艺术品浏览平台（支持中国作品筛选）

### 🏀 其他 (2个)
- 虎扑、豆瓣电影、豆瓣小组、贴吧、NGA、HelloGitHub、简书、果壳

**总计**: 50+ 平台

---

## ✨ 最新功能特性

### 1. 芝加哥艺术学院平台 🎨
- 🖼️ **艺术品浏览**：展示来自芝加哥艺术学院博物馆的艺术藏品
- 📝 **详细信息**：包含艺术家、创作日期、媒介、产地等信息
- 🖼️ **高清图片**：使用官方 IIIF 图片API，支持高质量图片展示
- 📄 **分页加载**：支持滚动加载更多艺术品
- 🔗 **快捷跳转**：点击查看大图或详情页
- 🆕 **缓存机制**：智能缓存优化，支持预加载下一页

### 2. 大都会博物馆平台 🏛️
- 🌍 **全球艺术品**：展示大都会博物馆的丰富艺术收藏
- 🏮 **中国作品筛选**：支持按地理位置筛选中国艺术品
  - 使用 `geoLocation=China` 参数精准筛选
  - 一键切换全部作品/中国作品
- 🎯 **智能去重**：自动过滤同页重复标题的艺术品
- 🔄 **实时数据**：无缓存机制，每次获取最新数据
- 🤖 **AI翻译**：完整支持翻译功能（与芝加哥艺术学院一致）
- 📊 **详细信息**：艺术家、日期、媒介、部门、文化等完整信息
- 🖼️ **高质量图片**：优先使用小图，支持大图备用

### 3. AI智能翻译功能 🤖
- 🌐 **智能分批**：每次最多翻译200个艺术品
- 📊 **进度显示**：按钮上实时显示翻译进度（如：50/100）
- ⏱️ **旋转动画**：翻译中沙漏图标持续旋转
- ✅ **确认提示**：翻译前提示AI能量消耗和翻译数量
- 🔄 **增量翻译**：支持继续翻译下一批
- ✅ **完成提示**：所有数据翻译完成后提示用户

#### 翻译操作说明
- **单击翻译按钮**：继续翻译下一批（最多200个）
- **翻译完成后点击**：提示所有数据已翻译，可选择重新开始
- **按钮显示**：实时显示已翻译数量（如：50/100）

### 4. 追书神器小说排行榜 📚
- 📖 **小说排行**：展示热门小说排行
- 🔗 **详情跳转**：点击查看小说详情
- 📄 **分页加载**：支持加载更多小说

---

## 🏗️ 架构设计 ⭐NEW

### 状态管理 (Pinia Stores)
```
src/stores/
├── settingsStore.js      # 设置状态管理
│   ├── 主题模式 (light/dark/auto)
│   ├── UI 偏好 (热度值、描述显示)
│   └── 平台顺序管理 (拖拽排序)
└── hotSearchStore.js     # 热搜数据状态管理
    ├── 当前平台/分类
    ├── 数据加载状态
    ├── 翻译状态管理
    └── 平台筛选状态
```

### 组合式函数 (Composables)
```
src/composables/
├── usePlatform.js        # 平台切换逻辑
│   ├── 平台切换
│   ├── 分类切换
│   └── 标签滚动控制
└── useInfiniteScroll.js  # 无限滚动加载
    └── 滚动到底部自动加载更多
```

### 平台 API 模块化
```
src/services/platforms/
├── index.js              # 统一导出
├── hotboardApi.js        # 热搜聚合 API
├── articApi.js           # 芝加哥艺术学院 API
├── metmuseumApi.js       # 大都会博物馆 API
└── zhuishuApi.js         # 追书神器 API
```

### 工具函数
```
src/utils/
├── cacheManager.js       # 缓存管理器
│   ├── 缓存存储/读取
│   ├── 缓存过期检查
│   └── 缓存清理
├── apiHelper.js          # API 辅助函数
│   └── API 响应处理
└── requestHelper.js      # 请求辅助函数
    └── 网络请求封装
```

### 自定义指令
```
src/directives/
└── lazyLoad.js           # 图片懒加载指令
```

---

## 🎯 核心功能模块

### 1. 热搜聚合
- 多平台热搜数据实时获取
- 支持分类浏览和极简模式
- 自定义平台顺序（拖拽排序）

### 2. 数据缓存
- 智能缓存机制，减少API请求
- 芝加哥艺术学院：60分钟缓存 + 预加载
- 大都会博物馆：无缓存（实时数据）
- 缓存过期自动清理
- 支持手动刷新

### 3. 数据去重
- **大都会博物馆**：单页标题去重，避免重复展示
- 标准化处理：小写转换 + 空格修剪
- 详细日志：显示去重前后的数量变化

### 4. UI/UX
- 响应式设计，适配各种设备
- 深色模式支持（跟随系统）
- 流畅的动画效果
- 悬浮操作按钮组
- 艺术品卡片式布局（芝加哥艺术学院、大都会博物馆）
- 筛选按钮组（大都会博物馆）
- 图片懒加载优化

### 5. 设置管理
- 显示/隐藏热搜值
- 显示/隐藏描述信息
- 主题模式切换（自动/亮色/暗色）
- 自定义平台顺序（拖拽排序）
- 平台显示/隐藏控制（点击眼睛图标切换）⭐NEW
- 重置为默认设置

---

## 📁 项目结构

```
摸鱼热搜/
├── public/                    # 静态资源
│   └── preload/              # 预加载脚本
├── src/
│   ├── HotSearch/            # 热搜主组件
│   │   └── index.vue         # 热搜列表页面
│   ├── Settings/             # 设置面板
│   │   └── index.vue         # 设置组件
│   ├── components/           # 公共组件
│   │   ├── RemixIcon.vue     # 图标组件
│   │   ├── PlatformIcon.vue  # 平台图标
│   │   ├── ArtworkCard.vue   # 艺术品卡片
│   │   └── ArtworkListItem.vue  # 艺术品列表项
│   ├── composables/          # 组合式函数 ⭐NEW
│   │   ├── usePlatform.js    # 平台切换逻辑
│   │   └── useInfiniteScroll.js  # 无限滚动
│   ├── directives/           # 自定义指令 ⭐NEW
│   │   └── lazyLoad.js       # 图片懒加载
│   ├── services/             # 业务逻辑
│   │   ├── platforms/        # 平台 API 模块 ⭐NEW
│   │   │   ├── index.js      # 统一导出
│   │   │   ├── hotboardApi.js    # 热搜聚合
│   │   │   ├── articApi.js       # 芝加哥艺术学院
│   │   │   ├── metmuseumApi.js   # 大都会博物馆
│   │   │   └── zhuishuApi.js     # 追书神器
│   │   └── hotSearchApi.js  # API 调用（兼容层）
│   ├── stores/               # 状态管理 ⭐NEW
│   │   ├── settingsStore.js  # 设置状态
│   │   └── hotSearchStore.js # 热搜状态
│   ├── utils/                # 工具函数 ⭐NEW
│   │   ├── cacheManager.js   # 缓存管理
│   │   ├── apiHelper.js      # API 辅助
│   │   └── requestHelper.js  # 请求辅助
│   ├── config.js             # 配置文件
│   ├── App.vue               # 根组件
│   └── main.js               # 入口文件
├── .eslintrc.cjs             # ESLint 配置 ⭐NEW
├── .prettierrc               # Prettier 配置 ⭐NEW
├── .prettierignore           # Prettier 忽略 ⭐NEW
├── package.json              # 项目配置
├── vite.config.js            # Vite 配置
├── PROJECT_SUMMARY.md        # 项目总结（本文件）
└── README.md                 # 项目说明
```

---

## 🚀 快速开始

### 安装依赖
```bash
npm install
```

### 开发模式
```bash
npm run dev
```

### 代码检查与格式化
```bash
# 运行 ESLint 检查并修复
npm run lint

# 仅检查不修复
npm run lint:check

# 格式化代码
npm run format
```

### 构建生产版本
```bash
npm run build
```

### 在 uTools 中测试
1. 打开 uTools
2. 进入 `设置` -> `开发者模式`
3. 点击 `安装本地插件`
4. 选择本项目文件夹
5. 输入"热搜"、"热榜"或"hot"唤醒插件

---

## 📝 最近更新记录

### 2026-02-03 - 平台显示/隐藏控制功能 👁️⭐NEW

#### 新增功能
- ✅ **平台显示/隐藏控制**
  - 在设置页面为每个平台添加眼睛图标开关
  - 点击 👁️ 可隐藏平台，点击 👁️‍🗨️ 可显示平台
  - 隐藏的平台在列表中显示为半透明并带有删除线
  - 隐藏的平台不会在主页面的平台标签中显示
- ✅ **持久化存储**
  - 隐藏平台列表自动保存到本地存储
  - 刷新页面后设置保持不变
  - 支持重置为默认设置（显示所有平台）
- ✅ **实时同步**
  - 设置变更后立即生效
  - 通过 CustomEvent 实现组件间通信
  - Pinia watch 监听自动触发事件

#### 技术实现
- **状态管理**：
  - `hiddenPlatforms` - Set 数据结构存储隐藏平台ID
  - `togglePlatformVisibility()` - 切换平台可见性
  - `isPlatformVisible()` - 检查平台是否可见
- **本地存储**：
  - 新增 `STORAGE_KEYS.HIDDEN_PLATFORMS` 存储键
  - 自动序列化/反序列化 Set 对象
- **过滤逻辑**：
  - `filteredPlatforms` 计算属性中过滤隐藏平台
  - 支持极简模式和分类模式

#### 交互优化
- 眼睛图标悬停效果
- 隐藏平台视觉反馈（半透明 + 删除线）
- 点击事件阻止冒泡，避免触发拖拽
- 完整的暗色模式适配

#### 影响范围
- [config.js](src/config.js:116) - 新增隐藏平台存储键
- [stores/settingsStore.js](src/stores/settingsStore.js:23) - 状态管理
- [Settings/index.vue](src/Settings/index.vue:56) - UI交互
- [HotSearch/index.vue](src/HotSearch/index.vue:73) - 过滤逻辑

---

### 2026-02-03 - 架构重构与代码质量提升 🏗️

#### 架构升级
- ✅ **引入 Pinia 状态管理**
  - 将设置和热搜数据分离到独立 stores
  - `settingsStore.js` - 主题、UI偏好、平台顺序
  - `hotSearchStore.js` - 平台数据、翻译状态、筛选状态
  - 替代原有的 Options API 状态管理

- ✅ **Composables 代码复用**
  - `usePlatform.js` - 平台切换、分类切换、标签滚动
  - `useInfiniteScroll.js` - 无限滚动加载
  - 提取可复用逻辑，提升代码可维护性

- ✅ **平台 API 模块化**
  - 将各平台 API 拆分到独立文件
  - `hotboardApi.js` - 热搜聚合
  - `articApi.js` - 芝加哥艺术学院
  - `metmuseumApi.js` - 大都会博物馆
  - `zhuishuApi.js` - 追书神器
  - 统一从 `index.js` 导出

- ✅ **工具函数提取**
  - `cacheManager.js` - 缓存管理器
  - `apiHelper.js` - API 辅助函数
  - `requestHelper.js` - 请求辅助函数
  - 提升代码复用性和可测试性

- ✅ **自定义指令**
  - `lazyLoad.js` - 图片懒加载指令
  - 优化艺术品图片加载性能

#### 代码质量提升
- ✅ **ESLint 配置**
  - 添加 Vue 3 推荐规则
  - 配置代码质量检查（eqeqeq、no-var、prefer-const）
  - 代码风格统一（单引号、无分号）
  - 生产环境禁用 console 和 debugger

- ✅ **Prettier 配置**
  - 统一代码格式化规则
  - ESLint 集成，自动修复格式问题

- ✅ **Terser 优化**
  - 生产构建代码压缩和混淆
  - 移除 console 和 debugger

#### 性能优化
- 图片懒加载指令
- 缓存机制优化
- 请求超时控制
- 并发请求限制

---

### 2026-02-03 - 大都会博物馆平台上线 🏛️

#### 新增功能
- ✅ **大都会博物馆平台完整集成**
  - 使用官方 Collection API 获取艺术品数据
  - 支持 `geoLocation` 参数精准筛选地理位置
  - API 地址：`https://collectionapi.metmuseum.org/public/collection/v1/search`
  - 官方文档：[Met Museum Collection API](https://metmuseum.org/developers/digital-body/metmuseum-collection-api)
- ✅ **中国作品筛选功能**
  - 筛选按钮组：🌍 全部作品 / 🏮 中国作品
  - 使用 `geoLocation=China` 参数精准筛选
  - 切换筛选时自动重置页码和翻译状态
- ✅ **智能去重功能**
  - 单页标题去重，避免重复展示
  - 标准化处理：小写转换 + 空格修剪
  - 详细日志显示过滤效果
- ✅ **翻译功能完整支持**
  - 支持大都会博物馆艺术品的AI翻译
  - 与芝加哥艺术学院功能完全一致
  - 批量翻译、进度显示、状态重置
- ✅ **无缓存设计**
  - 实时获取最新数据
  - 不使用缓存，确保数据新鲜度
  - 优化请求超时和错误处理

#### 技术实现
- **API调用**：
  - 搜索API：`/search?q=*&hasImages=true&geoLocation=China`
  - 详情API：`/objects/{objectId}`
  - 并发请求50个艺术品详情，每个5秒超时
- **数据过滤**：
  - 仅显示有主图片的艺术品 (`primaryImage`)
  - 仅显示公有领域艺术品 (`isPublicDomain`)
  - 标题去重（单页级别）
- **状态管理**：
  - 筛选条件：`metMuseumFilter` (all/china)
  - 切换平台时自动重置筛选
  - 切换筛选时重置翻译偏移量

#### 交互优化
- 筛选按钮组采用卡片式设计
- 支持暗色模式
- 悬停效果和激活状态
- 平台切换时智能重置状态

#### 已知限制
- **去重范围**：仅支持单页去重，跨页重复无法过滤
- **分页影响**：去重后实际数据可能少于pageSize
- **API限制**：每次请求50个ID，需要单独获取详情

---

### 2026-02-03 - 上线前代码审查与优化 ✅

#### 🔧 必须修复的问题 (已完成)
- ✅ **修复调试函数递归引用错误** (index.vue:12)
  - 将 `debug.log(...args)` 修正为 `console.log(...args)`
  - 避免死循环风险
- ✅ **删除临时文件**
  - 删除根目录临时文件 `nul`
  - 删除未使用的增强版组件 `index_enhanced.vue`
- ✅ **确认生产环境配置**
  - 验证 `DEBUG: false` 配置正确
  - 确保生产环境不输出调试日志

#### 📊 代码审查结果
- **项目结构**: ✅ 良好 (B+)
- **代码质量**: ✅ 良好 (B+)
- **安全性**: ⚠️ 需关注 (C)
- **性能优化**: ✅ 良好 (B+)
- **可维护性**: ✅ 良好 (B)

#### ⚠️ 后续优化建议 (可选)
1. HTML 解析安全性增强 (XSS 防护)
2. AI 调用频率限制机制
3. 添加单元测试覆盖
4. 考虑引入 TypeScript

---

### 2026-02-03 - 版权保护与API透明化更新 🔒

#### 功能优化
- 🔒 **版权保护**：芝加哥艺术学院平台仅获取公有领域（Public Domain）艺术品
  - API筛选：`is_public_domain: true`
  - 避免版权问题，符合API官方文档建议
- 📋 **API信息公示**：在设置页面新增"数据来源 & API 信息"专区
  - 完整公示所有使用的API地址和文档
  - 明确版权说明和免责声明
  - 提供API官方文档链接
- 🗑️ **简化界面**：移除芝加哥艺术学院平台的页面内API提示框
  - 统一在设置页面展示API信息
  - 保持页面简洁美观

#### API透明化详情
**热搜聚合 API**
- 主要API: `https://uapis.cn/api/v1/misc/hotboard`
- 备用API: `https://api-hot.imsyy.com`
- 支持50+平台热搜数据聚合

**芝加哥艺术学院 API**
- API地址: `https://api.artic.edu/api/v1/artworks`
- 官方文档: `https://api.artic.edu/docs/`
- 版权声明: 仅展示公有领域艺术品，可免费使用
- 筛选条件: `is_public_domain: true`

**大都会博物馆 API**
- API地址: `https://collectionapi.metmuseum.org/public/collection/v1/search`
- 官方文档: `https://metmuseum.org/developers/digital-body/metmuseum-collection-api`
- 版权声明: 仅展示公有领域艺术品，可免费使用
- 筛选条件: `isPublicDomain: true`

**免责声明**
- 本应用仅作为数据展示工具，所有数据版权归原平台所有
- 热搜数据实时抓取自各公开平台，可能存在延迟或差异
- 艺术品均为公有领域作品，可自由使用
- 如有任何版权问题，请联系原平台或API提供商

---

### 2026-02-03 - 芝加哥艺术学院与翻译功能

- ✅ 新增芝加哥艺术学院平台
- ✅ 新增艺术品列表展示组件
- ✅ 新增AI智能翻译功能（支持200个批量翻译）
- ✅ 新增翻译进度显示
- ✅ 新增追书神器小说排行榜
- ✅ 优化图标系统为 vue-remix-icons
- ✅ 优化缓存机制和错误处理
- ✅ 修复设置页面排序图标显示错误（统一使用 PlatformIcon 组件）

#### 主要改进（累计）
- 使用 IIIF 图片API获取高质量艺术品图片
- 智能分批翻译（每次最多200个）
- 添加翻译确认对话框
- 沙漏图标旋转动画
- 双击恢复原文功能
- 版权保护机制（公有领域筛选）
- API信息透明化公示

---

## 🔧 配置说明

### 显示模式
- **极简模式**：只显示主流平台
- **分类模式**：按分类显示所有平台

### 平台超时配置
- 芝加哥艺术学院：30秒
- 追书神器：20秒
- 大都会博物馆：5秒（详情请求）
- 其他平台：10秒（默认）

### 缓存策略
- 芝加哥艺术学院：60分钟
- 大都会博物馆：无缓存（实时数据）
- 其他平台：60分钟（API默认）

### 代码风格 ⭐NEW
- **JavaScript风格**：单引号、无分号
- **缩进**：2空格
- **命名**：camelCase（变量/函数）、PascalCase（组件/类）
- **最大行宽**：100字符
- **ESLint规则**：
  - 禁止 `var`，使用 `const/let`
  - 强制使用 `===` 而非 `==`
  - 生产环境禁用 `console` 和 `debugger`
  - 未使用变量警告

---

### 版权与合规 📜

#### 芝加哥艺术学院平台
- **数据来源**：芝加哥艺术学院 API
- **版权状态**：仅展示公有领域（Public Domain）艺术品
- **筛选条件**：`is_public_domain: true`
- **使用许可**：可免费使用，无需额外授权
- **官方文档**：[https://api.artic.edu/docs/](https://api.artic.edu/docs/)

#### 大都会博物馆平台
- **数据来源**：大都会博物馆 API
- **版权状态**：仅展示公有领域（Public Domain）艺术品
- **筛选条件**：`isPublicDomain: true`
- **使用许可**：可免费使用，无需额外授权
- **官方文档**：[https://metmuseum.org/developers/digital-body/metmuseum-collection-api](https://metmuseum.org/developers/digital-body/metmuseum-collection-api)

#### 热搜数据聚合
- **数据来源**：uapis.cn / imsyy.top
- **数据性质**：实时聚合各公开平台热搜
- **使用限制**：仅用于展示，版权归原作者平台

#### API信息完整公示
所有API信息可在设置页面 > 数据来源 & API 信息 中查看，包括：
- API地址
- 官方文档链接
- 版权说明
- 使用条款

---

## 🐛 已知问题

1. **API依赖**：部分平台依赖第三方API，可能不稳定
2. **翻译功能**：需要用户在 uTools 中配置 AI 模型
3. **网络限制**：部分平台可能存在网络访问限制
4. **大都会去重**：仅支持单页去重，跨页重复无法过滤

---

## 📄 许可证

MIT License

---

## 👥 作者

摸鱼工作室

---

## 🔗 相关链接

- [uTools 官方文档](https://www.u-tools.cn/docs/developer/welcome.html)
- [Vue 3 文档](https://vuejs.org/)
- [Vite 文档](https://vitejs.dev/)
- [Pinia 文档](https://pinia.vuejs.org/)
- [VueUse 文档](https://vueuse.org/)
- [芝加哥艺术学院API](https://api.artic.edu/docs/)
- [大都会博物馆API](https://metmuseum.org/developers/digital-body/metmuseum-collection-api)

---

**备注**: 本项目持续更新中，欢迎提出建议和反馈！
