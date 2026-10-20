/**
 * 统一存储层
 * uTools 环境用 dbStorage，浏览器开发环境自动降级 localStorage，
 * 保证设置/钉住/收藏等数据在两种环境下都持久化。
 */
export function getStorage() {
  if (typeof window !== 'undefined' && window.utools && window.utools.dbStorage) {
    return window.utools.dbStorage
  }
  try {
    return window.localStorage
  } catch (e) {
    return null
  }
}
