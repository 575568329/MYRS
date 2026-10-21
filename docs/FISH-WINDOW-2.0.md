# 摸鱼小窗 2.0 方案（v1）

> 状态：待审阅
> 前置：设置页「🪟 摸鱼小窗」四项（打开方式/尺寸/透明度/置顶）已上线（825372a）
> 本方案目标：把小窗从「能开」升级为「摸鱼专属利器」——按下去就消失、打开就是净化后的沉浸阅读

---

## 0. 能力地图（官方 API 实证）

依据 uTools 官方文档逐条核实（2026-10）：

| 能力 | API | 结论 |
|---|---|---|
| 窗口隐藏/显示 | `ubrowser.hide().run(id)` / `show().run(id)` | ✅ 老板键核心 |
| 枚举空闲实例（含位置尺寸） | `getIdleUBrowsers() → {id,url,title,x,y,width,height}` | ✅ 位置记忆可行（修正早前「做不了」的结论） |
| 页面注入 CSS | 链式 `css(cssText)` | ✅ 站点净化 |
| 页面执行 JS | 链式 `evaluate(fn)` | ✅ 静音 |
| 二段运行 | run 完成后对空闲实例再 `run(id)` 追加任务 | ✅ 补静音用，需真机验证 |
| run() 窗口参数 | `x/y/center/backgroundColor/frame/titleBarStyle/movable/…` | ✅ 位置/底色 |
| 鼠标穿透 | 无 `setIgnoreMouseEvents` 暴露 | ❌ 排除 |
| 已开窗口实时调透明度 | opacity 仅 run 时应用 | ❌ 排除 |

---

## 1. 分期总览

| 期 | 内容 | 一句话价值 |
|---|---|---|
| M1 | 老板键 + 自动静音 + 位置记忆 + 设置实时预览 | 安全感（按下去就消失）+ 独特交互（预览联动） |
| M2 | 站点净化（沉浸阅读规则库） | 别家热榜插件没有的差异点 |
| M3 探索 | 插件内 Markdown 阅读模式 / 无框悬浮小窗 | 锦上添花，验证后再决定 |

---

## 2. M1-① 老板键（最高优先）

### 2.1 交互设计

**三个触发入口**（互为补充，覆盖「正在看插件」和「正在看小窗」两种状态）：

1. **插件内快捷键 `Ctrl + ` `**（反引号）：单手左手小指可达，无系统级冲突；再按一次恢复。
2. **uTools 全局快捷键**：plugin.json 新增功能入口 `"boss"`（关键词「老板键」），用户在 uTools 设置里自行绑定（文档推荐 `Alt+Q`）。绑定后**任何界面按一下，一切归零**。onPluginEnter(code='boss') → 立即 `hideMainWindow()` + 隐藏所有小窗，不渲染任何视图（插件窗口零闪烁，真机验证 onPluginEnter 时序）。
3. **侧栏底栏按钮**：现有「翻译/刷新/设置/❤️」旁加一个 Shield 图标按钮，title「老板键 Ctrl+`」。鼠标党入口。

**动作序列**（`utils/bossKey.js` 模块）：

```
触发 →
  1. 收集目标：getIdleUBrowsers() 全部实例 ∪ 模块内记录的 lastUbrowserId
  2. 逐个 ubrowser.hide().run(id)，成功 id 记入 hiddenSet（内存态，不持久化）
  3. window.utools.hideMainWindow()
再按一次 →
  1. hiddenSet 逐个 ubrowser.show().run(id)，清空
  2. 不主动弹主窗口（用户自己唤起 uTools），恢复时 Toast「欢迎回来，继续摸鱼 🐟」
```

