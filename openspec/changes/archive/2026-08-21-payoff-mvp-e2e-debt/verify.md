## Purpose

为 `payoff-mvp-e2e-debt` 的 apply 提供可审计的本地验证证据：证明 MVP 核心交易链路的 E2E 自动化测试已闭环，且未破坏既有单元/接口测试与前端构建。

## Scope

- `e2e-tests/`: `mvp_trading.feature`（3 个 @e2e 场景）+ `steps/ui_steps.js` + `support/world.js`（reset 钩子）
- `ecommerce/ecommerce-mini/src/http/server.js`: `POST /api/__test/reset`（NODE_ENV=test 启用）
- `ecommerce/ecommerce-mini-python/src/api/server.py`: `POST /api/__test/reset`（APP_ENV=test 启用）+ `repo/memory.py` 新增 `clear()`
- `init.sh`: `e2e:run` 服务生命周期闭环（后台拉起 3000/5173/8000，退出时 trap + free_port 清理）

## Hard Gates

- **Schema validate**: PASS (2026-08-21 运行 `openspec validate payoff-mvp-e2e-debt` → "is valid")
- **Node test**: PASS (2026-08-21 运行 `./init.sh node:test` → fail 0)
- **Python test**: PASS (2026-08-21 运行 `./init.sh python:test` → 12 passed)
- **Frontend build**: PASS (2026-08-21 运行 `./init.sh vue:build` → built in 165ms)

## Soft Gates

- **E2E cucumber**: PASS (2026-08-21 运行 `./init.sh e2e:run` → 6 scenarios / 25 steps 全部通过，耗时 ~2.2s，满足 <10s SLO；报告 `e2e-tests/cucumber-report.html` 已生成；运行后 3000/5173/8000 端口均已释放)

## Evidence Index

- **关联测试文件**:
  - [mvp_trading.feature](file:///Users/superkkk/MyCoding/OpenSpec-practice/e2e-tests/features/mvp_trading.feature)
  - [ui_steps.js](file:///Users/superkkk/MyCoding/OpenSpec-practice/e2e-tests/steps/ui_steps.js)
  - [world.js](file:///Users/superkkk/MyCoding/OpenSpec-practice/e2e-tests/support/world.js)
  - [server.js (Node reset)](file:///Users/superkkk/MyCoding/OpenSpec-practice/ecommerce/ecommerce-mini/src/http/server.js#L113-126)
  - [server.py (Python reset)](file:///Users/superkkk/MyCoding/OpenSpec-practice/ecommerce/ecommerce-mini-python/src/api/server.py#L106-113)
  - [init.sh e2e:run](file:///Users/superkkk/MyCoding/OpenSpec-practice/init.sh#L111-166)
  - 测试报告: `e2e-tests/cucumber-report.html`
- **关键断言**:
  - [x] 打开店铺首页可看到商品列表且商品卡片包含图片（catalog-management @e2e）
  - [x] 加入购物车后头部购物车角标数量变为 1（cart-management @e2e）
  - [x] 点击"确认结算"后展示包含订单号与"继续购物"按钮的成功模态框（checkout-management @e2e）
  - [x] 加购后自动推荐"9 折数码券"为最优方案，优惠减免 -¥29.90、最终总额 ¥269.10，带券结算成功（coupon-management @e2e）
  - [x] 运营后台创建折扣券规则（ACTIVE）→ 发放给 user_1003 → 提示发放成功 → 发放记录顶部出现该条记录（券名/用户 ID/操作人）（coupon-management @e2e）
  - [x] 每个 Scenario 执行前调用 `/api/__test/reset`，场景间数据隔离
- **环境备注**:
  - 依赖安装使用 npm 镜像源（官方 registry 超时）：`npm install --registry=https://registry.npmmirror.com`
  - Playwright chromium v1234 通过 `PLAYWRIGHT_DOWNLOAD_HOST=https://cdn.npmmirror.com/binaries/playwright npx playwright install chromium` 下载
  - `e2e:run` 中 Python 后端为尽力启动（未安装 uvicorn 时跳过，UI 链路仅依赖 Node 3000）
