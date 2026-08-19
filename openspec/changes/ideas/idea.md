# MVP E2E 测试技术债偿还探索 (idea.md)

## 1. 业务意图 (Business Intent)
为已经完成的 MVP 核心交易链路（商品浏览、购物车、模拟结算）补齐 E2E 自动化测试，消除归档前的人工回归测试成本，建立全局测试防线。

### 核心规则
- **测试框架**：Cucumber + Playwright。
- **目标场景**：
  - 商品列表查看。
  - 添加商品到购物车（角标更新）。
  - 购物车结算（Mock Checkout 成功）。
- **执行方式**：通过 `./init.sh e2e:run` 统一触发。

## 2. 业务设计思路 (Business Design Approach)
- **基础设施**：配置 `e2e-tests/support/hooks.js` 打通 Playwright 浏览器生命周期。
- **数据隔离**：在后端提供 `NODE_ENV=test` 环境下的数据重置接口，确保每次 Scenario 执行前状态干净。
- **标签驱动**：在已有的 `openspec/specs/` 中，给主流程打上 `@e2e` 标签，为复杂计算逻辑打上 `@unit` 标签。

## 3. 需求拆分 (Requirement Splitting)
- **Phase 1: 基础设施完善 (P0)** - 编写 hooks，打通数据重置链路，改造 init.sh。
- **Phase 2: 规范补全标签 (P1)** - 为 catalog, cart, checkout 的现有 spec.md 打上 `@e2e` 和 `@unit`。
- **Phase 3: E2E 场景实现 (P0)** - 提取 feature 文件，并实现 `ui_steps.js`。

## 4. 架构影响 (Architectural Impact)
- **代码无侵入**：不影响现有的 `ecommerce-mini` 业务逻辑，仅增加测试环境下的数据重置后门。
- **工程化**：`e2e-tests` 作为独立的黑盒测试工程。

## 5. 结论
已与用户达成一致。继续通过 `/opsx:propose payoff-mvp-e2e-debt` 推进正式变更。
