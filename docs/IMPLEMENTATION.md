# 摸鱼热搜交互重设计 · 实施文档

> 分支：`feat/ux-redesign` ｜ 依据：`docs/UX-REDESIGN.md` v2（含 §9 审阅修订、§10 样式评估）｜ 日期：2026-10-20
>
> 本文档是工程实施手册：每阶段给出**改动文件清单、接口/数据结构设计、完成定义（DoD）、埋点、回归项**。冲突时以 UX-REDESIGN §9 修订为准。

## 0. 总览

### 0.1 实施顺序与依赖

```
P0.0 样式令牌层 ──┬──> P0.1 秒开缓存+骨架屏 ──> P0.3 ubrowser+行内操作+键盘流
                  └──> P0.2 平台条+全部网格 ──┘
P0 全部完成 ──> P1（收藏流/直达/设置页/防窥）──> P2（重构/面板）
```

P0.0 是其余全部的前置（新 UI 必须走令牌体系）；P0.1 与 P0.2 可交错但建议串行（都改主界面）。

> **v3 修订**：原子输入框方案（useSubInput / PlatformMatcher / IME 三重门 / 注册重挂）已整体移除，见 UX-REDESIGN §9.5。全案最大技术风险（子输入框 keydown 转发真机行为）随之消灭。

### 0.2 全局规则

- **分支与提交**：全部在 `feat/ux-redesign`；每阶段独立 commit（信息前缀 `P0.0`/`P0.1`…），保证可单独 revert。
- **每阶段回归三件套**：亮色+暗色截图对比、58 平台抽查（≥10 个含 4 个新平台）、`vite build` 通过 + uTools 开发者模式真机加载。
- **真机验证节点**：P0.3 完成后必须在真机 uTools 验证 ubrowser 打开/复用与键盘流（浏览器无法验证）。
- **死代码处理**：`usePlatform.js`（无引用）、`hotSearchStore` 现有 fetchHotData 副本在 P0 阶段不动、不引用；P2 统一清理。

### 0.3 新增埋点事件（`src/services/analytics/eventTypes.js`）

| 事件 | 触发点 | 参数 |
|---|---|---|
| `platform_switch` | 切平台 | from, to, source: pill/pin/mru/grid/keyboard |
| `grid_search` | 全部网格内搜索 | query_len, result_count |
| `open_url` | 打开条目 | platform, mode: ubrowser/system, reused: bool |
| `favorite_toggle` | 星标收藏/取消 | platform, on: bool |
| `copy_action` | 复制标题/链接 | platform, kind: title/link |
| `settings_change` | 打开方式等关键设置变更 | key, value |

---

## P0.0 样式令牌层（0.5-1 天）

### 改动文件

| 文件 | 改动 |
|---|---|
| `src/main.css` | 重写：令牌定义 + 暗色变量块 + 全局滚动条 + 原语类 |
| `src/HotSearch/index.vue` | 替换 top-15 高频色值为 `var(--*)`；删除全局块中与 scoped 重复的暗色规则（约 200 行）与 48 个 `!important`；删除死 CSS（`.hot-list-header/.hot-count/.artwork-country`）与 `[style*="ff6600"]` hack |
| `src/HotSearch/index.vue` script | `getRankStyle()`（L1036）由返回内联色改为返回 class（`rank-1/2/3`），样式进 scoped |
| `src/directives/lazyLoad.js` | 补 `.lazy-loading/.lazy-loaded/.lazy-error` 三个断链类的样式（骨架灰底/淡入） |

### 令牌清单（写入 main.css `:root`）