**边界与降级**：
- `openIn === 'system'`（系统浏览器模式）：系统窗口无法控制，只藏主窗口 + Toast「已隐藏主窗口，系统浏览器请自行处理」。
- 浏览器开发环境（无 utools）：按钮置灰 + title 提示「仅 uTools 环境可用」。
- hide 的实例是否仍计入 getIdleUBrowsers（影响二次收集）：真机验证；无论结果如何，hiddenSet 兜底。
- uTools 退出重进后 hiddenSet 丢失：hide 状态的窗口在 uTools 侧仍存在，通过 getIdleUBrowsers 的 url/title 可人工找回（M1 不做自动恢复 UI，文档注明「重新打开同链接即复用该窗口」）。

### 2.2 快捷键冲突

现有键位：1-9 选中、c/f 复制收藏、←→↑↓/PageUp/Down 导航、Esc 退弹层/退插件、F5 刷新。`Ctrl+`` 空闲，不冲突。handleKeyPress 里在「弹层守卫」**之前**处理（老板键任何状态下都要响应，包括设置弹窗开着的时候）。

---

## 3. M1-② 打开自动静音

**默认开**（摸鱼出声=社死，这个不需要用户思考），设置页「摸鱼小窗」节加开关。

技术：openUrl 的链上追加

```js
task = task.wait(2000).evaluate(() => {
  document.querySelectorAll('video,audio').forEach(m => { m.muted = true })
})
```

- 局限（文档明示）：只静音首次加载；小窗内点开新文章后是「用户主动行为」，不再静音（尊重用户手动取消）。
- 可选增强（真机验证后决定）：run() 完成后 5s 对空闲实例二段 run 补一次 mute，覆盖重定向/懒加载场景。
- `wait(2000)` 对无视频页面同样等 2s 再 run 结束——evaluate 不改变用户感知（窗口早已 show），仅 run Promise 晚 2s resolve，无碍。

---

## 4. M1-③ 位置记忆

**默认开**，设置项「记住窗口位置」。

- openUrl 成功 run 后 3s，从 `getIdleUBrowsers()` 中按 id 匹配我们的实例，读 `{x,y,width,height}` 持久化到 dbStorage（键 `fishWindowPos`，单条，LRU 不需要）。
- 下次 run() opts 带上 x/y/width/height（用户手动拖过大小也一并记住——顺带解决「尺寸只有三档」的局限）。
- 记忆存在时优先于尺寸档位；设置页切尺寸档位 = 清除记忆重新生效。
- 风险：多显示器/DPI 缩放下坐标漂移 → 真机验证；异常坐标（负值/屏外）校验后丢弃。
- 局限：仅能读到「空闲」实例位置，正在执行任务的窗口读不到——3s 延迟基本规避。

---

## 5. M1-④ 设置页实时预览（样式独特性主打）

设置页「摸鱼小窗」节顶部加一个 **mini 小窗预览卡**（纯 CSS，~200×140）：

```
┌────────────────────────┐
│  ┌──────────────┐      │
│  │ 🐟 摸鱼小窗    │ ← 模拟标题栏 + 置顶角标（置顶开时显示📌）
│  ├──────────────┤      │
│  │ 1. 某热搜标题  │      │ ← 模拟内容行 ×3
│  │ 2. 某热搜标题  │      │
│  │ 3. 某热搜标题  │      │
│  └──────────────┘      │
└────────────────────────┘
```

- **透明度滑块拖动 → 预览小窗实时变透明**（预览底部垫一层仿真桌面纹理/网格，透明效果肉眼可见）
- **尺寸档位切换 → 预览小窗等比缩放**（紧凑/标准/宽屏三档比例 720:520 / 900:640 / 1120:720 → 预览等比）
- **置顶开关 → 预览出现📌角标**
- 预览小窗配色跟随品牌令牌，暗色模式自动适配

这是「所见即所得」的设置体验，用户不用打开链接就能确认效果——低成本高感知。

---

## 6. M2 站点净化（沉浸阅读）

### 6.1 规则库 `utils/siteRules.js`

```js
export const SITE_RULES = [
  {
    domain: 'zhihu.com',
    name: '知乎',
    css: '.GlobalSideBar,.Question-sideColumn,.Pc-word-card-wrapper{display:none!important} .Question-main,.Post-RichTextContainer{max-width:none!important}',
  },
  // mp.weixin.qq.com / weibo.com / bilibili.com(专栏) / douban.com /
  // 36kr.com / sspai.com / juejin.cn / github.com …
]
```

- 匹配：`new URL(url).hostname` 包含 domain。
- 命中 → openUrl 链上 `.css(rule.css)`。
- 每条规则 = 选择器隐藏（侧栏/推荐/广告位）+ 正文加宽，两段。
- **规则质量分级**：上线前逐站真机验证截图；选择器失效静默降级（css 注入不报错，页面照常）。

### 6.2 设置与运营

- 设置「站点净化」总开关，默认开；下方 details 折叠展示已适配站点清单（名称 + 覆盖项说明）。
- 站点改版 = 规则失效 = 无害（仅回到原样），不追求永远有效，注释维护日期。
- 埋点 `RULES_APPLIED`（domain 维度）指导规则库扩充方向。

### 6.3 首批清单（10 站）

知乎、微信公众号文章、微博正文页、B站专栏/动态、豆瓣条目页、今日头条、36氪、少数派、掘金、GitHub（README 宽屏化）。全部是我们 51 平台里高频跳转的目标站。

---

## 7. M3 探索项（验证后再立项）

| 功能 | 技术 | 不确定性 |
|---|---|---|
| 插件内阅读模式 | `markdown(selector)` 转正文 → 插件内渲染 | 转换质量参差；与净化模式定位重叠，需对比取舍 |
| 无框悬浮小窗 | `frame:false` + `css()` 注入 `-webkit-app-region:drag` 自绘迷你标题栏 | 与站点布局冲突风险高；先做一个站点试水 |
| 视频站移动 UA | `device({userAgent, size})` | 抖音/B站移动页体验待验证 |
| 小窗品牌底色 | run opts `backgroundColor` | 成本极低，M1 顺手带上：`#1a1a1a` 暗色 / 亮色模式用暖白，消除加载白闪 |

