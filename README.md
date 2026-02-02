# 摸鱼热搜 - uTools 插件

<div align="center">

![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Vue](https://img.shields.io/badge/Vue-3.5.13-brightgreen.svg)
![uTools](https://img.shields.io/badge/uTools-插件-orange.svg)

**一站式聚合各大平台热搜信息，让你的摸鱼时光更加精彩**

[更新日志](#-更新日志) • [功能特性](#-功能特性) • [快速开始](#-快速开始) • [使用指南](#-使用指南) • [常见问题](#-常见问题)

</div>

---

## 📝 更新日志

### v1.1.0 (2025-02-02)

#### 🎉 新增功能
- **追书神器小说排行榜** - 新增阅读类平台，支持查看热门小说排行
- **平台专属超时配置** - 为不同平台设置独立的请求超时时间
- **调试日志开关** - 新增 `DEBUG` 配置项，可控制是否显示调试日志

#### ⚡ 性能优化
- **多代理支持** - 追书神器使用3个 CORS 代理备选，大幅提升可用性
- **超时控制优化** - 使用 `AbortController` 实现真正的请求超时控制
- **错误处理改进** - 超时时显示"暂无数据"而非错误提示，体验更友好

#### 🔧 技术改进
- **配置管理优化** - 新增 `PLATFORM_TIMEOUT` 配置，支持平台级别的超时设置
- **调试工具函数** - 统一的 `debug` 对象管理所有调试日志输出
- **代码健壮性** - 修复超时配置不一致问题，确保 UI 层和 API 层超时同步

#### 📋 配置变更
```javascript
// src/config.js 新增配置
API: {
  REQUEST_TIMEOUT: 5000,           // 默认超时 5 秒
  MIN_REQUEST_INTERVAL: 500,       // 最小请求间隔 500ms
  PLATFORM_TIMEOUT: {
    'zhuishu': 20000              // 追书神器超时 20 秒（使用 CORS 代理）
  },
  DEBUG: false                     // 调试日志开关（生产环境建议关闭）
}
```

#### 🐛 问题修复
- 修复追书神器接口频繁超时的问题
- 修复 UI 层和 API 层超时时间不一致导致的加载状态异常
- 优化错误判断逻辑，避免误判其他网络错误为超时

---

## ✨ 功能特性

### 🎯 核心功能

- **🔥 多平台聚合** - 支持40+主流平台热搜，一键切换
- **📂 分类浏览** - 综合类、社交类、视频类、资讯类、科技类、娱乐类、游戏类、阅读类
- **🌙 夜间模式** - 自动跟随系统 / 亮色 / 暗色三种主题
- **⚡ 智能加载** - 支持分页加载，滚动即可获取更多内容
- **💾 本地缓存** - 自动记住你的偏好设置和最近使用
- **🎨 精美界面** - 现代化 Material Design 风格

### 🚀 高级特性

- **📱 极简模式** - 精选主流平台，简洁高效
- **🔄 悬浮按钮** - 右下角快捷刷新和设置，随时可用
- **🎯 自定义排序** - 拖拽调整平台显示顺序（设置中）
- **📊 热度等级** - 火焰图标直观显示热度（🔥🔥🔥🔥🔥 爆 / 🔥🔥🔥🔥 热）
- **🎛️ 灵活配置** - 可选择显示/隐藏热度值和简介
- **⌨️ 快捷操作** - 点击热搜项直接打开详情页

---

## 🏗️ 支持的平台

### 📊 综合类
百度、简书

### 💬 社交类
微博、知乎、豆瓣小组、百度贴吧

### 🎬 视频类
抖音、快手、B站、AcFun

### 📰 资讯类
今日头条、澎湃新闻、腾讯新闻、新浪新闻、网易新闻、凤凰网

### 💻 科技类
36氪、IT之家、CSDN、掘金、V2EX、少数派、酷安、爱范儿、虎嗅

### 🎮 娱乐游戏类
豆瓣电影、虎扑、NGA、米游社、原神

### 📚 阅读类
微信读书、追书排行

> 📌 持续更新中，欢迎建议更多平台！

---

## 🎨 图标库说明

### Remix Icon 集成（Vue 组件方式）

本项目已集成 **vue-remix-icons** 图标库，使用 Vue 3 组件方式，支持按需加载和 Tree-Shaking！

#### 📦 特性
- ✅ 2000+ 精美图标
- ✅ 开源免费（MIT License）
- ✅ 中性设计风格
- ✅ 支持线性图标和填充图标
- ✅ Vue 3 组件方式，按需加载
- ✅ 优秀的 Tree-Shaking 支持
- ✅ 每个图标独立打包（~0.4-3KB）

#### 🔧 使用方式

**在 Vue 组件中使用**：

```vue
<template>
  <!-- 使用 PlatformIcon 组件（推荐） -->
  <PlatformIcon :platformId="'bilibili'" size="18px" />

  <!-- 或直接使用 RemixIcon 组件 -->
  <RemixIcon :iconName="'ri-bilibili-line'" size="18px" />
</template>

<script setup>
import PlatformIcon from '@/components/PlatformIcon.vue'
import RemixIcon from '@/components/RemixIcon.vue'
</script>
```

#### 📂 相关文件
- `src/config/icons.js` - 图标映射配置
- `src/components/RemixIcon.vue` - 通用图标组件（带缓存）
- `src/components/PlatformIcon.vue` - 平台图标组件

#### 💡 技术优势
- ⚡ **按需加载** - 只打包使用的图标
- 📦 **Tree-Shaking** - 未使用的图标不会被打包
- 🎯 **组件化** - 更符合 Vue 3 开发习惯
- 🔒 **类型安全** - 支持 TypeScript 类型推断

---

## 🚀 快速开始

### 📦 安装方式

#### 方式一：uTools 插件市场（推荐）

1. 打开 [uTools](https://www.u-tools.cn/)
2. 在插件市场搜索 **"摸鱼热搜"** 或 **"热搜"**
3. 点击安装即可使用

#### 方式二：本地开发

```bash
# 1. 克隆项目
git clone https://github.com/your-username/hot-search-utools.git
cd hot-search-utools

# 2. 安装依赖（已配置淘宝镜像源，速度飞快）
npm install

# 3. 启动开发服务器
npm run dev

# 4. 构建生产版本
npm run build

# 5. 在 uTools 中安装本地插件
# uTools -> 设置 -> 开发者模式 -> 安装本地插件 -> 选择项目目录
```

### 🎯 唤醒插件

在 uTools 中输入以下关键词即可唤醒：
- **热搜**
- **热榜**
- **hot**
- **摸鱼**

---

## 📖 使用指南

### 基础操作

#### 1️⃣ 切换平台
- 点击顶部的平台标签即可切换
- 当前选中平台会以**蓝色渐变高亮**显示在左侧
- 平台标签支持**横向滚动**，鼠标滚轮即可切换

#### 2️⃣ 查看热搜
- 点击任意热搜条目，在浏览器中打开详情
- 热搜条目显示：**排名** + **标题** + **热度** + **简介**（可选）
- 前三名排名以**橙色圆点**突出显示

#### 3️⃣ 刷新数据
- 点击右下角 **🔄 蓝色悬浮按钮**
- 加载中时按钮会**旋转动画**
- 手动刷新可获取最新数据

#### 4️⃣ 打开设置
- 点击右下角 **⚙️ 灰色悬浮按钮**
- 可配置主题、显示选项、平台顺序等

### ⚙️ 设置说明

#### 🎨 主题模式
- **自动模式** - 跟随系统主题变化
- **亮色模式** - 始终使用亮色主题
- **暗色模式** - 始终使用暗色主题

#### 👁️ 显示选项
- **显示热度值** - 在热搜条目右侧显示热度（如 🔥 123.4万）
- **显示简介** - 在标题下方显示热搜简介（如果有）

#### 📋 平台顺序
- 在极简模式下，可以**自定义平台显示顺序**
- 拖拽调整后，顺序会自动保存到本地

### 💡 使用技巧

1. **高效摸鱼** - 设置为 uTools 启动页，一键直达热搜
2. **分类浏览** - 不同场景切换不同分类（工作看科技，休息看娱乐）
3. **夜间模式** - 晚上使用自动模式，保护眼睛
4. **滚动加载** - 滚动到底部自动加载更多，无需手动翻页
5. **快捷刷新** - 悬浮按钮随时可点，无需回到顶部

---

## 🛠️ 技术栈

| 技术 | 说明 | 版本 |
|------|------|------|
| **Vue 3** | 渐进式 JavaScript 框架 | ^3.5.13 |
| **Vite** | 下一代前端构建工具 | ^6.0.11 |
| **uTools API** | uTools 插件开发接口 | - |
| **Remix Icon** | 开源图标库（可选） | ^3.5.0 |
| **DailyHotApi** | 热搜数据源 | [GitHub](https://github.com/imsyy/DailyHotApi) |

### 📦 项目结构

```
hot-search-utools/
├── src/
│   ├── HotSearch/          # 热搜主组件
│   │   └── index.vue       # 核心功能实现
│   ├── Settings/           # 设置面板
│   │   └── index.vue       # 主题、显示配置等
│   ├── services/           # 服务层
│   │   └── hotSearchApi.js # API 接口封装
│   ├── config.js           # 应用配置
│   ├── App.vue             # 根组件
│   └── main.js             # 入口文件
├── public/                 # 静态资源
├── plugin.json             # uTools 插件配置
├── vite.config.js          # Vite 构建配置
├── package.json            # 项目依赖
├── README.md               # 项目说明
├── USER_GUIDE.md           # 使用指南
└── QUICK_START.md          # 快速开始
```

---

## 🔧 配置说明

### 📋 config.js 配置项

```javascript
// 显示模式
DISPLAY_MODE: {
  DEFAULT_MODE: 'simple',  // 'simple' 极简模式 | 'category' 分类模式
  SIMPLE_MODE_PLATFORMS: ['baidu', 'zhihu', 'weibo', ...]  // 极简模式显示的平台
}

// UI 配置
UI: {
  SHOW_HOT_VALUE: true,        // 是否显示热度值
  SHOW_DESCRIPTION: true,      // 是否显示简介
  HOT_DISPLAY_MODE: 'level',   // 'number' 数字 | 'level' 等级
  THEME_MODE: 'auto'           // 'auto' 自动 | 'light' 亮色 | 'dark' 暗色
}

// 分页配置
PAGINATION: {
  DEFAULT_PAGE_SIZE: 50,       // 每页显示条数
  LOAD_MORE_THRESHOLD: 100     // 距离底部多少像素触发加载更多
}

// API 配置
API: {
  REQUEST_TIMEOUT: 5000,       // 默认请求超时（毫秒）
  MIN_REQUEST_INTERVAL: 500,   // 最小请求间隔（毫秒）
  PLATFORM_TIMEOUT: {          // 平台专属超时配置
    'zhuishu': 20000          // 追书神器 20 秒（使用 CORS 代理）
  },
  DEBUG: false                 // 是否显示调试日志
}
```

---

## 🐛 常见问题

### Q1: 为什么有些平台加载失败？

**A**: 可能的原因：
- API 服务器暂时不可用
- 网络连接问题
- 该平台的数据接口已更新
- 跨域限制（建议在 uTools 环境中使用）

**解决方案**：
- 点击刷新按钮重试
- 切换到其他平台查看
- 检查网络连接

### Q2: 数据多久更新一次？

**A**:
- API 数据源缓存时间：约 **60分钟**
- 你可以随时点击刷新按钮获取最新数据
- 建议每小时刷新一次，获取最新热搜

### Q3: 如何自定义平台顺序？

**A**:
1. 点击右下角 **⚙️ 设置按钮**
2. 在设置面板中找到 **"平台顺序"** 选项
3. 拖拽调整平台顺序
4. 顺序会自动保存，下次打开生效

### Q4: 夜间模式如何切换？

**A**:
1. 打开设置面板
2. 选择 **"主题模式"**：
   - **自动** - 跟随系统（推荐）
   - **亮色** - 始终亮色
   - **暗色** - 始终暗色

### Q5: 追书神器加载失败怎么办？

**A**: 追书神器使用 CORS 代理访问，可能会遇到以下情况：
- 代理服务暂时不可用
- 请求超时（已设置为 20 秒）
- 目标网站限制访问

**解决方案**：
- 系统会自动尝试 3 个不同的代理服务
- 如果所有代理都失败，会显示"暂无热搜数据"
- 稍后重试或切换到其他平台

### Q6: 如何开启调试日志？

**A**: 编辑 `src/config.js` 文件：

```javascript
// 开启调试日志
API: {
  DEBUG: true   // 设置为 true 开启，false 关闭（默认）
}
```

**注意事项**：
- 生产环境建议关闭（`DEBUG: false`）
- 错误日志（`console.error`）始终显示，不受 `DEBUG` 控制
- 开启后会在控制台输出详细的请求信息

### Q7: 如何开发调试？

**A**:
```bash
# 开发模式（支持热更新）
npm run dev

# 打开浏览器控制台（F12）查看日志
# 所有 console.log 在开发环境都会输出

# 构建生产版本（移除 console.log）
npm run build
```

### Q8: 依赖安装太慢怎么办？

**A**: 项目已配置淘宝镜像源，如果仍然慢：
```bash
# 清除 npm 缓存
npm cache clean --force

# 手动设置淘宝镜像
npm config set registry https://registry.npmmirror.com

# 使用 cnpm
npm install -g cnpm --registry=https://registry.npmmirror.com
cnpm install
```

### Q9: 可以添加新的平台吗？

**A**: 当然可以！编辑 `src/services/hotSearchApi.js`：

```javascript
// 在 PLATFORMS 数组中添加
{
  id: 'new-platform',
  name: '新平台',
  icon: '🎯',
  category: '科技'
}
```

---

## 📸 功能预览

### 🎨 主界面
- 当前选中平台独立显示在左侧（蓝色渐变）
- 平台标签横向滚动，支持鼠标滚轮
- 热搜列表清晰展示排名、标题、热度

### 🌙 夜间模式
- 深色背景，保护眼睛
- 橙色/蓝色对比度优化
- 所有元素完美适配暗色主题

### 💫 悬浮按钮
- 右下角固定位置
- 刷新按钮：蓝色，加载时旋转
- 设置按钮：灰色，点击打开设置
- 悬停动画：上移 + 放大

---

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

### 如何贡献

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 贡献方向

- 🐛 修复 Bug
- ✨ 添加新功能
- 📝 完善文档
- 🎨 优化界面
- ⚡ 性能优化
- 🌍 支持更多平台

---

## 📄 开源协议

本项目采用 **MIT License** 开源协议。

---

## 🙏 致谢

- [DailyHotApi](https://github.com/imsyy/DailyHotApi) - 提供强大的热搜数据 API
- [uTools](https://www.u-tools.cn/) - 优秀的效率工具平台
- [Vue.js](https://vuejs.org/) - 渐进式 JavaScript 框架
- [Vite](https://vitejs.dev/) - 极速的前端构建工具

---

## 📮 联系方式

- **GitHub Issues**: [提交问题](https://github.com/your-username/hot-search-utools/issues)
- **Email**: your-email@example.com
- **作者**: 摸鱼工作室

---

## 🌟 Star History

如果这个项目对你有帮助，请给个 **Star** 支持一下！

---

<div align="center">

**[⬆ 回到顶部](#摸鱼热搜---utools-插件)**

Made with ❤️ by 摸鱼工作室

</div>
