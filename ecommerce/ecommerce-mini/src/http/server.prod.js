import { createServer } from './server.js'

/**
 * 生产服务器入口（端口 3002，`npm run start:prod` / `init.sh node:prod`）
 *
 * fix-data-persistence：收敛为薄壳 —— 复用 `server.js` 的 `createServer({ storage: 'file' })`，
 * 路由与服务逻辑保持单一来源，不再维护第二份路由/仓储定义（消除双文件漂移）。
 * 数据落盘 `ecommerce/ecommerce-mini/data/*.json`（8 类数据）。
 */
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const { server } = createServer({ storage: 'file' })
  const port = Number(process.env.PORT) || 3002
  server.listen(port, () => {
    console.log(`Production Server running on port ${port}`)
  })
}