```css
:root {
  /* 色彩（P0.0 保持现值不变，只做引用化；调色板统一留 P2 再议） */
  --color-primary: #007bff;      --color-primary-dark: #0056b3;
  --color-bg: #f5f5f5;           --color-surface: #ffffff;
  --color-surface-hover: #f8f9fa; --color-border: #e0e0e0;
  --color-text: #333;            --color-text-secondary: #666;
  --color-text-muted: #999;      --color-danger: #dc3545;
  --color-hot-1: #ff4d4f;        --color-hot-2: #ff7a45;  /* 热度等级用 */
  /* 间距 4 的倍数 */
  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px; --space-5: 24px;
  /* 圆角 */
  --radius-sm: 6px; --radius-md: 10px; --radius-lg: 16px; --radius-pill: 999px;
  /* 字号（12 个收敛为 6 档） */
  --font-xs: 12px; --font-sm: 13px; --font-md: 14px; --font-lg: 16px;
  --font-xl: 20px; --font-xxl: 28px;
  /* z-index 阶梯（替换 8 个魔法值；floating 与 modal 同 1000 的冲突在此解决） */
  --z-sticky: 100;      /* 新鲜度指示、渐变箭头 */
  --z-popover: 500;     /* @匹配层、全部网格 */
  --z-floating: 900;    /* 右下悬浮按钮 */
  --z-modal: 2000;      /* 设置/打赏弹窗 */
  --z-toast: 3000;      /* toast */
}
html.dark-mode {
  --color-bg: #1a1a1a;  --color-surface: #2c2c2c;
  --color-surface-hover: #3a3a3a; --color-border: #4a4a4a;
  --color-text: #e0e0e0; --color-text-secondary: #b0b0b0; --color-text-muted: #888;
}
```

### 原语类（同文件，供后续阶段复用）

`.pill`（胶囊，合并 7 处重复）、`.card`（白卡，合并 10 处）、`.btn`、`.icon-btn`（行内幽灵图标按钮，P0.3 用）、`.toast`（P0.3 用）。P0.0 只定义**不迁移**旧组件（迁移在 P2 按文件做），仅把滚动条收编为 main.css 单份。

### DoD

- [x] `grep -c "var(--" src/` ≥ 40；`grep -c "!important" src/` ≤ 3
- [x] 暗色模式覆盖选择器从 149 条降到 ≤ 20 条（仅剩无法变量化的特例）
- [x] 亮/暗两态与改造前截图对比无肉眼可见回归（重点：榜单、设置页、悬浮按钮）
- [x] 悬浮按钮与设置弹窗 z-index 冲突消除（按钮 900 < 弹窗 2000）

---

## P0.1 秒开体验（0.5-1 天）

> v3 修订：原子输入框方案已整体移除（UX-REDESIGN §9.5），本阶段只保留"进入即见"的缓存体验。

### 改动文件

| 文件 | 改动 |
|---|---|
| `src/utils/cacheManager.js` | 榜单 stale-while-revalidate：`set` 时同步写内存镜像 `lastGood: {platform, data, ts}`；新增 `peek(platform)` 只读接口（不触发过期判断） |
| `src/HotSearch/index.vue` | 切平台流程改为：先 `peek` 镜像立即渲染 + 骨架屏占位，请求成功后替换并刷新时间戳；断网/失败时保留镜像并显示"数据可能滞后 N 分钟"角标 |

### DoD

- [x] 断网进入插件仍显示上次榜单（含"滞后 N 分钟"提示），无白屏
- [x] 缓存命中路径首屏渲染 ≤300ms
- [x] 切平台缓存命中即时显示，后台静默刷新

---

## P0.2 平台条改造 + 全部网格（1-1.5 天）

### 结构（§9 R3 修订版）

```
[📌钉住组(横排pill)] [🕘最近(横排pill,≤5)] [现有滚动pill区] [⋯全部(58)]
```

### 改动文件

