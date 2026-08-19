## 1. 基础设施配置 (Infrastructure Setup)

- [ ] 1.1 (全部) 更新 `init.sh`，增强 `e2e:run` 命令：使用后台进程拉起 Node 后端 (3000)、Python 后端 (8000) 和 Vue 前端 (5173)，并在脚本退出时清理进程。
- [ ] 1.2 (全局) 在 `e2e-tests/support/hooks.js` 中配置 Cucumber 的 `BeforeAll` 和 `AfterAll` 钩子，初始化 Playwright Browser。
- [ ] 1.3 (全局) 在 `e2e-tests/support/hooks.js` 中配置 `Before` 和 `After` 钩子，创建新的 Page context。

## 2. 后端测试数据重置机制 (Backend Test Data Reset)

- [ ] 2.1 (Node.js) 在 `ecommerce-mini/src/http/server.js` 中新增路由 `POST /api/__test/reset`，该路由负责清空 `MemoryRepo` 中的商品、购物车和订单数据。
- [ ] 2.2 (Python) 在 `ecommerce-mini-python/src/api/server.py` 中新增路由 `POST /api/__test/reset`，负责清空相应的全局内存仓库。
- [ ] 2.3 (全局) 在 `e2e-tests/support/hooks.js` 的 `Before` 钩子中，添加通过 `fetch` 或 `axios` 调用 `http://localhost:3000/api/__test/reset` 和 `http://localhost:8000/api/__test/reset` 的逻辑。

## 3. 提取 BDD 场景文件 (BDD Feature Extraction)

- [ ] 3.1 (全局) 在 `e2e-tests/features/` 目录下创建 `mvp_trading.feature` 文件。
- [ ] 3.2 (全局) 将 `catalog-management`, `cart-management`, `checkout-management` 中带有 `@e2e` 标签的核心交易场景写入 `mvp_trading.feature` 中，并保持 Gherkin 语法。

## 4. E2E 步骤实现与验证 (E2E Steps Implementation & Validation)

- [ ] 4.1 (全局) 在 `e2e-tests/steps/ui_steps.js` 中使用 Playwright 实现“商品列表查看”相关的步骤定义 (Given/When/Then)。
- [ ] 4.2 (全局) 在 `e2e-tests/steps/ui_steps.js` 中实现“加入购物车并校验角标”相关的步骤定义。
- [ ] 4.3 (全局) 在 `e2e-tests/steps/ui_steps.js` 中实现“结算并校验成功模态框”相关的步骤定义。
- [ ] 4.4 (全部) 执行 `./init.sh e2e:run`，确保自动化测试能够控制浏览器顺利跑通整个 MVP 交易链路。
