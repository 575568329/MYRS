# 快速开始指南

## 🚀 开发环境设置

### 1. 安装依赖

本项目已配置淘宝镜像源，可以快速安装依赖：

```bash
# 使用 npm（推荐）
npm install

# 或使用 pnpm
pnpm install

# 或使用 yarn
yarn install
```

**淘宝镜像配置**:
项目中的 `.npmrc` 文件已配置为使用淘宝镜像源：
```
registry=https://registry.npmmirror.com
```

如果需要手动配置或查看当前镜像源：
```bash
# 查看 npm 当前镜像源
npm config get registry

# 设置 npm 使用淘宝镜像（全局）
npm config set registry https://registry.npmmirror.com

# 设置 pnpm 使用淘宝镜像
pnpm config set registry https://registry.npmmirror.com

# 设置 yarn 使用淘宝镜像
yarn config set registry https://registry.npmmirror.com
```

### 2. 启动开发服务器

```bash
npm run dev
```

开发服务器会在 `http://localhost:3000` 启动。

### 3. 在浏览器中测试

打开浏览器访问 `http://localhost:3000`，你应该能看到热搜界面。

### 4. 在 uTools 中测试

1. 打开 uTools
2. 进入 `设置` -> `开发者模式`
3. 点击 `安装本地插件`
4. 选择本项目文件夹
5. 输入"热搜"、"热榜"或"hot"唤醒插件

## 📦 构建生产版本

```bash
npm run build
```

构建完成后，`dist` 目录包含可以直接部署的文件。

## 🎨 主要功能

### 1. 查看热搜

- 选择分类标签（综合、社交、视频等）
- 点击平台标签（微博、知乎、抖音等）
- 查看该平台的热搜列表

### 2. 搜索功能

在顶部搜索框输入关键词，实时筛选热搜内容。

### 3. 快捷操作

- **刷新**: 点击 🔄 按钮更新数据
- **复制**: 点击 📋 按钮复制热搜列表
- **打开详情**: 点击热搜项在浏览器中打开

## 🔧 配置

### 修改默认平台

编辑 `src/HotSearch/index.vue`:

```javascript
const selectedPlatform = ref('weibo') // 改为你想要的默认平台
```

### 添加新平台

编辑 `src/services/hotSearchApi.js`，在 `PLATFORMS` 数组中添加:

```javascript
{ id: 'new-platform', name: '新平台', icon: '🎯', category: '科技' }
```

### 修改 API 地址

如果需要使用自己的 API 实例，编辑 `src/services/hotSearchApi.js`:

```javascript
const API_BASE = 'https://your-api-domain.com'
```

## 🐛 常见问题

### Q: 为什么有些平台加载失败?

A: 可能是:
- API 服务器暂时不可用
- 网络连接问题
- 该平台的数据接口已更新

### Q: 如何调试?

A: 打开浏览器开发者工具（F12），查看 Console 和 Network 标签。

### Q: 数据多久更新一次?

A: DailyHotApi 默认缓存60分钟。你也可以点击刷新按钮强制更新。

### Q: 可以添加其他功能吗?

A: 当然！本项目完全开源，欢迎添加新功能并提交 PR。

### Q: 依赖安装慢怎么办?

A: 项目已配置淘宝镜像，如果仍然慢，可以尝试：
```bash
# 清除 npm 缓存
npm cache clean --force

# 使用 cnpm（淘宝提供的 npm 客户端）
npm install -g cnpm --registry=https://registry.npmmirror.com
cnpm install
```

## 📚 相关资源

- [uTools 官方文档](https://www.u-tools.cn/docs/developer/welcome.html)
- [DailyHotApi 项目](https://github.com/imsyy/DailyHotApi)
- [Vue 3 文档](https://vuejs.org/)
- [Vite 文档](https://vitejs.dev/)
- [淘宝镜像源](https://npmmirror.com/)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

---

## 🎉 新功能使用指南 (v1.1.0)

### 代码格式化

在开始开发前，建议先格式化代码：

```bash
# 格式化所有代码
npm run format

# 检查代码问题（不修复）
npm run lint:check

# 检查并修复代码问题
npm run lint
```

### 1. 图片懒加载

**在组件中使用:**

```vue
<template>
  <!-- 使用 v-lazy 指令 -->
  <img v-lazy="imageUrl" :alt="imageAlt" />
</template>
```

### 2. 无限滚动优化

```vue
<script setup>
import { useInfiniteScroll } from '@/composables/useInfiniteScroll.js'

const { target } = useInfiniteScroll(async () => {
  if (hasMore.value && !loading.value) {
    await loadMore()
  }
})
</script>

<template>
  <div ref="target" style="height: 1px"></div>
</template>
```

### 3. 请求重试机制

```javascript
import { retryRequest } from '@/utils/requestHelper.js'

const data = await retryRequest(
  async () => fetchData(),
  { retries: 3, delay: 1000 }
)
```

### 4. 使用拆分后的 API

```javascript
// 芝加哥艺术学院
import { getArticData } from '@/services/platforms/index.js'
const articData = await getArticData(page, pageSize)

// 大都会博物馆
import { getMetMuseumData } from '@/services/platforms/index.js'
const metData = await getMetMuseumData(page, pageSize, {
  geoLocation: 'China'
})
```

### 5. 开发建议

**使用路径别名:**

```javascript
// 代替
import SomeComponent from '../../../components/SomeComponent.vue'

// 使用
import SomeComponent from '@/components/SomeComponent.vue'
```

### 6. 代码提交前

```bash
# 1. 格式化代码
npm run format

# 2. 检查代码问题
npm run lint

# 3. 构建测试
npm run build
```

---

祝你开发愉快！ 🎉
