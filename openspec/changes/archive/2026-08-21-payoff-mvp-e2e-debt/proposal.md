## Why

在 MVP 阶段，我们完成了核心交易链路（商品浏览、购物车、模拟结算），但由于缺乏自动化的端到端 (E2E) 测试，每次 `/opsx:archive` 归档前都需要大量的人工回归测试。这严重阻碍了持续交付的速度并增加了回归风险。引入 BDD 自动化测试防线是进一步开发新功能（如运营闭环与营销增强）的前提。

## What Changes

- 在项目根目录引入独立的 `e2e-tests/` 测试工程，使用 Cucumber 和 Playwright。
- 为现有的 MVP 阶段规格 (`catalog-management`, `cart-management`, `checkout-management`) 补充 `@e2e` 和 `@unit` 测试标签。
- 提取并实现核心交易链路（查看商品 -> 加入购物车 -> 结算）的 E2E 自动化测试。
- 在 Node.js 和 Python 后端注入用于测试环境状态重置的后门接口 (`POST /api/__test/reset`)，以确保测试数据隔离。
- 完善 `init.sh`，支持 `e2e:run` 的全自动化生命周期管理（启动前端、启动后端、运行测试、销毁服务）。

## Capabilities

### New Capabilities
- `mvp-e2e-debt`: 补齐 MVP 阶段的端到端自动化测试基础设施和核心链路测试。

### Modified Capabilities
- `catalog-management`: 补充 BDD 自动化测试标签 `@e2e` 与 `@unit`。
- `cart-management`: 补充 BDD 自动化测试标签 `@e2e` 与 `@unit`。
- `checkout-management`: 补充 BDD 自动化测试标签 `@e2e` 与 `@unit`。

## Impact

- **Affected Systems**: 
  - `ecommerce-mini` (Node.js)
  - `ecommerce-mini-python` (Python)
  - `ecommerce-mini-frontend` (Vue)
  - `e2e-tests` (既有全局测试工程，已含 smoke 基础设施，本次扩展业务链路用例)
- **APIs**: 后端各新增一个内部测试用 API `POST /api/__test/reset`，该接口仅在特定环境变量 (`NODE_ENV=test` 或类似机制) 下启用。
- **Dependencies**: 根目录下 `e2e-tests` 模块新增 `@cucumber/cucumber` 和 `@playwright/test` 依赖。
- **SLO**: 确保在 CI/CD 或本地执行 `./init.sh e2e:run` 时，E2E 流程稳定可靠运行且在 10s 内执行完毕。
