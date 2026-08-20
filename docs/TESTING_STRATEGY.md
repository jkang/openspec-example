---
name: Testing Strategy
purpose: 定义自动化测试金字塔策略及 SDD 工作流中的执行约束
updated_at: 2026-08-20
---

# 自动化测试策略与金字塔 (Testing Strategy)

在规格驱动开发 (SDD) 流程中，OpenSpec 生成的 Gherkin 规格（Given/When/Then）不仅是业务文档，更是**可执行的测试契约**。

为了避免陷入“冰淇淋蛋卷”反模式（即所有测试都在 UI 层执行，导致运行极慢且极其脆弱），AI Agent 必须严格遵循本测试金字塔策略，对场景进行分层映射与验证。

## 1. 测试分层定义 (The Testing Pyramid)

### 1.1 单元测试层 (Unit Tests) - 🎯 占比约束：70%
- **适用场景**: 纯领域逻辑 (Domain Logic)、复杂的业务规则排列组合、边界条件和异常处理。
- **执行载体**: 后端原生的 `node:test` 或 `pytest`。直接实例化 Domain 模型或调用 Service 层，极速运行，无需启动 HTTP 服务器或数据库。
- **Gherkin 特征**: 关注内部计算结果和状态机流转。
  > 示例: “Given 购物车有商品A且满减券可用, When 计算购物车总价, Then 最终价格应为 80”
- **分配标签**: `@unit`

### 1.2 接口/集成测试层 (API Tests) - 🎯 占比约束：20%
- **适用场景**: 路由鉴权、请求参数校验、数据持久化 (Repository) 集成边界。
- **执行载体**: 后端测试框架的 HTTP 客户端（如 Python 的 `TestClient`）。
- **Gherkin 特征**: 关注系统边界和 HTTP 协议状态。
  > 示例: “Given 缺少有效 JWT 令牌, When 发起 POST /api/orders, Then 系统返回 401 Unauthorized”
- **分配标签**: `@api`

### 1.3 端到端测试层 (E2E Tests) - 🎯 占比约束：10%
- **适用场景**: 用户的**核心交易链路 (Happy Paths)**、跨端交互、UI 状态响应。
- **执行载体**: 根目录 `e2e-tests/` 下的 **Cucumber + Playwright**。
- **Gherkin 特征**: 关注用户真实操作和视觉反馈，把系统当做黑盒。
  > 示例: “Given 用户处于首页, When 点击商品 'MacBook Pro' 的 '加入购物车' 按钮, Then 顶部导航栏的购物车角标应变为 1”
- **分配标签**: `@e2e`

---

## 2. SDD 工作流中的执行约束

### Propose 阶段的防腐 (Tagging)
在 `/opsx:propose` 阶段，AI Agent 生成 `spec.md` 时，**必须主动评估每一个 Scenario 的验证成本**，并在其上方添加对应的 Cucumber 标签 (`@unit`, `@api`, 或 `@e2e`)。
**严禁将底层业务逻辑判断推卸给 `@e2e` 层。**

### Apply 阶段的落实 (Implementation)
在 `/opsx:apply` 阶段，AI 必须根据标签分配测试任务：
- 遇到 `@unit` / `@api`，在后端项目的 `__tests__/` 或 `tests/` 目录下编写测试。
- 只有遇到 `@e2e` 时，才前往全局 `e2e-tests/features/` 和 `e2e-tests/steps/` 目录下编写 Playwright 自动化脚本。

### Archive 阶段的门禁 (Gating)
归档前，必须通过 `init.sh e2e:run` 执行全局回归，确保没有破坏任何现存契约。