| 文件 | 改动 |
|---|---|
| `src/stores/settingsStore.js` | 新增 `pinnedPlatforms: string[]`（dbStorage 持久化，键 `STORAGE_KEYS.PINNED_PLATFORMS`，config.js 补键名）；`togglePin/isPinned` |
| `src/stores/settingsStore.js` | `customPlatformOrder/hiddenPlatforms` 初始化从"极简 20"扩到全部 58 平台；**迁移规则**：已存储的旧列表保留顺序，未出现的新平台默认可见、追加尾部 |
| `src/HotSearch/index.vue` | `.platform-tabs`（L1282-1308）容器前置两组胶囊 + 尾部"全部"按钮；pill 右键/长按 = 钉住（`contextmenu` + 移动端 `touchstart` 500ms）；最近列表读 `hotSearchStore.recentPlatforms`（已有持久化，仅接 UI） |
| `src/components/AllPlatformsGrid.vue`（新） | 弹层网格：按 `PLATFORMS[].category` 分组、`--z-popover`、**含本地搜索框**（纯 HTML input，实时过滤平台名/别名，零 uTools API 依赖——§9.5 修订恢复）；隐藏的平台灰显可从这开启 |
| `src/components/ErrorState.vue`（新） | 源失效统一降级 UI：错误图标 + "该数据源暂时不可用" + 重试按钮 + 换源提示（本地→远程自动重试已由数据层完成，此处为最终失败态） |

### DoD

- [x] 58/58 平台可达：钉住/滚动条/最近 + "全部"网格（含本地搜索）
- [x] 钉住微博后它出现在平台条最前，重启插件保持
- [x] 停掉本地服务 + 断网远程的平台上，列表显示 ErrorState 而非空白
- [x] 埋点：platform_switch（带 source 维度）+ grid_search 上线，可对比 pin/mru/pill/grid 使用占比

---

## P0.3 ubrowser 打开 + 行内操作 + 键盘流（2-3 天）

### 新文件

**`src/utils/openUrl.js`**（统一打开入口，全项目唯一）

```js
import settings from '../stores/settingsStore.js'

export async function openUrl(url, { background = false } = {}) {
  if (!window.utools) return window.open(url, '_blank')        // 浏览器开发降级
  if (settings.state.openIn === 'system') return utools.shellOpenExternal(url)

  // ubrowser 摸鱼窗口（P0.3 无设置 UI，固定参数；P1 再接设置）
  const idle = (utools.getIdleUBrowsers?.() || [])[0]           // API 为复数、返回数组
  const opts = {
    show: !background,
    width: 900, height: 640,
    skipTaskbar: true,            // 无痕三件套 P1 打包成预设，此处先固定
    // alwaysOnTop/opacity P1 跟随"无痕模式"预设
  }
  const result = idle ? await utools.ubrowser.goto(url).run(idle.id, opts)
                      : await utools.ubrowser.goto(url).run(opts)
  return result
}
```

**注意**：`run(id, options)` 为双参数；静音能力需真机查证 ubrowser 链式 API（`.mute?.()`），若无则文档标注限制并在 P1 设置页提示"视频类平台请自行静音"。

**`src/components/Toast.vue`**：轻提示（`--z-toast`，2s 自动消失），复制/收藏反馈专用。

### 改动文件

| 文件 | 改动 |
|---|---|
| `src/HotSearch/index.vue` | `openUrl`（L463-480）替换为 utils/openUrl；`.hot-item` 模板加行内操作区（hover/选中显示）：★星标、📋复制标题、🔗复制链接，全部 `.icon-btn` 原语；整行 click 行为不变 |
| `src/HotSearch/index.vue` | **handleKeyPress 改造**（L889-975）：保留现有 INPUT/TEXTAREA 守卫，新增 overlay 态守卫（全部网格/设置/收藏流打开时单键快捷键失效，Enter/Esc 归弹层）+ `event.isComposing` 过滤（防御设置页等 HTML 输入框的 IME 组合态）；新增 1-9/PageUp/PageDown/Esc 分层退出 |
| `src/HotSearch/index.vue` | 移植收藏模型（见下）+ `toggleFavorite` 接星标；键盘选中与 hover 联动（mouseenter 同步 `selectedHotIndex`）；`platformLastIndex: Map` 记忆各平台浏览位置（内存级） |
| `src/stores/hotSearchStore.js` | **收藏数据模型升级**：`favorites: Set<string>` → `Array<{platform, title, url, savedAt}>`；`loadFavorites()` 做旧数据迁移（`platform_title` 字符串拆解回填，无法解析的保留为 `title-only` 条目）；新增 `isFavorited(platform,title)` |
| `src/services/hotSearchApi.js` | 列表归一化时保证 `url` 必填（本地源缺失时回填 `mobileUrl`），收藏模型依赖 |

