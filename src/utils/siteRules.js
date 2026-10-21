/**
 * 站点净化规则库（FISH-WINDOW-2.0 M2）
 *
 * 设计原则：
 * 1. 保守优先——宁可漏隐藏，不可把正文藏了；选择器只点名大概率长期存在的
 *    布局级容器（侧栏/推荐流/广告位），不用通配模糊匹配。
 * 2. 失效无害——站点改版后选择器落空仅回到原样，注入不报错。
 * 3. verified 标记——true 表示选择器已在浏览器实测命中；false 为待真机复核，
 *    UI 清单如实展示。规则注释维护日期，便于定期巡检。
 */

// 规则维护日期：2026-10-21
// 实测记录：豆瓣/掘金/GitHub 选择器已在真实页面命中（verified: true）；
// 知乎被登录墙拦截、微信/少数派/36氪/头条/B站/微博未取到真实页面（verified: false，选择器取多年稳定类名，待真机复核）
export const SITE_RULES = [
  {
    domain: 'zhihu.com',
    name: '知乎',
    note: '隐藏问题页右侧推荐栏、广告卡片与登录弹窗，正文加宽',
    verified: false,
    css: [
      '.GlobalSideBar, .Question-sideColumn, .Pc-word-card-wrapper,',
      '.QuestionInvitation, .RelatedQuestions, .Modal-wrapper',
      '{ display: none !important }',
      '.Question-mainColumn, .Post-RichTextContainer, .RichText',
      '{ max-width: 100% !important }'
    ].join(' ')
  },
  {
    domain: 'mp.weixin.qq.com',
    name: '微信公众号',
    note: '隐藏右下角二维码浮层，正文加宽',
    verified: false,
    css: [
      '#js_pc_qr_code, .qr_code_pc',
      '{ display: none !important }',
      '.rich_media_area_primary_inner',
      '{ max-width: none !important }'
    ].join(' ')
  },
  {
    domain: 'github.com',
    name: 'GitHub',
    note: 'README 宽度放开（2025 改版后已是全宽布局，无需隐藏侧栏）',
    verified: true,
    css: [
      '.markdown-body',
      '{ max-width: none !important }'
    ].join(' ')
  },
  {
    domain: 'juejin.cn',
    name: '掘金',
    note: '隐藏文章页底部「为你推荐」流',
    verified: true,
    css: [
      '.recommended-area',
      '{ display: none !important }'
    ].join(' ')
  },
  {
    domain: 'douban.com',
    name: '豆瓣',
    note: '隐藏条目页右侧栏（购票/广告区），主列加宽',
    verified: true,
    css: [
      '#content .aside',
      '{ display: none !important }',
      '.article',
      '{ width: 100% !important; max-width: 100% !important }'
    ].join(' ')
  },
  {
    domain: 'sspai.com',
    name: '少数派',
    note: '隐藏文章底部相关推荐',
    verified: false,
    css: [
      '.article-footer-suggest',
      '{ display: none !important }'
    ].join(' ')
  },
  {
    domain: '36kr.com',
    name: '36氪',
    note: '隐藏文章页侧边推荐栏',
    verified: false,
    css: [
      '.article-side, .article-related',
      '{ display: none !important }'
    ].join(' ')
  },
  {
    domain: 'toutiao.com',
    name: '今日头条',
    note: '隐藏文章页侧边栏',
    verified: false,
    css: [
      '.article-sidebar',
      '{ display: none !important }'
    ].join(' ')
  },
  {
    domain: 'bilibili.com',
    name: 'B站专栏',
    note: '专栏阅读页正文加宽',
    verified: false,
    css: [
      '.article-read-panel, .page-container .article-container',
      '{ max-width: none !important }'
    ].join(' ')
  },
  {
    domain: 'weibo.com',
    name: '微博',
    note: '轻净化：隐藏搜索结果页底部页脚',
    verified: false,
    css: [
      '.footer, .m-footer',
      '{ display: none !important }'
    ].join(' ')
  }
]

/**
 * 按域名匹配净化规则（支持子域名：www.zhihu.com / zhuanlan.zhihu.com 均命中）
 * @param {string} url 完整链接
 * @returns {Object|null} 命中的规则或 null
 */
export function matchSiteRule(url) {
  if (!url || typeof url !== 'string') return null
  try {
    const host = new URL(url).hostname
    if (!host) return null
    return SITE_RULES.find(r => host === r.domain || host.endsWith('.' + r.domain)) || null
  } catch (e) {
    return null
  }
}
