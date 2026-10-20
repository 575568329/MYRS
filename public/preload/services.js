const fs = require('node:fs')
const path = require('node:path')

// 通过 window 对象向渲染进程注入 nodejs 能力
window.services = {
  // 读文件
  readFile (file) {
    return fs.readFileSync(file, { encoding: 'utf-8' })
  },
  // 文本写入到下载目录
  writeTextFile (text) {
    const filePath = path.join(window.utools.getPath('downloads'), Date.now().toString() + '.txt')
    fs.writeFileSync(filePath, text, { encoding: 'utf-8' })
    return filePath
  },
  // 图片写入到下载目录
  writeImageFile (base64Url) {
    const matchs = /^data:image\/([a-z]{1,20});base64,/i.exec(base64Url)
    if (!matchs) return
    const filePath = path.join(window.utools.getPath('downloads'), Date.now().toString() + '.' + matchs[1])
    fs.writeFileSync(filePath, base64Url.substring(matchs[0].length), { encoding: 'base64' })
    return filePath
  },
  // 本地热榜 API 是否已启动（前端可据此判断是否优先走本地源）
  hotApiStarted: false
}

// ===== 本地热榜 API（DailyHotApi 打包版，esbuild CJS 单文件）=====
// 在 preload 的 Node 环境中启动本地服务，前端优先从 http://localhost:6688 获取热搜数据
// 任一环节失败都静默降级：前端会自动回退到 uapis.cn / api-hot.imsyy.com 远程数据源
try {
  const serveHotApi = require('./hot-api.cjs').default
  const server = serveHotApi(6688)
  window.services.hotApiStarted = true
  console.log('[hot-api] 本地热榜服务已启动: http://localhost:6688')
  if (server && typeof server.on === 'function') {
    // 端口被占用（如已独立运行 DailyHotApi）等错误：避免未捕获异常导致插件崩溃
    server.on('error', (err) => {
      window.services.hotApiStarted = false
      console.warn('[hot-api] 本地服务异常:', err.message)
    })
  }
} catch (e) {
  console.warn('[hot-api] 启动失败（前端将使用远程数据源）:', e)
}
