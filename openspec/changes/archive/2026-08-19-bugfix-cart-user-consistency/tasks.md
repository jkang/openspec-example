## 1. 后端修复与接口对齐 (Backend)

- [x] 1.1 [Node.js] 修改 `src/http/server.js`，使 `/api/cart/items` 接口支持从 `req.body.userId` 读取用户标识。
- [x] 1.2 [Node.js/Python] 确保后端提供统一的 `POST /api/cart/remove` 接口，支持按 `userId` 和 `productId` 移除商品。
- [x] 1.3 [Node.js] 增加集成测试用例，验证不同 `userId` 下购物车的隔离性。

## 2. 前端状态驱动重构 (Frontend)

- [x] 2.1 [Vue] 修改 `App.vue` 中的 `addToCart` 逻辑，在 API 成功返回后使用响应数据全量更新本地 `cart`。
- [x] 2.2 [Vue] 修改 `App.vue` 中的 `removeFromCart` 逻辑，改为调用后端移除接口，并根据响应同步状态。
- [x] 2.3 [Vue] 在 `checkout` 前增加一次强制状态同步或验证逻辑。

## 3. 全链路验证 (Harness & E2E)

- [x] 3.1 运行 `./init.sh node:test` 验证 Node 后端修复。
- [x] 3.2 运行 `./init.sh python:test` 确保 Python 版本保持兼容。
- [x] 3.3 运行 `./init.sh e2e:run` 执行 smoke 测试（@e2e），确保主链路未受损。
- [x] 3.4 针对本次修复，生成 `verify.md` 记录验证证据。
