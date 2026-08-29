---
name: Testing Strategy
purpose: 定义自动化测试金字塔策略及 SDD 工作流中的执行约束
updated_at: 2026-08-23
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

### E2E 步骤命名空间化规范（防跨 Story 冲突）

> 背景：多个 Story 的 E2E 步骤集中在同一 `e2e-tests/steps/` 目录，若步骤文本（Given/When/Then）高度相似，Cucumber 会报 **ambiguous（步骤定义歧义）**，导致回归失败（见 flow-issues-log ISSUE-015）。

**强制规范**：

1. **步骤文件按 Story 分文件**：`e2e-tests/steps/<story-key>.js`（如 `account_register.js`、`account_login.js`、`account_session.js`、`account_admin_users.js`）。
2. **步骤文本带领域前缀**：步骤的 Gherkin 文本必须体现业务领域/角色，避免泛化措辞。例如：
   - ❌ `Given('已注册用户')`（多个 Story 可能复用/冲突）
   - ✅ `Given('买家已注册账号 {string}')`（含角色"买家"与领域动作）
   - ✅ `When('运营在用户管理界面将 {string} 禁用')`（含角色"运营"与页面定位）
3. **测试后门步骤独立命名**：`/api/__test/*` 后门步骤统一前缀 `测试后门`（如 `Given('测试后门将用户 {string} 置为禁用')`），与 UI 操作步骤（`When('运营在用户管理中将 {string} 禁用')`）严格区分。
4. **新增步骤前 grep 查重**：编写步骤定义前，先 `grep` 确认该步骤文本不存在于其他步骤文件；若语义相同应**复用共享步骤**（抽到 `ui_steps.js` 或 `shared.js`），而非复制。
5. **Ambiguous 即失败**：`./init.sh e2e:run` 若报 ambiguous，视为门禁不通过，必须按上述规范收敛步骤文本。

### Archive 阶段的门禁 (Gating)

归档前，必须执行以下 E2E 门禁（缺一不可）：

1. **E2E 覆盖落地（强制）**: 变更 `specs/**/*.md` 中每一个标记 `@e2e` 的场景，**必须**在 `e2e-tests/features/` 下有对应的 Cucumber 场景（含 `steps/` 步骤定义），不得仅在后端测试覆盖。若 feature 文件中找不到对应场景，视为门禁不通过。
2. **全局回归**: 运行 `./init.sh e2e:run`，全部场景通过。
3. **场景数不得倒退**: E2E 场景数应随变更增长或持平（新增 `@e2e` 场景必然增加或修改 feature 场景）；仅运行旧场景、未覆盖新 `@e2e` 验收的场景，视为门禁不通过。
4. **verify.md 记录**: `verify.md` 的 E2E 门禁行必须填写**实际场景数**（如 `10 scenarios / 46 steps`），严禁标注"E2E 未纳入"作为通过理由。

> 背景: E2E 是测试金字塔的顶层（约占 10%），覆盖用户核心交易链路与跨端交互；它不应是"可选验证"。归档前旧场景全绿但新 `@e2e` 场景零覆盖，属于验收缺口。

### E2E 测试数据策略（动态建号 vs 预置种子）

> 背景：E2E 跨 Story 运行时共享同一后端存储，若多个 feature 依赖预置种子账号，会互相污染（见 ISSUE-012/013）。

**强制规范**：

1. **Given 动态建号优先**：涉及用户/账户的 E2E 场景，一律在 `Given` 步骤中**动态创建**该场景所需数据（如 `Given('买家已注册账号 13888217536')` 内部调用注册 API），不依赖共享种子数据。
2. **测试后门仅用于状态翻转**：`/api/__test/*` 后门（如 user-status/user-role）只用于翻转**当前场景已建账号**的状态，不用于创建共享数据。
3. **种子数据只读复用**：全局种子（如 `user_1001`）仅供只读断言；任何变更性操作（禁用/改状态）必须针对动态建的账号。
4. **场景间数据隔离**：每个 feature 场景的账号用**独立手机号**（或 UUID 后缀），避免并发/顺序执行相互影响。
5. **清理语义**：若场景创建了会造成后续冲突的数据，在 `After` hook 中清理（或使用可覆盖的唯一标识）。
