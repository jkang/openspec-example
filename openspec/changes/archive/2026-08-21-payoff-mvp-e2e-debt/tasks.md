## 1. 基础设施配置 (Infrastructure Setup)

- [x] 1.1 (全部) 更新 `init.sh`，增强 `e2e:run` 命令：使用后台进程拉起 Node 后端 (3000)、Python 后端 (8000) 和 Vue 前端 (5173)，并在脚本退出时（`trap`）清理进程。
- [x] 1.2 (全局) 在 `e2e-tests/support/world.js` 中通过 `Before` / `After` 钩子完成 Playwright Browser 与 Page 的生命周期管理（已随 smoke 基础设施落地，无需新建 hooks.js）。
- [x] 1.3 (全局) `e2e-tests/cucumber.js` 已配置 HTML 报告输出 (`cucumber-report.html`)。

## 2. 后端测试数据重置机制 (Backend Test Data Reset)

- [x] 2.1 (Node.js) 在 `ecommerce/ecommerce-mini/src/http/server.js` 中新增路由 `POST /api/__test/reset`，该路由负责清空 `MemoryRepo` 中的商品、购物车和订单数据（仅在测试环境下启用）。
- [x] 2.2 (Python) 在 `ecommerce/ecommerce-mini-python/src/api/server.py` 中新增路由 `POST /api/__test/reset`，负责清空相应的全局内存仓库（仅在测试环境下启用）。
- [x] 2.3 (全局) 在 `e2e-tests/support/world.js` 的 `Before` 钩子中，添加调用 `http://localhost:3000/api/__test/reset` 与 `http://localhost:8000/api/__test/reset` 的逻辑（失败时容忍 8000 未启动，但 3000 必须成功，因为前端代理指向 Node 后端）。

## 3. 提取 BDD 场景文件 (BDD Feature Extraction)

- [x] 3.1 (全局) 在 `e2e-tests/features/` 目录下创建 `mvp_trading.feature` 文件。
- [x] 3.2 (全局) 将 `catalog-management`, `cart-management`, `checkout-management`, `coupon-management` 中带有 `@e2e` 标签的核心交易场景写入 `mvp_trading.feature` 中，并保持 Gherkin 语法。

## 4. E2E 步骤实现与验证 (E2E Steps Implementation & Validation)

- [x] 4.1 (全局) 在 `e2e-tests/steps/ui_steps.js` 中使用 Playwright 实现“商品列表查看”相关的步骤定义 (Given/When/Then)。
- [x] 4.2 (全局) 在 `e2e-tests/steps/ui_steps.js` 中实现“加入购物车并校验角标”相关的步骤定义。
- [x] 4.3 (全局) 在 `e2e-tests/steps/ui_steps.js` 中实现“结算并校验成功提示”相关的步骤定义。
- [x] 4.4 (全部) 执行 `./init.sh e2e:run`，确保自动化测试能够控制浏览器顺利跑通整个 MVP 交易链路，并生成 `e2e-tests/cucumber-report.html` 报告。