（`backgroundColor` 成本低，实施时直接并入 M1。）

---

## 8. 设置项汇总（新增）

| 键 | 默认 | 位置 |
|---|---|---|
| bossKey 提示 | —（无开关，功能常驻） | 快捷键说明区加一行 |
| autoMute | true | 摸鱼小窗节 |
| rememberPosition | true | 摸鱼小窗节 |
| cleanMode（M2） | true | 摸鱼小窗节 + 站点清单折叠 |

存储沿用 `fishWindowConfig` 单键扩展（加 `autoMute`/`rememberPosition`/`cleanMode` 字段），位置单独 `fishWindowPos`。

---

## 9. 风险与真机验证清单

1. `hide().run(id)` 对「正在显示」实例是否生效；hide 后 getIdleUBrowsers 是否仍列出（老板键闭环）
2. onPluginEnter(boss) 时序：能否在渲染前 hideMainWindow（全局快捷键零闪烁）
3. `Ctrl+`` 在 uTools 环境 keydown 事件的 key 值（`` ` `` with ctrlKey）
4. 二段 run 补静音的可行性
5. 位置记忆跨屏/DPI 表现
6. `css()` 注入时机（DOM ready 前后）与各站选择器命中
7. opacity/alwaysOnTop 在复用窗口上的实际生效（P0.3 遗留项一并验）

全部通过后再合并 M1 → 真机 → M2。

---

## 10. 埋点

| 事件 | 维度 | 用途 |
|---|---|---|
| BOSS_KEY | trigger: hotkey/global/button, action: hide/show | 验证老板键入口分布 |
| AUTO_MUTE | platform | 静音覆盖面 |
| POS_RESTORED | - | 位置记忆命中率 |
| RULES_APPLIED | domain | 规则库扩充方向 |
