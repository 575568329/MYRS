/**
 * 个人数据后台（阿里云 tracker-server）收集配置
 * 替代 getpantry.cloud（pantry 已被平台清理，2026-10）
 *
 * 开发调试：设置 VITE_COLLECT_DEV=http://127.0.0.1:9420 即可在 dev 环境启用埋点并指向本地服务
 */

// import.meta.env 兼容（Vite 构建时替换；node 单测直连时为空对象）
const env = (typeof import.meta !== 'undefined' && import.meta.env) || {}
// dev 联调模式：上报走独立 myrs-dev 桶，与生产数据天然隔离
const IS_DEV_COLLECT = !!env.VITE_COLLECT_DEV

export const COLLECT_CONFIG = {
  // 生产端点（阿里云，见 D:\Study\aliyun-ops\docs\DEPLOYMENT.md）
  API: env.VITE_COLLECT_DEV || env.VITE_COLLECT_API || 'http://101.201.107.139:9420',
  // 访问令牌（随插件分发，等效原 pantry publicId 暴露模型，仅防扫描）
  TOKEN: 'oc-6a3e7db855af14c922e4',
  // 项目标识（服务端按 project 分桶存储）；显式指定 VITE_COLLECT_PROJECT 可覆盖
  PROJECT: env.VITE_COLLECT_PROJECT || (IS_DEV_COLLECT ? 'myrs-dev' : 'myrs')
}
