# 摸鱼热搜 - uTools 插件

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Vue](https://img.shields.io/badge/Vue-3.5.13-brightgreen.svg)
![uTools](https://img.shields.io/badge/uTools-插件-orange.svg)

**一站式聚合各大平台热搜信息，让你的摸鱼时光更加精彩**

[功能特性](#-功能特性) • [快速开始](#-快速开始) • [使用指南](#-使用指南) • [常见问题](#-常见问题)

</div>

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
微信读书

> 📌 持续更新中，欢迎建议更多平台！

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

### Q5: 如何开发调试？

**A**:
```bash
# 开发模式（支持热更新）
npm run dev

# 打开浏览器控制台（F12）查看日志
# 所有 console.log 在开发环境都会输出

# 构建生产版本（移除 console.log）
npm run build
```

### Q6: 依赖安装太慢怎么办？

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

### Q7: 可以添加新的平台吗？

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