### 键位表（P0.3 终版）

| 键 | list 态行为 |
|---|---|
| ↑↓/PageUp/PageDown | 移动选中 / 翻页滚动 |
| ←→ | 上/下一平台（保留，老用户习惯） |
| 1-9 | 选中榜单第 N 条 |
| Enter | 打开选中（ubrowser） |
| c / f | 复制标题（+toast）/ 收藏切换 |
| Esc | 清过滤→关弹层→退出插件（分层，≤2 次回初始态） |
| F5/Ctrl+R/Ctrl+T | 刷新/翻译（不变） |

（j/k、b、C 已按 §9.2 砍除。）

### DoD

- [x] 点击热搜在 ubrowser 打开：任务栏无图标；连点 3 条复用同一窗口；关闭 ubrowser 不影响插件
- [x] c 复制标题→toast"已复制"→粘贴板验证；f 收藏星标实时变色，重启插件仍在
- [x] 1-9 跳条、Esc 两层退出（关弹层→退出插件）、PageDown 翻页，全部在真机可用
- [x] 网格/设置打开时按 c/f/1-9 不触发快捷键（overlay 守卫生效）；中文输入法组合态不误触
- [x] 埋点：open_url（mode/reused）、favorite_toggle、copy_action

---

## P1 功能补全（3-4 天，概要）

| 项 | 要点 | 预估 |
|---|---|---|
| 关键词直达 | plugin.json cmds 加 text feature（`热搜 {query}`）；App.vue `onPluginEnter` 的 payload 解析链传给 index.vue（`enterAction` prop 已存在未用） | 0.5 天 |
| 收藏流页 | `FavoritesView.vue`：★计数胶囊进入；跨平台条目列表（平台徽标+标题+时间），点击走 openUrl，支持批量删除、按平台筛选 | 1 天 |
| 设置页重排 | 按 §5.8 新 IA：浏览（打开方式/无痕模式预设/尺寸 3 项）/导航栏定制/我的收藏/外观/快捷键/折叠的来源声明；**打开方式首启变更提示**（一次性 banner：默认已切换为内置浏览器+一键切回）；同时更新过时的"数据来源"文案（本地 DailyHotApi 56 源三级回退、58 平台） | 1 天 |
| 去 confirm 化 | 翻译流程改行内提示条（首启说明+会话内不再询问），结果渲染进 desc，失败 toast | 0.5 天 |
| 防窥三件套 | 老板键（全局快捷键隐藏插件+所有 ubrowser：`getIdleUBrowsers()` 逐个 hide；`utools.hideMainWindow()`）；办公室模式（标题 CSS `filter: blur(4px)`，hover/选中清除，设置开关）；新上榜标记（cacheManager 镜像 diff 出新增条目打"新"角标） | 1 天 |

## P2（按需）

- **状态收敛重构**（2-3 天，独立分支进行）：拆 `PlatformBar / HotList / ItemActions / FloatingActions` 组件；三轨（settingsStore 对象数组 / hotSearchStore id 数组 / index.vue 自持）收敛为 settingsStore+一个新 `hotStore`；迁移时以 index.vue 行为为准（store 版缺 4 个行为，见设计文档 §9 R7）；完成后删除 usePlatform.js 与 store 旧副本。
- 超级面板（限收藏/最近平台检索）、独立窗口模式、调色板统一（蓝/紫/Tailwind 三系→一系）。

---

## 附：风险检查点

1. ~~P0.1 子输入框 keydown 转发风险~~ 已随 §9.5 移除子输入框而整体消灭；ubrowser 真机验证（打开/复用/静音）移至 P0.3 节点。
2. **ubrowser 静音**：API 未见 mute 选项，真机查证；不支持则设置页加提示文案。
3. **收藏迁移**：旧 `Set<string>` 数据解析失败的条目保留不丢，收藏流里显示为"早期收藏"分组。
4. **每阶段可独立回滚**：阶段间无数据库 schema 耦合（收藏模型变更只在 P0.3 一处）。
